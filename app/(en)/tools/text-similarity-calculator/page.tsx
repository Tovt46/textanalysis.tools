import type { Metadata } from "next";
import Link from "next/link";
import TextSimilarityCalculatorTool from "../../../TextSimilarityCalculatorTool";
import { SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
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
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},
  icons:SITE_ICONS,
  manifest:"/site.webmanifest",
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
        <h2>Cosine similarity on explicit feature vectors</h2>
        <p>The similarity tool scores overlap across term-weight vectors. You can switch between raw term weights and TF-IDF weights to check whether a result is driven by generic language or by truly distinctive terms.</p>
        <div className="formula-grid"><div><span>Cosine similarity</span><code>sum(a×b) ÷ (||a|| × ||b||)</code></div><div><span>Term contribution</span><code>a<sub>i</sub> × b<sub>i</sub></code></div></div>
      </section>
      <section>
        <p className="section-number">DIAGNOSTIC VIEW</p>
        <h2>Inspect top contribution terms instead of relying on one score</h2>
        <div className="feature-list">
          <div><h3>Two modes</h3><p>Use Bag of Words for raw overlap and TF-IDF for rarity-aware overlap.</p></div>
          <div><h3>Contribution table</h3><p>View per-term overlap weights and absolute contribution to the final score.</p></div>
          <div><h3>Input flexibility</h3><p>Analyze local text instantly or call the public API for URL inputs.</p></div>
          <div><h3>Export</h3><p>Download scored terms and top overlap rows for post-processing or QA.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">WHEN TO USE</p>
        <h2>Use similarity checks before semantic-only judging</h2>
        <p>Similarity gives a surface overlap score. It is useful for revision QA, duplicate checks, and duplicate-safe candidate filtering before manual review.</p>
        <div><Link href="/cosine-similarity-for-text">Read the cosine similarity guide <span>→</span></Link><Link href="/tools/text-analysis-comparison">Text Analysis Comparison <span>→</span></Link><Link href="/api-docs#weighted">Similarity API <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
