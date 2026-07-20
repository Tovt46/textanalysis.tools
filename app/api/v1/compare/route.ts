import { API_VERSION,apiErrorResponse,apiJson,apiOptions,compareResults,enforceRateLimit,PublicApiError,readJsonBody,runPublicAnalysis } from "../../../lib/public-api";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"BOW Analyzer API",operation:"compare",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    if(!body.a||typeof body.a!=="object"||Array.isArray(body.a)||!body.b||typeof body.b!=="object"||Array.isArray(body.b)){
      throw new PublicApiError(400,"INVALID_ARGUMENT","Both a and b analysis inputs are required.");
    }
    const [resultA,resultB]=await Promise.all([runPublicAnalysis(body.a as Record<string,unknown>),runPublicAnalysis(body.b as Record<string,unknown>)]);
    return apiJson({apiVersion:API_VERSION,storage:"none",resultA,resultB,comparison:compareResults(resultA,resultB)});
  }catch(error){return apiErrorResponse(error);}
}
