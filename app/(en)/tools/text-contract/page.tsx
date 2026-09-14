import type {Metadata} from "next";
import Link from "next/link";
import TextContractAgent from "../../../TextContractAgent";
import {SITE_ICONS,SITE_NAME,SITE_URL,toolWebApplicationSchema} from "../../../seo-metadata";
import {SiteFooter,SiteHeader} from "../../../SiteChrome";

const path="/tools/text-contract";
const title="TextContract Agent | Guarded AI Rewriting";
const description="Turn one source and one editorial brief into approved rewrite rules, then let Nemotron write, check, and repair its output before human acceptance.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema=toolWebApplicationSchema({
  name:"TextContract Agent",
  description,path,
  featureList:["Human-approved rewrite contract","NVIDIA Nemotron draft and semantic evaluation","Deterministic number, link, phrase, and HTML checks","One bounded repair cycle","Tavily evidence for explicitly live claims","Markdown and JSON audit reports"],
});

const languagePaths={en:path,ru:"/ru/tools",uk:"/uk/tools",es:"/es/tools"};

export default function TextContractPage(){
  return <main className="tool-page text-contract-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="tools" languagePaths={languagePaths}/>
    <section className="tool-hero contract-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Tools</Link><span>/</span><span>TextContract</span></nav>
      <p className="eyebrow">NEMOTRON · EXECUTABLE RULES · ONE REPAIR</p>
      <h1>Rewrite one document without losing the facts that make it safe</h1>
      <p>TextContract turns your editorial brief into visible, executable rules. You approve the contract; the agent writes, checks, and repairs its own output before returning it for human acceptance.</p>
      <div className="hero-note-row"><span>ONE SOURCE · ONE BRIEF</span><p>Draft 1 and Repair 1 are created by the agent as an audit trail. You never need to paste intermediate versions.</p></div>
    </section>
    <TextContractAgent/>
    <article className="tool-explainer contract-explainer">
      <section>
        <p className="section-number">A BOUNDED AGENT LOOP</p>
        <h2>A writing agent that has to show its rules first</h2>
        <p>Local extraction protects exact numbers, URLs, quoted phrases, headings, and JSON-LD. Nemotron adds semantic invariants such as caveats, claim strength, subject relationships, and unsupported conclusions. The contract remains editable, but writing is locked until a human approves it.</p>
        <div className="feature-list"><div><h3>1 · Compile</h3><p>Convert one source and one brief into no more than 20 visible checks.</p></div><div><h3>2 · Approve</h3><p>Edit the semantic rules, adjust severity, or disable an optional rule before generation.</p></div><div><h3>3 · Generate</h3><p>Create one draft, evaluate every enabled rule, and repair detected violations once.</p></div><div><h3>4 · Decide</h3><p>Accept, copy, edit and recheck, or export the complete rule and attempt history.</p></div></div>
      </section>
      <section>
        <p className="section-number">FAIL-CLOSED STATUS</p>
        <h2>An incomplete check cannot become a green result</h2>
        <p><strong>READY</strong> requires every enabled check to pass. <strong>NEEDS REVIEW</strong> means no required failure was found, but an enabled check failed or stayed uncertain. <strong>BLOCKED</strong> means a required violation remains or an API step failed after a candidate was created.</p>
        <div className="article-callout"><b>Live evidence stays narrow</b><p>Tavily runs only for contract rules explicitly marked as time-sensitive, with at most three rules and three sources per rule. Missing or conflicting evidence produces <code>uncertain</code>, never a fabricated pass.</p></div>
      </section>
      <section className="tool-next-links"><p className="section-number">PRIVACY BOUNDARY</p><h2>The source is processed, not published</h2><p>The source and brief are sent to NVIDIA Nemotron through Nebius Token Factory because the agent must read them to write. Text Analysis Tools does not persist a server-side workspace or include document contents in its API logs. Browser workspace state lives only in this tab’s session storage.</p><div><Link href="/privacy">Read the privacy policy <span>→</span></Link><Link href="/tools/evidence-workspace">Open Evidence Workspace <span>→</span></Link><Link href="/tools/text-analysis-comparison">Compare text versions <span>→</span></Link></div></section>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
