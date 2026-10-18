import type { Metadata } from "next";
import Link from "next/link";
import TextComparisonTool from "../../../TextComparisonTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";
import { EditorialRevisionExample,WebpageExtractionExample } from "../../../EditorialWorkflowExamples";

const path="/tools/text-analysis-comparison";
const title="Free Text Comparison Tool for Word Frequency Changes";
const description="Compare two texts or webpages by word count, vocabulary, normalized word frequency, bigrams, and Zipf diagnostics. Search and export exact A/B differences.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:SITE_MANIFEST,
};

const schema=toolWebApplicationSchema({
  name:"Text Analysis Comparison",
  description,
  path,
  featureList:["Normalized word-frequency comparison","Bigram change comparison","Vocabulary and length metrics","Text and URL input","CSV and JSON export"],
});

export default function TextAnalysisComparisonPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <TextComparisonTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">COMPARE TWO TEXTS</p>
        <h2>Find words that gained or lost prominence in a revision</h2>
        <p>Which words did the revision add? Which did it drop or repeat more often? Put the original in A and the revision in B to check words and two-word sequences. The text comparison tool also reports word counts, vocabulary size, normalized frequency, and Zipf diagnostics, with searchable rows and CSV or JSON exports.</p>
        <p>Two public webpages work as inputs, as does a pasted draft paired with a live page. Before comparing URLs, read both previews. The passages you want to compare need to be present, and the extraction scope needs to match on both sides.</p>
      </section>
      <section>
        <p className="section-number">NORMALIZED COMPARISON</p>
        <h2>Why raw word counts and percentage-point changes can disagree</h2>
        <p>A longer draft can mention a word more often without giving it more prominence. Look at the two measures in the table: the change in count, and the change in the term&apos;s share of the analyzed words. A positive share change means it occupies more of B; a negative change means it occupies less.</p>
        <div className="formula-grid"><div><span>Term share</span><code>term count ÷ analyzed words</code></div><div><span>Share change</span><code>(share in B − share in A) × 100 pp</code></div></div>
        <p>Take “draft”: 5 mentions in 100 analyzed words in A, then 8 in 200 in B. That is three more mentions. Its share, though, has fallen from 5% to 4%, a change of −1 percentage point. Keeping both figures in the table lets you distinguish extra mentions from greater prominence.</p>
        <p>A bigram share uses the available two-word positions as its denominator, which is one fewer than the analyzed word count. The denominator differs for <Link href="/tools/keyword-density-checker">keyword density</Link>, where exact phrase counts are divided by total words.</p>
      </section>
      <EditorialRevisionExample/>
      <section>
        <p className="section-number">MATCH THE SETTINGS</p>
        <h2>Keep language and stop-word settings consistent</h2>
        <p>If both versions use the same language, select it yourself in the settings. Automatic detection works on each source separately. It can assign different languages to the two inputs, particularly with short passages or mixed-language text; a warning in the result points this out.</p>
        <p>The default count leaves out stop words before counting either words or bigrams. Removing them changes the analyzed total; it can also join two words into a bigram when a stop word originally sat between them. Enable <strong>Keep stop words</strong> to compare consecutive phrases in the full token sequence. Punctuation does not mark a phrase boundary here. Check the source context before deciding that a bigram represents a repeated expression.</p>
        <p>Case makes no difference to matching, but the written form does. “Edit,” “edits,” and “editing” count as separate words, and synonyms stay separate too. After filtering, each input must still contain at least three analyzed tokens.</p>
      </section>
      <section>
        <p className="section-number">REVISION WORKFLOW</p>
        <h2>Read the largest changes, then inspect the passages</h2>
        <p>The largest changes in normalized frequency appear first. To check a term you expected the edit to keep, search for it and select the row to read its occurrences in A and B. The bigrams view does the same for two-word sequences. A missing phrase calls for a look at the passages it came from: the absence alone does not establish that an explanation or attribution was lost.</p>
        <p>Pasted text and reviewed URL text are compared in your browser. URL input is fetched through the server without retaining the page content. The public comparison API uses its existing whole-source behavior; it does not inherit the extraction selection from this web interface.</p>
        <h3>What the exports include</h3>
        <p>The screen displays up to 500 matching rows. A CSV export contains the returned rows from whichever view you selected, words or bigrams. JSON includes both returned comparison tables along with the summary metrics. Searching the table does not narrow either export. Each table returns at most 1,000 rows; a visible notice tells you when the result is partial.</p>
      </section>
      <WebpageExtractionExample/>
      <section>
        <p className="section-number">LIMITATIONS</p>
        <h2>Does this comparison check similarity or plagiarism?</h2>
        <p>This comparison measures changes in surface vocabulary. There is no check against a database of published work, and the result cannot establish plagiarism or tell you whether two sentences have the same meaning. For a cosine score based on shared vocabulary, use the <Link href="/tools/text-similarity-calculator">text similarity calculator</Link> and read its limitations before interpreting the score.</p>
        <p>The vocabulary may stay the same while a claim changes. Conversely, an important term may appear more often because the revision adds a useful example. Frequency changes and Zipf diagnostics cannot choose a winning version or predict which will rank higher. Judging the revision still means reading it for intent, readability, factual accuracy, and support from its sources.</p>
      </section>
      <section className="tool-next-links"><p className="section-number">RELATED WORKFLOWS</p><h2>Inspect one text or automate the comparison</h2><p>Follow the guide to work through normalized A/B changes. If you have one source to inspect, open the word frequency table. To run comparisons from a script, use the comparison API contract.</p><div><Link href="/compare-texts-by-word-frequency">Read the comparison guide <span>→</span></Link><Link href="/tools/word-frequency-counter">Word Frequency Counter <span>→</span></Link><Link href="/api-docs#compare">Comparison API <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
