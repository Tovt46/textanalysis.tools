import { analyzeText, type AnalyzeInput } from "./analyze";

export const API_VERSION = "1.0";
export const MAX_TEXT_CHARS = 500_000;
export const MAX_REMOTE_CHARS = 2_000_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const requestWindows = new Map<string,{startedAt:number,count:number}>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export class PublicApiError extends Error {
  constructor(public status:number,public code:string,message:string,public retryAfter?:number){
    super(message);
  }
}

export function apiJson(data:unknown,status=200,extraHeaders:Record<string,string>={}){
  return Response.json(data,{status,headers:{...CORS_HEADERS,"Cache-Control":"no-store",...extraHeaders}});
}

export function apiOptions(){
  return new Response(null,{status:204,headers:CORS_HEADERS});
}

export function apiErrorResponse(error:unknown){
  if(error instanceof PublicApiError){
    const headers=error.retryAfter?{"Retry-After":String(error.retryAfter)}:{};
    return apiJson({apiVersion:API_VERSION,error:{code:error.code,message:error.message}},error.status,headers);
  }
  const message=error instanceof Error?error.message:"Analysis failed";
  return apiJson({apiVersion:API_VERSION,error:{code:"ANALYSIS_FAILED",message}},500);
}

export function enforceRateLimit(request:Request){
  const now=Date.now();
  const ip=(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"anonymous").trim();
  const current=requestWindows.get(ip);
  if(!current||now-current.startedAt>=RATE_WINDOW_MS){
    if(requestWindows.size>5000){
      for(const [key,window] of requestWindows) if(now-window.startedAt>=RATE_WINDOW_MS) requestWindows.delete(key);
    }
    requestWindows.set(ip,{startedAt:now,count:1});
    return;
  }
  current.count+=1;
  if(current.count>RATE_LIMIT){
    const retryAfter=Math.max(1,Math.ceil((RATE_WINDOW_MS-(now-current.startedAt))/1000));
    throw new PublicApiError(429,"RATE_LIMITED",`Too many requests. Try again in ${retryAfter} seconds.`,retryAfter);
  }
}

export async function readJsonBody(request:Request){
  const contentType=request.headers.get("content-type")||"";
  if(!contentType.toLowerCase().includes("application/json")){
    throw new PublicApiError(415,"UNSUPPORTED_MEDIA_TYPE","Use Content-Type: application/json.");
  }
  const declared=Number(request.headers.get("content-length")||0);
  if(declared>MAX_REMOTE_CHARS+50_000) throw new PublicApiError(413,"REQUEST_TOO_LARGE","The request body is too large.");
  const raw=await request.text();
  if(raw.length>MAX_REMOTE_CHARS+50_000) throw new PublicApiError(413,"REQUEST_TOO_LARGE","The request body is too large.");
  try{return JSON.parse(raw) as Record<string,unknown>;}catch{throw new PublicApiError(400,"INVALID_JSON","The request body is not valid JSON.");}
}

function privateIpv4(hostname:string){
  const parts=hostname.split(".");
  if(parts.length!==4||parts.some(part=>!/^\d+$/.test(part)||Number(part)>255)) return false;
  const [a,b]=parts.map(Number);
  return a===0||a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a>=224);
}

function unsafeHostname(hostname:string){
  const host=hostname.toLowerCase().replace(/^\[|\]$/g,"");
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||!host.includes(".")) return true;
  if(privateIpv4(host)) return true;
  if(host==="::1"||host==="::"||host.startsWith("fc")||host.startsWith("fd")||/^fe[89ab]/.test(host)) return true;
  if(host.startsWith("::ffff:")) return privateIpv4(host.slice(7));
  return false;
}

function validateRemoteUrl(value:string){
  let url:URL;
  try{url=new URL(value);}catch{throw new PublicApiError(400,"INVALID_URL","source must be a valid HTTP or HTTPS URL.");}
  if(!["http:","https:"].includes(url.protocol)) throw new PublicApiError(400,"INVALID_URL","Only HTTP and HTTPS URLs are supported.");
  if(url.username||url.password) throw new PublicApiError(400,"INVALID_URL","URLs containing credentials are not supported.");
  if(url.port&&!(["80","443"].includes(url.port))) throw new PublicApiError(400,"INVALID_URL","Only standard HTTP and HTTPS ports are supported.");
  if(unsafeHostname(url.hostname)) throw new PublicApiError(400,"UNSAFE_URL","Local, private, and internal network addresses are not allowed.");
  return url;
}

export async function fetchRemoteText(value:string){
  let url=validateRemoteUrl(value);
  for(let redirect=0;redirect<=3;redirect+=1){
    let response:Response;
    try{
      response=await fetch(url,{headers:{"User-Agent":"BOW-Analyzer-API/1.0","Accept":"text/html,text/plain,application/xhtml+xml"},redirect:"manual",signal:AbortSignal.timeout(12_000)});
    }catch{
      throw new PublicApiError(422,"FETCH_FAILED","The remote page could not be fetched within 12 seconds.");
    }
    if(response.status>=300&&response.status<400){
      const location=response.headers.get("location");
      if(!location) throw new PublicApiError(422,"FETCH_FAILED","The remote server returned an invalid redirect.");
      if(redirect===3) throw new PublicApiError(422,"TOO_MANY_REDIRECTS","The remote URL redirected too many times.");
      url=validateRemoteUrl(new URL(location,url).toString());
      continue;
    }
    if(!response.ok) throw new PublicApiError(422,"FETCH_FAILED",`The remote server returned HTTP ${response.status}.`);
    const type=(response.headers.get("content-type")||"").toLowerCase();
    if(type&&!type.includes("text/html")&&!type.includes("text/plain")&&!type.includes("application/xhtml+xml")){
      throw new PublicApiError(415,"UNSUPPORTED_REMOTE_TYPE","The remote URL must return HTML or plain text.");
    }
    const declared=Number(response.headers.get("content-length")||0);
    if(declared>MAX_REMOTE_CHARS) throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
    const text=await response.text();
    if(text.length>MAX_REMOTE_CHARS) throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
    return text;
  }
  throw new PublicApiError(422,"FETCH_FAILED","The remote page could not be fetched.");
}

type PublicAnalyzeBody={
  sourceType?:unknown;
  source?:unknown;
  language?:unknown;
  focus?:unknown;
  top?:unknown;
  tolerance?:unknown;
  keepStopwords?:unknown;
  stopwordLists?:unknown;
};

function optionalNumber(value:unknown,name:string,min:number,max:number){
  if(value===undefined||value===null||value==="") return undefined;
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max) throw new PublicApiError(400,"INVALID_ARGUMENT",`${name} must be between ${min} and ${max}.`);
  return number;
}

function normalizeStopwordLists(value:unknown){
  if(value===undefined) return undefined;
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new PublicApiError(400,"INVALID_ARGUMENT","stopwordLists must be an object keyed by en, ru, or uk.");
  const output:Partial<Record<"en"|"ru"|"uk",string[]>>={};
  for(const language of ["en","ru","uk"] as const){
    const list=(value as Record<string,unknown>)[language];
    if(list===undefined) continue;
    if(!Array.isArray(list)||list.length>1000||list.some(word=>typeof word!=="string"||word.length>100)) throw new PublicApiError(400,"INVALID_ARGUMENT",`stopwordLists.${language} must be an array of up to 1,000 short strings.`);
    output[language]=list as string[];
  }
  return output;
}

export async function normalizeAnalyzeBody(body:PublicAnalyzeBody):Promise<AnalyzeInput>{
  const sourceType=body.sourceType===undefined?"text":body.sourceType;
  if(sourceType!=="text"&&sourceType!=="url") throw new PublicApiError(400,"INVALID_ARGUMENT","sourceType must be text or url.");
  if(typeof body.source!=="string"||!body.source.trim()) throw new PublicApiError(400,"MISSING_SOURCE","source is required.");
  let text=body.source.trim();
  if(sourceType==="url"){
    if(text.length>2048) throw new PublicApiError(400,"INVALID_URL","The URL is too long.");
    text=await fetchRemoteText(text);
  }
  else if(text.length>MAX_TEXT_CHARS) throw new PublicApiError(413,"TEXT_TOO_LARGE",`Text input is limited to ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters.`);

  const language=body.language===undefined?"auto":body.language;
  if(!["auto","en","ru","uk"].includes(String(language))) throw new PublicApiError(400,"INVALID_ARGUMENT","language must be auto, en, ru, or uk.");
  let focus="";
  if(Array.isArray(body.focus)){
    if(body.focus.length>100||body.focus.some(term=>typeof term!=="string"||term.length>200)) throw new PublicApiError(400,"INVALID_ARGUMENT","focus must contain up to 100 short phrases.");
    focus=(body.focus as string[]).join(",");
  }else if(typeof body.focus==="string"&&body.focus.length<=20_000) focus=body.focus;
  else if(body.focus!==undefined) throw new PublicApiError(400,"INVALID_ARGUMENT","focus must be a string or an array of strings.");

  const top=optionalNumber(body.top,"top",5,100);
  if(top!==undefined&&!Number.isInteger(top)) throw new PublicApiError(400,"INVALID_ARGUMENT","top must be a whole number between 5 and 100.");
  if(body.keepStopwords!==undefined&&typeof body.keepStopwords!=="boolean") throw new PublicApiError(400,"INVALID_ARGUMENT","keepStopwords must be a boolean.");

  return {
    text,
    language:language as AnalyzeInput["language"],
    focus,
    top,
    tolerance:optionalNumber(body.tolerance,"tolerance",1.2,4),
    keepStopwords:body.keepStopwords===undefined?false:body.keepStopwords,
    stopwordLists:normalizeStopwordLists(body.stopwordLists),
    uiLanguage:"en",
  };
}

async function runCoreAnalysis(body:PublicAnalyzeBody){
  let result:ReturnType<typeof analyzeText>;
  try{result=analyzeText(await normalizeAnalyzeBody(body));}
  catch(error){
    if(error instanceof PublicApiError) throw error;
    const message=error instanceof Error?error.message:"The input could not be analyzed.";
    throw new PublicApiError(422,"INSUFFICIENT_TEXT",message);
  }
  return result;
}

function toPublicAnalysis(result:ReturnType<typeof analyzeText>){
  const {_allUnigrams,_allBigrams,...publicResult}=result;
  void _allUnigrams;void _allBigrams;
  return {
    ...publicResult,
    rows:result.rows.map(row=>{
      const share=result.tokenCount?row.actualCount/result.tokenCount:0;
      return {...row,share,percentage:share*100,per1000:share*1000};
    }),
    bigrams:result.bigrams.map(row=>({...row,percentage:row.share*100,per1000:row.share*1000})),
    focusCoverage:result.focusCoverage.map(row=>({...row,percentage:row.per1000/10})),
  };
}

export async function runPublicAnalysis(body:PublicAnalyzeBody){
  return toPublicAnalysis(await runCoreAnalysis(body));
}

export async function runComparisonAnalysis(body:PublicAnalyzeBody){
  const core=await runCoreAnalysis(body);
  return {result:toPublicAnalysis(core),unigrams:core._allUnigrams,bigrams:core._allBigrams};
}

export type AnalysisResult=Awaited<ReturnType<typeof runPublicAnalysis>>;
export type ComparisonAnalysis=Awaited<ReturnType<typeof runComparisonAnalysis>>;

function frequencyChanges(a:{term:string;count:number}[],b:{term:string;count:number}[],totalA:number,totalB:number){
  const terms=new Set([...a.map(row=>row.term),...b.map(row=>row.term)]);
  const aRows=new Map(a.map(row=>[row.term,row.count]));
  const bRows=new Map(b.map(row=>[row.term,row.count]));
  return [...terms].map(term=>{
    const countA=aRows.get(term)||0;
    const countB=bRows.get(term)||0;
    const shareA=totalA?countA/totalA:0;
    const shareB=totalB?countB/totalB:0;
    return {term,countA,countB,countDelta:countB-countA,shareA,shareB,shareDelta:shareB-shareA};
  }).sort((x,y)=>Math.abs(y.shareDelta)-Math.abs(x.shareDelta)||x.term.localeCompare(y.term)).slice(0,1000);
}

export function compareResults(a:ComparisonAnalysis,b:ComparisonAnalysis){
  const wordChanges=frequencyChanges(a.unigrams,b.unigrams,a.result.tokenCount,b.result.tokenCount);
  const bigramChanges=frequencyChanges(a.bigrams,b.bigrams,Math.max(1,a.result.tokenCount-1),Math.max(1,b.result.tokenCount-1));
  return {
    metrics:{
      tokenCount:{a:a.result.tokenCount,b:b.result.tokenCount,delta:b.result.tokenCount-a.result.tokenCount},
      vocabularySize:{a:a.result.vocabularySize,b:b.result.vocabularySize,delta:b.result.vocabularySize-a.result.vocabularySize},
      fittedExponent:{a:a.result.fittedExponent,b:b.result.fittedExponent,delta:b.result.fittedExponent-a.result.fittedExponent},
      rSquared:{a:a.result.rSquared,b:b.result.rSquared,delta:b.result.rSquared-a.result.rSquared},
      aboveModel:{a:a.result.zoneCounts.above,b:b.result.zoneCounts.above,delta:b.result.zoneCounts.above-a.result.zoneCounts.above},
    },
    wordChanges,
    bigramChanges,
  };
}
