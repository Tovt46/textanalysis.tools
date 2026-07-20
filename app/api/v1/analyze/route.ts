import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceRateLimit,readJsonBody,runPublicAnalysis } from "../../../lib/public-api";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({apiVersion:API_VERSION,name:"BOW Analyzer API",operation:"analyze",method:"POST",documentation:"/api-docs",openapi:"/openapi.json"});
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request);
    const result=await runPublicAnalysis(body);
    return apiJson({apiVersion:API_VERSION,storage:"none",result});
  }catch(error){return apiErrorResponse(error);}
}
