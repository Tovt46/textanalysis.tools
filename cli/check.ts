import {readFile,writeFile} from "node:fs/promises";
import {dirname,isAbsolute,resolve} from "node:path";
import {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  calculateTextSimilarity,
  tokenizeAnalysisTerms,
} from "../app/lib/analyze";
import {normalizeAnalyzeBody} from "../app/lib/public-api";
import {parseStopwordText,type TextLanguage} from "../app/lib/stopwords";
import {
  CliUsageError,
  booleanOption,
  stringOption,
  type ParsedCliArgs,
} from "./arguments";
import {resolveSingleSource,type StdinReader} from "./sources";

export const CHECK_CONFIG_SCHEMA_VERSION=1;
export const DEFAULT_CHECK_CONFIG="textanalysis.config.json";

type CheckConfig={
  schemaVersion:1;
  requiredPhrases:string[];
  forbiddenPhrases:string[];
  minimumWords?:number;
  maxTermDensity?:number;
  maxPhraseDensity?:number;
  maxSimilarity?:number;
  baseline?:string;
};

export type CheckRuleResult={
  rule:string;
  passed:boolean;
  measured:number;
  expected:number;
  message:string;
};

export type CheckResult={
  schemaVersion:1;
  passed:boolean;
  input:string;
  baseline?:string;
  summary:{words:number;rules:number;failures:number};
  rules:CheckRuleResult[];
};

const CONFIG_KEYS=new Set([
  "$schema",
  "schemaVersion",
  "requiredPhrases",
  "forbiddenPhrases",
  "minimumWords",
  "maxTermDensity",
  "maxPhraseDensity",
  "maxSimilarity",
  "baseline",
]);

function objectRecord(value:unknown):Record<string,unknown>|undefined{
  return value&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>
    :undefined;
}

function phraseList(value:unknown,name:string){
  if(value===undefined)return[];
  if(!Array.isArray(value)||value.length>100||value.some(item=>
    typeof item!=="string"||!item.trim()||item.length>200||tokenizeAnalysisTerms(item).length===0
  )){
    throw new CliUsageError(`${name} must be an array of at most 100 non-empty analyzable phrases (200 characters each).`);
  }
  return [...new Set(value.map(item=>(item as string).trim()))];
}

function optionalNumber(value:unknown,name:string,min:number,max:number,integer=false){
  if(value===undefined)return undefined;
  if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value))){
    const unit=integer?"integer":"number";
    throw new CliUsageError(`${name} must be a ${unit} between ${min} and ${max}.`);
  }
  return value;
}

function parseConfig(raw:string,path:string):CheckConfig{
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{
    throw new CliUsageError(`Check configuration "${path}" is not valid JSON.`);
  }
  const record=objectRecord(parsed);
  if(!record)throw new CliUsageError(`Check configuration "${path}" must contain a JSON object.`);
  const unknown=Object.keys(record).find(key=>!CONFIG_KEYS.has(key));
  if(unknown)throw new CliUsageError(`Check configuration contains unknown property "${unknown}".`);
  if(record.schemaVersion!==CHECK_CONFIG_SCHEMA_VERSION){
    throw new CliUsageError(`Check configuration schemaVersion must be ${CHECK_CONFIG_SCHEMA_VERSION}.`);
  }
  const baseline=record.baseline;
  if(baseline!==undefined&&(typeof baseline!=="string"||!baseline.trim()||baseline.length>2048)){
    throw new CliUsageError("baseline must be a non-empty local path of at most 2,048 characters.");
  }
  const config:CheckConfig={
    schemaVersion:1,
    requiredPhrases:phraseList(record.requiredPhrases,"requiredPhrases"),
    forbiddenPhrases:phraseList(record.forbiddenPhrases,"forbiddenPhrases"),
    minimumWords:optionalNumber(record.minimumWords,"minimumWords",1,100_000,true),
    maxTermDensity:optionalNumber(record.maxTermDensity,"maxTermDensity",0,100),
    maxPhraseDensity:optionalNumber(record.maxPhraseDensity,"maxPhraseDensity",0,100),
    maxSimilarity:optionalNumber(record.maxSimilarity,"maxSimilarity",0,1),
    baseline:typeof baseline==="string"?baseline.trim():undefined,
  };
  const canonicalPhrase=(phrase:string)=>tokenizeAnalysisTerms(phrase).join(" ");
  const normalizedRequired=new Set(config.requiredPhrases.map(canonicalPhrase));
  const overlap=config.forbiddenPhrases.find(phrase=>normalizedRequired.has(canonicalPhrase(phrase)));
  if(overlap)throw new CliUsageError(`Phrase "${overlap}" cannot be both required and forbidden.`);
  if(!config.requiredPhrases.length&&!config.forbiddenPhrases.length&&
    config.minimumWords===undefined&&config.maxTermDensity===undefined&&
    config.maxPhraseDensity===undefined&&config.maxSimilarity===undefined){
    throw new CliUsageError("Check configuration must define at least one rule.");
  }
  return config;
}

function percent(value:number){
  return `${Number(value.toFixed(4))}%`;
}

function rule(rule:string,passed:boolean,measured:number,expected:number,message:string):CheckRuleResult{
  return {rule,passed,measured,expected,message};
}

function escapeWorkflowMessage(value:string){
  return value.replaceAll("%","%25").replaceAll("\r","%0D").replaceAll("\n","%0A");
}

export function renderCheckResult(result:CheckResult,format:"table"|"json"|"ci"){
  if(format==="json")return `${JSON.stringify(result,null,2)}\n`;
  if(format==="ci"){
    const lines=result.rules.map(item=>item.passed
      ?`PASS [${item.rule}] ${item.message}`
      :`::error title=textanalysis check::${escapeWorkflowMessage(`[${item.rule}] ${item.message}`)}`,
    );
    lines.push(`${result.passed?"PASS":"FAIL"}: ${result.summary.rules-result.summary.failures}/${result.summary.rules} rules passed`);
    return `${lines.join("\n")}\n`;
  }
  const lines=[
    `Text analysis check: ${result.passed?"PASS":"FAIL"}`,
    `Input: ${result.input}`,
    ...(result.baseline?[`Baseline: ${result.baseline}`]:[]),
    `Words: ${result.summary.words} · Rules: ${result.summary.rules} · Failures: ${result.summary.failures}`,
    "",
    ...result.rules.map(item=>`${item.passed?"PASS":"FAIL"} [${item.rule}] ${item.message}`),
  ];
  return `${lines.join("\n")}\n`;
}

async function loadStopwordLists(parsed:ParsedCliArgs,language:"auto"|TextLanguage){
  const path=stringOption(parsed,"stopwords");
  if(!path)return undefined;
  let raw:string;
  try{raw=await readFile(resolve(path),"utf8");}catch(error){
    const reason=error instanceof Error?error.message:String(error);
    throw new CliUsageError(`Cannot read stop-word file "${path}": ${reason}`);
  }
  const list=parseStopwordText(raw);
  if(!list.length)throw new CliUsageError("The custom stop-word file is empty.");
  return language==="auto"
    ?{en:list,ru:list,uk:list,es:list}
    :{[language]:list};
}

export async function runCheck(parsed:ParsedCliArgs,stdin:StdinReader){
  const allowed=new Set([
    "baseline","config","format","help","keep-stopwords","language","output",
    "stopwords","text","url","version",
  ]);
  const unsupported=Object.keys(parsed.options).find(name=>!allowed.has(name));
  if(unsupported)throw new CliUsageError(`Option --${unsupported} is not supported by the check command.`);

  const formatValue=stringOption(parsed,"format")??"table";
  if(!["table","json","ci"].includes(formatValue)){
    throw new CliUsageError("Option --format must be table, json, or ci for the check command.");
  }
  const languageValue=stringOption(parsed,"language")??"auto";
  if(!["auto","en","ru","uk","es"].includes(languageValue)){
    throw new CliUsageError("Option --language must be auto, en, ru, uk, or es.");
  }

  const configArgument=stringOption(parsed,"config")??DEFAULT_CHECK_CONFIG;
  const configPath=resolve(configArgument);
  let configRaw:string;
  try{configRaw=await readFile(configPath,"utf8");}catch(error){
    const reason=error instanceof Error?error.message:String(error);
    throw new CliUsageError(`Cannot read check configuration "${configArgument}": ${reason}`);
  }
  const config=parseConfig(configRaw,configArgument);
  const source=await resolveSingleSource(parsed,stdin);
  const language=languageValue as "auto"|TextLanguage;
  const stopwordLists=await loadStopwordLists(parsed,language);
  const input=await normalizeAnalyzeBody({
    sourceType:source.sourceType,
    source:source.source,
    language,
    keepStopwords:booleanOption(parsed,"keep-stopwords"),
    stopwordLists,
  });

  // Each configured list may contain 100 phrases, which is also the analyzer's
  // per-call tracked-phrase limit. Analyze the lists independently so a full
  // required list cannot push forbidden phrases past that boundary.
  const density=analyzeKeywordDensity(input,config.requiredPhrases);
  const forbiddenDensity=config.forbiddenPhrases.length
    ?analyzeKeywordDensity(input,config.forbiddenPhrases)
    :undefined;
  const rules:CheckRuleResult[]=[];
  config.requiredPhrases.forEach((phrase,index)=>{
    const count=density.trackedKeywords[index]?.count??0;
    rules.push(rule(
      `requiredPhrase:${phrase}`,
      count>0,
      count,
      1,
      count>0?`Required phrase "${phrase}" appears ${count} time(s).`:`Required phrase "${phrase}" is missing.`,
    ));
  });
  config.forbiddenPhrases.forEach((phrase,index)=>{
    const count=forbiddenDensity?.trackedKeywords[index]?.count??0;
    rules.push(rule(
      `forbiddenPhrase:${phrase}`,
      count===0,
      count,
      0,
      count===0?`Forbidden phrase "${phrase}" is absent.`:`Forbidden phrase "${phrase}" appears ${count} time(s).`,
    ));
  });
  if(config.minimumWords!==undefined){
    rules.push(rule(
      "minimumWords",
      density.wordCount>=config.minimumWords,
      density.wordCount,
      config.minimumWords,
      `${density.wordCount} words measured; minimum is ${config.minimumWords}.`,
    ));
  }
  if(config.maxTermDensity!==undefined){
    const highest=density.unigrams[0]??{term:"(none)",percentage:0};
    rules.push(rule(
      "maxTermDensity",
      highest.percentage<=config.maxTermDensity,
      highest.percentage,
      config.maxTermDensity,
      `Highest term density is ${percent(highest.percentage)} for "${highest.term}"; maximum is ${percent(config.maxTermDensity)}.`,
    ));
  }
  if(config.maxPhraseDensity!==undefined){
    const highest=[...density.bigrams,...density.trigrams]
      .filter(item=>item.count>=2)
      .sort((left,right)=>right.percentage-left.percentage||left.term.localeCompare(right.term))[0]
      ??{term:"(none)",percentage:0};
    rules.push(rule(
      "maxPhraseDensity",
      highest.percentage<=config.maxPhraseDensity,
      highest.percentage,
      config.maxPhraseDensity,
      `Highest repeated phrase density is ${percent(highest.percentage)} for "${highest.term}"; maximum is ${percent(config.maxPhraseDensity)}.`,
    ));
  }

  const baselineArgument=stringOption(parsed,"baseline")??config.baseline;
  let baselineLabel:string|undefined;
  if(config.maxSimilarity!==undefined){
    if(!baselineArgument)throw new CliUsageError("maxSimilarity requires --baseline or a baseline path in the check configuration.");
    const baselinePath=isAbsolute(baselineArgument)
      ?baselineArgument
      :resolve(stringOption(parsed,"baseline")?process.cwd():dirname(configPath),baselineArgument);
    let baselineText:string;
    try{baselineText=await readFile(baselinePath,"utf8");}catch(error){
      const reason=error instanceof Error?error.message:String(error);
      throw new CliUsageError(`Cannot read baseline file "${baselineArgument}": ${reason}`);
    }
    const baselineInput=await normalizeAnalyzeBody({
      sourceType:"text",
      source:baselineText,
      language,
      keepStopwords:booleanOption(parsed,"keep-stopwords"),
      stopwordLists,
    });
    const similarity=calculateTextSimilarity(
      analyzeBagOfWords(input),
      analyzeBagOfWords(baselineInput),
      "tfidf",
      100,
    ).cosine;
    baselineLabel=baselinePath;
    rules.push(rule(
      "maxSimilarity",
      similarity<=config.maxSimilarity,
      similarity,
      config.maxSimilarity,
      `TF-IDF cosine similarity is ${Number(similarity.toFixed(6))}; maximum is ${config.maxSimilarity}.`,
    ));
  }

  const failures=rules.filter(item=>!item.passed).length;
  const result:CheckResult={
    schemaVersion:1,
    passed:failures===0,
    input:source.label,
    baseline:baselineLabel,
    summary:{words:density.wordCount,rules:rules.length,failures},
    rules,
  };
  const rendered=renderCheckResult(result,formatValue as "table"|"json"|"ci");
  const output=stringOption(parsed,"output");
  if(output)await writeFile(resolve(output),rendered,"utf8");
  return {result,rendered,output,format:formatValue as "table"|"json"|"ci"};
}
