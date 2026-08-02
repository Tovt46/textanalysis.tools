import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceBodyRateLimit,enforceRateLimit,normalizeAnalyzeBody,PublicApiError,readJsonBody } from "../../../lib/public-api";
import { analyzeBagOfWords, calculateTextSimilarity } from "../../../lib/analyze";
import {observeApiRequest} from "../../../lib/api-observability";
import { limitIdfRows,parseResultRowLimit,parseResultRowOffset } from "../../../lib/api-result-limits";
import { createCompoundFetchContext } from "../../../lib/api-request-budget";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"similarity",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"similarity",()=>apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"text-similarity",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  }));
}

function parseSimilarityMethod(value:unknown){
  if(value===undefined||value==="bow") return "bow";
  if(value==="tf-idf"||value==="tfidf"||value==="tf_idf") return "tfidf";
  throw new PublicApiError(400,"INVALID_ARGUMENT","method must be one of: bow, tf-idf.");
}

function parseTop(value:unknown){
  if(value===undefined||value===null||value==="") return 100;
  const top=Number(value);
  if(!Number.isInteger(top)||top<1||top>100) throw new PublicApiError(400,"INVALID_ARGUMENT","top must be an integer between 1 and 100.");
  return top;
}

export function POST(request:Request){
  return observeApiRequest(request,"similarity",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request) as {a?:unknown;b?:unknown;method?:unknown;top?:unknown;limit?:unknown;offset?:unknown};
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      if(!body.a||typeof body.a!=="object"||Array.isArray(body.a)||!body.b||typeof body.b!=="object"||Array.isArray(body.b)){
        throw new PublicApiError(400,"INVALID_ARGUMENT","Both a and b analysis inputs are required.");
      }
      const method=parseSimilarityMethod(body.method);
      const top=parseTop(body.top);
      const resultLimit=parseResultRowLimit(body.limit);
      const resultOffset=parseResultRowOffset(body.offset);
      const sources=[body.a,body.b] as const;
      const context=createCompoundFetchContext(sources);
      const [leftInput,rightInput]=await Promise.all([
        normalizeAnalyzeBody(body.a as Record<string,unknown>,context),
        normalizeAnalyzeBody(body.b as Record<string,unknown>,context),
      ]);
      const documentA=analyzeBagOfWords(leftInput);
      const documentB=analyzeBagOfWords(rightInput);
      const analysis=calculateTextSimilarity(documentA,documentB,method,top);
      const result=analysis.idfTable
        ?limitIdfRows(analysis as typeof analysis&{idfTable:NonNullable<typeof analysis.idfTable>},resultLimit,resultOffset)
        :analysis;
      await sendServerAnalyticsEvent("api_analysis",{operation:`text_similarity_${method}`,source_type:"mixed",text_language:result.language});
      return apiJson({
        apiVersion:API_VERSION,
        storage:"none",
        result,
      },200,rateHeaders);
    }catch(error){
      await sendServerAnalyticsEvent("api_error",{operation:"text_similarity"});
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
