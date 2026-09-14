import OpenAI from "openai";
import {tavily} from "@tavily/core";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if(process.env.RUN_LIVE_TEXT_CONTRACT_SMOKE!=="1"){
  throw new Error("Provider smoke spends Nebius and Tavily credits. Re-run with RUN_LIVE_TEXT_CONTRACT_SMOKE=1 after configuring the server-side environment variables.");
}
const required=["NEBIUS_API_KEY","NEBIUS_MODEL_FAST","NEBIUS_MODEL_REASONING","TAVILY_API_KEY"];
const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length)throw new Error(`Missing required variables: ${missing.join(", ")}`);

const openai=new OpenAI({apiKey:process.env.NEBIUS_API_KEY,baseURL:"https://api.tokenfactory.nebius.com/v1/",timeout:30_000,maxRetries:0});
async function checkNebiusModel(model,label){
  const completion=await openai.chat.completions.create({
    model,temperature:0,
    messages:[{role:"system",content:"Return the requested structured health result."},{role:"user",content:`Return ok true and label ${label}.`}],
    response_format:{type:"json_schema",json_schema:{name:"provider_smoke",strict:true,schema:{type:"object",additionalProperties:false,required:["ok","label"],properties:{ok:{type:"boolean"},label:{type:"string",const:label}}}}},
  });
  const content=completion.choices[0]?.message?.content;
  const structured=content?JSON.parse(content):null;
  if(structured?.ok!==true||structured?.label!==label)throw new Error(`Nebius structured-output smoke failed for ${label}.`);
  return{ok:true,model:completion.model,totalTokens:completion.usage?.total_tokens};
}
const [fastModel,reasoningModel]=await Promise.all([
  checkNebiusModel(process.env.NEBIUS_MODEL_FAST,"fast-model-smoke"),
  checkNebiusModel(process.env.NEBIUS_MODEL_REASONING,"reasoning-model-smoke"),
]);

const search=await tavily({apiKey:process.env.TAVILY_API_KEY,projectId:process.env.TAVILY_PROJECT?.trim()||undefined,clientName:"textcontract-provider-smoke"}).search("Nebius Token Factory API introduction",{
  searchDepth:"basic",maxResults:3,includeAnswer:false,includeRawContent:false,includeUsage:true,includeDomains:["docs.tokenfactory.nebius.com"],includeDomainsMode:"filter",timeout:12,
});
if(!search.results.length)throw new Error("Tavily provider smoke returned no official documentation result.");

console.log(JSON.stringify({
  nebius:{fast:fastModel,reasoning:reasoningModel},
  tavily:{ok:true,credits:search.usage?.credits,sources:search.results.map(item=>item.url)},
},null,2));
