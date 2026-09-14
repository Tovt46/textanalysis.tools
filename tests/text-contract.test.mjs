import assert from "node:assert/strict";
import test from "node:test";
import {mkdir,readFile} from "node:fs/promises";
import {dirname} from "node:path";
import {build} from "esbuild";

async function load(entry){
  const output=await build({entryPoints:[new URL(entry,import.meta.url).pathname],bundle:true,format:"esm",platform:"node",target:"node22",write:false});
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
}

async function loadWithExternalPackages(entry){
  const outfile=new URL(`../work/text-contract-ai-test-${process.pid}.mjs`,import.meta.url).pathname;
  await mkdir(dirname(outfile),{recursive:true});
  await build({entryPoints:[new URL(entry,import.meta.url).pathname],bundle:true,format:"esm",platform:"node",target:"node22",packages:"external",outfile});
  return import(`${new URL(`file://${outfile}`).href}?v=${Date.now()}`);
}

const domain=await load("../app/lib/text-contract.ts");
const agent=await loadWithExternalPackages("../app/lib/text-contract-ai.ts");
const semanticFixtures=JSON.parse(await readFile(new URL("./fixtures/text-contract-semantic.json",import.meta.url),"utf8"));

const source=`<article>
<h1>Calmly Premium</h1>
<p>Calmly Premium costs $5.99 per month and may help editorial teams.</p>
<p>Request a 30-day refund under the <a href="https://example.com/refunds">refund policy</a>.</p>
<a class="primary-cta" href="https://example.com/start" data-plan="premium">Start for $5.99</a>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Refund?"}]}</script>
</article>`;
const brief="Make it shorter. Preserve ‘may help’. Do not use the exact phrase “guaranteed result”. Preserve the CTA and FAQ schema.";

function approvedContract(rules,doc=source,withGuards=true){
  const task=doc===source?brief:"Shorten safely.";
  const all=withGuards?[...domain.extractDeterministicContractRules(doc,task),...rules]:rules;
  return{version:2,source:doc,revision:1,approvedRevision:1,id:"contract-test",title:"Test contract",brief:task,outputLanguage:"same",createdAt:"2026-09-03T00:00:00.000Z",approvedAt:"2026-09-03T00:01:00.000Z",rules:[...new Map(all.map(rule=>[rule.id,rule])).values()]};
}

test("deterministic compilation protects hyphenated periods, CTA attributes, labels, links, headings, and FAQ schema",()=>{
  const rules=domain.extractDeterministicContractRules(source,brief,["example.com"]);
  assert.ok(rules.find(rule=>rule.group==="numbers").values.includes("$5.99"));
  assert.ok(rules.find(rule=>rule.group==="numbers").values.includes("30-day"));
  assert.ok(rules.find(rule=>rule.group==="links").values.includes("https://example.com/refunds"));
  assert.ok(rules.find(rule=>rule.group==="ctas").values.some(value=>value.includes("Start for $5.99")));
  assert.ok(rules.find(rule=>rule.group==="schema").values.some(value=>value.includes("FAQPage")));
  assert.ok(rules.find(rule=>rule.group==="headings").values.includes("h1:true"));
  assert.ok(rules.find(rule=>rule.group==="phrases"&&rule.expectation==="preserve").values.includes("may help"));
  assert.ok(rules.find(rule=>rule.group==="phrases"&&rule.expectation==="forbid").values.includes("guaranteed result"));
  assert.deepEqual(new Set(rules.flatMap(rule=>rule.sourceOfTruthDomains)),new Set(["example.com"]));
});

test("deterministic mutation suite detects every annotated exact violation",()=>{
  const rules=domain.extractDeterministicContractRules(source,brief,["example.com"]);
  const contract=approvedContract(rules);
  const mutations=[
    source.replaceAll("$5.99","$6.99"),
    source.replace("30-day","14-day"),
    source.replace("https://example.com/refunds","https://example.com/returns"),
    source.replace('<a href="https://example.com/refunds">refund policy</a>','<span>https://example.com/refunds</span>'),
    source.replace("class=\"primary-cta\"","class=\"secondary-link\""),
    source.replace("Start for $5.99","Join now for $5.99"),
    source.replace('"@type":"FAQPage"','"@type":"Article"'),
    source.replace('"@type":"Question"','"@type":"Answer"'),
    source.replace("<h1>","<h2>").replace("</h1>","</h2>"),
    source.replace("may help","helps"),
    source.replace("editorial teams.","editorial teams. A guaranteed result is promised."),
  ];
  for(const [index,candidate] of mutations.entries()){
    const evaluations=domain.evaluateDeterministicRules(contract,candidate);
    assert.ok(evaluations.some(item=>item.status==="fail"),`Mutation ${index+1} escaped deterministic checks`);
  }
});

test("fail-closed merging turns missing and ambiguous required checks into review, never ready",()=>{
  const contract=approvedContract([
    {id:"semantic-1",kind:"semantic_invariant",statement:"Keep the caveat.",severity:"high",required:true,enabled:true,sourceExcerpt:"may",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]},
  ],source,false);
  const missing=domain.mergeRuleEvaluations(contract,[]);
  assert.equal(missing[0].status,"uncertain");
  assert.equal(domain.finalStatus(contract,missing),"NEEDS_REVIEW");
  assert.equal(domain.finalStatus(contract,[{...missing[0],status:"fail"}]),"BLOCKED");
  assert.equal(domain.finalStatus(contract,[{...missing[0],status:"pass"}]),"READY");
  const optional={id:"optional",kind:"semantic_invariant",statement:"Optional style check.",severity:"low",required:false,enabled:true,sourceExcerpt:"",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]};
  const withOptional={...contract,rules:[...contract.rules,optional]};
  assert.equal(domain.finalStatus(withOptional,[{...missing[0],status:"pass"},{...missing[0],ruleId:"optional",status:"fail"}]),"NEEDS_REVIEW");
});

test("contract compilation combines local rules with bounded semantic and live rules",async()=>{
  const result=await agent.compileTextContract({source,brief,outputLanguage:"same",sourceOfTruthDomains:"example.com"},{
    id:()=>"fixed",now:()=>new Date("2026-09-03T00:00:00.000Z"),
    structuredCall:async input=>{
      assert.equal(input.operation,"compile");
      assert.match(input.user,/untrusted="true"/);
      return{model:"nemotron-reasoning",usage:{provider:"nebius",model:"nemotron-reasoning",operation:"compile",totalTokens:240},data:{title:"Guarded Calmly rewrite",rules:[
        {kind:"semantic_invariant",statement:"Do not strengthen may help into a guarantee.",severity:"high",required:true,sourceExcerpt:"may help",searchQuery:null,requiresLiveEvidence:false},
        {kind:"freshness_required",statement:"The refund period is currently 30 days.",severity:"high",required:true,sourceExcerpt:"30-day refund",searchQuery:"site:example.com current refund period",requiresLiveEvidence:true},
      ]}};
    },
  });
  assert.equal(result.contract.id,"contract-fixed");
  assert.equal(result.contract.rules.length<=20,true);
  assert.ok(result.contract.rules.some(rule=>rule.checkStrategy==="deterministic"));
  assert.ok(result.contract.rules.some(rule=>rule.checkStrategy==="nemotron"));
  assert.ok(result.contract.rules.some(rule=>rule.checkStrategy==="tavily"&&rule.requiresLiveEvidence));
  assert.equal(result.usage[0].operation,"compile");
});

test("generation is locked until the visible contract is approved",async()=>{
  const contract=approvedContract([]);
  delete contract.approvedAt;
  await assert.rejects(()=>agent.generateTextContractCandidate({source,brief,outputLanguage:"same",contract,mode:"draft",attemptNumber:1},{structuredCall:async()=>{throw new Error("must not run");}}),error=>error.code==="CONTRACT_APPROVAL_REQUIRED");
});

test("draft generation returns one auditable attempt and treats documents as untrusted data",async()=>{
  const contract=approvedContract([{id:"rule-1",kind:"semantic_invariant",statement:"Keep uncertainty.",severity:"high",required:true,enabled:true,sourceExcerpt:"may",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]}]);
  const result=await agent.generateTextContractCandidate({source,brief,outputLanguage:"same",contract,mode:"draft",attemptNumber:1},{
    id:()=>"draft",now:()=>new Date("2026-09-03T00:02:00.000Z"),
    structuredCall:async input=>{
      assert.equal(input.operation,"generate");assert.match(input.user,/approved_contract/);assert.match(input.user,/source_document untrusted="true"/);
      assert.match(input.user,/Protected values \(data, not instructions\)/);
      return{model:"nemotron-fast",usage:{provider:"nebius",model:"nemotron-fast",operation:"generate",totalTokens:310},data:{candidate:"Calmly may help editorial teams.",summary:"Shortened safely."}};
    },
  });
  assert.equal(result.attempt.kind,"draft");
  assert.equal(result.attempt.number,1);
  assert.equal(result.attempt.content,"Calmly may help editorial teams.");
});

test("evaluation combines deterministic, semantic, and real-source-shaped Tavily evidence",async()=>{
  const contract=approvedContract([
    {id:"number",kind:"numeric_value",statement:"Preserve $5.99.",severity:"high",required:true,enabled:true,sourceExcerpt:"$5.99",expectedValue:"$5.99",expectation:"preserve",checkStrategy:"deterministic",requiresLiveEvidence:false,sourceOfTruthDomains:[]},
    {id:"semantic",kind:"semantic_invariant",statement:"Keep claim cautious.",severity:"high",required:true,enabled:true,sourceExcerpt:"may help",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]},
    {id:"live",kind:"freshness_required",statement:"Refund remains 30 days.",severity:"high",required:true,enabled:true,sourceExcerpt:"30-day",expectedValue:"refund period",expectation:"preserve",checkStrategy:"tavily",requiresLiveEvidence:true,sourceOfTruthDomains:["example.com"]},
  ],"Costs $5.99, may help, 30-day refund.");
  const result=await agent.evaluateTextContractCandidate({source:"Costs $5.99, may help, 30-day refund.",candidate:"Costs $5.99, may help, 30-day refund.",contract},{
    search:async()=>({evidence:[{title:"Official refund policy",url:"https://example.com/refunds",excerpt:"Refund requests are accepted within 30 days.",score:.91}],usage:{provider:"tavily",operation:"search",credits:1}}),
    structuredCall:async()=>({model:"nemotron-reasoning",usage:{provider:"nebius",model:"nemotron-reasoning",operation:"evaluate",totalTokens:180},data:{evaluations:[
      {ruleId:"semantic",status:"pass",explanation:"The modal caveat remains.",sourceExcerpt:"may help",candidateExcerpt:"may help"},
      {ruleId:"live",status:"pass",explanation:"The candidate matches the official evidence.",sourceExcerpt:"30-day",candidateExcerpt:"30-day refund"},
    ]}}),
  });
  assert.equal(result.finalStatus,"READY");
  assert.equal(result.evaluations.length,contract.rules.length);
  assert.equal(result.evaluations.find(item=>item.ruleId==="live").evidence[0].url,"https://example.com/refunds");
  assert.deepEqual(result.usage.map(item=>item.provider),["nebius","tavily"]);
  assert.match(domain.exportAgentRun({contract,attempts:[],finalCandidate:"Costs $5.99, may help, 30-day refund.",finalStatus:result.finalStatus,evaluations:result.evaluations,modelUsage:result.usage}),/Official refund policy.*https:\/\/example\.com\/refunds/s);
});

test("Tavily failure and omitted model judgments become uncertain",async()=>{
  const contract=approvedContract([
    {id:"semantic",kind:"semantic_invariant",statement:"Keep claim cautious.",severity:"high",required:true,enabled:true,sourceExcerpt:"may",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]},
    {id:"live",kind:"freshness_required",statement:"Price is current.",severity:"high",required:true,enabled:true,sourceExcerpt:"$5.99",expectedValue:"current price",expectation:"preserve",checkStrategy:"tavily",requiresLiveEvidence:true,sourceOfTruthDomains:[]},
  ],"It may cost $5.99.");
  const result=await agent.evaluateTextContractCandidate({source:"It may cost $5.99.",candidate:"It may cost $5.99.",contract},{
    search:async()=>{throw new Error("offline");},
    structuredCall:async()=>({model:"nemotron",usage:{provider:"nebius",model:"nemotron",operation:"evaluate"},data:{evaluations:[]}}),
  });
  assert.equal(result.finalStatus,"NEEDS_REVIEW");
  assert.deepEqual(result.evaluations.filter(item=>item.evaluator!=="deterministic").map(item=>item.status),["uncertain","uncertain"]);
});

test("semantic evaluation corpus contains at least 60 labeled fixtures across every required risk class",()=>{
  assert.equal(semanticFixtures.length>=60,true);
  const categories=new Set(semanticFixtures.map(item=>item.category));
  for(const category of ["harmless_paraphrase","promise_strengthening","caveat_removal","subject_object_reversal","unsupported_conclusion","translation_drift","prompt_injection"]){
    assert.ok(categories.has(category),category);
  }
  assert.ok(semanticFixtures.every(item=>item.id&&item.source&&item.candidate&&item.rule&&["pass","fail"].includes(item.expected)));
});

test("realistic offer, number and HTML regressions never pass",()=>{
  const cases=[
    ["Save 50% today.","Save 75% today."],
    ["Enjoy 10 free minutes.","Enjoy 20 free minutes."],
    ["<strong>400+</strong><span>Advisors</span>","<strong>900+</strong><span>Advisors</span>"],
    ["The plan costs $5.99 per month.","The plan costs $5.999 per month."],
    ["The plan costs $5.99 per month.","The plan costs $9.99 per month. <!-- old $5.99 -->"],
    ["The plan costs $5.99 per month.","<!-- The plan costs $5.99 per month. -->"],
    ['<h2>Section</h2><p>Text</p>','<h2>Section<p>Text</p>'],
    ['<a href="/x">One</a><a href="/x">Two</a>','<a href="/x">One</a><span>Two</span>'],
    ['<div itemscope itemtype="https://schema.org/FAQPage"><h3 itemprop="name">Why?</h3></div>','<div><h3>Why?</h3></div>'],
    ['<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>','<script type="application/ld+json">INVALID {"@type":"FAQPage","mainEntity":[]}</script>'],
    ['<a class="cta" href="/signup" aria-label="Start">Start</a>','<a class="cta" href="/signup">Start</a>'],
  ];
  for(const [original,candidate] of cases){
    const contract=approvedContract([],original);
    assert.equal(domain.finalStatus(contract,domain.evaluateDeterministicRules(contract,original)),"READY",original);
    assert.equal(domain.finalStatus(contract,domain.evaluateDeterministicRules(contract,candidate)),"BLOCKED",candidate);
  }
});

test("all links survive rule budgeting, including more than twenty destinations",async()=>{
  const original=Array.from({length:80},(_,i)=>`<a href="/guide-${i}">Read guide</a>`).join("");
  const result=await agent.compileTextContract({source:original,brief:"Preserve every link.",outputLanguage:"same"},{structuredCall:async()=>({data:{title:"Links",rules:[]},model:"mock",usage:{provider:"nebius",operation:"compile"}})});
  assert.ok(result.contract.rules.length<=20);
  assert.equal(result.contract.rules.find(rule=>rule.group==="links").values.length,80);
  for(let i=0;i<80;i++)assert.ok(domain.evaluateDeterministicRules(result.contract,original.replace(`href="/guide-${i}"`,'href="/wrong"')).some(item=>item.status==="fail"));
});

test("punctuation, entity spelling and attribute order do not change exact values",()=>{
  for(const [original,candidate] of [['The price is $5.99.','The price is $5.99!'],['<a class="cta" href="/x?a=1&amp;b=2">Start</a>','<a href="/x?a=1&#38;b=2" class="cta">Start</a>']]){
    const contract=approvedContract([],original);
    assert.equal(domain.finalStatus(contract,domain.evaluateDeterministicRules(contract,candidate)),"READY");
  }
  const phrases=domain.quotedBriefRules('Do not use “guaranteed”. Preserve “may help”.');
  assert.deepEqual(phrases.map(item=>item.expectation),["forbid","preserve"]);
  assert.deepEqual(domain.quotedBriefRules('Avoid “guaranteed” or “certain”. Keep “may help” and “could improve”.').map(item=>item.expectation),["forbid","forbid","preserve","preserve"]);
});

test("compiler cannot silently downgrade a live-evidence rule",async()=>{
  for(const [kind,requiresLiveEvidence] of [["semantic_invariant",true],["freshness_required",false]]){
    await assert.rejects(()=>agent.compileTextContract({source,brief,outputLanguage:"same"},{structuredCall:async()=>({data:{title:"Invalid routing",rules:[{kind,requiresLiveEvidence,statement:"Current refund period",severity:"high",required:true,sourceExcerpt:"30-day",searchQuery:null}]},model:"mock",usage:{provider:"nebius",operation:"compile"}})}),error=>error.code==="INVALID_MODEL_OUTPUT");
  }
});

test("stale source, stale approval and missing safeguards fail before any paid call",async()=>{
  const contract=approvedContract([]);
  const deps={structuredCall:async()=>{throw new Error("paid call must not run");}};
  await assert.rejects(()=>agent.evaluateTextContractCandidate({source:source+"changed",candidate:source,contract},deps),error=>error.code==="STALE_REVISION");
  await assert.rejects(()=>agent.evaluateTextContractCandidate({source,candidate:source,contract:{...contract,revision:2}},deps),error=>error.code==="CONTRACT_APPROVAL_REQUIRED");
  await assert.rejects(()=>agent.evaluateTextContractCandidate({source,candidate:source,contract:{...contract,rules:contract.rules.slice(1)}},deps),error=>error.code==="INCOMPLETE_CONTRACT");
});

test("duplicate model judgments and fabricated excerpts cannot become READY",async()=>{
  const original="The service may help.",candidate="The service will help.";
  const rule={id:"modal",kind:"semantic_invariant",statement:"Preserve the caveat.",severity:"high",required:true,enabled:true,sourceExcerpt:"may help",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:[]};
  const contract=approvedContract([rule],original);
  const judgment={ruleId:"modal",status:"pass",explanation:"Mock judgment",sourceExcerpt:"may help",candidateExcerpt:"will help"};
  for(const evaluations of [[judgment,{...judgment,status:"uncertain"}],[{...judgment,status:"uncertain"},judgment],[{...judgment,candidateExcerpt:"may help"}],[]]){
    const result=await agent.evaluateTextContractCandidate({source:original,candidate,contract},{structuredCall:async()=>({data:{evaluations},model:"mock",usage:{provider:"nebius",operation:"evaluate"}})});
    assert.equal(result.finalStatus,"NEEDS_REVIEW");
    assert.equal(result.evaluations.find(item=>item.ruleId==="modal").status,"uncertain");
  }
});

test("exports retain every attempt evaluation and full baseline",()=>{
  const contract=approvedContract([]);
  const run={contract,attempts:[{id:"draft",number:1,kind:"draft",content:"Bad draft",createdAt:"today",model:"mock",usage:{provider:"nebius",operation:"generate"},finalStatus:"BLOCKED",evaluations:[{ruleId:"x",status:"fail",explanation:"INITIAL_FAILURE_EVIDENCE",sourceExcerpt:"",candidateExcerpt:"",evidence:[],evaluator:"deterministic"}]}],finalCandidate:source,finalStatus:"READY",evaluations:[],modelUsage:[]};
  const report=domain.exportAgentRun(run);
  assert.ok(report.includes(source));assert.match(report,/INITIAL_FAILURE_EVIDENCE/);
  assert.equal(domain.changePreview("a".repeat(2000),"b".repeat(2000)).after.length,2000);
});
