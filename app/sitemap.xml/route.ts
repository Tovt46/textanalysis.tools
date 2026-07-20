const xml=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/</loc>
    <lastmod>2026-07-19</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/ru</loc>
    <lastmod>2026-07-19</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/uk</loc>
    <lastmod>2026-07-19</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/bag-of-words-model</loc>
    <lastmod>2026-07-20</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/bag-of-words-vs-word2vec</loc>
    <lastmod>2026-07-20</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/ru/bag-of-words-model</loc>
    <lastmod>2026-07-19</lastmod>
  </url>
  <url>
    <loc>https://bow-zipf-lab.tovt7.chatgpt.site/uk/bag-of-words-model</loc>
    <lastmod>2026-07-19</lastmod>
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
