import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceBodyRateLimit,enforceRateLimit,normalizeAnalyzeBody,readJsonBody } from "../../../lib/public-api";
import { analyzeBagOfWords } from "../../../lib/analyze";
import {observeApiRequest} from "../../../lib/api-observability";
import { limitRows,parseResultRowLimit,parseResultRowOffset } from "../../../lib/api-result-limits";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"bag-of-words",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"bag-of-words",()=>apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"bag-of-words",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"bag-of-words",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      const input=await normalizeAnalyzeBody(body);
      const result=limitRows(analyzeBagOfWords(input),parseResultRowLimit(body.limit),parseResultRowOffset(body.offset));
      await sendServerAnalyticsEvent("api_analysis",{operation:"bag_of_words",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
      return apiJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      await sendServerAnalyticsEvent("api_error",{operation:"bag_of_words"});
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
