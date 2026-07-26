import type { Metadata } from "next";
import Link from "next/link";
import BagOfWordsGeneratorTool from "../../../BagOfWordsGeneratorTool";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/bag-of-words-generator";
const title="Free Bag of Words Generator for Text & URLs";
const description="Build a full term vector from text or a public webpage with token counts, frequencies, and frequency rates. Export full tables for downstream analysis.";

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

export default function BagOfWordsGeneratorPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <BagOfWordsGeneratorTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">WHAT YOU GET</p>
        <h2>Build term vectors that are easy to use</h2>
        <p>The generator returns every analyzed token once with count, relative frequency, percentage, and occurrences per 1,000. These rows are stable across repeated runs with the same language and stop-word options.</p>
        <div className="formula-grid"><div><span>Frequency</span><code>term count ÷ total analyzed words</code></div><div><span>Coverage</span><code>(term count ÷ total words) × 100</code></div></div>
      </section>
      <section>
        <p className="section-number">WORKFLOW</p>
        <h2>Use local mode for large drafts and URL mode for published pages</h2>
        <div className="feature-list">
          <div><h3>Text-first mode</h3><p>Local analysis runs immediately with no network round-trip for pasted text.</p></div>
          <div><h3>Public URL mode</h3><p>The same vector contract is applied after HTML cleanup and token extraction.</p></div>
          <div><h3>Stop-word control</h3><p>Drop common function words or keep them if your model needs a full vocabulary baseline.</p></div>
          <div><h3>CSV and JSON export</h3><p>Export the complete vector to share downstream scoring or clustering scripts.</p></div>
        </div>
      </section>
      <section className="tool-next-links">
        <p className="section-number">NEXT TOOLS</p>
        <h2>Move from vectors to comparison and weighting</h2>
        <p>Pass the generated vectors into TF-IDF scoring or direct similarity checks when you want to compare documents at feature level instead of only raw frequency.</p>
        <div><Link href="/tools/tf-idf-calculator">TF-IDF Calculator <span>→</span></Link><Link href="/tools/text-similarity-calculator">Text Similarity Calculator <span>→</span></Link><Link href="/api-docs#focus">Focused API endpoints <span>→</span></Link></div>
      </section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
