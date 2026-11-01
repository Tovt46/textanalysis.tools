import lastModified from "../content-lastmod.json";
import type { UiLang } from "../i18n";
import { languagePaths,localizedPath } from "../localization";
import { SITE_URL } from "../seo-metadata";

const LANGUAGES=["en","ru","uk","es"] as const satisfies readonly UiLang[];
const PATHS=[
  "/",
  "/tools",
  "/guides",
  "/api-docs",
  "/cli",
  "/agents",
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

// Update content-lastmod.json when page content or its analysis behavior changes.
// Dates are source-history dates, never the request time or an arbitrary build time.
function lastmod(path:string){
  return `<lastmod>${lastModified[path as keyof typeof lastModified]}</lastmod>`;
}

function absolute(path:string){
  return `${SITE_URL}${path}`;
}

function entry(path:string,locale:UiLang){
  const paths=languagePaths(path);
  const alternates=[
    `<xhtml:link rel="alternate" hreflang="en" href="${absolute(paths.en)}" />`,
    `<xhtml:link rel="alternate" hreflang="ru" href="${absolute(paths.ru)}" />`,
    `<xhtml:link rel="alternate" hreflang="uk" href="${absolute(paths.uk)}" />`,
    `<xhtml:link rel="alternate" hreflang="es" href="${absolute(paths.es)}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(paths.en)}" />`,
  ].join("\n    ");
  return `  <url>
    <loc>${absolute(localizedPath(locale,path))}</loc>
    ${lastmod(localizedPath(locale,path))}
    ${alternates}
  </url>`;
}

const privacyEntry=`  <url>
    <loc>${absolute("/privacy")}</loc>
    ${lastmod("/privacy")}
  </url>`;
const evidenceWorkspaceEntry=`  <url>
    <loc>${absolute("/tools/evidence-workspace")}</loc>
    ${lastmod("/tools/evidence-workspace")}
  </url>`;
const rewriteReviewEntry=`  <url>
    <loc>${absolute("/tools/rewrite-review")}</loc>
    ${lastmod("/tools/rewrite-review")}
  </url>`;
const textContractEntry=`  <url>
    <loc>${absolute("/tools/text-contract")}</loc>
    ${lastmod("/tools/text-contract")}
  </url>`;
const identityEntries=["/about","/contact"].map(path=>`  <url><loc>${absolute(path)}</loc>${lastmod(path)}</url>`);
const entries=[...identityEntries,...PATHS.flatMap(path=>LANGUAGES.map(locale=>entry(path,locale))),textContractEntry,evidenceWorkspaceEntry,rewriteReviewEntry,privacyEntry].join("\n");
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
