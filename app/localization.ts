import type { Metadata } from "next";
import type { UiLang } from "./i18n";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "./seo-metadata";

export const UI_LOCALES:Record<UiLang,string>={
  en:"en-US",
  ru:"ru-RU",
  uk:"uk-UA",
  es:"es",
};

export const OPEN_GRAPH_LOCALES:Record<UiLang,string>={
  en:"en_US",
  ru:"ru_RU",
  uk:"uk_UA",
  es:"es_ES",
};

export const BREADCRUMB_LABELS:Record<UiLang,string>={
  en:"Breadcrumb",
  ru:"Навигационная цепочка",
  uk:"Навігаційний ланцюжок",
  es:"Ruta de navegación",
};

export function localizedPath(locale:UiLang,path:string){
  if(locale==="en")return path;
  if(path==="/")return `/${locale}`;
  return `/${locale}${path}`;
}

export function languagePaths(path:string){
  return {
    en:localizedPath("en",path),
    ru:localizedPath("ru",path),
    uk:localizedPath("uk",path),
    es:localizedPath("es",path),
  };
}

export function languageAlternates(path:string){
  const paths=languagePaths(path);
  return {...paths,"x-default":paths.en};
}

export function localizedMetadata({
  locale,
  path,
  title,
  description,
  type="website",
}:{
  locale:UiLang;
  path:string;
  title:string;
  description:string;
  type?:"website"|"article";
}):Metadata{
  const canonical=localizedPath(locale,path);
  return {
    metadataBase:new URL(SITE_URL),
    title,
    description,
    alternates:{canonical,languages:languageAlternates(path)},
    openGraph:{
      type,
      url:canonical,
      siteName:SITE_NAME,
      title,
      description,
      locale:OPEN_GRAPH_LOCALES[locale],
      alternateLocale:Object.entries(OPEN_GRAPH_LOCALES).filter(([key])=>key!==locale).map(([,value])=>value),
    },
    twitter:{card:"summary",title,description},
    verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},
    icons:SITE_ICONS,
    manifest:"/site.webmanifest",
  };
}

export function localizeApiError(payload:unknown,fallback:string,locale:UiLang){
  if(locale!=="en"||!payload||typeof payload!=="object")return fallback;
  if("error" in payload){
    const error=(payload as {error:unknown}).error;
    if(typeof error==="string")return error;
    if(error&&typeof error==="object"&&"message" in error)return String((error as {message:unknown}).message);
  }
  return fallback;
}

export function formatNumber(value:number,locale:UiLang){
  return value.toLocaleString(UI_LOCALES[locale]);
}
