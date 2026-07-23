"use client";

import { FormEvent,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeText } from "./lib/analyze";
import { compareAnalysisResults } from "./lib/comparison";
import { DEFAULT_STOPWORD_LISTS,type TextLanguage } from "./lib/stopwords";

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

function errorMessage(payload:unknown,fallback:string){
  if(!payload||typeof payload!=="object")return fallback;
  if("error" in payload){
    const error=(payload as {error:unknown}).error;
    if(typeof error==="string")return error;
    if(error&&typeof error==="object"&&"message" in error)return String((error as {message:unknown}).message);
  }
  return fallback;
}

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

export default function TextComparisonTool(){
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
        const shared={language,top:100,tolerance:2,keepStopwords,stopwordLists:DEFAULT_STOPWORD_LISTS,uiLanguage:"en" as const};
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
        try{payload=JSON.parse(raw);}catch{throw new Error("The service returned an invalid response. Paste both texts instead.");}
        if(!response.ok)throw new Error(errorMessage(payload,"The sources could not be compared. Paste both texts instead."));
        next=payload as ComparisonPayload;
      }
      setResult(next);setView("words");setQuery("");
      window.setTimeout(()=>document.getElementById("comparison-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:"The sources could not be compared.");
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
    {label:"Analyzed words",a:result.comparison.metrics.tokenCount.a.toLocaleString("en-US"),b:result.comparison.metrics.tokenCount.b.toLocaleString("en-US"),delta:signed(result.comparison.metrics.tokenCount.delta),direction:result.comparison.metrics.tokenCount.delta},
    {label:"Unique words",a:result.comparison.metrics.vocabularySize.a.toLocaleString("en-US"),b:result.comparison.metrics.vocabularySize.b.toLocaleString("en-US"),delta:signed(result.comparison.metrics.vocabularySize.delta),direction:result.comparison.metrics.vocabularySize.delta},
    {label:"Zipf exponent",a:result.comparison.metrics.fittedExponent.a.toFixed(2),b:result.comparison.metrics.fittedExponent.b.toFixed(2),delta:signed(result.comparison.metrics.fittedExponent.delta,2),direction:result.comparison.metrics.fittedExponent.delta},
    {label:"Above-model terms",a:result.comparison.metrics.aboveModel.a.toLocaleString("en-US"),b:result.comparison.metrics.aboveModel.b.toLocaleString("en-US"),delta:signed(result.comparison.metrics.aboveModel.delta),direction:result.comparison.metrics.aboveModel.delta},
  ]: [];

  return <>
    <section className="tool-hero comparison-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Text analysis comparison</span></nav>
      <p className="eyebrow">FREE A/B TEXT COMPARISON · EN / UKR / RU</p>
      <h1>Compare two texts word by word</h1>
      <p>See what changed between version A and B: word count, vocabulary, normalized word frequency, bigrams, and Zipf diagnostics. Search the differences or export the complete result.</p>
      <span className="privacy-note"><b/>{usesApi?"URL comparisons use the stateless API and are not stored":"Both pasted texts are analyzed in your browser and are not stored"}</span>
    </section>

    <form className="comparison-workspace" onSubmit={runComparison}>
      <div className="comparison-source-grid">
        <section className="comparison-source-card">
          <div className="section-head"><div><span>A</span><h2>Original text</h2></div><div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>Text</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>URL</button></div></div>
          {sourceTypeA==="text"
            ?<div className="textarea-wrap"><textarea value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="Paste the original text or HTML…" aria-label="Original text"/><span>{sourceA.length.toLocaleString("en-US")} characters</span></div>
            :<><input className="url-input" type="url" value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="https://example.com/original" aria-label="Original webpage URL" required/><p className="url-help">Public HTTP/HTTPS pages only. Navigation and template text may affect the comparison.</p></>}
        </section>
        <section className="comparison-source-card">
          <div className="section-head"><div><span>B</span><h2>Updated text</h2></div><div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>Text</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>URL</button></div></div>
          {sourceTypeB==="text"
            ?<div className="textarea-wrap"><textarea value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="Paste the revised text or HTML…" aria-label="Updated text"/><span>{sourceB.length.toLocaleString("en-US")} characters</span></div>
            :<><input className="url-input" type="url" value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="https://example.com/updated" aria-label="Updated webpage URL" required/><p className="url-help">Use the same page type and comparable page scope for a more useful result.</p></>}
        </section>
      </div>

      <aside className="comparison-settings-card">
        <div className="comparison-settings-copy"><span>01</span><div><h2>Shared comparison settings</h2><p>The same language and stop-word rule are applied to both inputs so their normalized shares stay comparable.</p></div></div>
        <label className="field"><span>Text language</span><select value={language} onChange={event=>setLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">Detect each input automatically</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select></label>
        <label className="check comparison-check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>Keep stop words</b><small>{keepStopwords?"Common function words will be included.":"Default language stop words are excluded."}</small></span></label>
        <div className="comparison-submit">
          <p>{usesApi?"Because one input is a URL, both sources are processed by the stateless comparison API. Submitted content is not retained.":"The full A/B calculation runs locally in this browser."}</p>
          <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?"Comparing…":"Compare A with B"}</span><b>→</b></button>
          {error&&<p className="error" role="alert">{error}</p>}
        </div>
      </aside>
    </form>

    {result&&<section className="frequency-results text-comparison-results" id="comparison-results">
      <div className="results-title"><div><span>02</span><h2>What changed from A to B</h2></div><div className="results-actions"><p>Languages: <b>A · {result.resultA.language.toUpperCase()}</b> / <b>B · {result.resultB.language.toUpperCase()}</b></p><div className="export-actions"><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={exportJson}>Export JSON</button></div></div></div>
      {result.resultA.language!==result.resultB.language&&<div className="comparison-language-warning"><b>Different languages detected</b><p>Frequency changes across different languages are usually not meaningful. Choose a fixed language or compare texts written in the same language.</p></div>}
      <div className="comparison-metrics">{metricCards.map(metric=><div key={metric.label}><span>{metric.label}</span><div className="comparison-metric-values"><p><small>A</small><strong>{metric.a}</strong></p><p><small>B</small><strong>{metric.b}</strong></p></div><b className={deltaClass(metric.direction)}>B − A {metric.delta}</b></div>)}</div>

      <div className="frequency-table-card">
        <div className="comparison-table-head"><div className="comparison-view-tabs"><button type="button" className={view==="words"?"active":""} onClick={()=>{setView("words");setQuery("");}}>Words <span>{result.comparison.wordChanges.length.toLocaleString("en-US")}</span></button><button type="button" className={view==="bigrams"?"active":""} onClick={()=>{setView("bigrams");setQuery("");}}>Bigrams <span>{result.comparison.bigramChanges.length.toLocaleString("en-US")}</span></button></div><p>Rows are ordered by the largest absolute change in normalized share.</p></div>
        <div className="frequency-toolbar comparison-toolbar"><label><span>Search {view}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={`Filter ${view}…`}/></label><span>A share and B share normalize texts of different lengths.</span></div>
        <div className="frequency-table-meta"><span>{filteredRows.length.toLocaleString("en-US")} matching {view}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>Showing the first {DISPLAY_LIMIT}; exports include the full result.</span>}</div>
        <div className="table-scroll"><table className="frequency-table comparison-frequency-table"><thead><tr><th>#</th><th>{view==="words"?"Word":"Bigram"}</th><th>A count</th><th>A share</th><th>B count</th><th>B share</th><th>Count Δ</th><th>Share Δ</th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.countA.toLocaleString("en-US")}</td><td>{percentage(row.shareA)}</td><td>{row.countB.toLocaleString("en-US")}</td><td>{percentage(row.shareB)}</td><td className={deltaClass(row.countDelta)}>{signed(row.countDelta)}</td><td className={deltaClass(row.shareDelta)}>{signed(row.shareDelta*100,3)} pp</td></tr>)}</tbody></table></div>
        {!filteredRows.length&&<p className="empty-filter">No {view} match “{query}”.</p>}
      </div>
      <p className="comparison-footnote">A change describes direction, not quality. Positive means the term occupies a larger share in B; negative means it occupies a smaller share.</p>
    </section>}
  </>;
}
