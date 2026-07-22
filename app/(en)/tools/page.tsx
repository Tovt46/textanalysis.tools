import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";

const path="/tools";
const title="Free Text Analysis Tools | BOW Analyzer";
const description="Free browser-based tools for word frequency, keyword analysis, n-grams, text comparison, Bag of Words, TF-IDF, and text similarity.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:"BOW Analyzer",title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const planned=[
  ["Keyword Density Checker","Single words and short phrases with counts and normalized percentages."],
  ["Text Analysis Comparison","Compare vocabulary and frequency changes between two texts."],
  ["N-gram Analyzer","Explore recurring phrases from unigrams through longer n-grams."],
  ["Bag of Words Generator","Create a shared vocabulary and document-term vectors."],
  ["TF-IDF Calculator","Compare raw term frequency with corpus-aware TF-IDF weights."],
  ["Text Similarity Calculator","Measure cosine similarity with BoW or TF-IDF vectors."],
];

export default function ToolsPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <section className="tools-directory-hero"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Analyzer</Link><span>/</span><span>Tools</span></nav><p className="eyebrow">TEXT ANALYSIS TOOLKIT</p><h1>Free text analysis tools</h1><p>Inspect word frequency, document vocabulary, and text differences with transparent calculations. Tools process pasted text without server storage and expose the numbers behind each result.</p></section>
    <section className="tools-directory" aria-labelledby="available-tools"><div className="directory-heading"><p className="section-number">AVAILABLE NOW</p><h2 id="available-tools">Start with word frequency</h2></div><Link className="tool-directory-card featured" href="/tools/word-frequency-counter"><div><span>01 · LIVE</span><h3>Word Frequency Counter</h3><p>Count every word in pasted text or a URL. Search and sort the full vocabulary, edit stop words, and export CSV or JSON.</p></div><strong>Open tool →</strong></Link></section>
    <section className="tools-directory planned-tools" aria-labelledby="planned-tools"><div className="directory-heading"><p className="section-number">PRODUCT ROADMAP</p><h2 id="planned-tools">More focused analyzers are in development</h2><p>Each page will be published only when the underlying calculation and interface are ready to use.</p></div><div className="planned-grid">{planned.map(([name,copy],index)=><article key={name}><span>{String(index+2).padStart(2,"0")} · PLANNED</span><h3>{name}</h3><p>{copy}</p></article>)}</div></section>
    <SiteFooter locale="en"/>
  </main>;
}
