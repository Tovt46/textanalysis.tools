import { analyzeKeywordDensity } from "../../../lib/analyze";
import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceRateLimit,normalizeAnalyzeBody,PublicApiError,readJsonBody } from "../../../lib/public-api";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"keyword-density",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const trackedKeywords=body.trackedKeywords===undefined?"":body.trackedKeywords;
    if(typeof trackedKeywords!=="string"||trackedKeywords.length>20_000){
      throw new PublicApiError(400,"INVALID_ARGUMENT","trackedKeywords must be a string shorter than 20,000 characters.");
    }
    const input=await normalizeAnalyzeBody(body);
    const result=analyzeKeywordDensity(input,trackedKeywords);
    await sendServerAnalyticsEvent("api_analysis",{operation:"keyword_density",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
    return apiJson({apiVersion:API_VERSION,storage:"none",result});
  }catch(error){
    await sendServerAnalyticsEvent("api_error",{operation:"keyword_density"});
    return apiErrorResponse(error);
  }
}
