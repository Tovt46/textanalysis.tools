import type { Metadata } from "next";
import Link from "next/link";
import WordFrequencyTool from "../../../WordFrequencyTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";
import { WebpageExtractionExample } from "../../../EditorialWorkflowExamples";

const path="/tools/word-frequency-counter";
const title="Free Word Frequency Counter for Text & URLs";
const description="Count word frequency in text or a webpage. Search and sort counts, percentages, and frequency per 1,000 words, edit stop words, and export CSV or JSON.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:SITE_MANIFEST,
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
        <p className="section-number">READ YOUR FREQUENCY TABLE</p>
        <h2>Find repeated words in a draft or webpage</h2>
        <p>Paste a passage, or fetch text from a public URL and check what comes back. The word frequency counter gives each word a row with three values: its count, its percentage of the analyzed text, and its occurrences per 1,000 words. Read the count for the number of appearances. Use the percentage and rate when comparing texts of different lengths.</p>
        <p>A word near the top of the table can look overused until you read it in context. Select it to see the surrounding sentences before making an edit. Repeating a product name may be necessary; repeating a vague word across several sentences may mean those sentences need a clearer subject.</p>
      </section>
      <section>
        <p className="section-number">HOW IT WORKS</p>
        <h2>How the word frequency counter calculates results</h2>
        <p>The counter treats uppercase and lowercase letters alike and strips out HTML markup. Identical tokens share a row. Punctuation marks a word boundary, except that an apostrophe inside a word stays in place. There is no reduction to a shared root: “Book” and “books” have separate counts, as do synonyms.</p>
        <div className="formula-grid"><div><span>Percentage</span><code>(word count ÷ analyzed words) × 100</code></div><div><span>Per 1,000 words</span><code>(word count ÷ analyzed words) × 1,000</code></div></div>
        <p>Both normalized values use the words left after your counting settings are applied. Try pasting “Books, books and booking.” with <strong>Keep stop words</strong> enabled. “books” accounts for two of the four words: 50%, or 500 per 1,000. Now exclude stop words using the default English stop-word list. This removes “and” and leaves three words. “books” still appears twice, which now makes its share 66.67%.</p>
        <h3>Choose which words belong in the count</h3>
        <p>The language setting supplies the stop-word list. You can select English, Spanish, Ukrainian, or Russian yourself, or use language detection. Edit the list if needed; the browser saves your changes to the lists. For counts that include common words such as “and,” turn on <strong>Keep stop words</strong>.</p>
        <p>A token made entirely of numbers is left out by default. Turn on <strong>Keep numbers</strong> to count it, even if it falls below the minimum token length. For non-numeric tokens, <strong>Minimum token length</strong> removes those below the limit. Either setting changes the analyzed total. Keep both settings the same across the results you compare.</p>
      </section>
      <WebpageExtractionExample copy={{
        introduction:<>The article in these two downloadable pages is identical. Page B has extra repeated navigation and footer labels. Analyze the whole page with <strong>English</strong> selected and <strong>Keep stop words</strong> enabled, and you will get different word counts despite that unchanged article.</>,
        results:<>The extra template words change the denominator. Although “revision” occurs twice in each whole page, its share falls from 4.44% to 4.08%. The “contact” count goes the other way, from two occurrences to five. Select main content instead and both pages give you the same 40-word input: “revision” has a share of 5.00%, with no “contact” occurrences.</>,
        reproduction:<>You can check these results in <Link href="/tools/word-frequency-counter">Word Frequency Counter</Link>. Enter the example URLs below and preview the extracted text. Switch between whole-page and main-content selection to compare them, then run the calculation. In main-content mode, check that the preview contains the heading and article paragraph and leaves out the navigation and footer.</>,
        decision:<>Choose one extraction scope and use it for both sources when comparing article vocabulary. If the full page is what you are reviewing, keep its template text deliberately. A cleaner extraction does not establish that the article is better, or that it is more likely to rank.</>,
        next:<>For work involving two pages, <Link href="/tools/text-analysis-comparison">compare the extracted texts side by side</Link>. URL content reaches the web tools through the stateless server; the reviewed text is then used for calculations in your browser. The public analysis API continues to use the whole source. Choosing a scope in the web preview does not change that API behavior.</>,
      }}/>
      <section>
        <p className="section-number">WORK WITH THE RESULTS</p>
        <h2>Search, sort, and export the vocabulary</h2>
        <p>Find a term with search, then sort the table by word, count, percentage, or frequency per 1,000. The screen shows up to 500 matching rows. A CSV or JSON export contains every row the calculation returned, including rows hidden by your search. The browser returns no more than 5,000 vocabulary rows; if there are more, a notice tells you the result is partial.</p>
        <p>Pasting text keeps the analysis in your browser. For a URL, the server fetches the page without retaining its content. Review the extracted text before the browser calculates the result. Read that preview carefully. Main-content extraction can miss material or pick up text that does not belong.</p>
        <p>The table gives you word frequencies. It cannot score readability, check facts, or predict whether a page will rank. When a word dominates the supplied text, go back to the passages where it appears. Repetition that helps the reader can stay.</p>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEPS</p>
        <h2>Count phrases or compare two versions</h2>
        <p>Individual words are the unit of this table. For exact phrases, use keyword density. To check what changed from an original to a revision, use the comparison tool. You can also get a broader view of the vocabulary in the Bag of Words analyzer.</p>
        <div><Link href="/how-to-calculate-word-frequency">Read the frequency guide <span>→</span></Link><Link href="/tools/keyword-density-checker">Check keyword density <span>→</span></Link><Link href="/tools/text-analysis-comparison">Compare two texts <span>→</span></Link><Link href="/tools/bag-of-words-analyzer">Open the Bag of Words analyzer <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
