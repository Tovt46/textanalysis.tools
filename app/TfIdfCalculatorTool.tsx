"use client";

import { FormEvent,useEffect,useMemo,useRef,useState } from "react";
import Link from "next/link";
import { analyzeBagOfWords, calculateTfIdfCorpus, type TfIdfCorpusInput } from "./lib/analyze";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { TFIDF_UI } from "./tool-ui-copy";

type SourceType="text"|"url";
type SourceDocument={id:number;sourceType:SourceType;source:string;};
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

export default function TfIdfCalculatorTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=TFIDF_UI[uiLang];
  const [sources,setSources]=useState<SourceDocument[]>([
    {id:1,sourceType:"text",source:""},
    {id:2,sourceType:"text",source:""},
  ]);
  const nextSourceId=useRef(3);
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
    const doc=result.documents[activeDoc];
    if(!doc) return [];
    const normalized=query.trim().toLocaleLowerCase();
    return normalized?doc.rows.filter(row=>row.term.includes(normalized)):doc.rows;
  },[query,activeDoc,result]);
  const documentFrequencyLookup=useMemo(
    ()=>new Map(result?.idfTable.map(row=>[row.term,row.documentFrequency])??[]),
    [result],
  );

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(sources.length<2||sources.length>10||sources.some(item=>!item.source.trim()))return;
    setLoading(true);
    setError("");
    setResult(null);
    try{
      const limit=Math.max(1,Math.min(top,100));
      const requestBody={
        top:limit,
        documents:sources.map(item=>({
          sourceType:item.sourceType,
          source:item.source,
          language,
          keepStopwords,
          stopwordLists:parsedStopwords,
        })),
      };
      let nextResult:TfIdfResult;
      if(sources.every(item=>item.sourceType==="text")){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        const documents = await Promise.all(
          sources.map(item=>analyzeBagOfWords({text:item.source,language,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:uiLang})),
        );
        const analysis = calculateTfIdfCorpus(documents as TfIdfCorpusInput, limit);
        const languageResult = documents.every((doc)=>doc.language===documents[0].language) ? documents[0].language : "auto";
        nextResult={
          language:languageResult,
          documentCount:documents.length,
          top:limit,
          totalVocabularySize:analysis.totalVocabularySize,
          averageDocumentFrequency:analysis.averageDocumentFrequency,
          documents:analysis.documents,
          idfTable:analysis.idfTable,
        };
      }else{
        const response=await fetch("/api/v1/tf-idf",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify(requestBody),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
        if(!response.ok) throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
        nextResult=(payload as {result:TfIdfResult}).result;
      }
      setResult(nextResult);
      setQuery("");
      setActiveDoc(0);
      window.setTimeout(()=>document.getElementById("tfidf-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      setError(caught instanceof Error?caught.message:copy.failed);
    }finally{setLoading(false);}
  }

  function updateSource(id:number,patch:Partial<Omit<SourceDocument,"id">>){
    setSources(current=>current.map(item=>item.id===id?{...item,...patch}:item));
    setResult(null);
    setError("");
  }
  function selectSource(id:number,value:SourceType){
    updateSource(id,{sourceType:value,source:""});
  }
  function addSource(){
    setSources(current=>current.length>=10?current:[...current,{id:nextSourceId.current++,sourceType:"text",source:""}]);
    setResult(null);
    setError("");
  }
  function removeSource(id:number){
    setSources(current=>{
      if(current.length<=2)return current;
      return current.filter(item=>item.id!==id);
    });
    setActiveDoc(0);
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

  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);
  const ready=sources.length>=2&&sources.length<=10&&sources.every(item=>item.source.trim());

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
        <div className="section-head"><div><span>01</span><h2>{copy.corpus}</h2></div><small>{sources.length} {copy.ofTen}</small></div>
        <div className="tfidf-source-list">
          {sources.map((item,index)=>{
            const label=`${copy.document} ${String.fromCharCode(65+index)}`;
            return <div className="tfidf-source-card" key={item.id}>
              <div className="tfidf-source-head"><div><span>{String(index+1).padStart(2,"0")}</span><h3>{label}</h3></div>{sources.length>2&&<button type="button" onClick={()=>removeSource(item.id)} aria-label={`${copy.removeAria}: ${label}`}>{copy.remove}</button>}</div>
              <label className="field wide"><span>{copy.source}</span>
                <div className="tabs"><button type="button" className={item.sourceType==="text"?"active":""} onClick={()=>selectSource(item.id,"text")}>{copy.text}</button><button type="button" className={item.sourceType==="url"?"active":""} onClick={()=>selectSource(item.id,"url")}>{copy.url}</button></div>
                {item.sourceType==="text"
                  ?<><textarea value={item.source} onChange={event=>updateSource(item.id,{source:event.target.value})} placeholder={`${copy.paste} ${String.fromCharCode(65+index)}…`} aria-label={label}/><span>{formatNumber(item.source.length,uiLang)} {copy.characters}</span></>
                  :<><input className="url-input" type="url" value={item.source} onChange={event=>updateSource(item.id,{source:event.target.value})} placeholder={`https://example.com/document-${index+1}`} aria-label={`${copy.urlAria}: ${label}`} required/><p className="url-help">{copy.urlHelp}</p></>}
              </label>
            </div>;
          })}
        </div>
        <button className="tfidf-add-source" type="button" onClick={addSource} disabled={sources.length>=10}><span>＋</span>{sources.length>=10?copy.max:copy.add}</button>
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>{copy.settings}</h2></div></div>
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="es">Español</option></select><small>{copy.languageHelp}</small></label>
        <label className="field"><span>{copy.top}</span><input type="number" min="1" max="100" value={top} onChange={event=>setTop(Math.max(1,Math.min(100,Number(event.target.value)||100)))} /><small>{copy.topHelp}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <details className="stopword-editor"><summary>{copy.editStops} <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru","es"] as TextLanguage[]).map((item)=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>{copy.editorHelp}</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`${copy.editAria}: ${editorLanguage.toUpperCase()}`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} {copy.saved}</small><button type="button" onClick={resetStopwords}>{copy.restore}</button></div></div></details>
        <button className="analyze-button" disabled={loading||!ready}><span>{loading?copy.loading:copy.submit}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results" id="tfidf-results">
      <div className="results-title"><div><span>03</span><h2>{copy.results}</h2></div><p>{copy.detected}: <b>{result.language.toUpperCase()}</b></p></div>
      <div className="frequency-metrics tfidf-metrics">
        <div><span>{copy.documents}</span><strong>{result.documentCount}</strong><small>{copy.documentsNote}</small></div>
        <div><span>{copy.vocabulary}</span><strong>{formatNumber(result.totalVocabularySize,uiLang)}</strong><small>{copy.vocabularyNote}</small></div>
        <div><span>{copy.average}</span><strong>{result.averageDocumentFrequency.toFixed(2)}</strong><small>{copy.averageNote}</small></div>
        <div><span>{copy.topTerms}</span><strong>{result.top}</strong><small>{copy.topTermsNote}</small></div>
      </div>

      <div className="frequency-table-card">
        <div className="frequency-toolbar">
          <div className="frequency-view-tabs">
            {result.documents.map((_,index)=><button key={index} type="button" className={activeDoc===index?"active":""} onClick={()=>setActiveDoc(index)}>{copy.document} {index+1}</button>)}
          </div>
          <label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label>
          <div className="export-actions"><button type="button" onClick={exportCsv}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div>
        </div>
        <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>{copy.term}</th><th>{copy.count}</th><th>TF</th><th>{copy.documentFrequency}</th><th>IDF</th><th>TF-IDF</th></tr></thead>
            <tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.count,uiLang)}</td><td>{row.tf.toFixed(6)}</td><td>{documentFrequencyLookup.get(row.term)??"—"}</td><td>{row.idf.toFixed(3)}</td><td>{row.tfidf.toFixed(6)}</td></tr>)}</tbody>
          </table>
        </div>
        {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>

      <section className="tool-explainer">
        <p className="section-number">{copy.idfEye}</p>
        <h2>{copy.idfTitle}</h2>
        <div className="table-scroll">
          <table className="frequency-table">
            <thead><tr><th>#</th><th>{copy.term}</th><th>{copy.documentFrequency}</th><th>IDF</th></tr></thead>
            <tbody>{result.idfTable.slice(0,DISPLAY_LIMIT).map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.documentFrequency,uiLang)}</td><td>{row.idf.toFixed(3)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </section>}
  </>;
}
