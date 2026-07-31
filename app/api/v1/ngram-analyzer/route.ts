import { API_VERSION, apiErrorResponse, apiJson, apiOptions, enforceRateLimit, normalizeAnalyzeBody, PublicApiError, readJsonBody } from "../../../lib/public-api";
import { analyzeNgram } from "../../../lib/analyze";
import { limitRows,parseResultRowLimit } from "../../../lib/api-result-limits";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"ngram-analyzer",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  });
}

export async function POST(request:Request){
  let rateHeaders:Record<string,string>={};
  try{
    rateHeaders=enforceRateLimit(request);
    const body=await readJsonBody(request);
    const sizeValue = body.ngramSize===undefined ? 2 : body.ngramSize;
    if(typeof sizeValue!=="number"||!Number.isInteger(sizeValue)||sizeValue<1||sizeValue>10){
      throw new PublicApiError(400,"INVALID_ARGUMENT","ngramSize must be an integer between 1 and 10.");
    }

    const input=await normalizeAnalyzeBody(body);
    const result=limitRows(analyzeNgram(input,sizeValue),parseResultRowLimit(body.limit));
    await sendServerAnalyticsEvent("api_analysis",{operation:"ngram_analyzer",source_type:body.sourceType==="url"?"url":"text",text_language:result.language,ngram_size:sizeValue});
    return apiJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
  }catch(error){
    await sendServerAnalyticsEvent("api_error",{operation:"ngram-analyzer"});
    return apiErrorResponse(error,rateHeaders);
  }
}
