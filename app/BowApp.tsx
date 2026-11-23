"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { LOCALES, translate, type UiLang } from "./i18n";
import { SiteFooter,SiteHeader } from "./SiteChrome";
import { AnalysisProgress,isAnalysisAbort,useBrowserAnalysis,validateBrowserInputs } from "./lib/browser-analysis";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import { trackEvent } from "./lib/analytics";
import { CopyResultAction,ExampleAction,type ToolExample } from "./ToolWorkflowActions";
import { useSourceInput } from "./lib/use-source-input";
import { compareZipfTerms,type TermCounts,type ZipfCounts } from "./lib/zipf-comparison";
import type { FrequencyCount } from "./lib/comparison";

type Zone = "above" | "within" | "below" | "sparse-tail";
type ZipfRow = { rank:number; term:string; actualCount:number; expectedCount:number; ratio:number; zone:Zone };
type FocusRow = { term:string; count:number; per1000:number };
type Analysis = {
  language:string; tokenCount:number; vocabularySize:number; fittedExponent:number; rSquared:number;
  zoneCounts:{above:number;within:number;below:number;sparseTail:number};
  rows:ZipfRow[]; bigrams:{ term:string; count:number; share:number }[]; focusCoverage:FocusRow[]; stopwordCount:number; notes:string[];
};
type Lang = TextLanguage;
type AnalysisSettings = { language:string; focus:string; top:number; tolerance:number; keepStopwords:boolean; stopwordLists:Record<Lang,string[]> };
type AnalysisOutput = { result:Analysis; counts?:ZipfCounts };
type SavedResult = AnalysisOutput & { version:3; settings:AnalysisSettings; savedAt:string; label:string };
type ApiError = { code?:unknown; message?:unknown };

const CACHE_KEY = "bow-zipf-baseline-v3";
const STOPWORDS_KEY = "bow-zipf-stopwords-v1";
type T = (key:string, vars?:Record<string,string|number>)=>string;

function objectValue(value:unknown):Record<string,unknown>|null{
  return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function readVersionedAnalysis(payload:unknown):AnalysisOutput|null{
  const envelope=objectValue(payload);
  const result=objectValue(envelope?.result);
  const zones=objectValue(result?.zoneCounts);
  if(
    !envelope||typeof envelope.apiVersion!=="string"||envelope.storage!=="none"||!result||!zones||
    !["en","ru","uk","es"].includes(String(result.language))||
    typeof result.tokenCount!=="number"||typeof result.vocabularySize!=="number"||
    typeof result.fittedExponent!=="number"||typeof result.rSquared!=="number"||
    typeof zones.above!=="number"||typeof zones.within!=="number"||
    typeof zones.below!=="number"||typeof zones.sparseTail!=="number"||
    !Array.isArray(result.rows)||!Array.isArray(result.bigrams)||
    !Array.isArray(result.focusCoverage)||typeof result.stopwordCount!=="number"||
    !Array.isArray(result.notes)
  )return null;
  const counts=objectValue(envelope.counts);
  const validEntries=(entries:unknown):entries is TermCounts=>Array.isArray(entries)&&entries.every(entry=>
    Array.isArray(entry)&&typeof entry[0]==="string"&&Number.isSafeInteger(entry[1])&&entry[1]>0
  );
  return {result:result as unknown as Analysis,...(counts&&validEntries(counts.words)&&validEntries(counts.bigrams)?{counts:{words:counts.words,bigrams:counts.bigrams}}:{})};
}

function localizedApiError(payload:unknown,status:number,t:T){
  const envelope=objectValue(payload);
  const error=objectValue(envelope?.error) as ApiError|null;
  const code=typeof error?.code==="string"?error.code:"";
  if(code==="MISSING_SOURCE")return t("addSource");
  if(code==="INVALID_URL"||code==="UNSAFE_URL")return t("badUrl");
  if(code==="REQUEST_TOO_LARGE"||code==="TEXT_TOO_LARGE"||code==="REMOTE_CONTENT_TOO_LARGE")return t("tooLarge");
  if(code==="INSUFFICIENT_TEXT")return t("tooLittle");
  if(code==="FETCH_FAILED"||code==="REMOTE_FETCH_TIMEOUT"||code==="REMOTE_DNS_LOOKUP_FAILED"||code==="REMOTE_REQUEST_FAILED"||code==="REMOTE_CONTENT_READ_FAILED"||code==="REMOTE_INVALID_REDIRECT"||code==="REMOTE_HTTP_ERROR"||code==="TOO_MANY_REDIRECTS"||code==="UNSUPPORTED_REMOTE_TYPE")return t("requestBlocked");
  if(status===413)return t("tooLarge");
  return t("failed");
}

function Tip({ children }: { children:React.ReactNode }) {
  const [open,setOpen]=useState(false);
  const rootRef=useRef<HTMLSpanElement>(null);
  const tooltipId=useId();

  useEffect(()=>{
    if(!open)return;
    function closeOutside(event:PointerEvent){if(!rootRef.current?.contains(event.target as Node))setOpen(false);}
    function closeOnEscape(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);rootRef.current?.querySelector("button")?.focus();}}
    document.addEventListener("pointerdown",closeOutside);
    document.addEventListener("keydown",closeOnEscape);
    return()=>{document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",closeOnEscape);};
  },[open]);

  return <span className="tip-wrap" data-open={open} ref={rootRef}>
    <button type="button" className="tip" aria-label={String(children)} aria-describedby={tooltipId} aria-expanded={open} onClick={event=>{event.preventDefault();event.stopPropagation();setOpen(value=>!value);}}>?</button>
    <span className="tooltip-popup" id={tooltipId} role="tooltip">{children}</span>
  </span>;
}

function Metric({ label, value, explanation }: { label:string; value:string; explanation:string }) {
  return <div className="metric simple-metric"><span>{label}<Tip>{explanation}</Tip></span><strong>{value}</strong><small>{explanation}</small></div>;
}

function ZoneBadge({ zone, t }: { zone:Zone; t:T }) {
  const labels:Record<Zone,string> = { above:t("above"), within:t("within"), below:t("below"), "sparse-tail":t("tail") };
  return <span className={`zone zone-${zone}`}>{labels[zone]}</span>;
}

function ZoneGuide({ tolerance, t }: { tolerance:number; t:T }) {
  return <div className="zone-guide">
    <div><ZoneBadge zone="within" t={t}/><p>{t("withinDesc",{value:tolerance.toFixed(1)})}</p></div>
    <div><ZoneBadge zone="above" t={t}/><p>{t("aboveDesc",{value:tolerance.toFixed(1)})}</p></div>
    <div><ZoneBadge zone="below" t={t}/><p>{t("belowDesc")}</p></div>
    <div><ZoneBadge zone="sparse-tail" t={t}/><p>{t("tailDesc")}</p></div>
  </div>;
}

function ZipfChart({ rows, t }: { rows:ZipfRow[]; t:T }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || rows.length < 2) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(dpr,dpr);
      const w=rect.width,h=rect.height,p={l:42,r:16,t:18,b:30},pw=w-p.l-p.r,ph=h-p.t-p.b;
      const maxRank=Math.max(...rows.map(r=>r.rank)),maxCount=Math.max(...rows.map(r=>r.actualCount));
      const x=(rank:number)=>p.l+(Math.log(rank)/Math.log(maxRank))*pw;
      const y=(count:number)=>p.t+(1-Math.log(Math.max(count,1))/Math.log(Math.max(maxCount,2)))*ph;
      const palette=getComputedStyle(document.documentElement);
      const tone=(name:string)=>palette.getPropertyValue(name).trim();
      ctx.clearRect(0,0,w,h); ctx.strokeStyle=tone("--line"); ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const gy=p.t+(ph/4)*i;ctx.beginPath();ctx.moveTo(p.l,gy);ctx.lineTo(w-p.r,gy);ctx.stroke();}
      const line=(key:"actualCount"|"expectedCount",color:string,dash=false)=>{ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(r.rank),y(r[key])):ctx.moveTo(x(r.rank),y(r[key])));ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash?[6,5]:[]);ctx.stroke();ctx.setLineDash([]);};
      line("expectedCount",tone("--faint"),true); line("actualCount",tone("--accent"));
      rows.forEach(r=>{ctx.beginPath();ctx.arc(x(r.rank),y(r.actualCount),3,0,Math.PI*2);ctx.fillStyle=r.zone==="above"?tone("--warning"):tone("--accent");ctx.fill();});
      ctx.fillStyle=tone("--muted");ctx.font="10px ui-monospace, monospace";ctx.fillText(t("frequency"),2,12);ctx.fillText(t("rankArrow"),w-62,h-6);
    };
    draw(); const observer=new ResizeObserver(draw);observer.observe(canvas);
    const themeObserver=new MutationObserver(draw);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
    return()=>{observer.disconnect();themeObserver.disconnect();};
  },[rows,t]);
  return <canvas ref={ref} className="chart compact-chart" aria-label={t("chartTitle")} />;
}

function FrequencyComparisonTable({ title, a, b, totalA, totalB, countsA, countsB, t, open=false }: {
  title:string; a:FrequencyCount[]; b:FrequencyCount[]; totalA:number; totalB:number; countsA?:TermCounts; countsB?:TermCounts; t:T; open?:boolean;
}) {
  const rows=compareZipfTerms(a,b,totalA,totalB,countsA,countsB);
  const cell=(count:number|null,rate:number|null)=>count===null||rate===null
    ? <><b>—</b><small>{t("outsideTop")}</small></>
    : <><b>×{count}</b><small>{(rate/10).toFixed(2)}%</small><small>{rate.toFixed(1)} {t("per1000")}</small></>;
  return <details className="ab-frequency" open={open}><summary>{title}<span>{rows.length} {t("rows")}</span></summary><div className="ab-table-scroll"><table className="ab-table"><thead><tr><th>{t("term")}</th><th>{t("resultA")}</th><th>{t("resultBLabel")}</th><th>{t("difference")}</th></tr></thead><tbody>{rows.map(({term,countA,countB,per1000A,per1000B,delta})=>
    <tr key={term}><td><b>{term}</b></td><td>{cell(countA,per1000A)}</td><td>{cell(countB,per1000B)}</td><td>{delta===null?"—":<>
      <span className={delta>0?"delta-up":delta<0?"delta-down":"delta-flat"}>{delta>0?"+":""}{(delta/10).toFixed(2)} {t("percentagePoints")}</span><small>{delta>0?"+":""}{delta.toFixed(1)} {t("per1000")}</small>
    </>}</td></tr>)}</tbody></table></div></details>;
}

function Comparison({ baseline, current, counts, onClear, t, uiLang }: { baseline:SavedResult; current:Analysis; counts?:ZipfCounts; onClear:()=>void; t:T; uiLang:UiLang }) {
  const metrics=[
    [t("filteredWords"),baseline.result.tokenCount,current.tokenCount,t("filteredWordsHelp")],
    [t("uniqueWords"),baseline.result.vocabularySize,current.vocabularySize,t("uniqueWordsHelp")],
    [t("zipfIndicator"),baseline.result.fittedExponent.toFixed(2),current.fittedExponent.toFixed(2),t("zipfIndicatorHelp")],
    [t("aboveIndicator"),baseline.result.zoneCounts.above,current.zoneCounts.above,t("aboveIndicatorHelp")],
  ];
  const terms=[...new Set([...baseline.result.focusCoverage.map(r=>r.term),...current.focusCoverage.map(r=>r.term)])];
  const focusCell=(rows:FocusRow[],term:string)=>{
    const row=rows.find(item=>item.term===term);
    return row?<strong>×{row.count}<small>{(row.per1000/10).toFixed(2)}%</small><small>{row.per1000.toFixed(1)} {t("per1000")}</small></strong>:<strong>—</strong>;
  };
  return <section className="compare-section">
    <div className="compare-head"><div><p className="eyebrow">{t("compareEye")}</p><h2>{t("compareTitle")}</h2><p>{t("compareText")}</p></div><button className="text-button" onClick={onClear}>{t("deleteA")}</button></div>
    <div className="compare-labels"><div><span>A</span><b>{baseline.label}</b><small>{t("savedAt",{date:new Date(baseline.savedAt).toLocaleString(LOCALES[uiLang])})}</small></div><div><span>B</span><b>{t("current")}</b><small>{t("latest")}</small></div></div>
    <div className="compare-table">
      <div className="compare-row compare-row-head"><span>{t("indicator")}</span><b>A</b><b>B</b></div>
      {metrics.map(([label,a,b,help])=><div className="compare-row" key={String(label)}><span>{label}<Tip>{help}</Tip></span><strong>{a}</strong><strong>{b}</strong></div>)}
    </div>
    {terms.length>0&&<div className="focus-compare"><div className="focus-explainer"><h3>{t("focusTitle")}</h3><p>{t("focusExplain")}</p></div>
      <div className="compare-table">
        <div className="compare-row compare-row-head"><span>{t("phrase")}</span><b>A</b><b>B</b></div>
        {terms.map(term=><div className="compare-row phrase-row" key={term}><span>“{term}”</span>{focusCell(baseline.result.focusCoverage,term)}{focusCell(current.focusCoverage,term)}</div>)}
      </div>
    </div>}
    <div className="frequency-comparison"><div className="frequency-title"><h3>{t("frequencyTables")}</h3><p>{t("frequencyExplain")}</p></div>
      <FrequencyComparisonTable title={t("words")} open t={t} a={baseline.result.rows.map(row=>({term:row.term,count:row.actualCount}))} b={current.rows.map(row=>({term:row.term,count:row.actualCount}))} totalA={baseline.result.tokenCount} totalB={current.tokenCount} countsA={baseline.counts?.words} countsB={counts?.words}/>
      <FrequencyComparisonTable title={t("bigrams")} t={t} a={baseline.result.bigrams} b={current.bigrams} totalA={Math.max(1,baseline.result.tokenCount-1)} totalB={Math.max(1,current.tokenCount-1)} countsA={baseline.counts?.bigrams} countsB={counts?.bigrams}/>
    </div>
  </section>;
}

export default function BowApp({ uiLang,children }: { uiLang:UiLang;children?:ReactNode }) {
  const {sourceType,setSourceType,source,setSource,loadText}=useSourceInput();
  const [language,setLanguage]=useState("en"); const [focus,setFocus]=useState("");
  const [top,setTop]=useState(20); const [tolerance,setTolerance]=useState(2); const [keepStopwords,setKeepStopwords]=useState(false);
  const [stopwordEditorLang,setStopwordEditorLang]=useState<Lang>("en"); const [stopwordLists,setStopwordLists]=useState<Record<Lang,string>>(DEFAULT_STOPWORD_TEXT);
  const [completed,setCompleted]=useState<(AnalysisOutput&{settings:AnalysisSettings})|null>(null);
  const result=completed?.result;
  const [baseline,setBaseline]=useState<SavedResult|null>(null);
  const [error,setError]=useState("");
  const {busy:loading,progress,runWorker,runRemote,cancel}=useBrowserAnalysis();
  const t:T=useCallback((key,vars)=>translate(uiLang,key,vars),[uiLang]);

  useEffect(()=>{const timer=window.setTimeout(()=>{try{
    const savedLists=localStorage.getItem(STOPWORDS_KEY);if(savedLists)setStopwordLists(JSON.parse(savedLists));
    const raw=localStorage.getItem(CACHE_KEY);
    if(raw){
      const saved=JSON.parse(raw) as SavedResult;
      if(saved.version===3&&saved.settings&&saved.result?.zoneCounts){
        setBaseline(saved);setLanguage(saved.settings.language);setFocus(saved.settings.focus);setTop(saved.settings.top);setTolerance(saved.settings.tolerance);setKeepStopwords(saved.settings.keepStopwords);
        setStopwordLists(Object.fromEntries(Object.entries(saved.settings.stopwordLists).map(([lang,words])=>[lang,words.join(", ")])) as Record<Lang,string>);
        if(saved.settings.language!=="auto")setStopwordEditorLang(saved.settings.language as Lang);
      }
    }
  }catch{}},0);return()=>window.clearTimeout(timer);},[]);

  const parsedStopwords=Object.fromEntries(Object.entries(stopwordLists).map(([lang,value])=>[lang,parseStopwordText(value)])) as Record<Lang,string[]>;
  function invalidateResult(){cancel();setCompleted(null);setError("");}
  function selectSourceType(type:"text"|"url"){
    if(sourceType===type)return;
    invalidateResult();setSourceType(type);
  }
  async function analyze(event?:FormEvent){
    event?.preventDefault();setError("");
    trackEvent("analysis_started",{tool:"bow_analyzer",source_type:sourceType,text_language:language});
    if(sourceType==="url")trackEvent("url_analysis_started",{tool:"bow_analyzer",text_language:language});
    try{
      const settings=baseline?.settings??{language,focus,top,tolerance,keepStopwords,stopwordLists:parsedStopwords};
      let output:AnalysisOutput;
      if(sourceType==="text"){
        validateBrowserInputs([source],uiLang);
        output=await runWorker<AnalysisOutput>("zipf",{text:source,...settings,uiLanguage:uiLang});
      }else{
        output=await runRemote(async signal=>{
          const response=await fetch("/api/v1/analyze",{method:"POST",signal,headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({sourceType,source,...settings,includeComparisonCounts:true})});
          const raw=await response.text();
          let payload:unknown;
          try{payload=JSON.parse(raw);}catch{throw new Error(response.status===403?t("requestBlocked"):t("invalidResponse"));}
          if(!response.ok)throw new Error(localizedApiError(payload,response.status,t));
          const versionedResult=readVersionedAnalysis(payload);
          if(!versionedResult)throw new Error(t("invalidResponse"));
          return versionedResult;
        });
      }
      const data=output.result;
      setCompleted({...output,settings});trackEvent("analysis_completed",{tool:"bow_analyzer",source_type:sourceType,text_language:data.language,word_count:data.tokenCount});if(baseline)trackEvent("comparison_completed",{tool:"bow_analyzer",source_type:sourceType});if(language==="auto"&&["ru","uk","en","es"].includes(data.language))setStopwordEditorLang(data.language as Lang);setTimeout(()=>document.getElementById("result")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(err){if(isAnalysisAbort(err))return;const message=err instanceof Error?err.message:t("unknownError");setError(message);trackEvent("analysis_error",{tool:"bow_analyzer",source_type:sourceType,error_message:message.slice(0,100)});}
  }
  function changeLanguage(value:string){invalidateResult();setLanguage(value);trackEvent("language_changed",{tool:"bow_analyzer",text_language:value});if(value!=="auto")setStopwordEditorLang(value as Lang);}
  function changeStopwordLanguage(value:Lang){invalidateResult();setStopwordEditorLang(value);setLanguage(value);trackEvent("language_changed",{tool:"bow_analyzer",text_language:value,control:"stopword_editor"});}
  function updateStopwords(value:string){invalidateResult();const next={...stopwordLists,[stopwordEditorLang]:value};setStopwordLists(next);try{localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}catch{/* Browser storage may be unavailable. */}}
  function resetStopwords(){updateStopwords(DEFAULT_STOPWORD_TEXT[stopwordEditorLang]);}
  function saveA(){
    if(!completed)return;
    const saved:SavedResult={version:3,...completed,savedAt:new Date().toISOString(),label:t("analysisLabel",{count:completed.result.tokenCount})};
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(saved));}
    catch{
      // Keep the full comparison in this tab when only the top rows fit on disk.
      try{localStorage.setItem(CACHE_KEY,JSON.stringify({...saved,counts:undefined}));}
      catch{setError(t("cacheFailed"));return;}
    }
    trackEvent("comparison_result_saved",{tool:"bow_analyzer",word_count:completed.result.tokenCount});
    setBaseline(saved);invalidateResult();setSource("");window.scrollTo({top:0,behavior:"smooth"});
  }
  function clearA(){cancel();setBaseline(null);localStorage.removeItem(CACHE_KEY);}
  function loadExample(example:ToolExample){
    invalidateResult();loadText(example.sources[0]);
    if(!baseline){setFocus(example.focus);setLanguage(uiLang);setStopwordEditorLang(uiLang);}
  }

  return <main>
    <SiteHeader locale={uiLang} active="tools" languagePaths={{en:"/tools/bag-of-words-analyzer",ru:"/ru/tools/bag-of-words-analyzer",uk:"/uk/tools/bag-of-words-analyzer",es:"/es/tools/bag-of-words-analyzer"}}/>
    <section className="hero reduced" id="top"><p className="eyebrow">{t("heroEye")}</p><h1>{t("heroLine")}<br/><em>{t("heroEm")}</em></h1><div className="hero-aside"><p className="hero-copy">{t("heroCopy")}</p><span className="privacy-note"><b/>{t("status")}</span></div></section>

    <form className="workspace" onSubmit={analyze} aria-busy={loading}>
      <section className="input-card">
        <div className="section-head"><div><span>01</span><h2>{t("source")}</h2></div><div className="tabs"><button type="button" aria-pressed={sourceType==="text"} className={sourceType==="text"?"active":""} onClick={()=>selectSourceType("text")}>{t("text")}</button><button type="button" aria-pressed={sourceType==="url"} className={sourceType==="url"?"active":""} onClick={()=>selectSourceType("url")}>{t("url")}</button></div></div>
        {sourceType==="text"?<div className="textarea-wrap"><textarea aria-label={t("textPlaceholder")} value={source} onChange={e=>{invalidateResult();setSource(e.target.value);}} placeholder={t("textPlaceholder")}/><span>{source.length.toLocaleString(LOCALES[uiLang])} {t("chars")}</span></div>:<input className="url-input" aria-label={t("url")} type="url" value={source} onChange={e=>{invalidateResult();setSource(e.target.value);}} placeholder="https://example.com/page" required/>}
        <label className="field wide"><span>{t("focus")} <Tip>{t("focusHelp")}</Tip></span><input value={focus} disabled={Boolean(baseline)} onChange={e=>{invalidateResult();setFocus(e.target.value);}}/><small>{baseline?t("settingsLocked"):t("focusNote")}</small></label>
        <ExampleAction tool="bag-of-words-analyzer" locale={uiLang} onLoad={loadExample}/>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?t("loading"):baseline?t("analyzeB"):t("analyze")}</span><b aria-hidden="true">→</b></button>
        <AnalysisProgress active={loading} progress={progress} label={t("loading")}/>
        {error&&<p className="error" role="alert">{error}</p>}
      </section>
      <aside className="settings-card">
        <div className="section-head simple"><div><span>02</span><h2>{t("settings")}</h2></div></div>
        {baseline&&<p className="settings-lock"><b>A</b>{t("settingsLockNotice")}</p>}
        <label className="field"><span>{t("language")} <Tip>{t("languageHelp")}</Tip></span><select value={language} disabled={Boolean(baseline)} onChange={e=>changeLanguage(e.target.value)}><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="es">Español</option><option value="auto">{t("auto")}</option></select><small>{language==="auto"?t("autoNote"):t("syncNote",{lang:language.toUpperCase()})}</small></label>
        <label className="field"><span>{t("top")} <Tip>{t("topHelp")}</Tip></span><input type="number" min="5" max="100" value={top} disabled={Boolean(baseline)} onChange={e=>{invalidateResult();setTop(Number(e.target.value));}}/><small>{t("topNote")}</small></label>
        <label className="field range-field"><span><span>{t("sensitivity")} <Tip>{t("sensitivityHelp")}</Tip></span><b>×{tolerance.toFixed(1)}</b></span><input type="range" min="1.2" max="4" step="0.1" value={tolerance} disabled={Boolean(baseline)} onChange={e=>{invalidateResult();setTolerance(Number(e.target.value));}}/><small>{t("sensitivityNote")}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} disabled={Boolean(baseline)} onChange={e=>{invalidateResult();setKeepStopwords(e.target.checked);}}/><span><b>{t("keepStops")} <Tip>{t("keepStopsHelp")}</Tip></b><small>{keepStopwords?t("stopsOn"):t("stopsOff")}</small></span></label>
        <details className="stopword-editor"><summary>{t("editStops")} <span>{parsedStopwords[stopwordEditorLang].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru","es"] as Lang[]).map(lang=><button type="button" disabled={Boolean(baseline)} key={lang} className={stopwordEditorLang===lang?"active":""} onClick={()=>changeStopwordLanguage(lang)}>{lang.toUpperCase()}</button>)}</div><p>{baseline?t("settingsLocked"):t("stopEditorNote")}</p><textarea value={stopwordLists[stopwordEditorLang]} disabled={Boolean(baseline)} onChange={e=>updateStopwords(e.target.value)} aria-label={`${t("editStops")} ${stopwordEditorLang}`}/><div className="stopword-actions"><small>{parsedStopwords[stopwordEditorLang].length} {t("savedLocally")}</small><button type="button" disabled={Boolean(baseline)} onClick={resetStopwords}>{t("resetStops")}</button></div></div></details>
        {baseline&&<div className="cached-pill"><span>A</span><p><b>{baseline.label}</b><small>{t("cached")}</small></p><button type="button" onClick={clearA} aria-label={t("removeSaved")}>×</button></div>}
      </aside>
    </form>

    {result&&<section className="results simplified" id="result">
      <div className="results-title"><div><span>03</span><h2>{baseline?t("resultB"):t("result")}</h2></div><div className="results-actions"><CopyResultAction tool="bag-of-words-analyzer" locale={uiLang} value={result}/>{!baseline&&<button className="save-button" onClick={saveA}>{t("saveA")}</button>}</div></div>
      {!baseline&&<div className="next-step"><span>{t("next")}</span><p>{t("nextText")}</p></div>}
      <div className="metrics-grid clean-metrics">
        <Metric label={t("metricWords")} value={result.tokenCount.toLocaleString(LOCALES[uiLang])} explanation={t("metricWordsHelp")}/>
        <Metric label={t("metricUnique")} value={String(result.vocabularySize)} explanation={t("metricUniqueHelp")}/>
        <Metric label={t("metricZipf")} value={result.fittedExponent.toFixed(2)} explanation={t("metricZipfHelp")}/>
        <Metric label={t("metricAbove")} value={String(result.zoneCounts.above)} explanation={t("metricAboveHelp")}/>
      </div>
      <div className="plain-summary"><h3>{t("meaning")}</h3><ol>{result.notes.slice(0,3).map((note,i)=><li key={note}><span>{i+1}</span><p>{note}</p></li>)}</ol></div>
      <details className="details-block"><summary>{t("details")} <span>{t("detailsSub")}</span></summary><ZoneGuide tolerance={completed.settings.tolerance} t={t}/><div className="details-content"><article className="chart-card"><div className="card-title"><div><p>{t("distribution")}</p><h3>{t("chartTitle")}</h3></div><div className="legend"><span className="actual">{t("fact")}</span><span className="expected">{t("model")}</span></div></div><ZipfChart rows={result.rows} t={t}/><p className="chart-note">{t("chartNote")}</p></article><div className="table-card compact-table"><table><thead><tr><th>{t("rank")}</th><th>{t("word")}</th><th>{t("inText")}</th><th>{t("byModel")}</th><th>{t("statusLabel")}</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.rank}><td>{row.rank}</td><td><b>{row.term}</b></td><td><span className="frequency-value"><b>×{row.actualCount}</b><small>{((row.actualCount/result.tokenCount)*100).toFixed(2)}%</small></span></td><td>{row.expectedCount.toFixed(1)}</td><td><ZoneBadge zone={row.zone} t={t}/></td></tr>)}</tbody></table></div></div></details>
    </section>}

    {baseline&&result&&<Comparison baseline={baseline} current={result} counts={completed?.counts} onClear={clearA} t={t} uiLang={uiLang}/>}
    {!result&&<section className="empty-state"><span>03</span><p>{baseline?t("emptyB"):t("empty")}</p></section>}
    {children}
    <SiteFooter locale={uiLang}/>
  </main>;
}
