"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeBagOfWords, calculateTfIdfCorpus, type TfIdfCorpusInput } from "./lib/analyze";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";

type SourceType="text"|"url";
type TfIdfDocument = {
  language:string;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:Array<{term:string;count:number;tf:number;idf:number;tfidf:number;percentage:number;per1000:number;}>;
};
type TfIdfResult = {
  language:string;
  documentCount:number;
  top:number;
  totalVocabularySize:number;
  averageDocumentFrequency:number;
  documents:TfIdfDocument[];
  idfTable:Array<{term:string;documentFrequency:number;idf:number;}>;
};

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=400;

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

export default function TfIdfCalculatorTool(){
  const [sourceTypeA,setSourceTypeA]=useState<SourceType>("text");
  const [sourceTypeB,setSourceTypeB]=useState<SourceType>("text");
  const [sourceA,setSourceA]=useState("");
  const [sourceB,setSourceB]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [top,setTop]=useState(100);
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<TfIdfResult|null>(null);
  const [activeDoc,setActiveDoc]=useState(0);
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
    const doc=result.documents[activeDoc];
    if(!doc) return [];
    const normalized=query.trim().toLocaleLowerCase();
    return normalized?doc.rows.filter(row=>row.term.includes(normalized)):doc.rows;
  },[query,activeDoc,result]);

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(!sourceA.trim()||!sourceB.trim())return;
    setLoading(true);
    setError("");
    setResult(null);
    try{
      const limit=Math.max(1,Math.min(top,100));
      const requestBody={
        top:limit,
        documents:[
          {sourceType:sourceTypeA,source:sourceA,language,keepStopwords,stopwordLists:parsedStopwords},
          {sourceType:sourceTypeB,source:sourceB,language,keepStopwords,stopwordLists:parsedStopwords},
        ],
      };
      if(sourceTypeA==="text"&&sourceTypeB==="text"){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        const documents = await Promise.all(
          [sourceA,sourceB].map((source)=>analyzeBagOfWords({text:source,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:"en"})),
        );
        const analysis = calculateTfIdfCorpus(documents as TfIdfCorpusInput, limit);
        const languageResult = documents.every((doc)=>doc.language===documents[0].language) ? documents[0].language : "auto";
        setResult({
          language:languageResult,
          documentCount:documents.length,
          top:limit,
          totalVocabularySize:analysis.totalVocabularySize,
          averageDocumentFrequency:analysis.averageDocumentFrequency,
          documents:analysis.documents,
          idfTable:analysis.idfTable,
        });
      }else{
        const response=await fetch("/api/v1/tf-idf",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify(requestBody),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error("The service returned an invalid response. Paste both texts instead.");}
        if(!response.ok) throw new Error(errorMessage(payload,"The documents could not be compared. Paste both texts instead."));
        const next = (payload as {result:TfIdfResult}).result;
        setResult(next);
      }
      setQuery("");
      setActiveDoc(0);
      if(language==="auto"&&result) setLanguage(result.language as "auto"|TextLanguage);
      window.setTimeout(()=>document.getElementById("tfidf-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:"The texts could not be processed.");
    }finally{setLoading(false);}
  }

  function selectSource(side:"a"|"b",value:SourceType){
    if(side==="a"){setSourceTypeA(value);setSourceA("");}
    else{setSourceTypeB(value);setSourceB("");}
    setResult(null);
    setError("");
  }
  function changeLanguage(value:"auto"|TextLanguage){setLanguage(value);if(value!=="auto")setEditorLanguage(value);}
  function changeEditorLanguage(value:TextLanguage){setEditorLanguage(value);setLanguage(value);}
  function updateStopwords(value:string){
    const next={...stopwordLists,[editorLanguage]:value};
    setStopwordLists(next);
    try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{}
  }
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[editorLanguage]);}

  function exportCsv(){
    if(!result)return;
    const doc=result.documents[activeDoc];
    if(!doc) return;
    const rows=[["term","count","tf","idf","tfidf","percentage","per_1000"],...filteredRows.map(row=>[row.term,row.count,row.tf,row.idf,row.tfidf,row.percentage,row.per1000])];
    downloadFile(`tfidf-document-${activeDoc+1}.csv`,`\uFEFF${rows.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
  }
  function exportJson(){
    if(!result)return;
    downloadFile("tfidf-calculator.json",JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2),"application/json;charset=utf-8");
  }

  const activeDocument = result?.documents?.[activeDoc];
  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);

  return <>
    <section className="tool-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>TF-IDF calculator</span></nav>
      <p className="eyebrow">FREE TEXT ANALYSIS TOOL · EN / UKR / RU</p>
      <h1>TF-IDF Calculator</h1>
      <p>Calculate inverse-document-frequency weights for two documents. Use corpus-wide weights to reduce the influence of very common terms and inspect why terms matter.</p>
      <span className="privacy-note"><b/>URL mode is stateless; pasted text is analyzed in-browser.</span>
    </section>

    <form className="frequency-workspace" onSubmit={runAnalysis}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span>01</span><h2>Two source documents</h2></div></div>
        <div className="comparison-source-grid">
          <label className="field wide"><span>Document A</span>
            <div className="tabs"><button type="button" className={sourceTypeA==="text"?"active":""} onClick={()=>selectSource("a","text")}>Text</button><button type="button" className={sourceTypeA==="url"?"active":""} onClick={()=>selectSource("a","url")}>URL</button></div>
            {sourceTypeA==="text"
              ?<><textarea value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="Paste source A or upload HTML text…" aria-label="Document A"/><span>{sourceA.length.toLocaleString("en-US")} characters</span></>
              :<><input className="url-input" type="url" value={sourceA} onChange={event=>setSourceA(event.target.value)} placeholder="https://example.com/source-a" aria-label="Document A URL" required/><p className="url-help">Public HTTP/HTTPS pages only.</p></>}
          </label>
        </div>
        <div className="comparison-source-grid">
          <label className="field wide"><span>Document B</span>
            <div className="tabs"><button type="button" className={sourceTypeB==="text"?"active":""} onClick={()=>selectSource("b","text")}>Text</button><button type="button" className={sourceTypeB==="url"?"active":""} onClick={()=>selectSource("b","url")}>URL</button></div>
            {sourceTypeB==="text"
              ?<><textarea value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="Paste source B or upload HTML text…" aria-label="Document B"/><span>{sourceB.length.toLocaleString("en-US")} characters</span></>
              :<><input className="url-input" type="url" value={sourceB} onChange={event=>setSourceB(event.target.value)} placeholder="https://example.com/source-b" aria-label="Document B URL" required/><p className="url-help">Public HTTP/HTTPS pages only.</p></>}
          </label>
        </div>
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>TF-IDF settings</h2></div></div>
        <label className="field"><span>Text language</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">Detect automatically</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select><small>Language controls stop-word behavior only.</small></label>
        <label className="field"><span>Top terms per document</span><input type="number" min="1" max="100" value={top} onChange={event=>setTop(Math.max(1,Math.min(100,Number(event.target.value)||100)))} /><small>Keep only the top N weighted terms in each document view and response.</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>Keep stop words</b><small>{keepStopwords?"Common function words will be counted.":"Common function words are excluded."}</small></span></label>
        <details className="stopword-editor"><summary>Edit stop words <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map((item)=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>Stop words affect tokenization and corpus size in both documents.</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`Edit ${editorLanguage.toUpperCase()} stop words`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} words saved locally</small><button type="button" onClick={resetStopwords}>Restore defaults</button></div></div></details>
        <button className="analyze-button" disabled={loading||!sourceA.trim()||!sourceB.trim()}><span>{loading?"Calculating TF-IDF…":"Calculate TF-IDF"}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="tfidf-results">
      <div className="results-title"><div><span>03</span><h2>TF-IDF result</h2></div><p>Detected language: <b>{result.language.toUpperCase()}</b></p></div>
      <div className="frequency-metrics">
        <div><span>Documents</span><strong>{result.documentCount}</strong><small>used for document frequency</small></div>
        <div><span>Vocabulary</span><strong>{result.totalVocabularySize.toLocaleString("en-US")}</strong><small>unique terms across corpus</small></div>
        <div><span>Avg document frequency</span><strong>{result.averageDocumentFrequency.toFixed(2)}</strong><small>mean number of docs per term</small></div>
        <div><span>Top terms</span><strong>{result.top}</strong><small>per output vector</small></div>
      </div>

      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <div className="frequency-view-tabs">
            {result.documents.map((_,index)=><button key={index} type="button" className={activeDoc===index?"active":""} onClick={()=>setActiveDoc(index)}>Document {index+1}</button>)}
          </div>
          <label><span>Search terms</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder="Filter by term…"/></label>
          <div className="export-actions"><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={exportJson}>Export JSON</button></div>
        </div>
        <div className="frequency-table-meta"><span>{filteredRows.length.toLocaleString("en-US")} matching rows</span>{filteredRows.length>DISPLAY_LIMIT&&<span>Showing the first {DISPLAY_LIMIT}; exports include the full view.</span>}</div>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>Term</th><th>Count</th><th>TF</th><th>Document freq</th><th>TF-IDF</th></tr></thead>
            <tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.count.toLocaleString("en-US")}</td><td>{row.tf.toFixed(6)}</td><td>{activeDocument?activeDocument.rows.find((lookup)=>lookup.term===row.term)?.idf.toFixed(3):"—"}</td><td>{row.tfidf.toFixed(6)}</td></tr>)}</tbody>
          </table>
        </div>
        {!filteredRows.length&&<p className="empty-filter">No rows match the filter.</p>}
      </div>

      <section className="tool-explainer">
        <p className="section-number">TOP IDF TERMS</p>
        <h2>Highest global inverse document weights</h2>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>Term</th><th>Document frequency</th><th>idf</th></tr></thead>
            <tbody>{result.idfTable.slice(0,DISPLAY_LIMIT).map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.documentFrequency.toLocaleString("en-US")}</td><td>{row.idf.toFixed(3)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </section>}
  </>;
}
