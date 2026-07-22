import { analyzeWordFrequency } from "../../lib/analyze";
import { apiErrorResponse,apiJson,enforceRateLimit,normalizeAnalyzeBody,readJsonBody } from "../../lib/public-api";

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const input=await normalizeAnalyzeBody(body);
    return apiJson({storage:"none",result:analyzeWordFrequency(input)});
  }catch(error){
    return apiErrorResponse(error);
  }
}
