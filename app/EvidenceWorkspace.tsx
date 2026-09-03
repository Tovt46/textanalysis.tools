"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
  addFinding,analyzeWorkspace,applyApprovedPatch,createAnalysisWorkspace,decidePatch,
  exportWorkspaceReport,proposeTextPatch,restoreWorkspace,submitReviewPlan,undoLastAppliedPatch,
  type EvidenceWorkspaceState,type WorkspacePatch,type WorkspaceReviewItem,
} from "./lib/evidence-workspace";
import {registerEvidenceWorkspaceTools,type EvidenceWorkspaceActions} from "./lib/evidence-webmcp";

const STORAGE_KEY="textanalysis-evidence-workspace-v2";
const EXAMPLE_TEXT="Clear product documentation helps readers complete a task. Clear documentation names the task, shows the next step, and explains the expected result. Product documentation should be accurate, concise, and easy to verify.";
const AGENT_MISSION="Use this page’s WebMCP tools. Analyze the current workspace, then submit one complete review plan with 3–5 evidence-linked exact patches. Include at least one structural or clarity improvement and one trust or verification improvement when claim risks exist. Use at most one cleanup item. Do not apply anything; stop for my approval.";

declare global{
  interface Document{modelContext?:{registerTool:(tool:unknown)=>void|Promise<void>}}
  interface Window{
    __evidenceWorkspaceActions?:EvidenceWorkspaceActions;
    __evidenceWorkspaceToolsRegistered?:boolean;
  }
}

function formatDelta(value:number,digits=0){
  const formatted=value.toFixed(digits);
  return value>0?`+${formatted}`:formatted;
}

function PatchDiff({patch}:{patch:WorkspacePatch}){
  return <div className="evidence-diff" aria-label="Proposed text change">
    <div><span>REMOVE</span><del>{patch.expectedText}</del></div>
    <div><span>ADD</span><ins>{patch.replacementText||"(delete without replacement)"}</ins></div>
  </div>;
}

export default function EvidenceWorkspace(){
  const [originalText,setOriginalText]=useState(EXAMPLE_TEXT);
  const [currentVersion,setCurrentVersion]=useState("");
  const [goal,setGoal]=useState("Make the explanation more specific without losing its focus on verifiable documentation.");
  const [focusInput,setFocusInput]=useState("documentation, task, verify");
  const [workspace,setWorkspace]=useState<EvidenceWorkspaceState|null>(null);
  const workspaceRef=useRef<EvidenceWorkspaceState|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [webMcpStatus,setWebMcpStatus]=useState<"checking"|"ready"|"fallback"|"error">("checking");
  const [findingEvidence,setFindingEvidence]=useState("");
  const [findingTitle,setFindingTitle]=useState("");
  const [findingExplanation,setFindingExplanation]=useState("");
  const [patchFinding,setPatchFinding]=useState("");
  const [expectedText,setExpectedText]=useState("");
  const [replacementText,setReplacementText]=useState("");
  const [patchRationale,setPatchRationale]=useState("");

  const commit=useCallback((next:EvidenceWorkspaceState)=>{
    workspaceRef.current=next;
    setWorkspace(next);
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(next));setError("");}
    catch{setError("The workspace was updated, but this browser could not persist the latest state in session storage.");}
    return next;
  },[]);

  const requireWorkspace=useCallback(()=>{
    if(!workspaceRef.current)throw new Error("Create a workspace first.");
    return workspaceRef.current;
  },[]);

  const actions=useMemo<EvidenceWorkspaceActions>(()=>({
    create:input=>{const next=commit(createAnalysisWorkspace(input));setMessage("WebMCP created the workspace. Run deterministic analysis next.");return next;},
    analyze:()=>{const next=commit(analyzeWorkspace(requireWorkspace()));setMessage("WebMCP built the evidence brief. The agent must now submit 3–5 meaningful proposals.");return next;},
    submitReviewPlan:input=>{const next=commit(submitReviewPlan(requireWorkspace(),input));setMessage("WebMCP submitted a complete review plan. Every proposal still requires human approval.");return next;},
    applyPatch:input=>{const next=commit(applyApprovedPatch(requireWorkspace(),input));setMessage("WebMCP applied the human-approved patch. Analyze the new revision before export.");return next;},
    exportReport:format=>{const report=exportWorkspaceReport(requireWorkspace(),format);setMessage(`WebMCP prepared the ${format} evidence report.`);return report;},
  }),[commit,requireWorkspace]);

  useEffect(()=>{
    window.__evidenceWorkspaceActions=actions;
  },[actions]);

  useEffect(()=>{
    const stored=sessionStorage.getItem(STORAGE_KEY);
    if(stored){
      try{
        const restored=restoreWorkspace(JSON.parse(stored));
        queueMicrotask(()=>{commit(restored);setMessage("Restored the workspace saved in this browser tab.");});
      }
      catch{sessionStorage.removeItem(STORAGE_KEY);}
    }
    const modelContext=document.modelContext;
    if(!modelContext){queueMicrotask(()=>setWebMcpStatus("fallback"));return;}
    if(window.__evidenceWorkspaceToolsRegistered){queueMicrotask(()=>setWebMcpStatus("ready"));return;}
    const proxy:EvidenceWorkspaceActions={
      create:input=>window.__evidenceWorkspaceActions!.create(input),
      analyze:()=>window.__evidenceWorkspaceActions!.analyze(),
      submitReviewPlan:input=>window.__evidenceWorkspaceActions!.submitReviewPlan(input),
      applyPatch:input=>window.__evidenceWorkspaceActions!.applyPatch(input),
      exportReport:format=>window.__evidenceWorkspaceActions!.exportReport(format),
    };
    window.__evidenceWorkspaceToolsRegistered=true;
    registerEvidenceWorkspaceTools(modelContext,proxy).then(()=>{
      setWebMcpStatus("ready");
    }).catch(()=>{window.__evidenceWorkspaceToolsRegistered=false;setWebMcpStatus("error");});
  },[commit]);

  const run=(work:()=>void,success:string)=>{
    try{work();setMessage(success);setError("");}
    catch(reason){setError(reason instanceof Error?reason.message:"The action could not be completed.");setMessage("");}
  };

  const create=()=>run(()=>{
    const focusTerms=focusInput.split(",").map(term=>term.trim()).filter(Boolean);
    commit(createAnalysisWorkspace({originalText,currentText:currentVersion||undefined,goal,focusTerms}));
  },"Workspace created. Run the deterministic analysis next.");

  const analyze=()=>run(()=>commit(analyzeWorkspace(requireWorkspace())),"Claim-aware review complete. Start with the prioritized queue, then inspect raw evidence if needed.");

  const submitFinding=()=>run(()=>{
    const next=addFinding(requireWorkspace(),{title:findingTitle,explanation:findingExplanation,evidenceRefs:[findingEvidence]});
    commit(next);setFindingTitle("");setFindingExplanation("");
    setPatchFinding(next.findings[next.findings.length-1].id);
  },"Finding added and linked to deterministic evidence.");

  const submitPatch=()=>run(()=>{
    commit(proposeTextPatch(requireWorkspace(),{baseRevision:requireWorkspace().revision,findingIds:[patchFinding],expectedText,replacementText,rationale:patchRationale}));
    setExpectedText("");setReplacementText("");setPatchRationale("");
  },"Patch proposed. A human must approve or reject it below.");

  const queueReviewItem=(item:WorkspaceReviewItem)=>run(()=>{
    let next=addFinding(requireWorkspace(),{title:item.title,explanation:item.detail,evidenceRefs:item.evidenceRefs});
    const findingId=next.findings.at(-1)!.id;
    if(item.patchCandidate)next=proposeTextPatch(next,{baseRevision:next.revision,findingIds:[findingId],...item.patchCandidate});
    commit(next);
    setPatchFinding(findingId);
  },item.patchCandidate?"Grounded finding and exact patch queued. Review the diff and choose Approve or Reject.":"Grounded finding added to the review. The source text remains unchanged.");

  const decide=(patchId:string,decision:"approved"|"rejected")=>run(()=>commit(decidePatch(requireWorkspace(),patchId,decision)),decision==="approved"?"Patch approved by the human reviewer. It is now eligible to apply.":"Patch rejected. It cannot be applied.");
  const apply=(patchId:string)=>run(()=>commit(applyApprovedPatch(requireWorkspace(),{patchId,expectedRevision:requireWorkspace().revision})),"Approved patch applied. Re-run analysis to verify the new revision.");
  const undo=()=>run(()=>commit(undoLastAppliedPatch(requireWorkspace())),"Last applied change restored as a new revision. Re-run analysis.");

  const download=(format:"markdown"|"json")=>run(()=>{
    const report=exportWorkspaceReport(requireWorkspace(),format);
    const url=URL.createObjectURL(new Blob([report.content],{type:format==="json"?"application/json":"text/markdown"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=report.filename;anchor.click();URL.revokeObjectURL(url);
  },`${format==="json"?"JSON":"Markdown"} evidence report exported.`);

  const copyAgentMission=async()=>{
    try{await navigator.clipboard.writeText(AGENT_MISSION);setMessage("Agent mission copied. Paste it into ChatGPT while this page is open.");setError("");}
    catch{setError("Copy was unavailable. Select the agent mission text manually.");setMessage("");}
  };

  const clear=()=>{
    sessionStorage.removeItem(STORAGE_KEY);workspaceRef.current=null;setWorkspace(null);setMessage("Workspace cleared from this browser tab.");setError("");
  };

  const analysis=workspace?.analysis&&workspace.analysis.revision===workspace.revision?workspace.analysis:null;
  const currentFindings=workspace?.findings.filter(item=>item.revision===workspace.revision)||[];
  const queuedFindingTitles=new Set(currentFindings.map(item=>item.title));
  const highPriorityCount=analysis?.reviewQueue.filter(item=>item.priority==="high").length||0;
  const substantiveReviewItems=analysis?.reviewQueue.filter(item=>item.category!=="duplicate")||[];
  const cleanupReviewItems=analysis?.reviewQueue.filter(item=>item.category==="duplicate")||[];
  const agentPlanPatches=workspace?.patches.filter(item=>item.baseRevision===workspace.revision&&item.recommendationKind)||[];
  const agentPlanReady=agentPlanPatches.length>=3;

  return <section className="evidence-workspace" data-testid="evidence-workspace">
    <div className="evidence-capability" data-status={webMcpStatus}>
      <div><span className="evidence-status-dot"/><strong>{webMcpStatus==="ready"?"WebMCP tools ready":webMcpStatus==="checking"?"Checking WebMCP support":webMcpStatus==="error"?"WebMCP registration failed":"Manual workspace ready"}</strong></div>
      <p>{webMcpStatus==="ready"?"ChatGPT can discover five page tools, including one complete review-plan action. You still control every approval.":"This browser does not expose WebMCP. The complete workflow remains available through the visible controls below."}</p>
    </div>

    {!workspace?<div className="evidence-setup">
      <div className="evidence-section-head"><div><span>01</span><div><p>CREATE THE CASE</p><h2>Paste a baseline and the version you need to trust</h2></div></div><button type="button" className="secondary-button" onClick={()=>{setOriginalText(EXAMPLE_TEXT);setCurrentVersion("");setGoal("Make the explanation more specific without losing its focus on verifiable documentation.");setFocusInput("documentation, task, verify");}}>Load example</button></div>
      <div className="evidence-source-grid">
        <label><span>Original text · baseline</span><textarea data-testid="original-text" value={originalText} onChange={event=>setOriginalText(event.target.value)} maxLength={100_000}/><small>{originalText.length.toLocaleString()} / 100,000 characters</small></label>
        <label><span>Current version · optional</span><textarea data-testid="current-version-input" value={currentVersion} onChange={event=>setCurrentVersion(event.target.value)} maxLength={100_000} placeholder="Leave empty to start from the baseline."/><small>{currentVersion.length.toLocaleString()} / 100,000 characters</small></label>
      </div>
      <div className="evidence-goal-grid">
        <label><span>Review goal</span><textarea data-testid="workspace-goal" value={goal} onChange={event=>setGoal(event.target.value)} maxLength={500}/></label>
        <label><span>Optional exact focus terms</span><input value={focusInput} onChange={event=>setFocusInput(event.target.value)} placeholder="documentation, task, verify"/><small>Claims are detected automatically; use this for extra exact measurements.</small></label>
        <button type="button" className="analyze-button" onClick={create}>Create workspace <span>→</span></button>
      </div>
    </div>:<>
      <div className="evidence-workspace-bar">
        <div><p>ACTIVE WORKSPACE</p><h2>Revision <span data-testid="workspace-revision">{workspace.revision}</span></h2><small>{workspace.id}</small></div>
        <div><button type="button" className="secondary-button" onClick={undo} disabled={workspace.history.at(-1)?.event!=="patch_applied"}>Undo last apply</button><button type="button" className="secondary-button" onClick={clear}>Clear workspace</button></div>
      </div>
      <div className="evidence-goal-summary"><span>GOAL</span><p>{workspace.goal}</p><span>FOCUS</span><p>{workspace.focusTerms.join(" · ")||"No focus terms"}</p></div>
      <div className="evidence-document-grid">
        <label><span>Immutable baseline</span><textarea readOnly value={workspace.originalText}/></label>
        <label><span>Current revision</span><textarea data-testid="current-text" readOnly value={workspace.currentText}/></label>
      </div>

      <section className="evidence-stage" aria-labelledby="analysis-stage">
        <div className="evidence-section-head"><div><span>02</span><div><p>COMPARE · TRIAGE</p><h2 id="analysis-stage">Claim-aware decision brief</h2></div></div><button type="button" className="analyze-button compact" onClick={analyze}>{analysis?"Refresh review":"Build review"}</button></div>
        {!analysis?<p className="evidence-empty">This revision has not been analyzed yet. Findings and patches remain locked until measurements exist.</p>:<>
          <div className="evidence-metrics" data-testid="analysis-metrics">
            <div><span>WORDS</span><strong>{analysis.current.tokenCount}</strong><small>{formatDelta(analysis.changeMap.wordDelta)} · {formatDelta(analysis.changeMap.wordDeltaPercent,1)}%</small></div>
            <div><span>EXACT BLOCKS</span><strong>{analysis.changeMap.retainedBlocks}</strong><small>{analysis.changeMap.addedBlocks} added · {analysis.changeMap.removedBlocks} removed</small></div>
            <div><span>AGENT PLAN</span><strong>{agentPlanPatches.length}/3</strong><small>{agentPlanReady?"ready for human review":"meaningful proposals required"}</small></div>
            <div><span>HIGH PRIORITY</span><strong>{highPriorityCount}</strong><small>{analysis.reviewQueue.length} total review items</small></div>
          </div>

          <div className="evidence-agent-mission" data-status={agentPlanReady?"ready":"waiting"} data-testid="agent-mission">
            <div><span>{agentPlanReady?"AGENT PLAN READY":"NEXT WEBMCP ACTION"}</span><h3>{agentPlanReady?`${agentPlanPatches.length} meaningful diffs ready for review`:"Ask the agent for decisions, not more diagnostics"}</h3><p>{agentPlanReady?"Review the structure, clarity, and trust proposals below. Nothing has changed in the source text.":"The deterministic layer has supplied evidence. ChatGPT must now submit 3–5 exact proposals, with at most one simple cleanup."}</p></div>
            <div><code>{AGENT_MISSION}</code><button type="button" className="secondary-button" onClick={copyAgentMission}>Copy agent mission</button></div>
          </div>
          <div className="evidence-brief-grid">
            <article><span>VERSION MAP</span><h3>{analysis.changeMap.wordDeltaPercent===0?"Same analyzed length":`${Math.abs(analysis.changeMap.wordDeltaPercent).toFixed(1)}% ${analysis.changeMap.wordDeltaPercent<0?"shorter":"longer"}`}</h3><p>Exact comparison found {analysis.changeMap.retainedBlocks} retained, {analysis.changeMap.addedBlocks} added, and {analysis.changeMap.removedBlocks} removed blocks.</p></article>
            <article><span>CLAIM DRIFT</span><h3>{analysis.claimSummary.reduce((total,item)=>total+item.currentOnly+item.baselineOnly,0)} unmatched claims</h3><p>“Unmatched” means new, removed, or rewritten. Values still need a live source before publication.</p></article>
            <article><span>NEXT DECISION</span><h3>{analysis.reviewQueue[0]?.title||"No material issue detected"}</h3><p>{analysis.reviewQueue[0]?.detail||"The deterministic review did not produce a prioritized action."}</p></article>
          </div>

          <div className="evidence-change-samples">
            <div><span>ADDED OR REWRITTEN</span>{analysis.changeMap.addedSamples.length?<ul>{analysis.changeMap.addedSamples.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>No unmatched current blocks.</p>}</div>
            <div><span>REMOVED OR REWRITTEN</span>{analysis.changeMap.removedSamples.length?<ul>{analysis.changeMap.removedSamples.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>No unmatched baseline blocks.</p>}</div>
          </div>

          <div className="evidence-subsection-head"><div><span>EVIDENCE QUEUE</span><h3>Substantive decisions for the agent</h3></div><small>Evidence-bound · no automatic edits</small></div>
          {!substantiveReviewItems.length?<p className="evidence-empty">No deterministic risks were found. The agent can still inspect raw evidence against the review goal.</p>:<div className="evidence-review-list" data-testid="review-queue">{substantiveReviewItems.map(item=>{
            const queued=queuedFindingTitles.has(item.title);
            return <article key={item.id} data-priority={item.priority} data-testid="review-item"><div><span>{item.priority.toUpperCase()} · {item.category.replaceAll("_"," ")}</span><h3>{item.title}</h3></div><p>{item.detail}</p><button type="button" className="secondary-button" disabled={queued} onClick={()=>queueReviewItem(item)}>{queued?"Queued":"Add evidence note"}</button></article>;
          })}</div>}

          {cleanupReviewItems.length>0&&<details className="evidence-cleanup"><summary>Quick cleanup · {cleanupReviewItems.length} exact duplicate{cleanupReviewItems.length===1?"":"s"}</summary><div className="evidence-review-list">{cleanupReviewItems.map(item=>{
            const queued=queuedFindingTitles.has(item.title);
            return <article key={item.id} data-priority="low" data-testid="review-item"><div><span>LOW · CLEANUP</span><h3>{item.title}</h3></div><p>{item.detail}</p><button type="button" className="secondary-button" disabled={queued} onClick={()=>queueReviewItem(item)}>{queued?"Queued":"Queue exact patch"}</button></article>;
          })}</div></details>}

          <div className="evidence-subsection-head"><div><span>COMMERCIAL CLAIM LEDGER</span><h3>What changed and what needs verification</h3></div><small>Exact text matching; unmatched does not mean false</small></div>
          {!analysis.claimSummary.length?<p className="evidence-empty">No supported commercial claim patterns were detected.</p>:<div className="evidence-table-wrap"><table className="evidence-table evidence-claim-table" data-testid="claim-ledger"><thead><tr><th>Claim type</th><th>Baseline</th><th>Current</th><th>Exact retained</th><th>Current only</th><th>Baseline only</th></tr></thead><tbody>{analysis.claimSummary.map(item=><tr key={item.category}><td>{item.label}</td><td>{item.baseline}</td><td>{item.current}</td><td>{item.retained}</td><td>{item.currentOnly}</td><td>{item.baselineOnly}</td></tr>)}</tbody></table></div>}

          <details className="evidence-raw"><summary>Inspect {analysis.evidence.length} raw evidence references</summary><div className="evidence-table-wrap"><table className="evidence-table"><thead><tr><th>Evidence ID</th><th>Measured fact</th><th>Value</th><th>Detail</th></tr></thead><tbody>{analysis.evidence.map(item=><tr key={item.id}><td><code>{item.id}</code></td><td>{item.label}</td><td>{item.value}</td><td>{item.detail}</td></tr>)}</tbody></table></div></details>
        </>}
      </section>

      <section className="evidence-stage" aria-labelledby="finding-stage">
        <div className="evidence-section-head"><div><span>03</span><div><p>INTERPRET</p><h2 id="finding-stage">Grounded findings</h2></div></div></div>
        {analysis&&<div className="evidence-form-grid">
          <label><span>Evidence reference</span><select data-testid="finding-evidence" value={findingEvidence} onChange={event=>setFindingEvidence(event.target.value)}><option value="">Select measured evidence</option>{analysis.evidence.map(item=><option key={item.id} value={item.id}>{item.label} · {item.value}</option>)}</select></label>
          <label><span>Finding title</span><input data-testid="finding-title" value={findingTitle} onChange={event=>setFindingTitle(event.target.value)} maxLength={160}/></label>
          <label className="wide"><span>Explanation</span><textarea data-testid="finding-explanation" value={findingExplanation} onChange={event=>setFindingExplanation(event.target.value)} maxLength={1_500}/></label>
          <button type="button" className="secondary-button" onClick={submitFinding}>Add finding</button>
        </div>}
        {!currentFindings.length?<p className="evidence-empty">No findings for this revision yet. The WebMCP review-plan action adds every finding only when it cites current evidence.</p>:<div className="evidence-finding-list">{currentFindings.map(item=><article key={item.id} data-testid="finding-card"><span>{item.id}</span><h3>{item.title}</h3><p>{item.explanation}</p><small>Evidence: {item.evidenceRefs.join(", ")}</small></article>)}</div>}
      </section>

      <section className="evidence-stage" aria-labelledby="patch-stage">
        <div className="evidence-section-head"><div><span>04</span><div><p>AGENT PLAN · HUMAN REVIEW</p><h2 id="patch-stage">Decision-ready diffs</h2></div></div><strong className="evidence-plan-count">{agentPlanPatches.length} / 3 required</strong></div>
        {analysis&&currentFindings.length>0&&<details className="evidence-manual-proposal"><summary>Manual single-patch fallback</summary><div className="evidence-form-grid patch-form">
          <label><span>Linked finding</span><select data-testid="patch-finding" value={patchFinding} onChange={event=>setPatchFinding(event.target.value)}><option value="">Select a finding</option>{currentFindings.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label><span>Exact text to replace</span><textarea data-testid="patch-expected" value={expectedText} onChange={event=>setExpectedText(event.target.value)} maxLength={10_000}/></label>
          <label><span>Replacement</span><textarea data-testid="patch-replacement" value={replacementText} onChange={event=>setReplacementText(event.target.value)} maxLength={10_000}/></label>
          <label><span>Rationale</span><textarea data-testid="patch-rationale" value={patchRationale} onChange={event=>setPatchRationale(event.target.value)} maxLength={1_000}/></label>
          <button type="button" className="secondary-button" onClick={submitPatch}>Propose patch</button>
        </div></details>}
        {!workspace.patches.length?<p className="evidence-empty">No review plan yet. Ask ChatGPT to submit 3–5 meaningful exact diffs. The agent cannot approve or apply them.</p>:<div className="evidence-patch-list">{[...workspace.patches].reverse().map(patch=>{const linkedFinding=workspace.findings.find(item=>patch.findingIds.includes(item.id));return <article key={patch.id} data-testid="patch-card" data-status={patch.status}>
          <div className="evidence-patch-head"><div><span>{patch.recommendationKind?`${patch.recommendationKind.toUpperCase()} · `:""}{patch.status.toUpperCase()}</span><h3>{linkedFinding?.title||"Manual text proposal"}</h3></div><small>{patch.id} · revision {patch.baseRevision}</small></div>
          <p>{patch.rationale}</p><PatchDiff patch={patch}/>
          {patch.status==="proposed"&&<div className="evidence-decision-actions"><button type="button" className="approve-button" onClick={()=>decide(patch.id,"approved")}>Approve patch</button><button type="button" className="reject-button" onClick={()=>decide(patch.id,"rejected")}>Reject</button></div>}
          {patch.status==="approved"&&<div className="evidence-decision-actions"><button type="button" className="apply-button" onClick={()=>apply(patch.id)}>Apply approved patch</button><small>Approval was recorded in the visible UI.</small></div>}
        </article>;})}</div>}
      </section>

      <section className="evidence-stage evidence-export" aria-labelledby="export-stage">
        <div className="evidence-section-head"><div><span>05</span><div><p>VERIFY · EXPORT</p><h2 id="export-stage">Before / after report</h2></div></div></div>
        <p>{analysis?"The report is bound to the current analyzed revision and includes every finding and patch decision.":"After any applied patch, analyze the new revision before exporting."}</p>
        <div><button type="button" className="secondary-button" disabled={!analysis} onClick={()=>download("markdown")}>Download Markdown</button><button type="button" className="secondary-button" disabled={!analysis} onClick={()=>download("json")}>Download JSON</button></div>
      </section>
    </>}
    {message&&<p className="evidence-message" role="status">{message}</p>}
    {error&&<p className="evidence-error" role="alert">{error}</p>}
  </section>;
}
