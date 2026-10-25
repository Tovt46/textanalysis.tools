import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

async function load(entry){
  const output=await build({entryPoints:[new URL(entry,import.meta.url).pathname],bundle:true,format:"esm",platform:"node",target:"node22",write:false});
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
}

const domain=await load("../app/lib/evidence-workspace.ts");
const webmcp=await load("../app/lib/evidence-webmcp.ts");

const baseline="Clear product documentation helps readers complete a task. Clear documentation names the task, shows the next step, and explains the expected result. Product documentation should be accurate, concise, and easy to verify.";

function analyzedWorkspace(){
  const created=domain.createAnalysisWorkspace({originalText:baseline,goal:"Make the guidance more specific.",focusTerms:["documentation","task","verify"]},{id:"workspace-test",now:"2026-08-27T00:00:00.000Z"});
  return domain.analyzeWorkspace(created,{id:"analysis-test",now:"2026-08-27T00:01:00.000Z"});
}

test("workspace analysis produces revision-bound deterministic evidence",()=>{
  const state=analyzedWorkspace();
  assert.equal(state.revision,1);
  assert.equal(state.originalText,baseline);
  assert.equal(state.currentText,baseline);
  assert.equal(state.analysis.revision,1);
  assert.ok(state.analysis.current.tokenCount>10);
  assert.ok(state.analysis.evidence.some(item=>item.label==="Focus: documentation"&&item.value===3));
  assert.ok(state.analysis.evidence.every(item=>item.id.startsWith("analysis-test:")));
});

test("word volume includes stopwords while lexical statistics retain their filtered denominator",()=>{
  const state=domain.analyzeWorkspace(domain.createAnalysisWorkspace({
    originalText:"The clear guide shows the next step.",
    currentText:"The clear guide shows the next step and the expected result. 2026.",
    goal:"Check the length and tracked term.",focusTerms:["next step"],
  }));
  assert.deepEqual(state.analysis.wordCounts,{baseline:7,current:11,delta:4});
  assert.equal(state.analysis.changeMap.wordDelta,4);
  assert.equal(state.analysis.changeMap.wordDeltaPercent,57.1);
  assert.ok(state.analysis.current.tokenCount<11);
  assert.equal(state.analysis.current.focusCoverage[0].per1000,1000/11);
  assert.deepEqual(domain.workspaceSummary(state).metrics,{
    baselineWords:7,currentWords:11,wordDelta:4,vocabularyDelta:state.analysis.comparison.metrics.vocabularySize.delta,
  });
  assert.equal(state.analysis.evidence.find(item=>item.label==="Current word count").value,11);
  const markdown=domain.exportWorkspaceReport(state,"markdown").content;
  assert.match(markdown,/\| Words \(including stopwords\) \| 7 \| 11 \| 4 \|/);
  assert.match(markdown,/standalone numbers/);
  assert.deepEqual(JSON.parse(domain.exportWorkspaceReport(state,"json").content).analysis.wordCounts,state.analysis.wordCounts);
});

test("personality privacy is ignored while a missing data-protection promise is still flagged",()=>{
  const currentText="The guide explains the calculation and gives a clear example.";
  const check=originalText=>domain.analyzeWorkspace(domain.createAnalysisWorkspace({originalText,currentText,goal:"Review omissions."}));
  const personality=check("Life Path 7 | Analysis & privacy.\nThe guide explains the calculation.");
  assert.equal(personality.analysis.claims.filter(item=>item.category==="privacy").length,0);
  assert.equal(personality.analysis.reviewQueue.filter(item=>item.title.includes("privacy")).length,0);
  const promise=check("We protect your privacy.\nThe guide explains the calculation.");
  assert.equal(promise.analysis.claimSummary.find(item=>item.category==="privacy").baseline,1);
  assert.ok(promise.analysis.reviewQueue.some(item=>item.title==="Review missing privacy"));
});

test("legacy saved analysis requires current checks without discarding texts or review history",()=>{
  let state=analyzedWorkspace();
  state=domain.addFinding(state,{title:"Review the wording",explanation:"Based on the original measurements.",evidenceRefs:[state.analysis.evidence[0].id]},{id:"legacy-finding"});
  state=domain.proposeTextPatch(state,{baseRevision:1,findingIds:["legacy-finding"],expectedText:"easy to verify",replacementText:"easy to check",rationale:"Clarify the wording.",recommendationKind:"clarity"},{id:"legacy-patch"});
  state=domain.decidePatch(state,"legacy-patch","approved");
  assert.equal(domain.restoreWorkspace(state),state);
  const legacy=structuredClone(state);
  delete legacy.analysis.engineVersion;
  delete legacy.analysis.wordCounts;
  const restored=domain.restoreWorkspace(legacy);
  assert.equal(restored.analysis,null);
  assert.equal(restored.originalText,state.originalText);
  assert.equal(restored.currentText,state.currentText);
  assert.deepEqual(restored.history,state.history);
  assert.deepEqual(restored.findings,state.findings);
  assert.equal(restored.patches[0].status,"stale");
  assert.throws(()=>domain.exportWorkspaceReport(restored,"json"),error=>error.code==="ANALYSIS_REQUIRED");
  const refreshed=domain.analyzeWorkspace(restored,{id:"current-engine-analysis"});
  assert.notEqual(refreshed.analysis.id,state.analysis.id);
  assert.equal(domain.workspaceSummary(refreshed).findings[0].analysisId,state.analysis.id);
  assert.equal(domain.workspaceSummary(refreshed).findings[0].isCurrent,false);
  assert.equal(domain.workspaceSummary(refreshed).reviewPlan.currentRecommendations,0);
  assert.match(domain.exportWorkspaceReport(refreshed,"markdown").content,/Revision: 1 \(historical; not evidence for the current revision\)/);
  assert.throws(()=>domain.proposeTextPatch(refreshed,{baseRevision:1,findingIds:["legacy-finding"],expectedText:"easy to verify",replacementText:"easy to check",rationale:"Clarify the wording."}),error=>error.code==="INVALID_FINDING");
});

test("claim-aware review turns two commercial versions into a prioritized decision brief",()=>{
  const originalText=`Provider A
Welcome offer: 50% off first reading
Price: $2.99/min
4.8/5 rating
500+ advisors
24/7 availability
Money-back guarantee
91% prediction accuracy`;
  const currentText=`Provider A
New User Offer: $10 free + 80% OFF
New User Offer: $10 free + 80% OFF
Price: $1.00/min
4.7/5 rating
Advisor Count: 400+
24/7 Availability: Yes
Reading Methods: Chat, Phone, Video
37,396 users got a reading this month
Privacy terms available`;
  let state=domain.createAnalysisWorkspace({originalText,currentText,goal:"Find claim drift and safe cleanup opportunities."},{id:"workspace-claims"});
  state=domain.analyzeWorkspace(state,{id:"analysis-claims"});

  assert.ok(state.analysis.changeMap.addedBlocks>0);
  assert.ok(state.analysis.changeMap.removedBlocks>0);
  assert.ok(state.analysis.claimSummary.some(item=>item.category==="price"&&item.currentOnly>0&&item.baselineOnly>0));
  assert.ok(state.analysis.claimSummary.some(item=>item.category==="guarantee"&&item.current===0&&item.baseline>0));
  assert.ok(state.analysis.claims.some(item=>item.category==="social_proof"&&item.source==="current"));
  const duplicate=state.analysis.reviewQueue.find(item=>item.category==="duplicate");
  assert.ok(duplicate?.patchCandidate);
  assert.match(duplicate.patchCandidate.expectedText,/New User Offer[\s\S]+New User Offer/);
  assert.ok(state.analysis.reviewQueue.some(item=>item.category==="claim_drift"&&item.priority==="high"));
  assert.ok(state.analysis.reviewQueue.some(item=>item.category==="verification"&&item.priority==="high"));
  const evidenceIds=new Set(state.analysis.evidence.map(item=>item.id));
  assert.ok(state.analysis.reviewQueue.every(item=>item.evidenceRefs.every(ref=>evidenceIds.has(ref))));

  const summary=domain.workspaceSummary(state);
  assert.equal(summary.changeMap.addedBlocks,state.analysis.changeMap.addedBlocks);
  assert.equal(summary.reviewQueue.length,state.analysis.reviewQueue.length);
  assert.match(domain.exportWorkspaceReport(state,"markdown").content,/Commercial claim ledger/);
});

test("claim extraction does not join a number to readers in a later sentence",()=>{
  const originalText="The starter plan costs $20 per month. Results arrive in 24 hours. Readers should verify every quoted price.";
  const currentText="The starter plan costs $29 per month. Thousands of teams use the product. Readers should verify every quoted price.";
  let state=domain.createAnalysisWorkspace({originalText,currentText,goal:"Verify changed commercial claims."},{id:"workspace-sentence-boundaries"});
  state=domain.analyzeWorkspace(state,{id:"analysis-sentence-boundaries"});

  assert.ok(state.analysis.claims.some(item=>item.category==="price"&&item.value==="$29"));
  assert.equal(state.analysis.claims.some(item=>item.category==="advisor_count"),false);
});

test("rewrite review exposes the changed price, missing restriction, and missing tracked term",()=>{
  const originalText="Fieldnote Pro costs $29 per month.\nFor annual billing only.\nThe plan includes unlimited projects and data export.\nCancel your subscription from account settings.";
  const currentText="Fieldnote Pro costs $19 per month.\nThe plan includes unlimited projects.\nCancel your subscription from account settings.";
  const state=domain.analyzeWorkspace(domain.createAnalysisWorkspace({originalText,currentText,goal:"Check what was lost after rewriting.",focusTerms:["data export"]}),{id:"rewrite-analysis"});
  const queue=state.analysis.reviewQueue;
  const price=queue.find(item=>item.title==="Verify changed prices");
  assert.deepEqual(price.baselineExcerpts,["Fieldnote Pro costs $29 per month."]);
  assert.deepEqual(price.currentExcerpts,["Fieldnote Pro costs $19 per month."]);
  const condition=queue.find(item=>item.title.startsWith("Review missing condition"));
  assert.deepEqual(condition.baselineExcerpts,["For annual billing only."]);
  assert.deepEqual(condition.currentExcerpts,[]);
  assert.match(condition.detail,/omitted or rephrased/);
  const term=queue.find(item=>item.title.includes("missing tracked term"));
  assert.match(term.detail,/baseline and 0 times/);
  assert.deepEqual(term.baselineExcerpts,["The plan includes unlimited projects and data export."]);
  assert.deepEqual(term.currentExcerpts,[]);
  assert.ok(term.evidenceRefs.includes("rewrite-analysis:focus:0"));
  const evidenceIds=new Set(state.analysis.evidence.map(item=>item.id));
  assert.ok(queue.every(item=>item.evidenceRefs.every(ref=>evidenceIds.has(ref))));
  const report=domain.exportWorkspaceReport(state,"markdown").content;
  assert.match(report,/\$29 per month/);
  assert.match(report,/\$19 per month/);
  assert.match(report,/For annual billing only\./);
  assert.match(report,/data export: baseline 1; current 0/);
  assert.match(report,/does not verify facts/);
  assert.match(report,/Removed or rewritten text/);
  assert.match(report,/Added or rewritten text/);
});

test("a retained restriction and a term absent from both versions are not reported as losses",()=>{
  const originalText="The starter plan costs $20 per month for annual billing only. Refunds are available only within 14 days of purchase.";
  const currentText="The starter plan costs $29 per month for annual billing only. Refunds are offered only within 14 days of purchase.";
  const state=domain.analyzeWorkspace(domain.createAnalysisWorkspace({originalText,currentText,goal:"Check restrictions.",focusTerms:["data export"]}));
  assert.equal(state.analysis.reviewQueue.some(item=>item.title.startsWith("Review missing condition")),false);
  assert.equal(state.analysis.reviewQueue.some(item=>item.title.includes("missing tracked term")),false);
});

test("refreshing the same analyzed revision preserves findings and approvals without stranding evidence",()=>{
  let state=analyzedWorkspace();
  const evidenceRef=state.analysis.evidence[0].id;
  state=domain.addFinding(state,{title:"Clarify the workflow",explanation:"Review the measured wording.",evidenceRefs:[evidenceRef]},{id:"refresh-finding"});
  for(const [patchId,expectedText,replacementText] of [["refresh-patch","easy to verify","easy to verify against the result"],["sibling-patch","accurate, concise","accurate and concise"]]){
    state=domain.proposeTextPatch(state,{baseRevision:1,findingIds:["refresh-finding"],expectedText,replacementText,rationale:"Clarify the text."},{id:patchId});
    state=domain.decidePatch(state,patchId,"approved");
  }
  const refreshed=domain.analyzeWorkspace(state,{id:"replacement-analysis"});
  assert.equal(refreshed,state);
  assert.equal(refreshed.analysis.id,"analysis-test");
  assert.ok(refreshed.analysis.evidence.some(item=>item.id===refreshed.findings[0].evidenceRefs[0]));
  assert.equal(refreshed.patches[0].status,"approved");

  state=domain.applyApprovedPatch(refreshed,{patchId:"refresh-patch",expectedRevision:1});
  assert.equal(state.analysis,null);
  assert.equal(state.patches.find(item=>item.id==="sibling-patch").status,"stale");
  assert.throws(()=>domain.applyApprovedPatch(state,{patchId:"sibling-patch",expectedRevision:2}),error=>error.code==="HUMAN_APPROVAL_REQUIRED");
  state=domain.analyzeWorkspace(state,{id:"new-revision-analysis"});
  assert.equal(state.analysis.id,"new-revision-analysis");
  assert.match(domain.exportWorkspaceReport(state,"markdown").content,/Revision: 1 \(historical; not evidence for the current revision\)/);
});

test("Markdown keeps full changed blocks even when summaries truncate them and source contains fences",()=>{
  const originalText=`A long source block ${"with specific guidance ".repeat(20)}and literal \`\`\` markers.`;
  const currentText="A shorter replacement with clear guidance.";
  const state=domain.analyzeWorkspace(domain.createAnalysisWorkspace({originalText,currentText,goal:"Review the complete removed wording."}));
  assert.equal(state.analysis.changeMap.removedSamples[0].includes("literal"),false);
  const report=domain.exportWorkspaceReport(state,"markdown").content;
  assert.ok(report.includes(originalText));
  assert.ok(report.includes(`\`\`\`\`text\n${originalText}\n\`\`\`\``));
  assert.ok(report.includes(currentText));
});

test("a patch requires current evidence, a finding, and explicit human approval",()=>{
  let state=analyzedWorkspace();
  const evidenceRef=state.analysis.evidence.find(item=>item.label==="Focus: verify").id;
  state=domain.addFinding(state,{title:"Verification is mentioned only once",explanation:"The focus measurement shows one exact occurrence, so the result can be made more concrete.",evidenceRefs:[evidenceRef]},{id:"finding-test",now:"2026-08-27T00:02:00.000Z"});
  state=domain.proposeTextPatch(state,{baseRevision:1,findingIds:["finding-test"],expectedText:"easy to verify",replacementText:"easy to verify against the expected result",rationale:"Connect verification to a concrete output."},{id:"patch-test",now:"2026-08-27T00:03:00.000Z"});

  assert.throws(()=>domain.applyApprovedPatch(state,{patchId:"patch-test",expectedRevision:1}),error=>error.code==="HUMAN_APPROVAL_REQUIRED");
  state=domain.decidePatch(state,"patch-test","approved",{now:"2026-08-27T00:04:00.000Z"});
  state=domain.applyApprovedPatch(state,{patchId:"patch-test",expectedRevision:1},{now:"2026-08-27T00:05:00.000Z"});

  assert.equal(state.revision,2);
  assert.match(state.currentText,/verify against the expected result/);
  assert.equal(state.originalText,baseline);
  assert.equal(state.analysis,null);
  assert.equal(state.patches[0].status,"applied");
  assert.equal(state.history.at(-1).event,"patch_applied");
  assert.throws(()=>domain.exportWorkspaceReport(state,"markdown"),error=>error.code==="ANALYSIS_REQUIRED");

  state=domain.analyzeWorkspace(state,{id:"analysis-after",now:"2026-08-27T00:06:00.000Z"});
  const report=domain.exportWorkspaceReport(state,"markdown");
  assert.match(report.content,/Before \/ after metrics/);
  assert.match(report.content,/Verification is mentioned only once/);
  assert.match(report.content,/\*\*applied\*\*/);
  state=domain.undoLastAppliedPatch(state,{now:"2026-08-27T00:07:00.000Z"});
  assert.equal(state.revision,3);
  assert.equal(state.currentText,baseline);
  assert.throws(()=>domain.undoLastAppliedPatch(state),error=>error.code==="NOTHING_TO_UNDO");
});

test("ambiguous and stale patch anchors fail safely",()=>{
  let state=domain.createAnalysisWorkspace({originalText:"alpha beta alpha beta gamma delta",goal:"Reduce repetition."});
  state=domain.analyzeWorkspace(state);
  const evidenceRef=state.analysis.evidence[0].id;
  state=domain.addFinding(state,{title:"Repeated wording",explanation:"The measured document can be edited more precisely.",evidenceRefs:[evidenceRef]},{id:"finding-stale"});
  assert.throws(()=>domain.proposeTextPatch(state,{baseRevision:1,findingIds:["finding-stale"],expectedText:"alpha",replacementText:"omega",rationale:"Remove repeated wording."}),error=>error.code==="TEXT_NOT_UNIQUE");
  assert.throws(()=>domain.proposeTextPatch(state,{baseRevision:2,findingIds:["finding-stale"],expectedText:"gamma",replacementText:"omega",rationale:"Use a specific term."}),error=>error.code==="STALE_REVISION");
});

test("a complete agent review plan requires substantive, diverse exact proposals",()=>{
  let state=analyzedWorkspace();
  const evidenceRef=state.analysis.evidence.find(item=>item.label==="Focus: documentation").id;
  assert.throws(()=>domain.submitReviewPlan(state,{baseRevision:1,recommendations:[
    {kind:"cleanup",title:"Cleanup one",explanation:"Measured cleanup.",evidenceRefs:[evidenceRef],expectedText:"Clear product documentation",replacementText:"Product documentation",rationale:"Remove a repeated modifier."},
    {kind:"cleanup",title:"Cleanup two",explanation:"Measured cleanup.",evidenceRefs:[evidenceRef],expectedText:"Clear documentation",replacementText:"Documentation",rationale:"Remove another repeated modifier."},
    {kind:"cleanup",title:"Cleanup three",explanation:"Measured cleanup.",evidenceRefs:[evidenceRef],expectedText:"easy to verify",replacementText:"verifiable",rationale:"Shorten the phrase."},
  ]}),error=>error.code==="CLEANUP_LIMIT");

  state=domain.submitReviewPlan(state,{baseRevision:1,recommendations:[
    {kind:"structure",title:"Lead with the reader task",explanation:"The measured document repeats documentation before naming the workflow.",evidenceRefs:[evidenceRef],expectedText:"Clear product documentation helps readers complete a task.",replacementText:"Start product documentation with the task readers need to complete.",rationale:"Turn a general observation into an actionable opening."},
    {kind:"clarity",title:"Make the sequence explicit",explanation:"The goal asks for specific guidance and the current sentence compresses three steps.",evidenceRefs:[evidenceRef],expectedText:"Clear documentation names the task, shows the next step, and explains the expected result.",replacementText:"Name the task first, show the next step, then explain the expected result.",rationale:"Expose the sequence instead of describing it abstractly."},
    {kind:"verification",title:"Name the verification target",explanation:"The focus evidence measures verification language but not its object.",evidenceRefs:[evidenceRef],expectedText:"Product documentation should be accurate, concise, and easy to verify.",replacementText:"Keep product documentation concise, and verify every instruction against the expected result.",rationale:"Make verification an explicit action with a target."},
  ]});
  assert.equal(state.findings.length,3);
  assert.equal(state.patches.length,3);
  assert.deepEqual(state.patches.map(item=>item.recommendationKind),["structure","clarity","verification"]);
  assert.ok(state.patches.every(item=>item.status==="proposed"));
  assert.equal(state.currentText,baseline);
});

test("WebMCP exposes one complete-plan action and never exposes approval",async()=>{
  let state=null;
  const actions={
    create:input=>(state=domain.createAnalysisWorkspace(input,{id:"workspace-webmcp"})),
    analyze:()=>(state=domain.analyzeWorkspace(state,{id:"analysis-webmcp"})),
    submitReviewPlan:input=>(state=domain.submitReviewPlan(state,input)),
    applyPatch:input=>(state=domain.applyApprovedPatch(state,input)),
    exportReport:format=>domain.exportWorkspaceReport(state,format),
  };
  const tools=webmcp.createEvidenceWorkspaceTools(actions);
  assert.deepEqual(tools.map(tool=>tool.name),[...webmcp.EVIDENCE_WEBMCP_TOOL_NAMES]);
  assert.equal(tools.some(tool=>/approve/i.test(tool.name)&&tool.name!=="apply_approved_patch"),false);
  assert.ok(tools.every(tool=>tool.inputSchema.additionalProperties===false));
  assert.equal(tools.find(tool=>tool.name==="analyze_workspace").annotations.readOnlyHint,true);

  let result=await tools[0].execute({originalText:baseline,goal:"Make the guidance more specific.",focusTerms:["verify"]});
  assert.equal(result.ok,true);
  result=await tools[1].execute({});
  assert.equal(result.ok,true);
  const evidenceRef=result.evidence[0].id;
  result=await tools[2].execute({baseRevision:1,recommendations:[
    {kind:"structure",title:"Lead with the task",explanation:"Use the measured document to improve the opening.",evidenceRefs:[evidenceRef],expectedText:"Clear product documentation helps readers complete a task.",replacementText:"Start with the task readers need to complete.",rationale:"Make the opening actionable."},
    {kind:"clarity",title:"Expose the sequence",explanation:"Use the measured document to clarify the workflow.",evidenceRefs:[evidenceRef],expectedText:"Clear documentation names the task, shows the next step, and explains the expected result.",replacementText:"Name the task, show the next step, and define the expected result.",rationale:"Clarify the sequence."},
    {kind:"verification",title:"Name the check",explanation:"Use current evidence to make verification concrete.",evidenceRefs:[evidenceRef],expectedText:"easy to verify",replacementText:"easy to verify against the expected result",rationale:"Name the verification target."},
  ]});
  assert.equal(result.ok,true);
  assert.equal(result.submittedPlan.length,3);
  assert.match(result.nextAction,/human/i);
  result=await tools[3].execute({patchId:result.submittedPlan[0].id,expectedRevision:1});
  assert.deepEqual(result.error.code,"HUMAN_APPROVAL_REQUIRED");
});
