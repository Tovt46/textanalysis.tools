"use client";

import { FormEvent,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeText } from "./lib/analyze";
import { compareAnalysisResults } from "./lib/comparison";
import { DEFAULT_STOPWORD_LISTS,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { TEXT_COMPARISON_UI } from "./tool-ui-copy";

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
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const filteredRows=useMemo(()=>{
    if(!result)return [];
    const rows=view==="words"?result.comparison.wordChanges:result.comparison.bigramChanges;
    const normalized=query.trim().toLocaleLowerCase();
    return normalized?rows.filter(row=>row.term.includes(normalized)):rows;
  },[query,result,view]);

  function selectSource(side:"a"|"b",value:SourceType){
    if(side==="a"){setSourceTypeA(value);setSourceA("");}
    else{setSourceTypeB(value);setSourceB("");}
    setResult(null);setError("");
  }

  async function runComparison(event:FormEvent){
    event.preventDefault();
    if(!sourceA.trim()||!sourceB.trim())return;
    setLoading(true);setError("");setResult(null);
    try{
      let next:ComparisonPayload;
      if(sourceTypeA==="text"&&sourceTypeB==="text"){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        const shared={language,top:100,tolerance:2,keepStopwords,stopwordLists:DEFAULT_STOPWORD_LISTS,uiLanguage:uiLang};
        const coreA=analyzeText({text:sourceA,...shared});
        const coreB=analyzeText({text:sourceB,...shared});
        next={
          resultA:coreA,
          resultB:coreB,
          comparison:compareAnalysisResults(
            {result:coreA,unigrams:coreA._allUnigrams,bigrams:coreA._allBigrams},
            {result:coreB,unigrams:coreB._allUnigrams,bigrams:coreB._allBigrams},
          ),
        };
      }else{
        const response=await fetch("/api/v1/compare",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({
            a:{sourceType:sourceTypeA,source:sourceA,language,top:100,tolerance:2,keepStopwords},
            b:{sourceType:sourceTypeB,source:sourceB,language,top:100,tolerance:2,keepStopwords},
          }),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
        if(!response.ok)throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
        next=payload as ComparisonPayload;
      }
      setResult(next);setView("words");setQuery("");
      window.setTimeout(()=>document.getElementById("comparison-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:copy.failed);
    }finally{setLoading(false);}
  }

  function exportCsv(){
    if(!result)return;
    const rows=view==="words"?result.comparison.wordChanges:result.comparison.bigramChanges;
    const csv=[
      ["term","count_a","share_a","count_b","share_b","count_delta","share_delta"],
      ...rows.map(row=>[row.term,row.countA,row.shareA,row.countB,row.shareB,row.countDelta,row.shareDelta]),
    ];
    downloadFile(`text-comparison-${view}.csv`,`\uFEFF${csv.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
  }

  function exportJson(){
    if(!result)return;
    downloadFile("text-comparison.json",JSON.stringify({
      generatedAt:new Date().toISOString(),
      settings:{language,keepStopwords},
      ...result,
    },null,2),"application/json;charset=utf-8");
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
      <span className="privacy-note"><b/>{usesApi?copy.privacyApi:copy.privacyLocal}</span>
    </section>

    <form className="comparison-workspace" onSubmit={runComparison}>
      <div className="comparison-source-grid">
        <section className="comparison-source-card">
          <div className="section-head"><div><span>A</span><h2>{copy.original}</h2></div><div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>{copy.text}</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>{copy.url}</button></div></div>
          {sourceTypeA==="text"
            ?<div className="textarea-wrap"><textarea value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder={copy.pasteA} aria-label={copy.ariaA}/><span>{formatNumber(sourceA.length,uiLang)} {copy.characters}</span></div>
            :<><input className="url-input" type="url" value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="https://example.com/original" aria-label={copy.urlA} required/><p className="url-help">{copy.urlHelpA}</p></>}
        </section>
        <section className="comparison-source-card">
          <div className="section-head"><div><span>B</span><h2>{copy.updated}</h2></div><div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>{copy.text}</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>{copy.url}</button></div></div>
          {sourceTypeB==="text"
            ?<div className="textarea-wrap"><textarea value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder={copy.pasteB} aria-label={copy.ariaB}/><span>{formatNumber(sourceB.length,uiLang)} {copy.characters}</span></div>
            :<><input className="url-input" type="url" value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="https://example.com/updated" aria-label={copy.urlB} required/><p className="url-help">{copy.urlHelpB}</p></>}
        </section>
      </div>

      <aside className="comparison-settings-card">
        <div className="comparison-settings-copy"><span>01</span><div><h2>{copy.settings}</h2><p>{copy.settingsHelp}</p></div></div>
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>setLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select></label>
        <label className="check comparison-check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <div className="comparison-submit">
          <p>{usesApi?copy.apiMode:copy.localMode}</p>
          <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?copy.loading:copy.submit}</span><b>→</b></button>
          {error&&<p className="error" role="alert">{error}</p>}
        </div>
      </aside>
    </form>

    {result&&<section className="frequency-results text-comparison-results" id="comparison-results">
      <div className="results-title"><div><span>02</span><h2>{copy.results}</h2></div><div className="results-actions"><p>{copy.languages}: <b>A · {result.resultA.language.toUpperCase()}</b> / <b>B · {result.resultB.language.toUpperCase()}</b></p><div className="export-actions"><button type="button" onClick={exportCsv}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div></div></div>
      {result.resultA.language!==result.resultB.language&&<div className="comparison-language-warning"><b>{copy.languageWarning}</b><p>{copy.languageWarningText}</p></div>}
      <div className="comparison-metrics">{metricCards.map(metric=><div key={metric.label}><span>{metric.label}</span><div className="comparison-metric-values"><p><small>A</small><strong>{metric.a}</strong></p><p><small>B</small><strong>{metric.b}</strong></p></div><b className={deltaClass(metric.direction)}>B − A {metric.delta}</b></div>)}</div>

      <div className="frequency-table-card">
        <div className="comparison-table-head"><div className="comparison-view-tabs"><button type="button" className={view==="words"?"active":""} onClick={()=>{setView("words");setQuery("");}}>{copy.words} <span>{formatNumber(result.comparison.wordChanges.length,uiLang)}</span></button><button type="button" className={view==="bigrams"?"active":""} onClick={()=>{setView("bigrams");setQuery("");}}>{copy.bigrams} <span>{formatNumber(result.comparison.bigramChanges.length,uiLang)}</span></button></div><p>{copy.ordered}</p></div>
        <div className="frequency-toolbar comparison-toolbar"><label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label><span>{copy.normalize}</span></div>
        <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll"><table className="frequency-table comparison-frequency-table"><thead><tr><th>#</th><th>{view==="words"?copy.word:copy.bigram}</th><th>{copy.countA}</th><th>{copy.shareA}</th><th>{copy.countB}</th><th>{copy.shareB}</th><th>{copy.countDelta}</th><th>{copy.shareDelta}</th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.countA,uiLang)}</td><td>{percentage(row.shareA)}</td><td>{formatNumber(row.countB,uiLang)}</td><td>{percentage(row.shareB)}</td><td className={deltaClass(row.countDelta)}>{signed(row.countDelta)}</td><td className={deltaClass(row.shareDelta)}>{signed(row.shareDelta*100,3)} pp</td></tr>)}</tbody></table></div>
        {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>
      <p className="comparison-footnote">{copy.footnote}</p>
    </section>}
  </>;
}
