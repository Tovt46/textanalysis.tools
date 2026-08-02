import type {Metadata} from "next";
import Link from "next/link";
import {SiteFooter,SiteHeader} from "../../SiteChrome";
import {SITE_ICONS,SITE_NAME,SITE_URL} from "../../seo-metadata";

const path="/privacy";
const title="Privacy and Data Handling | Text Analysis Tools";
const description="How Text Analysis Tools handles pasted text, public URLs, API requests, local CLI and MCP workflows, browser storage, operational logs, and optional analytics.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title,
  description,
  alternates:{canonical:path},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  icons:SITE_ICONS,
  manifest:"/site.webmanifest",
};

const handlingRows=[
  ["Web, text-only","Your browser","No document is sent to the API. Custom stop-word lists and an explicitly saved comparison baseline may remain in your browser storage."],
  ["Web, URL or mixed input","Public API","The API receives the inputs needed for that operation. In a mixed comparison, this can include companion pasted text as well as the public URL."],
  ["Public API","Server memory","Request content is processed to create the response. It is not added to an account, document database, or analysis history."],
  ["CLI","Your local Node.js process","Files, inline text, and stdin stay in the CLI process. A URL is downloaded directly by the CLI."],
  ["Local MCP server","Your local Node.js process","Tool arguments and results stay between the MCP client and the local server. A URL is downloaded directly by that process."],
] as const;

export default function PrivacyPage(){
  return <main className="article-page">
    <SiteHeader locale="en" active="privacy"/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Privacy and data handling</span></nav>
        <p className="eyebrow">PRIVACY · STORAGE · NETWORK BOUNDARIES</p>
        <h1>Privacy and Data Handling</h1>
        <p className="article-deck">Text Analysis Tools is local-first where the browser or CLI can do the work. URL workflows require a network request. This page explains that boundary, what is stored, and which limited operational metadata may be collected.</p>
        <div className="article-actions"><a className="primary-article-cta" href="#summary">See the data flow</a><Link href="/api-docs">Read the API contract →</Link></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page"><b>On this page</b><a href="#summary">Data flow summary</a><a href="#web">Web tools</a><a href="#api">Public API</a><a href="#urls">Public URLs</a><a href="#local">CLI and MCP</a><a href="#operations">Operational data</a><a href="#analytics">Optional analytics</a><a href="#control">Retention and control</a></aside>
        <div className="article-body api-docs-body">
          <section id="summary">
            <p className="section-number">01</p><h2>Where each workflow runs</h2>
            <p>The important distinction is not simply “text” versus “URL.” A text-only web analysis runs locally. When one part of a combined workflow is a URL, the web app sends every input required for that request to the stateless API so the comparison uses one consistent analysis contract.</p>
            <div className="api-fields">{handlingRows.map(([workflow,location,handling])=><div key={workflow}><b>{workflow}</b><span>{location}</span><p>{handling}</p></div>)}</div>
          </section>

          <section id="web">
            <p className="section-number">02</p><h2>Web tools and browser storage</h2>
            <p>Pasted text is analyzed in the browser when every selected source is text. The browser does not need to upload that document for the calculation. If a workflow includes a public URL, the tool clearly switches to the API path and sends the inputs needed for the combined operation.</p>
            <p>Editable stop-word lists are saved in local browser storage so they survive a refresh. The Bag of Words analyzer can also save a comparison baseline locally when you choose that action. This data stays on that browser profile until you reset it, clear the saved baseline, or clear the site&apos;s browser data.</p>
            <div className="article-callout subtle"><b>Avoid sensitive content in URL mode</b><p>Do not combine confidential pasted text with a public URL if the text must never leave your device. Run both sources as local text instead, or use the CLI.</p></div>
          </section>

          <section id="api">
            <p className="section-number">03</p><h2>Public API processing</h2>
            <p>The versioned API receives JSON, processes it in server memory, and returns a JSON result with <code>Cache-Control: no-store</code>. The service does not create accounts, save submitted documents, build a server-side analysis history, or put result terms into a document database.</p>
            <p>Successful API payloads declare <code>storage: &quot;none&quot;</code>. That declaration refers to submitted content and analysis results. It does not mean the server has no security, quota, access, or reliability metadata; those limited records are described below.</p>
            <p>Every API response has a random request ID for support and correlation. The ID is not derived from the input text, analyzed URL, result, or network address.</p>
          </section>

          <section id="urls">
            <p className="section-number">04</p><h2>Fetching public URLs</h2>
            <p>URL inputs are fetched only after you explicitly submit them. The API and local CLI accept public HTTP or HTTPS destinations, resolve addresses before connecting, reject private and reserved networks, recheck redirects, and enforce request, byte, time, and analysis limits.</p>
            <p>The destination website necessarily receives a request from the machine performing the fetch and can apply its own logs, cookies, terms, or access rules. Text Analysis Tools cannot control that third party&apos;s retention practices. Do not use URL mode for private dashboards, authenticated pages, intranet services, or URLs containing secrets.</p>
          </section>

          <section id="local">
            <p className="section-number">05</p><h2>CLI and local MCP workflows</h2>
            <p>The npm CLI analyzes inline text, local files, and piped stdin inside your Node.js process. The local MCP server exposes the same deterministic operations over stdio. Neither needs to send local document content to textanalysis.tools.</p>
            <p>When you give the CLI or MCP tool a public URL, that local process downloads the page directly. Your MCP client or agent may have separate logging or conversation-retention behavior, so review that product&apos;s settings before supplying sensitive data.</p>
          </section>

          <section id="operations">
            <p className="section-number">06</p><h2>Quota state and privacy-safe operational logs</h2>
            <p>The application&apos;s structured API logs are deliberately restricted to a random request ID, operation name, HTTP method and status, duration, response byte count, and a coarse error class. They do not include submitted text, analyzed URLs, result terms, document content, request headers, or client IP addresses.</p>
            <p>Rate limiting keeps a bounded counter and time window for a hashed network identifier. On a multi-worker deployment, those hashed quota buckets may be kept in a shared local directory. Expired entries no longer affect requests and are cleaned as their bucket is updated. Quota state is not an analysis history.</p>
            <p>Application-log retention is controlled by the production hosting configuration. The hosting and network layers can separately keep standard security or access records, such as a client address and the API route requested, under the hosting provider&apos;s controls. An analyzed destination remains inside the JSON request body rather than the API route. The application logs can therefore diagnose latency, errors, quota responses, and remote-fetch failures without reconstructing an analysis.</p>
          </section>

          <section id="analytics">
            <p className="section-number">07</p><h2>Optional analytics</h2>
            <p>The core tools do not require analytics to function. A deployment can optionally enable Google Analytics for page usage and limited product events, such as the tool, input mode, selected language, and aggregate counts. Server-side events can likewise report the operation and coarse execution metadata. These integrations are disabled when their environment configuration is absent.</p>
            <p>Analytics events are designed not to include submitted documents, the URL entered for analysis, or result tables. If analytics is enabled, Google&apos;s own identifiers, cookies, and retention controls are governed by the configured Google Analytics property and your browser settings.</p>
          </section>

          <section id="control">
            <p className="section-number">08</p><h2>Retention, control, and safe use</h2>
            <ul>
              <li>Clear this site&apos;s browser data to remove locally saved stop-word settings and baselines.</li>
              <li>API document content and results have no server-side history to retrieve or delete.</li>
              <li>CLI output exists only where you print or save it; MCP retention depends on the client you connect.</li>
              <li>Do not submit secrets, personal data you are not authorized to process, or access-bearing URLs.</li>
              <li>Review the <Link href="/api-docs">API limits</Link> and the source website&apos;s terms before automating URL analysis.</li>
            </ul>
            <p>This description reflects the open-source implementation as of August 2, 2026. If the data flow changes, the implementation and this page should change together.</p>
          </section>

          <section className="article-final-cta"><p className="eyebrow">LOCAL-FIRST · EXPLICIT NETWORK USE</p><h2>Choose the boundary that fits your document</h2><p>Use the browser for text-only work, the CLI or local MCP server for files and private local workflows, and the API when an application needs stateless HTTP analysis.</p><Link href="/cli">Read the local CLI guide <span>→</span></Link></section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
