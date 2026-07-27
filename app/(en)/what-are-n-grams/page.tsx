import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/what-are-n-grams";
const title="What Are N-grams? Unigram, Bigram & Trigram Guide";
const description="Understand how n-grams turn consecutive tokens into phrase windows. See unigram, bigram, and trigram examples, formulas, filtering choices, uses, and limitations.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org","@type":"TechArticle",
  headline:"What Are N-grams? Unigrams, Bigrams, Trigrams, and Longer Sequences",
  description,inLanguage:"en",datePublished:"2026-07-26",dateModified:"2026-07-26",
  mainEntityOfPage:`${SITE_URL}${path}`,publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
  about:["n-grams","unigrams","bigrams","trigrams","tokenization"],
};

export default function WhatAreNgramsPage(){
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="guide" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>What are N-grams?</span></nav>
        <p className="eyebrow">TEXT FEATURES · PHRASE FREQUENCY</p>
        <h1>What Are N-grams?</h1>
        <p className="article-deck">An n-gram is a consecutive sequence of n tokens. Unigrams contain one token, bigrams contain two, and trigrams contain three. Counting these windows preserves a small amount of local word order without requiring a semantic language model.</p>
        <p className="article-meta">Published July 26, 2026 · Covers the calculator&apos;s 1–10-token method</p>
        <div className="article-actions"><Link className="primary-article-cta" href="/tools/ngram-analyzer">Analyze N-grams</Link><a href="#example">Open the phrase example ↓</a></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page">
          <b>On this page</b>
          <a href="#definition">N-gram definition</a>
          <a href="#sizes">Unigrams, bigrams, trigrams</a>
          <a href="#example">Worked example</a>
          <a href="#formula">Counts and denominators</a>
          <a href="#filtering">Stop words and filtering</a>
          <a href="#uses">Practical uses</a>
          <a href="#limitations">Limits</a>
        </aside>
        <div className="article-body">
          <section id="definition">
            <p className="section-number">01</p>
            <h2>An N-gram Is a Sliding Token Window</h2>
            <p>After text has been tokenized, an n-gram analyzer moves a window of length <strong>n</strong> across the tokens one position at a time. Every window becomes a phrase candidate. Identical sequences are grouped and counted.</p>
            <p>In a word-level analyzer, tokens are usually normalized words. Character n-grams are also common in machine learning, but they answer a different question. The Text Analysis Tools calculator uses word-level n-grams from one to ten tokens.</p>
            <div className="article-callout"><b>Definition</b><p>For tokens w₁, w₂, …, wₘ, each n-gram is a consecutive sequence (wᵢ, …, wᵢ₊ₙ₋₁).</p></div>
          </section>
          <section id="sizes">
            <p className="section-number">02</p>
            <h2>Unigrams, Bigrams, Trigrams, and Longer Sequences</h2>
            <div className="feature-list">
              <div><h3>Unigram · n=1</h3><p>Each individual word becomes a feature. This is equivalent to a basic word-frequency table.</p></div>
              <div><h3>Bigram · n=2</h3><p>Each adjacent word pair becomes a feature, preserving short expressions such as “text analysis.”</p></div>
              <div><h3>Trigram · n=3</h3><p>Three-word windows capture more specific fragments such as “free text analysis.”</p></div>
              <div><h3>Longer n-grams</h3><p>Four-to-ten-token windows can expose repeated clauses, templates, labels, and copied phrase fragments.</p></div>
            </div>
            <p>Larger n creates more specific features, but repetitions become rarer. The vocabulary can also grow quickly because a small change in one token creates a different sequence.</p>
          </section>
          <section id="example">
            <p className="section-number">03</p>
            <h2>A Worked Bigram Example</h2>
            <p>Take the six-token sentence:</p>
            <code className="vector-code">text analysis makes text analysis clear</code>
            <p>Its five overlapping bigram windows are:</p>
            <div className="vector-table">
              <div className="vector-row vector-head"><span>Position</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
              <div className="vector-row"><b>Bigram</b><span>text analysis</span><span>analysis makes</span><span>makes text</span><span>text analysis</span><span>analysis clear</span></div>
            </div>
            <p>“Text analysis” appears twice. Every other bigram appears once. Because there are five bigram windows, the phrase has a window percentage of <strong>2 ÷ 5 × 100 = 40%</strong> and a normalized rate of <strong>400 per 1,000 windows</strong>.</p>
          </section>
          <section id="formula">
            <p className="section-number">04</p>
            <h2>The Denominator Is the Number of Available Windows</h2>
            <p>For a document containing <strong>m</strong> tokens, the number of length-n windows is:</p>
            <code className="vector-code">window count = max(0, m − n + 1)</code>
            <p>Each row uses that window count as its denominator:</p>
            <code className="vector-code">percentage = phrase count / window count × 100</code>
            <code className="vector-code">per 1,000 = phrase count / window count × 1,000</code>
            <p>This differs from keyword-density calculations that divide phrase occurrences by the total word count. Both conventions can be useful, but the denominator must be stated before values are compared.</p>
          </section>
          <section id="filtering">
            <p className="section-number">05</p>
            <h2>Stop Words and Minimum Counts Change What You See</h2>
            <p>The analyzer builds n-gram windows from the original normalized token sequence. When default stop words are excluded, it hides a sequence only when every token in that sequence is a stop word. It does not remove words first and then join previously non-adjacent tokens. This preserves the phrase order that actually appeared in the source.</p>
            <p>A minimum-count filter can hide one-off sequences from the visible table. It does not alter the underlying token count or denominator. Exports contain the rows that match the selected filter and result limit.</p>
            <div className="article-callout subtle"><b>Keep settings aligned</b><p>Compare n-gram tables only when n, language, stop-word behavior, and input-cleanup rules are the same.</p></div>
          </section>
          <section id="uses">
            <p className="section-number">06</p>
            <h2>What N-gram Analysis Is Good For</h2>
            <div className="pros-cons">
              <div><span className="mini-label">Useful</span><h3>Pattern inspection</h3><ul><li>Finding repeated multi-word phrases</li><li>Auditing templates and boilerplate</li><li>Building features for classifiers</li><li>Comparing phrase usage between revisions</li><li>Detecting recurring labels or clauses</li></ul></div>
              <div><span className="mini-label">Needs context</span><h3>Interpretation</h3><ul><li>A repeated phrase is not automatically a problem</li><li>A rare phrase is not automatically important</li><li>Different tokenizers create different windows</li><li>Longer sequences need more source text</li><li>Counts do not establish meaning</li></ul></div>
            </div>
            <p>Use the <Link href="/compare-texts-by-word-frequency">comparison workflow</Link> when the main question is how phrases changed between two versions rather than which sequences dominate one document.</p>
          </section>
          <section id="limitations">
            <p className="section-number">07</p>
            <h2>N-grams Preserve Local Order, Not Meaning</h2>
            <p>An n-gram model knows that tokens appeared next to one another. It does not understand why they appeared, whether they are factual, or whether two different phrases express the same concept. Sparse longer sequences also make cross-document matching difficult.</p>
            <p>For transparent lexical diagnostics, that simplicity is an advantage. For semantic retrieval or paraphrase detection, use n-grams as one signal rather than the complete decision.</p>
          </section>
          <section className="article-sources">
            <h2>Technical references</h2>
            <ul>
              <li><a href="https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.CountVectorizer.html" rel="noreferrer">scikit-learn: CountVectorizer and ngram_range</a></li>
              <li><a href="https://www.nltk.org/api/nltk.util.html#nltk.util.ngrams" rel="noreferrer">NLTK: ngrams sequence utility</a></li>
            </ul>
          </section>
          <section className="article-final-cta">
            <p className="eyebrow">1–10 TOKENS · FULL EXPORT</p>
            <h2>Count phrase windows in text or a webpage</h2>
            <p>Choose n, inspect the exact denominator, filter recurring sequences, and export the table.</p>
            <Link href="/tools/ngram-analyzer">Open the N-gram analyzer <span>→</span></Link>
          </section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
