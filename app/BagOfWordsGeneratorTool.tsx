"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { analyzeBagOfWords } from "./lib/analyze";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { BOW_GENERATOR_UI } from "./tool-ui-copy";

type SourceType="text"|"url";
type SortKey="term"|"count"|"frequency"|"percentage"|"per1000";
type SortDirection="asc"|"desc";
type Analysis=ReturnType<typeof analyzeBagOfWords>;

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=500;

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

function csvCell(value:string|number){
  const text=String(value);
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

function renderFrequency(value:number){
  return value < 0.1 ? value.toFixed(3) : value.toFixed(2);
}

export default function BagOfWordsGeneratorTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=BOW_GENERATOR_UI[uiLang];
  const [sourceType,setSourceType]=useState<SourceType>("text");
  const [source,setSource]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<Analysis|null>(null);
  const [query,setQuery]=useState("");
  const [sortKey,setSortKey]=useState<SortKey>("frequency");
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
    }catch{}},0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
  }),[stopwordLists]);

  const rows=useMemo(()=>{
    if(!result) return [];
    const normalized=query.trim().toLocaleLowerCase();
    return result.rows
      .filter(row=>!normalized||row.term.includes(normalized))
      .sort((a,b)=>{
        const comparison=sortKey==="term"
          ?a.term.localeCompare(b.term)
          :(a as unknown as Record<string,number>)[sortKey] - (b as unknown as Record<string,number>)[sortKey];
        return sortDirection==="asc"?comparison:-comparison;
      });
  },[result,query,sortDirection,sortKey]);

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(!source.trim())return;
    setLoading(true);
    setError("");
    setResult(null);
    try{
      let next:Analysis;
      if(sourceType==="text"){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        next=analyzeBagOfWords({text:source,language,keepStopwords,stopwordLists:parsedStopwords});
      }else{
        const response=await fetch("/api/v1/bag-of-words",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({sourceType,source,language,keepStopwords,stopwordLists:parsedStopwords}),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
        if(!response.ok) throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
        next=(payload as {result:Analysis}).result;
      }
      setResult(next);
      setQuery("");
      if(language==="auto") setEditorLanguage(next.language);
      window.setTimeout(()=>document.getElementById("bow-generator-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:copy.failed);
    }finally{
      setLoading(false);
    }
  }

  function selectSourceType(value:SourceType){setSourceType(value);setSource("");setResult(null);setError("");}
  function changeLanguage(value:"auto"|TextLanguage){
    setLanguage(value);
    if(value!=="auto")setEditorLanguage(value);
  }
  function changeEditorLanguage(value:TextLanguage){setEditorLanguage(value);setLanguage(value);}
  function updateStopwords(value:string){
    const next={...stopwordLists,[editorLanguage]:value};
    setStopwordLists(next);
    try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{}
  }
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[editorLanguage]);}
  function changeSort(value:SortKey){
    if(value===sortKey) setSortDirection(current=>current==="asc"?"desc":"asc");
    else{
      setSortKey(value);
      setSortDirection(value==="term"?"asc":"desc");
    }
  }
  function changeSortKey(value:SortKey){changeSort(value);}

  function exportCsv(){
    if(!result)return;
    const rowsToExport=[
      ["term","count","frequency","tf","percentage","per_1000"],
      ...result.rows.map((row)=>[
        row.term,
        row.count,
        row.frequency.toFixed(6),
        row.frequency.toFixed(6),
        row.percentage.toFixed(6),
        row.per1000.toFixed(6),
      ]),
    ];
    downloadFile(
      "bag-of-words.csv",
      `\uFEFF${rowsToExport.map((row)=>row.map(csvCell).join(",")).join("\n")}`,
      "text/csv;charset=utf-8",
    );
  }

  function exportJson(){
    if(!result)return;
    downloadFile("bag-of-words.json",JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2),"application/json;charset=utf-8");
  }

  const shownRows=rows.slice(0,DISPLAY_LIMIT);
  const sortArrow=(key:SortKey)=>sortKey===key?(sortDirection==="asc"?" ↑":" ↓"):"";
  const metricCoverage = result?.tokenCount ? (result.vocabularySize / result.tokenCount) * 100 : 0;
  const topRow=result?.rows[0]?.term;

  return <>
    <section className="tool-hero">
      <nav className="breadcrumbs" aria-label={BREADCRUMB_LABELS[uiLang]}><Link href={localizedPath(uiLang,"/")}>{copy.home}</Link><span>/</span><Link href={localizedPath(uiLang,"/tools")}>{copy.tools}</Link><span>/</span><span>{copy.breadcrumb}</span></nav>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.deck}</p>
      <span className="privacy-note"><b/>{copy.privacy}</span>
    </section>

    <form className="frequency-workspace" onSubmit={runAnalysis}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span>01</span><h2>{copy.source}</h2></div>
          <div className="tabs">
            <button type="button" className={sourceType==="text"?"active":""} onClick={()=>selectSourceType("text")}>{copy.text}</button>
            <button type="button" className={sourceType==="url"?"active":""} onClick={()=>selectSourceType("url")}>{copy.url}</button>
          </div>
        </div>
        {sourceType==="text"
          ?<div className="textarea-wrap"><textarea value={source} onChange={event=>setSource(event.target.value)} placeholder={copy.paste} aria-label={copy.textAria}/><span>{formatNumber(source.length,uiLang)} {copy.characters}</span></div>
          :<><input className="url-input" type="url" value={source} onChange={event=>setSource(event.target.value)} placeholder="https://example.com/page" aria-label={copy.urlAria} required/><p className="url-help">{copy.urlHelp}</p></>}
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>{copy.settings}</h2></div></div>
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select><small>{copy.languageHelp}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <details className="stopword-editor"><summary>{copy.editStops} <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map((item)=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>{copy.editorHelp}</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`${copy.editAria}: ${editorLanguage.toUpperCase()}`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} {copy.saved}</small><button type="button" onClick={resetStopwords}>{copy.restore}</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?copy.loading:copy.submit}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="bow-generator-results">
      <div className="results-title"><div><span>03</span><h2>{copy.results}</h2></div><p>{copy.detected}: <b>{result.language.toUpperCase()}</b></p></div>
      <div className="frequency-metrics">
        <div><span>{copy.words}</span><strong>{formatNumber(result.tokenCount,uiLang)}</strong><small>{copy.wordsNote}</small></div>
        <div><span>{copy.unique}</span><strong>{formatNumber(result.vocabularySize,uiLang)}</strong><small>{copy.uniqueNote}</small></div>
        <div><span>{copy.coverage}</span><strong>{metricCoverage.toFixed(2)}%</strong><small>{copy.coverageNote}</small></div>
        <div><span>{copy.topTerm}</span><strong>{topRow ?? "—"}</strong><small>{copy.topTermNote}</small></div>
      </div>

      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label>
          <div className="export-actions"><button type="button" onClick={exportCsv}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div>
        </div>
        <div className="frequency-table-meta"><span>{formatNumber(rows.length,uiLang)} {copy.matching}</span>{rows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th><button type="button" onClick={()=>changeSortKey("term")}>{copy.term}{sortArrow("term")}</button></th><th><button type="button" onClick={()=>changeSortKey("count")}>{copy.count}{sortArrow("count")}</button></th><th><button type="button" onClick={()=>changeSortKey("frequency")}>{copy.frequency}{sortArrow("frequency")}</button></th><th><button type="button" onClick={()=>changeSortKey("percentage")}>{copy.percentage}{sortArrow("percentage")}</button></th><th><button type="button" onClick={()=>changeSortKey("per1000")}>{copy.per1000}{sortArrow("per1000")}</button></th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.count,uiLang)}</td><td>{row.frequency.toFixed(6)}</td><td>{renderFrequency(row.percentage)}%</td><td>{renderFrequency(row.per1000)}</td></tr>)}</tbody></table></div>
        {!rows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>
    </section>}
  </>;
}
