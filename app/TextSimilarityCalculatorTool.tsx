"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import type { SimilarityMethod } from "./lib/analyze";
import { AnalysisProgress,hasPartialBrowserResult,isAnalysisAbort,PartialResultNotice,useBrowserAnalysis,validateBrowserInputs } from "./lib/browser-analysis";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { SIMILARITY_UI } from "./tool-ui-copy";
import { CopyResultAction,ExampleAction,type ToolExample } from "./ToolWorkflowActions";

type SourceType="text"|"url";
type SimilarityMethodLocal=Extract<SimilarityMethod,"bow"|"tfidf">;
type SimilarityTerm={
  term:string;
  weightA:number;
  weightB:number;
  contribution:number;
};
type SimilarityResult={
  language:TextLanguage|"auto";
  method:SimilarityMethodLocal;
  tokenCounts:{a:number;b:number};
  top:number;
  cosine:number;
  dotProduct:number;
  normA:number;
  normB:number;
  overlapTerms:number;
  topTerms:SimilarityTerm[];
  documents?:Array<{language:string;tokenCount:number;vocabularySize:number;stopwordCount:number;rows:Array<{term:string;count:number;tf:number;idf:number;tfidf:number;percentage:number;per1000:number}>;}>;
  idfTable?:Array<{term:string;documentFrequency:number;idf:number;}>;
  totalIdfRows?:number;
  returnedIdfRows?:number;
  idfOffset?:number;
  nextIdfOffset?:number|null;
  hasMoreIdfRows?:boolean;
  idfTableTruncated?:boolean;
};

type ResponsePayload = {
  result?: {
    language?: string;
    method?: "bow"|"tfidf"|"tf-idf";
    tokenCounts?: { a: number; b: number };
    top?: number;
    cosine?: number;
    dotProduct?: number;
    normA?: number;
    normB?: number;
    overlapTerms?: number;
    topTerms?: Array<{ term:string; weightA:number; weightB:number; contribution:number; weight?:number; }>;
    documents?: SimilarityResult["documents"];
    idfTable?: SimilarityResult["idfTable"];
    totalIdfRows?:number;
    returnedIdfRows?:number;
    idfOffset?:number;
    nextIdfOffset?:number|null;
    hasMoreIdfRows?:boolean;
    idfTableTruncated?:boolean;
  };
};

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=500;

function csvCell(value:string|number){
  const text=String(value);
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

function downloadFile(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function contributionShare(value:number){return (Math.abs(value)).toFixed(4);}

export default function TextSimilarityCalculatorTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=SIMILARITY_UI[uiLang];
  const [sourceTypeA,setSourceTypeA]=useState<SourceType>("text");
  const [sourceTypeB,setSourceTypeB]=useState<SourceType>("text");
  const [sourceA,setSourceA]=useState("");
  const [sourceB,setSourceB]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [method,setMethod]=useState<"bow"|"tfidf">("tfidf");
  const [top,setTop]=useState(100);
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<SimilarityResult|null>(null);
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");
  const {busy:loading,progress,runWorker,runRemote,cancel}=useBrowserAnalysis();

  useEffect(()=>{
    const timer=window.setTimeout(()=>{try{
      const raw=localStorage.getItem(STOPWORDS_KEY);
      if(!raw)return;
      const saved=JSON.parse(raw) as Partial<Record<TextLanguage,unknown>>;
      setStopwordLists(current=>({
        en:typeof saved.en==="string"?saved.en:current.en,
        uk:typeof saved.uk==="string"?saved.uk:current.uk,
        ru:typeof saved.ru==="string"?saved.ru:current.ru,
        es:typeof saved.es==="string"?saved.es:current.es,
      }));
    }catch{}},0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
    es:parseStopwordText(stopwordLists.es),
  }),[stopwordLists]);

  const filteredRows=useMemo(()=>{
    if(!result) return [];
    const normalized=query.trim().toLocaleLowerCase();
    return normalized
      ? result.topTerms.filter(row=>row.term.includes(normalized))
      : result.topTerms;
  },[query,result]);

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(!sourceA.trim()||!sourceB.trim())return;
    setError("");
    setResult(null);
    setQuery("");

    try{
      validateBrowserInputs([
        ...(sourceTypeA==="text"?[sourceA]:[]),
        ...(sourceTypeB==="text"?[sourceB]:[]),
      ],uiLang);
      const limit=Math.max(1,Math.min(top,100));
      if(sourceTypeA==="text"&&sourceTypeB==="text"){
        setResult(await runWorker<SimilarityResult>("similarity",{
          a:{text:sourceA,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:uiLang},
          b:{text:sourceB,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:uiLang},
          method,
          top:limit,
        }));
      }else{
        const next=await runRemote(async signal=>{
          const response=await fetch("/api/v1/similarity",{
            method:"POST",signal,
            headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({
              a:{sourceType:sourceTypeA,source:sourceA,language,top:limit,keepStopwords,stopwordLists:parsedStopwords},
              b:{sourceType:sourceTypeB,source:sourceB,language,top:limit,keepStopwords,stopwordLists:parsedStopwords},
              method:method==="tfidf"?"tf-idf":"bow",
            }),
          });
          const raw=await response.text();
          let payload:unknown;
          try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
          if(!response.ok) throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
          return (payload as ResponsePayload).result;
        });
        if(!next) throw new Error(copy.missing);
        setResult({
          language:(next.language ?? "auto") as SimilarityResult["language"],
          method:(next.method==="bow"?"bow":"tfidf") as SimilarityMethodLocal,
          tokenCounts:next.tokenCounts ?? {a:0,b:0},
          top:next.top ?? limit,
          cosine:next.cosine ?? 0,
          dotProduct:next.dotProduct ?? 0,
          normA:next.normA ?? 0,
          normB:next.normB ?? 0,
          overlapTerms:next.overlapTerms ?? 0,
          topTerms:(next.topTerms ?? []).map((row)=>({
            term:row.term,
            weightA:row.weightA ?? 0,
            weightB:row.weightB ?? 0,
            contribution:row.contribution ?? 0,
          })),
          documents:next.documents as SimilarityResult["documents"] | undefined,
          idfTable:next.idfTable as SimilarityResult["idfTable"] | undefined,
          totalIdfRows:next.totalIdfRows,
          returnedIdfRows:next.returnedIdfRows,
          idfOffset:next.idfOffset,
          nextIdfOffset:next.nextIdfOffset,
          hasMoreIdfRows:next.hasMoreIdfRows,
          idfTableTruncated:next.idfTableTruncated,
        });
      }
      window.setTimeout(()=>document.getElementById("text-similarity-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      if(isAnalysisAbort(caught))return;
      setError(caught instanceof Error?caught.message:copy.failed);
    }
  }

  function selectSource(side:"a"|"b",value:SourceType){
    cancel();
    if(side==="a"){setSourceTypeA(value);setSourceA("");}
    else{setSourceTypeB(value);setSourceB("");}
    setResult(null);
    setError("");
  }
  function loadExample(example:ToolExample){
    cancel();setSourceTypeA("text");setSourceTypeB("text");setSourceA(example.sources[0]);setSourceB(example.sources[1]);setLanguage(uiLang);setEditorLanguage(uiLang);setResult(null);setError("");
  }
  function changeLanguage(value:"auto"|TextLanguage){
    cancel();
    setLanguage(value);
    if(value!=="auto")setEditorLanguage(value);
  }
  function changeEditorLanguage(value:TextLanguage){
    cancel();
    setEditorLanguage(value);
    setLanguage(value);
  }
  function updateStopwords(value:string){
    cancel();
    const next={...stopwordLists,[editorLanguage]:value};
    setStopwordLists(next);
    try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{}
  }
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[editorLanguage]);}

  function exportCsv(){
    if(!result) return;
    const rows=[["term","weight_a","weight_b","contribution","abs_contribution"],...filteredRows.map(row=>[
      row.term,
      row.weightA.toFixed(6),
      row.weightB.toFixed(6),
      row.contribution.toFixed(6),
      contributionShare(row.contribution),
    ])];
    downloadFile("text-similarity.csv",`\uFEFF${rows.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
  }
  function exportJson(){
    if(!result) return;
    downloadFile("text-similarity.json",JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2),"application/json;charset=utf-8");
  }

  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);
  const methodLabel=method==="bow"?"Bag of Words":"TF-IDF";
  const supportsIdf=method==="tfidf"&&Boolean(result?.idfTable);

  return <>
    <section className="tool-hero">
      <nav className="breadcrumbs" aria-label={BREADCRUMB_LABELS[uiLang]}><Link href={localizedPath(uiLang,"/")}>{copy.home}</Link><span>/</span><Link href={localizedPath(uiLang,"/tools")}>{copy.tools}</Link><span>/</span><span>{copy.breadcrumb}</span></nav>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.deck}</p>
      <span className="privacy-note"><b/>{sourceTypeA==="url"||sourceTypeB==="url"?copy.privacyApi:copy.privacyLocal}</span>
    </section>

    <form className="comparison-workspace" onSubmit={runAnalysis} aria-busy={loading}>
      <section className="comparison-source-card">
        <div className="section-head"><div><span>01</span><h2>{copy.first}</h2></div><div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>{copy.text}</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>{copy.url}</button></div></div>
        {sourceTypeA==="text"
          ?<div className="textarea-wrap"><textarea value={sourceA} onChange={event=>{cancel();setSourceA(event.target.value);setResult(null);setError("");}} placeholder={copy.pasteA} aria-label={copy.sourceA}/><span>{formatNumber(sourceA.length,uiLang)} {copy.characters}</span></div>
          :<><input className="url-input" type="url" value={sourceA} onChange={event=>{cancel();setSourceA(event.target.value);setResult(null);setError("");}} placeholder="https://example.com/source-a" aria-label={copy.urlA} required/><p className="url-help">{copy.urlHelp}</p></>}
      </section>
      <section className="comparison-source-card">
        <div className="section-head"><div><span>02</span><h2>{copy.second}</h2></div><div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>{copy.text}</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>{copy.url}</button></div></div>
        {sourceTypeB==="text"
          ?<div className="textarea-wrap"><textarea value={sourceB} onChange={event=>{cancel();setSourceB(event.target.value);setResult(null);setError("");}} placeholder={copy.pasteB} aria-label={copy.sourceB}/><span>{formatNumber(sourceB.length,uiLang)} {copy.characters}</span></div>
          :<><input className="url-input" type="url" value={sourceB} onChange={event=>{cancel();setSourceB(event.target.value);setResult(null);setError("");}} placeholder="https://example.com/source-b" aria-label={copy.urlB} required/><p className="url-help">{copy.urlHelp}</p></>}
      </section>
      <ExampleAction tool="text-similarity" locale={uiLang} onLoad={loadExample}/>

      <aside className="comparison-settings-card">
        <div className="section-head simple"><div><span>03</span><h2>{copy.settings}</h2></div></div>
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
        <label className="field"><span>{copy.method}</span><select value={method} onChange={event=>{cancel();setMethod(event.target.value==="bow"?"bow":"tfidf");}}>
          <option value="tfidf">TF-IDF</option>
          <option value="bow">Bag of Words</option>
        </select></label>
        <label className="field"><span>{copy.top}</span><input type="number" min="1" max="100" value={top} onChange={event=>{cancel();setTop(Math.max(1,Math.min(100,Number(event.target.value)||100)));}} /></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>{cancel();setKeepStopwords(event.target.checked);}}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <details className="stopword-editor"><summary>{copy.editStops} <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru","es"] as TextLanguage[]).map((item)=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>{copy.editorHelp}</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`${copy.editAria}: ${editorLanguage.toUpperCase()}`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} {copy.saved}</small><button type="button" onClick={resetStopwords}>{copy.restore}</button></div></div></details>
        <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?copy.loading:`${copy.submit} ${methodLabel}`}</span><b>→</b></button>
        <AnalysisProgress active={loading} progress={progress} label={copy.loading}/>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="text-similarity-results">
      <div className="results-title"><div><span>04</span><h2>{copy.results}</h2></div><div className="results-actions"><p>{copy.detected}: <b>{result.language.toUpperCase()}</b> · {copy.methodLabel}: <b>{methodLabel}</b></p><CopyResultAction tool="text-similarity" locale={uiLang} value={result}/></div></div>
      <PartialResultNotice partial={hasPartialBrowserResult(result)} locale={uiLang}/>
      <div className="frequency-metrics">
        <div><span>{copy.wordsA}</span><strong>{formatNumber(result.tokenCounts.a,uiLang)}</strong><small>{copy.wordsANote}</small></div>
        <div><span>{copy.wordsB}</span><strong>{formatNumber(result.tokenCounts.b,uiLang)}</strong><small>{copy.wordsBNote}</small></div>
        <div><span>{copy.cosine}</span><strong>{result.cosine.toFixed(4)}</strong><small>{copy.cosineNote}</small></div>
        <div><span>{copy.contributions}</span><strong>{formatNumber(result.top,uiLang)}</strong><small>{copy.contributionsNote}</small></div>
      </div>
      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label>
          <div><small>{formatNumber(result.topTerms.length,uiLang)} {supportsIdf?"TF-IDF ":""}{copy.shown}</small><div className="export-actions"><button type="button" onClick={exportCsv}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div></div>
        </div>
        <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>{copy.term}</th><th>{methodLabel==="TF-IDF"?"A TF-IDF":copy.weightA}</th><th>{methodLabel==="TF-IDF"?"B TF-IDF":copy.weightB}</th><th>{copy.contribution}</th><th>{copy.absolute}</th></tr></thead>
            <tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.weightA.toFixed(6)}</td><td>{row.weightB.toFixed(6)}</td><td>{row.contribution.toFixed(6)}</td><td>{contributionShare(Math.abs(row.contribution))}</td></tr>)}</tbody>
          </table>
        </div>
        {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>

      {supportsIdf&&result?.idfTable&&<section className="tool-explainer"><p className="section-number">{copy.idfEye}</p><h2>{copy.idfTitle}</h2><div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th>{copy.term}</th><th>{copy.documentFrequency}</th><th>IDF</th></tr></thead><tbody>{result.idfTable.slice(0,DISPLAY_LIMIT).map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.documentFrequency,uiLang)}</td><td>{row.idf.toFixed(3)}</td></tr>)}</tbody></table></div></section>}
    </section>}
  </>;
}
