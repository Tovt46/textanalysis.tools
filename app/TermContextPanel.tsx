"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {UiLang} from "./i18n";
import {formatNumber} from "./localization";
import {findTermContexts,type TermContextIndex as ContextIndex} from "./lib/term-contexts";
import "./editorial-workflow.css";

const CONTEXT_COPY={
  en:{view:"View occurrences",heading:"Occurrences in context",close:"Close occurrences",empty:"No occurrences in this source.",previous:"Previous occurrences",next:"More occurrences",note:"Matches use the same token and stop-word settings as the table. Filtered phrases can span words omitted by those settings.",count:"occurrences",source:"Source",showing:"Showing",of:"of"},
  ru:{view:"Показать вхождения",heading:"Вхождения в контексте",close:"Закрыть вхождения",empty:"В этом источнике вхождений нет.",previous:"Предыдущие вхождения",next:"Ещё вхождения",note:"Вхождения используют те же настройки токенов и стоп-слов, что и таблица. Фразы могут включать промежутки, исключённые этими настройками.",count:"вхождений",source:"Источник",showing:"Показано",of:"из"},
  uk:{view:"Показати входження",heading:"Входження в контексті",close:"Закрити входження",empty:"У цьому джерелі входжень немає.",previous:"Попередні входження",next:"Ще входження",note:"Входження використовують ті самі налаштування токенів і стоп-слів, що й таблиця. Фрази можуть охоплювати проміжки, виключені цими налаштуваннями.",count:"входжень",source:"Джерело",showing:"Показано",of:"із"},
  es:{view:"Ver apariciones",heading:"Apariciones en contexto",close:"Cerrar apariciones",empty:"No hay apariciones en esta fuente.",previous:"Apariciones anteriores",next:"Más apariciones",note:"Las coincidencias usan los mismos ajustes de tokens y palabras vacías que la tabla. Las frases filtradas pueden abarcar palabras omitidas por esos ajustes.",count:"apariciones",source:"Fuente",showing:"Mostrando",of:"de"},
} satisfies Record<UiLang,Record<string,string>>;

function occurrenceLabel(total:number,locale:UiLang){
  const plural=new Intl.PluralRules(locale).select(total);
  if(locale==="en")return plural==="one"?"occurrence":"occurrences";
  if(locale==="es")return plural==="one"?"aparición":"apariciones";
  if(locale==="uk")return plural==="one"||plural==="few"?"входження":"входжень";
  return plural==="one"?"вхождение":plural==="few"?"вхождения":"вхождений";
}

export function ContextTermButton({term,selected,panelId,onSelect,locale="en"}:{term:string;selected:boolean;panelId:string;onSelect:()=>void;locale?:UiLang}){
  return <button type="button" className="context-term-button" aria-label={`${CONTEXT_COPY[locale].view}: ${term}`} aria-expanded={selected} aria-controls={selected?panelId:undefined} onClick={onSelect}>{term}</button>;
}

function ContextSource({index,term,label,locale}:{index:ContextIndex;term:string;label:string;locale:UiLang}){
  const [offset,setOffset]=useState(0);
  const copy=CONTEXT_COPY[locale];
  const result=useMemo(()=>findTermContexts(index,term,{limit:20,offset,contextChars:90}),[index,term,offset]);
  return <div className="term-context-source">
    <h4>{label} <span>{formatNumber(result.total,locale)} {occurrenceLabel(result.total,locale)}</span></h4>
    {result.total?<><p className="context-page-count">{copy.showing} {formatNumber(offset+1,locale)}–{formatNumber(offset+result.snippets.length,locale)} {copy.of} {formatNumber(result.total,locale)}</p><ol start={offset+1}>{result.snippets.map(snippet=><li key={`${snippet.start}-${snippet.end}`}><span>{snippet.start>snippet.before.length?"…":""}{snippet.before}</span><mark>{snippet.match}</mark><span>{snippet.after}{snippet.end+snippet.after.length<index.text.length?"…":""}</span></li>)}</ol><div className="context-pagination"><button type="button" disabled={offset===0} onClick={()=>setOffset(current=>Math.max(0,current-20))}>{copy.previous}</button><button type="button" disabled={!result.hasMore} onClick={()=>setOffset(current=>current+20)}>{copy.next}</button></div></>:<p>{copy.empty}</p>}
  </div>;
}

export function TermContextPanel({id,term,sources,onClose,locale="en"}:{id:string;term:string;sources:Array<{label:string;index:ContextIndex}>;onClose:()=>void;locale?:UiLang}){
  const copy=CONTEXT_COPY[locale];
  const heading=useRef<HTMLHeadingElement>(null);
  const opener=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    heading.current?.focus({preventScroll:true});
    heading.current?.scrollIntoView({block:"nearest",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  },[]);
  return <section id={id} className="term-context-panel" aria-labelledby={`${id}-heading`} data-testid="term-context-panel">
    <div className="term-context-head"><h3 id={`${id}-heading`} tabIndex={-1} ref={heading}>{copy.heading}: <span>{term}</span></h3><button type="button" onClick={()=>{onClose();opener.current?.focus({preventScroll:true});}} aria-label={copy.close}>×</button></div>
    <p className="term-context-note">{copy.note}</p>
    <div className={`term-context-grid${sources.length>1?" term-context-grid-two":""}`}>{sources.map(source=><ContextSource key={`${source.label}:${term}`} {...source} term={term} locale={locale}/>)}</div>
  </section>;
}
