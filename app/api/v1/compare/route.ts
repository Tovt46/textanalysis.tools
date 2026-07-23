import { API_VERSION,apiErrorResponse,apiJson,apiOptions,compareResults,enforceRateLimit,PublicApiError,readJsonBody,runComparisonAnalysis } from "../../../lib/public-api";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"compare",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    if(!body.a||typeof body.a!=="object"||Array.isArray(body.a)||!body.b||typeof body.b!=="object"||Array.isArray(body.b)){
      throw new PublicApiError(400,"INVALID_ARGUMENT","Both a and b analysis inputs are required.");
    }
    const [analysisA,analysisB]=await Promise.all([runComparisonAnalysis(body.a as Record<string,unknown>),runComparisonAnalysis(body.b as Record<string,unknown>)]);
    await sendServerAnalyticsEvent("api_analysis",{operation:"compare",source_type:"mixed"});
    return apiJson({apiVersion:API_VERSION,storage:"none",resultA:analysisA.result,resultB:analysisB.result,comparison:compareResults(analysisA,analysisB)});
  }catch(error){await sendServerAnalyticsEvent("api_error",{operation:"compare"});return apiErrorResponse(error);}
}
