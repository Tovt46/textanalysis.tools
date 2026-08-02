"use client";

import { useCallback,useEffect,useRef,useState } from "react";
import type { UiLang } from "../i18n";
export { hasPartialBrowserResult } from "./browser-result-limits";

export const MAX_BROWSER_TEXT_CHARS=500_000;
export const MAX_BROWSER_COMBINED_CHARS=2_000_000;

type BrowserOperation=
  |"word-frequency"
  |"keyword-density"
  |"zipf"
  |"comparison"
  |"ngram"
  |"bag-of-words"
  |"tf-idf"
  |"similarity";

type ActiveTask={id:number;cancel:()=>void};
type WorkerMessage=
  |{id:number;type:"progress";progress:number}
  |{id:number;type:"result";result:unknown}
  |{id:number;type:"error";message:string};

const LIMIT_COPY:Record<UiLang,{single:string;combined:string}>={
  en:{single:"Each text is limited to 500,000 characters.",combined:"Combined text input is limited to 2,000,000 characters."},
  ru:{single:"Один текст ограничен 500 000 знаков.",combined:"Общий объём текстов ограничен 2 000 000 знаков."},
  uk:{single:"Один текст обмежено 500 000 символів.",combined:"Загальний обсяг текстів обмежено 2 000 000 символів."},
  es:{single:"Cada texto está limitado a 500.000 caracteres.",combined:"El texto combinado está limitado a 2.000.000 de caracteres."},
};

const PARTIAL_COPY:Record<UiLang,string>={
  en:"Partial result: this table and its CSV or JSON export include only the first rows. Use API pagination to retrieve every row.",
  ru:"Частичный результат: таблица и экспорт CSV или JSON содержат только первые строки. Для получения всех строк используйте пагинацию API.",
  uk:"Частковий результат: таблиця та експорт CSV або JSON містять лише перші рядки. Щоб отримати всі рядки, використовуйте пагінацію API.",
  es:"Resultado parcial: esta tabla y su exportación CSV o JSON solo incluyen las primeras filas. Usa la paginación de la API para obtener todas las filas.",
};

function abortError(){return new DOMException("Analysis cancelled.","AbortError");}

export function isAnalysisAbort(error:unknown){
  return error instanceof DOMException&&error.name==="AbortError";
}

export function validateBrowserInputs(sources:readonly string[],locale:UiLang){
  if(sources.some(source=>source.length>MAX_BROWSER_TEXT_CHARS))throw new Error(LIMIT_COPY[locale].single);
  if(sources.reduce((sum,source)=>sum+source.length,0)>MAX_BROWSER_COMBINED_CHARS)throw new Error(LIMIT_COPY[locale].combined);
}

export function useBrowserAnalysis(){
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const activeRef=useRef<ActiveTask|null>(null);
  const nextId=useRef(1);
  const mountedRef=useRef(true);

  const updateState=useCallback((nextBusy:boolean,nextProgress=0)=>{
    if(!mountedRef.current)return;
    setBusy(nextBusy);
    setProgress(nextProgress);
  },[]);

  const cancel=useCallback(()=>{
    const active=activeRef.current;
    activeRef.current=null;
    active?.cancel();
    updateState(false,0);
  },[updateState]);

  const start=useCallback((cancelTask:(reason:DOMException)=>void)=>{
    const previous=activeRef.current;
    activeRef.current=null;
    previous?.cancel();
    const id=nextId.current++;
    activeRef.current={id,cancel:()=>cancelTask(abortError())};
    updateState(true,0);
    return id;
  },[updateState]);

  const finish=useCallback((id:number)=>{
    if(activeRef.current?.id!==id)return false;
    activeRef.current=null;
    updateState(false,100);
    return true;
  },[updateState]);

  const runWorker=useCallback(<T,>(operation:BrowserOperation,payload:unknown)=>new Promise<T>((resolve,reject)=>{
    let worker:Worker;
    try{
      worker=new Worker(new URL("./browser-analysis.worker.ts",import.meta.url),{type:"module",name:"textanalysis-browser-analysis"});
    }catch(error){
      reject(error);
      return;
    }
    const id=start(reason=>{worker.terminate();reject(reason);});
    worker.addEventListener("message",event=>{
      const message=event.data as WorkerMessage;
      if(!message||message.id!==id||activeRef.current?.id!==id)return;
      if(message.type==="progress"){
        if(mountedRef.current)setProgress(Math.max(0,Math.min(100,message.progress)));
        return;
      }
      worker.terminate();
      if(!finish(id))return;
      if(message.type==="error")reject(new Error(message.message));
      else resolve(message.result as T);
    });
    worker.addEventListener("error",event=>{
      worker.terminate();
      if(!finish(id))return;
      reject(new Error(event.message||"Browser analysis worker failed."));
    });
    worker.postMessage({id,operation,payload});
  }),[finish,start]);

  const runRemote=useCallback(<T,>(task:(signal:AbortSignal)=>Promise<T>)=>new Promise<T>((resolve,reject)=>{
    const controller=new AbortController();
    const id=start(reason=>{controller.abort(reason);reject(reason);});
    task(controller.signal).then(value=>{
      if(finish(id))resolve(value);
    },error=>{
      if(finish(id))reject(error);
    });
  }),[finish,start]);

  useEffect(()=>{
    mountedRef.current=true;
    return()=>{
      mountedRef.current=false;
      const active=activeRef.current;
      activeRef.current=null;
      active?.cancel();
    };
  },[]);

  return {busy,progress,runWorker,runRemote,cancel};
}

export function AnalysisProgress({active,progress,label}:{active:boolean;progress:number;label:string}){
  if(!active)return null;
  return <div className="analysis-progress" role="status" aria-live="polite">
    <progress max="100" value={progress||undefined} aria-label={label}/>
    <span>{label}</span>
  </div>;
}

export function PartialResultNotice({partial,locale}:{partial:boolean;locale:UiLang}){
  if(!partial)return null;
  return <p className="partial-result-notice" data-testid="partial-result-notice" role="note">{PARTIAL_COPY[locale]}</p>;
}
