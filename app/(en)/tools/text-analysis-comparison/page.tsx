import type { Metadata } from "next";
import Link from "next/link";
import TextComparisonTool from "../../../TextComparisonTool";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../../SiteChrome";

const path="/tools/text-analysis-comparison";
const title="Free Text Comparison Tool for Word Frequency Changes";
const description="Compare two texts or webpages by word count, vocabulary, normalized word frequency, bigrams, and Zipf diagnostics. Search and export exact A/B differences.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:{en:path,"x-default":path}},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

export default function TextAnalysisComparisonPage(){
  return <main className="tool-page">
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,uk:"/uk",ru:"/ru"}}/>
    <TextComparisonTool/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">NORMALIZED COMPARISON</p>
        <h2>Compare texts of different lengths without relying on raw counts alone</h2>
        <p>A longer version will usually contain more occurrences of almost every word. This tool therefore reports both raw count changes and each term&apos;s share of the analyzed words. The share difference is shown in percentage points, so the direction remains comparable even when A and B have different word counts.</p>
        <div className="formula-grid"><div><span>Term share</span><code>term count ÷ analyzed words</code></div><div><span>Share change</span><code>(share in B − share in A) × 100 pp</code></div></div>
        <p>The same language and stop-word setting is applied to both inputs. Bigrams use the number of available two-word positions as their denominator.</p>
      </section>
      <section>
        <p className="section-number">REVISION WORKFLOW</p>
        <h2>Use A/B frequency changes to inspect a revision</h2>
        <p>Paste the original in A and the revision in B, then review the largest normalized changes first. Search for a specific word or switch to bigrams when phrase order matters. The export contains the complete comparison, including terms that appear in only one version.</p>
        <div className="feature-list"><div><h3>Draft vs revision</h3><p>Find vocabulary that was added, removed, or repeated more heavily after editing.</p></div><div><h3>Page vs competitor</h3><p>Compare public pages cautiously and remember that menus or templates can affect extracted text.</p></div><div><h3>Local pasted-text mode</h3><p>When both inputs are pasted, the complete calculation stays in your browser.</p></div><div><h3>URL comparison API</h3><p>If either source is a URL, the stateless public API fetches and compares both inputs without retaining them.</p></div></div>
      </section>
      <section>
        <p className="section-number">LIMITATIONS</p>
        <h2>Frequency change is not semantic similarity or content quality</h2>
        <p>The comparison shows how surface vocabulary changed. It does not determine whether two passages mean the same thing, whether a revision is factually correct, or whether one version will perform better in search. Treat increases and decreases as diagnostic directions, not optimization recommendations.</p>
        <div className="article-callout subtle"><b>No automatic winner</b><p>The tool deliberately avoids a “better version” score. Interpret the changes alongside intent, readability, factual accuracy, and the purpose of the page.</p></div>
      </section>
      <section className="tool-next-links"><p className="section-number">RELATED WORKFLOWS</p><h2>Inspect one text or automate the comparison</h2><p>Use the focused frequency table for one vocabulary, open the Bag of Words analyzer for distribution detail, or call the same comparison contract from an application.</p><div><Link href="/tools/word-frequency-counter">Word Frequency Counter <span>→</span></Link><Link href="/tools/bag-of-words-analyzer">Bag of Words Analyzer <span>→</span></Link><Link href="/api-docs#compare">Comparison API <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
