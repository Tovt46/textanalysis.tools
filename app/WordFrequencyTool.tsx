"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import type { analyzeWordFrequency } from "./lib/analyze";
import { trackEvent } from "./lib/analytics";
import { AnalysisProgress,hasPartialBrowserResult,isAnalysisAbort,PartialResultNotice,useBrowserAnalysis,validateBrowserInputs } from "./lib/browser-analysis";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { WORD_FREQUENCY_UI } from "./tool-ui-copy";
import { CopyResultAction,ExampleAction,type ToolExample } from "./ToolWorkflowActions";
import "./word-frequency-redesign.css";

type SourceType="text"|"url";
type Analysis=ReturnType<typeof analyzeWordFrequency>;
type SortKey="term"|"count"|"percentage"|"per1000";
type SortDirection="asc"|"desc";

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=500;
const WORKBENCH_COPY={
  en:{ready:"Your words, in focus",start:"Add your text and run the analysis. Your frequency table will appear here.",clear:"Clear",cancel:"Cancel",waiting:"Ready when you are",complete:"Analysis complete"},
  ru:{ready:"Каждое слово в фокусе",start:"Добавьте текст и запустите анализ. Здесь появится таблица частотности.",clear:"Очистить",cancel:"Отменить",waiting:"Можно начинать",complete:"Анализ завершён"},
  uk:{ready:"Кожне слово у фокусі",start:"Додайте текст і запустіть аналіз. Тут з’явиться таблиця частотності.",clear:"Очистити",cancel:"Скасувати",waiting:"Можна починати",complete:"Аналіз завершено"},
  es:{ready:"Cada palabra, en foco",start:"Añade tu texto y ejecuta el análisis. La tabla de frecuencias aparecerá aquí.",clear:"Limpiar",cancel:"Cancelar",waiting:"Todo listo para empezar",complete:"Análisis completado"},
} satisfies Record<UiLang,Record<string,string>>;

function downloadFile(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

function csvCell(value:string|number){
  const text=String(value);
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

export default function WordFrequencyTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=WORD_FREQUENCY_UI[uiLang];
  const workbenchCopy=WORKBENCH_COPY[uiLang];
  const [sourceType,setSourceType]=useState<SourceType>("text");
  const [source,setSource]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [keepNumbers,setKeepNumbers]=useState(false);
  const [minimumTokenLength,setMinimumTokenLength]=useState(1);
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<Analysis|null>(null);
  const [query,setQuery]=useState("");
  const [sortKey,setSortKey]=useState<SortKey>("count");
  const [sortDirection,setSortDirection]=useState<SortDirection>("desc");
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
      }catch{}
    },0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
    es:parseStopwordText(stopwordLists.es),
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
    setError("");setResult(null);
    trackEvent("analysis_started",{tool:"word_frequency_counter",source_type:sourceType,text_language:language});
    if(sourceType==="url")trackEvent("url_analysis_started",{tool:"word_frequency_counter",text_language:language});
    try{
      let next:Analysis;
      if(sourceType==="text"){
        validateBrowserInputs([source],uiLang);
        next=await runWorker<Analysis>("word-frequency",{text:source,language,keepStopwords,keepNumbers,minimumTokenLength,stopwordLists:parsedStopwords,uiLanguage:uiLang});
      }else{
        next=await runRemote(async signal=>{
          const response=await fetch("/api/v1/word-frequency",{
            method:"POST",signal,
            headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({sourceType,source,language,keepStopwords,keepNumbers,minimumTokenLength,stopwordLists:parsedStopwords}),
          });
          const raw=await response.text();
          let payload:unknown;
          try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
          if(!response.ok)throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
          return (payload as {result:Analysis}).result;
        });
      }
      setResult(next);setQuery("");
      if(language==="auto")setEditorLanguage(next.language);
      trackEvent("analysis_completed",{tool:"word_frequency_counter",source_type:sourceType,text_language:next.language,word_count:next.tokenCount,unique_words:next.vocabularySize});
      if(window.matchMedia("(max-width: 760px)").matches){
        window.setTimeout(()=>document.getElementById("frequency-results")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}),50);
      }
    }catch(caught){
      if(isAnalysisAbort(caught))return;
      const message=caught instanceof Error?caught.message:copy.failed;
      setError(message);
      trackEvent("analysis_error",{tool:"word_frequency_counter",source_type:sourceType,error_message:message.slice(0,100)});
    }
  }

  function selectSourceType(value:SourceType){cancel();setSourceType(value);setSource("");setResult(null);setError("");}
  function loadExample(example:ToolExample){
    cancel();setSourceType("text");setSource(example.sources[0]);setLanguage(uiLang);setEditorLanguage(uiLang);setResult(null);setError("");
  }
  function changeLanguage(value:"auto"|TextLanguage){cancel();setResult(null);setLanguage(value);if(value!=="auto")setEditorLanguage(value);trackEvent("language_changed",{tool:"word_frequency_counter",text_language:value});}
  function changeEditorLanguage(value:TextLanguage){cancel();setResult(null);setEditorLanguage(value);setLanguage(value);trackEvent("language_changed",{tool:"word_frequency_counter",text_language:value,control:"stopword_editor"});}
  function updateStopwords(value:string){
    cancel();setResult(null);
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

  return <div className="word-frequency-workbench">
    <section className="tool-hero frequency-hero">
      <nav className="breadcrumbs" aria-label={BREADCRUMB_LABELS[uiLang]}><Link href={localizedPath(uiLang,"/")}>{copy.home}</Link><span>/</span><Link href={localizedPath(uiLang,"/tools")}>{copy.tools}</Link><span>/</span><span>{copy.breadcrumb}</span></nav>
      <h1>{copy.title}</h1>
      <p>{copy.deck}</p>
      <span className="privacy-note"><b/>{copy.privacy}</span>
    </section>

    <div className="frequency-metrics" aria-label={copy.results}>
      <div><span>{copy.words}</span><strong>{result?formatNumber(result.tokenCount,uiLang):"—"}</strong><small>{copy.wordsNote}</small></div>
      <div><span>{copy.unique}</span><strong>{result?formatNumber(result.vocabularySize,uiLang):"—"}</strong><small>{copy.uniqueNote}</small></div>
      <div><span>{copy.activeStops}</span><strong>{result?(keepStopwords?copy.off:formatNumber(result.stopwordCount,uiLang)):"—"}</strong><small>{keepStopwords?copy.allKept:copy.listApplied}</small></div>
      <div><span>{copy.detected}</span><strong>{result?result.language.toUpperCase():"—"}</strong><small role="status" aria-live="polite">{loading?copy.loading:result?workbenchCopy.complete:workbenchCopy.waiting}</small></div>
    </div>

    <div className="frequency-workbench-grid">
    <form className="frequency-workspace" onSubmit={runAnalysis} aria-busy={loading}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span aria-hidden="true">Aa</span><h2>{copy.source}</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} aria-pressed={sourceType==="text"} onClick={()=>selectSourceType("text")}>{copy.text}</button><button type="button" className={sourceType==="url"?"active":""} aria-pressed={sourceType==="url"} onClick={()=>selectSourceType("url")}>{copy.url}</button></div></div>
        <div className="frequency-source-body">
        {sourceType==="text"
          ?<div className="textarea-wrap"><textarea value={source} onChange={event=>{cancel();setSource(event.target.value);setResult(null);setError("");}} placeholder={copy.paste} aria-label={copy.textAria} spellCheck={false}/></div>
          :<><input className="url-input" type="url" value={source} onChange={event=>{cancel();setSource(event.target.value);setResult(null);setError("");}} placeholder="https://example.com/page" aria-label={copy.urlAria} required/><p className="url-help">{copy.urlHelp}</p></>}
        <div className="frequency-source-meta"><span>{sourceType==="text"?`${formatNumber(source.length,uiLang)} ${copy.characters}`:copy.url}</span><button type="button" onClick={()=>{cancel();setSource("");setResult(null);setError("");}} disabled={!source}>{workbenchCopy.clear}</button></div>
        </div>
        <div className="frequency-source-actions">
        <ExampleAction tool="word-frequency" locale={uiLang} onLoad={loadExample}/>
        <div className="frequency-submit-actions">
          {loading&&<button type="button" className="frequency-cancel" onClick={cancel}>{workbenchCopy.cancel}</button>}
          <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?copy.loading:copy.submit}</span><b aria-hidden="true">→</b></button>
        </div>
        </div>
        <AnalysisProgress active={loading} progress={progress} label={copy.loading}/>
        {error&&<p className="error" role="alert">{error}</p>}
      </section>

      <details className="frequency-settings-card">
        <summary><span>{copy.settings}</span><span className="frequency-settings-chevron" aria-hidden="true">⌄</span></summary>
        <div className="frequency-settings-body">
        <label className="field"><span>{copy.language}</span><select value={language} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="es">Español</option></select><small>{copy.languageHelp}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={event=>{cancel();setResult(null);setKeepStopwords(event.target.checked);}}/><span><b>{copy.keepStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <label className="check"><input type="checkbox" checked={keepNumbers} onChange={event=>{cancel();setResult(null);setKeepNumbers(event.target.checked);}}/><span><b>{copy.keepNumbers}</b><small>{keepNumbers?copy.numbersOn:copy.numbersOff}</small></span></label>
        <label className="field"><span>{copy.minimumTokenLength}</span><input type="number" min="1" max="100" value={minimumTokenLength} onChange={event=>{cancel();setResult(null);setMinimumTokenLength(Math.max(1,Math.min(100,Number(event.target.value)||1)));}}/><small>{copy.minimumTokenLengthHelp}</small></label>
        <details className="stopword-editor"><summary>{copy.editStops} <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru","es"] as TextLanguage[]).map(item=><button type="button" key={item} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>{copy.editorHelp}</p><textarea value={stopwordLists[editorLanguage]} onChange={event=>updateStopwords(event.target.value)} aria-label={`${copy.editAria}: ${editorLanguage.toUpperCase()}`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} {copy.saved}</small><button type="button" onClick={resetStopwords}>{copy.restore}</button></div></div></details>
        </div>
      </details>
    </form>

    <section className="frequency-results frequency-table-card" id="frequency-results" aria-label={copy.results}>
      <div className="results-title"><h2>{copy.results}</h2>{result&&<CopyResultAction tool="word-frequency" locale={uiLang} value={result}/>}</div>
      {result&&<PartialResultNotice partial={hasPartialBrowserResult(result)} locale={uiLang}/>}
        <div className="frequency-toolbar">
          <label><span className="frequency-visually-hidden">{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter} disabled={!result}/></label>
          <div className="export-actions"><button type="button" onClick={exportCsv} disabled={!result?.rows.length} aria-label={copy.exportCsv}>CSV <span aria-hidden="true">↓</span></button><button type="button" onClick={exportJson} disabled={!result?.rows.length} aria-label={copy.exportJson}>JSON <span aria-hidden="true">↓</span></button></div>
        </div>
        {!result?<div className="frequency-waiting" aria-busy={loading}>
          <div className="frequency-placeholder-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div>
          <h3>{loading?copy.loading:workbenchCopy.ready}</h3><p>{workbenchCopy.start}</p>
        </div>:result.rows.length===0?<div className="no-frequency-results"><h3>{copy.emptyTitle}</h3><p>{copy.emptyText}</p></div>:<>
          <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label={copy.results}><table className="frequency-table"><thead><tr><th scope="col">#</th><th scope="col" aria-sort={sortKey==="term"?(sortDirection==="asc"?"ascending":"descending"):undefined}><button type="button" onClick={()=>changeSort("term")}>{copy.word}{sortArrow("term")}</button></th><th scope="col" aria-sort={sortKey==="count"?(sortDirection==="asc"?"ascending":"descending"):undefined}><button type="button" onClick={()=>changeSort("count")}>{copy.count}{sortArrow("count")}</button></th><th scope="col" aria-sort={sortKey==="percentage"?(sortDirection==="asc"?"ascending":"descending"):undefined}><button type="button" onClick={()=>changeSort("percentage")}>{copy.percentage}{sortArrow("percentage")}</button></th><th scope="col" aria-sort={sortKey==="per1000"?(sortDirection==="asc"?"ascending":"descending"):undefined}><button type="button" onClick={()=>changeSort("per1000")}>{copy.per1000}{sortArrow("per1000")}</button></th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b><span className="frequency-term-bar" style={{width:`${Math.min(100,row.count/Math.max(1,result.rows[0]?.count??1)*100)}%`}} aria-hidden="true"/></td><td>{formatNumber(row.count,uiLang)}</td><td>{row.percentage.toFixed(row.percentage<0.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div>
          {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
        </>}
      <p className="frequency-denominator">{copy.percentage} = {copy.count} ÷ {copy.words.toLocaleLowerCase()} × 100{result&&<span> · {copy.words}: {formatNumber(result.tokenCount,uiLang)}</span>}</p>
    </section>
    </div>
  </div>;
}
