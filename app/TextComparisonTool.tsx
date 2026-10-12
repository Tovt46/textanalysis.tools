"use client";

import { FormEvent,useMemo,useState } from "react";
import Link from "next/link";
import type { compareAnalysisResults } from "./lib/comparison";
import { AnalysisProgress,hasPartialBrowserResult,isAnalysisAbort,PartialResultNotice,useBrowserAnalysis,validateBrowserInputs } from "./lib/browser-analysis";
import { DEFAULT_STOPWORD_LISTS,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath } from "./localization";
import { TEXT_COMPARISON_UI } from "./tool-ui-copy";
import { CopyResultAction,ExampleAction,type ToolExample } from "./ToolWorkflowActions";
import {trackEvent} from "./lib/analytics";
import {EditorialSourceControls,SOURCE_WORKFLOW_COPY} from "./EditorialSourceControls";
import {ContextTermButton,TermContextPanel} from "./TermContextPanel";
import {buildContextIndex,type ContextIndexOptions} from "./lib/term-contexts";
import {sourcePreviewAnalysisText,useSourcePreview} from "./lib/source-preview-client";

type SourceType="text"|"url";
type ComparisonView="words"|"bigrams";
type Comparison=ReturnType<typeof compareAnalysisResults>;
type AnalysisSummary={
  language:TextLanguage;
  tokenCount:number;
  vocabularySize:number;
  fittedExponent:number;
  rSquared:number;
  zoneCounts:{above:number};
};
type ComparisonPayload={
  resultA:AnalysisSummary;
  resultB:AnalysisSummary;
  comparison:Comparison;
};

const DISPLAY_LIMIT=500;

function csvCell(value:string|number){
  const text=String(value);
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

function downloadFile(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

function signed(value:number,digits=0){
  const rounded=Number(value.toFixed(digits));
  if(rounded===0)return digits?rounded.toFixed(digits):"0";
  return `${rounded>0?"+":""}${digits?rounded.toFixed(digits):rounded.toLocaleString("en-US")}`;
}

function percentage(value:number){
  const percent=value*100;
  return `${percent.toFixed(Math.abs(percent)<0.1?3:2)}%`;
}

function deltaClass(value:number){
  return value>0?"comparison-positive":value<0?"comparison-negative":"comparison-flat";
}

export default function TextComparisonTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=TEXT_COMPARISON_UI[uiLang];
  const [sourceTypeA,setSourceTypeA]=useState<SourceType>("text");
  const [sourceTypeB,setSourceTypeB]=useState<SourceType>("text");
  const [sourceA,setSourceA]=useState("");
  const [sourceB,setSourceB]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [result,setResult]=useState<ComparisonPayload|null>(null);
  const [view,setView]=useState<ComparisonView>("words");
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");
  const [previewing,setPreviewing]=useState(false);
  const [selectedTerm,setSelectedTerm]=useState<string|null>(null);
  const [analyzedSources,setAnalyzedSources]=useState<{a:string;b:string;optionsA:ContextIndexOptions;optionsB:ContextIndexOptions}|null>(null);
  const {busy:loading,progress,runWorker,runRemote,cancel}=useBrowserAnalysis();
  const pageA=useSourcePreview(sourceA,sourceTypeA,uiLang);
  const pageB=useSourcePreview(sourceB,sourceTypeB,uiLang);
  const sourceCopy=SOURCE_WORKFLOW_COPY[uiLang];
  const needsPreview=sourceTypeA==="url"&&!pageA.preview||sourceTypeB==="url"&&!pageB.preview;
  const contextsOpen=selectedTerm!==null;
  const contextSources=useMemo(()=>analyzedSources&&contextsOpen?[
    {label:"A",index:buildContextIndex(analyzedSources.a,analyzedSources.optionsA)},
    {label:"B",index:buildContextIndex(analyzedSources.b,analyzedSources.optionsB)},
  ]:[],[analyzedSources,contextsOpen]);

  function invalidateResult(){cancel();setResult(null);setSelectedTerm(null);setAnalyzedSources(null);setError("");setPreviewing(false);}
  function openContexts(term:string){setSelectedTerm(term);trackEvent("context_opened",{tool:"text_comparison",ngram_size:view==="words"?1:2});}

  const filteredRows=useMemo(()=>{
    if(!result)return [];
    const rows=view==="words"?result.comparison.wordChanges:result.comparison.bigramChanges;
    const normalized=query.trim().toLocaleLowerCase();
    return normalized?rows.filter(row=>row.term.includes(normalized)):rows;
  },[query,result,view]);

  function selectSource(side:"a"|"b",value:SourceType){
    invalidateResult();
    if(side==="a")pageA.clear();else pageB.clear();
    if(side==="a"){setSourceTypeA(value);setSourceA("");}
    else{setSourceTypeB(value);setSourceB("");}
  }
  function loadExample(example:ToolExample){
    invalidateResult();pageA.clear();pageB.clear();setSourceTypeA("text");setSourceTypeB("text");setSourceA(example.sources[0]);setSourceB(example.sources[1]);setLanguage(uiLang);
  }

  async function runComparison(event:FormEvent){
    event.preventDefault();
    if(!sourceA.trim()||!sourceB.trim())return;
    setError("");setResult(null);setSelectedTerm(null);setAnalyzedSources(null);
    try{
      validateBrowserInputs([sourceTypeA==="text"?sourceA:"",sourceTypeB==="text"?sourceB:""],uiLang);
      if(needsPreview){
        setPreviewing(true);
        await runRemote(async signal=>{
          await Promise.all([
            sourceTypeA==="url"&&!pageA.preview?pageA.prepare(signal):Promise.resolve(null),
            sourceTypeB==="url"&&!pageB.preview?pageB.prepare(signal):Promise.resolve(null),
          ]);
        });
        trackEvent("source_preview_completed",{tool:"text_comparison",source_count:Number(sourceTypeA==="url")+Number(sourceTypeB==="url")});
        return;
      }
      const visibleA=sourceTypeA==="url"?pageA.preview!.text:sourceA;
      const visibleB=sourceTypeB==="url"?pageB.preview!.text:sourceB;
      validateBrowserInputs([visibleA,visibleB],uiLang);
      const textA=sourceTypeA==="url"?sourcePreviewAnalysisText(visibleA):visibleA;
      const textB=sourceTypeB==="url"?sourcePreviewAnalysisText(visibleB):visibleB;
      const shared={language,top:100,tolerance:2,keepStopwords,stopwordLists:DEFAULT_STOPWORD_LISTS,uiLanguage:uiLang};
      trackEvent("analysis_started",{tool:"text_comparison",source_count:2});
      const next=await runWorker<ComparisonPayload>("comparison",{a:{text:textA,...shared},b:{text:textB,...shared}});
      setAnalyzedSources({a:textA,b:textB,optionsA:{language:next.resultA.language,keepStopwords},optionsB:{language:next.resultB.language,keepStopwords}});
      setResult(next);setView("words");setQuery("");
      trackEvent("analysis_completed",{tool:"text_comparison",word_count_a:next.resultA.tokenCount,word_count_b:next.resultB.tokenCount});
      window.setTimeout(()=>document.getElementById("comparison-results")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}),50);
    }catch(caught){
      if(isAnalysisAbort(caught))return;
      setError(caught instanceof Error?caught.message:copy.failed);
    }finally{setPreviewing(false);}
  }

  function exportCsv(){
    if(!result)return;
    const rows=view==="words"?result.comparison.wordChanges:result.comparison.bigramChanges;
    const csv=[
      ["term","count_a","share_a","count_b","share_b","count_delta","share_delta"],
      ...rows.map(row=>[row.term,row.countA,row.shareA,row.countB,row.shareB,row.countDelta,row.shareDelta]),
    ];
    downloadFile(`text-comparison-${view}.csv`,`\uFEFF${csv.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
    trackEvent("result_exported",{tool:"text_comparison",format:"csv",ngram_size:view==="words"?1:2});
  }

  function exportJson(){
    if(!result)return;
    downloadFile("text-comparison.json",JSON.stringify({
      generatedAt:new Date().toISOString(),
      settings:{language,keepStopwords},
      ...result,
    },null,2),"application/json;charset=utf-8");
    trackEvent("result_exported",{tool:"text_comparison",format:"json"});
  }

  const usesApi=sourceTypeA==="url"||sourceTypeB==="url";
  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);
  const metricCards=result?[
    {label:copy.metricWords,a:formatNumber(result.comparison.metrics.tokenCount.a,uiLang),b:formatNumber(result.comparison.metrics.tokenCount.b,uiLang),delta:signed(result.comparison.metrics.tokenCount.delta),direction:result.comparison.metrics.tokenCount.delta},
    {label:copy.metricUnique,a:formatNumber(result.comparison.metrics.vocabularySize.a,uiLang),b:formatNumber(result.comparison.metrics.vocabularySize.b,uiLang),delta:signed(result.comparison.metrics.vocabularySize.delta),direction:result.comparison.metrics.vocabularySize.delta},
    {label:copy.metricZipf,a:result.comparison.metrics.fittedExponent.a.toFixed(2),b:result.comparison.metrics.fittedExponent.b.toFixed(2),delta:signed(result.comparison.metrics.fittedExponent.delta,2),direction:result.comparison.metrics.fittedExponent.delta},
    {label:copy.metricAbove,a:formatNumber(result.comparison.metrics.aboveModel.a,uiLang),b:formatNumber(result.comparison.metrics.aboveModel.b,uiLang),delta:signed(result.comparison.metrics.aboveModel.delta),direction:result.comparison.metrics.aboveModel.delta},
  ]: [];

  return <>
    <section className="tool-hero comparison-hero">
      <nav className="breadcrumbs" aria-label={BREADCRUMB_LABELS[uiLang]}><Link href={localizedPath(uiLang,"/")}>{copy.home}</Link><span>/</span><Link href={localizedPath(uiLang,"/tools")}>{copy.tools}</Link><span>/</span><span>{copy.breadcrumb}</span></nav>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.deck}</p>
      <span className="privacy-note"><b/>{usesApi?sourceCopy.privacy:copy.privacyLocal}</span>
    </section>

    <form className="comparison-workspace" onSubmit={runComparison} aria-busy={loading}>
      <div className="comparison-source-grid">
        <section className="comparison-source-card">
          <div className="section-head"><div><span>A</span><h2>{copy.original}</h2></div><div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>{copy.text}</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>{copy.url}</button></div></div>
          {sourceTypeA==="text"
            ?<div className="textarea-wrap"><textarea value={sourceA} onChange={event=>{invalidateResult();pageA.clear();setSourceA(event.target.value);}} placeholder={copy.pasteA} aria-label={copy.ariaA}/><span>{formatNumber(sourceA.length,uiLang)} {copy.characters}</span></div>
            :<><input className="url-input" type="url" value={sourceA} onChange={event=>{invalidateResult();pageA.clear();setSourceA(event.target.value);}} placeholder="https://example.com/original" aria-label={copy.urlA} required/><p className="url-help">{copy.urlHelpA}</p><EditorialSourceControls scope={pageA.scope} preview={pageA.preview} locale={uiLang} label="A" onScopeChange={value=>{invalidateResult();pageA.clear();pageA.setScope(value);}}/></>}
        </section>
        <section className="comparison-source-card">
          <div className="section-head"><div><span>B</span><h2>{copy.updated}</h2></div><div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>{copy.text}</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>{copy.url}</button></div></div>
          {sourceTypeB==="text"
            ?<div className="textarea-wrap"><textarea value={sourceB} onChange={event=>{invalidateResult();pageB.clear();setSourceB(event.target.value);}} placeholder={copy.pasteB} aria-label={copy.ariaB}/><span>{formatNumber(sourceB.length,uiLang)} {copy.characters}</span></div>
            :<><input className="url-input" type="url" value={sourceB} onChange={event=>{invalidateResult();pageB.clear();setSourceB(event.target.value);}} placeholder="https://example.com/updated" aria-label={copy.urlB} required/><p className="url-help">{copy.urlHelpB}</p><EditorialSourceControls scope={pageB.scope} preview={pageB.preview} locale={uiLang} label="B" onScopeChange={value=>{invalidateResult();pageB.clear();pageB.setScope(value);}}/></>}
        </section>
      </div>
      <ExampleAction tool="text-comparison" locale={uiLang} onLoad={loadExample}/>

      <aside className="comparison-settings-card">
        <div className="comparison-settings-copy"><span>01</span><div><h2>{copy.settings}</h2><p>{copy.settingsHelp}</p></div></div>
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>{invalidateResult();setLanguage(event.target.value as "auto"|TextLanguage);}}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
        <label className="check comparison-check"><input type="checkbox" checked={keepStopwords} onChange={event=>{invalidateResult();setKeepStopwords(event.target.checked);}}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <div className="comparison-submit">
          <p>{usesApi?sourceCopy.review:copy.localMode}</p>
          <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?(previewing?sourceCopy.loading:copy.loading):needsPreview?sourceCopy.previewBoth:copy.submit}</span><b aria-hidden="true">→</b></button>
          <AnalysisProgress active={loading} progress={progress} label={previewing?sourceCopy.loading:copy.loading}/>
          {error&&<p className="error" role="alert">{error}</p>}
        </div>
      </aside>
    </form>

    {result&&<section className="frequency-results text-comparison-results" id="comparison-results">
      <div className="results-title"><div><span>02</span><h2>{copy.results}</h2></div><div className="results-actions"><p>{copy.languages}: <b>A · {result.resultA.language.toUpperCase()}</b> / <b>B · {result.resultB.language.toUpperCase()}</b></p><CopyResultAction tool="text-comparison" locale={uiLang} value={result}/><div className="export-actions"><button type="button" onClick={exportCsv}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div></div></div>
      <PartialResultNotice partial={hasPartialBrowserResult(result)} locale={uiLang}/>
      {result.resultA.language!==result.resultB.language&&<div className="comparison-language-warning"><b>{copy.languageWarning}</b><p>{copy.languageWarningText}</p></div>}
      <div className="comparison-metrics">{metricCards.map(metric=><div key={metric.label}><span>{metric.label}</span><div className="comparison-metric-values"><p><small>A</small><strong>{metric.a}</strong></p><p><small>B</small><strong>{metric.b}</strong></p></div><b className={deltaClass(metric.direction)}>B − A {metric.delta}</b></div>)}</div>

      <div className="frequency-table-card">
        <div className="comparison-table-head"><div className="comparison-view-tabs"><button type="button" className={view==="words"?"active":""} onClick={()=>{setView("words");setQuery("");setSelectedTerm(null);}}>{copy.words} <span>{formatNumber(result.comparison.wordChanges.length,uiLang)}</span></button><button type="button" className={view==="bigrams"?"active":""} onClick={()=>{setView("bigrams");setQuery("");setSelectedTerm(null);}}>{copy.bigrams} <span>{formatNumber(result.comparison.bigramChanges.length,uiLang)}</span></button></div><p>{copy.ordered}</p></div>
        <div className="frequency-toolbar comparison-toolbar"><label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label><span>{copy.normalize}</span></div>
        <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll"><table className="frequency-table comparison-frequency-table"><thead><tr><th>#</th><th>{view==="words"?copy.word:copy.bigram}</th><th>{copy.countA}</th><th>{copy.shareA}</th><th>{copy.countB}</th><th>{copy.shareB}</th><th>{copy.countDelta}</th><th>{copy.shareDelta}</th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><ContextTermButton term={row.term} selected={selectedTerm===row.term} panelId="comparison-contexts" locale={uiLang} onSelect={()=>openContexts(row.term)}/></td><td>{formatNumber(row.countA,uiLang)}</td><td>{percentage(row.shareA)}</td><td>{formatNumber(row.countB,uiLang)}</td><td>{percentage(row.shareB)}</td><td className={deltaClass(row.countDelta)}>{signed(row.countDelta)}</td><td className={deltaClass(row.shareDelta)}>{signed(row.shareDelta*100,3)} pp</td></tr>)}</tbody></table></div>
        {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>
      {selectedTerm&&contextSources.length?<TermContextPanel key={selectedTerm} id="comparison-contexts" term={selectedTerm} sources={contextSources} locale={uiLang} onClose={()=>setSelectedTerm(null)}/>:null}
      <p className="comparison-footnote">{copy.footnote}</p>
    </section>}
  </>;
}
