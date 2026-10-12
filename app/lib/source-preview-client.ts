"use client";

import {useState} from "react";
import type {UiLang} from "../i18n";
import {localizeApiError} from "../localization";
import {validateBrowserInputs} from "./browser-analysis";
import type {ContentScope,SourcePreview} from "./source-preview-contract";

const ERROR_COPY={
  en:"The page text could not be loaded. Try another URL or paste the article text.",
  ru:"Не удалось загрузить текст страницы. Попробуйте другой URL или вставьте текст статьи.",
  uk:"Не вдалося завантажити текст сторінки. Спробуйте інший URL або вставте текст статті.",
  es:"No se pudo cargar el texto de la página. Prueba otra URL o pega el texto del artículo.",
} satisfies Record<UiLang,string>;

/** The engine accepts HTML; protect text already decoded by the DOM extractor. */
export function sourcePreviewAnalysisText(text:string){
  return text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

export async function fetchSourcePreview(source:string,contentScope:ContentScope,locale:UiLang,signal:AbortSignal):Promise<SourcePreview>{
  const response=await fetch("/api/source-preview",{
    method:"POST",signal,
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({source,contentScope}),
  });
  const payload:unknown=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(localizeApiError(payload,ERROR_COPY[locale],locale));
  const preview=(payload as {source?:SourcePreview}|null)?.source;
  if(!preview||typeof preview.text!=="string"||!preview.text.trim()||
    !["main","page","plain"].includes(preview.usedScope)||
    preview.title!==undefined&&typeof preview.title!=="string"||
    preview.requestedScope!==contentScope||typeof preview.fallback!=="boolean")throw new Error(ERROR_COPY[locale]);
  validateBrowserInputs([preview.text],locale);
  signal.throwIfAborted();
  return preview;
}

export function useSourcePreview(source:string,sourceType:"text"|"url",locale:UiLang){
  const [scope,setScope]=useState<ContentScope>("main");
  const [cached,setCached]=useState<{source:string;scope:ContentScope;value:SourcePreview}|null>(null);
  const preview=sourceType==="url"&&cached?.source===source&&cached.scope===scope?cached.value:null;
  async function prepare(signal:AbortSignal){
    const value=await fetchSourcePreview(source,scope,locale,signal);
    setCached({source,scope,value});
    return value;
  }
  return {scope,setScope,preview,prepare,clear:()=>setCached(null)};
}
