import {canonical,inspectDocument,normalizeText,numericTokens,type DocumentInspection} from "./text-contract-document";

export const TEXT_CONTRACT_VERSION=2 as const;
export const MAX_TEXT_CONTRACT_SOURCE_CHARS=30_000;
export const MAX_TEXT_CONTRACT_BRIEF_CHARS=2_000;
export const MAX_TEXT_CONTRACT_RULES=20;
export const MAX_LIVE_RULES=3;
export type TextContractLanguage="same"|"en"|"ru"|"uk"|"es";
export type ContractRuleKind="exact_text"|"numeric_value"|"url"|"html_structure"|"semantic_invariant"|"freshness_required";
export type ContractRuleSeverity="high"|"medium"|"low";
export type ContractCheckStrategy="deterministic"|"nemotron"|"tavily";
export type ContractExpectation="preserve"|"forbid";
export type RuleEvaluationStatus="pass"|"fail"|"uncertain";
export type AgentFinalStatus="READY"|"NEEDS_REVIEW"|"BLOCKED";
export type GuardGroup="numbers"|"links"|"ctas"|"attributes"|"headings"|"schema"|"markup"|"phrases";
export type ContractRule={id:string;kind:ContractRuleKind;statement:string;severity:ContractRuleSeverity;required:boolean;enabled:boolean;sourceExcerpt:string;expectedValue?:string;expectation:ContractExpectation;checkStrategy:ContractCheckStrategy;requiresLiveEvidence:boolean;sourceOfTruthDomains:string[];group?:GuardGroup;values?:string[]};
export type TextContract={version:typeof TEXT_CONTRACT_VERSION;id:string;title:string;source:string;brief:string;outputLanguage:TextContractLanguage;revision:number;rules:ContractRule[];createdAt:string;approvedAt?:string;approvedRevision?:number};
export type ModelUsage={provider:"nebius"|"tavily"|"human";model?:string;operation:"compile"|"generate"|"evaluate"|"search";promptTokens?:number;completionTokens?:number;totalTokens?:number;credits?:number};
export type ExternalEvidence={title:string;url:string;excerpt:string;score:number;publishedDate?:string};
export type RuleEvaluation={ruleId:string;status:RuleEvaluationStatus;explanation:string;sourceExcerpt:string;candidateExcerpt:string;evidence:ExternalEvidence[];evaluator:ContractCheckStrategy};
export type GeneratedAttempt={id:string;number:number;kind:"draft"|"repair"|"manual";content:string;createdAt:string;model:string;usage:ModelUsage;evaluations?:RuleEvaluation[];finalStatus?:AgentFinalStatus;evaluationError?:string};
export type AgentRun={contract:TextContract;attempts:GeneratedAttempt[];finalCandidate:string;finalStatus:AgentFinalStatus;evaluations:RuleEvaluation[];modelUsage:ModelUsage[];acceptedAt?:string};
export class TextContractError extends Error{constructor(public code:string,message:string){super(message);this.name="TextContractError";}}
export function normalizeSourceOfTruthDomains(input:unknown){
  const raw=Array.isArray(input)?input:typeof input==="string"?input.split(/[\s,]+/u):[];
  const domains=[...new Set(raw.map(value=>{if(typeof value!=="string"||!value.trim())return "";try{return new URL(value.includes("://")?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./u,"");}catch{return "";}}))].filter(domain=>/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(domain));
  if(domains.length>5)throw new TextContractError("TOO_MANY_DOMAINS","Use no more than five source-of-truth domains.");return domains;
}
export function validateTextContractInputs(source:unknown,brief:unknown){
  if(typeof source!=="string"||!source.trim())throw new TextContractError("SOURCE_REQUIRED","Source text or HTML is required.");
  if(source.length>MAX_TEXT_CONTRACT_SOURCE_CHARS)throw new TextContractError("SOURCE_TOO_LARGE","Source must be 30,000 characters or fewer.");
  if(typeof brief!=="string"||!brief.trim())throw new TextContractError("BRIEF_REQUIRED","Rewrite brief is required.");
  if(brief.length>MAX_TEXT_CONTRACT_BRIEF_CHARS)throw new TextContractError("BRIEF_TOO_LARGE","Brief must be 2,000 characters or fewer.");return{source,brief};
}
export function isApproved(contract:TextContract){return Boolean(contract.approvedAt&&contract.approvedRevision===contract.revision&&contract.rules.some(rule=>rule.enabled));}
export function sameContract(a:TextContract,b:TextContract){return canonical(a)===canonical(b);}
export function quotedBriefRules(brief:string){
  const rules:Array<{value:string;expectation:ContractExpectation}>=[];let previousEnd=0,previousAction="";
  for(const match of brief.matchAll(/["“‘]([^"”’\n]{2,160})["”’]/gu)){
    const start=match.index??0,between=brief.slice(previousEnd,start),before=between.split(/[.!?;\n]/u).at(-1)??"",after=brief.slice(start+match[0].length).split(/[.!?;\n]/u)[0];
    const action=[...before.matchAll(/\b(?:do not|don't|don’t|must not|avoid|forbid|never|exclude|preserve|keep|include|retain)\b|не используй|запрети|избегай|сохрани|оставь/giu)].at(-1)?.[0]??(/[.!?;\n]/u.test(between)?"":previousAction);
    const forbid=/^(?:do not|don't|don’t|must not|avoid|forbid|never|exclude|не используй|запрети|избегай)$/iu.test(action)||/^\s*(?:must not|should not|is forbidden|is prohibited)\b/iu.test(after);
    rules.push({value:match[1].trim(),expectation:forbid?"forbid":"preserve"});previousEnd=start+match[0].length;previousAction=action;
  }return rules;
}
export function extractDeterministicContractRules(source:string,brief:string,domainInput:unknown=[]):ContractRule[]{
  const d=inspectDocument(source),domains=normalizeSourceOfTruthDomains(domainInput),rules:ContractRule[]=[];
  const add=(group:GuardGroup,kind:ContractRuleKind,statement:string,values:string[]=[],expectation:ContractExpectation="preserve")=>rules.push({id:`guard-${group}${group==="phrases"?`-${expectation}`:""}`,group,kind,statement,severity:"high",required:true,enabled:true,sourceExcerpt:values.join(" · ").slice(0,500),expectation,checkStrategy:"deterministic",requiresLiveEvidence:false,sourceOfTruthDomains:domains,values});
  // Group inventories, never truncate mandatory facts to fit the UI rule limit.
  add("numbers","numeric_value",`Preserve all ${d.numbers.length} distinct numeric values; do not introduce new numbers.`,d.numbers);
  add("links","url",`Preserve all ${d.links.length} link destinations and ${d.plainUrls.length} plain URLs, including repeated and fragment links.`,[...d.links,...d.plainUrls]);
  if(d.isHtml){
    add("ctas","html_structure",`Preserve all ${d.ctas.length} CTA labels and attributes.`,d.ctas);
    add("attributes","html_structure",`Preserve all ${d.attributes.length} HTML attribute sets, including accessibility and microdata attributes.`,d.attributes);
    add("headings","html_structure","Preserve heading levels, counts and explicit closing tags.",d.headings);
    add("schema","html_structure","Preserve valid JSON-LD data and all FAQ microdata structure.",[...d.jsonld,...d.microdata]);
  }
  add("markup","html_structure","Do not add malformed HTML, scripts, styles or hidden-content tricks. Preserve existing script/style content.");
  const phrases=quotedBriefRules(brief);
  for(const expectation of ["preserve","forbid"] as const){const values=[...new Set(phrases.filter(item=>item.expectation===expectation).map(item=>item.value))];if(values.length)add("phrases","exact_text",`${expectation==="preserve"?"Preserve":"Do not use"} ${values.length} exact phrase${values.length===1?"":"s"} from the brief.`,values,expectation);}
  return rules;
}
function groupPass(rule:ContractRule,a:DocumentInspection,b:DocumentInspection){
  const equal=(x:unknown,y:unknown)=>canonical(x)===canonical(y);
  if(rule.group==="numbers")return equal(a.numbers,b.numbers);
  if(rule.group==="links")return equal(a.links,b.links)&&equal(a.plainUrls,b.plainUrls);
  if(rule.group==="ctas")return equal(a.ctas,b.ctas);
  if(rule.group==="attributes")return equal(a.attributes,b.attributes);
  if(rule.group==="headings")return equal(a.headings,b.headings);
  if(rule.group==="schema")return !b.errors.includes("invalid-jsonld")&&equal(a.jsonld,b.jsonld)&&equal(a.microdata,b.microdata);
  if(rule.group==="markup")return b.errors.length===0&&equal(a.resources,b.resources)&&(!b.isHtml||a.isHtml)&&!b.attributes.some(value=>!a.attributes.includes(value)&&/"(?:hidden|aria-hidden|style|on\w+)":|javascript:/iu.test(value));
  if(rule.group==="phrases")return (rule.values??[]).every(value=>rule.expectation==="forbid"?!phrasePresent(b.text,value):phrasePresent(b.text,value));return false;
}
function phrasePresent(text:string,value:string){
  const haystack=normalizeText(text).toLowerCase(),needle=normalizeText(value).toLowerCase();if(!needle)return false;let offset=0;
  while((offset=haystack.indexOf(needle,offset))>=0){const before=haystack[offset-1]??"",after=haystack[offset+needle.length]??"";if(!(/[\p{L}\p{N}]/u.test(needle[0])&&/[\p{L}\p{N}]/u.test(before))&&!(/[\p{L}\p{N}]/u.test(needle.at(-1)??"")&&/[\p{L}\p{N}]/u.test(after)))return true;offset+=needle.length;}return false;
}
export function evaluateDeterministicRules(contract:TextContract,candidate:string):RuleEvaluation[]{
  const a=inspectDocument(contract.source),b=inspectDocument(candidate);
  return contract.rules.filter(rule=>rule.enabled&&rule.checkStrategy==="deterministic").map(rule=>{
    const expected=rule.expectedValue??"";let passed=false;
    if(rule.group)passed=groupPass(rule,a,b);
    else if(rule.kind==="numeric_value")passed=Boolean(expected)&&b.numbers.includes(numericTokens(expected)[0])&&numericTokens(expected).length===1;
    else if(rule.kind==="url")passed=b.links.includes(expected)||b.plainUrls.includes(expected);
    else if(rule.kind==="exact_text")passed=Boolean(expected)&&(rule.expectation==="forbid"?!phrasePresent(b.text,expected):phrasePresent(b.text,expected));
    const invalid=a.errors.length>0&&(rule.group==="schema"||rule.group==="markup");
    const details=rule.group==="numbers"?` Expected: ${a.numbers.join(", ")||"none"}. Found: ${b.numbers.join(", ")||"none"}.`:rule.group==="links"?` Missing: ${a.links.filter(value=>!b.links.includes(value)).join(", ")||"none; check counts/URLs"}.`:"";
    return{ruleId:rule.id,status:invalid?"uncertain":passed?"pass":"fail",explanation:invalid?"The source contains malformed HTML or JSON-LD. Fix the source before trusting this guard.":`${passed?"All protected values are preserved.":"Protected content is missing, changed or newly introduced."}${!passed?details:""}`.slice(0,700),sourceExcerpt:rule.sourceExcerpt,candidateExcerpt:passed?"":b.text.slice(0,500),evidence:[],evaluator:"deterministic"};
  });
}
export function uncertainEvaluation(rule:ContractRule,explanation:string):RuleEvaluation{return{ruleId:rule.id,status:"uncertain",explanation,sourceExcerpt:rule.sourceExcerpt,candidateExcerpt:"",evidence:[],evaluator:rule.checkStrategy};}
export function mergeRuleEvaluations(contract:TextContract,...groups:RuleEvaluation[][]):RuleEvaluation[]{return contract.rules.filter(rule=>rule.enabled).map(rule=>{const entries=groups.flat().filter(item=>item.ruleId===rule.id);return entries.length===1?entries[0]:uncertainEvaluation(rule,entries.length?"Duplicate judgments are ambiguous; recheck this rule.":"This rule did not receive a complete evaluation.");});}
export function finalStatus(contract:TextContract,evaluations:RuleEvaluation[]):AgentFinalStatus{
  const enabled=contract.rules.filter(rule=>rule.enabled);if(!enabled.length||new Set(enabled.map(rule=>rule.id)).size!==enabled.length)return "NEEDS_REVIEW";
  const complete=mergeRuleEvaluations(contract,evaluations);if(complete.some(item=>item.status==="fail"&&enabled.find(rule=>rule.id===item.ruleId)?.required))return "BLOCKED";return complete.every(item=>item.status==="pass")?"READY":"NEEDS_REVIEW";
}
export function contractSummary(contract:TextContract,evaluations:RuleEvaluation[]){const merged=mergeRuleEvaluations(contract,evaluations);return{total:merged.length,passed:merged.filter(item=>item.status==="pass").length,failed:merged.filter(item=>item.status==="fail").length,uncertain:merged.filter(item=>item.status==="uncertain").length};}
export function changePreview(before:string,after:string){return{before,after};}
export function exportAgentRun(run:AgentRun){
  const summary=contractSummary(run.contract,run.evaluations);
  return ["# TextContract Agent report","",`- Status: ${run.finalStatus}`,`- Contract revision: ${run.contract.revision}`,`- Human acceptance: ${run.acceptedAt??"not accepted"}`,`- Rules: ${summary.passed}/${summary.total} passed`,"","## Original source","",run.contract.source,"","## Rewrite brief","",run.contract.brief,"","## Approved contract","",...run.contract.rules.filter(rule=>rule.enabled).flatMap(rule=>[`- [${rule.severity.toUpperCase()}] ${rule.statement}`,...(rule.values??[]).map(value=>`  - ${value}`)]),"",...run.attempts.flatMap(attempt=>[`## ${attempt.kind==="draft"?"Draft 1":attempt.kind==="repair"?"Repair 1":`Human edit ${attempt.number}`}`,"",`- Model: ${attempt.model}`,`- Created: ${attempt.createdAt}`,`- Status: ${attempt.finalStatus??"not evaluated"}`,attempt.evaluationError?`- Error: ${attempt.evaluationError}`:"","",attempt.content,"",...(attempt.evaluations??[]).flatMap(item=>[`- ${item.status.toUpperCase()} ${item.ruleId}: ${item.explanation}`,...item.evidence.map(evidence=>`  - [${evidence.title}](${evidence.url}) — ${evidence.excerpt}`)])]),"","## Final evaluation","",...run.evaluations.flatMap(item=>[`- ${item.status.toUpperCase()} ${item.ruleId}: ${item.explanation}`,...item.evidence.map(evidence=>`  - [${evidence.title}](${evidence.url}) — ${evidence.excerpt}`)]),"","## Provider usage","",...run.modelUsage.map(item=>`- ${item.provider} / ${item.model??"search"}: ${item.operation}; ${item.totalTokens??"unknown"} tokens; ${item.credits??"unknown"} credits`),"","## Final candidate","",run.finalCandidate,""].join("\n");
}
