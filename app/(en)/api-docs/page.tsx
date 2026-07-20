import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";

const path="/api-docs";
const title="Free Bag of Words API Documentation | BOW Analyzer";
const description="Use the free BOW Analyzer API to analyze keyword frequency, bigrams, focus phrases, and Zipf distribution or compare two texts and webpages.";

export const metadata:Metadata={metadataBase:new URL(SITE_URL),title,description,alternates:{canonical:path},openGraph:{type:"website",url:path,siteName:"BOW Analyzer",title,description,locale:"en_US"},twitter:{card:"summary",title,description},icons:SITE_ICONS,manifest:"/site.webmanifest"};

const analyzeExample=`curl -X POST ${SITE_URL}/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceType": "text",
    "source": "Bag of Words turns text into countable features.",
    "language": "auto",
    "focus": ["bag of words"],
    "top": 20
  }'`;

const compareExample=`{
  "a": { "sourceType": "text", "source": "First text version..." },
  "b": { "sourceType": "text", "source": "Updated text version..." }
}`;

export default function ApiDocsPage(){return <main className="article-page">
  <SiteHeader locale="en" active="api"/>
  <article>
    <div className="article-hero"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Free analyzer</Link><span>/</span><span>API documentation</span></nav><p className="eyebrow">PUBLIC API · NO API KEY</p><h1>Bag of Words API for agents and apps</h1><p className="article-deck">Send text or a public URL and receive structured JSON. Analyze one input or compare two versions. Requests are stateless: submitted content is processed and not stored.</p><div className="article-actions"><a className="primary-article-cta" href="#quickstart">Start with one request</a><a href="/openapi.json">Read OpenAPI specification →</a></div></div>
    <div className="article-layout"><aside className="article-toc" aria-label="On this page"><b>On this page</b><a href="#quickstart">Quickstart</a><a href="#analyze">Analyze endpoint</a><a href="#compare">Compare endpoint</a><a href="#response">Response fields</a><a href="#limits">Limits and safety</a><a href="#discovery">Agent discovery</a></aside>
      <div className="article-body api-docs-body">
        <section id="quickstart"><p className="section-number">01</p><h2>Quickstart</h2><p>No account or API key is required. Send JSON to the versioned endpoint:</p><pre className="api-code"><code>{analyzeExample}</code></pre><div className="article-callout"><b>Machine-readable contract</b><p>Import <a href="/openapi.json">/openapi.json</a> into an agent or API client. The specification includes both available operations and their input schemas.</p></div></section>
        <section id="analyze"><p className="section-number">02</p><h2>Analyze text or a webpage</h2><p><code>POST /api/v1/analyze</code> accepts raw text, HTML, or a public HTTP(S) URL. Set <code>sourceType</code> to <code>text</code> or <code>url</code>.</p><div className="api-fields"><div><b>source</b><span>required string</span><p>The text, HTML, or URL to analyze.</p></div><div><b>language</b><span>auto · en · ru · uk</span><p>Defaults to automatic detection.</p></div><div><b>focus</b><span>string or string[]</span><p>Phrases to count and report per 1,000 words.</p></div><div><b>top</b><span>5–100</span><p>Maximum number of word and bigram rows.</p></div><div><b>tolerance</b><span>1.2–4</span><p>Threshold for above/below-model diagnostics.</p></div><div><b>keepStopwords</b><span>boolean</span><p>Keep common language stop words when true.</p></div></div></section>
        <section id="compare"><p className="section-number">03</p><h2>Compare versions A and B</h2><p><code>POST /api/v1/compare</code> accepts two complete analysis inputs and returns both results plus metric and word-frequency differences.</p><pre className="api-code"><code>{compareExample}</code></pre><p><code>wordChanges</code> is ordered by the largest absolute change in share, making it useful for agents reviewing an edited page.</p></section>
        <section id="response"><p className="section-number">04</p><h2>Response fields</h2><div className="api-fields"><div><b>tokenCount</b><p>Words remaining after cleanup and stop-word handling.</p></div><div><b>vocabularySize</b><p>Number of distinct analyzed words.</p></div><div><b>rows</b><p>Ranked words with counts, percentage, per-1,000 value, expected counts, ratios, and zones.</p></div><div><b>bigrams</b><p>Two-word phrases with counts, shares, percentages, and per-1,000 values.</p></div><div><b>focusCoverage</b><p>Tracked phrase counts and occurrences per 1,000 words.</p></div><div><b>fittedExponent</b><p>Estimated frequency-curve exponent.</p></div></div><p>Successful responses identify storage as <code>none</code>. Errors use a stable <code>error.code</code> and a human-readable <code>error.message</code>.</p></section>
        <section id="limits"><p className="section-number">05</p><h2>Limits and safe use</h2><ul><li>Raw text is limited to 500,000 characters.</li><li>Remote pages are limited to 2,000,000 characters and a 12-second fetch.</li><li>Only public HTTP and HTTPS pages are accepted; private and local network targets are blocked.</li><li>The API allows 30 requests per minute per client on a best-effort basis.</li><li>Use the results as editorial diagnostics, not as guarantees of search ranking.</li></ul></section>
        <section id="discovery"><p className="section-number">06</p><h2>Agent discovery</h2><p>Agents can read <a href="/llms.txt">/llms.txt</a> for a concise capability map and <a href="/openapi.json">/openapi.json</a> for the callable contract. Both resources and the API support cross-origin access.</p></section>
        <section className="article-final-cta"><p className="eyebrow">FREE · STATELESS</p><h2>Analyze without storing the submitted text</h2><p>Use the web interface manually or call the same analysis engine from your agent or application.</p><Link href="/">Open the free analyzer <span>→</span></Link></section>
      </div>
    </div>
  </article>
  <SiteFooter locale="en"/>
</main>;}
