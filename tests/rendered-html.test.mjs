import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

function request(path, init = {}) {
  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("renders the English analyzer with production SEO metadata", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Free Bag of Words SEO Analyzer &amp; Comparison \| BOW Analyzer<\/title>/i);
  assert.match(html, /rel="canonical" href="https:\/\/textanalysis\.tools\/"/i);
  assert.match(html, /property="og:image" content="https:\/\/textanalysis\.tools\/social-card\.png"/i);
  assert.match(html, /Free Bag of Words SEO analyzer/i);
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
  assert.match(xml, /<loc>https:\/\/textanalysis\.tools\/tools\/word-frequency-counter<\/loc>/);
});

test("renders the word frequency tool as a canonical English search page", async () => {
  const response = await request("/tools/word-frequency-counter", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
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
