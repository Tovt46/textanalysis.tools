import {observeApiRequest} from "../../../lib/api-observability";
import {
  compileRequestSchema,
  compileTextContract,
} from "../../../lib/text-contract-ai";
import {assertTextContractSameOrigin,textContractErrorResponse,textContractJson,textContractOptions} from "../../../lib/text-contract-http";
import {
  API_VERSION,
  enforceRateLimit,
  readJsonBody,
} from "../../../lib/public-api";

export function OPTIONS(request:Request){return observeApiRequest(request,"text-contract-compile",()=>textContractOptions());}

export function GET(request:Request){
  return observeApiRequest(request,"text-contract-compile",()=>textContractJson({
    apiVersion:API_VERSION,
    operation:"text-contract-compile",
    method:"POST",
    storage:"none",
    limits:{sourceCharacters:30_000,briefCharacters:2_000,rules:20,liveRules:3},
  }));
}

export function POST(request:Request){
  return observeApiRequest(request,"text-contract-compile",async()=>{
    let rateHeaders:Record<string,string>={};
    try{
      assertTextContractSameOrigin(request);
      rateHeaders=await enforceRateLimit(request,5);
      const input=compileRequestSchema.parse(await readJsonBody(request));
      const result=await compileTextContract(input);
      return textContractJson({apiVersion:API_VERSION,storage:"none",result},200,rateHeaders);
    }catch(error){
      return textContractErrorResponse(error,rateHeaders);
    }
  });
}
