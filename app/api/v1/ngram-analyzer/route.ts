import { API_VERSION, apiErrorResponse, apiJson, apiOptions, enforceBodyRateLimit, enforceRateLimit, normalizeAnalyzeBody, PublicApiError, readJsonBody } from "../../../lib/public-api";
import { analyzeNgram } from "../../../lib/analyze";
import {observeApiRequest} from "../../../lib/api-observability";
import { limitRows,parseResultRowLimit,parseResultRowOffset } from "../../../lib/api-result-limits";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"ngram-analyzer",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"ngram-analyzer",()=>apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"ngram-analyzer",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"ngram-analyzer",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      const sizeValue = body.ngramSize===undefined ? 2 : body.ngramSize;
      if(typeof sizeValue!=="number"||!Number.isInteger(sizeValue)||sizeValue<1||sizeValue>10){
        throw new PublicApiError(400,"INVALID_ARGUMENT","ngramSize must be an integer between 1 and 10.");
      }

      const input=await normalizeAnalyzeBody(body);
      const result=limitRows(analyzeNgram(input,sizeValue),parseResultRowLimit(body.limit),parseResultRowOffset(body.offset));
      await sendServerAnalyticsEvent("api_analysis",{operation:"ngram_analyzer",source_type:body.sourceType==="url"?"url":"text",text_language:result.language,ngram_size:sizeValue});
      return apiJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      await sendServerAnalyticsEvent("api_error",{operation:"ngram-analyzer"});
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
