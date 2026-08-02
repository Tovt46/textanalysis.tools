import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/cosine-similarity-for-text";
const title="Cosine Similarity for Text: Formula & Example";
const description="Learn how cosine similarity compares text vectors, how Bag of Words and TF-IDF weights change the score, and how to interpret contributions and limitations.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org","@type":"TechArticle",
  headline:"Cosine Similarity for Text: Formula, Example, and Interpretation",
  description,inLanguage:"en",datePublished:"2026-07-26",dateModified:"2026-07-26",
  mainEntityOfPage:`${SITE_URL}${path}`,publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
  about:["cosine similarity","document similarity","Bag of Words","TF-IDF"],
};

export default function CosineSimilarityForTextPage(){
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="guide" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Cosine similarity for text</span></nav>
        <p className="eyebrow">DOCUMENT SIMILARITY · EXPLAINABLE VECTORS</p>
        <h1>Cosine Similarity for Text</h1>
        <p className="article-deck">Cosine similarity compares the direction of two numeric vectors rather than their raw size. For text, those vectors can contain word frequencies or TF-IDF weights. The score is easy to calculate, but its meaning depends completely on how the vectors were built.</p>
        <p className="article-meta">Published July 26, 2026 · Includes BoW and TF-IDF interpretation</p>
        <div className="article-actions"><Link className="primary-article-cta" href="/tools/text-similarity-calculator">Compare two texts</Link><a href="#example">See the worked example ↓</a></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page">
          <b>On this page</b>
          <a href="#definition">What cosine similarity measures</a>
          <a href="#formula">Formula and vector parts</a>
          <a href="#example">Worked text example</a>
          <a href="#bow-vs-tfidf">BoW versus TF-IDF</a>
          <a href="#contributions">Term contributions</a>
          <a href="#interpretation">How to read the score</a>
          <a href="#limitations">Limits</a>
        </aside>
        <div className="article-body">
          <section id="definition">
            <p className="section-number">01</p>
            <h2>What Does Cosine Similarity Measure?</h2>
            <p>Cosine similarity measures the angle between two vectors. When the vectors point in the same direction, the score is 1. When they have no shared positive dimensions, the score is 0. Text-frequency vectors are non-negative, so the calculator reports values in the 0–1 range.</p>
            <p>Vector direction matters more than magnitude. A short document and a much longer document can receive a strong score when their terms occur in similar proportions. That makes cosine similarity more suitable than a raw dot product when document lengths differ.</p>
            <div className="article-callout"><b>Plain-language interpretation</b><p>The score measures weighted vocabulary overlap after both documents have been converted into the same feature space.</p></div>
          </section>
          <section id="formula">
            <p className="section-number">02</p>
            <h2>The Cosine Similarity Formula</h2>
            <p>Let vectors <strong>A</strong> and <strong>B</strong> contain weights for the same ordered vocabulary. Their dot product is divided by the product of their Euclidean norms:</p>
            <code className="vector-code">cosine(A, B) = (A · B) / (||A|| × ||B||)</code>
            <p>The dot product adds the products of corresponding term weights. Each norm is the square root of the sum of squared weights:</p>
            <code className="vector-code">A · B = Σ(Aᵢ × Bᵢ)    ||A|| = √Σ(Aᵢ²)</code>
            <p>If either vector has zero length, the calculator returns 0 because there is no usable direction to compare. This can happen when an input contains no analyzable tokens after cleanup and stop-word filtering.</p>
          </section>
          <section id="example">
            <p className="section-number">03</p>
            <h2>A Worked Cosine Similarity Example</h2>
            <p>Suppose the shared vocabulary is <strong>[cat, dog, sleeps]</strong>. After counting terms, two documents become:</p>
            <div className="example-docs"><p><b>Document A</b>“cat cat sleeps” → [2, 0, 1]</p><p><b>Document B</b>“cat dog sleeps” → [1, 1, 1]</p></div>
            <p>The dot product is <strong>2×1 + 0×1 + 1×1 = 3</strong>. The vector norms are <strong>√5</strong> and <strong>√3</strong>. Therefore:</p>
            <code className="vector-code">cosine = 3 / (√5 × √3) ≈ 0.775</code>
            <p>The documents overlap on “cat” and “sleeps,” but B also contains “dog” and distributes its weight differently. The result is substantial surface overlap without identical vectors.</p>
          </section>
          <section id="bow-vs-tfidf">
            <p className="section-number">04</p>
            <h2>Bag of Words and TF-IDF Can Produce Different Scores</h2>
            <p>In <strong>Bag of Words mode</strong>, the calculator uses normalized term frequencies. Every retained term contributes according to its share of the document. Common vocabulary can therefore dominate the overlap.</p>
            <p>In <strong>TF-IDF mode</strong>, the same terms are reweighted using their document frequency across the pair. A term appearing in both documents receives the minimum IDF weight, while a term unique to one side receives more weight in that document. This often reduces the relative influence of shared generic words and changes both vector norms.</p>
            <div className="comparison-grid">
              <div className="comparison-head"><span>Mode</span><b>Weight</b><b>Best question</b></div>
              <div><span>Bag of Words</span><p>Normalized frequency</p><p>How similar are the visible vocabularies?</p></div>
              <div><span>TF-IDF</span><p>Normalized frequency × smoothed IDF</p><p>How similar are they after rarity-aware weighting?</p></div>
            </div>
            <p>Read the <Link href="/tf-idf-formula">TF-IDF formula guide</Link> for the exact smoothing rule used by the calculator.</p>
          </section>
          <section id="contributions">
            <p className="section-number">05</p>
            <h2>Term Contributions Explain Where the Score Comes From</h2>
            <p>A scalar score hides which dimensions created the overlap. The calculator therefore returns the product <strong>Aᵢ × Bᵢ</strong> for every shared term. Terms with the largest products contribute most to the dot product.</p>
            <p>Contribution rows are useful for QA. They can reveal that a strong score is driven by boilerplate, navigation labels, repeated product names, or genuinely central vocabulary. A high score backed by irrelevant template terms should not be interpreted the same way as one backed by the subject matter you intended to compare.</p>
          </section>
          <section id="interpretation">
            <p className="section-number">06</p>
            <h2>How to Interpret a Cosine Similarity Score</h2>
            <p>Zero means there is no shared positive-weight vocabulary under the selected settings. One means the vectors have the same direction, which can happen even when one document repeats every term more times than the other. Values between zero and one describe a continuum of vector overlap.</p>
            <p>There is no universal threshold for “duplicate,” “related,” or “good.” A useful cutoff depends on document type, length, preprocessing, weighting mode, and the cost of false positives. Build thresholds from labeled examples in your own workflow rather than importing an arbitrary percentage.</p>
            <div className="article-callout subtle"><b>Comparison rule</b><p>Keep tokenization, language, stop words, and weighting mode fixed when comparing scores across document pairs.</p></div>
          </section>
          <section id="limitations">
            <p className="section-number">07</p>
            <h2>Cosine Similarity Is Not Semantic Equivalence</h2>
            <p>BoW and TF-IDF vectors discard word order and do not understand synonyms, negation, argument structure, or factual meaning. “The treatment is safe” and “the treatment is not safe” share most of their words. Two paraphrases can use different vocabulary and appear less similar than they are semantically.</p>
            <p>The score is not a plagiarism verdict, authorship detector, quality grade, or search-ranking predictor. Use it as an explainable lexical signal alongside contribution terms and human review.</p>
          </section>
          <section className="article-sources">
            <h2>Technical references</h2>
            <ul>
              <li><a href="https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html" rel="noreferrer">scikit-learn: cosine_similarity documentation</a></li>
              <li><a href="https://www.mathworks.com/help/textanalytics/ref/cosinesimilarity.html" rel="noreferrer">MathWorks Text Analytics: document cosine similarity</a></li>
            </ul>
          </section>
          <section className="article-final-cta">
            <p className="eyebrow">BOW OR TF-IDF · EXPLAINABLE RESULT</p>
            <h2>Compare two documents and inspect every contribution</h2>
            <p>Switch weighting modes, review the vector norms and shared terms, then export the returned contribution rows.</p>
            <Link href="/tools/text-similarity-calculator">Open the similarity calculator <span>→</span></Link>
          </section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
