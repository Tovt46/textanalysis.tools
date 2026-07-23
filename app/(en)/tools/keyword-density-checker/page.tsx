import type { Metadata } from "next";
import Link from "next/link";
import KeywordDensityTool from "../../../KeywordDensityTool";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/keyword-density-checker";
const title="Free Keyword Density Checker for Text & URLs";
const description="Check keyword density for words, bigrams, and trigrams in text or a URL. Track exact phrases, compare two pages, and export counts, percentages, or per-1,000 rates.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

export default function KeywordDensityCheckerPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <KeywordDensityTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">CALCULATION</p>
        <h2>How this keyword density checker calculates percentages</h2>
        <p>Every table uses the same occurrence-based formula: exact term count divided by the total number of words, multiplied by 100. A phrase that appears 4 times in a 1,000-word page therefore has an occurrence density of 0.4% and a normalized rate of 4 per 1,000 words.</p>
        <div className="formula-grid"><div><span>Keyword percentage</span><code>(exact occurrences ÷ total words) × 100</code></div><div><span>Occurrences per 1,000</span><code>(exact occurrences ÷ total words) × 1,000</code></div></div>
        <p>Some tools multiply a phrase count by the number of words inside that phrase. This checker does not. It reports how often the exact unigram, bigram, or trigram occurs, so values remain directly comparable across texts and the formula stays visible.</p>
      </section>
      <section>
        <p className="section-number">PHRASE ANALYSIS</p>
        <h2>Review one-word keywords, bigrams, and trigrams separately</h2>
        <p>Unigrams show individual vocabulary. Bigrams preserve two-word sequences such as “keyword density,” while trigrams expose more specific patterns such as “free SEO tool.” The analyzer builds phrases from consecutive words before applying the table filter, so removing stop-word noise never creates a phrase that did not exist in the source.</p>
        <div className="feature-list"><div><h3>Tracked keywords</h3><p>Check exact phrases you care about even when they are not among the most frequent rows.</p></div><div><h3>Minimum frequency</h3><p>Hide one-off terms while retaining the complete exported result.</p></div><div><h3>Draft vs page</h3><p>Save result A, analyze result B with identical settings, and review the largest percentage-point changes.</p></div><div><h3>URL or pasted text</h3><p>Fetch a public page or analyze a draft locally before it is published.</p></div></div>
      </section>
      <section>
        <p className="section-number">LIMITATIONS</p>
        <h2>Keyword density is diagnostic data, not an optimization target</h2>
        <p>A percentage can show what a page repeats, but it cannot judge search intent, factual usefulness, originality, readability, or semantic coverage. Google’s guidance emphasizes useful, naturally written content and identifies unnatural repetition intended to manipulate rankings as keyword stuffing.</p>
        <div className="article-callout subtle"><b>No universal ideal percentage</b><p>Use density to investigate a page, compare versions, and find accidental repetition. Do not keep adding a phrase until it reaches a preset number.</p></div>
        <p>For the full reasoning, examples, and editorial workflow, read <Link href="/keyword-density-formula">Keyword density: formula and limitations</Link>. You can also review Google’s <a href="https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing" rel="noreferrer">keyword-stuffing policy</a> and <a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" rel="noreferrer">SEO Starter Guide</a>.</p>
      </section>
      <section className="tool-next-links"><p className="section-number">RELATED TOOLS</p><h2>Use frequency data in context</h2><p>Open the simpler word-frequency table for a single vocabulary list, or use the main analyzer for tracked phrases, Zipf distribution, and a broader Bag of Words comparison.</p><div><Link href="/tools/word-frequency-counter">Word Frequency Counter <span>→</span></Link><Link href="/tools/bag-of-words-analyzer">Bag of Words Analyzer <span>→</span></Link><Link href="/keyword-density-formula">Read the density guide <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
