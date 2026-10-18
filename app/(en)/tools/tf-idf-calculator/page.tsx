import type { Metadata } from "next";
import Link from "next/link";
import TfIdfCalculatorTool from "../../../TfIdfCalculatorTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";

const path="/tools/tf-idf-calculator";
const title="Free TF-IDF Calculator for Text & URLs";
const description="Compare 2–10 documents with inverse-document-frequency weighting. TF-IDF reduces corpus-wide terms and highlights terms that better distinguish each document.";

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
  name:"TF-IDF Calculator",
  description,
  path,
  featureList:["TF-IDF across 2 to 10 documents","Smoothed inverse document frequency","Per-document weighted term tables","Text and URL input","CSV and JSON export"],
});

export default function TfIdfCalculatorPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <TfIdfCalculatorTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">HOW TF-IDF WORKS</p>
        <h2>Calculate TF-IDF for a corpus of 2–10 documents</h2>
        <p>Add the texts you want to compare, or enter their public webpage URLs. Each document has a table with its raw count, term frequency (TF), document frequency, inverse document frequency (IDF), and final TF-IDF weight. The terms that stand out may differ between documents; change tabs to see which score highest in each.</p>
        <p>TF divides a term’s count by the analyzed word count of its document. For document frequency, what matters is how many documents contain that term, rather than how many times they use it. The calculator multiplies TF by IDF, using the natural logarithm in the smoothed IDF formula below.</p>
        <div className="formula-grid"><div><span>TF</span><code>term frequency ÷ analyzed words</code></div><div><span>IDF</span><code>log((N + 1) ÷ (df + 1)) + 1</code></div></div>
      </section>
      <section>
        <p className="section-number">WORKED EXAMPLE</p>
        <h2>Why a common word can still rank first</h2>
        <p>For this example, choose English and enter three documents: A is “coffee coffee tea”, B is “coffee milk”, and C is “coffee water”. The default stop-word list leaves all these words in place. Coffee is in every document and has IDF 1. Tea is found only in A, with IDF approximately 1.693.</p>
        <p>Document A gives coffee TF 2/3 and TF-IDF about 0.667; tea has TF 1/3 and TF-IDF about 0.564. Coffee comes out ahead despite tea’s larger rarity multiplier, because coffee occurs twice. A term does not disappear just because every document contains it: this smoothed formula leaves it with an IDF weight of 1.</p>
      </section>
      <section>
        <p className="section-number">CORPUS SETUP</p>
        <h2>Choose documents that make the comparison useful</h2>
        <p>IDF is relative to the documents you add here. There is no web-wide reference collection, and changing the sources changes their weights. For editorial comparisons, use pages with a similar purpose and select comparable passages. Put a short product description beside an entire site’s navigation, and the scores become harder to interpret.</p>
        <div className="feature-list">
          <div><h3>Shared preprocessing</h3><p>Choose the language and stop-word options for your run. The calculator lowercases words, excludes standalone numbers, and removes stop words by default. Keeping or editing the stop words affects the vocabulary as well as the TF denominator for each document. Different word forms stay as they are; there is no stemming.</p></div>
          <div><h3>Top terms</h3><p>Choose 1–100 to set how many rows each document returns, starting with the highest TF-IDF weights. By this point, IDF has already been calculated across the corpus. A lower limit gives you shorter returned vectors; it does not recalculate IDF using only the terms left in those vectors.</p></div>
          <div><h3>Global IDF table</h3><p>If a result surprises you, check its document frequency. A term has high IDF when it occurs in fewer of the sources you supplied. A high IDF does not establish expertise, accuracy, search demand, or how many times the term ought to appear.</p></div>
          <div><h3>Input privacy</h3><p>With pasted text alone, the calculation runs in your browser. Add even one URL and the corpus request goes to the server for analysis, along with any pasted documents included in that run.</p></div>
        </div>
      </section>
      <section>
        <p className="section-number">READ AND EXPORT</p>
        <h2>Keep the corpus alongside its scores</h2>
        <p>CSV gives you the returned rows for the active document, with your text filter applied. JSON contains the returned document vectors and the shared result metadata. The selected top-term limit applies to both exports. Before treating the global IDF table as complete, check for partial-result notices.</p>
        <p>A term’s score belongs to the corpus and preprocessing that produced it. For unweighted counts from a single document, use the <Link href="/tools/bag-of-words-generator">Bag of Words Generator</Link>; the <Link href="/tf-idf-formula">TF-IDF formula guide</Link> explains the calculation in more detail. Matching a competitor’s scores alone does not establish content quality or predict search rankings.</p>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEP</p>
        <h2>From weighted features to direct similarity</h2>
        <p>For a pair of documents, the similarity calculator returns a single overlap score. Try the same two sources there to inspect their cosine score and see which terms contribute to it.</p>
        <div><Link href="/tf-idf-formula">Read the TF-IDF formula guide <span>→</span></Link><Link href="/tools/text-similarity-calculator">Text Similarity Calculator <span>→</span></Link><Link href="/api-docs#weighted">TF-IDF API <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
