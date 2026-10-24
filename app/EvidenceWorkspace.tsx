"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
  addFinding,analyzeWorkspace,applyApprovedPatch,createAnalysisWorkspace,decidePatch,
  exportWorkspaceReport,proposeTextPatch,restoreWorkspace,submitReviewPlan,undoLastAppliedPatch,WorkspaceError,
  type EvidenceWorkspaceState,type WorkspacePatch,type WorkspaceReviewItem,
} from "./lib/evidence-workspace";
import {DEFAULT_REWRITE_GOAL,REWRITE_EXAMPLE} from "./lib/rewrite-example";
import {registerEvidenceWorkspaceTools,type EvidenceWorkspaceActions} from "./lib/evidence-webmcp";

const WORKSPACE_STORAGE_KEY="textanalysis-evidence-workspace-v2";
const REWRITE_STORAGE_KEY="textanalysis-rewrite-review-v1";
const AGENT_MISSION="Use this page’s WebMCP tools. Analyze the current workspace, then submit one complete review plan with 3–5 evidence-linked exact patches. Include at least one structural or clarity improvement and one trust or verification improvement when claim risks exist. Use at most one cleanup item. Do not apply anything; stop for my approval.";

declare global{
  interface Document{modelContext?:{registerTool:(tool:unknown)=>void|Promise<void>}}
  interface Window{
    __evidenceWorkspaceActions?:EvidenceWorkspaceActions;
    __evidenceWorkspaceToolsRegistered?:boolean;
  }
}

function activeWorkspaceActions(){
  const actions=window.__evidenceWorkspaceActions;
  if(!actions)throw new WorkspaceError("WORKSPACE_INACTIVE","Open Evidence Workspace or Rewrite Review before using its page tools.");
  return actions;
}

function formatDelta(value:number,digits=0){
  const formatted=value.toFixed(digits);
  return value>0?`+${formatted}`:formatted;
}

function ReviewEvidence({item}:{item:WorkspaceReviewItem}){
  return <div className="evidence-review-detail"><p>{item.detail}</p>
    {(item.baselineExcerpts?.length||item.currentExcerpts?.length)?<dl className="evidence-review-excerpts">
      {item.baselineExcerpts&&<div><dt>Original</dt><dd>{item.baselineExcerpts.join("\n")||"No exact match in the original."}</dd></div>}
      {item.currentExcerpts&&<div><dt>Rewrite</dt><dd>{item.currentExcerpts.join("\n")||"No exact match in the rewrite."}</dd></div>}
    </dl>:null}
  </div>;
}

function PatchDiff({patch}:{patch:WorkspacePatch}){
  return <div className="evidence-diff" aria-label="Proposed text change">
    <div><span>REMOVE</span><del>{patch.expectedText}</del></div>
    <div><span>ADD</span><ins>{patch.replacementText||"(delete without replacement)"}</ins></div>
  </div>;
}

export default function EvidenceWorkspace({experience="workspace"}:{experience?:"workspace"|"rewrite"}){
  const isRewrite=experience==="rewrite";
  const storageKey=isRewrite?REWRITE_STORAGE_KEY:WORKSPACE_STORAGE_KEY;
  const [originalText,setOriginalText]=useState("");
  const [currentVersion,setCurrentVersion]=useState("");
  const [goal,setGoal]=useState(DEFAULT_REWRITE_GOAL);
  const [focusInput,setFocusInput]=useState("");
  const [workspace,setWorkspace]=useState<EvidenceWorkspaceState|null>(null);
  const workspaceRef=useRef<EvidenceWorkspaceState|null>(null);
  const originalInputRef=useRef<HTMLTextAreaElement>(null);
  const resultHeadingRef=useRef<HTMLHeadingElement>(null);
  const [storageWarning,setStorageWarning]=useState("");
  const [entryNotice,setEntryNotice]=useState<"example"|"own"|null>(null);
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
    if(workspaceRef.current?.id!==next.id)setEntryNotice(null);
    if(workspaceRef.current?.id!==next.id||workspaceRef.current?.revision!==next.revision){
      setFindingEvidence("");setFindingTitle("");setFindingExplanation("");setPatchFinding("");setExpectedText("");setReplacementText("");setPatchRationale("");
    }
    workspaceRef.current=next;
    setWorkspace(next);
    try{sessionStorage.setItem(storageKey,JSON.stringify(next));setStorageWarning("");}
    catch{setStorageWarning("This browser could not save the review in this tab. You can still compare texts and download a report.");}
    return next;
  },[storageKey]);

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
    return ()=>{if(window.__evidenceWorkspaceActions===actions)delete window.__evidenceWorkspaceActions;};
  },[actions]);

  useEffect(()=>{
    queueMicrotask(()=>{
      let restored:EvidenceWorkspaceState|null=null;
      try{
        const stored=sessionStorage.getItem(storageKey);
        if(stored)restored=restoreWorkspace(JSON.parse(stored));
      }catch{
        try{sessionStorage.removeItem(storageKey);}catch{/* Storage may be disabled. */}
      }
      const entry=new URLSearchParams(window.location.search);
      if(restored){
        commit(restored);
        const untouchedExample=restored.originalText===REWRITE_EXAMPLE.originalText&&restored.currentText===REWRITE_EXAMPLE.currentText&&!restored.findings.length&&!restored.patches.length;
        if(entry.get("example")==="rewrite"&&!untouchedExample)setEntryNotice("example");
        else if(entry.get("mode")==="own")setEntryNotice("own");setMessage("Restored your saved review. Continue it, or use Edit these texts to run a fresh comparison with the current checks.");
      }else if(new URLSearchParams(window.location.search).get("example")==="rewrite"){
        commit(analyzeWorkspace(createAnalysisWorkspace(REWRITE_EXAMPLE)));
        setMessage("Example loaded: review the changed price, missing billing condition, and lost product term below.");
      }
    });
    const modelContext=document.modelContext;
    if(!modelContext){queueMicrotask(()=>setWebMcpStatus("fallback"));return;}
    if(window.__evidenceWorkspaceToolsRegistered){queueMicrotask(()=>setWebMcpStatus("ready"));return;}
    const proxy:EvidenceWorkspaceActions={
      create:input=>activeWorkspaceActions().create(input),
      analyze:()=>activeWorkspaceActions().analyze(),
      submitReviewPlan:input=>activeWorkspaceActions().submitReviewPlan(input),
      applyPatch:input=>activeWorkspaceActions().applyPatch(input),
      exportReport:format=>activeWorkspaceActions().exportReport(format),
    };
    window.__evidenceWorkspaceToolsRegistered=true;
    registerEvidenceWorkspaceTools(modelContext,proxy).then(()=>{
      setWebMcpStatus("ready");
    }).catch(()=>{window.__evidenceWorkspaceToolsRegistered=false;setWebMcpStatus("error");});
  },[commit,storageKey]);

  const run=(work:()=>void,success:string)=>{
    try{work();setMessage(success);setError("");}
    catch(reason){setError(reason instanceof Error?reason.message:"The action could not be completed.");setMessage("");}
  };

  const focusResults=()=>requestAnimationFrame(()=>resultHeadingRef.current?.focus());
  const compare=()=>run(()=>{
    if(!currentVersion.trim())throw new Error("Paste the rewritten text so the two versions can be compared.");
    commit(analyzeWorkspace(createAnalysisWorkspace({originalText,currentText:currentVersion,goal:goal.trim()||DEFAULT_REWRITE_GOAL,focusTerms:focusInput})));
    focusResults();
  },"Comparison ready. Review the changes, then download your report. No text has been edited.");

  const create=()=>run(()=>commit(createAnalysisWorkspace({originalText,currentText:currentVersion||undefined,goal:goal.trim()||DEFAULT_REWRITE_GOAL,focusTerms:focusInput})),"Workspace created. Build the review next.");
  const loadExample=()=>run(()=>{
    commit(analyzeWorkspace(createAnalysisWorkspace(REWRITE_EXAMPLE)));focusResults();
  },"Fictional example loaded. The price, billing condition, and data export term need review.");
  const analyze=()=>run(()=>{commit(analyzeWorkspace(requireWorkspace()));focusResults();},"Review ready for the current revision. Check the flagged changes before exporting.");

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
  },item.patchCandidate?"Note and proposed edit added. Review the change and choose Approve or Reject.":"Evidence note saved. The text has not changed.");

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

  const startDraft=(keepTexts=false)=>{
    const active=workspaceRef.current;
    setOriginalText(keepTexts?active?.originalText||"":"");
    setCurrentVersion(keepTexts?active?.currentText||"":"");
    setGoal(keepTexts?active?.goal||DEFAULT_REWRITE_GOAL:DEFAULT_REWRITE_GOAL);
    setFocusInput(keepTexts?active?.focusTerms.join(", ")||"":"");
    try{sessionStorage.removeItem(storageKey);}catch{/* Comparison also works without storage. */}
    workspaceRef.current=null;setWorkspace(null);setError("");setEntryNotice(null);setStorageWarning("");
    setFindingEvidence("");setFindingTitle("");setFindingExplanation("");setPatchFinding("");setExpectedText("");setReplacementText("");setPatchRationale("");
    setMessage(keepTexts?"Edit either text, then compare again. Previous notes and approvals have been cleared.":"Paste your original and rewritten text to start a new review.");
    // The URL is an entry hint, not saved document state. A reload should not reopen the example.
    window.history.replaceState(null,"",window.location.pathname);
    requestAnimationFrame(()=>originalInputRef.current?.focus());
  };

  const analysis=workspace?.analysis&&workspace.analysis.revision===workspace.revision?workspace.analysis:null;
  const currentFindings=workspace?.findings.filter(item=>item.revision===workspace.revision)||[];
  const queuedFindingTitles=new Set(currentFindings.map(item=>item.title));
  const highPriorityCount=analysis?.reviewQueue.filter(item=>item.priority==="high").length||0;
  const substantiveReviewItems=analysis?.reviewQueue.filter(item=>item.category!=="duplicate")||[];
  const cleanupReviewItems=analysis?.reviewQueue.filter(item=>item.category==="duplicate")||[];
  const agentPlanPatches=workspace?.patches.filter(item=>item.baseRevision===workspace.revision&&item.recommendationKind)||[];
  const agentPlanReady=agentPlanPatches.length>=3;
  const isExample=workspace?.originalText===REWRITE_EXAMPLE.originalText&&workspace?.goal===REWRITE_EXAMPLE.goal;

  return <section className="evidence-workspace" data-testid="evidence-workspace" data-experience={experience}>
    {!isRewrite&&<span className="evidence-support-state" data-testid="webmcp-status" data-status={webMcpStatus}>Optional agent tools: {webMcpStatus==="ready"?"connected":"manual controls available"}</span>}
    {message&&<p className="evidence-message" role="status">{message}</p>}
    <ol className="evidence-journey" aria-label="Review steps"><li>Original text</li><li>Rewritten version</li><li>Changes to review</li><li>Download report</li></ol>
    {entryNotice&&<aside className="evidence-saved-notice" data-testid="saved-review-notice" aria-label="Saved review">
      <p><strong>Your saved review is open.</strong> {entryNotice==="example"?"Your example link has kept it intact. Load the example when you are ready to replace this review.":"Your own-text link has kept it intact. Start a new comparison when you are ready to replace this review."} Download a report first if you want to keep a copy.</p>
      <button type="button" className="secondary-button" onClick={entryNotice==="example"?loadExample:()=>startDraft()}>{entryNotice==="example"?"Load the example instead":"Start a new comparison"}</button>
    </aside>}
    {!workspace?<div className="evidence-setup">
      <div className="evidence-section-head"><div><span>01</span><div><p>COMPARE TWO VERSIONS</p><h2>What changed after the rewrite?</h2></div></div><button type="button" className="secondary-button" onClick={loadExample}>Load example</button></div>
      <p className="evidence-intro">Paste both versions to spot changed claims, missing conditions, and terms you want to keep. Your text stays in this browser.</p>
      <div className="evidence-source-grid">
        <label><span>Original text · before rewriting</span><textarea ref={originalInputRef} data-testid="original-text" value={originalText} onChange={event=>setOriginalText(event.target.value)} maxLength={100_000} placeholder="Paste the original text here."/><small>{originalText.length.toLocaleString()} / 100,000 characters</small></label>
        <label><span>Rewritten text · after rewriting</span><textarea data-testid="current-version-input" value={currentVersion} onChange={event=>setCurrentVersion(event.target.value)} maxLength={100_000} placeholder="Paste the rewritten version here."/><small>{currentVersion.length.toLocaleString()} / 100,000 characters</small></label>
      </div>
      <div className="evidence-compare-options">
        <label><span>Important terms to keep · optional</span><input data-testid="focus-terms" value={focusInput} onChange={event=>setFocusInput(event.target.value)} placeholder="data export, annual billing"/><small>Separate exact words or phrases with commas. Missing terms will be flagged.</small></label>
        <button type="button" className="analyze-button" onClick={compare}>Compare texts <span aria-hidden="true">→</span></button>
      </div>
      {!isRewrite&&<details className="evidence-advanced"><summary>Review goal and single-text workspace</summary><div className="evidence-goal-grid">
        <label><span>Review goal</span><textarea data-testid="workspace-goal" value={goal} onChange={event=>setGoal(event.target.value)} maxLength={500}/></label>
        <p>For editing one text, leave the rewritten version empty and create a workspace. You can propose and approve changes after building a review.</p>
        <button type="button" className="secondary-button" onClick={create}>Create workspace</button>
      </div></details>}
    </div>:<>
      <div className="evidence-workspace-bar">
        <div><p>{isExample?"FICTIONAL EXAMPLE · PRODUCT COPY":"YOUR TEXT REVIEW"}</p><h2>Revision <span data-testid="workspace-revision">{workspace.revision}</span></h2></div>
        <div><button type="button" className="secondary-button" onClick={()=>startDraft()}>Compare my texts</button><button type="button" className="secondary-button" onClick={()=>startDraft(true)}>Edit these texts</button><button type="button" className="secondary-button" onClick={loadExample}>Load example</button></div>
      </div>
      {isExample&&<p className="evidence-example-note">{workspace.currentText===REWRITE_EXAMPLE.currentText?"This fictional rewrite changed $29 to $19, dropped the annual billing condition, and lost “data export”. Review each change below, then try your own texts.":"This is fictional product copy. You have edited the example; review the current revision below."}</p>}
      <div className="evidence-document-grid">
        <label><span>Original text · baseline</span><textarea readOnly value={workspace.originalText}/></label>
        <label><span>Rewritten text · current revision</span><textarea data-testid="current-text" readOnly value={workspace.currentText}/></label>
      </div>

      <section className="evidence-stage" aria-labelledby="analysis-stage">
        <div className="evidence-section-head"><div><span>02</span><div><p>CHECK BEFORE SHARING</p><h2 ref={resultHeadingRef} tabIndex={-1} id="analysis-stage">Changes to review</h2></div></div><button type="button" className="analyze-button compact" onClick={analyze}>{analysis?"Refresh review":"Build review"}</button></div>
        {!analysis?<p className="evidence-empty">This revision has not been analyzed yet. Findings and patches remain locked until measurements exist.</p>:<>

          <p className="evidence-intro">{isRewrite?<>Compare each <strong>Original</strong> and <strong>Rewrite</strong> pair. <strong>HIGH / MEDIUM / LOW</strong> indicate review priority. <strong>No exact match</strong> means the wording was not found; the meaning may still be present. Check claims against your source.</>:"These are text changes to check, not a fact check. A removed phrase may have been reworded. Compare the excerpts and verify claims against your source."}</p>
          <div className="evidence-subsection-head"><div><span>EVIDENCE QUEUE</span><h3>Check these changes</h3></div><small>Evidence-bound · no automatic edits</small></div>
          {!substantiveReviewItems.length?<p className="evidence-empty">No supported patterns were flagged. Check the version excerpts too; this does not prove that every meaning or fact was preserved.</p>:<div className="evidence-review-list" data-testid="review-queue">{substantiveReviewItems.map(item=>{
            const queued=queuedFindingTitles.has(item.title);
            return <article key={item.id} data-priority={item.priority} data-testid="review-item"><div><span>{item.priority.toUpperCase()} · {item.category.replaceAll("_"," ")}</span><h3>{item.title}</h3></div><ReviewEvidence item={item}/><button type="button" className="secondary-button" disabled={queued} onClick={()=>queueReviewItem(item)}>{queued?"Note added":"Add evidence note"}</button></article>;
          })}</div>}

          <div className="evidence-change-samples">
            <div><span>ADDED OR REWRITTEN</span>{analysis.changeMap.addedSamples.length?<ul>{analysis.changeMap.addedSamples.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>No unmatched current blocks.</p>}</div>
            <div><span>REMOVED OR REWRITTEN</span>{analysis.changeMap.removedSamples.length?<ul>{analysis.changeMap.removedSamples.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>No unmatched baseline blocks.</p>}</div>
          </div>

          {cleanupReviewItems.length>0&&<details className="evidence-cleanup"><summary>Quick cleanup · {cleanupReviewItems.length} exact duplicate{cleanupReviewItems.length===1?"":"s"}</summary><div className="evidence-review-list">{cleanupReviewItems.map(item=>{
            const queued=queuedFindingTitles.has(item.title);
            return <article key={item.id} data-priority="low" data-testid="review-item"><div><span>LOW · CLEANUP</span><h3>{item.title}</h3></div><ReviewEvidence item={item}/><button type="button" className="secondary-button" disabled={queued} onClick={()=>queueReviewItem(item)}>{queued?"Queued":"Queue exact patch"}</button></article>;
          })}</div></details>}

          <details className="evidence-advanced evidence-measurements"><summary>Inspect measurements and commercial claims</summary>
          <div className="evidence-metrics" data-testid="analysis-metrics">
            <div><span>WORDS</span><strong>{analysis.current.tokenCount}</strong><small>{formatDelta(analysis.changeMap.wordDelta)} · {formatDelta(analysis.changeMap.wordDeltaPercent,1)}%</small></div>
            <div><span>EXACT BLOCKS</span><strong>{analysis.changeMap.retainedBlocks}</strong><small>{analysis.changeMap.addedBlocks} added · {analysis.changeMap.removedBlocks} removed</small></div>
            <div><span>REVIEW NOTES</span><strong>{currentFindings.length}</strong><small>recorded for this revision</small></div>
            <div><span>HIGH PRIORITY</span><strong>{highPriorityCount}</strong><small>{analysis.reviewQueue.length} total review items</small></div>
          </div>

          <div className="evidence-subsection-head"><div><span>COMMERCIAL CLAIM LEDGER</span><h3>What changed and what needs verification</h3></div><small>Exact text matching; unmatched does not mean false</small></div>
          {!analysis.claimSummary.length?<p className="evidence-empty">No supported commercial claim patterns were detected.</p>:<div className="evidence-table-wrap" tabIndex={0} role="region" aria-label="Scrollable evidence table"><table className="evidence-table evidence-claim-table" data-testid="claim-ledger"><thead><tr><th>Claim type</th><th>Baseline</th><th>Current</th><th>Exact retained</th><th>Current only</th><th>Baseline only</th></tr></thead><tbody>{analysis.claimSummary.map(item=><tr key={item.category}><td>{item.label}</td><td>{item.baseline}</td><td>{item.current}</td><td>{item.retained}</td><td>{item.currentOnly}</td><td>{item.baselineOnly}</td></tr>)}</tbody></table></div>}

          <details className="evidence-raw"><summary>Inspect {analysis.evidence.length} raw evidence references</summary><div className="evidence-table-wrap" tabIndex={0} role="region" aria-label="Scrollable evidence table"><table className="evidence-table"><thead><tr><th>Evidence ID</th><th>Measured fact</th><th>Value</th><th>Detail</th></tr></thead><tbody>{analysis.evidence.map(item=><tr key={item.id}><td><code>{item.id}</code></td><td>{item.label}</td><td>{item.value}</td><td>{item.detail}</td></tr>)}</tbody></table></div></details>
          </details>
          {!isRewrite&&<details className="evidence-advanced"><summary>Work with an AI agent · optional</summary>
            <div className="evidence-capability" data-status={webMcpStatus}>
              <div><span className="evidence-status-dot"/><strong>{webMcpStatus==="ready"?"WebMCP tools ready":webMcpStatus==="checking"?"Checking WebMCP support":webMcpStatus==="error"?"WebMCP registration failed":"Manual workspace ready"}</strong></div>
              <p>{webMcpStatus==="ready"?"An agent can use five page tools to propose edits. You control every approval.":"Use the visible controls to compare, review, propose edits, approve, and export. WebMCP support is optional."}</p>
            </div>
          <div className="evidence-agent-mission" data-status={agentPlanReady?"ready":"waiting"} data-testid="agent-mission">
            <div><span>{agentPlanReady?"AGENT PLAN READY":"NEXT WEBMCP ACTION"}</span><h3>{agentPlanReady?`${agentPlanPatches.length} meaningful diffs ready for review`:"Ask the agent for decisions, not more diagnostics"}</h3><p>{agentPlanReady?"Review the structure, clarity, and trust proposals below. Nothing has changed in the source text.":"The deterministic layer has supplied evidence. ChatGPT must now submit 3–5 exact proposals, with at most one simple cleanup."}</p></div>
            <div><code>{AGENT_MISSION}</code><button type="button" className="secondary-button" onClick={copyAgentMission}>Copy agent mission</button></div>
          </div>
          </details>}
        </>}
      </section>

      <section className="evidence-stage evidence-export" aria-labelledby="export-stage">
        <div className="evidence-section-head"><div><span>03</span><div><p>VERIFY · EXPORT</p><h2 id="export-stage">Before / after report</h2></div></div></div>
        <p>{analysis?(isRewrite?"Markdown gives a readable report; JSON gives structured data. Both include all flagged changes, your notes, and edit decisions. You can download without editing the text.":"Save the changed excerpts, flagged omissions, term coverage, review notes, and edit decisions. You can export without proposing any edits."):(isRewrite?"Select Build review above to analyze the current revision before downloading the updated report.":"After any applied patch, analyze the new revision before exporting.")}</p>
        <div><button type="button" className="secondary-button" disabled={!analysis} onClick={()=>download("markdown")}>Download Markdown</button><button type="button" className="secondary-button" disabled={!analysis} onClick={()=>download("json")}>Download JSON</button></div>
      </section>

      <section className="evidence-stage" aria-labelledby="finding-stage">
        <div className="evidence-section-head"><div><span>04</span><div><p>YOUR REVIEW</p><h2 id="finding-stage">Your evidence notes</h2></div></div></div>
        {analysis&&<details className="evidence-advanced"><summary>Add your own evidence-linked note</summary><div className="evidence-form-grid">
          <label><span>Evidence reference</span><select data-testid="finding-evidence" value={findingEvidence} onChange={event=>setFindingEvidence(event.target.value)}><option value="">Select measured evidence</option>{analysis.evidence.map(item=><option key={item.id} value={item.id}>{item.label} · {item.value}</option>)}</select></label>
          <label><span>Finding title</span><input data-testid="finding-title" value={findingTitle} onChange={event=>setFindingTitle(event.target.value)} maxLength={160}/></label>
          <label className="wide"><span>Explanation</span><textarea data-testid="finding-explanation" value={findingExplanation} onChange={event=>setFindingExplanation(event.target.value)} maxLength={1_500}/></label>
          <button type="button" className="secondary-button" onClick={submitFinding}>Add finding</button>
        </div></details>}
        {!currentFindings.length?<p className="evidence-empty">{isRewrite?"“Add evidence note” saves a flag in Your evidence notes without changing the text. The report already includes every flagged change.":"Use “Add evidence note” on a change above to include your review notes here and in the report."}</p>:<div className="evidence-finding-list">{currentFindings.map(item=><article key={item.id} data-testid="finding-card"><span>{item.id}</span><h3>{item.title}</h3><p>{item.explanation}</p><small>Evidence: {item.evidenceRefs.join(", ")}</small></article>)}</div>}
      </section>

      <section className="evidence-stage" aria-labelledby="patch-stage">
        <div className="evidence-section-head"><div><span>05</span><div><p>OPTIONAL EDITS · HUMAN REVIEW</p><h2 id="patch-stage">Review proposed edits</h2></div></div><button type="button" className="secondary-button" onClick={undo} disabled={workspace.history.at(-1)?.event!=="patch_applied"}>Undo last apply</button></div>
        {analysis&&currentFindings.length>0&&<details className="evidence-manual-proposal"><summary>Propose an exact edit</summary><div className="evidence-form-grid patch-form">
          <label><span>Linked finding</span><select data-testid="patch-finding" value={patchFinding} onChange={event=>setPatchFinding(event.target.value)}><option value="">Select a finding</option>{currentFindings.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label><span>Exact text to replace</span><textarea data-testid="patch-expected" value={expectedText} onChange={event=>setExpectedText(event.target.value)} maxLength={10_000}/></label>
          <label><span>Replacement</span><textarea data-testid="patch-replacement" value={replacementText} onChange={event=>setReplacementText(event.target.value)} maxLength={10_000}/></label>
          <label><span>Rationale</span><textarea data-testid="patch-rationale" value={patchRationale} onChange={event=>setPatchRationale(event.target.value)} maxLength={1_000}/></label>
          <button type="button" className="secondary-button" onClick={submitPatch}>Propose patch</button>
        </div></details>}
        {!workspace.patches.length?<p className="evidence-empty">{isRewrite?"No edits proposed. Add a note, then open “Propose an exact edit”. Review the replacement, choose “Approve patch”, then “Apply approved patch”. Select “Build review” afterward to update the report.":"No edits proposed. Add an evidence note, then propose an exact edit here. Every edit needs your approval before it can be applied."}</p>:<div className="evidence-patch-list">{[...workspace.patches].reverse().map(patch=>{const linkedFinding=workspace.findings.find(item=>patch.findingIds.includes(item.id));return <article key={patch.id} data-testid="patch-card" data-status={patch.status}>
          <div className="evidence-patch-head"><div><span>{patch.recommendationKind?`${patch.recommendationKind.toUpperCase()} · `:""}{patch.status.toUpperCase()}</span><h3>{linkedFinding?.title||"Manual text proposal"}</h3></div><small>{patch.id} · revision {patch.baseRevision}</small></div>
          <p>{patch.rationale}</p><PatchDiff patch={patch}/>
          {patch.status==="proposed"&&<div className="evidence-decision-actions"><button type="button" className="approve-button" onClick={()=>decide(patch.id,"approved")}>Approve patch</button><button type="button" className="reject-button" onClick={()=>decide(patch.id,"rejected")}>Reject</button></div>}
          {patch.status==="approved"&&<div className="evidence-decision-actions"><button type="button" className="apply-button" onClick={()=>apply(patch.id)}>Apply approved patch</button><small>Approval was recorded in the visible UI.</small></div>}
        </article>;})}</div>}
      </section>


    </>}
    {storageWarning&&<p className="evidence-example-note" role="status">{storageWarning}</p>}
    {error&&<p className="evidence-error" role="alert">{error}</p>}
  </section>;
}
