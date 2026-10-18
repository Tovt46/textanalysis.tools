import type { Metadata } from "next";
import Link from "next/link";
import TextSimilarityCalculatorTool from "../../../TextSimilarityCalculatorTool";
import { SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";
import { languageAlternates,languagePaths } from "../../../localization";

const path="/tools/text-similarity-calculator";
const title="Free Text Similarity Calculator for Text & URLs";
const description="Measure similarity between two text inputs with cosine overlap on Bag of Words or TF-IDF vectors. See exact contribution terms, cosine score, and exportable results.";

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
  name:"Text Similarity Calculator",
  description,
  path,
  featureList:["Cosine similarity from 0 to 1","Bag of Words and TF-IDF modes","Per-term contribution table","Text and URL input","JSON export"],
});

export default function TextSimilarityCalculatorPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths(path)}/>
    <TextSimilarityCalculatorTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">MEASUREMENT MODEL</p>
        <h2>Compare two texts with cosine similarity</h2>
        <p>Enter two passages as pasted text or public webpage URLs to get a cosine similarity score from 0 to 1. A table shows the shared words behind the score. Each source becomes a term vector: Bag of Words uses frequency as the weight, while TF-IDF also accounts for words that occur in only one source.</p>
        <p>Cosine measures how closely the vectors point in the same direction. At 1, their nonzero term weights are proportional; at 0, none of the analyzed terms overlap. An input with no words left after filtering also produces 0. Check both word counts before deciding what that result means.</p>
        <div className="formula-grid"><div><span>Cosine similarity</span><code>sum(a×b) ÷ (||a|| × ||b||)</code></div><div><span>Term contribution</span><code>a<sub>i</sub> × b<sub>i</sub></code></div></div>
      </section>
      <section>
        <p className="section-number">WORKED EXAMPLE</p>
        <h2>Compare the same pair in both modes</h2>
        <p>Choose English, then enter “coffee coffee tea” for text A and “coffee milk” for text B. With the default stop-word list, Bag of Words gives a cosine score of approximately 0.6325. Only coffee is shared. Its frequency in A is 2/3 and in B is 1/2, giving a dot-product contribution of 1/3.</p>
        <p>Compare that pair again in TF-IDF mode and the score falls to approximately 0.4743. Coffee has IDF 1 because both sources contain it. Tea and milk each belong to just one source, so their IDF is about 1.405. Those two terms lengthen the vectors without adding to the shared dot product, which lowers the cosine score.</p>
      </section>
      <section>
        <p className="section-number">SETTINGS AND RESULTS</p>
        <h2>Read the words behind the score</h2>
        <div className="feature-list">
          <div><h3>Bag of Words or TF-IDF</h3><p>Bag of Words assigns weights from relative term frequencies. Switch to TF-IDF and the pair itself supplies the entire corpus for smoothed IDF; there is no outside document collection. A word’s rarity is relative to these two sources. To inspect weights across a larger set of sources, use the <Link href="/tools/tf-idf-calculator">TF-IDF Calculator</Link>.</p></div>
          <div><h3>Language and stop words</h3><p>Keep the language and stop-word settings the same for both inputs. By default, common function words are removed. Leave them in and shared grammar may increase the overlap. The tool normalizes capitalization, but it keeps different word forms and synonyms as separate terms.</p></div>
          <div><h3>Contribution terms</h3><p>Each contribution is the term’s weight in A multiplied by its weight in B, before cosine normalization. A large value identifies a strong source of overlap, not a percentage of the final score. You can shorten the contribution table with the top-term setting; cosine will still use the full analyzed vocabulary.</p></div>
          <div><h3>Input and export</h3><p>When you paste both texts, analysis runs in your browser. Using a URL for either input sends both selected sources to the server for analysis. CSV gives you the returned contribution rows that match your filter. JSON contains the score together with the returned result data.</p></div>
        </div>
      </section>
      <section>
        <p className="section-number">INTERPRETATION</p>
        <h2>A word-overlap score needs context</h2>
        <p>No single score is right for every pair of texts. A rewrite may retain most of a draft’s vocabulary and change its claims, while two passages about the same topic may use different words and score low. Word order is discarded, so rearranging the same words can give a score of 1 even if their meaning changes.</p>
        <p>The score can help you find repeated wording or check how a rewrite changed the vocabulary. Judging plagiarism, factual agreement, or semantic equivalence still requires reading both passages. For phrase overlap and shifts in word frequency, open <Link href="/tools/text-analysis-comparison">Text Analysis Comparison</Link>. The math is explained in the <Link href="/cosine-similarity-for-text">cosine similarity guide</Link>.</p>
      </section>
      <section className="tool-next-links">
        <p className="section-number">WHEN TO USE</p>
        <h2>Review a revision or investigate a possible duplicate</h2>
        <p>Choose equivalent passages and keep the settings consistent, then check the contribution terms and read both texts. A high score gives you a reason to review a possible duplicate. The score alone cannot settle that review.</p>
        <div><Link href="/cosine-similarity-for-text">Read the cosine similarity guide <span>→</span></Link><Link href="/tools/text-analysis-comparison">Text Analysis Comparison <span>→</span></Link><Link href="/api-docs#weighted">Similarity API <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
