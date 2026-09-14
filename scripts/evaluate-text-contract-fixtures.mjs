import {mkdir,readFile} from "node:fs/promises";
import {build} from "esbuild";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
if(process.env.RUN_LIVE_TEXT_CONTRACT_EVAL!=="1")throw new Error("Live evaluation spends Nebius credits. Set RUN_LIVE_TEXT_CONTRACT_EVAL=1 explicitly.");
const repairEnabled=process.env.RUN_LIVE_TEXT_CONTRACT_REPAIR==="1";
const required=["NEBIUS_API_KEY","NEBIUS_MODEL_REASONING",...(repairEnabled?["NEBIUS_MODEL_FAST"]:[])];
if(required.some(key=>!process.env[key]?.trim()))throw new Error("Configure "+required.join(", ")+" in .env.local.");
const limit=Number(process.env.TEXT_CONTRACT_EVAL_LIMIT||60);
if(!Number.isInteger(limit)||limit<1||limit>60)throw new Error("TEXT_CONTRACT_EVAL_LIMIT must be 1–60.");
await mkdir(new URL("../work/",import.meta.url),{recursive:true});
const outfile=new URL("../work/text-contract-live-eval.mjs",import.meta.url).pathname;
await build({entryPoints:[new URL("../app/lib/text-contract-ai.ts",import.meta.url).pathname],bundle:true,format:"esm",platform:"node",packages:"external",outfile});
const agent=await import(outfile);
const domainOutput=await build({entryPoints:[new URL("../app/lib/text-contract.ts",import.meta.url).pathname],bundle:true,format:"esm",platform:"node",write:false});
const domain=await import("data:text/javascript;base64,"+Buffer.from(domainOutput.outputFiles[0].text).toString("base64"));
const fixtures=JSON.parse(await readFile(new URL("../tests/fixtures/text-contract-semantic.json",import.meta.url),"utf8")).slice(0,limit);
const results=[];
let totalTokens=0;
for(const fixture of fixtures){
  const brief="Preserve factual meaning. "+fixture.rule;
  const contract={version:domain.TEXT_CONTRACT_VERSION,id:fixture.id,title:"Semantic benchmark",source:fixture.source,brief,outputLanguage:"same",revision:1,approvedRevision:1,createdAt:new Date().toISOString(),approvedAt:new Date().toISOString(),rules:[
    ...domain.extractDeterministicContractRules(fixture.source,brief),
    {id:"semantic-benchmark",kind:"semantic_invariant",statement:fixture.rule,severity:"high",required:true,enabled:true,sourceExcerpt:"",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]},
  ]};
  let observed="uncertain",repair=null,error=null;
  try{
    const evaluated=await agent.evaluateTextContractCandidate({source:fixture.source,candidate:fixture.candidate,contract});
    totalTokens+=evaluated.usage.reduce((sum,item)=>sum+(item.totalTokens??0),0);
    observed=evaluated.evaluations.find(item=>item.ruleId==="semantic-benchmark")?.status??"uncertain";
    if(repairEnabled&&fixture.expected==="fail"){
      if(observed!=="fail")repair={success:false,reason:"The evaluator missed or could not establish the violation; no repair launched."};
      else{
        const generated=await agent.generateTextContractCandidate({source:fixture.source,brief,outputLanguage:"same",contract,mode:"repair",attemptNumber:2,previousCandidate:fixture.candidate,failures:evaluated.evaluations.filter(item=>item.status==="fail").map(item=>({ruleId:item.ruleId,explanation:item.explanation}))});
        totalTokens+=generated.attempt.usage.totalTokens??0;
        const rechecked=await agent.evaluateTextContractCandidate({source:fixture.source,candidate:generated.attempt.content,contract});
        totalTokens+=rechecked.usage.reduce((sum,item)=>sum+(item.totalTokens??0),0);
        repair={success:rechecked.finalStatus==="READY",status:rechecked.finalStatus};
      }
    }
  }catch{error="Provider or structured-output failure; counted as uncertain, never passed.";}
  results.push({id:fixture.id,category:fixture.category,expected:fixture.expected,observed,repair,error});
  console.log("Evaluated "+results.length+"/"+fixtures.length);
}
const critical=results.filter(item=>item.expected==="fail"),harmless=results.filter(item=>item.category==="harmless_paraphrase");
const recall=critical.length?critical.filter(item=>item.observed==="fail").length/critical.length:null;
const falsePositiveRate=harmless.length?harmless.filter(item=>item.observed==="fail").length/harmless.length:null;
const repairs=results.filter(item=>item.expected==="fail");
const repairSuccess=repairEnabled&&repairs.length?repairs.filter(item=>item.repair?.success).length/repairs.length:null;
const summary={pipeline:"actual TextContract evaluator; fixed labeled contracts (not compiler quality)",model:process.env.NEBIUS_MODEL_REASONING,fixtures:results.length,partial:limit<60,totalTokens,criticalSemanticRecall:recall,harmlessFalsePositiveRate:falsePositiveRate,repairSuccess,uncertain:results.filter(item=>item.observed==="uncertain").length,results};
console.log(JSON.stringify(summary,null,2));
if(results.some(item=>item.error)||recall===null||recall<.9||falsePositiveRate===null||falsePositiveRate>.1||(repairEnabled&&(repairSuccess===null||repairSuccess<.8)))process.exitCode=1;
