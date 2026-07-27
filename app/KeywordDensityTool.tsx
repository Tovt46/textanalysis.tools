"use client";

import Link from "next/link";
import { FormEvent,useEffect,useMemo,useState } from "react";
import { analyzeKeywordDensity } from "./lib/analyze";
import { trackEvent } from "./lib/analytics";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import type { UiLang } from "./i18n";
import { BREADCRUMB_LABELS,formatNumber,localizedPath,localizeApiError } from "./localization";
import { DENSITY_UI } from "./tool-ui-copy";

type SourceType="text"|"url";
type Analysis=ReturnType<typeof analyzeKeywordDensity>;
type NgramSize=1|2|3;
type SortKey="term"|"count"|"percentage"|"per1000";
type SortDirection="asc"|"desc";
type LockedSettings={language:"auto"|TextLanguage;keepStopwords:boolean;trackedKeywords:string;stopwordLists:Record<TextLanguage,string[]>};
type Baseline={result:Analysis;label:string;settings:LockedSettings};

const STOPWORDS_KEY="bow-zipf-stopwords-v1";
const DISPLAY_LIMIT=500;

function rowsFor(result:Analysis,size:NgramSize){
  return size===1?result.unigrams:size===2?result.bigrams:result.trigrams;
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

export default function KeywordDensityTool({uiLang="en"}:{uiLang?:UiLang}){
  const copy=DENSITY_UI[uiLang];
  const [sourceType,setSourceType]=useState<SourceType>("text");
  const [source,setSource]=useState("");
  const [language,setLanguage]=useState<"auto"|TextLanguage>("auto");
  const [keepStopwords,setKeepStopwords]=useState(false);
  const [trackedKeywords,setTrackedKeywords]=useState("");
  const [editorLanguage,setEditorLanguage]=useState<TextLanguage>("en");
  const [stopwordLists,setStopwordLists]=useState<Record<TextLanguage,string>>({...DEFAULT_STOPWORD_TEXT});
  const [result,setResult]=useState<Analysis|null>(null);
  const [baseline,setBaseline]=useState<Baseline|null>(null);
  const [ngramSize,setNgramSize]=useState<NgramSize>(1);
  const [query,setQuery]=useState("");
  const [minimumCount,setMinimumCount]=useState(1);
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
    }catch{}},0);
    return()=>window.clearTimeout(timer);
  },[]);

  const parsedStopwords=useMemo(()=>({
    en:parseStopwordText(stopwordLists.en),
    uk:parseStopwordText(stopwordLists.uk),
    ru:parseStopwordText(stopwordLists.ru),
  }),[stopwordLists]);

  const activeRows=useMemo(()=>result?rowsFor(result,ngramSize):[],[ngramSize,result]);
  const filteredRows=useMemo(()=>{
    const normalized=query.trim().toLocaleLowerCase();
    return activeRows.filter(row=>row.count>=minimumCount&&(!normalized||row.term.includes(normalized))).sort((a,b)=>{
      const comparison=sortKey==="term"?a.term.localeCompare(b.term):a[sortKey]-b[sortKey];
      return sortDirection==="asc"?comparison:-comparison;
    });
  },[activeRows,minimumCount,query,sortDirection,sortKey]);

  const comparisonRows=useMemo(()=>{
    if(!baseline||!result)return [];
    const a=new Map(rowsFor(baseline.result,ngramSize).map(row=>[row.term,row]));
    const b=new Map(rowsFor(result,ngramSize).map(row=>[row.term,row]));
    return [...new Set([...a.keys(),...b.keys()])].map(term=>{
      const rowA=a.get(term),rowB=b.get(term);
      const percentageA=rowA?.percentage||0,percentageB=rowB?.percentage||0;
      return {term,countA:rowA?.count||0,countB:rowB?.count||0,percentageA,percentageB,delta:percentageB-percentageA};
    }).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta)||y.countB-x.countB).slice(0,100);
  },[baseline,ngramSize,result]);

  async function runAnalysis(event:FormEvent){
    event.preventDefault();
    if(!source.trim())return;
    setLoading(true);setError("");setResult(null);
    const settings=baseline?.settings||{language,keepStopwords,trackedKeywords,stopwordLists:parsedStopwords};
    trackEvent("analysis_started",{tool:"keyword_density_checker",source_type:sourceType,text_language:settings.language});
    if(sourceType==="url")trackEvent("url_analysis_started",{tool:"keyword_density_checker",text_language:settings.language});
    try{
      let next:Analysis;
      if(sourceType==="text"){
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        next=analyzeKeywordDensity({text:source,language:settings.language,keepStopwords:settings.keepStopwords,stopwordLists:settings.stopwordLists,uiLanguage:uiLang},settings.trackedKeywords);
      }else{
        const response=await fetch("/api/v1/keyword-density",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({sourceType,source,language:settings.language,keepStopwords:settings.keepStopwords,stopwordLists:settings.stopwordLists,trackedKeywords:settings.trackedKeywords}),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error(copy.invalid);}
        if(!response.ok)throw new Error(localizeApiError(payload,copy.urlFailed,uiLang));
        next=(payload as {result:Analysis}).result;
      }
      setResult(next);setQuery("");
      if(settings.language==="auto")setEditorLanguage(next.language);
      trackEvent("analysis_completed",{tool:"keyword_density_checker",source_type:sourceType,text_language:next.language,word_count:next.wordCount,tracked_keywords:next.trackedKeywords.length});
      if(baseline)trackEvent("comparison_completed",{tool:"keyword_density_checker",source_type:sourceType});
      window.setTimeout(()=>document.getElementById("density-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      const message=caught instanceof Error?caught.message:copy.failed;
      setError(message);
      trackEvent("analysis_error",{tool:"keyword_density_checker",source_type:sourceType,error_message:message.slice(0,100)});
    }finally{setLoading(false);}
  }

  function selectSourceType(value:SourceType){setSourceType(value);setSource("");setResult(null);setError("");}
  function changeLanguage(value:"auto"|TextLanguage){setLanguage(value);if(value!=="auto")setEditorLanguage(value);trackEvent("language_changed",{tool:"keyword_density_checker",text_language:value});}
  function changeEditorLanguage(value:TextLanguage){setEditorLanguage(value);setLanguage(value);trackEvent("language_changed",{tool:"keyword_density_checker",text_language:value,control:"stopword_editor"});}
  function updateStopwords(value:string){
    const next={...stopwordLists,[editorLanguage]:value};
    setStopwordLists(next);
    try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{}
  }
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[editorLanguage]);}
  function saveAsA(){
    if(!result)return;
    const settings={language,keepStopwords,trackedKeywords,stopwordLists:parsedStopwords};
    setBaseline({result,label:`${copy.labelA} · ${formatNumber(result.wordCount,uiLang)} ${copy.labelWords}`,settings});
    setResult(null);setSource("");setError("");
    trackEvent("comparison_result_saved",{tool:"keyword_density_checker",word_count:result.wordCount});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function clearBaseline(){setBaseline(null);setResult(null);setError("");}
  function changeSort(value:SortKey){
    if(value===sortKey)setSortDirection(current=>current==="asc"?"desc":"asc");
    else{setSortKey(value);setSortDirection(value==="term"?"asc":"desc");}
  }
  function exportCsv(){
    if(!result)return;
    const rows=[[` ${ngramSize}-gram`.trim(),"count","percentage","per_1000"],...activeRows.map(row=>[row.term,row.count,row.percentage.toFixed(6),row.per1000.toFixed(6)])];
    downloadFile(`keyword-density-${ngramSize}-gram.csv`,`\uFEFF${rows.map(row=>row.map(csvCell).join(",")).join("\n")}`,"text/csv;charset=utf-8");
    trackEvent("result_exported",{tool:"keyword_density_checker",format:"csv",row_count:activeRows.length,ngram_size:ngramSize});
  }
  function exportJson(){
    if(!result)return;
    downloadFile("keyword-density.json",JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2),"application/json;charset=utf-8");
    trackEvent("result_exported",{tool:"keyword_density_checker",format:"json",row_count:result.unigrams.length+result.bigrams.length+result.trigrams.length});
  }

  const shownRows=filteredRows.slice(0,DISPLAY_LIMIT);
  const sortArrow=(key:SortKey)=>sortKey===key?(sortDirection==="asc"?" ↑":" ↓"):"";
  const locked=Boolean(baseline);
  const activeTracked=result?.trackedKeywords||[];

  return <>
    <section className="tool-hero density-hero">
      <nav className="breadcrumbs" aria-label={BREADCRUMB_LABELS[uiLang]}><Link href={localizedPath(uiLang,"/")}>{copy.home}</Link><span>/</span><Link href={localizedPath(uiLang,"/tools")}>{copy.tools}</Link><span>/</span><span>{copy.breadcrumb}</span></nav>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.deck}</p>
      <div className="hero-note-row"><span className="privacy-note"><b/>{copy.privacy}</span><span className="ranking-note">{copy.ranking}</span></div>
    </section>

    <form className="frequency-workspace density-workspace" onSubmit={runAnalysis}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span>01</span><h2>{baseline?copy.sourceB:copy.source}</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} onClick={()=>selectSourceType("text")}>{copy.text}</button><button type="button" className={sourceType==="url"?"active":""} onClick={()=>selectSourceType("url")}>{copy.url}</button></div></div>
        {sourceType==="text"
          ?<div className="textarea-wrap"><textarea value={source} onChange={event=>setSource(event.target.value)} placeholder={copy.paste} aria-label={copy.textAria}/><span>{formatNumber(source.length,uiLang)} {copy.characters}</span></div>
          :<><input className="url-input" type="url" value={source} onChange={event=>setSource(event.target.value)} placeholder="https://example.com/page" aria-label={copy.urlAria} required/><p className="url-help">{copy.urlHelp}</p></>}
        <label className="field wide tracked-keywords"><span>{copy.tracked}</span><textarea value={trackedKeywords} disabled={locked} onChange={event=>setTrackedKeywords(event.target.value)} placeholder={copy.trackedPlaceholder}/><small>{locked?copy.trackedLocked:copy.trackedHelp}</small></label>
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>{copy.settings}</h2></div></div>
        {baseline&&<div className="density-baseline-pill"><span>A</span><p><b>{baseline.label}</b><small>{copy.baselineHelp}</small></p><button type="button" onClick={clearBaseline} aria-label={copy.removeA}>×</button></div>}
        <label className="field"><span>{copy.language}</span><select value={language} disabled={locked} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">{copy.detect}</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select><small>{copy.languageHelp}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} disabled={locked} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>{copy.includeStops}</b><small>{keepStopwords?copy.stopsOn:copy.stopsOff}</small></span></label>
        <details className="stopword-editor"><summary>{copy.editStops} <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map(item=><button type="button" key={item} disabled={locked} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>{copy.editorHelp}</p><textarea value={stopwordLists[editorLanguage]} disabled={locked} onChange={event=>updateStopwords(event.target.value)} aria-label={`${copy.editAria}: ${editorLanguage.toUpperCase()}`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} {copy.saved}</small><button type="button" disabled={locked} onClick={resetStopwords}>{copy.restore}</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?copy.loading:baseline?copy.submitB:copy.submit}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results density-results" id="density-results">
      <div className="results-title"><div><span>03</span><h2>{baseline?copy.resultsCompare:copy.results}</h2></div><div className="results-actions"><p>{copy.detected}: <b>{result.language.toUpperCase()}</b></p>{!baseline&&<button type="button" className="save-button" onClick={saveAsA}>{copy.saveA}</button>}</div></div>
      <div className="density-warning"><b>{copy.warning}</b><p>{copy.warningText}</p></div>
      <div className="frequency-metrics"><div><span>{copy.totalWords}</span><strong>{formatNumber(result.wordCount,uiLang)}</strong><small>{copy.totalWordsNote}</small></div><div><span>{copy.visible}</span><strong>{formatNumber(result.vocabularySize,uiLang)}</strong><small>{copy.visibleNote}</small></div><div><span>{copy.trackedCount}</span><strong>{formatNumber(result.trackedKeywords.length,uiLang)}</strong><small>{copy.trackedNote}</small></div></div>

      {activeTracked.length>0&&<div className="tracked-density-card"><div><p className="section-number">{copy.trackedEye}</p><h3>{copy.trackedTitle}</h3></div><div className="table-scroll"><table><thead><tr><th>{copy.keyword}</th><th>{copy.wordCount}</th><th>{copy.count}</th><th>{copy.percentage}</th><th>{copy.per1000}</th></tr></thead><tbody>{activeTracked.map(row=><tr key={row.term}><td><b>{row.term}</b></td><td>{row.n}</td><td>{row.count}</td><td>{row.percentage.toFixed(row.percentage<.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div></div>}

      {baseline&&<div className="density-comparison"><div className="density-comparison-head"><div><p className="section-number">{copy.compareEye}</p><h3>{copy.compareTitle}</h3></div><p>{copy.compareHelp}</p></div><div className="table-scroll"><table><thead><tr><th>{copy.term}</th><th>A</th><th>B</th><th>{copy.difference}</th></tr></thead><tbody>{comparisonRows.slice(0,30).map(row=><tr key={row.term}><td><b>{row.term}</b></td><td>{row.countA} · {row.percentageA.toFixed(2)}%</td><td>{row.countB} · {row.percentageB.toFixed(2)}%</td><td><span className={row.delta>0?"delta-up":row.delta<0?"delta-down":"delta-flat"}>{row.delta>0?"+":""}{row.delta.toFixed(2)} p.p.</span></td></tr>)}</tbody></table></div></div>}

      <div className="frequency-table-card density-table-card">
        <div className="ngram-tabs" role="group" aria-label={copy.phraseLength}>{([1,2,3] as NgramSize[]).map(size=><button type="button" key={size} className={ngramSize===size?"active":""} onClick={()=>setNgramSize(size)}>{size===1?copy.one:size===2?copy.two:copy.three}<span>{formatNumber(rowsFor(result,size).length,uiLang)}</span></button>)}</div>
        <div className="frequency-toolbar density-toolbar"><label><span>{copy.search}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder={copy.filter}/></label><label className="minimum-count"><span>{copy.minimum}</span><input type="number" min="1" max="9999" value={minimumCount} onChange={event=>setMinimumCount(Math.max(1,Number(event.target.value)||1))}/></label><div className="export-actions"><button type="button" onClick={exportCsv} disabled={!activeRows.length}>{copy.exportCsv}</button><button type="button" onClick={exportJson}>{copy.exportJson}</button></div></div>
        <div className="frequency-table-meta"><span>{formatNumber(filteredRows.length,uiLang)} {copy.matching}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>{copy.showing}</span>}</div>
        <div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th><button type="button" onClick={()=>changeSort("term")}>{copy.term}{sortArrow("term")}</button></th><th><button type="button" onClick={()=>changeSort("count")}>{copy.count}{sortArrow("count")}</button></th><th><button type="button" onClick={()=>changeSort("percentage")}>{copy.percentage}{sortArrow("percentage")}</button></th><th><button type="button" onClick={()=>changeSort("per1000")}>{copy.per1000}{sortArrow("per1000")}</button></th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{formatNumber(row.count,uiLang)}</td><td>{row.percentage.toFixed(row.percentage<.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div>
        {!filteredRows.length&&<p className="empty-filter">{copy.noMatch}</p>}
      </div>
    </section>}
  </>;
}
