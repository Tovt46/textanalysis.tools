import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/api-docs";
const title="Free Text Analysis API Documentation";
const description="Use the free Text Analysis Tools API for word frequency, keyword density, n-grams, Bag of Words, TF-IDF, and similarity checks.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title,
  description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  icons:SITE_ICONS,
  manifest:"/site.webmanifest",
};

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

const densityExample=`{
  "source": "Keyword density can be measured without chasing a target density.",
  "language": "en",
  "trackedKeywords": "keyword density, target density"
}`;

const bagOfWordsExample=`{
  "source": "Text analysis turns words into countable features.",
  "language": "en",
  "keepStopwords": false
}`;

const tfidfExample=`{
  "documents": [
    { "source": "Text analysis turns words into countable features." },
    { "source": "Text similarity uses cosine overlap across vectors." }
  ],
  "top": 50
}`;

const similarityExample=`{
  "a": { "source": "Text analysis is useful for editorial review.", "language": "en" },
  "b": { "source": "Similarity compares weighted terms across versions.", "language": "en" },
  "method": "tf-idf",
  "top": 50
}`;

const ngramExample=`{
  "source": "search engines rank useful pages higher when content stays focused on intent",
  "language": "en",
  "ngramSize": 2,
  "keepStopwords": false
}`;

export default function ApiDocsPage(){
  return <main className="article-page">
    <SiteHeader locale="en" active="api" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>API documentation</span></nav><p className="eyebrow">PUBLIC API · NO API KEY</p><h1>Text analysis API for agents and apps</h1><p className="article-deck">Send text or a public URL and receive structured JSON. Analyze one input, build vectors, or compare two versions. Requests are stateless: submitted content is processed and not stored.</p><div className="article-actions"><a className="primary-article-cta" href="#quickstart">Start with one request</a><a href="/openapi.json">Read OpenAPI specification →</a><Link href="/cli">Prefer local CLI? →</Link></div></div>
      <div className="article-layout"><aside className="article-toc" aria-label="On this page"><b>On this page</b><a href="#quickstart">Quickstart</a><a href="#analyze">Analyze endpoint</a><a href="#focused">Focused endpoints</a><a href="#compare">Compare endpoint</a><a href="#weighted">Weight and similarity</a><a href="#response">Response fields</a><a href="#limits">Limits and safety</a><a href="#discovery">Agent discovery</a></aside>
        <div className="article-body api-docs-body">
          <section id="quickstart"><p className="section-number">01</p><h2>Quickstart</h2><p>No account or API key is required. Send JSON to a versioned endpoint:</p><pre className="api-code"><code>{analyzeExample}</code></pre><div className="article-callout"><b>Machine-readable contract</b><p>Import <a href="/openapi.json">/openapi.json</a> into an agent or API client. The specification includes every available operation and its input and response schemas.</p></div></section>
          <section id="analyze"><p className="section-number">02</p><h2>Analyze text or a webpage</h2><p><code>POST /api/v1/analyze</code> accepts raw text, HTML, or a public HTTP(S) URL. Set <code>sourceType</code> to <code>text</code> or <code>url</code>.</p><div className="api-fields"><div><b>source</b><span>required string</span><p>The text, HTML, or URL to analyze.</p></div><div><b>language</b><span>auto · en · ru · uk · es</span><p>Defaults to automatic detection.</p></div><div><b>focus</b><span>string or string[]</span><p>Phrases to count and report per 1,000 words.</p></div><div><b>top</b><span>5–100</span><p>Maximum number of word and bigram rows.</p></div><div><b>tolerance</b><span>1.2–4</span><p>Threshold for above/below-model diagnostics.</p></div><div><b>keepStopwords</b><span>boolean</span><p>Keep common language stop words when true.</p></div></div></section>
          <section id="focused"><p className="section-number">03</p><h2>Use a focused frequency, vector, or density endpoint</h2><p><code>POST /api/v1/word-frequency</code> returns the complete vocabulary with raw count and normalized rates. <code>POST /api/v1/keyword-density</code> returns unigram, bigram, trigram, and exact tracked-phrase tables. <code>POST /api/v1/ngram-analyzer</code> returns n-gram tables for an explicit phrase length.</p><p><code>POST /api/v1/bag-of-words</code> builds complete term vectors with token count, frequency, and normalized rates.</p><pre className="api-code"><code>{densityExample}</code></pre><pre className="api-code"><code>{bagOfWordsExample}</code></pre><p>The density endpoint accepts <code>trackedKeywords</code> as a comma, semicolon, or newline-separated string, while n-gram analysis accepts <code>ngramSize</code> (1-10).</p><pre className="api-code"><code>{ngramExample}</code></pre></section>
          <section id="compare"><p className="section-number">04</p><h2>Compare versions A and B</h2><p><code>POST /api/v1/compare</code> accepts two complete analysis inputs and returns both results plus metric and word-frequency differences. To inspect the same result manually, open the <Link href="/tools/text-analysis-comparison">Text Analysis Comparison tool</Link>.</p><pre className="api-code"><code>{compareExample}</code></pre><p><code>wordChanges</code> is ordered by the largest absolute change in share, useful for revision and QA workflows.</p></section>
          <section id="weighted"><p className="section-number">05</p><h2>Weighting and similarity checks</h2><p><code>POST /api/v1/tf-idf</code> computes TF-IDF tables for 2–10 documents and returns global inverse-document frequencies. <code>POST /api/v1/similarity</code> returns cosine similarity and contribution rows for BoW or TF-IDF vectors.</p><pre className="api-code"><code>{tfidfExample}</code></pre><pre className="api-code"><code>{similarityExample}</code></pre></section>
          <section id="response"><p className="section-number">06</p><h2>Response fields</h2><div className="api-fields"><div><b>tokenCount / wordCount</b><p>Words used as the result denominator after the endpoint&apos;s documented cleanup rule.</p></div><div><b>vocabularySize</b><p>Number of distinct analyzed words.</p></div><div><b>rows / unigrams</b><p>Words with counts, percentages, and per-1,000 values.</p></div><div><b>bigrams / trigrams</b><p>Two- and three-word phrase tables where supported.</p></div><div><b>focusCoverage / trackedKeywords</b><p>Exact phrase counts and occurrences per 1,000 words.</p></div><div><b>fittedExponent</b><p>Estimated frequency-curve exponent returned by the Bag of Words analyzer.</p></div><div><b>tf / idf / tfidf / cosine</b><p>Term and pair-level weighting diagnostics for direct model usage.</p></div></div><p>Successful responses identify <code>apiVersion</code> and storage as <code>none</code>. Errors use a stable <code>error.code</code> and a human-readable <code>error.message</code>.</p></section>
          <section id="limits"><p className="section-number">07</p><h2>Limits and safe use</h2><ul><li>Raw text is limited to 500,000 characters.</li><li>Remote pages are limited to 2,000,000 characters and a 12-second fetch.</li><li>Only public HTTP and HTTPS pages are accepted; private and local network targets are blocked.</li><li>The API allows 30 requests per minute per client on a best-effort basis.</li><li>Use the results as editorial diagnostics, not as guarantees of search ranking.</li></ul></section>
          <section id="discovery"><p className="section-number">08</p><h2>Agent discovery</h2><p>Agents can read <a href="/llms.txt">/llms.txt</a> for a concise capability map and <a href="/openapi.json">/openapi.json</a> for the callable contract. Both resources and every versioned API endpoint support cross-origin access.</p></section>
          <section className="article-final-cta"><p className="eyebrow">FREE · STATELESS</p><h2>Analyze through HTTP or keep the workflow local</h2><p>Call the API from an application, use the web interface manually, or run the npm CLI against local files and stdin.</p><Link href="/cli">Read the CLI documentation <span>→</span></Link></section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
