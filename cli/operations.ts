import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  analyzeNgram,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
} from "../app/lib/analyze";
import {
  compareResults,
  normalizeAnalyzeBody,
  runComparisonAnalysis,
  runPublicAnalysis,
} from "../app/lib/public-api";
import {parseStopwordText,type TextLanguage} from "../app/lib/stopwords";
import type {CliCommand,ParsedCliArgs} from "./arguments";
import {CliUsageError,booleanOption,stringOption} from "./arguments";
import type {SourceSpec} from "./sources";
import {resolveCorpusSources,resolvePairSources,resolveSingleSource,StdinReader} from "./sources";

type OutputFormat="table"|"json"|"csv";

export type CliSettings={
  format:OutputFormat;
  output?:string;
  top:number;
  minCount:number;
  language:"auto"|TextLanguage;
  keepStopwords:boolean;
  stopwordLists?:Partial<Record<TextLanguage,string[]>>;
  focus?:string;
  tolerance:number;
  keywords:string;
  ngramSize:number;
  method:"bow"|"tfidf";
};

export type OperationResult={
  labels:string[];
  payload:Record<string,unknown>;
  settings:CliSettings;
};

const COMMON_OPTIONS=[
  "language","format","output","top","keep-stopwords","stopwords","help","version",
];

const COMMAND_OPTIONS:Record<CliCommand,string[]>={
  analyze:["text","url","focus","tolerance"],
  frequency:["text","url","min-count"],
  density:["text","url","keywords","min-count"],
  compare:["text-a","url-a","text-b","url-b","focus","tolerance","min-count"],
  ngram:["text","url","size","min-count"],
  bow:["text","url","min-count"],
  tfidf:[],
  similarity:["text-a","url-a","text-b","url-b","method"],
};

function validateCommandOptions(command:CliCommand,parsed:ParsedCliArgs){
  const allowed=new Set([...COMMON_OPTIONS,...COMMAND_OPTIONS[command]]);
  const unsupported=Object.keys(parsed.options).find((name)=>!allowed.has(name));
  if(unsupported){
    throw new CliUsageError(`Option --${unsupported} is not supported by the ${command} command.`);
  }
}

function numberOption(parsed:ParsedCliArgs,name:string,defaultValue:number,min:number,max:number,integer=true){
  const raw=stringOption(parsed,name);
  if(raw===undefined) return defaultValue;
  const value=Number(raw);
  if(!Number.isFinite(value)||(integer&&!Number.isInteger(value))||value<min||value>max){
    const kind=integer?"an integer":"a number";
    throw new CliUsageError(`Option --${name} must be ${kind} between ${min} and ${max}.`);
  }
  return value;
}

async function parseSettings(command:CliCommand,parsed:ParsedCliArgs):Promise<CliSettings>{
  const formatValue=stringOption(parsed,"format")??"table";
  if(!["table","json","csv"].includes(formatValue)){
    throw new CliUsageError("Option --format must be table, json, or csv.");
  }
  const languageValue=stringOption(parsed,"language")??"auto";
  if(!["auto","en","ru","uk","es"].includes(languageValue)){
    throw new CliUsageError("Option --language must be auto, en, ru, uk, or es.");
  }

  const defaultTop=command==="analyze"||command==="compare"?20:100;
  const topMinimum=command==="analyze"||command==="compare"?5:1;
  const topMaximum=command==="frequency"||command==="density"||command==="ngram"||command==="bow"?1000:100;
  const top=numberOption(parsed,"top",defaultTop,topMinimum,topMaximum);
  const minCount=numberOption(parsed,"min-count",1,1,Number.MAX_SAFE_INTEGER);
  const tolerance=numberOption(parsed,"tolerance",2,1.2,4,false);
  const ngramSize=numberOption(parsed,"size",2,1,10);
  const methodValue=(stringOption(parsed,"method")??"tfidf").toLowerCase().replaceAll("-","");
  if(methodValue!=="bow"&&methodValue!=="tfidf"){
    throw new CliUsageError("Option --method must be bow or tfidf.");
  }

  let stopwordLists:Partial<Record<TextLanguage,string[]>>|undefined;
  const stopwordPath=stringOption(parsed,"stopwords");
  if(stopwordPath){
    let raw:string;
    try{
      raw=await readFile(resolve(stopwordPath),"utf8");
    }catch(error){
      const reason=error instanceof Error?error.message:String(error);
      throw new CliUsageError(`Cannot read stop-word file "${stopwordPath}": ${reason}`);
    }
    const list=parseStopwordText(raw);
    if(!list.length) throw new CliUsageError("The custom stop-word file is empty.");
    stopwordLists=languageValue==="auto"
      ?{en:list,ru:list,uk:list,es:list}
      :{[languageValue]:list};
  }

  const keywords=stringOption(parsed,"keywords")??"";
  if(keywords.length>20_000) throw new CliUsageError("Option --keywords is limited to 20,000 characters.");

  return {
    format:formatValue as OutputFormat,
    output:stringOption(parsed,"output"),
    top,
    minCount,
    language:languageValue as CliSettings["language"],
    keepStopwords:booleanOption(parsed,"keep-stopwords"),
    stopwordLists,
    focus:stringOption(parsed,"focus"),
    tolerance,
    keywords,
    ngramSize,
    method:methodValue as "bow"|"tfidf",
  };
}

function bodyForSource(source:SourceSpec,settings:CliSettings,analysisOptions=false){
  return {
    sourceType:source.sourceType,
    source:source.source,
    language:settings.language,
    keepStopwords:settings.keepStopwords,
    stopwordLists:settings.stopwordLists,
    ...(analysisOptions?{
      focus:settings.focus,
      top:settings.top,
      tolerance:settings.tolerance,
    }:{}),
  };
}

function limitedRows<T extends {count:number}>(rows:T[],settings:CliSettings){
  return rows.filter((row)=>row.count>=settings.minCount).slice(0,settings.top);
}

async function runSingle(command:Exclude<CliCommand,"compare"|"tfidf"|"similarity">,parsed:ParsedCliArgs,stdin:StdinReader,settings:CliSettings){
  const source=await resolveSingleSource(parsed,stdin);
  const body=bodyForSource(source,settings,command==="analyze");

  if(command==="analyze"){
    return {labels:[source.label],payload:{result:await runPublicAnalysis(body)}};
  }

  const input=await normalizeAnalyzeBody(body);
  if(command==="frequency"){
    const result=analyzeWordFrequency(input);
    return {labels:[source.label],payload:{result:{...result,rows:limitedRows(result.rows,settings)}}};
  }
  if(command==="density"){
    const result=analyzeKeywordDensity(input,settings.keywords);
    return {
      labels:[source.label],
      payload:{result:{
        ...result,
        trackedKeywords:result.trackedKeywords.slice(0,settings.top),
        unigrams:limitedRows(result.unigrams,settings),
        bigrams:limitedRows(result.bigrams,settings),
        trigrams:limitedRows(result.trigrams,settings),
      }},
    };
  }
  if(command==="ngram"){
    const result=analyzeNgram(input,settings.ngramSize);
    return {labels:[source.label],payload:{result:{...result,rows:limitedRows(result.rows,settings)}}};
  }

  const result=analyzeBagOfWords(input);
  return {labels:[source.label],payload:{result:{...result,rows:limitedRows(result.rows,settings)}}};
}

async function runCompare(parsed:ParsedCliArgs,stdin:StdinReader,settings:CliSettings){
  const [sourceA,sourceB]=await resolvePairSources(parsed,stdin);
  const [analysisA,analysisB]=await Promise.all([
    runComparisonAnalysis(bodyForSource(sourceA,settings,true)),
    runComparisonAnalysis(bodyForSource(sourceB,settings,true)),
  ]);
  const comparison=compareResults(analysisA,analysisB);
  return {
    labels:[sourceA.label,sourceB.label],
    payload:{
      resultA:analysisA.result,
      resultB:analysisB.result,
      comparison:{
        ...comparison,
        wordChanges:limitedRows(comparison.wordChanges.map((row)=>({...row,count:Math.max(row.countA,row.countB)})),settings)
          .map(({count,...row})=>{void count;return row;}),
        bigramChanges:limitedRows(comparison.bigramChanges.map((row)=>({...row,count:Math.max(row.countA,row.countB)})),settings)
          .map(({count,...row})=>{void count;return row;}),
      },
    },
  };
}

async function runTfIdf(parsed:ParsedCliArgs,stdin:StdinReader,settings:CliSettings){
  const sources=await resolveCorpusSources(parsed,stdin);
  const documents=await Promise.all(sources.map(async(source)=>analyzeBagOfWords(
    await normalizeAnalyzeBody(bodyForSource(source,settings)),
  )));
  const calculated=calculateTfIdfCorpus(documents,settings.top);
  const language=documents.every((document)=>document.language===documents[0].language)
    ?documents[0].language
    :"auto";
  return {
    labels:sources.map((source)=>source.label),
    payload:{result:{
      language,
      documentCount:documents.length,
      top:settings.top,
      totalVocabularySize:calculated.totalVocabularySize,
      averageDocumentFrequency:calculated.averageDocumentFrequency,
      documents:calculated.documents,
      idfTable:calculated.idfTable,
    }},
  };
}

async function runSimilarity(parsed:ParsedCliArgs,stdin:StdinReader,settings:CliSettings){
  const [sourceA,sourceB]=await resolvePairSources(parsed,stdin);
  const [documentA,documentB]=await Promise.all([
    normalizeAnalyzeBody(bodyForSource(sourceA,settings)).then(analyzeBagOfWords),
    normalizeAnalyzeBody(bodyForSource(sourceB,settings)).then(analyzeBagOfWords),
  ]);
  return {
    labels:[sourceA.label,sourceB.label],
    payload:{result:calculateTextSimilarity(documentA,documentB,settings.method,settings.top)},
  };
}

export async function runOperation(command:CliCommand,parsed:ParsedCliArgs,stdin:StdinReader):Promise<OperationResult>{
  validateCommandOptions(command,parsed);
  const settings=await parseSettings(command,parsed);
  let operation:{labels:string[];payload:Record<string,unknown>};
  if(command==="compare") operation=await runCompare(parsed,stdin,settings);
  else if(command==="tfidf") operation=await runTfIdf(parsed,stdin,settings);
  else if(command==="similarity") operation=await runSimilarity(parsed,stdin,settings);
  else operation=await runSingle(command,parsed,stdin,settings);
  return {...operation,settings};
}
