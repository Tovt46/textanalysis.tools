"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { LOCALES, translate, type UiLang } from "./i18n";
import { SiteFooter,SiteHeader } from "./SiteChrome";
import { analyzeText } from "./lib/analyze";
import { DEFAULT_STOPWORD_TEXT,parseStopwordText,type TextLanguage } from "./lib/stopwords";
import { trackEvent } from "./lib/analytics";

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
type SavedResult = { version:3; result:Analysis; settings:AnalysisSettings; savedAt:string; label:string };

const CACHE_KEY = "bow-zipf-baseline-v3";
const STOPWORDS_KEY = "bow-zipf-stopwords-v1";
type T = (key:string, vars?:Record<string,string|number>)=>string;

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
      ctx.clearRect(0,0,w,h); ctx.strokeStyle="#dfe3dc"; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const gy=p.t+(ph/4)*i;ctx.beginPath();ctx.moveTo(p.l,gy);ctx.lineTo(w-p.r,gy);ctx.stroke();}
      const line=(key:"actualCount"|"expectedCount",color:string,dash=false)=>{ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(r.rank),y(r[key])):ctx.moveTo(x(r.rank),y(r[key])));ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash?[6,5]:[]);ctx.stroke();ctx.setLineDash([]);};
      line("expectedCount","#a6ada3",true); line("actualCount","#175c4b");
      rows.forEach(r=>{ctx.beginPath();ctx.arc(x(r.rank),y(r.actualCount),3,0,Math.PI*2);ctx.fillStyle=r.zone==="above"?"#d26b45":"#175c4b";ctx.fill();});
      ctx.fillStyle="#747b74";ctx.font="10px ui-monospace, monospace";ctx.fillText(t("frequency"),2,12);ctx.fillText(t("rankArrow"),w-62,h-6);
    };
    draw(); const observer=new ResizeObserver(draw);observer.observe(canvas);return()=>observer.disconnect();
  },[rows,t]);
  return <canvas ref={ref} className="chart compact-chart" aria-label={t("chartTitle")} />;
}

function FrequencyComparisonTable({ title, a, b, totalA, totalB, t, open=false }: { title:string; a:{term:string;count:number}[]; b:{term:string;count:number}[]; totalA:number; totalB:number; t:T; open?:boolean }) {
  const terms=[...new Set([...a.map(row=>row.term),...b.map(row=>row.term)])];
  const rows=terms.map(term=>{const av=a.find(row=>row.term===term),bv=b.find(row=>row.term===term);const ar=av?(av.count/totalA)*1000:null,br=bv?(bv.count/totalB)*1000:null;return{term,av,bv,ar,br,weight:Math.max(ar||0,br||0)};}).sort((x,y)=>y.weight-x.weight).slice(0,30);
  const cell=(item:{count:number}|undefined,rate:number|null)=><>{item?<><b>×{item.count}</b><small>{((rate||0)/10).toFixed(2)}%</small><small>{rate?.toFixed(1)} {t("per1000")}</small></>:<><b>—</b><small>{t("outsideTop")}</small></>}</>;
  return <details className="ab-frequency" open={open}><summary>{title}<span>{rows.length} {t("rows")}</span></summary><div className="ab-table-scroll"><table className="ab-table"><thead><tr><th>{t("term")}</th><th>{t("resultA")}</th><th>{t("resultBLabel")}</th><th>{t("difference")}</th></tr></thead><tbody>{rows.map(row=>{const delta=(row.br||0)-(row.ar||0),deltaPct=delta/10;return <tr key={row.term}><td><b>{row.term}</b></td><td>{cell(row.av,row.ar)}</td><td>{cell(row.bv,row.br)}</td><td><span className={delta>0?"delta-up":delta<0?"delta-down":"delta-flat"}>{deltaPct>0?"+":""}{deltaPct.toFixed(2)} {t("percentagePoints")}</span><small>{delta>0?"+":""}{delta.toFixed(1)} {t("per1000")}</small></td></tr>;})}</tbody></table></div></details>;
}

function Comparison({ baseline, current, onClear, t, uiLang }: { baseline:SavedResult; current:Analysis; onClear:()=>void; t:T; uiLang:UiLang }) {
  const metrics=[
    [t("filteredWords"),baseline.result.tokenCount,current.tokenCount,t("filteredWordsHelp")],
    [t("uniqueWords"),baseline.result.vocabularySize,current.vocabularySize,t("uniqueWordsHelp")],
    [t("zipfIndicator"),baseline.result.fittedExponent.toFixed(2),current.fittedExponent.toFixed(2),t("zipfIndicatorHelp")],
    [t("aboveIndicator"),baseline.result.zoneCounts.above,current.zoneCounts.above,t("aboveIndicatorHelp")],
  ];
  const terms=[...new Set([...baseline.result.focusCoverage.map(r=>r.term),...current.focusCoverage.map(r=>r.term)])];
  const get=(rows:FocusRow[],term:string)=>rows.find(r=>r.term===term) || {term,count:0,per1000:0};
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
        {terms.map(term=>{const a=get(baseline.result.focusCoverage,term),b=get(current.focusCoverage,term);return <div className="compare-row phrase-row" key={term}><span>“{term}”</span><strong>×{a.count}<small>{(a.per1000/10).toFixed(2)}%</small><small>{a.per1000.toFixed(1)} {t("per1000")}</small></strong><strong>×{b.count}<small>{(b.per1000/10).toFixed(2)}%</small><small>{b.per1000.toFixed(1)} {t("per1000")}</small></strong></div>;})}
      </div>
    </div>}
    <div className="frequency-comparison"><div className="frequency-title"><h3>{t("frequencyTables")}</h3><p>{t("frequencyExplain")}</p></div>
      <FrequencyComparisonTable title={t("words")} open t={t} a={baseline.result.rows.map(row=>({term:row.term,count:row.actualCount}))} b={current.rows.map(row=>({term:row.term,count:row.actualCount}))} totalA={baseline.result.tokenCount} totalB={current.tokenCount}/>
      <FrequencyComparisonTable title={t("bigrams")} t={t} a={baseline.result.bigrams} b={current.bigrams} totalA={Math.max(1,baseline.result.tokenCount-1)} totalB={Math.max(1,current.tokenCount-1)}/>
    </div>
  </section>;
}

export default function BowApp({ uiLang }: { uiLang:UiLang }) {
  const [sourceType,setSourceType]=useState<"text"|"url">("text"); const [source,setSource]=useState("");
  const [language,setLanguage]=useState("en"); const [focus,setFocus]=useState("");
  const [top,setTop]=useState(20); const [tolerance,setTolerance]=useState(2); const [keepStopwords,setKeepStopwords]=useState(false);
  const [stopwordEditorLang,setStopwordEditorLang]=useState<Lang>("en"); const [stopwordLists,setStopwordLists]=useState<Record<Lang,string>>(DEFAULT_STOPWORD_TEXT);
  const [result,setResult]=useState<Analysis|null>(null); const [baseline,setBaseline]=useState<SavedResult|null>(null);
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
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
  async function analyze(event?:FormEvent){
    event?.preventDefault();setLoading(true);setError("");
    trackEvent("analysis_started",{tool:"bow_analyzer",source_type:sourceType,text_language:language});
    if(sourceType==="url")trackEvent("url_analysis_started",{tool:"bow_analyzer",text_language:language});
    try{
      await new Promise<void>(resolve=>window.setTimeout(resolve,0));
      let data:Analysis;
      if(sourceType==="text"){
        const localResult=analyzeText({text:source,language:language as "auto"|Lang,focus,top,tolerance,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:uiLang});
        const {_allUnigrams,_allBigrams,...visibleResult}=localResult;void _allUnigrams;void _allBigrams;
        data=visibleResult;
      }else{
        const response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({sourceType,source,language,focus,top,tolerance,keepStopwords,stopwordLists:parsedStopwords,uiLanguage:uiLang})});
        const raw=await response.text();
        let payload:unknown;
        try{payload=JSON.parse(raw);}catch{throw new Error(response.status===403?t("requestBlocked"):t("invalidResponse"));}
        if(!response.ok){const message=typeof payload==="object"&&payload&&"error" in payload?String((payload as {error:unknown}).error):t("failed");throw new Error(message);}
        data=payload as Analysis;
      }
      setResult(data);trackEvent("analysis_completed",{tool:"bow_analyzer",source_type:sourceType,text_language:data.language,word_count:data.tokenCount});if(baseline)trackEvent("comparison_completed",{tool:"bow_analyzer",source_type:sourceType});if(language==="auto"&&["ru","uk","en"].includes(data.language))setStopwordEditorLang(data.language as Lang);setTimeout(()=>document.getElementById("result")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(err){const message=err instanceof Error?err.message:t("unknownError");setError(message);trackEvent("analysis_error",{tool:"bow_analyzer",source_type:sourceType,error_message:message.slice(0,100)});}finally{setLoading(false);}
  }
  function changeLanguage(value:string){setLanguage(value);trackEvent("language_changed",{tool:"bow_analyzer",text_language:value});if(value!=="auto")setStopwordEditorLang(value as Lang);}
  function changeStopwordLanguage(value:Lang){setStopwordEditorLang(value);setLanguage(value);trackEvent("language_changed",{tool:"bow_analyzer",text_language:value,control:"stopword_editor"});}
  function updateStopwords(value:string){const next={...stopwordLists,[stopwordEditorLang]:value};setStopwordLists(next);localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}
  function resetStopwords(){const next={...stopwordLists,[stopwordEditorLang]:DEFAULT_STOPWORD_TEXT[stopwordEditorLang]};setStopwordLists(next);localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}
  function saveA(){if(!result)return;const settings:AnalysisSettings={language,focus,top,tolerance,keepStopwords,stopwordLists:parsedStopwords};const saved:SavedResult={version:3,result,settings,savedAt:new Date().toISOString(),label:t("analysisLabel",{count:result.tokenCount})};try{localStorage.setItem(CACHE_KEY,JSON.stringify(saved));}catch{setError(t("cacheFailed"));return;}trackEvent("comparison_result_saved",{tool:"bow_analyzer",word_count:result.tokenCount});setBaseline(saved);setResult(null);setSource("");window.scrollTo({top:0,behavior:"smooth"});}
  function clearA(){setBaseline(null);localStorage.removeItem(CACHE_KEY);}

  return <main>
    <SiteHeader locale={uiLang} active="analyzer"/>
    <section className="hero reduced" id="top"><p className="eyebrow">{t("heroEye")}</p><h1>{t("heroLine")}<br/><em>{t("heroEm")}</em></h1><div className="hero-aside"><p className="hero-copy">{t("heroCopy")}</p><span className="privacy-note"><b/>{t("status")}</span></div></section>

    <form className="workspace" onSubmit={analyze}>
      <section className="input-card">
        <div className="section-head"><div><span>01</span><h2>{t("source")}</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} onClick={()=>{setSourceType("text");setSource("")}}>{t("text")}</button><button type="button" className={sourceType==="url"?"active":""} onClick={()=>{setSourceType("url");setSource("")}}>{t("url")}</button></div></div>
        {sourceType==="text"?<div className="textarea-wrap"><textarea value={source} onChange={e=>setSource(e.target.value)} placeholder={t("textPlaceholder")}/><span>{source.length.toLocaleString(LOCALES[uiLang])} {t("chars")}</span></div>:<input className="url-input" type="url" value={source} onChange={e=>setSource(e.target.value)} placeholder="https://example.com/page" required/>}
        <label className="field wide"><span>{t("focus")} <Tip>{t("focusHelp")}</Tip></span><input value={focus} disabled={Boolean(baseline)} onChange={e=>setFocus(e.target.value)}/><small>{baseline?t("settingsLocked"):t("focusNote")}</small></label>
      </section>
      <aside className="settings-card">
        <div className="section-head simple"><div><span>02</span><h2>{t("settings")}</h2></div></div>
        {baseline&&<p className="settings-lock"><b>A</b>{t("settingsLockNotice")}</p>}
        <label className="field"><span>{t("language")} <Tip>{t("languageHelp")}</Tip></span><select value={language} disabled={Boolean(baseline)} onChange={e=>changeLanguage(e.target.value)}><option value="en">English</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="auto">{t("auto")}</option></select><small>{language==="auto"?t("autoNote"):t("syncNote",{lang:language.toUpperCase()})}</small></label>
        <label className="field"><span>{t("top")} <Tip>{t("topHelp")}</Tip></span><input type="number" min="5" max="100" value={top} disabled={Boolean(baseline)} onChange={e=>setTop(Number(e.target.value))}/><small>{t("topNote")}</small></label>
        <label className="field range-field"><span><span>{t("sensitivity")} <Tip>{t("sensitivityHelp")}</Tip></span><b>×{tolerance.toFixed(1)}</b></span><input type="range" min="1.2" max="4" step="0.1" value={tolerance} disabled={Boolean(baseline)} onChange={e=>setTolerance(Number(e.target.value))}/><small>{t("sensitivityNote")}</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} disabled={Boolean(baseline)} onChange={e=>setKeepStopwords(e.target.checked)}/><span><b>{t("keepStops")} <Tip>{t("keepStopsHelp")}</Tip></b><small>{keepStopwords?t("stopsOn"):t("stopsOff")}</small></span></label>
        <details className="stopword-editor"><summary>{t("editStops")} <span>{parsedStopwords[stopwordEditorLang].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["en","uk","ru"] as Lang[]).map(lang=><button type="button" disabled={Boolean(baseline)} key={lang} className={stopwordEditorLang===lang?"active":""} onClick={()=>changeStopwordLanguage(lang)}>{lang.toUpperCase()}</button>)}</div><p>{baseline?t("settingsLocked"):t("stopEditorNote")}</p><textarea value={stopwordLists[stopwordEditorLang]} disabled={Boolean(baseline)} onChange={e=>updateStopwords(e.target.value)} aria-label={`${t("editStops")} ${stopwordEditorLang}`}/><div className="stopword-actions"><small>{parsedStopwords[stopwordEditorLang].length} {t("savedLocally")}</small><button type="button" disabled={Boolean(baseline)} onClick={resetStopwords}>{t("resetStops")}</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?t("loading"):baseline?t("analyzeB"):t("analyze")}</span><b>→</b></button>
        {baseline&&<div className="cached-pill"><span>A</span><p><b>{baseline.label}</b><small>{t("cached")}</small></p><button type="button" onClick={clearA} aria-label={t("removeSaved")}>×</button></div>}
        {error&&<p className="error">{error}</p>}
      </aside>
    </form>

    {result&&<section className="results simplified" id="result">
      <div className="results-title"><div><span>03</span><h2>{baseline?t("resultB"):t("result")}</h2></div>{!baseline&&<button className="save-button" onClick={saveA}>{t("saveA")}</button>}</div>
      {!baseline&&<div className="next-step"><span>{t("next")}</span><p>{t("nextText")}</p></div>}
      <div className="metrics-grid clean-metrics">
        <Metric label={t("metricWords")} value={result.tokenCount.toLocaleString(LOCALES[uiLang])} explanation={t("metricWordsHelp")}/>
        <Metric label={t("metricUnique")} value={String(result.vocabularySize)} explanation={t("metricUniqueHelp")}/>
        <Metric label={t("metricZipf")} value={result.fittedExponent.toFixed(2)} explanation={t("metricZipfHelp")}/>
        <Metric label={t("metricAbove")} value={String(result.zoneCounts.above)} explanation={t("metricAboveHelp")}/>
      </div>
      <div className="plain-summary"><h3>{t("meaning")}</h3><ol>{result.notes.slice(0,3).map((note,i)=><li key={note}><span>{i+1}</span><p>{note}</p></li>)}</ol></div>
      <details className="details-block"><summary>{t("details")} <span>{t("detailsSub")}</span></summary><ZoneGuide tolerance={tolerance} t={t}/><div className="details-content"><article className="chart-card"><div className="card-title"><div><p>{t("distribution")}</p><h3>{t("chartTitle")}</h3></div><div className="legend"><span className="actual">{t("fact")}</span><span className="expected">{t("model")}</span></div></div><ZipfChart rows={result.rows} t={t}/><p className="chart-note">{t("chartNote")}</p></article><div className="table-card compact-table"><table><thead><tr><th>{t("rank")}</th><th>{t("word")}</th><th>{t("inText")}</th><th>{t("byModel")}</th><th>{t("statusLabel")}</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.rank}><td>{row.rank}</td><td><b>{row.term}</b></td><td><span className="frequency-value"><b>×{row.actualCount}</b><small>{((row.actualCount/result.tokenCount)*100).toFixed(2)}%</small></span></td><td>{row.expectedCount.toFixed(1)}</td><td><ZoneBadge zone={row.zone} t={t}/></td></tr>)}</tbody></table></div></div></details>
    </section>}

    {baseline&&result&&<Comparison baseline={baseline} current={result} onClear={clearA} t={t} uiLang={uiLang}/>} 
    {!result&&<section className="empty-state"><span>03</span><p>{baseline?t("emptyB"):t("empty")}</p></section>}
    <SiteFooter locale={uiLang}/>
  </main>;
}
