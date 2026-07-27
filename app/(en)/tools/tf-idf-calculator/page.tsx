import type { Metadata } from "next";
import Link from "next/link";
import TfIdfCalculatorTool from "../../../TfIdfCalculatorTool";
import { SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema } from "../../../seo-metadata";
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
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},
  icons:SITE_ICONS,
  manifest:"/site.webmanifest",
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
        <h2>Term frequency and rarity are combined into one score</h2>
        <p>TF-IDF combines within-document term frequency with inverse-document frequency across the selected corpus. Terms that appear throughout the corpus receive less weight; terms concentrated in fewer documents receive more.</p>
        <div className="formula-grid"><div><span>TF</span><code>term frequency ÷ analyzed words</code></div><div><span>IDF</span><code>log((N + 1) ÷ (df + 1)) + 1</code></div></div>
      </section>
      <section>
        <p className="section-number">COMPARATIVE VIEW</p>
        <h2>Inspect every document with one shared weighting model</h2>
        <div className="feature-list">
          <div><h3>Corpus setup</h3><p>Add 2–10 text or public URL sources and apply one synchronized preprocessing configuration.</p></div>
          <div><h3>Top terms</h3><p>Limit rows to a deterministic top slice to focus on the strongest terms.</p></div>
          <div><h3>Global IDF table</h3><p>Review which terms carry more discriminative power across the selected corpus.</p></div>
          <div><h3>Export</h3><p>Download every document vector and the shared metadata for reproducible modeling.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT STEP</p>
        <h2>From weighted features to direct similarity</h2>
        <p>When you need one similarity score for two documents, switch to cosine similarity over the same inputs and inspect contribution terms.</p>
        <div><Link href="/tf-idf-formula">Read the TF-IDF formula guide <span>→</span></Link><Link href="/tools/text-similarity-calculator">Text Similarity Calculator <span>→</span></Link><Link href="/api-docs#weighted">TF-IDF API <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
