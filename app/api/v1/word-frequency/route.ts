import { analyzeWordFrequency } from "../../../lib/analyze";
import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceRateLimit,normalizeAnalyzeBody,readJsonBody } from "../../../lib/public-api";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"word-frequency",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const input=await normalizeAnalyzeBody(body);
    const result=analyzeWordFrequency(input);
    await sendServerAnalyticsEvent("api_analysis",{operation:"word_frequency",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
    return apiJson({apiVersion:API_VERSION,storage:"none",result});
  }catch(error){
    await sendServerAnalyticsEvent("api_error",{operation:"word_frequency"});
    return apiErrorResponse(error);
  }
}
