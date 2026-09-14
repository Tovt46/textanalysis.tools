"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {
  MAX_TEXT_CONTRACT_BRIEF_CHARS,
  MAX_TEXT_CONTRACT_SOURCE_CHARS,
  isApproved,
  sameContract,
  finalStatus,
  uncertainEvaluation,
  contractSummary,
  exportAgentRun,
  type AgentFinalStatus,
  type AgentRun,
  type ContractRule,
  type GeneratedAttempt,
  type ModelUsage,
  type RuleEvaluation,
  type TextContract,
  type TextContractLanguage,
} from "./lib/text-contract";

const STORAGE_KEY="textanalysis-text-contract-v2";
import TextContractDiff from "./TextContractDiff";
import {compileResultSchema,generateResultSchema,evaluateResultSchema,storedWorkspaceSchema} from "./lib/text-contract-schema";
const SAMPLE_SOURCE=`<article>
  <h1>Calmly Premium</h1>
  <p>Calmly Premium costs $5.99 per month and may help teams keep editorial reviews organized.</p>
  <p>You can request a 30-day refund under the current <a href="https://example.com/refunds">refund policy</a>.</p>
  <p>Read our <a href="/method">method</a>, <a href="/privacy">privacy policy</a>, <a href="/support">support guide</a>, and <a href="/terms">terms</a>.</p>
  <a class="primary-cta" href="https://example.com/start" data-plan="premium">Start for $5.99</a>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>
</article>`;
const SAMPLE_BRIEF="Make the copy shorter and more natural. Preserve the price, refund period, links, CTA attributes, and FAQ schema. Keep ‘may help’ cautious; do not turn it into a guarantee or invent product capabilities.";

type Phase="idle"|"compiling"|"contract"|"generating"|"evaluating"|"repairing"|"rechecking"|"complete"|"blocked";
type StoredWorkspace={source:string;brief:string;outputLanguage:TextContractLanguage;domains:string;contract:TextContract|null;compileUsage:ModelUsage[];run:AgentRun|null;manualCandidate:string};
type ApiEnvelope<T>={result:T;error?:{code:string;message:string}};

function phaseLabel(phase:Phase,count=0){
  if(phase==="compiling")return"Compiling contract";
  if(phase==="contract")return"Waiting for contract approval";
  if(phase==="generating")return"Generating Draft 1";
  if(phase==="evaluating")return`Checking ${count} rules`;
  if(phase==="repairing")return"Repairing detected violations";
  if(phase==="rechecking")return"Rechecking repaired output";
  if(phase==="complete")return"Agent run complete";
  if(phase==="blocked")return"Agent run stopped safely";
  return"Ready for source and brief";
}

async function requestJson<T>(url:string,body:unknown,schema:{parse:(input:unknown)=>T},signal:AbortSignal):Promise<T>{
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(90_000)])});
  const payload=await response.json().catch(()=>null) as ApiEnvelope<T>|null;
  if(!response.ok)throw new Error(payload?.error?.message||"This step could not complete. Try again.");
  try{return schema.parse(payload?.result);}catch{throw new Error("The server returned an invalid TextContract response. No result was approved.");}
}
function blockedEvaluations(contract:TextContract,reason:string){return contract.rules.filter(rule=>rule.enabled).map(rule=>uncertainEvaluation(rule,reason));}
function statusLabel(status:AgentFinalStatus){return status.replace("_"," ");}
function ruleValueLabel(rule:ContractRule){
  if(rule.kind==="url")return"Destination to preserve";
  if(rule.kind==="numeric_value")return"Exact value to preserve";
  if(rule.kind==="exact_text")return rule.expectation==="forbid"?"Forbidden exact phrase":"Exact phrase to preserve";
  return"Executable value";
}
function deterministicRuleEdit(rule:ContractRule,value:string):Partial<ContractRule>{
  if(rule.kind==="numeric_value")return{expectedValue:value,statement:`Preserve the exact value ${value}.`};
  if(rule.kind==="url")return{expectedValue:value,statement:`Preserve the destination ${value}.`};
  if(rule.kind==="exact_text")return{expectedValue:value,statement:rule.expectation==="forbid"?`Do not use the exact phrase “${value}”.`:`Preserve the exact phrase “${value}”.`};
  return{expectedValue:value};
}

export default function TextContractAgent(){
  const [source,setSource]=useState("");
  const [brief,setBrief]=useState("");
  const [outputLanguage,setOutputLanguage]=useState<TextContractLanguage>("same");
  const [domains,setDomains]=useState("");
  const [contract,setContract]=useState<TextContract|null>(null);
  const [compileUsage,setCompileUsage]=useState<ModelUsage[]>([]);
  const [run,setRun]=useState<AgentRun|null>(null);
  const [manualCandidate,setManualCandidate]=useState("");
  const [phase,setPhase]=useState<Phase>("idle");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [hydrated,setHydrated]=useState(false);

  const operation=useRef<{id:number;controller:AbortController}|null>(null);
  const nextId=useRef(0);
  const begin=()=>{
    if(operation.current)return null;
    const current={id:++nextId.current,controller:new AbortController()};
    operation.current=current;return current;
  };
  const active=(id:number)=>operation.current?.id===id;
  const finish=(id:number)=>{if(active(id))operation.current=null;};
  const cancel=()=>{
    operation.current?.controller.abort();operation.current=null;
    setPhase("blocked");setMessage("Stopped. Completed attempts remain in this tab; no incomplete check is accepted.");setError("");
  };
  useEffect(()=>{
    queueMicrotask(()=>{
      try{
        const raw=sessionStorage.getItem(STORAGE_KEY);
        const legacy=raw??sessionStorage.getItem("textanalysis-text-contract-v1");
        if(legacy){
          const parsed:unknown=JSON.parse(legacy),checked=storedWorkspaceSchema.safeParse(parsed);
          if(checked.success){
            const saved=checked.data;
            setSource(saved.source);setBrief(saved.brief);setOutputLanguage(saved.outputLanguage);setDomains(saved.domains);
            setContract(saved.contract);setCompileUsage(saved.compileUsage);setRun(saved.run);setManualCandidate(saved.manualCandidate);
            setPhase(saved.run?"complete":saved.contract?"contract":"idle");setMessage("Restored this tab, including the latest manual edit.");
          }else{
            const old=parsed&&typeof parsed==="object"?parsed as Partial<StoredWorkspace>:{};
            setSource(typeof old.source==="string"?old.source.slice(0,30_000):"");setBrief(typeof old.brief==="string"?old.brief.slice(0,2_000):"");
            setMessage("Recovered the source and brief from an older or invalid workspace. Build and approve a new contract; old results are not trusted.");
          }
        }
      }catch{setMessage("Stored workspace could not be read. Start a new contract.");}
      setHydrated(true);
    });
    return()=>{operation.current?.controller.abort();operation.current=null;};
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    const workspace:StoredWorkspace={source,brief,outputLanguage,domains,contract,compileUsage,run,manualCandidate};
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));}catch{queueMicrotask(()=>setError("Browser storage is unavailable or full. Keep this tab open and download your report before leaving."));}
  },[brief,compileUsage,contract,domains,hydrated,manualCandidate,outputLanguage,run,source]);
  const busy=["compiling","generating","evaluating","repairing","rechecking"].includes(phase);
  const enabledRules=contract?.rules.filter(rule=>rule.enabled)||[];
  const resultSummary=useMemo(()=>run?contractSummary(run.contract,run.evaluations):null,[run]);
  const usage=run?.modelUsage||compileUsage;
  const candidateDirty=Boolean(run&&manualCandidate!==run.finalCandidate);
  const currentRun=Boolean(run&&contract&&isApproved(contract)&&sameContract(contract,run.contract));
  const canAccept=Boolean(currentRun&&!busy&&!candidateDirty&&run?.finalStatus==="READY");
  const clearDerived=()=>{operation.current?.controller.abort();operation.current=null;setContract(null);setCompileUsage([]);setRun(null);setManualCandidate("");setPhase("idle");setError("");setMessage("");};
  const loadExample=()=>{if(operation.current)return;setSource(SAMPLE_SOURCE);setBrief(SAMPLE_BRIEF);setOutputLanguage("same");setDomains("example.com");clearDerived();};
  const reset=()=>{if(operation.current)return;try{sessionStorage.removeItem(STORAGE_KEY);sessionStorage.removeItem("textanalysis-text-contract-v1");}catch{}setSource("");setBrief("");setOutputLanguage("same");setDomains("");clearDerived();setMessage("Workspace cleared from this tab.");};
  const buildContract=async()=>{
    const op=begin();if(!op)return;
    setPhase("compiling");setError("");setMessage("");setRun(null);
    try{
      const result=await requestJson("/api/text-contract/compile",{source,brief,outputLanguage,sourceOfTruthDomains:domains},compileResultSchema,op.controller.signal);
      if(!active(op.id))return;
      if(result.contract.source!==source||result.contract.brief!==brief||result.contract.outputLanguage!==outputLanguage)throw new Error("The compiled contract belongs to a different source. Please rebuild.");
      setContract(result.contract);setCompileUsage(result.usage);setPhase("contract");setMessage("Review the complete source safeguards and semantic rules, then approve this revision.");
    }catch(reason){if(active(op.id)){setPhase("blocked");setError(reason instanceof Error?reason.message:"Compilation failed safely.");}}finally{finish(op.id);}
  };
  const updateRule=(ruleId:string,changes:Partial<ContractRule>)=>{
    if(operation.current)return;
    setContract(current=>current?{...current,revision:current.revision+1,approvedAt:undefined,approvedRevision:undefined,rules:current.rules.map(rule=>rule.id===ruleId?{...rule,...changes}:rule)}:current);
    setRun(null);setManualCandidate("");setPhase("contract");setMessage("Contract changed. Approve this new revision before running.");
  };
  const approveContract=()=>{
    if(operation.current||!contract)return;
    const candidate={...contract,approvedAt:new Date().toISOString(),approvedRevision:contract.revision};
    const valid=compileResultSchema.safeParse({contract:candidate,usage:compileUsage});
    if(!valid.success||!candidate.rules.some(rule=>rule.enabled)){setError("Every enabled rule needs a valid value; required source guards must stay on.");return;}
    setContract(candidate);setError("");setMessage("This exact revision is approved. The agent may create one draft and at most one repair.");
  };
  const runAgent=async()=>{
    if(!contract||!isApproved(contract))return;
    const op=begin();if(!op)return;
    let attempts:GeneratedAttempt[]=[];const modelUsage=[...compileUsage];
    const checkpoint=(status:AgentFinalStatus,evaluations:RuleEvaluation[])=>{
      if(!active(op.id)||!attempts.length)return;
      const candidate=attempts.at(-1)!.content;
      setRun({contract,attempts:[...attempts],finalCandidate:candidate,finalStatus:status,evaluations,modelUsage:[...modelUsage]});setManualCandidate(candidate);
    };
    setRun(null);setError("");setMessage("");setPhase("generating");
    try{
      for(const kind of ["draft","repair"] as const){
        const previous=attempts.at(-1);
        const generated=await requestJson("/api/text-contract/generate",{source,brief,outputLanguage,contract,mode:kind,attemptNumber:kind==="draft"?1:2,...(previous?{previousCandidate:previous.content,failures:previous.evaluations?.filter(item=>item.status==="fail").map(item=>({ruleId:item.ruleId,explanation:item.explanation}))}:{})},generateResultSchema,op.controller.signal);
        if(!active(op.id))return;
        if(generated.attempt.kind!==kind||generated.attempt.number!==(kind==="draft"?1:2))throw new Error("The returned attempt does not match this run.");
        const pending=blockedEvaluations(contract,"Evaluation has not completed.");
        attempts=[...attempts,{...generated.attempt,evaluations:pending,finalStatus:"BLOCKED"}];modelUsage.push(generated.attempt.usage);checkpoint("BLOCKED",pending);
        setPhase(kind==="draft"?"evaluating":"rechecking");
        const checked=await requestJson("/api/text-contract/evaluate",{source,candidate:generated.attempt.content,contract},evaluateResultSchema,op.controller.signal);
        if(!active(op.id))return;
        const status=finalStatus(contract,checked.evaluations);
        attempts=attempts.map((attempt,index)=>index===attempts.length-1?{...attempt,evaluations:checked.evaluations,finalStatus:status}:attempt);
        modelUsage.push(...checked.usage);checkpoint(status,checked.evaluations);
        if(kind==="repair"||!checked.evaluations.some(item=>item.status==="fail")){setPhase("complete");setMessage(statusLabel(status)+" — review the result and the checks for each attempt.");break;}
        setPhase("repairing");
      }
    }catch(reason){
      if(!active(op.id))return;
      const text=reason instanceof Error?reason.message:"Agent run failed safely.";
      if(attempts.length){const evaluations=attempts.at(-1)!.evaluations??blockedEvaluations(contract,text);attempts=attempts.map((attempt,index)=>index===attempts.length-1?{...attempt,finalStatus:"BLOCKED",evaluationError:text}:attempt);checkpoint("BLOCKED",evaluations);}
      setPhase("blocked");setError(text+" No incomplete run was marked READY.");
    }finally{finish(op.id);}
  };
  const recheck=async()=>{
    if(!contract||!run||!currentRun||!manualCandidate.trim())return;
    if(run.attempts.length>=30){setError("This tab has 30 saved attempts. Download the report before starting a new workspace.");return;}
    const op=begin();if(!op)return;
    const candidate=manualCandidate,uncertain=blockedEvaluations(contract,"Recheck has not completed.");
    const attempt:GeneratedAttempt={id:crypto.randomUUID(),number:run.attempts.length+1,kind:"manual",content:candidate,createdAt:new Date().toISOString(),model:"human edit",usage:{provider:"human",operation:"generate"},evaluations:uncertain,finalStatus:"BLOCKED"};
    const pending:AgentRun={...run,attempts:[...run.attempts,attempt],finalCandidate:candidate,finalStatus:"BLOCKED",evaluations:uncertain,acceptedAt:undefined};
    setRun(pending);setPhase("rechecking");setError("");setMessage("");
    try{
      const checked=await requestJson("/api/text-contract/evaluate",{source,candidate,contract},evaluateResultSchema,op.controller.signal);if(!active(op.id))return;
      const status=finalStatus(contract,checked.evaluations);
      setRun({...pending,attempts:[...run.attempts,{...attempt,evaluations:checked.evaluations,finalStatus:status}],finalStatus:status,evaluations:checked.evaluations,modelUsage:[...run.modelUsage,...checked.usage]});setPhase("complete");setMessage(statusLabel(status)+" after checking the human edit.");
    }catch(reason){
      if(!active(op.id))return;
      const text=reason instanceof Error?reason.message:"Recheck failed safely.";
      setRun({...pending,attempts:[...run.attempts,{...attempt,evaluationError:text}]});setPhase("blocked");setError(text+" You can retry this same candidate.");
    }finally{finish(op.id);}
  };
  const accept=()=>{if(!run||!canAccept)return;setRun({...run,acceptedAt:new Date().toISOString()});setMessage("This checked revision was accepted by the human reviewer.");};
  const copy=async()=>{try{await navigator.clipboard.writeText(manualCandidate);setMessage("Final candidate copied.");}catch{setError("Clipboard unavailable. Select the output manually.");}};
  const download=(format:"markdown"|"json")=>{
    if(!run||busy||candidateDirty||!currentRun)return;
    const content=format==="json"?JSON.stringify(run,null,2):exportAgentRun(run);
    const url=URL.createObjectURL(new Blob([content],{type:format==="json"?"application/json":"text/markdown"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download="text-contract-report."+(format==="json"?"json":"md");anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return <section className="text-contract-workspace" data-testid="text-contract-workspace">
    <div className="contract-runtime" data-phase={phase} aria-live="polite"><span/><div><strong>{phaseLabel(phase,enabledRules.length)}</strong><p>Workspace storage is tab-local. Source and brief are sent to Nebius when you build and run.</p></div>{contract&&<small>Revision {contract.revision} · {enabledRules.length} rules · max 1 repair</small>}{busy&&<button type="button" className="secondary-button" onClick={cancel}>Stop run</button>}</div>

    {!contract?<section className="contract-panel">
      <div className="evidence-section-head"><div><span>01</span><div><p>SOURCE + INTENT</p><h2>Give the agent one document and one rewrite brief</h2></div></div><button type="button" className="secondary-button" onClick={loadExample} disabled={busy}>Load demo</button></div>
      <div className="contract-input-grid">
        <label><span>Source text or HTML</span><textarea data-testid="contract-source" disabled={busy} value={source} onChange={event=>{setSource(event.target.value);setRun(null);}} maxLength={MAX_TEXT_CONTRACT_SOURCE_CHARS} placeholder="Paste one source document. You do not need to create intermediate versions."/><small>{source.length.toLocaleString()} / {MAX_TEXT_CONTRACT_SOURCE_CHARS.toLocaleString()} characters</small></label>
        <label><span>Rewrite brief</span><textarea data-testid="contract-brief" disabled={busy} value={brief} onChange={event=>{setBrief(event.target.value);setRun(null);}} maxLength={MAX_TEXT_CONTRACT_BRIEF_CHARS} placeholder="Explain what to change and what must remain true."/><small>{brief.length.toLocaleString()} / {MAX_TEXT_CONTRACT_BRIEF_CHARS.toLocaleString()} characters</small></label>
      </div>
      <div className="contract-options">
        <label><span>Output language</span><select disabled={busy} value={outputLanguage} onChange={event=>setOutputLanguage(event.target.value as TextContractLanguage)}><option value="same">Same as source</option><option value="en">English</option><option value="ru">Russian</option><option value="uk">Ukrainian</option><option value="es">Spanish</option></select></label>
        <label><span>Official domains · optional</span><input disabled={busy} value={domains} onChange={event=>setDomains(event.target.value)} placeholder="example.com, docs.example.com"/><small>Up to 5 domains. Used only for rules that need live evidence.</small></label>
        <button type="button" className="analyze-button" data-testid="build-contract" onClick={buildContract} disabled={!hydrated||busy||!source.trim()||!brief.trim()}>{phase==="compiling"?"Compiling…":"Build contract"} <span>→</span></button>
      </div>
      <div className="contract-disclosure"><strong>Before you run</strong><p>Your source and brief will be sent to NVIDIA Nemotron through Nebius Token Factory for this run. Text Analysis Tools does not save them on its server; this tab stores the workspace in <code>sessionStorage</code>. Nebius and Tavily process requests under their own policies.</p></div>
    </section>:<>
      <section className="contract-panel">
        <div className="evidence-section-head"><div><span>02</span><div><p>EXECUTABLE CONTRACT</p><h2>{contract.title}</h2></div></div><button type="button" className="secondary-button" onClick={clearDerived} disabled={busy}>Edit source</button></div>
        <div className="contract-rule-list" data-testid="contract-rules">{contract.rules.map((rule,index)=><article key={rule.id} data-enabled={rule.enabled} data-required={rule.required}>
          <div className="contract-rule-head"><span>{String(index+1).padStart(2,"0")} · {rule.kind.replaceAll("_"," ")}</span><div>{rule.requiresLiveEvidence&&<b>LIVE EVIDENCE</b>}<b>{rule.required?"REQUIRED":"OPTIONAL"}</b></div></div>
          {rule.group?<><p>{rule.statement}</p>{Boolean(rule.values?.length)&&<details><summary>View all {rule.values?.length} protected values</summary><ul className="contract-guard-values">{rule.values?.map((value,i)=><li key={i}><code>{value}</code></li>)}</ul></details>}<small>Source safeguards are derived from the original document and stay required.</small></>:rule.checkStrategy==="nemotron"||rule.checkStrategy==="tavily"?<textarea disabled={busy} aria-label={`Rule ${index+1} statement`} value={rule.statement} maxLength={500} onChange={event=>updateRule(rule.id,{statement:event.target.value,...(rule.checkStrategy==="tavily"?{expectedValue:event.target.value}:{})})}/>:rule.kind!=="html_structure"?<label><span>{ruleValueLabel(rule)}</span><input disabled={busy} value={rule.expectedValue||""} maxLength={500} onChange={event=>updateRule(rule.id,deterministicRuleEdit(rule,event.target.value))}/></label>:<p>{rule.statement}</p>}
          {!rule.group&&rule.kind!=="html_structure"&&rule.checkStrategy==="deterministic"&&<p>{rule.statement}</p>}
          <div className="contract-rule-controls"><label><span>Severity</span><select disabled={busy} value={rule.severity} onChange={event=>updateRule(rule.id,{severity:event.target.value as ContractRule["severity"]})}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="contract-switch"><input type="checkbox" checked={rule.enabled} disabled={busy||rule.required} onChange={event=>updateRule(rule.id,{enabled:event.target.checked})}/><span>{rule.required?"Required rule stays on":"Include this rule"}</span></label><small>{rule.checkStrategy} check</small></div>
        </article>)}</div>
        <div className="contract-approval"><div><strong>{contract.approvedAt?"Contract approved":"Writing is locked"}</strong><p>{contract.approvedAt?"The visible contract is frozen for this run. Any edit removes approval.":"Review every rule. Nemotron cannot write until you explicitly approve this contract."}</p></div>{!contract.approvedAt?<button type="button" className="approve-button" data-testid="approve-contract" disabled={busy} onClick={approveContract}>Approve contract</button>:<button type="button" className="analyze-button compact" data-testid="run-contract" onClick={runAgent} disabled={busy}>{busy?phaseLabel(phase,enabledRules.length):"Run guarded rewrite"}</button>}</div>
      </section>

      {run&&<section className="contract-panel contract-results" data-status={run.finalStatus}>
        <div className="contract-result-head"><div><p>03 · SELF-CHECKED RESULT</p><h2><span>{candidateDirty?"UNVERIFIED EDIT":statusLabel(run.finalStatus)}</span> {resultSummary?.passed}/{resultSummary?.total} rules passed</h2><small>{resultSummary?.failed} failed · {resultSummary?.uncertain} uncertain · {run.attempts.length} attempt{run.attempts.length===1?"":"s"}</small></div><strong>{candidateDirty?"RECHECK REQUIRED":run.acceptedAt?"ACCEPTED BY HUMAN":statusLabel(run.finalStatus)}</strong></div>
        <label className="contract-final"><span>Final candidate · editable before recheck</span><textarea data-testid="final-candidate" disabled={busy} value={manualCandidate} onChange={event=>{setManualCandidate(event.target.value);if(run.acceptedAt)setRun({...run,acceptedAt:undefined});}} maxLength={MAX_TEXT_CONTRACT_SOURCE_CHARS}/><small>{candidateDirty?"This edit has not been evaluated. Recheck before acceptance or export.":`${manualCandidate.length.toLocaleString()} / ${MAX_TEXT_CONTRACT_SOURCE_CHARS.toLocaleString()} characters`}</small></label>
        <div className="contract-actions"><button type="button" className="secondary-button" onClick={recheck} disabled={busy||!currentRun||!manualCandidate.trim()||(!candidateDirty&&run.finalStatus==="READY")}>Recheck edit</button><button type="button" className="secondary-button" onClick={copy}>Copy</button><button type="button" className="secondary-button" onClick={()=>download("markdown")} disabled={busy||candidateDirty||!currentRun}>Download report</button><button type="button" className="secondary-button" onClick={()=>download("json")} disabled={busy||candidateDirty||!currentRun}>Export JSON</button><button type="button" className="approve-button" onClick={accept} disabled={!canAccept||Boolean(run.acceptedAt)}>{run.acceptedAt?"Accepted":"Accept"}</button></div>

        <div className="contract-attempts"><TextContractDiff before={run.contract.source} after={run.attempts[0]?.content||run.finalCandidate} label="Source → Draft 1"/>{run.attempts.length>1&&run.attempts.slice(1).map((attempt,index)=><TextContractDiff key={attempt.id} before={run.attempts[index].content} after={attempt.content} label={`${run.attempts[index].kind==="draft"?"Draft 1":"Previous attempt"} → ${attempt.kind==="repair"?"Repair 1":"Human edit"}`}/>)}</div>

        <div className="contract-history"><h3>Checks by attempt</h3>{run.attempts.map(attempt=><details key={attempt.id}><summary>{attempt.kind==="draft"?"Draft 1":attempt.kind==="repair"?"Repair 1":`Human edit ${attempt.number}`} · {statusLabel(attempt.finalStatus??"BLOCKED")}</summary>{attempt.evaluationError&&<p role="note">{attempt.evaluationError}</p>}{attempt.evaluations?.map(item=><div key={item.ruleId}><strong>{item.status.toUpperCase()} · {item.ruleId}</strong><p>{item.explanation}</p>{item.evidence.map(evidence=><p key={evidence.url}><a href={evidence.url} target="_blank" rel="noreferrer">{evidence.title}</a> — {evidence.excerpt}</p>)}</div>)}</details>)}</div>
        <div className="contract-evaluations"><div className="evidence-subsection-head"><div><span>RULE EVALUATION</span><h3>What the agent found in its own output</h3></div><small>Uncertain never counts as passed</small></div>{run.evaluations.map(item=>{const rule=run.contract.rules.find(candidate=>candidate.id===item.ruleId);return <article key={item.ruleId} data-status={item.status}><div><span>{item.status.toUpperCase()} · {item.evaluator}</span><h3>{rule?.statement||item.ruleId}</h3></div><p>{item.explanation}</p>{item.candidateExcerpt&&<code>{item.candidateExcerpt}</code>}{item.evidence.length>0&&<ul>{item.evidence.map(evidence=><li key={evidence.url}><a href={evidence.url} target="_blank" rel="noreferrer">{evidence.title}</a><span>{evidence.excerpt}</span></li>)}</ul>}</article>;})}</div>

        <div className="contract-usage"><span>MODEL USAGE</span>{usage.map((item,index)=><div key={`${item.provider}-${item.operation}-${index}`}><strong>{item.provider}{item.model?` · ${item.model}`:""}</strong><p>{item.operation}{item.totalTokens!==undefined?` · ${item.totalTokens.toLocaleString()} tokens`:""}{item.credits!==undefined?` · ${item.credits} credits`:""}</p></div>)}</div>
      </section>}
    </>}

    {message&&<p className="evidence-message" role="status">{message}</p>}
    {error&&<p className="evidence-error" role="alert">{error}</p>}
    {contract&&<button type="button" className="contract-clear" onClick={reset} disabled={busy}>Clear browser workspace</button>}
  </section>;
}
