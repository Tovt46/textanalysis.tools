"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeBagOfWords, calculateTextSimilarity, type SimilarityMethod } from "./lib/analyze";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";

type SourceType="text"|"url";
type SimilarityMethodLocal=Extract<SimilarityMethod,"bow"|"tfidf">;
type SimilarityTerm={
  term:string;
  weightA:number;
  weightB:number;
  contribution:number;
};
type SimilarityResult={
  language:"en"|"ru"|"uk"|"auto";
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
  };
};

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=500;

function errorMessage(payload:unknown,fallback:string){
  if(!payload||typeof payload!=="object") return fallback;
  if("error"in payload){
    const error=(payload as {error:unknown}).error;
    if(typeof error==="string") return error;
    if(error&&typeof error==="object"&&"message" in error) return String((error as {message:unknown}).message);
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
  anchor.href=url;
  anchor.download=filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function contributionShare(value:number){return (Math.abs(value)).toFixed(4);}

export default function TextSimilarityCalculatorTool(){
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
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    const timer=window.setTimeout(()=>{try{
      const raw=localStorage.getItem(STOPWORDS_KEY);
      if(!raw)return;
      const saved=JSON.parse(raw) as Partial<Record<TextLanguage,unknown>>;
      setStopwordLists(current=>({
        en:typeof saved.en==="string"?saved.en:current.en,
        uk:typeof saved.uk==="string"?saved.uk:current.uk,
        ru:typeof saved.ru==="string"?saved.ru:current.ru,
      }));
    }catch{}},0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
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
    setLoading(true);
    setError("");
    setResult(null);
    setQuery("");

    try{
      const limit=Math.max(1,Math.min(top,100));
      if(sourceTypeA==="text"&&sourceTypeB==="text"){
        const [docA,docB]=await Promise.all([
          analyzeBagOfWords({text:sourceA,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:"en"}),
          analyzeBagOfWords({text:sourceB,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:"en"}),
        ]);
        setResult(calculateTextSimilarity(docA,docB,method,limit));
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
      }else{
        const response=await fetch("/api/v1/similarity",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({
            a:{sourceType:sourceTypeA,source:sourceA,language,top:limit,keepStopwords,stopwordLists:parsedStopwords},
            b:{sourceType:sourceTypeB,source:sourceB,language,top:limit,keepStopwords,stopwordLists:parsedStopwords},
            method:method==="tfidf"?"tf-idf":"bow",
          }),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error("The service returned an invalid response. Paste both texts instead.");}
        if(!response.ok) throw new Error(errorMessage(payload,"The documents could not be compared."));
        const next=(payload as ResponsePayload).result;
        if(!next) throw new Error("The service response is missing result data.");
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
        });
      }
      window.setTimeout(()=>document.getElementById("text-similarity-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:"The texts could not be compared.");
    }finally{
      setLoading(false);
    }
  }

  function selectSource(side:"a"|"b",value:SourceType){
    if(side==="a"){setSourceTypeA(value);setSourceA("");}
    else{setSourceTypeB(value);setSourceB("");}
    setResult(null);
    setError("");
  }
  function changeLanguage(value:"auto"|TextLanguage){
    setLanguage(value);
    if(value!=="auto")setEditorLanguage(value);
  }
  function changeEditorLanguage(value:TextLanguage){
    setEditorLanguage(value);
    setLanguage(value);
  }
  function updateStopwords(value:string){
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
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Text Similarity Calculator</span></nav>
      <p className="eyebrow">FREE TEXT SIMILARITY · EN / UKR / RU</p>
      <h1>Text Similarity Calculator</h1>
      <p>Compare two documents with cosine similarity on top of either raw term weights (BoW) or TF-IDF weights. Use top contribution terms to audit why each score came out as it did.</p>
      <span className="privacy-note"><b/>{sourceTypeA==="url"||sourceTypeB==="url"?"URL modes are processed statelessly by the API.": "Pasted text is analyzed locally in this browser."}</span>
    </section>

    <form className="comparison-workspace" onSubmit={runAnalysis}>
      <section className="comparison-source-card">
        <div className="section-head"><div><span>01</span><h2>First source</h2></div><div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>Text</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>URL</button></div></div>
        {sourceTypeA==="text"
          ?<div className="textarea-wrap"><textarea value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="Paste source A or HTML text…" aria-label="Source A"/><span>{sourceA.length.toLocaleString("en-US")} characters</span></div>
          :<><input className="url-input" type="url" value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="https://example.com/source-a" aria-label="Source A URL" required/><p className="url-help">Public HTTP/HTTPS pages only.</p></>}
      </section>
      <section className="comparison-source-card">
        <div className="section-head"><div><span>02</span><h2>Second source</h2></div><div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>Text</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>URL</button></div></div>
        {sourceTypeB==="text"
          ?<div className="textarea-wrap"><textarea value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="Paste source B or HTML text…" aria-label="Source B"/><span>{sourceB.length.toLocaleString("en-US")} characters</span></div>
          :<><input className="url-input" type="url" value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="https://example.com/source-b" aria-label="Source B URL" required/><p className="url-help">Public HTTP/HTTPS pages only.</p></>}
      </section>

      <aside className="comparison-settings-card">
        <div className="section-head simple"><div><span>03</span><h2>Similarity settings</h2></div></div>
        <label className="field"><span>Text language</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">Detect automatically</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select></label>
        <label className="field"><span>Method</span><select value={method} onChange={event=>setMethod(event.target.value==="bow"?"bow":"tfidf")}>
          <option value="tfidf">TF-IDF</option>
          <option value="bow">Bag of Words</option>
        </select></label>
        <label className="field"><span>Top terms</span><input type="number" min="1" max="100" value={top} onChange={event=>setTop(Math.max(1,Math.min(100,Number(event.target.value)||100)))} /></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>Keep stop words</b><small>{keepStopwords?"Common function words will be counted.":"Common function words are excluded."}</small></span></label>
        <details className="stopword-editor"><summary>Edit stop words <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map((item)=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>Stop words are applied after tokenization and filtering of numeric tokens.</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`Edit ${editorLanguage.toUpperCase()} stop words`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} words saved locally</small><button type="button" onClick={resetStopwords}>Restore defaults</button></div></div></details>
        <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?"Measuring…":`Compare with ${methodLabel}`}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="text-similarity-results">
      <div className="results-title"><div><span>04</span><h2>Similarity result</h2></div><p>Detected language: <b>{result.language.toUpperCase()}</b> · Method: <b>{methodLabel}</b></p></div>
      <div className="frequency-metrics">
        <div><span>Source A words</span><strong>{result.tokenCounts.a.toLocaleString("en-US")}</strong><small>for vector A</small></div>
        <div><span>Source B words</span><strong>{result.tokenCounts.b.toLocaleString("en-US")}</strong><small>for vector B</small></div>
        <div><span>Cosine similarity</span><strong>{result.cosine.toFixed(4)}</strong><small>normalized dot-product score</small></div>
        <div><span>Top contribution terms</span><strong>{result.top.toLocaleString("en-US")}</strong><small>largest weighted overlap terms</small></div>
      </div>
      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <label><span>Search terms</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder="Filter contribution terms…"/></label>
          <div><small>{supportsIdf?`${result.topTerms.length} TF-IDF terms shown`:`${result.topTerms.length} terms shown`}</small><div className="export-actions"><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={exportJson}>Export JSON</button></div></div>
        </div>
        <div className="frequency-table-meta"><span>{filteredRows.length.toLocaleString("en-US")} matching rows</span>{filteredRows.length>DISPLAY_LIMIT&&<span>Showing the first {DISPLAY_LIMIT}; exports include the full view.</span>}</div>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>Term</th><th>{methodLabel==="TF-IDF"?"A tfidf":"A weight"}</th><th>{methodLabel==="TF-IDF"?"B tfidf":"B weight"}</th><th>Contribution</th><th>Abs. contribution</th></tr></thead>
            <tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.weightA.toFixed(6)}</td><td>{row.weightB.toFixed(6)}</td><td>{row.contribution.toFixed(6)}</td><td>{contributionShare(Math.abs(row.contribution))}</td></tr>)}</tbody>
          </table>
        </div>
        {!filteredRows.length&&<p className="empty-filter">No terms match this filter.</p>}
      </div>

      {supportsIdf&&result?.idfTable&&<section className="tool-explainer"><p className="section-number">TOP IDF TERMS</p><h2>Global IDF table</h2><div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th>Term</th><th>Document frequency</th><th>IDF</th></tr></thead><tbody>{result.idfTable.slice(0,DISPLAY_LIMIT).map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.documentFrequency.toLocaleString("en-US")}</td><td>{row.idf.toFixed(3)}</td></tr>)}</tbody></table></div></section>}
    </section>}
  </>;
}
