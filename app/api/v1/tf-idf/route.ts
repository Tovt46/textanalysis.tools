import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceBodyRateLimit,enforceRateLimit,normalizeAnalyzeBody,readJsonBody,PublicApiError } from "../../../lib/public-api";
import { analyzeBagOfWords, calculateTfIdfCorpus } from "../../../lib/analyze";
import {observeApiRequest} from "../../../lib/api-observability";
import { limitIdfRows,parseResultRowLimit,parseResultRowOffset } from "../../../lib/api-result-limits";
import { createCompoundFetchContext } from "../../../lib/api-request-budget";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"tf-idf",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"tf-idf",()=>apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"tf-idf",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  }));
}

function parseTop(value:unknown){
  if(value===undefined||value===null||value==="") return 100;
  const top=Number(value);
  if(!Number.isInteger(top)||top<1||top>100) throw new PublicApiError(400,"INVALID_ARGUMENT","top must be an integer between 1 and 100.");
  return top;
}

export function POST(request:Request){
  return observeApiRequest(request,"tf-idf",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request) as {documents?:unknown;top?:unknown;limit?:unknown;offset?:unknown};
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      if(!Array.isArray(body.documents) || body.documents.length<2 || body.documents.length>10){
        throw new PublicApiError(400,"INVALID_ARGUMENT","documents must be an array of 2 to 10 analyzed inputs.");
      }
      if(body.documents.some(entry=>!entry||typeof entry!=="object"||Array.isArray(entry))){
        throw new PublicApiError(400,"INVALID_ARGUMENT","Every documents entry must be an analysis input object.");
      }
      const top=parseTop(body.top);
      const context=createCompoundFetchContext(body.documents);
      const bagDocs=await Promise.all(body.documents.map(async (entry)=>analyzeBagOfWords(await normalizeAnalyzeBody(entry as Record<string,unknown>,context))));
      const result=calculateTfIdfCorpus(bagDocs,top);
      const language = bagDocs.every((doc)=>doc.language===bagDocs[0].language) ? bagDocs[0].language : "auto";
      await sendServerAnalyticsEvent("api_analysis",{operation:"tf_idf",source_type:"mixed",text_language:language,document_count:bagDocs.length,top});
      const publicResult=limitIdfRows({
        language,
        documentCount:bagDocs.length,
        top,
        totalVocabularySize:result.totalVocabularySize,
        averageDocumentFrequency:result.averageDocumentFrequency,
        documents:result.documents,
        idfTable:result.idfTable,
      },parseResultRowLimit(body.limit),parseResultRowOffset(body.offset));
      return apiJson({
        apiVersion:API_VERSION,
        storage:"none",
        result:publicResult,
      },200,rateHeaders);
    }catch(error){
      await sendServerAnalyticsEvent("api_error",{operation:"tf_idf"});
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
