import type { Metadata } from "next";
import Link from "next/link";
import NgramAnalyzerTool from "../../../NgramAnalyzerTool";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/ngram-analyzer";
const title="Free N-gram Analyzer for Text & URLs";
const description="Find recurring word sequences and compare phrase concentration in pasted text or a public webpage. Sort, search, and export full N-gram tables with count, percentage, and per-1,000 rates.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

export default function NgramAnalyzerPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <NgramAnalyzerTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">HOW IT WORKS</p>
        <h2>How N-grams are counted</h2>
        <p>The analyzer tokenizes text into normalized words, then builds overlapping windows of size <strong>n</strong>. For <strong>n=2</strong>, every consecutive pair becomes one row; for <strong>n=3</strong>, every consecutive triple, and so on.</p>
        <div className="formula-grid"><div><span>Phrase percentage</span><code>(phrase count ÷ total n-gram windows) × 100</code></div><div><span>Occurrences per 1,000</span><code>(phrase count ÷ total n-gram windows) × 1,000</code></div></div>
        <p>Window count is the denominator in every row, so a page with repeated high-frequency function words will have lower per-1,000 values as windows increase.</p>
      </section>
      <section>
        <p className="section-number">PRACTICAL SETTINGS</p>
        <h2>Choose n and filtering according to your analysis goal</h2>
        <div className="feature-list">
          <div><h3>N-gram size</h3><p>Use n=1 for lexical repetition, n=2 for short phrases, and n=3+ for more specific linguistic patterns.</p></div>
          <div><h3>Stop words</h3><p>Turn off stop words to focus on content-bearing phrase fragments and reduce repeated filler phrases.</p></div>
          <div><h3>Minimum count filter</h3><p>Filter out one-off windows to keep long outputs usable while preserving full exports.</p></div>
          <div><h3>Local vs URL mode</h3><p>Text mode runs immediately in-browser; URL mode fetches readable webpage text and applies the same calculations.</p></div>
        </div>
      </section>
      <section>
        <p className="section-number">LIMITATIONS</p>
        <h2>N-grams are diagnostic, not semantic</h2>
        <p>An n-gram table shows surface repetition, not intent, meaning, or topical coverage. Use it with unigram and bigram comparatives to validate editorial patterns, and review edits manually before publishing.</p>
      </section>
      <section className="tool-next-links">
        <p className="section-number">WHERE TO GO NEXT</p>
        <h2>Move between phrase frequency and broader analysis</h2>
        <p>Use Word Frequency for a full token-level baseline and Keyword Density for tracked phrase coverage, then compare draft versions in the text comparison tool.</p>
        <div><Link href="/tools/word-frequency-counter">Word Frequency Counter <span>→</span></Link><Link href="/tools/keyword-density-checker">Keyword Density Checker <span>→</span></Link><Link href="/tools/text-analysis-comparison">Text Analysis Comparison <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
