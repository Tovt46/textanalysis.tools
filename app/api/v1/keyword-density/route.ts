import { analyzeKeywordDensity,countAnalysisTokens } from "../../../lib/analyze";
import {observeApiRequest} from "../../../lib/api-observability";
import { DEFAULT_DENSITY_ROW_LIMIT,limitDensityRows,parseResultRowLimit,parseResultRowOffset } from "../../../lib/api-result-limits";
import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceBodyRateLimit,enforceRateLimit,normalizeAnalyzeBody,PublicApiError,readJsonBody } from "../../../lib/public-api";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(request:Request){return observeApiRequest(request,"keyword-density",()=>apiOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"keyword-density",()=>apiJson({apiVersion:API_VERSION,name:"Text Analysis Tools API",operation:"keyword-density",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"}));
}

export function POST(request:Request){
  return observeApiRequest(request,"keyword-density",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      rateHeaders=await enforceBodyRateLimit(request,body)??rateHeaders;
      const trackedKeywords=body.trackedKeywords===undefined?"":body.trackedKeywords;
      if(typeof trackedKeywords!=="string"||trackedKeywords.length>20_000){
        throw new PublicApiError(400,"INVALID_ARGUMENT","trackedKeywords must be a string shorter than 20,000 characters.");
      }
      const trackedTerms=[...new Set(trackedKeywords.split(/[\n,;]+/).map(term=>term.trim()).filter(Boolean))];
      if(trackedTerms.length>100||trackedTerms.some(term=>term.length>200||countAnalysisTokens(term,1)===0)){
        throw new PublicApiError(400,"INVALID_ARGUMENT","trackedKeywords must contain at most 100 analyzable phrases of up to 200 characters each.");
      }
      const input=await normalizeAnalyzeBody(body);
      const result=limitDensityRows(
        analyzeKeywordDensity(input,trackedKeywords),
        parseResultRowLimit(body.limit,DEFAULT_DENSITY_ROW_LIMIT),
        parseResultRowOffset(body.offset),
      );
      await sendServerAnalyticsEvent("api_analysis",{operation:"keyword_density",source_type:body.sourceType==="url"?"url":"text",text_language:result.language});
      return apiJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      await sendServerAnalyticsEvent("api_error",{operation:"keyword_density"});
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
