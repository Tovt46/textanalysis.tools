"use client";

import { useSyncExternalStore } from "react";
import type { UiLang } from "./i18n";

const THEME_KEY="textanalysis-theme-v1";
const LABELS:Record<UiLang,[string,string]>={en:["Switch to light theme","Switch to dark theme"],ru:["Включить светлую тему","Включить тёмную тему"],uk:["Увімкнути світлу тему","Увімкнути темну тему"],es:["Activar tema claro","Activar tema oscuro"]};

function subscribe(notify:()=>void){
  function stored(event:StorageEvent){
    if(event.key!==THEME_KEY)return;
    document.documentElement.dataset.theme=event.newValue==="light"?"light":"dark";
    notify();
  }
  window.addEventListener("textanalysis-theme",notify);
  window.addEventListener("storage",stored);
  return()=>{window.removeEventListener("textanalysis-theme",notify);window.removeEventListener("storage",stored);};
}
const getSnapshot=()=>document.documentElement.dataset.theme==="light";
const getServerSnapshot=()=>false;

export default function ThemeToggle({locale}:{locale:UiLang}){
  const light=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
  const label=LABELS[locale][light?1:0];
  return <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={()=>{
    const theme=light?"dark":"light";
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem(THEME_KEY,theme);}catch{}
    window.dispatchEvent(new Event("textanalysis-theme"));
  }}><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor"/></svg></button>;
}
