import { analyzeKeywordDensity } from "../../lib/analyze";
import { apiErrorResponse,apiJson,enforceRateLimit,normalizeAnalyzeBody,PublicApiError,readJsonBody } from "../../lib/public-api";

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const trackedKeywords=body.trackedKeywords===undefined?"":body.trackedKeywords;
    if(typeof trackedKeywords!=="string"||trackedKeywords.length>20_000){
      throw new PublicApiError(400,"INVALID_ARGUMENT","trackedKeywords must be a string shorter than 20,000 characters.");
    }
    const input=await normalizeAnalyzeBody(body);
    return apiJson({storage:"none",result:analyzeKeywordDensity(input,trackedKeywords)});
  }catch(error){
    return apiErrorResponse(error);
  }
}
