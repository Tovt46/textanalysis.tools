import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceBodyRateLimit,enforceRateLimit,readJsonBody,runComparisonAnalysis,PublicApiError } from "../../../lib/public-api";
import {snapshotZipfCounts} from "../../../lib/zipf-comparison";
import {observeApiRequest} from "../../../lib/api-observability";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"analyze",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"analyze",()=>apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"analyze",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"}));
}

export function POST(request:Request){
  return observeApiRequest(request,"analyze",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      if(body.includeComparisonCounts!==undefined && typeof body.includeComparisonCounts!=="boolean"){
        throw new PublicApiError(400,"INVALID_ARGUMENT","includeComparisonCounts must be a boolean.");
      }
      const {result,unigrams,bigrams}=await runComparisonAnalysis(body);
      const counts=body.includeComparisonCounts?snapshotZipfCounts(unigrams,bigrams):undefined;
      await sendServerAnalyticsEvent("api_analysis",{operation:"analyze",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
      const envelope={apiVersion:API_VERSION,storage:"none",result};
      const response=apiJson({...envelope,counts},200,rateHeaders);
      // Optional comparison data must not crowd a valid analysis out of the response.
      return counts&&response.status===413?apiJson(envelope,200,rateHeaders):response;
    }catch(error){await sendServerAnalyticsEvent("api_error",{operation:"analyze"});return apiErrorResponse(error,rateHeaders);}
  });
}
