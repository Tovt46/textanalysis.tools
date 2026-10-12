import {observeApiRequest} from "../../lib/api-observability";
import {
  API_VERSION,
  apiErrorResponse,
  apiJson,
  apiOptions,
  enforceBodyRateLimit,
  enforceRateLimit,
  readJsonBody,
} from "../../lib/public-api";
import {fetchSourcePreview,parseSourcePreviewRequest} from "../../lib/source-extraction";

export const runtime="nodejs";

export function OPTIONS(request:Request){
  return observeApiRequest(request,"source-preview",()=>apiOptions());
}

export function GET(request:Request){
  return observeApiRequest(request,"source-preview",()=>apiJson({
    apiVersion:API_VERSION,
    storage:"none",
    operation:"source-preview",
    method:"POST",
    contentScopes:["main","page"],
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"source-preview",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      rateHeaders=await enforceRateLimit(request);
      const body=await readJsonBody(request);
      const input=parseSourcePreviewRequest(body);
      rateHeaders=await enforceBodyRateLimit(request,{source:input.source,sourceType:"url"})??rateHeaders;
      const source=await fetchSourcePreview(input.source,input.contentScope);
      return apiJson({apiVersion:API_VERSION,storage:"none",source},200,rateHeaders);
    }catch(error){
      return apiErrorResponse(error,rateHeaders);
    }
  });
}
