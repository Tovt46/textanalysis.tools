import { SITE_URL } from "../seo-metadata";

type Alternate = { language:string; href:string };
type SitemapEntry = { url:string; alternates:Alternate[] };

const lastModified="2026-07-19T03:57:45.000Z";

const analyzerAlternates:Alternate[]=[
  {language:"en",href:`${SITE_URL}/`},
  {language:"ru",href:`${SITE_URL}/ru`},
  {language:"uk",href:`${SITE_URL}/uk`},
  {language:"x-default",href:`${SITE_URL}/`},
];

const articleAlternates:Alternate[]=[
  {language:"en",href:`${SITE_URL}/bag-of-words-model`},
  {language:"ru",href:`${SITE_URL}/ru/bag-of-words-model`},
  {language:"uk",href:`${SITE_URL}/uk/bag-of-words-model`},
  {language:"x-default",href:`${SITE_URL}/bag-of-words-model`},
];

const entries:SitemapEntry[]=[
  {url:`${SITE_URL}/`,alternates:analyzerAlternates},
  {url:`${SITE_URL}/ru`,alternates:analyzerAlternates},
  {url:`${SITE_URL}/uk`,alternates:analyzerAlternates},
  {url:`${SITE_URL}/bag-of-words-model`,alternates:articleAlternates},
  {url:`${SITE_URL}/ru/bag-of-words-model`,alternates:articleAlternates},
  {url:`${SITE_URL}/uk/bag-of-words-model`,alternates:articleAlternates},
];

function renderEntry(entry:SitemapEntry){
  const alternates=entry.alternates
    .map(item=>`    <xhtml:link rel="alternate" hreflang="${item.language}" href="${item.href}" />`)
    .join("\n");

  return [
    "  <url>",
    `    <loc>${entry.url}</loc>`,
    alternates,
    `    <lastmod>${lastModified}</lastmod>`,
    "  </url>",
  ].join("\n");
}

export function GET(){
  const xml=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries.map(renderEntry).join("\n\n"),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml,{
    headers:{
      "Content-Type":"application/xml; charset=utf-8",
      "Cache-Control":"public, max-age=3600",
      "X-Robots-Tag":"noindex, follow",
    },
  });
}
