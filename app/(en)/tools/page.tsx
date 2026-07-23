import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";

const path="/tools";
const title="All Free Text Analysis Tools | Text Analysis Tools";
const description="Free browser-based tools for word frequency, keyword analysis, n-grams, text comparison, Bag of Words, TF-IDF, and text similarity.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const planned=[
  ["Text Analysis Comparison","Compare vocabulary and frequency changes between two texts."],
  ["N-gram Analyzer","Explore recurring phrases from unigrams through longer n-grams."],
  ["Bag of Words Generator","Create a shared vocabulary and document-term vectors."],
  ["TF-IDF Calculator","Compare raw term frequency with corpus-aware TF-IDF weights."],
  ["Text Similarity Calculator","Measure cosine similarity with BoW or TF-IDF vectors."],
];

export default function ToolsPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <section className="tools-directory-hero"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Tools</span></nav><p className="eyebrow">COMPLETE TOOL DIRECTORY</p><h1>All text analysis tools</h1><p>Choose a focused workflow for word frequency, keyword density, or document comparison. Every live tool exposes its calculations and processes pasted text without server storage.</p></section>
    <section className="tools-directory" aria-labelledby="available-tools"><div className="directory-heading"><p className="section-number">AVAILABLE NOW</p><h2 id="available-tools">Choose the analysis that matches the question</h2></div><div className="live-tools-grid three-tools"><Link className="tool-directory-card featured" href="/tools/word-frequency-counter"><div><span>01 · LIVE</span><h3>Word Frequency Counter</h3><p>Count every word in pasted text or a URL. Search and sort the full vocabulary, edit stop words, and export CSV or JSON.</p></div><strong>Open tool →</strong></Link><Link className="tool-directory-card featured density-card" href="/tools/keyword-density-checker"><div><span>02 · LIVE</span><h3>Keyword Density Checker</h3><p>Measure words, bigrams, and trigrams, track exact phrases, and compare density changes between result A and B.</p></div><strong>Open tool →</strong></Link><Link className="tool-directory-card featured bow-card" href="/tools/bag-of-words-analyzer"><div><span>03 · LIVE</span><h3>Bag of Words Analyzer</h3><p>Inspect vocabulary, bigrams, tracked phrases, and Zipf distribution, then save result A and compare it with result B.</p></div><strong>Open tool →</strong></Link></div></section>
    <section className="tools-directory learning-directory" aria-labelledby="learning-guides"><div className="directory-heading"><p className="section-number">LEARN THE METHODS</p><h2 id="learning-guides">Formulas, examples, and limitations</h2></div><div className="learning-grid"><Link href="/how-to-calculate-word-frequency"><span>GUIDE</span><h3>How to Calculate Word Frequency</h3><p>Counts, percentages, per-1,000 rates, tokenization, and a worked example.</p></Link><Link href="/keyword-density-formula"><span>GUIDE</span><h3>Keyword Density Formula</h3><p>Exact phrase calculations, comparison rules, and why density is not a ranking score.</p></Link><Link href="/bag-of-words-model"><span>NLP GUIDE</span><h3>Bag of Words Model</h3><p>How frequency tables become document vectors and machine-learning features.</p></Link></div></section>
    <section className="tools-directory planned-tools" aria-labelledby="planned-tools"><div className="directory-heading"><p className="section-number">PRODUCT ROADMAP</p><h2 id="planned-tools">More focused analyzers are in development</h2><p>Each page will be published only when the underlying calculation and interface are ready to use.</p></div><div className="planned-grid">{planned.map(([name,copy],index)=><article key={name}><span>{String(index+4).padStart(2,"0")} · PLANNED</span><h3>{name}</h3><p>{copy}</p></article>)}</div></section>
    <SiteFooter locale="en"/>
  </main>;
}
