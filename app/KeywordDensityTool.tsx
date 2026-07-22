"use client";

import Link from "next/link";
import { FormEvent,useEffect,useMemo,useState } from "react";
import { analyzeKeywordDensity } from "./lib/analyze";
import { trackEvent } from "./lib/analytics";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";

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

export default function KeywordDensityTool(){
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
        next=analyzeKeywordDensity({text:source,language:settings.language,keepStopwords:settings.keepStopwords,stopwordLists:settings.stopwordLists,uiLanguage:"en"},settings.trackedKeywords);
      }else{
        const response=await fetch("/api/keyword-density",{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({sourceType,source,language:settings.language,keepStopwords:settings.keepStopwords,stopwordLists:settings.stopwordLists,trackedKeywords:settings.trackedKeywords}),
        });
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error("The service returned an invalid response. Paste the page text instead.");}
        if(!response.ok)throw new Error(errorMessage(payload,"The page could not be analyzed. Paste its text instead."));
        next=(payload as {result:Analysis}).result;
      }
      setResult(next);setQuery("");
      if(settings.language==="auto")setEditorLanguage(next.language);
      trackEvent("analysis_completed",{tool:"keyword_density_checker",source_type:sourceType,text_language:next.language,word_count:next.wordCount,tracked_keywords:next.trackedKeywords.length});
      if(baseline)trackEvent("comparison_completed",{tool:"keyword_density_checker",source_type:sourceType});
      window.setTimeout(()=>document.getElementById("density-results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(caught){
      const message=caught instanceof Error?caught.message:"The text could not be analyzed.";
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
    setBaseline({result,label:`Analysis A · ${result.wordCount.toLocaleString("en-US")} words`,settings});
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
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Analyzer</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Keyword density checker</span></nav>
      <p className="eyebrow">FREE SEO TEXT TOOL · 1–3 WORD PHRASES</p>
      <h1>Keyword Density Checker</h1>
      <p>Measure exact keyword and phrase frequency in text or a webpage. Review one-word terms, bigrams, and trigrams, track important phrases, or compare a draft with another page.</p>
      <div className="hero-note-row"><span className="privacy-note"><b/>Pasted text stays in your browser</span><span className="ranking-note">Density is a measurement, not a ranking score.</span></div>
    </section>

    <form className="frequency-workspace density-workspace" onSubmit={runAnalysis}>
      <section className="frequency-input-card">
        <div className="section-head"><div><span>01</span><h2>{baseline?"Draft or page B":"Text or webpage"}</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} onClick={()=>selectSourceType("text")}>Text</button><button type="button" className={sourceType==="url"?"active":""} onClick={()=>selectSourceType("url")}>URL</button></div></div>
        {sourceType==="text"
          ?<div className="textarea-wrap"><textarea value={source} onChange={event=>setSource(event.target.value)} placeholder="Paste text or HTML…" aria-label="Text to check keyword density"/><span>{source.length.toLocaleString("en-US")} characters</span></div>
          :<><input className="url-input" type="url" value={source} onChange={event=>setSource(event.target.value)} placeholder="https://example.com/page" aria-label="Webpage URL" required/><p className="url-help">We fetch public HTTP/HTTPS pages and remove markup before counting. Some sites block automated requests.</p></>}
        <label className="field wide tracked-keywords"><span>Tracked keywords and phrases</span><textarea value={trackedKeywords} disabled={locked} onChange={event=>setTrackedKeywords(event.target.value)} placeholder="keyword density, content analysis, SEO tool"/><small>{locked?"Using the phrases saved with result A.":"Separate phrases with commas, semicolons, or new lines. Exact consecutive matches are counted."}</small></label>
      </section>

      <aside className="frequency-settings-card">
        <div className="section-head simple"><div><span>02</span><h2>Density settings</h2></div></div>
        {baseline&&<div className="density-baseline-pill"><span>A</span><p><b>{baseline.label}</b><small>Settings are locked for a fair comparison.</small></p><button type="button" onClick={clearBaseline} aria-label="Remove comparison result A">×</button></div>}
        <label className="field"><span>Text language</span><select value={language} disabled={locked} onChange={event=>changeLanguage(event.target.value as "auto"|TextLanguage)}><option value="auto">Detect automatically</option><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option></select><small>Controls the editable stop-word list used to reduce table noise.</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} disabled={locked} onChange={event=>setKeepStopwords(event.target.checked)}/><span><b>Include stop words in tables</b><small>{keepStopwords?"All function words and phrases are shown.":"Function-word-only rows are hidden; exact phrase order is preserved."}</small></span></label>
        <details className="stopword-editor"><summary>Edit stop words <span>{parsedStopwords[editorLanguage].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as TextLanguage[]).map(item=><button type="button" key={item} disabled={locked} className={editorLanguage===item?"active":""} onClick={()=>changeEditorLanguage(item)}>{item.toUpperCase()}</button>)}</div><p>Stop words hide table noise only. They do not change total word count or exact tracked-keyword counts.</p><textarea value={stopwordLists[editorLanguage]} disabled={locked} onChange={event=>updateStopwords(event.target.value)} aria-label={`Edit ${editorLanguage.toUpperCase()} stop words`}/><div className="stopword-actions"><small>{parsedStopwords[editorLanguage].length} words saved locally</small><button type="button" disabled={locked} onClick={resetStopwords}>Restore defaults</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?"Checking…":baseline?"Analyze as B":"Check keyword density"}</span><b>→</b></button>
        {error&&<p className="error" role="alert">{error}</p>}
      </aside>
    </form>

    {result&&<section className="frequency-results density-results" id="density-results">
      <div className="results-title"><div><span>03</span><h2>{baseline?"Keyword density: B vs A":"Keyword density results"}</h2></div><div className="results-actions"><p>Detected language: <b>{result.language.toUpperCase()}</b></p>{!baseline&&<button type="button" className="save-button" onClick={saveAsA}>Save as comparison A</button>}</div></div>
      <div className="density-warning"><b>Use frequency as evidence, not a target</b><p>There is no universal “ideal” keyword density. Check whether repetition sounds natural and whether the page satisfies its purpose.</p></div>
      <div className="frequency-metrics"><div><span>Total words</span><strong>{result.wordCount.toLocaleString("en-US")}</strong><small>the denominator for every percentage</small></div><div><span>Visible unique terms</span><strong>{result.vocabularySize.toLocaleString("en-US")}</strong><small>after the table stop-word rule</small></div><div><span>Tracked phrases</span><strong>{result.trackedKeywords.length.toLocaleString("en-US")}</strong><small>exact consecutive matches</small></div></div>

      {activeTracked.length>0&&<div className="tracked-density-card"><div><p className="section-number">TRACKED KEYWORDS</p><h3>Exact phrase checks</h3></div><div className="table-scroll"><table><thead><tr><th>Keyword or phrase</th><th>Words</th><th>Count</th><th>Percentage</th><th>Per 1,000</th></tr></thead><tbody>{activeTracked.map(row=><tr key={row.term}><td><b>{row.term}</b></td><td>{row.n}</td><td>{row.count}</td><td>{row.percentage.toFixed(row.percentage<.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div></div>}

      {baseline&&<div className="density-comparison"><div className="density-comparison-head"><div><p className="section-number">A/B COMPARISON</p><h3>Largest density changes</h3></div><p>Difference is B minus A in percentage points. A large change is a review signal, not an instruction to add or remove terms.</p></div><div className="table-scroll"><table><thead><tr><th>Term</th><th>A</th><th>B</th><th>B − A</th></tr></thead><tbody>{comparisonRows.slice(0,30).map(row=><tr key={row.term}><td><b>{row.term}</b></td><td>{row.countA} · {row.percentageA.toFixed(2)}%</td><td>{row.countB} · {row.percentageB.toFixed(2)}%</td><td><span className={row.delta>0?"delta-up":row.delta<0?"delta-down":"delta-flat"}>{row.delta>0?"+":""}{row.delta.toFixed(2)} p.p.</span></td></tr>)}</tbody></table></div></div>}

      <div className="frequency-table-card density-table-card">
        <div className="ngram-tabs" role="group" aria-label="Phrase length">{([1,2,3] as NgramSize[]).map(size=><button type="button" key={size} className={ngramSize===size?"active":""} onClick={()=>setNgramSize(size)}>{size===1?"1 word":size===2?"2 words":"3 words"}<span>{rowsFor(result,size).length.toLocaleString("en-US")}</span></button>)}</div>
        <div className="frequency-toolbar density-toolbar"><label><span>Search this table</span><input type="search" value={query} onChange={event=>setQuery(event.target.value.toLocaleLowerCase())} placeholder="Filter terms…"/></label><label className="minimum-count"><span>Minimum count</span><input type="number" min="1" max="9999" value={minimumCount} onChange={event=>setMinimumCount(Math.max(1,Number(event.target.value)||1))}/></label><div className="export-actions"><button type="button" onClick={exportCsv} disabled={!activeRows.length}>Export CSV</button><button type="button" onClick={exportJson}>Export JSON</button></div></div>
        <div className="frequency-table-meta"><span>{filteredRows.length.toLocaleString("en-US")} matching {ngramSize===1?"words":ngramSize===2?"bigrams":"trigrams"}</span>{filteredRows.length>DISPLAY_LIMIT&&<span>Showing the first {DISPLAY_LIMIT}; exports include the full table.</span>}</div>
        <div className="table-scroll"><table className="frequency-table"><thead><tr><th>#</th><th><button type="button" onClick={()=>changeSort("term")}>Term{sortArrow("term")}</button></th><th><button type="button" onClick={()=>changeSort("count")}>Count{sortArrow("count")}</button></th><th><button type="button" onClick={()=>changeSort("percentage")}>Percentage{sortArrow("percentage")}</button></th><th><button type="button" onClick={()=>changeSort("per1000")}>Per 1,000{sortArrow("per1000")}</button></th></tr></thead><tbody>{shownRows.map((row,index)=><tr key={row.term}><td>{index+1}</td><td><b>{row.term}</b></td><td>{row.count.toLocaleString("en-US")}</td><td>{row.percentage.toFixed(row.percentage<.1?3:2)}%</td><td>{row.per1000.toFixed(row.per1000<1?2:1)}</td></tr>)}</tbody></table></div>
        {!filteredRows.length&&<p className="empty-filter">No terms match the current filters.</p>}
      </div>
    </section>}
  </>;
}
