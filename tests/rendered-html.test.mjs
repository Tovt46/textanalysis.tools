import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const TEST_BASE_URL = process.env.TEST_BASE_URL?.trim();
let workerCache;

async function requestFromWorker(path, init = {}) {
  if (!workerCache) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerCache = import(workerUrl.href).then(({ default: worker }) => worker);
  }

  const worker = await workerCache;

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const request = TEST_BASE_URL
  ? (path, init = {}) => fetch(new URL(path, TEST_BASE_URL), init)
  : requestFromWorker;

function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("renders the English product homepage with live tools and production SEO metadata", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Free Text Analysis Tools for Words, Keywords &amp; Comparison<\/title>/i);
  assert.match(html, /rel="canonical" href="https:\/\/textanalysis\.tools\/?"/i);
  assert.match(html, /property="og:image" content="https:\/\/textanalysis\.tools\/og\.png"/i);
  assert.match(html, /<h1>Free text analysis tools\./i);
  assert.match(html, /Word Frequency Counter/i);
  assert.match(html, /Keyword Density Checker/i);
  assert.match(html, /Bag of Words Analyzer/i);
  assert.match(html, /Text Analysis Comparison/i);
  assert.match(html, /N-gram Analyzer/i);
  assert.match(html, /Bag of Words Generator/i);
  assert.match(html, /TF-IDF Calculator/i);
  assert.match(html, /Text Similarity Calculator/i);
  assert.match(html, />8<\/strong><span>live tools/i);
  assert.doesNotMatch(html, /<textarea/i);
});

test("redirects /en to the canonical public origin", async () => {
  const response=await request("/en",{redirect:"manual"});
  assert.equal(response.status,308);
  assert.equal(response.headers.get("location"),"https://textanalysis.tools/");
});

test("renders the Bag of Words analyzer on its dedicated multilingual route", async () => {
  const response = await request("/tools/bag-of-words-analyzer", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Free Bag of Words SEO Analyzer &amp; Comparison<\/title>/i);
  assert.match(html, /rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/bag-of-words-analyzer"/i);
  assert.match(html, /hrefLang="ru" href="https:\/\/textanalysis\.tools\/ru\/tools\/bag-of-words-analyzer"/i);
  assert.match(html, /Free Bag of Words SEO analyzer/i);
  assert.match(html, /<textarea/i);
});

test("counts tracked phrases as exact token sequences and allows overlaps", async () => {
  const response = await post("/api/v1/analyze", {
    source: "cart cart art alpha alpha alpha",
    language: "en",
    keepStopwords: true,
    focus: ["art", "alpha alpha"],
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.result.focusCoverage.find((row) => row.term === "art").count, 1);
  assert.equal(data.result.focusCoverage.find((row) => row.term === "alpha alpha").count, 2);
});

test("decodes HTML entities without counting entity names as words", async () => {
  const response = await post("/api/v1/analyze", {
    source: "<p>AI &copy; SEO &mdash; AI</p>",
    language: "en",
    keepStopwords: true,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.result.tokenCount, 3);
  assert.deepEqual(data.result.rows.map((row) => row.term), ["ai", "seo"]);
});

test("top changes display length but not full-distribution zone totals", async () => {
  const source = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"]
    .flatMap((term, index) => Array(11 - index).fill(term)).join(" ");
  const [small, large] = await Promise.all([
    post("/api/v1/analyze", { source, language: "en", keepStopwords: true, top: 5, tolerance: 1.2 }),
    post("/api/v1/analyze", { source, language: "en", keepStopwords: true, top: 10, tolerance: 1.2 }),
  ]);
  const a = await small.json();
  const b = await large.json();
  assert.equal(a.result.rows.length, 5);
  assert.equal(b.result.rows.length, 10);
  assert.deepEqual(a.result.zoneCounts, b.result.zoneCounts);
});

test("comparison uses full term counts instead of false zeros outside top", async () => {
  const make = (counts) => Object.entries(counts).flatMap(([term, count]) => Array(count).fill(term)).join(" ");
  const response = await post("/api/v1/compare", {
    a: { source: make({ alpha: 10, beta: 9, gamma: 8, delta: 7, epsilon: 6, zeta: 2 }), language: "en", keepStopwords: true, top: 5 },
    b: { source: make({ zeta: 10, alpha: 3, beta: 2, gamma: 1 }), language: "en", keepStopwords: true, top: 5 },
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.resultA.rows.some((row) => row.term === "zeta"), false);
  const zeta = data.comparison.wordChanges.find((row) => row.term === "zeta");
  assert.equal(zeta.countA, 2);
  assert.equal(zeta.countB, 10);
});

test("returns a client error for text that is too short", async () => {
  const response = await post("/api/analyze", { source: "one two", language: "en", keepStopwords: true, uiLanguage: "en" });
  assert.equal(response.status, 422);
  const data = await response.json();
  assert.match(data.error, /too little text/i);
});

test("runs pasted-text analysis locally and handles non-JSON URL errors", async () => {
  const source = await readFile(new URL("../app/BowApp.tsx", import.meta.url), "utf8");
  assert.match(source, /if\(sourceType==="text"\)\{\s*const localResult=analyzeText/);
  assert.match(source, /const raw=await response\.text\(\)/);
  assert.doesNotMatch(source, /const data=await response\.json\(\)/);
});

test("serves a valid XML sitemap", async () => {
  const response = await request("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/xml/i);
  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/uk<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/bag-of-words-analyzer<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/ru\/tools\/bag-of-words-analyzer<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/uk\/tools\/bag-of-words-analyzer<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/word-frequency-counter<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/keyword-density-checker<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/ngram-analyzer<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/text-analysis-comparison<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/bag-of-words-generator<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/tf-idf-calculator<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/text-similarity-calculator<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/how-to-calculate-word-frequency<\/loc>/);
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/keyword-density-formula<\/loc>/);
});

test("renders the word frequency tool as a canonical English search page", async () => {
  const response = await request("/tools/word-frequency-counter", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")||"",/s-maxage=300(?:\D|$)/i);
  const html = await response.text();
  assert.match(html, /<title>Free Word Frequency Counter for Text &amp; URLs<\/title>/i);
  assert.match(html, /rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/word-frequency-counter"/i);
  assert.match(html, /<h1>Word Frequency Counter<\/h1>/i);
  assert.match(html, /Export CSV/i);
  assert.doesNotMatch(html, /hrefLang="ru" href="https:\/\/textanalysis\.tools\/ru\/tools/i);
});

test("word frequency endpoint handles short text and returns the full vocabulary", async () => {
  const terms=Array.from({length:130},(_,index)=>`term${String(index).padStart(3,"0")}`);
  const response=await post("/api/word-frequency",{source:[...terms,"term000","term000"].join(" "),language:"en",keepStopwords:true});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.result.tokenCount,132);
  assert.equal(data.result.rows.length,130);
  assert.deepEqual(data.result.rows[0],{term:"term000",count:3,percentage:(3/132)*100,per1000:(3/132)*1000});
});

test("versioned word frequency endpoint is self-describing and supports CORS", async () => {
  const [descriptor,preflight,response]=await Promise.all([
    request("/api/v1/word-frequency"),
    request("/api/v1/word-frequency",{
      method:"OPTIONS",
      headers:{
        origin:"https://example.com",
        "access-control-request-method":"POST",
        "access-control-request-headers":"content-type",
      },
    }),
    post("/api/v1/word-frequency",{source:"alpha beta alpha",language:"en",keepStopwords:true}),
  ]);
  assert.equal(descriptor.status,200);
  assert.equal((await descriptor.json()).operation,"word-frequency");
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
  assert.match(preflight.headers.get("access-control-allow-methods"),/POST/);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.storage,"none");
  assert.deepEqual(data.result.rows[0],{term:"alpha",count:2,percentage:(2/3)*100,per1000:(2/3)*1000});
});

test("browser analytics remains opt-in and tracks core product actions", async () => {
  const [analytics,bow,frequency]=await Promise.all([
    readFile(new URL("../app/Analytics.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BowApp.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/WordFrequencyTool.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(analytics,/NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(bow,/comparison_result_saved/);
  assert.match(bow,/comparison_completed/);
  assert.match(frequency,/url_analysis_started/);
  assert.match(frequency,/analysis_error/);
});

test("renders the keyword density checker with canonical metadata and useful content", async () => {
  const response=await request("/tools/keyword-density-checker",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free Keyword Density Checker for Text &amp; URLs<\/title>/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/keyword-density-checker"/i);
  assert.match(html,/<h1>Keyword Density Checker<\/h1>/i);
  assert.match(html,/Density is a measurement, not a ranking score/i);
  assert.match(html,/one-word keywords, bigrams, and trigrams/i);
});

test("renders the standalone text comparison with canonical metadata and two inputs", async () => {
  const response=await request("/tools/text-analysis-comparison",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free Text Comparison Tool for Word Frequency Changes<\/title>/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/text-analysis-comparison"/i);
  assert.match(html,/<h1>Compare two texts word by word<\/h1>/i);
  assert.match(html,/aria-label="Original text"/i);
  assert.match(html,/aria-label="Updated text"/i);
  assert.match(html,/Frequency change is not semantic similarity or content quality/i);
  assert.doesNotMatch(html,/hrefLang="ru" href="https:\/\/textanalysis\.tools\/ru\/tools\/text-analysis-comparison/i);
});

test("renders the n-gram analyzer page with canonical metadata and phrase methodology", async () => {
  const response=await request("/tools/ngram-analyzer",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free N-gram Analyzer for Text &amp; URLs<\/title>/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/ngram-analyzer"/i);
  assert.match(html,/<h1>N-gram Analyzer<\/h1>/i);
  assert.match(html,/How N-grams are counted/i);
});

test("renders the bag-of-words generator page with canonical metadata and export workflow", async () => {
  const response=await request("/tools/bag-of-words-generator",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free Bag of Words Generator for Text &amp; URLs<\/title>/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/bag-of-words-generator"/i);
  assert.match(html,/<h1>Bag of Words Generator<\/h1>/i);
  assert.match(html,/Build term vectors/i);
  assert.match(html,/CSV and JSON export/i);
});

test("renders the TF-IDF calculator page with canonical metadata and weighting explanation", async () => {
  const response=await request("/tools/tf-idf-calculator",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free TF-IDF Calculator for Text &amp; URLs/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/tf-idf-calculator"/i);
  assert.match(html,/<h1>TF-IDF Calculator<\/h1>/i);
  assert.match(html,/Term frequency and rarity are combined/i);
  assert.match(html,/Global IDF table/i);
});

test("renders the text similarity calculator page with canonical metadata and cosine sections", async () => {
  const response=await request("/tools/text-similarity-calculator",{headers:{accept:"text/html"}});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Free Text Similarity Calculator for Text &amp; URLs/i);
  assert.match(html,/rel="canonical" href="https:\/\/textanalysis\.tools\/tools\/text-similarity-calculator"/i);
  assert.match(html,/<h1>Text Similarity Calculator<\/h1>/i);
  assert.match(html,/Cosine similarity/i);
  assert.match(html,/Top contribution terms/i);
});

test("standalone comparison keeps pasted text local and reuses the public API for URLs", async () => {
  const source=await readFile(new URL("../app/TextComparisonTool.tsx",import.meta.url),"utf8");
  assert.match(source,/if\(sourceTypeA==="text"&&sourceTypeB==="text"\)\{/);
  assert.match(source,/comparison:compareAnalysisResults\(/);
  assert.match(source,/fetch\("\/api\/v1\/compare"/);
  assert.doesNotMatch(source,/trackEvent/);
});

test("keyword density uses total words and counts exact tracked phrases", async () => {
  const response=await post("/api/keyword-density",{
    source:"keyword density is useful keyword density checks keyword density",
    language:"en",
    keepStopwords:true,
    trackedKeywords:"keyword density",
  });
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.result.wordCount,9);
  assert.equal(data.result.trackedKeywords[0].count,3);
  const phrase=data.result.bigrams.find(row=>row.term==="keyword density");
  assert.equal(phrase.count,3);
  assert.equal(phrase.percentage,(3/9)*100);
  assert.equal(phrase.per1000,(3/9)*1000);
});

test("keyword density stop-word filtering preserves real phrase adjacency", async () => {
  const response=await post("/api/keyword-density",{
    source:"seo and content seo and content",
    language:"en",
    keepStopwords:false,
  });
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.result.unigrams.some(row=>row.term==="and"),false);
  assert.equal(data.result.bigrams.some(row=>row.term==="seo content"),false);
  assert.equal(data.result.bigrams.find(row=>row.term==="seo and").count,2);
  assert.equal(data.result.bigrams.find(row=>row.term==="and content").count,2);
});

test("versioned keyword density endpoint is documented and supports CORS", async () => {
  const preflight=await request("/api/v1/keyword-density",{
    method:"OPTIONS",
    headers:{
      origin:"https://example.com",
      "access-control-request-method":"POST",
      "access-control-request-headers":"content-type",
    },
  });
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");

  const response=await post("/api/v1/keyword-density",{
    source:"keyword density keyword density",
    language:"en",
    keepStopwords:true,
    trackedKeywords:"keyword density",
  });
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.result.trackedKeywords[0].count,2);

  const openapi=await request("/openapi.json");
  assert.equal(openapi.status,200);
  const document=await openapi.json();
  assert.ok(document.paths["/api/v1/word-frequency"]);
  assert.ok(document.paths["/api/v1/keyword-density"]);
  assert.ok(document.paths["/api/v1/ngram-analyzer"]);
  assert.ok(document.paths["/api/v1/bag-of-words"]);
  assert.ok(document.paths["/api/v1/tf-idf"]);
  assert.ok(document.paths["/api/v1/similarity"]);
  assert.ok(document.components.schemas.WordFrequencyResponse);
  assert.ok(document.components.schemas.KeywordDensityResponse);
  assert.ok(document.components.schemas.NgramAnalyzerResponse);
  assert.ok(document.components.schemas.BagOfWordsResponse);
  assert.ok(document.components.schemas.TfIdfResponse);
  assert.ok(document.components.schemas.SimilarityResponse);
});

test("versioned n-gram analyzer endpoint is documented and supports CORS", async () => {
  const [descriptor,preflight,response]=await Promise.all([
    request("/api/v1/ngram-analyzer"),
    request("/api/v1/ngram-analyzer",{
      method:"OPTIONS",
      headers:{
        origin:"https://example.com",
        "access-control-request-method":"POST",
        "access-control-request-headers":"content-type",
      },
    }),
    post("/api/v1/ngram-analyzer",{
      source:"search engines rank useful pages when content stays on topic",
      language:"en",
      keepStopwords:false,
      ngramSize:2,
    }),
  ]);
  assert.equal(descriptor.status,200);
  assert.equal((await descriptor.json()).operation,"ngram-analyzer");
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
  assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.storage,"none");
  assert.equal(data.result.n,2);
  assert.equal(data.result.ngramCount,9);
});

test("versioned bag-of-words endpoint is documented and returns vocabulary with normalized rates", async () => {
  const [descriptor,preflight,response]=await Promise.all([
    request("/api/v1/bag-of-words"),
    request("/api/v1/bag-of-words",{
      method:"OPTIONS",
      headers:{
        origin:"https://example.com",
        "access-control-request-method":"POST",
        "access-control-request-headers":"content-type",
      },
    }),
    post("/api/v1/bag-of-words",{
      source:"alpha beta alpha gamma",
      language:"en",
      keepStopwords:true,
    }),
  ]);
  assert.equal(descriptor.status,200);
  assert.equal((await descriptor.json()).operation,"bag-of-words");
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
  assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.result.rows[0].term,"alpha");
  assert.equal(data.result.rows[0].count,2);
  assert.equal(typeof data.result.rows[0].frequency,"number");
});

test("versioned tf-idf endpoint supports two documents and returns idf table", async () => {
  const [descriptor,preflight,response]=await Promise.all([
    request("/api/v1/tf-idf"),
    request("/api/v1/tf-idf",{
      method:"OPTIONS",
      headers:{
        origin:"https://example.com",
        "access-control-request-method":"POST",
        "access-control-request-headers":"content-type",
      },
    }),
    post("/api/v1/tf-idf",{
      documents:[
        {source:"alpha beta alpha",language:"en",keepStopwords:true},
        {source:"alpha gamma alpha",language:"en",keepStopwords:true},
      ],
      top:50,
    }),
  ]);
  assert.equal(descriptor.status,200);
  assert.equal((await descriptor.json()).operation,"tf-idf");
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
  assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.result.documentCount,2);
  assert.equal(data.result.top,50);
  assert.equal(data.result.documents.length,2);
  assert.equal(Array.isArray(data.result.idfTable),true);
});

test("versioned similarity endpoint supports tf-idf and returns overlap diagnostics", async () => {
  const [descriptor,preflight,response]=await Promise.all([
    request("/api/v1/similarity"),
    request("/api/v1/similarity",{
      method:"OPTIONS",
      headers:{
        origin:"https://example.com",
        "access-control-request-method":"POST",
        "access-control-request-headers":"content-type",
      },
    }),
    post("/api/v1/similarity",{
      a:{source:"alpha beta alpha",language:"en",keepStopwords:true},
      b:{source:"alpha gamma",language:"en",keepStopwords:true},
      method:"tf-idf",
      top:50,
    }),
  ]);
  assert.equal(descriptor.status,200);
  assert.equal((await descriptor.json()).operation,"text-similarity");
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
  assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /POST/);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.apiVersion,"1.0");
  assert.equal(data.result.method,"tfidf");
  assert.ok(typeof data.result.cosine==="number");
  assert.ok(data.result.topTerms.length>0);
});

test("tf-idf similarity uses weighted vectors instead of raw term frequency",async()=>{
  const payload={
    a:{source:"common common common alpha alpha alpha",language:"en",keepStopwords:true},
    b:{source:"common common common beta beta beta",language:"en",keepStopwords:true},
    top:50,
  };
  const [bowResponse,tfidfResponse]=await Promise.all([
    post("/api/v1/similarity",{...payload,method:"bow"}),
    post("/api/v1/similarity",{...payload,method:"tf-idf"}),
  ]);
  assert.equal(bowResponse.status,200);
  assert.equal(tfidfResponse.status,200);
  const bow=await bowResponse.json();
  const tfidf=await tfidfResponse.json();
  assert.ok(tfidf.result.cosine<bow.result.cosine);
  assert.ok(tfidf.result.documents[0].rows.some((row)=>row.term==="alpha"&&row.idf>1));
});

test("rate limits the legacy URL-analysis endpoint", async () => {
  const headers={"content-type":"application/json","x-forwarded-for":"198.51.100.77"};
  for(let attempt=0;attempt<30;attempt+=1){
    const response=await request("/api/analyze",{method:"POST",headers,body:"{"});
    assert.equal(response.status,400);
  }
  const limited=await request("/api/analyze",{method:"POST",headers,body:"{"});
  assert.equal(limited.status,429);
  assert.equal(limited.headers.get("retry-after"),"60");
  const data=await limited.json();
  assert.equal(data.error.code,"RATE_LIMITED");
});

test("renders both educational pages with unique canonical titles", async () => {
  const [frequency,density]=await Promise.all([
    request("/how-to-calculate-word-frequency",{headers:{accept:"text/html"}}),
    request("/keyword-density-formula",{headers:{accept:"text/html"}}),
  ]);
  assert.equal(frequency.status,200);assert.equal(density.status,200);
  const [frequencyHtml,densityHtml]=await Promise.all([frequency.text(),density.text()]);
  assert.match(frequencyHtml,/<title>How to Calculate Word Frequency: Formula &amp; Example<\/title>/i);
  assert.match(frequencyHtml,/rel="canonical" href="https:\/\/textanalysis\.tools\/how-to-calculate-word-frequency"/i);
  assert.match(densityHtml,/<title>Keyword Density: Formula, Examples &amp; Limitations<\/title>/i);
  assert.match(densityHtml,/rel="canonical" href="https:\/\/textanalysis\.tools\/keyword-density-formula"/i);
  assert.match(densityHtml,/developers\.google\.com\/search\/docs\/essentials\/spam-policies#keyword-stuffing/i);
});
