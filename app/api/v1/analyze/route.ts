import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceRateLimit,readJsonBody,runPublicAnalysis } from "../../../lib/public-api";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"analyze",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const result=await runPublicAnalysis(body);
    await sendServerAnalyticsEvent("api_analysis",{operation:"analyze",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
    return apiJson({apiVersion:API_VERSION,storage:"none",result});
  }catch(error){await sendServerAnalyticsEvent("api_error",{operation:"analyze"});return apiErrorResponse(error);}
}
