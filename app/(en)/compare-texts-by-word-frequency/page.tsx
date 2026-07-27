import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/compare-texts-by-word-frequency";
const title="How to Compare Texts by Word Frequency";
const description="Compare two texts by normalized word and phrase frequency instead of character edits. Learn the workflow, formulas, interpretation rules, and limitations.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org","@type":"TechArticle",
  headline:"How to Compare Texts by Word Frequency",
  description,inLanguage:"en",datePublished:"2026-07-26",dateModified:"2026-07-26",
  mainEntityOfPage:`${SITE_URL}${path}`,publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
  about:["text comparison","word frequency","document revision","normalized frequency"],
};

export default function CompareTextsByWordFrequencyPage(){
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="guide" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Compare texts by word frequency</span></nav>
        <p className="eyebrow">REVISION ANALYSIS · NORMALIZED A/B WORKFLOW</p>
        <h1>How to Compare Texts by Word Frequency</h1>
        <p className="article-deck">A character diff shows which exact lines changed. A frequency comparison answers a different question: how did the vocabulary, phrase mix, and normalized emphasis change between version A and version B?</p>
        <p className="article-meta">Published July 26, 2026 · Designed for drafts, revisions, and public webpages</p>
        <div className="article-actions"><Link className="primary-article-cta" href="/tools/text-analysis-comparison">Compare two texts</Link><a href="#workflow">Follow the workflow ↓</a></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page">
          <b>On this page</b>
          <a href="#difference">Frequency comparison versus diff</a>
          <a href="#workflow">Five-step workflow</a>
          <a href="#normalization">Normalize different lengths</a>
          <a href="#example">Worked example</a>
          <a href="#phrases">Compare words and bigrams</a>
          <a href="#interpretation">Interpret changes</a>
          <a href="#limitations">Limits</a>
        </aside>
        <div className="article-body">
          <section id="difference">
            <p className="section-number">01</p>
            <h2>Frequency Comparison Is Not a Character Diff</h2>
            <p>A line or character diff preserves position and shows exact insertions and deletions. It is ideal for code, contracts, and sentence-level editing. Word-frequency comparison discards position, groups matching terms, and measures how their shares changed.</p>
            <div className="comparison-grid">
              <div className="comparison-head"><span>Method</span><b>Preserves</b><b>Best for</b></div>
              <div><span>Character diff</span><p>Exact position and sequence</p><p>Finding literal edits</p></div>
              <div><span>Frequency comparison</span><p>Counts and normalized shares</p><p>Finding vocabulary and emphasis changes</p></div>
              <div><span>Cosine similarity</span><p>Vector direction</p><p>Summarizing weighted overlap</p></div>
            </div>
            <p>These methods can be used together. Start with a diff to see what moved, then use frequency changes to understand what became more or less prominent across the complete document.</p>
          </section>
          <section id="workflow">
            <p className="section-number">02</p>
            <h2>A Six-Step Text Comparison Workflow</h2>
            <div className="step-grid">
              <div><span>1</span><h3>Define A and B</h3><p>Use the original as A and the revision as B. Keep the direction consistent across reports.</p></div>
              <div><span>2</span><h3>Match preprocessing</h3><p>Apply the same language, stop words, tokenization, and source extraction rules to both inputs.</p></div>
              <div><span>3</span><h3>Compare document metrics</h3><p>Review token count and vocabulary size before interpreting individual term changes.</p></div>
              <div><span>4</span><h3>Sort normalized changes</h3><p>Start with the largest absolute percentage-point changes, not only raw count changes.</p></div>
              <div><span>5</span><h3>Inspect context manually</h3><p>Search the source for changed terms and decide whether the shift was intentional and useful.</p></div>
              <div><span>6</span><h3>Export the evidence</h3><p>Save the full table when the comparison is part of editorial QA or a repeatable process.</p></div>
            </div>
          </section>
          <section id="normalization">
            <p className="section-number">03</p>
            <h2>Normalize When the Texts Have Different Lengths</h2>
            <p>Raw counts can mislead when B is longer than A. A term may appear more times while representing a smaller share of the revised text. Calculate each term&apos;s share inside its own document:</p>
            <code className="vector-code">share(t, d) = count(t in d) / analyzed tokens in d</code>
            <p>Then subtract A from B and express the result in percentage points:</p>
            <code className="vector-code">share change = (share in B − share in A) × 100 percentage points</code>
            <p>A positive result means the term occupies a larger share in B. A negative result means it occupies a smaller share. This does not declare the change good or bad.</p>
          </section>
          <section id="example">
            <p className="section-number">04</p>
            <h2>A Worked Frequency-Change Example</h2>
            <p>Suppose “conversion” appears 6 times in a 600-word original and 8 times in a 1,200-word revision.</p>
            <div className="vector-table">
              <div className="vector-row vector-head"><span>Version</span><span>Count</span><span>Words</span><span>Share</span><span>Per 1,000</span><span>Direction</span></div>
              <div className="vector-row"><b>A</b><span>6</span><span>600</span><span>1.00%</span><span>10.0</span><span>Baseline</span></div>
              <div className="vector-row"><b>B</b><span>8</span><span>1,200</span><span>0.67%</span><span>6.7</span><span>−0.33 pp</span></div>
            </div>
            <p>The raw count rose by two, but the normalized share fell by 0.33 percentage points. B contains more occurrences because it is longer, not because the term became more prominent.</p>
          </section>
          <section id="phrases">
            <p className="section-number">05</p>
            <h2>Compare Individual Words and Consecutive Phrases</h2>
            <p>Unigram changes show which individual terms gained or lost share. Bigram changes preserve short local sequences and can reveal that a concept moved from one phrasing to another even when its component words stayed common.</p>
            <p>Phrase tables need a window-based denominator. For a document with m tokens, there are m−1 bigram positions. Use the same n-gram size and filtering behavior on both sides. The <Link href="/what-are-n-grams">N-gram guide</Link> explains this denominator in detail.</p>
          </section>
          <section id="interpretation">
            <p className="section-number">06</p>
            <h2>Interpret the Largest Changes in Source Context</h2>
            <div className="feature-list">
              <div><h3>Added vocabulary</h3><p>A new term may represent useful specificity, a topic expansion, boilerplate, or an accidental repetition.</p></div>
              <div><h3>Removed vocabulary</h3><p>A missing term may indicate tighter editing, lost detail, a renamed concept, or a changed purpose.</p></div>
              <div><h3>Vocabulary size</h3><p>A larger vocabulary is not automatically better. Genre, length, names, and technical notation all affect it.</p></div>
              <div><h3>Zipf diagnostics</h3><p>Distribution changes can flag unusual repetition, but they need a second signal such as relevance or contextual review.</p></div>
            </div>
            <p>For automated workflows, the public <Link href="/api-docs#compare">comparison API</Link> returns both analyses and the complete normalized change tables.</p>
          </section>
          <section id="limitations">
            <p className="section-number">07</p>
            <h2>Vocabulary Change Does Not Measure Quality or Meaning</h2>
            <p>Frequency comparison does not judge factual accuracy, readability, semantic equivalence, tone, or search performance. Template extraction can also add navigation, footer, or cookie text when public URLs are compared.</p>
            <p>Use the output to locate changes worth reviewing. Do not automatically restore every removed term, delete every repeated phrase, or select a “winner” based on one numeric direction.</p>
            <div className="article-callout"><b>No automatic winner</b><p>The comparison tool intentionally reports evidence instead of assigning a quality score to A or B.</p></div>
          </section>
          <section className="article-sources">
            <h2>Related methods</h2>
            <ul>
              <li><Link href="/how-to-calculate-word-frequency">How to calculate word frequency</Link></li>
              <li><Link href="/cosine-similarity-for-text">Cosine similarity for weighted overlap</Link></li>
              <li><Link href="/tools/keyword-density-checker">Keyword density and tracked phrase comparison</Link></li>
            </ul>
          </section>
          <section className="article-final-cta">
            <p className="eyebrow">TEXT OR URL · COMPLETE A/B EXPORT</p>
            <h2>Inspect what changed beyond the line diff</h2>
            <p>Compare normalized word and bigram frequency with one synchronized preprocessing configuration.</p>
            <Link href="/tools/text-analysis-comparison">Open the text comparison tool <span>→</span></Link>
          </section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
