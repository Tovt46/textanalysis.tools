import type { Metadata } from "next";
import Link from "next/link";
import BowApp from "../../../BowApp";
import { bowMetadata,toolWebApplicationSchema } from "../../../seo-metadata";

export const metadata:Metadata=bowMetadata("en");

const schema=toolWebApplicationSchema({
  name:"Bag of Words Analyzer",
  description:"Analyze word and bigram frequency, tracked phrases, and Zipf distribution, then compare two text results.",
  path:"/tools/bag-of-words-analyzer",
  featureList:["Word and bigram frequency","Tracked phrase coverage","Zipf distribution diagnostics","Side-by-side text comparison","CSV export"],
});

export default function EnglishBowAnalyzerPage(){
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <BowApp uiLang="en">
      <article className="tool-explainer">
        <section>
          <p className="section-number">READ THE RESULTS</p>
          <h2>What the Bag of Words analyzer shows</h2>
          <p>Paste a draft to see which words dominate it and check specific phrases. Save the result as A, run a revision as B, and compare their vocabulary. Alongside word and bigram counts, you get a fitted Zipf frequency curve.</p>
          <p>A Bag of Words model represents a document through its vocabulary and counts. The word table loses sentence order, so two passages can use the same words while making different claims. Read the source before treating a repeated term as a problem.</p>
        </section>
        <section>
          <p className="section-number">TRY A SMALL EXAMPLE</p>
          <h2>See how stop words change the count</h2>
          <p>Paste <strong>Text and data text data</strong>, select English, and leave <strong>Keep stop words</strong> off. The default list removes “and,” leaving four words. “Text” and “data” each occur twice, so each accounts for 50% of the analyzed words.</p>
          <code className="vector-code">[text, data, text, data]</code>
          <p>The bigrams here come from the filtered tokens. “Text data” appears twice among three two-word windows, a share of 66.67%. One pair came from “text and data,” with “and” removed. Enable <strong>Keep stop words</strong> to retain the original sequence. The <Link href="/tools/ngram-analyzer">N-gram Analyzer</Link> also preserves original word adjacency, even when you filter stop-word rows from its display.</p>
          <p>Now add <strong>text and data</strong> as a tracked phrase. It has one exact occurrence in the original five-word input, or 20% and 200 occurrences per 1,000 words. Unlike the filtered word table, tracked phrases use the tokens before stop-word removal for both the count and denominator.</p>
        </section>
        <section>
          <p className="section-number">ZIPF DISTRIBUTION</p>
          <h2>Use the fitted curve to investigate repetition</h2>
          <p>Words are ranked by frequency, and the chart fits a curve to this document&apos;s vocabulary. Each observed count is compared with the fitted count at that rank. At sensitivity ×2, a word is marked above the model when it occurs more than twice as often as the curve predicts.</p>
          <p>Read the passages containing a flagged word. A product name, a technical term, or a repeated navigation label can all stand above the curve for different reasons. When the model expects fewer than one occurrence, the row goes into the sparse tail: there is too little evidence for that comparison.</p>
          <p>The exponent describes the fitted distribution. Getting close to 1 does not certify natural writing or search quality, and short texts can produce unstable patterns. Changing the detailed-table setting shows 5–100 terms without changing the curve fit or zone totals, which use the full analyzed vocabulary.</p>
        </section>
        <section>
          <p className="section-number">COMPARE A AND B</p>
          <h2>Check a revision with the same settings</h2>
          <p>Analyze the original, choose <strong>Save as result A</strong>, then replace it with the revision and analyze again. A stays in this browser, along with its locked language, stop words, tracked phrases, and other settings. B uses those same rules. To change them, remove A first.</p>
          <p>Start with the changes in percentages or occurrences per 1,000 words when A and B differ in length. A raw count can rise while its share falls. Check a changed phrase in the source and decide whether the revision still says what you intended.</p>
          <p>Pasted text is calculated in your browser. URL mode sends the public URL to the server for fetching and analysis without retaining the submitted content. A fetched page can include menus and footer text; paste the article body when you need a comparison limited to that material.</p>
        </section>
        <section className="tool-next-links">
          <p className="section-number">CHOOSE YOUR NEXT CHECK</p>
          <h2>Take the measurement that fits your question</h2>
          <p>You can keep checking frequency patterns and Zipf diagnostics here, with A saved for comparison. To export a term vector, open the generator. The comparison tool shows vocabulary changes with source context; the model guide explains the method behind the counts.</p>
          <div><Link href="/tools/bag-of-words-generator">Bag of Words Generator <span>→</span></Link><Link href="/tools/text-analysis-comparison">Compare word frequency <span>→</span></Link><Link href="/bag-of-words-model">Read the Bag of Words guide <span>→</span></Link></div>
        </section>
      </article>
    </BowApp>
  </>;
}
