import {markApiResponseErrorClass} from "./api-observability";
import {API_VERSION,PublicApiError} from "./public-api";
import {textContractApiError} from "./text-contract-ai";

const HEADERS={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};

export function assertTextContractSameOrigin(request:Request){
  const site=request.headers.get("sec-fetch-site");
  if(site&&site!=="same-origin"&&site!=="same-site"&&site!=="none")throw new PublicApiError(403,"CROSS_ORIGIN_DENIED","TextContract model endpoints only accept requests from this site.");
}

export function textContractJson(data:unknown,status=200,extraHeaders:Record<string,string>={}){
  return new Response(JSON.stringify(data),{status,headers:{...HEADERS,...extraHeaders}});
}

export function textContractOptions(){return new Response(null,{status:204,headers:{"Allow":"GET, POST, OPTIONS","Cache-Control":"no-store"}});}

export function textContractErrorResponse(error:unknown,extraHeaders:Record<string,string>={}){
  const mapped=error instanceof PublicApiError?error:textContractApiError(error);
  const headers={...extraHeaders,...(mapped instanceof PublicApiError?mapped.headers:{})};
  if(mapped instanceof PublicApiError&&mapped.retryAfter)headers["Retry-After"]=String(mapped.retryAfter);
  const response=textContractJson({apiVersion:API_VERSION,error:{code:mapped.code,message:mapped.message}},mapped.status,headers);
  return markApiResponseErrorClass(response,mapped.status===429?"rate_limit":mapped.status>=500?"server_error":mapped.status===403?"cross_origin":"invalid_request");
}
