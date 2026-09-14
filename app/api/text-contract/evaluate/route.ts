import {observeApiRequest} from "../../../lib/api-observability";
import {
  evaluateRequestSchema,
  evaluateTextContractCandidate,
} from "../../../lib/text-contract-ai";
import {assertTextContractSameOrigin,textContractErrorResponse,textContractJson,textContractOptions} from "../../../lib/text-contract-http";
import {
  API_VERSION,
  enforceRateLimit,
  readJsonBody,
} from "../../../lib/public-api";

export function OPTIONS(request:Request){return observeApiRequest(request,"text-contract-evaluate",()=>textContractOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"text-contract-evaluate",()=>textContractJson({
    apiVersion:API_VERSION,
    operation:"text-contract-evaluate",
    method:"POST",
    storage:"none",
    evaluators:["deterministic","nemotron","tavily"],
    maximumLiveRules:3,
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"text-contract-evaluate",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      assertTextContractSameOrigin(request);
      rateHeaders=await enforceRateLimit(request,7);
      const input=evaluateRequestSchema.parse(await readJsonBody(request));
      const result=await evaluateTextContractCandidate(input);
      return textContractJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      return textContractErrorResponse(error,rateHeaders);
    }
  });
}
