import type {Metadata} from "next";
import Link from "next/link";
import EvidenceWorkspace from "../../../EvidenceWorkspace";
import {SiteFooter,SiteHeader} from "../../../SiteChrome";
import {SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema} from "../../../seo-metadata";
import "../../../rewrite-review.css";

const path="/tools/rewrite-review";
const title="Rewrite Review | What Got Lost in the Rewrite?";
const description="Compare your original text and rewrite. Spot changed prices, possible missing conditions, and lost terms, then download a report for human review.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,alternates:{canonical:path},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  icons:SITE_ICONS,manifest:SITE_MANIFEST,
};
const schema=toolWebApplicationSchema({name:"Rewrite Review",description,path,featureList:["Original and rewritten text comparison","Changed price excerpts","Possible missing conditions","Lost tracked terms","Human-approved optional edits","Markdown and JSON review reports"]});

export default function RewriteReviewPage(){
  return <main className="tool-page evidence-page rewrite-review-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={{en:path,ru:"/ru/tools",uk:"/uk/tools",es:"/es/tools"}}/>
    <section className="tool-hero evidence-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Rewrite Review</span></nav>
      <p className="eyebrow">ORIGINAL → REWRITE → REVIEW → REPORT</p>
      <h1>What got lost in the rewrite?</h1>
      <p>A smoother rewrite can change a price or drop a condition. Compare both versions, check the flagged changes, and save a report before you share the text.</p>
      <div className="hero-note-row"><span>PRIVATE IN THIS TAB</span><p>Your texts stay in this browser. No account or API key is needed.</p></div>
    </section>
    <section className="rewrite-quickstart" aria-labelledby="rewrite-help-title">
      <h2 id="rewrite-help-title">How to use this review</h2>
      <ol>
        <li><h3>Add both versions</h3><p>Paste the source into Original text and the new version into Rewritten text. Separate optional important terms with commas.</p></li>
        <li><h3>Read the changes</h3><p>Select <strong>Compare texts</strong>, then compare the <strong>Original</strong> and <strong>Rewrite</strong> excerpts in each flagged card.</p></li>
        <li><h3>Save the report</h3><p>Download <strong>Markdown</strong> to read or share, or <strong>JSON</strong> for structured data. Editing is optional.</p></li>
      </ol>
    </section>
    <EvidenceWorkspace key="rewrite" experience="rewrite"/>
    <article className="tool-explainer evidence-explainer">
      <section>
        <p className="section-number">WHAT TO CHECK</p><h2>Read the changes in context</h2>
        <div className="feature-list"><div><h3>A price that changed</h3><p>Compare the original and rewritten price excerpts. Verify the intended value against your source before editing it.</p></div><div><h3>A condition that disappeared</h3><p>Check whether a billing restriction, exception, or caveat was removed or rephrased.</p></div><div><h3>A term you wanted to keep</h3><p>Add important words or phrases before comparing. The review flags terms present in the original and absent from the rewrite.</p></div></div>
      </section>
      <section>
        <p className="section-number">HUMAN REVIEW</p><h2>The report gives you a checklist</h2>
        <p>This comparison uses exact text matching and supported English claim and condition patterns. It can miss paraphrases and changes in meaning. It does not establish whether claims are true or whether the rewrite is ready to publish.</p>
        <p>You can download the report as soon as the comparison is ready. If you propose an edit, review and approve it before applying it. An applied edit creates a new revision that must be analyzed before export.</p>
      </section>
      <section className="tool-next-links"><h2>Keep exploring</h2><div><Link href="/tools/evidence-workspace">Advanced Evidence Workspace <span>→</span></Link><Link href="/tools/text-analysis-comparison">Compare vocabulary and frequency <span>→</span></Link><Link href="/privacy">Text privacy <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
