import type { Metadata } from "next";
import Link from "next/link";
import TfIdfCalculatorTool from "../../../TfIdfCalculatorTool";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/tf-idf-calculator";
const title="Free TF-IDF Calculator for Text & URLs";
const description="Compare two documents with inverse-document-frequency weighting. TF-IDF reduces common terms and highlights terms that better separate a document pair.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title,
  description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},
  icons:SITE_ICONS,
  manifest:"/site.webmanifest",
};

export default function TfIdfCalculatorPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <TfIdfCalculatorTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">HOW TF-IDF WORKS</p>
        <h2>Term frequency and rarity are combined into one score</h2>
        <p>TF-IDF combines within-document term frequency with inverse-document frequency across the document pair. Words that appear in both texts with similar intensity keep a low score; words that are common in only one text rise in ranking.</p>
        <div className="formula-grid"><div><span>TF</span><code>term frequency ÷ analyzed words</code></div><div><span>IDF</span><code>log((N + 1) ÷ (df + 1)) + 1</code></div></div>
      </section>
      <section>
        <p className="section-number">COMPARATIVE VIEW</p>
        <h2>Inspect both documents with one shared weighting model</h2>
        <div className="feature-list">
          <div><h3>Two-source setup</h3><p>Use text or a public URL for each source and keep settings synchronized for fair comparison.</p></div>
          <div><h3>Top terms</h3><p>Limit rows to a deterministic top slice to focus on the strongest terms.</p></div>
          <div><h3>Global IDF table</h3><p>Review which terms carry more discriminative power across the pair.</p></div>
          <div><h3>Export</h3><p>Download both document vectors and metadata for reproducible modeling.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEP</p>
        <h2>From weighted features to direct similarity</h2>
        <p>When you need a scalar distance between two documents, switch to cosine similarity over the same inputs and inspect contribution terms.</p>
        <div><Link href="/tools/text-similarity-calculator">Text Similarity Calculator <span>→</span></Link><Link href="/tools/bag-of-words-generator">Bag of Words Generator <span>→</span></Link><Link href="/api-docs#focused">Focused API endpoints <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
