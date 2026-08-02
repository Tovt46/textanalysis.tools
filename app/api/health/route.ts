import {observeApiRequest} from "../../lib/api-observability";
import {API_VERSION,apiJson,probeRateLimitBackendStatus} from "../../lib/public-api";

export const dynamic="force-dynamic";

export function GET(request:Request){
  return observeApiRequest(request,"health",async()=>apiJson({
    status:"ok",
    service:"textanalysis.tools",
    apiVersion:API_VERSION,
    storage:"none",
    rateLimit:await probeRateLimitBackendStatus(),
    revision:process.env.TEXTANALYSIS_BUILD_REVISION||"unknown",
  },200,{"X-Content-Type-Options":"nosniff"}));
}

export function HEAD(request:Request){
  return observeApiRequest(request,"health",()=>new Response(null,{
    status:200,
    headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},
  }));
}
