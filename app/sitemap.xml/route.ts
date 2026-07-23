import { SITE_URL } from "../seo-metadata";

const xml=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/ru</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/uk</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/tools/bag-of-words-analyzer</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/ru/tools/bag-of-words-analyzer</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/uk/tools/bag-of-words-analyzer</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/bag-of-words-model</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/bag-of-words-vs-word2vec</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/api-docs</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/tools</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/tools/word-frequency-counter</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/tools/keyword-density-checker</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/how-to-calculate-word-frequency</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/keyword-density-formula</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/ru/bag-of-words-model</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/uk/bag-of-words-model</loc>
    <lastmod>2026-07-23</lastmod>
  </url>
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
