import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/tf-idf-formula";
const title="TF-IDF Formula: Calculation, Example & Limits";
const description="Learn how TF-IDF combines normalized term frequency with smoothed inverse document frequency. Follow a worked corpus example and understand settings, uses, and limitations.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org",
  "@type":"TechArticle",
  headline:"TF-IDF Formula: How Term Frequency and Inverse Document Frequency Work",
  description,
  inLanguage:"en",
  datePublished:"2026-07-26",
  dateModified:"2026-07-26",
  mainEntityOfPage:`${SITE_URL}${path}`,
  publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
  about:["TF-IDF","term frequency","inverse document frequency","text analysis"],
};

export default function TfIdfFormulaPage(){
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="guide" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>TF-IDF formula</span></nav>
        <p className="eyebrow">NLP FUNDAMENTALS · WORKED EXAMPLE</p>
        <h1>TF-IDF Formula: How the Weight Is Calculated</h1>
        <p className="article-deck">TF-IDF gives a term more weight when it is frequent inside one document but less common across the corpus. The useful part is not the acronym: it is knowing which term-frequency definition, inverse-document-frequency formula, and preprocessing rules produced the number.</p>
        <p className="article-meta">Published July 26, 2026 · Method documented against the live calculator</p>
        <div className="article-actions"><Link className="primary-article-cta" href="/tools/tf-idf-calculator">Calculate TF-IDF for 2–10 documents</Link><a href="#worked-example">Follow the worked example ↓</a></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page">
          <b>On this page</b>
          <a href="#definition">What TF-IDF measures</a>
          <a href="#formula">The exact formula</a>
          <a href="#worked-example">Worked three-document example</a>
          <a href="#corpus">Why the corpus changes the score</a>
          <a href="#preprocessing">Preprocessing choices</a>
          <a href="#uses">When TF-IDF is useful</a>
          <a href="#limitations">Limits and interpretation</a>
        </aside>
        <div className="article-body">
          <section id="definition">
            <p className="section-number">01</p>
            <h2>What Does TF-IDF Measure?</h2>
            <p><strong>Term frequency–inverse document frequency</strong> is a weighting method for document-term matrices. It starts with a term&apos;s relative frequency inside a document, then increases or reduces that value according to how many documents in the corpus contain the term.</p>
            <p>A raw word count cannot distinguish a term that appears everywhere from one that helps identify a particular document. TF-IDF adds that corpus-level context. A term found in every document keeps the minimum inverse-document weight in this implementation. A term found in only one document receives a higher weight.</p>
            <div className="article-callout"><b>Short definition</b><p>TF measures local importance inside one document. IDF measures corpus-wide rarity. TF-IDF multiplies the two.</p></div>
          </section>
          <section id="formula">
            <p className="section-number">02</p>
            <h2>The Exact TF-IDF Formula Used by the Calculator</h2>
            <p>The calculator uses normalized term frequency. For term <strong>t</strong> in document <strong>d</strong>, divide its count by the number of analyzed tokens in that document:</p>
            <code className="vector-code">TF(t, d) = count(t in d) / analyzed tokens in d</code>
            <p>Inverse document frequency uses natural logarithm and add-one smoothing. Let <strong>N</strong> be the number of documents and <strong>df(t)</strong> the number of documents containing the term:</p>
            <code className="vector-code">IDF(t) = ln((N + 1) / (df(t) + 1)) + 1</code>
            <p>The final weight is the product:</p>
            <code className="vector-code">TF-IDF(t, d) = TF(t, d) × IDF(t)</code>
            <p>Add-one smoothing keeps the calculation defined and gives a term present in every document an IDF of exactly 1. Other libraries can use raw counts, logarithmic TF, a different logarithm base, or vector normalization. Those results can all be valid, but they should not be compared as though they came from one formula.</p>
          </section>
          <section id="worked-example">
            <p className="section-number">03</p>
            <h2>A Worked TF-IDF Example with Three Documents</h2>
            <p>Consider this small corpus after tokenization:</p>
            <div className="example-docs"><p><b>Document A</b>apple apple banana</p><p><b>Document B</b>banana carrot</p><p><b>Document C</b>banana carrot carrot</p></div>
            <p>The corpus contains three documents. “apple” appears in one document, “carrot” in two, and “banana” in all three. Their smoothed inverse-document weights are:</p>
            <div className="vector-table">
              <div className="vector-row vector-head"><span>Term</span><span>df</span><span>N</span><span>IDF</span><span>TF in A</span><span>TF-IDF in A</span></div>
              <div className="vector-row"><b>apple</b><span>1</span><span>3</span><span>1.693</span><span>0.667</span><span>1.129</span></div>
              <div className="vector-row"><b>banana</b><span>3</span><span>3</span><span>1.000</span><span>0.333</span><span>0.333</span></div>
              <div className="vector-row"><b>carrot</b><span>2</span><span>3</span><span>1.288</span><span>0</span><span>0</span></div>
            </div>
            <p>“Apple” receives the strongest weight in Document A because it combines high within-document frequency with low document frequency. “Banana” occurs in every document, so corpus rarity does not increase its weight. “Carrot” has a positive IDF, but its weight in A is zero because it does not occur there.</p>
          </section>
          <section id="corpus">
            <p className="section-number">04</p>
            <h2>Why the Corpus Changes Every IDF Score</h2>
            <p>IDF is not an intrinsic property of a word. It belongs to a word <em>inside a particular corpus</em>. If you add ten documents containing “apple,” its document frequency rises and its IDF falls. If you compare only two drafts about the same subject, many topical words may appear in both and receive the minimum weight.</p>
            <p>This makes corpus design part of the analysis. A two-document comparison answers “what distinguishes these two inputs?” A ten-document corpus can answer “what distinguishes each document within this selected set?” Neither result automatically represents rarity across the web, a language, or an industry.</p>
            <div className="article-callout subtle"><b>Reproducibility rule</b><p>Keep the corpus and preprocessing configuration fixed when comparing TF-IDF results over time. Changing either one changes the weighting model.</p></div>
          </section>
          <section id="preprocessing">
            <p className="section-number">05</p>
            <h2>Tokenization and Stop Words Change the Matrix</h2>
            <p>Before TF-IDF can be calculated, every document is converted into a Bag of Words vector. The calculator lowercases text, removes markup and punctuation, excludes numeric-only tokens, and applies the same language and stop-word configuration to every source.</p>
            <div className="feature-list">
              <div><h3>Language</h3><p>Language selection controls which default stop-word list is applied. It does not translate or semantically interpret the text.</p></div>
              <div><h3>Stop words</h3><p>Removing common function words changes token counts, document frequency, and every normalized TF value.</p></div>
              <div><h3>Document length</h3><p>Normalized TF reduces the direct advantage of longer documents, but genre and structure can still affect the vocabulary.</p></div>
              <div><h3>Top-term limit</h3><p>The limit controls displayed and exported rows. IDF is still calculated from the complete analyzed vocabulary.</p></div>
            </div>
          </section>
          <section id="uses">
            <p className="section-number">06</p>
            <h2>When TF-IDF Is Useful</h2>
            <p>TF-IDF is useful when transparent lexical features matter: document classification, clustering baselines, search indexing experiments, corpus exploration, revision analysis, and pre-filtering before manual review. It also supplies weighted vectors for <Link href="/cosine-similarity-for-text">cosine similarity</Link>.</p>
            <p>The method is especially helpful when raw frequency is dominated by terms that appear throughout the corpus. Because every value can be traced to a count, a document frequency, and a formula, it is easier to audit than an opaque similarity score.</p>
          </section>
          <section id="limitations">
            <p className="section-number">07</p>
            <h2>What TF-IDF Cannot Tell You</h2>
            <p>TF-IDF does not understand synonyms, word order, negation, factual accuracy, or intent. Two documents can discuss the same idea with different vocabulary and receive weak overlap. Two documents can repeat the same terms while making opposite claims and receive strong overlap.</p>
            <p>It is also not an SEO score. A high weight means that a term is concentrated in a document relative to the selected corpus. It does not mean the term should be added more often or that the document will rank.</p>
            <div className="article-callout"><b>Interpret the components</b><p>Inspect TF, document frequency, IDF, and the final weight together. A single TF-IDF number without its corpus and preprocessing rules is incomplete.</p></div>
          </section>
          <section className="article-sources">
            <h2>Technical references</h2>
            <ul>
              <li><a href="https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html" rel="noreferrer">scikit-learn: TfidfVectorizer documentation</a></li>
              <li><a href="https://nlp.stanford.edu/IR-book/html/htmledition/inverse-document-frequency-1.html" rel="noreferrer">Stanford Introduction to Information Retrieval: inverse document frequency</a></li>
            </ul>
          </section>
          <section className="article-final-cta">
            <p className="eyebrow">FREE · 2–10 DOCUMENTS</p>
            <h2>Inspect the full calculation on your own corpus</h2>
            <p>Add pasted text or public URLs, keep one preprocessing configuration, and export every document vector with the global IDF table.</p>
            <Link href="/tools/tf-idf-calculator">Open the TF-IDF calculator <span>→</span></Link>
          </section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
