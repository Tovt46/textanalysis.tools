import { API_VERSION,apiErrorResponse,apiJson,apiOptions,compareResults,enforceBodyRateLimit,enforceRateLimit,PublicApiError,readJsonBody,runComparisonAnalysis } from "../../../lib/public-api";
import {observeApiRequest} from "../../../lib/api-observability";
import { createCompoundFetchContext } from "../../../lib/api-request-budget";
import {parseResultRowLimit,parseResultRowOffset} from "../../../lib/api-result-limits";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"compare",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"compare",()=>apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"compare",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"}));
}

export function POST(request:Request){
  return observeApiRequest(request,"compare",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      if(!body.a||typeof body.a!=="object"||Array.isArray(body.a)||!body.b||typeof body.b!=="object"||Array.isArray(body.b)){
        throw new PublicApiError(400,"INVALID_ARGUMENT","Both a and b analysis inputs are required.");
      }
      const limit=parseResultRowLimit(body.limit,1000);
      const offset=parseResultRowOffset(body.offset);
      const sources=[body.a,body.b] as const;
      const context=createCompoundFetchContext(sources);
      const [analysisA,analysisB]=await Promise.all([
        runComparisonAnalysis(body.a as Record<string,unknown>,context),
        runComparisonAnalysis(body.b as Record<string,unknown>,context),
      ]);
      await sendServerAnalyticsEvent("api_analysis",{operation:"compare",source_type:"mixed"});
      return apiJson({apiVersion:API_VERSION,storage:"none",resultA:analysisA.result,resultB:analysisB.result,comparison:compareResults(analysisA,analysisB,limit,offset)},200,rateHeaders);
    }catch(error){await sendServerAnalyticsEvent("api_error",{operation:"compare"});return apiErrorResponse(error,rateHeaders);}
  });
}
