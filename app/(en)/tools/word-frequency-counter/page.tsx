import type { Metadata } from "next";
import Link from "next/link";
import WordFrequencyTool from "../../../WordFrequencyTool";
import { SITE_ICONS,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/word-frequency-counter";
const title="Free Word Frequency Counter for Text & URLs";
const description="Count word frequency in text or a webpage. Search and sort counts, percentages, and frequency per 1,000 words, edit stop words, and export CSV or JSON.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:"BOW Analyzer",title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

export default function WordFrequencyCounterPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <WordFrequencyTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">HOW IT WORKS</p>
        <h2>How the word frequency counter calculates results</h2>
        <p>The counter converts text to lowercase, removes HTML markup and punctuation, and groups identical tokens. Numeric-only tokens are excluded. By default, common English, Ukrainian, or Russian stop words are removed using the list you can inspect and edit above.</p>
        <div className="formula-grid"><div><span>Percentage</span><code>(word count ÷ analyzed words) × 100</code></div><div><span>Per 1,000 words</span><code>(word count ÷ analyzed words) × 1,000</code></div></div>
        <p>Both normalized values use the number of words left after your stop-word setting. This makes the table internally consistent. To count every function word, enable <strong>Keep stop words</strong> before running the analysis.</p>
      </section>
      <section>
        <p className="section-number">USE THE DATA</p>
        <h2>Compare frequency without treating it as an SEO score</h2>
        <p>Raw counts answer “how often?” Percentage and occurrences per 1,000 words make texts of different lengths easier to compare. These measurements can reveal dominant vocabulary or accidental repetition, but no single percentage proves that a page is relevant, useful, or likely to rank.</p>
        <div className="feature-list">
          <div><h3>Search and sort</h3><p>Find a specific term or rank the table by word, count, percentage, or normalized frequency.</p></div>
          <div><h3>Editable stop words</h3><p>Use the defaults for EN, UKR, and RU, or adapt the list to your project and keep it locally.</p></div>
          <div><h3>Text and URL analysis</h3><p>Analyze pasted content locally or fetch the readable text of a public webpage.</p></div>
          <div><h3>CSV and JSON export</h3><p>Download the complete vocabulary for a spreadsheet, script, or repeatable editorial workflow.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEPS</p>
        <h2>Go beyond a single frequency table</h2>
        <p>Use the main analyzer when you need bigrams, tracked phrases, Zipf distribution, or an A/B comparison. Read the Bag of Words guide to understand how word counts become document features.</p>
        <div><Link href="/">Open the Bag of Words analyzer <span>→</span></Link><Link href="/bag-of-words-model">Read the Bag of Words guide <span>→</span></Link><Link href="/api-docs">Use the analysis API <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
