import {observeApiRequest} from "../../../lib/api-observability";
import {
  generateRequestSchema,
  generateTextContractCandidate,
} from "../../../lib/text-contract-ai";
import {assertTextContractSameOrigin,textContractErrorResponse,textContractJson,textContractOptions} from "../../../lib/text-contract-http";
import {
  API_VERSION,
  enforceRateLimit,
  readJsonBody,
} from "../../../lib/public-api";

export function OPTIONS(request:Request){return observeApiRequest(request,"text-contract-generate",()=>textContractOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"text-contract-generate",()=>textContractJson({
    apiVersion:API_VERSION,
    operation:"text-contract-generate",
    method:"POST",
    storage:"none",
    modes:["draft","repair"],
    maximumAttempts:2,
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"text-contract-generate",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      assertTextContractSameOrigin(request);
      rateHeaders=await enforceRateLimit(request,5);
      const input=generateRequestSchema.parse(await readJsonBody(request));
      const result=await generateTextContractCandidate(input);
      return textContractJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      return textContractErrorResponse(error,rateHeaders);
    }
  });
}
