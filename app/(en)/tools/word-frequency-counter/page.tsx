import type { Metadata } from "next";
import Link from "next/link";
import WordFrequencyTool from "../../../WordFrequencyTool";
import { SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";

const path="/tools/word-frequency-counter";
const title="Free Word Frequency Counter for Text & URLs";
const description="Count word frequency in text or a webpage. Search and sort counts, percentages, and frequency per 1,000 words, edit stop words, and export CSV or JSON.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema=toolWebApplicationSchema({
  name:"Word Frequency Counter",
  description,
  path,
  featureList:["Bounded word-frequency table","Counts, percentages, and per-1,000 rates","Editable stop words","Text and URL input","CSV and JSON export"],
});

export default function WordFrequencyCounterPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
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
          <div><h3>CSV and JSON export</h3><p>Download the returned vocabulary page for a spreadsheet, script, or repeatable editorial workflow. A notice appears when the result is partial.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEPS</p>
        <h2>Go beyond a single frequency table</h2>
        <p>Use the main analyzer when you need bigrams, tracked phrases, Zipf distribution, or an A/B comparison. Read the Bag of Words guide to understand how word counts become document features.</p>
        <div><Link href="/how-to-calculate-word-frequency">Read the frequency guide <span>→</span></Link><Link href="/tools/keyword-density-checker">Check keyword density <span>→</span></Link><Link href="/tools/bag-of-words-analyzer">Open the Bag of Words analyzer <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
