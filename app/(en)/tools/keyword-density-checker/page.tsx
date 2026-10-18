import type { Metadata } from "next";
import Link from "next/link";
import KeywordDensityTool from "../../../KeywordDensityTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";

const path="/tools/keyword-density-checker";
const title="Free Keyword Density Checker for Text & URLs";
const description="Check keyword density for words, bigrams, and trigrams in text or a URL. Track exact phrases, compare two pages, and export counts, percentages, or per-1,000 rates.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:SITE_MANIFEST,
};

const schema=toolWebApplicationSchema({
  name:"Keyword Density Checker",
  description,
  path,
  featureList:["Unigram, bigram, and trigram density","Tracked exact phrases","Text and URL input","A/B density comparison","CSV and JSON export"],
});

export default function KeywordDensityCheckerPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <KeywordDensityTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">CHECK WORDS AND EXACT PHRASES</p>
        <h2>See how often a keyword appears in your text</h2>
        <p>Add your draft to the keyword density checker and enter the words or phrases you want to track before running the calculation. A public webpage URL works too. For a URL, you first review the fetched text and choose the part of the page you want the checker to analyze.</p>
        <p>Single words, two-word phrases, and three-word phrases each have a separate results table. There is also a table for your tracked keywords, so you can find a phrase with one occurrence or none at all without looking for it among the most frequent terms.</p>
      </section>
      <section>
        <p className="section-number">CALCULATION</p>
        <h2>How this keyword density checker calculates percentages</h2>
        <p>An occurrence means one exact match, whether the term is a word or a phrase. Every table divides that count by the total words and multiplies it by 100. On a 1,000-word page, a phrase with 4 matches has an occurrence density of 0.4%. Expressed per 1,000 words, the same count gives a normalized rate of 4.</p>
        <div className="formula-grid"><div><span>Keyword percentage</span><code>(exact occurrences ÷ total words) × 100</code></div><div><span>Occurrences per 1,000</span><code>(exact occurrences ÷ total words) × 1,000</code></div></div>
        <p>For a two-word keyword that appears four times, the count is four occurrences. There is no multiplication by the number of words within the keyword. When a different tool reports another density for the same text, check how its formula compares with the one shown here.</p>
        <h3>A keyword density example you can reproduce</h3>
        <div className="article-callout subtle"><b>Paste this text</b><p>Local editors review drafts. Local editors check facts. Editors review drafts again.</p></div>
        <p>With English selected, add “local editors” and “local editor” as tracked phrases. There are 12 words in the example, and “Local editors” matches twice. That gives an occurrence density of 16.67%, or 166.67 per 1,000 words. The singular “Local editor” has zero exact occurrences. Capitalization does not affect matching, but singular and plural forms count as different tokens.</p>
      </section>
      <section>
        <p className="section-number">PHRASE ANALYSIS</p>
        <h2>What stop words and phrase matching change</h2>
        <p>A unigram is a single word. For a bigram, the checker takes two consecutive words, such as “keyword density”; a trigram has three, as in “free SEO tool.” It builds these sequences before filtering stop words. Leaving stop-word noise out of the results therefore cannot create a phrase by joining words that had a stop word between them in the source.</p>
        <p>Excluding stop words hides them individually from the unigram table. A phrase is hidden only if all of its words are stop words. Neither the total-word denominator nor the counts for tracked exact phrases change with this filter. In the <Link href="/tools/word-frequency-counter">word frequency counter</Link>, percentages work differently because their denominator is the words left after filtering.</p>
        <p>Phrase matching uses the tokenized text, where punctuation separates tokens. That means an exact match can cross a sentence boundary. Words with different endings and synonyms remain separate, so select the term and read its source context to see whether the match belongs to the passage you intended to measure.</p>
      </section>
      <section>
        <p className="section-number">REVIEW A REVISION</p>
        <h2>Compare keyword density before and after editing</h2>
        <p>Save the original analysis as result A, then add the revision as B and run it again. For this comparison, the saved language, stop-word list, and tracked keywords stay locked. Read the change as B minus A in percentage points. Moving from 0.4% to 0.6%, for instance, means a rise of 0.2 percentage points.</p>
        <p>One-off terms remain in the returned result even when the minimum-count filter hides them on screen. A CSV export takes the active phrase-length table; JSON includes the returned tables for words, phrases, and tracked keywords. The screen displays up to 500 matching rows. Each phrase-length result can contain up to 2,000 rows, and a notice tells you when it is partial.</p>
        <p>The browser analyzes pasted text directly. With a URL, the server fetches the page without retaining its content, then your browser analyzes the text you have reviewed. Before comparing webpages, check that the source scope is the same on each. If just one includes menus and footers, their repeated words can overwhelm the article vocabulary.</p>
      </section>
      <section>
        <p className="section-number">LIMITATIONS</p>
        <h2>Is there an ideal keyword density?</h2>
        <p>There is no percentage that works as a universal keyword-density target. Counts can reveal a repeat you did not intend, or confirm that an edit kept an exact phrase. They cannot assess search intent, factual usefulness, originality, readability, or semantic coverage. Whether a keyword needs adding or removing is a decision to make after reading the passage.</p>
        <p>Google&apos;s <a href="https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing" rel="noreferrer">keyword-stuffing policy</a> addresses unnatural repetition intended to manipulate rankings. You can find broader guidance in its <a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" rel="noreferrer">SEO Starter Guide</a>. The calculation and editorial examples are in <Link href="/keyword-density-formula">Keyword density: formula and limitations</Link>.</p>
      </section>
      <section className="tool-next-links"><p className="section-number">RELATED TOOLS</p><h2>Choose the next check</h2><p>For repeated vocabulary, use the single-word frequency table. A revision may need a comparison of the full A/B word changes, while the Bag of Words analysis gives you a broader view.</p><div><Link href="/tools/word-frequency-counter">Word Frequency Counter <span>→</span></Link><Link href="/tools/text-analysis-comparison">Compare two texts <span>→</span></Link><Link href="/tools/bag-of-words-analyzer">Bag of Words Analyzer <span>→</span></Link><Link href="/keyword-density-formula">Read the density guide <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
