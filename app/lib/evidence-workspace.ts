import {analyzeNgram,analyzeText,toPublicAnalysisResult} from "./analyze";
import {compareAnalysisResults} from "./comparison";

export const EVIDENCE_WORKSPACE_VERSION=2 as const;
export const MAX_WORKSPACE_TEXT_CHARS=100_000;
export const MAX_FOCUS_TERMS=20;
export const MAX_FINDINGS=50;
export const MAX_PATCHES=50;
export const MAX_HISTORY_ENTRIES=12;

type PublicAnalysis=ReturnType<typeof toPublicAnalysisResult>;
type AnalysisComparison=ReturnType<typeof compareAnalysisResults>;

export type WorkspaceEvidence={
  id:string;
  kind:"metric"|"focus"|"phrase"|"comparison"|"change"|"claim"|"risk";
  label:string;
  value:string|number;
  detail:string;
};

export type WorkspaceClaimCategory="offer"|"price"|"rating"|"advisor_count"|"availability"|"channel"|"guarantee"|"accuracy"|"privacy"|"refund"|"social_proof";
export type WorkspaceClaimStatus="retained"|"current_only"|"baseline_only";
export type WorkspaceClaim={
  id:string;
  source:"baseline"|"current";
  category:WorkspaceClaimCategory;
  value:string;
  excerpt:string;
  status:WorkspaceClaimStatus;
};
export type WorkspaceClaimSummary={
  category:WorkspaceClaimCategory;
  label:string;
  baseline:number;
  current:number;
  retained:number;
  currentOnly:number;
  baselineOnly:number;
};
export type WorkspaceChangeMap={
  baselineBlocks:number;
  currentBlocks:number;
  retainedBlocks:number;
  addedBlocks:number;
  removedBlocks:number;
  wordDelta:number;
  wordDeltaPercent:number;
  addedSamples:string[];
  removedSamples:string[];
};
export type WorkspaceReviewItem={
  id:string;
  priority:"high"|"medium"|"low";
  category:"duplicate"|"claim_drift"|"verification"|"coverage"|"balance";
  title:string;
  detail:string;
  evidenceRefs:string[];
  patchCandidate?:{expectedText:string;replacementText:string;rationale:string};
};

export type WorkspaceAnalysis={
  id:string;
  revision:number;
  createdAt:string;
  baseline:PublicAnalysis;
  current:PublicAnalysis;
  comparison:AnalysisComparison;
  repeatedPhrases:Array<{term:string;count:number;n:number}>;
  changeMap:WorkspaceChangeMap;
  claims:WorkspaceClaim[];
  claimSummary:WorkspaceClaimSummary[];
  reviewQueue:WorkspaceReviewItem[];
  evidence:WorkspaceEvidence[];
};

export type WorkspaceFinding={
  id:string;
  revision:number;
  analysisId:string;
  title:string;
  explanation:string;
  evidenceRefs:string[];
  createdAt:string;
};

export type WorkspacePatchStatus="proposed"|"approved"|"rejected"|"applied"|"stale";
export type WorkspaceRecommendationKind="structure"|"clarity"|"trust"|"verification"|"cleanup";

export type WorkspaceReviewPlanRecommendation={
  kind:WorkspaceRecommendationKind;
  title:string;
  explanation:string;
  evidenceRefs:string[];
  expectedText:string;
  replacementText:string;
  rationale:string;
};

export type WorkspacePatch={
  id:string;
  baseRevision:number;
  findingIds:string[];
  expectedText:string;
  replacementText:string;
  rationale:string;
  start:number;
  end:number;
  status:WorkspacePatchStatus;
  recommendationKind?:WorkspaceRecommendationKind;
  createdAt:string;
  decidedAt?:string;
  appliedAt?:string;
};

export type WorkspaceHistoryEntry={
  revision:number;
  text:string;
  event:"created"|"patch_applied"|"undo";
  patchId?:string;
  createdAt:string;
};

export type EvidenceWorkspaceState={
  version:typeof EVIDENCE_WORKSPACE_VERSION;
  id:string;
  goal:string;
  focusTerms:string[];
  originalText:string;
  currentText:string;
  revision:number;
  createdAt:string;
  updatedAt:string;
  analysis:null|WorkspaceAnalysis;
  findings:WorkspaceFinding[];
  patches:WorkspacePatch[];
  history:WorkspaceHistoryEntry[];
};

export class WorkspaceError extends Error{
  code:string;
  constructor(code:string,message:string){super(message);this.name="WorkspaceError";this.code=code;}
}

type OperationContext={id?:string;now?:string};

function now(context:OperationContext={}){return context.now||new Date().toISOString();}
function id(prefix:string,context:OperationContext={}){
  if(context.id)return context.id;
  const random=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}
function required(value:unknown,label:string,max:number){
  if(typeof value!=="string"||!value.trim())throw new WorkspaceError("INVALID_INPUT",`${label} is required.`);
  if(value.length>max)throw new WorkspaceError("INPUT_TOO_LARGE",`${label} must be ${max.toLocaleString()} characters or fewer.`);
  return value.trim();
}
function normalizeFocusTerms(value:unknown){
  const raw=Array.isArray(value)?value:typeof value==="string"?value.split(","):[];
  const terms=[...new Set(raw.map(term=>typeof term==="string"?term.trim().toLowerCase():"").filter(Boolean))];
  if(terms.length>MAX_FOCUS_TERMS)throw new WorkspaceError("TOO_MANY_FOCUS_TERMS",`Use no more than ${MAX_FOCUS_TERMS} focus terms.`);
  if(terms.some(term=>term.length>120))throw new WorkspaceError("INVALID_INPUT","Each focus term must be 120 characters or fewer.");
  return terms;
}
function currentAnalysis(state:EvidenceWorkspaceState){
  if(!state.analysis||state.analysis.revision!==state.revision)throw new WorkspaceError("ANALYSIS_REQUIRED","Analyze the current revision before continuing.");
  return state.analysis;
}
function uniqueExactIndex(text:string,expected:string){
  const start=text.indexOf(expected);
  if(start<0)throw new WorkspaceError("TEXT_NOT_FOUND","The exact expected text is not present in the current revision.");
  if(text.indexOf(expected,start+expected.length)>=0)throw new WorkspaceError("TEXT_NOT_UNIQUE","The expected text occurs more than once. Include more surrounding text so the patch is unambiguous.");
  return start;
}

export function createAnalysisWorkspace(input:{originalText:string;currentText?:string;goal:string;focusTerms?:string[]|string},context:OperationContext={}):EvidenceWorkspaceState{
  const originalText=required(input.originalText,"Original text",MAX_WORKSPACE_TEXT_CHARS);
  const currentText=input.currentText===undefined||input.currentText===""?originalText:required(input.currentText,"Current text",MAX_WORKSPACE_TEXT_CHARS);
  const goal=required(input.goal,"Goal",500);
  const createdAt=now(context);
  return{
    version:EVIDENCE_WORKSPACE_VERSION,id:id("workspace",context),goal,focusTerms:normalizeFocusTerms(input.focusTerms),
    originalText,currentText,revision:1,createdAt,updatedAt:createdAt,analysis:null,findings:[],patches:[],
    history:[{revision:1,text:currentText,event:"created",createdAt}],
  };
}

function analysisInput(text:string,focusTerms:string[]){
  return{text,language:"auto" as const,focus:focusTerms,top:50,tolerance:2,keepStopwords:false,uiLanguage:"en" as const};
}

const CLAIM_LABELS:Record<WorkspaceClaimCategory,string>={
  offer:"Offers",price:"Prices",rating:"Ratings",advisor_count:"Advisor counts",availability:"Availability",
  channel:"Reading channels",guarantee:"Guarantees",accuracy:"Accuracy claims",privacy:"Privacy",refund:"Refunds",social_proof:"Social proof",
};
const CLAIM_CATEGORY_ORDER=Object.keys(CLAIM_LABELS) as WorkspaceClaimCategory[];
const MAX_CLAIMS_PER_SOURCE=60;
const MAX_REVIEW_ITEMS=12;

function normalizeComparable(value:string){return value.toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ").trim().replace(/[.!?,;:]+$/g,"");}
function excerpt(value:string,max=190){const clean=value.replace(/\s+/g," ").trim();return clean.length<=max?clean:`${clean.slice(0,max-1).trimEnd()}…`;}
function splitBlocks(text:string){
  const paragraphBlocks=text.split(/\n\s*\n+/).map(item=>item.trim()).filter(Boolean);
  if(paragraphBlocks.length>=3)return paragraphBlocks;
  return text.split(/\r?\n+/).map(item=>item.trim()).filter(Boolean);
}
function multiset(values:string[]){const counts=new Map<string,number>();for(const value of values)counts.set(value,(counts.get(value)||0)+1);return counts;}

function buildChangeMap(originalText:string,currentText:string,wordDelta:number,baselineWords:number):WorkspaceChangeMap{
  const baseline=splitBlocks(originalText);
  const current=splitBlocks(currentText);
  const baselineNormalized=baseline.map(normalizeComparable);
  const currentNormalized=current.map(normalizeComparable);
  const availableBaseline=multiset(baselineNormalized);
  const added:string[]=[];
  let retainedBlocks=0;
  for(let index=0;index<current.length;index++){
    const key=currentNormalized[index];
    const count=availableBaseline.get(key)||0;
    if(count>0){retainedBlocks++;availableBaseline.set(key,count-1);}
    else added.push(current[index]);
  }
  const availableCurrent=multiset(currentNormalized);
  const removed:string[]=[];
  for(let index=0;index<baseline.length;index++){
    const key=baselineNormalized[index];
    const count=availableCurrent.get(key)||0;
    if(count>0)availableCurrent.set(key,count-1);
    else removed.push(baseline[index]);
  }
  return{
    baselineBlocks:baseline.length,currentBlocks:current.length,retainedBlocks,addedBlocks:added.length,removedBlocks:removed.length,
    wordDelta,wordDeltaPercent:baselineWords?Number(((wordDelta/baselineWords)*100).toFixed(1)):0,
    addedSamples:added.slice(0,5).map(item=>excerpt(item)),removedSamples:removed.slice(0,5).map(item=>excerpt(item)),
  };
}

function claimSegments(text:string){
  return text.split(/\r?\n+/).flatMap(line=>{
    const clean=line.trim();
    if(!clean)return[];
    if(clean.length<=280)return[clean];
    return clean.split(/(?<=[.!?])\s+/).map(item=>item.trim()).filter(Boolean);
  });
}
function claimCategories(value:string):WorkspaceClaimCategory[]{
  const categories:WorkspaceClaimCategory[]=[];
  if(/(?:special|new user|limited|welcome|first (?:reading|purchase)|\bfree\b|\boff\b|discount|deposit|credits?)/i.test(value)&&/(?:\$|€|£|%|minute|credit|purchase|reading)/i.test(value))categories.push("offer");
  if(/(?:\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s*\/\s*(?:min(?:ute)?|hour|hr))?|\b\d+(?:\.\d+)?\s*(?:usd|eur|gbp)\b/i.test(value))categories.push("price");
  if(/(?:\b\d(?:\.\d+)?\s*\/\s*(?:5|10)\b|^\s*(?:10|[0-9])(?:\.\d+)?\s*(?:exceptional|excellent|very good|good)\s*$|ratings?)/i.test(value))categories.push("rating");
  if(/advisor count|(?:\b\d[\d,]*\+?\b|\b(?:hundreds|thousands|millions)\b).{0,30}\b(?:psychics|advisors|readers)\b/i.test(value))categories.push("advisor_count");
  if(/24\s*\/\s*7|availability\s*:\s*yes|available (?:around the clock|anytime)/i.test(value))categories.push("availability");
  if(/reading methods?|(?:via|by) (?:live )?(?:chat|phone|voice|video)|\bchat\s*,\s*phone|phone\s*,\s*video/i.test(value))categories.push("channel");
  if(/guarantee|guaranteed|satisfaction guaranteed|money[- ]back/i.test(value))categories.push("guarantee");
  if(/accurac|prediction accuracy|accurate reading/i.test(value))categories.push("accuracy");
  if(/privacy|confidential|secure sessions?|personal details/i.test(value))categories.push("privacy");
  if(/refund|money[- ]back/i.test(value))categories.push("refund");
  if(/\b\d[\d,.]*\+?\s+(?:users?|people|clients?|customers?)\b|people visited|users got/i.test(value))categories.push("social_proof");
  return[...new Set(categories)];
}
function claimValue(category:WorkspaceClaimCategory,value:string){
  const patterns:Partial<Record<WorkspaceClaimCategory,RegExp>>={
    price:/(?:\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s*\/\s*(?:min(?:ute)?|hour|hr))?/gi,
    rating:/(?:\b\d(?:\.\d+)?\s*\/\s*(?:5|10)\b|^\s*(?:10|[0-9])(?:\.\d+)?)/gi,
    advisor_count:/\b\d[\d,]*\+?\b/g,
    availability:/24\s*\/\s*7|availability\s*:\s*yes/gi,
    channel:/\b(?:chat|phone|voice|video|mobile)\b/gi,
    accuracy:/\b\d+(?:\.\d+)?%\b|\b(?:accuracy|accurate|prediction)\b/gi,
    social_proof:/\b\d[\d,.]*\+?\s+(?:users?|people|clients?|customers?)\b/gi,
  };
  const matches=patterns[category]?value.match(patterns[category]!):null;
  return matches&&matches.length?[...new Set(matches.map(item=>item.trim()))].join(" · "):excerpt(value,120);
}

function extractClaims(text:string,source:"baseline"|"current"){
  const drafts:Array<Omit<WorkspaceClaim,"id"|"status">&{normalized:string}>=[];
  const seen=new Set<string>();
  for(const segment of claimSegments(text)){
    for(const category of claimCategories(segment)){
      const normalized=normalizeComparable(segment);
      const key=`${category}|${normalized}`;
      if(seen.has(key))continue;
      seen.add(key);
      drafts.push({source,category,value:claimValue(category,segment),excerpt:excerpt(segment),normalized});
      if(drafts.length>=MAX_CLAIMS_PER_SOURCE)return drafts;
    }
  }
  return drafts;
}

function buildClaims(analysisId:string,originalText:string,currentText:string){
  const baselineDrafts=extractClaims(originalText,"baseline");
  const currentDrafts=extractClaims(currentText,"current");
  const baselineKeys=multiset(baselineDrafts.map(item=>`${item.category}|${item.normalized}`));
  const currentKeys=multiset(currentDrafts.map(item=>`${item.category}|${item.normalized}`));
  const baselineClaims:WorkspaceClaim[]=baselineDrafts.map((item,index)=>{
    const key=`${item.category}|${item.normalized}`;
    return{id:`${analysisId}:claim:baseline:${index}`,source:item.source,category:item.category,value:item.value,excerpt:item.excerpt,status:(currentKeys.get(key)||0)>0?"retained":"baseline_only"};
  });
  const currentClaims:WorkspaceClaim[]=currentDrafts.map((item,index)=>{
    const key=`${item.category}|${item.normalized}`;
    return{id:`${analysisId}:claim:current:${index}`,source:item.source,category:item.category,value:item.value,excerpt:item.excerpt,status:(baselineKeys.get(key)||0)>0?"retained":"current_only"};
  });
  const claims=[...currentClaims,...baselineClaims];
  const claimSummary=CLAIM_CATEGORY_ORDER.map(category=>{
    const baseline=baselineClaims.filter(item=>item.category===category);
    const current=currentClaims.filter(item=>item.category===category);
    return{category,label:CLAIM_LABELS[category],baseline:baseline.length,current:current.length,retained:current.filter(item=>item.status==="retained").length,currentOnly:current.filter(item=>item.status==="current_only").length,baselineOnly:baseline.filter(item=>item.status==="baseline_only").length};
  }).filter(item=>item.baseline||item.current);
  return{claims,claimSummary};
}

function countExact(text:string,needle:string){let count=0;let from=0;while((from=text.indexOf(needle,from))>=0){count++;from+=Math.max(needle.length,1);}return count;}
function duplicateCandidates(text:string){
  const lines=[...text.matchAll(/[^\r\n]+/g)].map(match=>({text:match[0].trim(),start:match.index,end:(match.index||0)+match[0].length})).filter(item=>item.text);
  const candidates:Array<{expectedText:string;replacementText:string;excerpt:string;commercial:boolean}>=[];
  for(let index=1;index<lines.length;index++){
    const previous=lines[index-1];const current=lines[index];
    if(previous.text.length<4||normalizeComparable(previous.text)!==normalizeComparable(current.text))continue;
    const expectedText=text.slice(previous.start,current.end);
    if(countExact(text,expectedText)!==1)continue;
    candidates.push({expectedText,replacementText:previous.text,excerpt:excerpt(previous.text),commercial:/(?:\$|€|£|%|offer|free|price|rating)/i.test(previous.text)});
    if(candidates.length>=5)break;
  }
  return candidates;
}

function buildReviewQueue(analysisId:string,currentText:string,claims:WorkspaceClaim[],summary:WorkspaceClaimSummary[],changeMap:WorkspaceChangeMap){
  const drafts:Array<Omit<WorkspaceReviewItem,"id"|"evidenceRefs">&{claimIds?:string[]}>=[];
  for(const duplicate of duplicateCandidates(currentText))drafts.push({
    priority:"low",category:"duplicate",title:`Remove adjacent duplicate: “${excerpt(duplicate.excerpt,72)}”`,
    detail:"The same visible line appears twice in succession. Removing one copy reduces noise without inventing or changing a commercial fact.",
    patchCandidate:{expectedText:duplicate.expectedText,replacementText:duplicate.replacementText,rationale:"Remove one adjacent duplicate while preserving the original wording and claim."},
  });
  for(const row of summary.filter(item=>item.baseline>0&&item.current===0&&["guarantee","accuracy","privacy","refund","rating"].includes(item.category)))drafts.push({
    priority:row.category==="accuracy"||row.category==="guarantee"?"high":"medium",category:"coverage",title:`Review missing ${row.label.toLowerCase()}`,
    detail:`The baseline includes ${row.baseline} ${row.baseline===1?"item":"items"} in the “${row.label}” category, while the current version contains none. Confirm whether this omission is intentional; do not restore a claim without a source.`,
    claimIds:claims.filter(item=>item.source==="baseline"&&item.category===row.category).slice(0,6).map(item=>item.id),
  });
  for(const row of summary.filter(item=>item.currentOnly>0&&item.baselineOnly>0&&["offer","price","rating","advisor_count"].includes(item.category)))drafts.push({
    priority:["offer","price","rating"].includes(row.category)?"high":"medium",category:"claim_drift",title:`Verify changed ${row.label.toLowerCase()}`,
    detail:`Exact comparison found ${row.currentOnly} current-only and ${row.baselineOnly} baseline-only ${row.label.toLowerCase()} claims. Check the live source before publishing or patching values.`,
    claimIds:claims.filter(item=>item.category===row.category&&item.status!=="retained").slice(0,8).map(item=>item.id),
  });
  for(const category of ["accuracy","social_proof"] as WorkspaceClaimCategory[]){
    const current=claims.filter(item=>item.source==="current"&&item.category===category);
    if(current.length)drafts.push({priority:"high",category:"verification",title:`Verify ${current.length} ${CLAIM_LABELS[category].toLowerCase()} claim${current.length===1?"":"s"}`,detail:`These claims can materially affect trust and should be backed by a current source. The workspace flags them for verification rather than judging whether they are true.`,claimIds:current.slice(0,8).map(item=>item.id)});
  }
  const offers=summary.find(item=>item.category==="offer")?.current||0;
  const trust=summary.filter(item=>["guarantee","accuracy","privacy","refund"].includes(item.category)).reduce((total,item)=>total+item.current,0);
  if(offers>=4&&offers>Math.max(1,trust)*2)drafts.push({priority:"medium",category:"balance",title:"Balance offer density with decision support",detail:`The current version contains ${offers} offer claims versus ${trust} guarantee, accuracy, privacy, and refund claims combined. Review whether users can evaluate terms as easily as promotional prices.`,claimIds:claims.filter(item=>item.source==="current"&&["offer","guarantee","accuracy","privacy","refund"].includes(item.category)).slice(0,8).map(item=>item.id)});
  if(changeMap.wordDeltaPercent<=-25)drafts.push({priority:"low",category:"coverage",title:"Confirm the shorter version retained essential guidance",detail:`The current version is ${Math.abs(changeMap.wordDeltaPercent).toFixed(1)}% shorter by analyzed word count. Use the block map and claim gaps to verify that concision did not remove decision-critical information.`});
  const priorityOrder={high:0,medium:1,low:2};
  const categoryOrder={coverage:0,claim_drift:1,verification:2,balance:3,duplicate:4};
  return drafts.sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||categoryOrder[a.category]-categoryOrder[b.category]).slice(0,MAX_REVIEW_ITEMS).map((item,index)=>{
    const ownId=`${analysisId}:review:${index}`;
    return{id:ownId,priority:item.priority,category:item.category,title:item.title,detail:item.detail,evidenceRefs:[ownId,...(item.claimIds||[]).map(claimId=>claimId.replace(":claim:",":evidence:claim:"))],...(item.patchCandidate?{patchCandidate:item.patchCandidate}:{})};
  });
}

export function analyzeWorkspace(state:EvidenceWorkspaceState,context:OperationContext={}):EvidenceWorkspaceState{
  let baselineInternal:ReturnType<typeof analyzeText>;
  let currentInternal:ReturnType<typeof analyzeText>;
  try{
    baselineInternal=analyzeText(analysisInput(state.originalText,state.focusTerms));
    currentInternal=state.currentText===state.originalText?baselineInternal:analyzeText(analysisInput(state.currentText,state.focusTerms));
  }catch(error){
    throw new WorkspaceError("ANALYSIS_FAILED",error instanceof Error?error.message:"The text could not be analyzed.");
  }
  const comparison=compareAnalysisResults(
    {result:baselineInternal,unigrams:baselineInternal._allUnigrams,bigrams:baselineInternal._allBigrams},
    {result:currentInternal,unigrams:currentInternal._allUnigrams,bigrams:currentInternal._allBigrams},
    25,0,
  );
  const repeatedPhrases=[
    ...analyzeNgram(analysisInput(state.currentText,state.focusTerms),2).rows.filter(row=>row.count>1).slice(0,6).map(row=>({...row,n:2})),
    ...analyzeNgram(analysisInput(state.currentText,state.focusTerms),3).rows.filter(row=>row.count>1).slice(0,6).map(row=>({...row,n:3})),
  ].map(({term,count,n})=>({term,count,n}));
  const analysisId=id("analysis",context);
  const changeMap=buildChangeMap(state.originalText,state.currentText,comparison.metrics.tokenCount.delta,baselineInternal.tokenCount);
  const {claims,claimSummary}=buildClaims(analysisId,state.originalText,state.currentText);
  const reviewQueue=buildReviewQueue(analysisId,state.currentText,claims,claimSummary,changeMap);
  const claimEvidence:WorkspaceEvidence[]=claims.map(claim=>({
    id:claim.id.replace(":claim:",":evidence:claim:"),kind:"claim",label:`${claim.source==="current"?"Current":"Baseline"} ${CLAIM_LABELS[claim.category]}`,
    value:claim.value,detail:`${claim.status.replaceAll("_"," ")}: ${claim.excerpt}`,
  }));
  const reviewEvidence:WorkspaceEvidence[]=reviewQueue.map(item=>({id:item.id,kind:"risk",label:item.title,value:item.priority,detail:item.detail}));
  const evidence:WorkspaceEvidence[]=[
    {id:`${analysisId}:metric:word_count`,kind:"metric",label:"Current word count",value:currentInternal.tokenCount,detail:`Baseline ${baselineInternal.tokenCount}; delta ${comparison.metrics.tokenCount.delta}.`},
    {id:`${analysisId}:metric:vocabulary`,kind:"metric",label:"Current vocabulary",value:currentInternal.vocabularySize,detail:`Baseline ${baselineInternal.vocabularySize}; delta ${comparison.metrics.vocabularySize.delta}.`},
    {id:`${analysisId}:change:overview`,kind:"change",label:"Exact block change map",value:`${changeMap.addedBlocks} added · ${changeMap.removedBlocks} removed`,detail:`${changeMap.retainedBlocks} exact blocks retained; analyzed word-count delta ${changeMap.wordDeltaPercent}%.`},
    ...currentInternal.focusCoverage.map((row,index)=>({id:`${analysisId}:focus:${index}`,kind:"focus" as const,label:`Focus: ${row.term}`,value:row.count,detail:`${row.per1000.toFixed(2)} occurrences per 1,000 analyzed words.`})),
    ...repeatedPhrases.map((row,index)=>({id:`${analysisId}:phrase:${index}`,kind:"phrase" as const,label:`Repeated ${row.n}-gram`,value:row.term,detail:`${row.count} exact occurrences in the current revision.`})),
    {id:`${analysisId}:comparison:word_count`,kind:"comparison",label:"Word-count delta",value:comparison.metrics.tokenCount.delta,detail:"Current revision compared with the immutable baseline."},
    ...claimEvidence,...reviewEvidence,
  ];
  const createdAt=now(context);
  const analysis:WorkspaceAnalysis={id:analysisId,revision:state.revision,createdAt,baseline:toPublicAnalysisResult(baselineInternal),current:toPublicAnalysisResult(currentInternal),comparison,repeatedPhrases,changeMap,claims,claimSummary,reviewQueue,evidence};
  return{...state,analysis,updatedAt:createdAt};
}

export function addFinding(state:EvidenceWorkspaceState,input:{title:string;explanation:string;evidenceRefs:string[]},context:OperationContext={}):EvidenceWorkspaceState{
  if(state.findings.length>=MAX_FINDINGS)throw new WorkspaceError("FINDING_LIMIT",`A workspace can contain at most ${MAX_FINDINGS} findings.`);
  const analysis=currentAnalysis(state);
  const title=required(input.title,"Finding title",160);
  const explanation=required(input.explanation,"Finding explanation",1_500);
  const evidenceRefs=[...new Set(Array.isArray(input.evidenceRefs)?input.evidenceRefs:[])];
  if(!evidenceRefs.length)throw new WorkspaceError("EVIDENCE_REQUIRED","Select at least one evidence reference.");
  const valid=new Set(analysis.evidence.map(item=>item.id));
  if(evidenceRefs.some(ref=>!valid.has(ref)))throw new WorkspaceError("INVALID_EVIDENCE","Every finding must cite evidence from the current analysis.");
  const createdAt=now(context);
  const finding:WorkspaceFinding={id:id("finding",context),revision:state.revision,analysisId:analysis.id,title,explanation,evidenceRefs,createdAt};
  return{...state,findings:[...state.findings,finding],updatedAt:createdAt};
}

export function proposeTextPatch(state:EvidenceWorkspaceState,input:{baseRevision:number;findingIds:string[];expectedText:string;replacementText:string;rationale:string;recommendationKind?:WorkspaceRecommendationKind},context:OperationContext={}):EvidenceWorkspaceState{
  if(state.patches.length>=MAX_PATCHES)throw new WorkspaceError("PATCH_LIMIT",`A workspace can contain at most ${MAX_PATCHES} patches.`);
  currentAnalysis(state);
  if(input.baseRevision!==state.revision)throw new WorkspaceError("STALE_REVISION",`Patch targets revision ${input.baseRevision}; the current revision is ${state.revision}.`);
  const findingIds=[...new Set(Array.isArray(input.findingIds)?input.findingIds:[])];
  if(!findingIds.length)throw new WorkspaceError("FINDING_REQUIRED","Link the patch to at least one finding.");
  const valid=new Set(state.findings.filter(item=>item.revision===state.revision).map(item=>item.id));
  if(findingIds.some(ref=>!valid.has(ref)))throw new WorkspaceError("INVALID_FINDING","Every patch must cite a finding from the current revision.");
  const expectedText=required(input.expectedText,"Expected text",10_000);
  if(typeof input.replacementText!=="string"||input.replacementText.length>10_000)throw new WorkspaceError("INVALID_INPUT","Replacement text must be 10,000 characters or fewer.");
  if(expectedText===input.replacementText)throw new WorkspaceError("NO_CHANGE","Replacement text must differ from expected text.");
  const rationale=required(input.rationale,"Patch rationale",1_000);
  const start=uniqueExactIndex(state.currentText,expectedText);
  const createdAt=now(context);
  const patch:WorkspacePatch={id:id("patch",context),baseRevision:state.revision,findingIds,expectedText,replacementText:input.replacementText,rationale,start,end:start+expectedText.length,status:"proposed",createdAt,...(input.recommendationKind?{recommendationKind:input.recommendationKind}:{})};
  return{...state,patches:[...state.patches,patch],updatedAt:createdAt};
}

export function submitReviewPlan(state:EvidenceWorkspaceState,input:{baseRevision:number;recommendations:WorkspaceReviewPlanRecommendation[]}):EvidenceWorkspaceState{
  const analysis=currentAnalysis(state);
  if(input.baseRevision!==state.revision)throw new WorkspaceError("STALE_REVISION",`Review plan targets revision ${input.baseRevision}; the current revision is ${state.revision}.`);
  if(!Array.isArray(input.recommendations)||input.recommendations.length<3||input.recommendations.length>5)throw new WorkspaceError("REVIEW_PLAN_SIZE","Submit one complete review plan containing 3 to 5 recommendations.");
  const allowedKinds=new Set<WorkspaceRecommendationKind>(["structure","clarity","trust","verification","cleanup"]);
  if(input.recommendations.some(item=>!item||!allowedKinds.has(item.kind)))throw new WorkspaceError("INVALID_RECOMMENDATION_KIND","Each recommendation needs a supported kind.");
  if(input.recommendations.filter(item=>item.kind==="cleanup").length>1)throw new WorkspaceError("CLEANUP_LIMIT","A review plan may contain at most one cleanup recommendation.");
  if(!input.recommendations.some(item=>item.kind==="structure"||item.kind==="clarity"))throw new WorkspaceError("REVIEW_PLAN_INCOMPLETE","Include at least one structural or clarity improvement.");
  const hasClaimRisk=analysis.reviewQueue.some(item=>["claim_drift","verification","coverage","balance"].includes(item.category));
  if(hasClaimRisk&&!input.recommendations.some(item=>item.kind==="trust"||item.kind==="verification"))throw new WorkspaceError("REVIEW_PLAN_INCOMPLETE","This analysis contains claim risks; include at least one trust or verification recommendation.");
  const titles=new Set<string>();
  const anchors=new Set<string>();
  for(const item of input.recommendations){
    const titleKey=normalizeComparable(item.title);
    if(titles.has(titleKey))throw new WorkspaceError("DUPLICATE_RECOMMENDATION","Recommendation titles must be distinct.");
    titles.add(titleKey);
    if(anchors.has(item.expectedText))throw new WorkspaceError("DUPLICATE_RECOMMENDATION","Each recommendation must target a different exact text span.");
    anchors.add(item.expectedText);
  }
  let next=state;
  for(const item of input.recommendations){
    next=addFinding(next,{title:item.title,explanation:item.explanation,evidenceRefs:item.evidenceRefs});
    const findingId=next.findings.at(-1)!.id;
    next=proposeTextPatch(next,{baseRevision:input.baseRevision,findingIds:[findingId],expectedText:item.expectedText,replacementText:item.replacementText,rationale:item.rationale,recommendationKind:item.kind});
  }
  return next;
}

export function decidePatch(state:EvidenceWorkspaceState,patchId:string,decision:"approved"|"rejected",context:OperationContext={}):EvidenceWorkspaceState{
  const patch=state.patches.find(item=>item.id===patchId);
  if(!patch)throw new WorkspaceError("PATCH_NOT_FOUND","Patch was not found.");
  if(patch.status!=="proposed")throw new WorkspaceError("PATCH_NOT_PENDING","Only a proposed patch can be approved or rejected.");
  if(patch.baseRevision!==state.revision)throw new WorkspaceError("STALE_REVISION","This patch targets an earlier revision.");
  const decidedAt=now(context);
  return{...state,patches:state.patches.map(item=>item.id===patchId?{...item,status:decision,decidedAt}:item),updatedAt:decidedAt};
}

export function applyApprovedPatch(state:EvidenceWorkspaceState,input:{patchId:string;expectedRevision:number},context:OperationContext={}):EvidenceWorkspaceState{
  const patch=state.patches.find(item=>item.id===input.patchId);
  if(!patch)throw new WorkspaceError("PATCH_NOT_FOUND","Patch was not found.");
  if(patch.status!=="approved")throw new WorkspaceError("HUMAN_APPROVAL_REQUIRED","A human must approve this patch in the page before it can be applied.");
  if(input.expectedRevision!==state.revision||patch.baseRevision!==state.revision)throw new WorkspaceError("STALE_REVISION","The document changed after this patch was proposed.");
  if(state.currentText.slice(patch.start,patch.end)!==patch.expectedText)throw new WorkspaceError("PATCH_CONFLICT","The exact source span changed; review and propose a new patch.");
  const currentText=`${state.currentText.slice(0,patch.start)}${patch.replacementText}${state.currentText.slice(patch.end)}`;
  if(currentText.length>MAX_WORKSPACE_TEXT_CHARS)throw new WorkspaceError("INPUT_TOO_LARGE",`The patched text exceeds ${MAX_WORKSPACE_TEXT_CHARS.toLocaleString()} characters.`);
  const revision=state.revision+1;
  const appliedAt=now(context);
  const patches=state.patches.map(item=>{
    if(item.id===patch.id)return{...item,status:"applied" as const,appliedAt};
    if((item.status==="proposed"||item.status==="approved")&&item.baseRevision<revision)return{...item,status:"stale" as const};
    return item;
  });
  return{...state,currentText,revision,analysis:null,patches,updatedAt:appliedAt,history:[...state.history,{revision,text:currentText,event:"patch_applied" as const,patchId:patch.id,createdAt:appliedAt}].slice(-MAX_HISTORY_ENTRIES)};
}

export function undoLastAppliedPatch(state:EvidenceWorkspaceState,context:OperationContext={}):EvidenceWorkspaceState{
  if(state.history.length<2||state.history.at(-1)?.event!=="patch_applied")throw new WorkspaceError("NOTHING_TO_UNDO","There is no applied change to undo.");
  const previous=state.history[state.history.length-2];
  const revision=state.revision+1;
  const createdAt=now(context);
  return{...state,currentText:previous.text,revision,analysis:null,patches:state.patches.map(item=>(item.status==="proposed"||item.status==="approved")?{...item,status:"stale" as const}:item),updatedAt:createdAt,history:[...state.history,{revision,text:previous.text,event:"undo" as const,createdAt}].slice(-MAX_HISTORY_ENTRIES)};
}

export function workspaceSummary(state:EvidenceWorkspaceState){
  return{
    workspaceId:state.id,revision:state.revision,goal:state.goal,focusTerms:state.focusTerms,
    hasCurrentAnalysis:Boolean(state.analysis&&state.analysis.revision===state.revision),
    analysisId:state.analysis?.id||null,
    metrics:state.analysis?{baselineWords:state.analysis.baseline.tokenCount,currentWords:state.analysis.current.tokenCount,wordDelta:state.analysis.comparison.metrics.tokenCount.delta,vocabularyDelta:state.analysis.comparison.metrics.vocabularySize.delta}:null,
    changeMap:state.analysis?.changeMap||null,
    claimSummary:state.analysis?.claimSummary||[],
    claims:state.analysis?.claims||[],
    reviewQueue:state.analysis?.reviewQueue||[],
    evidence:state.analysis?.evidence||[],
    findings:state.findings.map(({id,revision,title,explanation,evidenceRefs})=>({id,revision,title,explanation,evidenceRefs})),
    reviewPlan:{minimumRecommendations:3,maximumRecommendations:5,requirements:["At least one structure or clarity recommendation","At least one trust or verification recommendation when claim risks exist","At most one cleanup recommendation"],currentRecommendations:state.patches.filter(item=>item.baseRevision===state.revision&&item.recommendationKind).length},
    patches:state.patches.map(({id,baseRevision,findingIds,expectedText,replacementText,rationale,status,recommendationKind})=>({id,baseRevision,findingIds,expectedText,replacementText,rationale,status,recommendationKind})),
  };
}

export function exportWorkspaceReport(state:EvidenceWorkspaceState,format:"markdown"|"json"){
  const analysis=currentAnalysis(state);
  if(format==="json")return{format,filename:`text-analysis-evidence-${state.id}.json`,content:JSON.stringify(state,null,2)};
  const focus=analysis.current.focusCoverage.length?analysis.current.focusCoverage.map(row=>`- ${row.term}: ${row.count} (${row.per1000.toFixed(2)} per 1,000 words)`).join("\n"):"- No focus terms supplied.";
  const findings=state.findings.length?state.findings.map(item=>`### ${item.title}\n\n${item.explanation}\n\nEvidence: ${item.evidenceRefs.join(", ")}`).join("\n\n"):"No findings recorded.";
  const patches=state.patches.length?state.patches.map(item=>`- **${item.recommendationKind?`${item.recommendationKind} · `:""}${item.status}** — \`${item.expectedText}\` → \`${item.replacementText}\` (${item.rationale})`).join("\n"):"- No patches recorded.";
  const claimRows=analysis.claimSummary.length?analysis.claimSummary.map(item=>`| ${item.label} | ${item.baseline} | ${item.current} | ${item.retained} | ${item.currentOnly} | ${item.baselineOnly} |`).join("\n"):"| No commercial claims detected | 0 | 0 | 0 | 0 | 0 |";
  const reviewRows=analysis.reviewQueue.length?analysis.reviewQueue.map(item=>`- **${item.priority.toUpperCase()} · ${item.title}** — ${item.detail}`).join("\n"):"- No deterministic review items detected.";
  const changeMap=analysis.changeMap;
  const content=`# Claim-Aware Version Review\n\nWorkspace: ${state.id}\nRevision: ${state.revision}\nGoal: ${state.goal}\n\n## Decision brief\n\n- Analyzed word change: ${changeMap.wordDelta} (${changeMap.wordDeltaPercent}%).\n- Exact blocks: ${changeMap.retainedBlocks} retained, ${changeMap.addedBlocks} added, ${changeMap.removedBlocks} removed.\n- Review queue: ${analysis.reviewQueue.filter(item=>item.priority==="high").length} high, ${analysis.reviewQueue.filter(item=>item.priority==="medium").length} medium, ${analysis.reviewQueue.filter(item=>item.priority==="low").length} low priority.\n\n## Before / after metrics\n\n| Metric | Baseline | Current | Delta |\n| --- | ---: | ---: | ---: |\n| Words | ${analysis.baseline.tokenCount} | ${analysis.current.tokenCount} | ${analysis.comparison.metrics.tokenCount.delta} |\n| Vocabulary | ${analysis.baseline.vocabularySize} | ${analysis.current.vocabularySize} | ${analysis.comparison.metrics.vocabularySize.delta} |\n\n## Commercial claim ledger\n\n| Claim type | Baseline | Current | Exact retained | Current only | Baseline only |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${claimRows}\n\n## Prioritized review queue\n\n${reviewRows}\n\n## Focus coverage\n\n${focus}\n\n## Findings\n\n${findings}\n\n## Patch decisions\n\n${patches}\n`;
  return{format,filename:`text-analysis-evidence-${state.id}.md`,content};
}

export function restoreWorkspace(value:unknown):EvidenceWorkspaceState{
  if(!value||typeof value!=="object")throw new WorkspaceError("INVALID_WORKSPACE","Saved workspace is not an object.");
  const candidate=value as Partial<EvidenceWorkspaceState>;
  if(candidate.version!==EVIDENCE_WORKSPACE_VERSION||typeof candidate.id!=="string"||typeof candidate.originalText!=="string"||typeof candidate.currentText!=="string"||!Number.isInteger(candidate.revision)||!Array.isArray(candidate.focusTerms)||!Array.isArray(candidate.findings)||!Array.isArray(candidate.patches)||!Array.isArray(candidate.history))throw new WorkspaceError("INVALID_WORKSPACE","Saved workspace has an unsupported or incomplete structure.");
  if(candidate.originalText.length>MAX_WORKSPACE_TEXT_CHARS||candidate.currentText.length>MAX_WORKSPACE_TEXT_CHARS)throw new WorkspaceError("INVALID_WORKSPACE","Saved workspace text exceeds the current limit.");
  return candidate as EvidenceWorkspaceState;
}
