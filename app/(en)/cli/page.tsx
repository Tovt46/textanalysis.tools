import type { Metadata } from "next";
import Link from "next/link";
import cliPackage from "../../../packages/cli/package.json";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/cli";
const title="Text Analysis CLI: npm Installation & Command Guide";
const description="Install the textanalysis-tools npm CLI and run word frequency, density, N-grams, Bag of Words, comparison, TF-IDF, and cosine similarity locally.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"article",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org",
  "@graph":[
    {
      "@type":"TechArticle",
      headline:"Text Analysis CLI Documentation",
      description,
      inLanguage:"en",
      datePublished:"2026-07-26",
      dateModified:"2026-07-26",
      mainEntityOfPage:`${SITE_URL}${path}`,
      publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL},
    },
    {
      "@type":"SoftwareSourceCode",
      name:"textanalysis-tools CLI",
      codeRepository:"https://github.com/Tovt46/textanalysis.tools",
      programmingLanguage:"TypeScript",
      runtimePlatform:"Node.js 22.13 or newer",
      version:cliPackage.version,
      license:"https://opensource.org/license/mit",
      url:"https://www.npmjs.com/package/textanalysis-tools",
    },
  ],
};

const install=`npm install --global textanalysis-tools
textanalysis --help`;
const noInstall=`npx --yes textanalysis-tools frequency article.txt`;
const examples=`textanalysis frequency article.txt
cat article.txt | textanalysis density --keywords "text analysis,SEO" --format json
textanalysis ngram https://example.com/article --size 3 --format csv
textanalysis compare original.txt revision.txt --format json
textanalysis tfidf draft.txt competitor.txt reference.txt --output tfidf.json --format json
textanalysis similarity draft.txt competitor.txt --method tfidf`;
const inlineExamples=`textanalysis frequency --text "alpha beta alpha"
textanalysis bow --url https://example.com/article
textanalysis compare --text-a "old draft text" --text-b "new draft text"
textanalysis similarity --url-a https://example.com/a --url-b https://example.com/b --method bow`;
const options=`--language auto|en|ru|uk
--format table|json|csv
--output <file>
--top <number>
--keep-stopwords
--stopwords <file>`;

export default function CliDocumentationPage(){
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="api" languagePaths={languagePaths(path)}/>
    <article>
      <div className="article-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>CLI documentation</span></nav>
        <p className="eyebrow">NPM CLI · LOCAL-FIRST · MIT</p>
        <h1>Text Analysis from the Command Line</h1>
        <p className="article-deck">Run the same eight analysis workflows against UTF-8 files, inline text, piped stdin, or public URLs. Local files and stdin stay on your machine; results can be printed as tables or saved as JSON and CSV.</p>
        <p className="article-meta">Package textanalysis-tools · Version {cliPackage.version} · Node.js 22.13+</p>
        <div className="article-actions"><a className="primary-article-cta" href="https://www.npmjs.com/package/textanalysis-tools" rel="noreferrer">Open the npm package</a><a href="#install">Install and run ↓</a></div>
      </div>
      <div className="article-layout">
        <aside className="article-toc" aria-label="On this page">
          <b>On this page</b>
          <a href="#install">Install</a>
          <a href="#commands">Eight commands</a>
          <a href="#inputs">Input types</a>
          <a href="#examples">Examples</a>
          <a href="#options">Common options</a>
          <a href="#outputs">Output and exit codes</a>
          <a href="#privacy">Privacy and URL behavior</a>
          <a href="#api">CLI versus API</a>
        </aside>
        <div className="article-body api-docs-body">
          <section id="install">
            <p className="section-number">01</p>
            <h2>Install the npm Package</h2>
            <p>Install globally when you want the <code>textanalysis</code> executable available in your shell:</p>
            <pre className="api-code"><code>{install}</code></pre>
            <p>To run one command without a global installation, use npx:</p>
            <pre className="api-code"><code>{noInstall}</code></pre>
            <div className="article-callout"><b>Runtime requirement</b><p>The published package requires Node.js 22.13 or newer. Check your runtime with <code>node --version</code>.</p></div>
          </section>
          <section id="commands">
            <p className="section-number">02</p>
            <h2>Eight Focused Text Analysis Commands</h2>
            <div className="cli-command-grid">
              <div><code>analyze</code><p>Bag of Words, focus phrases, and Zipf distribution diagnostics.</p><Link href="/tools/bag-of-words-analyzer">Web tool →</Link></div>
              <div><code>frequency</code><p>Complete word-frequency table with counts and normalized rates.</p><Link href="/tools/word-frequency-counter">Web tool →</Link></div>
              <div><code>density</code><p>Unigram, bigram, trigram, and exact tracked-phrase density.</p><Link href="/tools/keyword-density-checker">Web tool →</Link></div>
              <div><code>compare</code><p>Normalized word, bigram, metric, and Zipf changes between A and B.</p><Link href="/tools/text-analysis-comparison">Web tool →</Link></div>
              <div><code>ngram</code><p>Phrase windows from one to ten tokens with count filtering.</p><Link href="/tools/ngram-analyzer">Web tool →</Link></div>
              <div><code>bow</code><p>Complete Bag of Words vector for downstream processing.</p><Link href="/tools/bag-of-words-generator">Web tool →</Link></div>
              <div><code>tfidf</code><p>TF-IDF vectors and global IDF table across 2–10 documents.</p><Link href="/tools/tf-idf-calculator">Web tool →</Link></div>
              <div><code>similarity</code><p>BoW or TF-IDF cosine similarity with contribution terms.</p><Link href="/tools/text-similarity-calculator">Web tool →</Link></div>
            </div>
          </section>
          <section id="inputs">
            <p className="section-number">03</p>
            <h2>Use Files, URLs, Inline Text, or stdin</h2>
            <p>A positional input can be a UTF-8 local file, a public HTTP(S) URL, or <code>-</code> for stdin. Single-input commands also accept <code>--text</code> and <code>--url</code>. Pair commands accept two positionals or the <code>--text-a</code>, <code>--url-a</code>, <code>--text-b</code>, and <code>--url-b</code> options.</p>
            <pre className="api-code"><code>{inlineExamples}</code></pre>
            <p>The <code>tfidf</code> command accepts 2–10 positional inputs. They can be files and public URLs in the same corpus. stdin can be consumed once per process.</p>
          </section>
          <section id="examples">
            <p className="section-number">04</p>
            <h2>Copy-and-Paste CLI Examples</h2>
            <pre className="api-code"><code>{examples}</code></pre>
            <p>Use shell quoting around inline text, focus phrases, and tracked keywords. A custom output file is written only after the operation completes successfully.</p>
          </section>
          <section id="options">
            <p className="section-number">05</p>
            <h2>Common Options</h2>
            <pre className="api-code"><code>{options}</code></pre>
            <div className="api-fields">
              <div><b>--language</b><span>auto · en · ru · uk</span><p>Controls language detection and the default stop-word list.</p></div>
              <div><b>--format</b><span>table · json · csv</span><p>Selects terminal-friendly output or a machine-readable serialization.</p></div>
              <div><b>--top</b><span>integer</span><p>Limits result rows. Command-specific minimum and maximum values are validated.</p></div>
              <div><b>--keep-stopwords</b><span>boolean flag</span><p>Includes the default function words in analysis.</p></div>
              <div><b>--stopwords</b><span>UTF-8 file</span><p>Replaces the selected language list with a custom newline- or comma-separated list.</p></div>
              <div><b>--output</b><span>file path</span><p>Saves the selected format instead of writing the result to stdout.</p></div>
            </div>
            <p>Command-specific options include <code>--focus</code>, <code>--tolerance</code>, <code>--keywords</code>, <code>--min-count</code>, <code>--size</code>, and <code>--method bow|tfidf</code>. Run <code>textanalysis --help</code> for the complete contract.</p>
          </section>
          <section id="outputs">
            <p className="section-number">06</p>
            <h2>Output Formats and Exit Codes</h2>
            <p>Table output is optimized for interactive terminal review. JSON includes the command, package version, generation time, input labels, local-storage declaration, settings, and complete operation payload. CSV uses explicit table labels when one operation returns several result sets.</p>
            <div className="feature-list">
              <div><h3>Exit 0</h3><p>The operation completed successfully, help/version was printed, or a downstream pipe closed normally.</p></div>
              <div><h3>Exit 2</h3><p>The command, option, input count, or option value failed usage validation.</p></div>
              <div><h3>Exit 1</h3><p>An operational error occurred while reading, fetching, analyzing, or writing data.</p></div>
              <div><h3>stderr</h3><p>Error messages go to stderr, leaving stdout available for JSON, CSV, and shell pipelines.</p></div>
            </div>
          </section>
          <section id="privacy">
            <p className="section-number">07</p>
            <h2>Local-First Privacy and Public URL Inputs</h2>
            <p>Inline text, local files, and stdin are analyzed inside the CLI process and are not sent to textanalysis.tools. When a command receives a public URL, the CLI downloads that page directly, removes non-content markup, and analyzes the extracted text locally.</p>
            <p>Only public HTTP and HTTPS URLs are accepted. Private and local-network destinations are rejected. Follow the source site&apos;s terms, access rules, and applicable data requirements when processing remote content.</p>
          </section>
          <section id="api">
            <p className="section-number">08</p>
            <h2>Choose CLI for Local Workflows and API for Applications</h2>
            <p>The CLI is suitable for files, shell pipelines, scheduled local jobs, and analysis that should remain on one machine. The public API is suitable when a web application or agent needs structured HTTP responses, OpenAPI discovery, and CORS.</p>
            <div className="article-callout subtle"><b>Same analysis primitives</b><p>The CLI and versioned API share the project&apos;s analysis implementation, but their transport, limits, and input handling are documented separately.</p></div>
            <p>Read the <Link href="/api-docs">API documentation</Link> or import the <a href="/openapi.json">OpenAPI specification</a> when HTTP integration is the better fit.</p>
          </section>
          <section className="article-sources">
            <h2>Package and source</h2>
            <ul>
              <li><a href="https://www.npmjs.com/package/textanalysis-tools" rel="noreferrer">textanalysis-tools on npm</a></li>
              <li><a href="https://github.com/Tovt46/textanalysis.tools/tree/main/packages/cli" rel="noreferrer">CLI source on GitHub</a></li>
              <li><a href="https://github.com/Tovt46/textanalysis.tools/blob/main/packages/cli/LICENSE" rel="noreferrer">MIT license</a></li>
            </ul>
          </section>
          <section className="article-final-cta">
            <p className="eyebrow">VERSION {cliPackage.version} · EIGHT COMMANDS</p>
            <h2>Run one analysis without installing anything</h2>
            <p>Use npx with a local file, public URL, inline string, or piped text.</p>
            <a href="https://www.npmjs.com/package/textanalysis-tools" rel="noreferrer">Open the npm package <span>→</span></a>
          </section>
        </div>
      </div>
    </article>
    <SiteFooter locale="en"/>
  </main>;
}
