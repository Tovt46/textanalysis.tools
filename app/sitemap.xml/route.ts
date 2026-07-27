import type { UiLang } from "../i18n";
import { languagePaths,localizedPath } from "../localization";
import { SITE_URL } from "../seo-metadata";

const LAST_MODIFIED="2026-07-27";
const LANGUAGES=["en","ru","uk"] as const satisfies readonly UiLang[];
const PATHS=[
  "/",
  "/tools",
  "/guides",
  "/api-docs",
  "/cli",
  "/tools/word-frequency-counter",
  "/tools/keyword-density-checker",
  "/tools/bag-of-words-analyzer",
  "/tools/text-analysis-comparison",
  "/tools/ngram-analyzer",
  "/tools/bag-of-words-generator",
  "/tools/tf-idf-calculator",
  "/tools/text-similarity-calculator",
  "/how-to-calculate-word-frequency",
  "/keyword-density-formula",
  "/bag-of-words-model",
  "/bag-of-words-vs-word2vec",
  "/tf-idf-formula",
  "/cosine-similarity-for-text",
  "/what-are-n-grams",
  "/compare-texts-by-word-frequency",
] as const;

function absolute(path:string){
  return `${SITE_URL}${path}`;
}

function entry(path:string,locale:UiLang){
  const paths=languagePaths(path);
  const alternates=[
    `<xhtml:link rel="alternate" hreflang="en" href="${absolute(paths.en)}" />`,
    `<xhtml:link rel="alternate" hreflang="ru" href="${absolute(paths.ru)}" />`,
    `<xhtml:link rel="alternate" hreflang="uk" href="${absolute(paths.uk)}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(paths.en)}" />`,
  ].join("\n    ");
  return `  <url>
    <loc>${absolute(localizedPath(locale,path))}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    ${alternates}
  </url>`;
}

const entries=PATHS.flatMap(path=>LANGUAGES.map(locale=>entry(path,locale))).join("\n");
const xml=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

const headers={
  "Content-Type":"application/xml; charset=utf-8",
  "Cache-Control":"public, max-age=3600, s-maxage=3600",
  "Content-Length":String(new TextEncoder().encode(xml).length),
};

export function GET(){
  return new Response(xml,{status:200,headers});
}

export function HEAD(){
  return new Response(null,{status:200,headers});
}
