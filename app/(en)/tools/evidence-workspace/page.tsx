import type {Metadata} from "next";
import Link from "next/link";
import EvidenceWorkspace from "../../../EvidenceWorkspace";
import "../../../rewrite-review.css";
import {SITE_MANIFEST,SITE_SOCIAL_IMAGE,SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema} from "../../../seo-metadata";
import {SiteFooter,SiteHeader} from "../../../SiteChrome";

const path="/tools/evidence-workspace";
const title="Claim-Aware Version Review with Human-Approved Patches";
const description="Compare text versions, build evidence-linked findings, and review exact edits with human-only approval. Use visible controls or optional ChatGPT WebMCP tools.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US",images:[SITE_SOCIAL_IMAGE]},
  twitter:{card:"summary_large_image",title,description,images:[SITE_SOCIAL_IMAGE]},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:SITE_MANIFEST,
};

const schema=toolWebApplicationSchema({
  name:"Text Analysis Evidence Workspace",
  description,path,
  featureList:["Claim-aware version map","Commercial claim ledger","Missing conditions and tracked terms","Five discoverable WebMCP tools","Human-only patch approval","Before-and-after Markdown and JSON reports"],
});

const languagePaths={en:path,ru:"/ru/tools",uk:"/uk/tools",es:"/es/tools"};

export default function EvidenceWorkspacePage(){
  return <main className="tool-page evidence-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths}/>
    <section className="tool-hero evidence-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>Evidence Workspace</span></nav>
      <p className="eyebrow">WEBMCP · CLAIM DRIFT · HUMAN APPROVAL</p>
      <h1>Build an evidence-backed review with human-approved edits</h1>
      <p>Compare versions, inspect claim drift, and turn measured evidence into findings and exact proposals. An agent can propose edits; you control every approval.</p>
      <div className="hero-note-row"><span>LOCAL TEXT WORKSPACE</span><p>Pasted text and workspace state stay in this browser. No OpenAI API key, account, or server-side document storage is required.</p></div>
    </section>
    <p className="evidence-scenario-link">Checking a rewrite? <Link href="/tools/rewrite-review">Open the dedicated rewrite review →</Link></p>
    <EvidenceWorkspace key="workspace"/>
    <article className="tool-explainer evidence-explainer">
      <section>
        <p className="section-number">ONE END-TO-END WORKFLOW</p>
        <h2>From two versions to a review you can share</h2>
        <p>Start with the fictional product example or paste your own original and rewrite. The review highlights text changes and omissions for you to inspect. You can save the report immediately; editing and agent assistance are optional.</p>
        <div className="feature-list"><div><h3>1 · Compare</h3><p>See retained, added, and removed blocks plus the real change in analyzed length.</p></div><div><h3>2 · Triage claims</h3><p>Separate prices, offers, ratings, guarantees, privacy, refunds, and other decision-critical claims.</p></div><div><h3>3 · Review omissions</h3><p>Check missing conditions and exact terms you wanted to keep. A reworded phrase can also be flagged.</p></div><div><h3>4 · Save the report</h3><p>Download Markdown or JSON with the comparison and any review notes. If you apply an approved edit, analyze the new revision before exporting.</p></div></div>
      </section>
      <section>
        <p className="section-number">SAFETY BOUNDARIES</p>
        <h2>A patch cannot silently become an edit</h2>
        <p>Every proposal is tied to one document revision, one unique source span, and at least one evidence-backed finding. Applying it requires a separate human approval recorded by the visible page. If the document changes, pending proposals become stale and must be reviewed again.</p>
        <div className="article-callout"><b>WebMCP is an enhancement, not a gate</b><p>When <code>document.modelContext</code> is unavailable, the same analysis, finding, proposal, approval, application, and export flow remains usable through normal page controls.</p></div>
      </section>
      <section className="tool-next-links"><p className="section-number">DETERMINISTIC BOUNDARY</p><h2>Claims are flagged for review, not declared true or false</h2><p>The workspace detects exact text patterns and version drift. You decide why each change matters. English condition patterns and exact term matching can miss paraphrases and other languages. Check the full texts and use a current source before changing prices, offers, ratings, or trust claims.</p><div><Link href="/agents">Agent integrations <span>→</span></Link><Link href="/tools/text-analysis-comparison">Text comparison <span>→</span></Link><Link href="/tools/keyword-density-checker">Keyword density <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
