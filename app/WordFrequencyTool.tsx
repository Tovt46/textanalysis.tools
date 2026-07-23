"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeWordFrequency } from "./lib/analyze";
import { trackEvent } from "./lib/analytics";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";

type SourceType="text"|"url";
type Analysis=ReturnType<typeof analyzeWordFrequency>;
type SortKey="term"|"count"|"percentage"|"per1000";
type SortDirection="asc"|"desc";

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
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

function downloadFile(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

function csvCell(value:string|number){
  const text=String(value);
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

export default function WordFrequencyTool(){
  const [sourceType,setSourceType]=useState<SourceType>("text");
  const [source,setSource]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<Analysis|null>(null);
  const [query,setQuery]=useState("");
  const [sortKey,setSortKey]=useState<SortKey>("count");
  const [sortDirection,setSortDirection]=useState<SortDirection>("desc");
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
      }catch{}
    },0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
  }),[stopwordLists]);

  const filteredRows=useMemo(()=>{
    if(!result)return [];
    const normalized=query.trim().toLocaleLowerCase();
    const rows=normalized?result.rows.filter(row=>row.term.includes(normalized)):result.rows;
    return [...rows].sort((a,b)=>{
      const comparison=sortKey==="term"
        ?a.term.localeCompare(b.term)
        :a[sortKey]-b[sortKey];
      return sortDirection==="asc"?comparison:-comparison;
    });
  },[query,result,sortDirection,sortKey]);

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(!source.trim())return;
    setLoading(true);setError("");setResult(null);
    trackEvent("analysis_started",{tool:"word_frequency_counter",source_type:sourceType,text_language:language});
    if(sourceType==="url")trackEvent("url_analysis_started",{tool:"word_frequency_counter",text_language:language});
    try{
      let next:Analysis;
      if(sourceType==="text"){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        next=analyzeWordFrequency({text:source,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:"en"});
      }else{
        const response=await fetch("/api/word-frequency",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({sourceType,source,language,keepStopwords,stopwordLists:parsedStopwords}),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error("The service returned an invalid response. Paste the page text instead.");}
        if(!response.ok)throw new Error(errorMessage(payload,"The page could not be analyzed. Paste its text instead."));
        next=(payload as {result:Analysis}).result;
      }
      setResult(next);setQuery("");
      if(language==="auto")setEditorLanguage(next.language);
      trackEvent("analysis_completed",{tool:"word_frequency_counter",source_type:sourceType,text_language:next.language,word_count:next.tokenCount,unique_words:next.vocabularySize});
      window.setTimeout(()=>document.getElementById("frequency-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      const message=caught instanceof Error?caught.message:"The text could not be analyzed.";
      setError(message);
      trackEvent("analysis_error",{tool:"word_frequency_counter",source_type:sourceType,error_message:message.slice(0,100)});
    }finally{setLoading(false);}
  }

  function selectSourceType(value:SourceType){setSourceType(value);setSource("");setResult(null);setError("");}
  function changeLanguage(value:"auto"|TextLanguage){setLanguage(value);if(value!=="auto")setEditorLanguage(value);trackEvent("language_changed",{tool:"word_frequency_counter",text_language:value});}
  function changeEditorLanguage(value:TextLanguage){setEditorLanguage(value);setLanguage(value);trackEvent("language_changed",{tool:"word_frequency_counter",text_language:value,control:"stopword_editor"});}
  function updateStopwords(value:string){
    const next={...stopwordLists,[editorLanguage]:value};
    setStopwordLists(next);
    try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{}
  }
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[editorLanguage]);}
  function changeSort(value:SortKey){
    if(value===sortKey)setSortDirection(current=>current==="asc"?"desc":"asc");
    else{setSortKey(value);setSortDirection(value==="term"?"asc":"desc");}
  }
  function exportCsv(){
    if(!result)return;
    const rows=[["word","count","percentage","per_1000"],...result.rows.map(row=>[row.term,row.count,row.percentage.toFixed(6),row.per1000.toFixed(6)])];
    downloadFile("word-frequency.csv",`\uFEFF${rows.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
    trackEvent("result_exported",{tool:"word_frequency_counter",format:"csv",row_count:result.rows.length});
  }
  function exportJson(){
    if(!result)return;
    downloadFile("word-frequency.json",JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2),"application/json;charset=utf-8");
    trackEvent("result_exported",{tool:"word_frequency_counter",format:"json",row_count:result.rows.length});
  }

  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);
  const sortArrow=(key:SortKey)=>sortKey===key?(sortDirection==="asc"?" ↑":" ↓"):"";

  return <>
    <section className="tool-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Word frequency counter</span></nav>
      <p className="eyebrow">FREE TEXT ANALYSIS TOOL · EN / UKR / RU</p>
      <h1>Word Frequency Counter</h1>
      <p>Count every word in text or a webpage. See exact occurrences, percentage of analyzed words, and normalized frequency per 1,000 words—then search, sort, or export the full table.</p>
      <span className="privacy-note"><b/>Pasted text is analyzed in your browser and is not stored</span>
    </section>

    <form className="frequency-workspace" onSubmit={runAnalysis}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span>01</span><h2>Text or webpage</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} onClick={()=>selectSourceType("text")}>Text</button><button type="button" className={sourceType==="url"?"active":""} onClick={()=>selectSourceType("url")}>URL</button></div></div>
        {sourceType==="text"
          ?<div className="textarea-wrap"><textarea value={source} onChange={event=>setSource(event.target.value)} placeholder="Paste text or HTML…" aria-label="Text to analyze"/><span>{source.length.toLocaleString("en-US")} characters</span></div>
          :<><input className="url-input" type="url" value={source} onChange={event=>setSource(event.target.value)} placeholder="https://example.com/page" aria-label="Webpage URL" required/><p className="url-help">We fetch public HTTP/HTTPS pages, remove markup, and count the readable text. Some sites block automated requests.</p></>}
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>Counting settings</h2></div></div>
        <label className="field"><span>Text language</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">Detect automatically</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select><small>Language controls which editable stop-word list is used.</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>Keep stop words</b><small>{keepStopwords?"Common function words will be counted.":"Common function words are excluded."}</small></span></label>
        <details className="stopword-editor"><summary>Edit stop words <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map(item=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>Remove a word or add a new one. Separate entries with commas, spaces, or semicolons. Your list is saved only in this browser.</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`Edit ${editorLanguage.toUpperCase()} stop words`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} words saved locally</small><button type="button" onClick={resetStopwords}>Restore defaults</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?"Counting…":"Count word frequency"}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="frequency-results">
      <div className="results-title"><div><span>03</span><h2>Word frequency results</h2></div><p>Detected language: <b>{result.language.toUpperCase()}</b></p></div>
      <div className="frequency-metrics">
        <div><span>Words analyzed</span><strong>{result.tokenCount.toLocaleString("en-US")}</strong><small>after the selected stop-word rule</small></div>
        <div><span>Unique words</span><strong>{result.vocabularySize.toLocaleString("en-US")}</strong><small>complete vocabulary</small></div>
        <div><span>Active stop words</span><strong>{keepStopwords?"Off":result.stopwordCount.toLocaleString("en-US")}</strong><small>{keepStopwords?"all words kept":"editable list applied"}</small></div>
      </div>

      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <label><span>Search words</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder="Filter the table…"/></label>
          <div className="export-actions"><button type="button" onClick={exportCsv} disabled={!result.rows.length}>Export CSV</button><button type="button" onClick={exportJson} disabled={!result.rows.length}>Export JSON</button></div>
        </div>
        {result.rows.length===0?<div className="no-frequency-results"><h3>No countable words remain</h3><p>Try keeping stop words or editing the active stop-word list.</p></div>:<>
          <div className="frequency-table-meta"><span>{filteredRows.length.toLocaleString("en-US")} matching {filteredRows.length===1?"word":"words"}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>Showing the first {DISPLAY_LIMIT}; exports include the full result.</span>}</div>
          <div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th><button type="button" onClick={()=>changeSort("term")}>Word{sortArrow("term")}</button></th><th><button type="button" onClick={()=>changeSort("count")}>Count{sortArrow("count")}</button></th><th><button type="button" onClick={()=>changeSort("percentage")}>Percentage{sortArrow("percentage")}</button></th><th><button type="button" onClick={()=>changeSort("per1000")}>Per 1,000{sortArrow("per1000")}</button></th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.count.toLocaleString("en-US")}</td><td>{row.percentage.toFixed(row.percentage<0.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div>
          {!filteredRows.length&&<p className="empty-filter">No words match “{query}”.</p>}
        </>}
      </div>
    </section>}
  </>;
}
