import type { Metadata } from "next";
import Link from "next/link";
import BagOfWordsGeneratorTool from "../../../BagOfWordsGeneratorTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";

const path="/tools/bag-of-words-generator";
const title="Free Bag of Words Generator for Text & URLs";
const description="Build a bounded term vector from text or a public webpage with token counts, frequencies, and frequency rates. Export the returned table for downstream analysis.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title,
  description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},
  icons:SITE_ICONS,
  manifest:SITE_MANIFEST,
};

const schema=toolWebApplicationSchema({
  name:"Bag of Words Generator",
  description,
  path,
  featureList:["Bounded term-vector rows","Raw counts and normalized frequencies","Editable stop words","Text and URL input","CSV and JSON export"],
});

export default function BagOfWordsGeneratorPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <BagOfWordsGeneratorTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">WHAT YOU GET</p>
        <h2>Generate a bag of words with counts and normalized frequencies</h2>
        <p>Paste a draft or enter a public webpage URL to turn its words into a term vector. Each returned row contains one distinct term, its count, relative frequency, percentage, and occurrences per 1,000 analyzed words. Use the counts for a vocabulary inventory or the normalized values when comparing texts of different lengths.</p>
        <p>This is the export-focused generator. For frequency patterns, repeated phrases, and a Zipf chart, use the <Link href="/tools/bag-of-words-analyzer">Bag of Words Analyzer</Link>.</p>
        <div className="formula-grid"><div><span>Frequency</span><code>term count ÷ total analyzed words</code></div><div><span>Term percentage</span><code>(term count ÷ total words) × 100</code></div></div>
      </section>
      <section>
        <p className="section-number">TRY A SMALL EXAMPLE</p>
        <h2>What does a bag-of-words vector look like?</h2>
        <p>Enter “Coffee coffee tea milk.” and select English. With the default stop-word list, all four words remain. The result has three distinct terms. Coffee has a count of 2, frequency of 0.5, percentage of 50%, and 500 occurrences per 1,000 words. Milk and tea each have a count of 1 and frequency of 0.25.</p>
        <p>The vocabulary coverage card answers a different question. Three distinct terms divided by four analyzed words gives 75%. It describes how varied this sample is; it is not the percentage for coffee or a target keyword score.</p>
      </section>
      <section>
        <p className="section-number">INPUT AND SETTINGS</p>
        <h2>Choose which words belong in the vector</h2>
        <div className="feature-list">
          <div><h3>Text or public URL</h3><p>Pasted text is analyzed in your browser. URL mode sends the address to the server to fetch and clean the page. If you need just an article body, paste that passage so surrounding page text does not affect the counts.</p></div>
          <div><h3>Language and stop words</h3><p>Choose English, Ukrainian, Russian, or Spanish, or use detection. Common function words are removed by default. Keep them for a full vocabulary baseline, or edit the list to match your project. Removing words also changes the denominator used for frequency.</p></div>
          <div><h3>Token normalization</h3><p>Capitalization is folded to lowercase and punctuation separates words. Standalone numbers are excluded. The generator does not stem words, so “coffee” and “coffees” remain separate terms.</p></div>
          <div><h3>Repeatable runs</h3><p>Keep the source text, language, and stop-word list together with your export. Reusing those inputs and options gives the same counts; a public webpage can change between requests.</p></div>
        </div>
      </section>
      <section>
        <p className="section-number">EXPORT AND LIMITS</p>
        <h2>Check the returned rows before reusing the vector</h2>
        <p>CSV includes term counts and normalized values; JSON also carries the analysis metadata. The screen shows up to 500 matching rows, while a result can contain more rows for export. A partial-result notice means the returned vector itself is bounded. Its export does not restore omitted terms; use the <Link href="/api-docs#focused">API pagination fields</Link> if you need the remaining rows.</p>
        <p>A bag of words discards word order. “Tea with coffee” and “Coffee with tea” produce the same counts with the same settings. It also treats synonyms as different terms. Use the <Link href="/tools/ngram-analyzer">N-Gram Analyzer</Link> when the phrase matters, and read the <Link href="/bag-of-words-model">bag-of-words model guide</Link> for the representation’s limits.</p>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT TOOLS</p>
        <h2>Move from vectors to comparison and weighting</h2>
        <p>To compare documents, enter the original texts or URLs in the tools below. TF-IDF weights terms against a selected corpus; text similarity compares two term vectors and shows the words behind the score.</p>
        <div><Link href="/tools/tf-idf-calculator">TF-IDF Calculator <span>→</span></Link><Link href="/tools/text-similarity-calculator">Text Similarity Calculator <span>→</span></Link><Link href="/api-docs#focused">Focused API endpoints <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
