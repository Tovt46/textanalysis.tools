import type { Metadata } from "next";
import type { UiLang } from "./i18n";

export const SITE_URL = "https://textanalysis.tools";
export const SITE_NAME = "Text Analysis Tools";

type ToolSchemaInput={
  name:string;
  description:string;
  path:string;
  inLanguage?:UiLang;
  featureList:string[];
};

export const SITE_ICONS:Metadata["icons"] = {
  icon:[
    {url:"/favicon.ico"},
    {url:"/favicon-16x16.png",sizes:"16x16",type:"image/png"},
    {url:"/favicon-32x32.png",sizes:"32x32",type:"image/png"},
  ],
  shortcut:"/favicon.ico",
  apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}],
};

const HOME_COPY: Record<UiLang,{ path:string; title:string; description:string; locale:string }> = {
  ru: {
    path: "/ru",
    title: "Бесплатные инструменты анализа текста | Text Analysis Tools",
    description: "Анализируйте частотность слов, плотность ключевых фраз и различия между текстами. Прозрачные расчёты, работа без регистрации и хранения текста.",
    locale: "ru_RU",
  },
  en: {
    path: "/",
    title: "Free Text Analysis Tools for Words, Keywords & Comparison",
    description: "Analyze word frequency, keyword density, Bag of Words, and text differences with transparent browser-based tools. No sign-up and no server storage.",
    locale: "en_US",
  },
  uk: {
    path: "/uk",
    title: "Безкоштовні інструменти аналізу тексту | Text Analysis Tools",
    description: "Аналізуйте частотність слів, щільність ключових фраз і відмінності між текстами. Прозорі розрахунки без реєстрації та зберігання тексту.",
    locale: "uk_UA",
  },
  es: {
    path: "/es",
    title: "Herramientas gratuitas de análisis de texto | Text Analysis Tools",
    description: "Analiza frecuencia de palabras, densidad de palabras clave y diferencias entre textos con cálculos transparentes, sin registro ni almacenamiento.",
    locale: "es_ES",
  },
};

const BOW_COPY: Record<UiLang,{ path:string; title:string; description:string; locale:string }> = {
  ru: {
    path:"/ru/tools/bag-of-words-analyzer",
    title:"Бесплатный Bag of Words SEO-анализатор | Text Analysis Tools",
    description:"Анализируйте частотность и плотность ключевых слов, биграммы и стоп-слова. Сравнивайте два текста с помощью Bag of Words и закона Ципфа.",
    locale:"ru_RU",
  },
  en: {
    path:"/tools/bag-of-words-analyzer",
    title:"Free Bag of Words SEO Analyzer & Comparison",
    description:"Analyze keyword density, word and bigram frequency, and editable stop words. Compare two texts with Bag of Words and Zipf distribution.",
    locale:"en_US",
  },
  uk: {
    path:"/uk/tools/bag-of-words-analyzer",
    title:"Безкоштовний Bag of Words SEO-аналізатор | Text Analysis Tools",
    description:"Аналізуйте частотність і щільність ключових слів, біграми та стоп-слова. Порівнюйте два тексти за допомогою Bag of Words і закону Ципфа.",
    locale:"uk_UA",
  },
  es: {
    path:"/es/tools/bag-of-words-analyzer",
    title:"Analizador Bag of Words gratuito para SEO",
    description:"Analiza frecuencia y densidad de palabras clave, bigramas y palabras vacías. Compara dos textos con Bag of Words y la ley de Zipf.",
    locale:"es_ES",
  },
};

const homeLanguageAlternates = { en:"/", ru:"/ru", uk:"/uk", es:"/es", "x-default":"/" };
export const BOW_LANGUAGE_PATHS = {
  en:"/tools/bag-of-words-analyzer",
  ru:"/ru/tools/bag-of-words-analyzer",
  uk:"/uk/tools/bag-of-words-analyzer",
  es:"/es/tools/bag-of-words-analyzer",
} satisfies Record<UiLang,string>;
const bowLanguageAlternates = { ...BOW_LANGUAGE_PATHS, "x-default":BOW_LANGUAGE_PATHS.en };

function metadata(page:{path:string;title:string;description:string;locale:string},languages:Record<string,string>,imageAlt:string):Metadata {
  return {
    metadataBase:new URL(SITE_URL),
    title:page.title,
    description:page.description,
    alternates:{ canonical:page.path, languages },
    openGraph:{
      type:"website",
      url:page.path,
      siteName:SITE_NAME,
      title:page.title,
      description:page.description,
      locale:page.locale,
      alternateLocale:["en_US","ru_RU","uk_UA","es_ES"].filter(locale=>locale!==page.locale),
      images:[{url:"/og.png",width:1200,height:630,alt:imageAlt}],
    },
    twitter:{ card:"summary_large_image", title:page.title, description:page.description, images:["/og.png"] },
    verification:{ google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU" },
    icons:SITE_ICONS,
    manifest:"/site.webmanifest",
  };
}

export function homeMetadata(lang:UiLang):Metadata {
  return metadata(HOME_COPY[lang],homeLanguageAlternates,"Text Analysis Tools for word frequency, keyword density, and text comparison");
}

export function bowMetadata(lang:UiLang):Metadata {
  return metadata(BOW_COPY[lang],bowLanguageAlternates,"Bag of Words frequency analysis and text comparison");
}

export function toolWebApplicationSchema({
  name,
  description,
  path,
  inLanguage="en",
  featureList,
}:ToolSchemaInput){
  return {
    "@context":"https://schema.org",
    "@type":"WebApplication",
    name,
    description,
    url:`${SITE_URL}${path}`,
    inLanguage,
    applicationCategory:"UtilitiesApplication",
    operatingSystem:"Any",
    browserRequirements:{
      en:"Requires JavaScript and a modern web browser",
      ru:"Требуется JavaScript и современный веб-браузер",
      uk:"Потрібен JavaScript і сучасний веббраузер",
      es:"Requiere JavaScript y un navegador web moderno",
    }[inLanguage],
    isAccessibleForFree:true,
    offers:{"@type":"Offer",price:"0",priceCurrency:"USD"},
    provider:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
    featureList,
  };
}
