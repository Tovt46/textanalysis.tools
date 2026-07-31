import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/tools";
const title="All Free Text Analysis Tools | Text Analysis Tools";
const description="Free browser-based tools for word frequency, keyword analysis, n-grams, text comparison, Bag of Words, TF-IDF, and text similarity.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const liveTools=[
  ["/tools/word-frequency-counter","Word Frequency Counter","01","Count every word in pasted text or a URL. Search and sort the full vocabulary, edit stop words, and export CSV or JSON.","featured"],
  ["/tools/keyword-density-checker","Keyword Density Checker","02","Measure words, bigrams, and trigrams, track exact phrases, and compare density changes between result A and B.","featured density-card"],
  ["/tools/bag-of-words-analyzer","Bag of Words Analyzer","03","Inspect vocabulary, bigrams, tracked phrases, and Zipf distribution, then save result A and compare it with result B.","featured bow-card"],
  ["/tools/text-analysis-comparison","Text Analysis Comparison","04","Compare two texts or webpages by length, vocabulary, normalized word and bigram frequency, and Zipf diagnostics.","featured comparison-card"],
  ["/tools/ngram-analyzer","N-gram Analyzer","05","Explore recurring phrases from unigrams through longer n-grams.","featured ngram-card"],
  ["/tools/bag-of-words-generator","Bag of Words Generator","06","Build raw term vectors from pasted text or a URL and inspect frequencies, percentages, and vector coverage.","featured"],
  ["/tools/tf-idf-calculator","TF-IDF Calculator","07","Score terms with corpus-aware weights across 2–10 documents for model-ready ranking and filtering.","featured"],
  ["/tools/text-similarity-calculator","Text Similarity Calculator","08","Measure cosine similarity between two texts using BoW or TF-IDF representations and inspect top contribution terms.","featured"],
];

export default function ToolsPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <section className="tools-directory-hero"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Tools</span></nav><p className="eyebrow">COMPLETE TOOL DIRECTORY</p><h1>All text analysis tools</h1><p>Choose a focused workflow for word frequency, keyword density, or document comparison. Every live tool exposes its calculations and processes pasted text without server storage.</p></section>
    <section className="tools-directory" aria-labelledby="available-tools"><div className="directory-heading"><p className="section-number">AVAILABLE NOW</p><h2 id="available-tools">Choose the analysis that matches the question</h2></div><div className="live-tools-grid">{liveTools.map(([href,name,label,copy,theme])=><Link key={name} className={`tool-directory-card ${theme}`} href={href}><div><span>{label} · LIVE</span><h3>{name}</h3><p>{copy}</p></div><strong>Open tool →</strong></Link>)}</div></section>
    <section className="tools-directory learning-directory" aria-labelledby="learning-guides"><div className="directory-heading"><p className="section-number">LEARN THE METHODS</p><h2 id="learning-guides">Formulas, examples, and limitations</h2></div><div className="learning-grid">
      <Link href="/how-to-calculate-word-frequency"><span>GUIDE</span><h3>How to Calculate Word Frequency</h3><p>Counts, percentages, per-1,000 rates, tokenization, and a worked example.</p></Link>
      <Link href="/keyword-density-formula"><span>GUIDE</span><h3>Keyword Density Formula</h3><p>Exact phrase calculations, comparison rules, and why density is not a ranking score.</p></Link>
      <Link href="/bag-of-words-model"><span>NLP GUIDE</span><h3>Bag of Words Model</h3><p>How frequency tables become document vectors and machine-learning features.</p></Link>
      <Link href="/tf-idf-formula"><span>NLP GUIDE</span><h3>TF-IDF Formula</h3><p>Normalized term frequency, smoothed IDF, corpus effects, and a worked example.</p></Link>
      <Link href="/cosine-similarity-for-text"><span>NLP GUIDE</span><h3>Cosine Similarity for Text</h3><p>Vector overlap, BoW versus TF-IDF weighting, contributions, and limits.</p></Link>
      <Link href="/what-are-n-grams"><span>NLP GUIDE</span><h3>What Are N-grams?</h3><p>Unigrams through longer windows, denominator rules, filtering, and practical uses.</p></Link>
      <Link href="/compare-texts-by-word-frequency"><span>WORKFLOW GUIDE</span><h3>Compare Texts by Word Frequency</h3><p>Normalized vocabulary changes without confusing frequency analysis with a character diff.</p></Link>
    </div></section>
    <section className="tools-directory planned-tools" aria-labelledby="developer-tools"><div className="directory-heading"><p className="section-number">AUTOMATE THE TOOLKIT</p><h2 id="developer-tools">Use the same analysis from code, a terminal, or an AI agent</h2><p>Choose a stateless HTTP contract, a local-first npm command, or eight read-only MCP tools.</p></div><div className="planned-grid developer-grid"><Link href="/api-docs"><span>PUBLIC · NO API KEY</span><h3>API documentation</h3><p>Eight versioned operations, OpenAPI schemas, CORS, limits, and copy-ready JSON examples.</p></Link><Link href="/cli"><span>NPM · MIT</span><h3>CLI documentation</h3><p>Eight local commands for files, public URLs, inline text, and piped stdin with JSON or CSV output.</p></Link><Link href="/agents"><span>MCP · OPENAPI</span><h3>AI agent integrations</h3><p>Connect deterministic read-only analysis tools locally through MCP or remotely through OpenAPI.</p></Link></div></section>
    <SiteFooter locale="en"/>
  </main>;
}
