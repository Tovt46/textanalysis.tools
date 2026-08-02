import {lookup as dnsLookup} from "node:dns/promises";
import {createHash} from "node:crypto";
import {request as httpRequest} from "node:http";
import {request as httpsRequest} from "node:https";
import {BlockList,isIP} from "node:net";
import {Readable} from "node:stream";
import { analyzeText,countAnalysisTokens,toPublicAnalysisResult,type AnalyzeInput } from "./analyze";
import {markApiResponseErrorClass} from "./api-observability";
import { compareAnalysisResults } from "./comparison";
import {createConfiguredRateLimitStore,type RateLimitBackendStatus} from "./rate-limit-store";

export {createConfiguredRateLimitStore,FileRateLimitStore,MemoryRateLimitStore,ResilientRateLimitStore,type RateLimitBackendStatus,type RateLimitStore} from "./rate-limit-store";

export const API_VERSION = "1.0";
export const MAX_TEXT_CHARS = 500_000;
export const MAX_REMOTE_CHARS = 2_000_000;
export const MAX_REMOTE_BYTES = 2_000_000;
export const MAX_API_RESPONSE_BYTES = 5_000_000;
export const MAX_ANALYSIS_TOKENS = 100_000;
const REMOTE_FETCH_TIMEOUT_MS = 12_000;
const MAX_REMOTE_REDIRECTS = 3;
const MAX_REMOTE_ADDRESS_ATTEMPTS = 4;
const MAX_REMOTE_ADDRESS_ATTEMPT_MS = 3_000;
export const MAX_REMOTE_REQUESTS_PER_SOURCE = (MAX_REMOTE_REDIRECTS+1)*MAX_REMOTE_ADDRESS_ATTEMPTS;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After",
  "Access-Control-Max-Age": "86400",
};

export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_KEYS = 5_000;
const sharedRateLimitPath=process.env.RATE_LIMIT_STORE_PATH?.trim();
const rateLimitStore=createConfiguredRateLimitStore(sharedRateLimitPath,{maximumKeys:MAX_RATE_LIMIT_KEYS});

export class PublicApiError extends Error {
  constructor(
    public status:number,
    public code:string,
    message:string,
    public retryAfter?:number,
    public headers:Record<string,string>={},
  ){
    super(message);
  }
}

export type RemoteLookupAddress={address:string;family:4|6};
export type RemoteAddressLookup=(hostname:string)=>Promise<readonly RemoteLookupAddress[]>;
export type RemoteFetchImplementation=(input:URL,init:RequestInit,address:RemoteLookupAddress)=>Promise<Response>;

export type RemoteFetchBudgetLimits={
  maxRequests:number;
  maxBytes:number;
  maxConcurrent:number;
};

export type RemoteFetchBudgetSnapshot=RemoteFetchBudgetLimits&{
  requests:number;
  bytes:number;
  active:number;
  queued:number;
};

export type RemoteFetchBudget={
  run<T>(task:()=>Promise<T>):Promise<T>;
  consumeRequest():void;
  consumeBytes(bytes:number):void;
  assertByteCapacity(bytes:number):void;
  snapshot():RemoteFetchBudgetSnapshot;
};

export type RemoteFetchContext={
  lookup?:RemoteAddressLookup;
  fetchImpl?:RemoteFetchImplementation;
  budget?:RemoteFetchBudget;
  timeoutMs?:number;
  consumeAnalysisTokens?:(tokens:number)=>void;
};

function positiveInteger(value:number,name:string){
  if(!Number.isSafeInteger(value)||value<1) throw new RangeError(`${name} must be a positive integer.`);
  return value;
}

function remoteBudgetError(){
  return new PublicApiError(413,"REMOTE_BUDGET_EXCEEDED","The combined remote sources exceed this operation's resource budget.");
}

export function createRemoteFetchBudget(limits:Partial<RemoteFetchBudgetLimits>={}):RemoteFetchBudget{
  const resolved:RemoteFetchBudgetLimits={
    maxRequests:positiveInteger(limits.maxRequests??MAX_REMOTE_REQUESTS_PER_SOURCE,"maxRequests"),
    maxBytes:positiveInteger(limits.maxBytes??MAX_REMOTE_BYTES,"maxBytes"),
    maxConcurrent:positiveInteger(limits.maxConcurrent??1,"maxConcurrent"),
  };
  let requests=0;
  let bytes=0;
  let active=0;
  const queue:Array<()=>void>=[];

  const acquire=async()=>{
    if(active>=resolved.maxConcurrent) await new Promise<void>(resolve=>queue.push(resolve));
    active+=1;
  };
  const release=()=>{
    active-=1;
    queue.shift()?.();
  };
  const consumeRequest=()=>{
    if(requests>=resolved.maxRequests)throw remoteBudgetError();
    requests+=1;
  };

  return {
    async run<T>(task:()=>Promise<T>){
      consumeRequest();
      await acquire();
      try{return await task();}finally{release();}
    },
    consumeRequest,
    consumeBytes(nextBytes:number){
      if(!Number.isSafeInteger(nextBytes)||nextBytes<0) throw new RangeError("bytes must be a non-negative integer.");
      if(bytes+nextBytes>resolved.maxBytes) throw remoteBudgetError();
      bytes+=nextBytes;
    },
    assertByteCapacity(nextBytes:number){
      if(!Number.isSafeInteger(nextBytes)||nextBytes<0) throw new RangeError("bytes must be a non-negative integer.");
      if(bytes+nextBytes>resolved.maxBytes) throw remoteBudgetError();
    },
    snapshot(){return {...resolved,requests,bytes,active,queued:queue.length};},
  };
}

export async function mapWithConcurrency<T,R>(
  values:readonly T[],
  concurrency:number,
  mapper:(value:T,index:number)=>Promise<R>,
):Promise<R[]>{
  positiveInteger(concurrency,"concurrency");
  if(values.length===0)return[];
  const output=new Array<R>(values.length);
  let cursor=0;
  let firstError:unknown;
  await Promise.all(Array.from({length:Math.min(concurrency,values.length)},async()=>{
    while(firstError===undefined){
      const index=cursor;
      if(index>=values.length)return;
      cursor+=1;
      try{output[index]=await mapper(values[index],index);}catch(error){firstError=error;}
    }
  }));
  if(firstError!==undefined)throw firstError;
  return output;
}

export function apiJson(data:unknown,status=200,extraHeaders:Record<string,string>={}){
  const headers={...CORS_HEADERS,"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8",...extraHeaders};
  const serialized=JSON.stringify(data);
  if(new TextEncoder().encode(serialized).byteLength>MAX_API_RESPONSE_BYTES){
    const error=JSON.stringify({apiVersion:API_VERSION,error:{code:"RESULT_TOO_LARGE",message:"The analysis result is too large to return in one response."}});
    return new Response(error,{status:413,headers});
  }
  return new Response(serialized,{status,headers});
}

export function apiOptions(){
  return new Response(null,{status:204,headers:CORS_HEADERS});
}

export function apiErrorResponse(error:unknown,extraHeaders:Record<string,string>={}){
  if(error instanceof PublicApiError){
    const headers:Record<string,string>={...extraHeaders,...error.headers};
    if(error.retryAfter)headers["Retry-After"]=String(error.retryAfter);
    return markApiResponseErrorClass(
      apiJson({apiVersion:API_VERSION,error:{code:error.code,message:error.message}},error.status,headers),
      publicApiErrorClass(error.code),
    );
  }
  return markApiResponseErrorClass(
    apiJson({apiVersion:API_VERSION,error:{code:"ANALYSIS_FAILED",message:"The analysis failed unexpectedly."}},500,extraHeaders),
    "server_error",
  );
}

function publicApiErrorClass(code:string){
  if(code==="RATE_LIMITED")return "rate_limit";
  if(code==="FETCH_FAILED"||code==="TOO_MANY_REDIRECTS")return "remote_fetch_error";
  if(code==="INVALID_URL"||code==="UNSAFE_URL")return "remote_safety";
  if(code==="REMOTE_CONTENT_TOO_LARGE"||code==="REMOTE_BUDGET_EXCEEDED")return "remote_resource_limit";
  if(code==="UNSUPPORTED_REMOTE_TYPE")return "remote_content_type";
  if(code==="UNSUPPORTED_MEDIA_TYPE")return "unsupported_media_type";
  if(code==="INSUFFICIENT_TEXT")return "unprocessable_input";
  if(code.endsWith("TOO_LARGE"))return "resource_limit";
  return "invalid_request";
}

function headerIp(value:string|null){
  if(!value)return null;
  const candidate=value.trim();
  if(isIP(candidate)!==0)return candidate.toLowerCase();
  const bracketed=/^\[([^\]]+)\](?::\d+)?$/.exec(candidate)?.[1];
  if(bracketed&&isIP(bracketed)!==0)return bracketed.toLowerCase();
  const ipv4WithPort=/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(candidate)?.[1];
  return ipv4WithPort&&isIP(ipv4WithPort)===4?ipv4WithPort:null;
}

function rateLimitKey(request:Request){
  const realIp=headerIp(request.headers.get("x-real-ip"));
  const forwarded=request.headers.get("x-forwarded-for")?.split(",").map(value=>headerIp(value)).filter((value):value is string=>Boolean(value));
  return hashRateLimitIdentity(realIp||forwarded?.at(-1)||"anonymous");
}

export function hashRateLimitIdentity(identity:string){
  return createHash("sha256").update("textanalysis.tools:rate-limit:v1\0").update(identity).digest("hex");
}

export function getRateLimitBackendStatus():RateLimitBackendStatus{
  return rateLimitStore.status();
}

export function probeRateLimitBackendStatus(){
  return rateLimitStore.probe(Date.now());
}

function rateLimitHeaders(remaining:number,reset:number){
  return {
    "RateLimit-Limit":String(RATE_LIMIT),
    "RateLimit-Remaining":String(Math.max(0,remaining)),
    "RateLimit-Reset":String(Math.max(1,reset)),
  };
}

export function calculateRateLimitCost(body:Record<string,unknown>){
  const objectValue=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>
    :null;
  let sources:Record<string,unknown>[]=[];
  if(Array.isArray(body.documents)){
    sources=body.documents.map(objectValue).filter((value):value is Record<string,unknown>=>Boolean(value));
  }else{
    const a=objectValue(body.a);
    const b=objectValue(body.b);
    if(a||b)sources=[a,b].filter((value):value is Record<string,unknown>=>Boolean(value));
    else sources=[body];
  }
  const urlCount=sources.filter(source=>source.sourceType==="url").length;
  const textCharacters=sources.reduce((total,source)=>{
    if(source.sourceType==="url"||typeof source.source!=="string")return total;
    return total+source.source.length;
  },0);
  const documentCost=Math.max(0,sources.length-1);
  const remoteCost=urlCount*2;
  const inputSizeCost=Math.floor(textCharacters/100_000);
  return Math.min(RATE_LIMIT,1+documentCost+remoteCost+inputSizeCost);
}

export async function enforceRateLimit(request:Request,cost=1){
  if(!Number.isSafeInteger(cost)||cost<1||cost>RATE_LIMIT)throw new RangeError("rate-limit cost must be a positive integer within the request limit.");
  const now=Date.now();
  const key=rateLimitKey(request);
  const current=await rateLimitStore.increment(key,cost,now,RATE_WINDOW_MS);
  const retryAfter=Math.max(1,Math.ceil((RATE_WINDOW_MS-(now-current.startedAt))/1000));
  const headers=rateLimitHeaders(RATE_LIMIT-current.count,retryAfter);
  if(current.count>RATE_LIMIT){
    throw new PublicApiError(429,"RATE_LIMITED",`Too many requests. Try again in ${retryAfter} seconds.`,retryAfter,headers);
  }
  return headers;
}

export async function enforceBodyRateLimit(
  request:Request,
  body:Record<string,unknown>,
  alreadyCharged=1,
){
  const totalCost=calculateRateLimitCost(body);
  if(totalCost<=alreadyCharged)return null;
  return enforceRateLimit(request,totalCost-alreadyCharged);
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
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new PublicApiError(400,"INVALID_JSON","The request body is not valid JSON.");}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)){
    throw new PublicApiError(400,"INVALID_ARGUMENT","The request body must be a JSON object.");
  }
  return parsed as Record<string,unknown>;
}

const blockedIpv4Addresses=new BlockList();
for(const [network,prefix] of [
  ["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],
  ["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],
  ["192.31.196.0",24],["192.52.193.0",24],["192.88.99.0",24],["192.168.0.0",16],
  ["192.175.48.0",24],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],
  ["224.0.0.0",4],["240.0.0.0",4],
] as const) blockedIpv4Addresses.addSubnet(network,prefix,"ipv4");
const blockedIpv6Addresses=new BlockList();
for(const [network,prefix] of [
  ["::",96],["::ffff:0:0",96],["64:ff9b::",96],["64:ff9b:1::",48],
  ["100::",64],["2001::",23],["2001:db8::",32],["2002::",16],
  ["3fff::",20],["5f00::",16],["fc00::",7],["fe80::",10],["fec0::",10],["ff00::",8],
] as const) blockedIpv6Addresses.addSubnet(network,prefix,"ipv6");

function normalizedHostname(hostname:string){
  return hostname.toLowerCase().replace(/^\[|\]$/g,"").replace(/\.+$/,"");
}

export function isPrivateOrReservedIp(address:string){
  const normalized=normalizedHostname(address).split("%")[0];
  const version=isIP(normalized);
  if(version===4)return blockedIpv4Addresses.check(normalized,"ipv4");
  if(version===6)return blockedIpv6Addresses.check(normalized,"ipv6");
  return true;
}

function unsafeHostname(hostname:string){
  const host=normalizedHostname(hostname);
  if(isIP(host)!==0)return isPrivateOrReservedIp(host);
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host.endsWith(".home.arpa")||!host.includes(".")) return true;
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

const defaultRemoteLookup:RemoteAddressLookup=async hostname=>{
  const addresses=await dnsLookup(hostname,{all:true,verbatim:true});
  return addresses.map(({address,family})=>({address,family:family as 4|6}));
};

function remoteTimeoutError(){
  return new PublicApiError(422,"FETCH_FAILED","The remote page could not be fetched within 12 seconds.");
}

async function withinRemoteDeadline<T>(deadlineAt:number,task:(remainingMs:number)=>Promise<T>){
  const remainingMs=deadlineAt-Date.now();
  if(remainingMs<=0)throw remoteTimeoutError();
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    return await Promise.race([
      task(remainingMs),
      new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>reject(remoteTimeoutError()),remainingMs);}),
    ]);
  }finally{if(timeout)clearTimeout(timeout);}
}

async function resolvePublicAddresses(url:URL,lookupAddress:RemoteAddressLookup,deadlineAt:number){
  const hostname=normalizedHostname(url.hostname);
  if(isIP(hostname)!==0){
    if(isPrivateOrReservedIp(hostname)) throw new PublicApiError(400,"UNSAFE_URL","Local, private, and internal network addresses are not allowed.");
    return [{address:hostname,family:isIP(hostname) as 4|6}];
  }
  let addresses:readonly RemoteLookupAddress[];
  try{addresses=await withinRemoteDeadline(deadlineAt,()=>lookupAddress(hostname));}catch(error){
    if(error instanceof PublicApiError)throw error;
    throw remoteTimeoutError();
  }
  if(!addresses.length||addresses.some(({address,family})=>isIP(address)!==family)){
    throw remoteTimeoutError();
  }
  if(addresses.some(({address})=>isPrivateOrReservedIp(address))){
    throw new PublicApiError(400,"UNSAFE_URL","Local, private, and internal network addresses are not allowed.");
  }
  return addresses;
}

const noBodyStatuses=new Set([101,103,204,205,304]);

export const fetchPinnedRemote:RemoteFetchImplementation=async(input,init,address)=>new Promise<Response>((resolve,reject)=>{
  const headers=new Headers(init.headers);
  headers.set("Host",input.host);
  headers.set("Accept-Encoding","identity");
  const statusResponse=(response:import("node:http").IncomingMessage)=>{
    try{
      const status=response.statusCode;
      if(status===undefined||status<200||status>599){
        response.destroy();
        reject(new Error(`The remote server returned unsupported HTTP status ${status??"unknown"}.`));
        return;
      }
      const responseHeaders=new Headers();
      for(let index=0;index<response.rawHeaders.length;index+=2){
        responseHeaders.append(response.rawHeaders[index],response.rawHeaders[index+1]);
      }
      const body=noBodyStatuses.has(status)
        ?null
        :Readable.toWeb(response) as unknown as BodyInit;
      resolve(new Response(body,{status,statusText:response.statusMessage,headers:responseHeaders}));
    }catch(error){
      response.destroy();
      reject(error);
    }
  };
  const options={
    protocol:input.protocol,
    hostname:address.address,
    family:address.family,
    port:input.port||undefined,
    path:`${input.pathname}${input.search}`,
    method:init.method||"GET",
    headers:Object.fromEntries(headers.entries()),
    signal:init.signal??undefined,
    agent:false as const,
  };
  const request=input.protocol==="https:"
    ?httpsRequest({...options,servername:isIP(normalizedHostname(input.hostname))===0?normalizedHostname(input.hostname):undefined},statusResponse)
    :httpRequest(options,statusResponse);
  request.once("error",reject);
  request.end();
});

async function cancelBody(response:Response){
  try{await response.body?.cancel();}catch{}
}

async function readRemoteText(response:Response,budget:RemoteFetchBudget){
  const declaredHeader=response.headers.get("content-length");
  if(declaredHeader){
    const declared=Number(declaredHeader);
    if(Number.isFinite(declared)&&declared>MAX_REMOTE_BYTES){
      await cancelBody(response);
      throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
    }
    if(Number.isSafeInteger(declared)&&declared>=0){
      try{budget.assertByteCapacity(declared);}catch(error){await cancelBody(response);throw error;}
    }
  }
  if(!response.body)return"";
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let received=0;
  let text="";
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      received+=value.byteLength;
      if(received>MAX_REMOTE_BYTES){
        await reader.cancel();
        throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
      }
      budget.consumeBytes(value.byteLength);
      text+=decoder.decode(value,{stream:true});
      if(text.length>MAX_REMOTE_CHARS){
        await reader.cancel();
        throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
      }
    }
    text+=decoder.decode();
  }catch(error){
    try{await reader.cancel();}catch{}
    if(error instanceof PublicApiError)throw error;
    throw new PublicApiError(422,"FETCH_FAILED","The remote page could not be fetched within 12 seconds.");
  }
  if(text.length>MAX_REMOTE_CHARS)throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large.");
  return text;
}

export async function fetchRemoteText(value:string,context:RemoteFetchContext={}){
  let url=validateRemoteUrl(value);
  const lookupAddress=context.lookup??defaultRemoteLookup;
  const fetchImpl=context.fetchImpl??fetchPinnedRemote;
  const budget=context.budget??createRemoteFetchBudget();
  const timeoutMs=positiveInteger(context.timeoutMs??REMOTE_FETCH_TIMEOUT_MS,"timeoutMs");
  const deadlineAt=Date.now()+timeoutMs;
  for(let redirect=0;redirect<=MAX_REMOTE_REDIRECTS;redirect+=1){
    const outcome=await budget.run(async()=>{
      const addresses=await resolvePublicAddresses(url,lookupAddress,deadlineAt);
      const candidates=[
        ...addresses.filter(address=>address.family===4),
        ...addresses.filter(address=>address.family===6),
      ].slice(0,MAX_REMOTE_ADDRESS_ATTEMPTS);
      let response:Response|undefined;
      for(let index=0;index<candidates.length;index+=1){
        if(index>0)budget.consumeRequest();
        const remainingTotal=deadlineAt-Date.now();
        if(remainingTotal<=0)throw remoteTimeoutError();
        const remainingCandidates=candidates.length-index;
        const attemptMs=remainingCandidates===1
          ?remainingTotal
          :Math.max(1,Math.min(MAX_REMOTE_ADDRESS_ATTEMPT_MS,Math.floor(remainingTotal/remainingCandidates)));
        const attemptDeadlineAt=Math.min(deadlineAt,Date.now()+attemptMs);
        try{
          response=await withinRemoteDeadline(attemptDeadlineAt,remainingMs=>fetchImpl(
            url,
            {headers:{"User-Agent":"BOW-Analyzer-API/1.0","Accept":"text/html,text/plain,application/xhtml+xml"},redirect:"manual",signal:AbortSignal.timeout(remainingMs)},
            candidates[index],
          ));
          break;
        }catch(error){
          if(error instanceof PublicApiError&&error.code!=="FETCH_FAILED")throw error;
          if(index===candidates.length-1||Date.now()>=deadlineAt){
            if(error instanceof PublicApiError)throw error;
            break;
          }
        }
      }
      if(!response)throw remoteTimeoutError();
      if(response.status>=300&&response.status<400){
        const location=response.headers.get("location");
        await cancelBody(response);
        if(!location) throw new PublicApiError(422,"FETCH_FAILED","The remote server returned an invalid redirect.");
        if(redirect===MAX_REMOTE_REDIRECTS) throw new PublicApiError(422,"TOO_MANY_REDIRECTS","The remote URL redirected too many times.");
        return {kind:"redirect" as const,url:validateRemoteUrl(new URL(location,url).toString())};
      }
      if(!response.ok){await cancelBody(response);throw new PublicApiError(422,"FETCH_FAILED",`The remote server returned HTTP ${response.status}.`);}
      const type=(response.headers.get("content-type")||"").toLowerCase();
      if(type&&!type.includes("text/html")&&!type.includes("text/plain")&&!type.includes("application/xhtml+xml")){
        await cancelBody(response);
        throw new PublicApiError(415,"UNSUPPORTED_REMOTE_TYPE","The remote URL must return HTML or plain text.");
      }
      try{
        return {kind:"text" as const,text:await withinRemoteDeadline(deadlineAt,()=>readRemoteText(response,budget))};
      }catch(error){
        await cancelBody(response);
        throw error;
      }
    });
    if(outcome.kind==="text")return outcome.text;
    url=outcome.url;
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
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new PublicApiError(400,"INVALID_ARGUMENT","stopwordLists must be an object keyed by en, ru, uk, or es.");
  const output:Partial<Record<"en"|"ru"|"uk"|"es",string[]>>={};
  for(const language of ["en","ru","uk","es"] as const){
    const list=(value as Record<string,unknown>)[language];
    if(list===undefined) continue;
    if(!Array.isArray(list)||list.length>1000||list.some(word=>typeof word!=="string"||word.length>100)) throw new PublicApiError(400,"INVALID_ARGUMENT",`stopwordLists.${language} must be an array of up to 1,000 short strings.`);
    output[language]=list as string[];
  }
  return output;
}

export async function normalizeAnalyzeBody(body:PublicAnalyzeBody,context:RemoteFetchContext={}):Promise<AnalyzeInput>{
  const sourceType=body.sourceType===undefined?"text":body.sourceType;
  if(sourceType!=="text"&&sourceType!=="url") throw new PublicApiError(400,"INVALID_ARGUMENT","sourceType must be text or url.");
  if(typeof body.source!=="string"||!body.source.trim()) throw new PublicApiError(400,"MISSING_SOURCE","source is required.");
  let text=body.source.trim();
  if(sourceType==="url"){
    if(text.length>2048) throw new PublicApiError(400,"INVALID_URL","The URL is too long.");
    text=await fetchRemoteText(text,context);
  }
  else if(text.length>MAX_TEXT_CHARS) throw new PublicApiError(413,"TEXT_TOO_LARGE",`Text input is limited to ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters.`);

  const analysisTokens=countAnalysisTokens(text,MAX_ANALYSIS_TOKENS+1);
  if(analysisTokens>MAX_ANALYSIS_TOKENS){
    throw new PublicApiError(413,"ANALYSIS_TOO_LARGE",`Each source is limited to ${MAX_ANALYSIS_TOKENS.toLocaleString("en-US")} analyzable words.`);
  }
  context.consumeAnalysisTokens?.(analysisTokens);

  const language=body.language===undefined?"auto":body.language;
  if(!["auto","en","ru","uk","es"].includes(String(language))) throw new PublicApiError(400,"INVALID_ARGUMENT","language must be auto, en, ru, uk, or es.");
  let focus:string[]=[];
  if(body.focus!==undefined){
    const focusTerms=Array.isArray(body.focus)
      ?body.focus
      :typeof body.focus==="string"
        ?body.focus.trim()?body.focus.split(","):[]
        :undefined;
    if(!focusTerms||focusTerms.length>100||focusTerms.some(term=>
      typeof term!=="string"||!term.trim()||term.length>200||countAnalysisTokens(term,1)===0
    )){
      throw new PublicApiError(400,"INVALID_ARGUMENT","focus must contain up to 100 non-empty analyzable phrases of at most 200 characters each.");
    }
    focus=focusTerms.map(term=>(term as string).trim());
  }

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

async function runCoreAnalysis(body:PublicAnalyzeBody,context:RemoteFetchContext={}){
  let result:ReturnType<typeof analyzeText>;
  try{result=analyzeText(await normalizeAnalyzeBody(body,context));}
  catch(error){
    if(error instanceof PublicApiError) throw error;
    const message=error instanceof Error?error.message:"The input could not be analyzed.";
    throw new PublicApiError(422,"INSUFFICIENT_TEXT",message);
  }
  return result;
}

export async function runPublicAnalysis(body:PublicAnalyzeBody,context:RemoteFetchContext={}){
  return toPublicAnalysisResult(await runCoreAnalysis(body,context));
}

export async function runComparisonAnalysis(body:PublicAnalyzeBody,context:RemoteFetchContext={}){
  const core=await runCoreAnalysis(body,context);
  return {result:toPublicAnalysisResult(core),unigrams:core._allUnigrams,bigrams:core._allBigrams};
}

export type AnalysisResult=Awaited<ReturnType<typeof runPublicAnalysis>>;
export type ComparisonAnalysis=Awaited<ReturnType<typeof runComparisonAnalysis>>;

export function compareResults(a:ComparisonAnalysis,b:ComparisonAnalysis,limit=1000,offset=0){
  return compareAnalysisResults(a,b,limit,offset);
}
