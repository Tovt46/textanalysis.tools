import type { Metadata } from "next";
import Link from "next/link";
import { SITE_ICONS,SITE_NAME,SITE_URL } from "../../seo-metadata";
import { SiteFooter,SiteHeader } from "../../SiteChrome";
import { languageAlternates,languagePaths } from "../../localization";

const path="/guides";
const title="Text Analysis Guides: Formulas, Examples & Limits";
const description="Learn word frequency, keyword density, Bag of Words, N-grams, TF-IDF, cosine similarity, and normalized text comparison with transparent formulas and examples.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),title,description,
  alternates:{canonical:path,languages:languageAlternates(path)},
  openGraph:{type:"website",url:path,siteName:SITE_NAME,title,description,locale:"en_US"},
  twitter:{card:"summary",title,description},
  verification:{google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU"},icons:SITE_ICONS,manifest:"/site.webmanifest",
};

const schema={
  "@context":"https://schema.org","@type":"CollectionPage",
  name:"Text Analysis Guides",description,url:`${SITE_URL}${path}`,inLanguage:"en",
  isPartOf:{"@type":"WebSite",name:SITE_NAME,url:SITE_URL},
};

const guides=[
  ["/how-to-calculate-word-frequency","Word Frequency","How to Calculate Word Frequency","Counts, percentages, rates per 1,000, tokenization choices, and a complete worked example."],
  ["/keyword-density-formula","Keyword Analysis","Keyword Density Formula","Exact phrase calculations, competing denominator conventions, comparison rules, and limitations."],
  ["/bag-of-words-model","NLP Fundamentals","Bag of Words Model","How token counts become sparse document vectors and transparent machine-learning features."],
  ["/bag-of-words-vs-word2vec","Model Comparison","Bag of Words vs Word2Vec","When transparent frequency vectors or learned word embeddings better match the task."],
  ["/what-are-n-grams","Phrase Analysis","What Are N-grams?","Unigrams through longer phrase windows, denominator rules, filtering behavior, and examples."],
  ["/tf-idf-formula","NLP Fundamentals","TF-IDF Formula","Normalized term frequency, smoothed inverse document frequency, corpus effects, and a worked calculation."],
  ["/cosine-similarity-for-text","Document Similarity","Cosine Similarity for Text","How BoW and TF-IDF vectors become an overlap score, with contribution terms and interpretation limits."],
  ["/compare-texts-by-word-frequency","Revision Workflow","Compare Texts by Word Frequency","Measure normalized vocabulary and phrase changes without confusing the result with a character diff."],
] as const;

export default function GuidesPage(){
  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale="en" active="guide" languagePaths={languagePaths(path)}/>
    <section className="tools-directory-hero">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Guides</span></nav>
      <p className="eyebrow">TEXT ANALYSIS KNOWLEDGE BASE</p>
      <h1>Formulas, examples, and honest limits</h1>
      <p>Understand the calculation behind each tool before interpreting its output. Every guide documents a specific method, shows the denominator or vector model, and links back to a working analyzer.</p>
    </section>
    <section className="tools-directory learning-directory guides-directory" aria-labelledby="all-guides">
      <div className="directory-heading"><p className="section-number">EIGHT GUIDES</p><h2 id="all-guides">Choose the method you need to understand</h2><p>Start with counts and phrase windows, then move into vector weighting, similarity, and multi-document comparison.</p></div>
      <div className="learning-grid">{guides.map(([href,label,name,copy])=><Link href={href} key={href}><span>{label}</span><h3>{name}</h3><p>{copy}</p><strong>Read guide →</strong></Link>)}</div>
    </section>
    <section className="tools-directory planned-tools">
      <div className="directory-heading"><p className="section-number">PUT THE METHOD TO WORK</p><h2>Analyze manually or automate the same calculation</h2></div>
      <div className="planned-grid developer-grid"><Link href="/tools"><span>EIGHT WEB TOOLS</span><h3>Interactive tools</h3><p>Paste text, inspect formulas and bounded tables, compare results, and export the returned evidence.</p></Link><Link href="/cli"><span>NPM · LOCAL-FIRST</span><h3>Command-line interface</h3><p>Run the same methods against files, URLs, inline text, or stdin with JSON and CSV output.</p></Link><Link href="/agents"><span>MCP · OPENAPI</span><h3>AI agent integrations</h3><p>Give agents the same deterministic operations through local MCP tools or the public API.</p></Link></div>
    </section>
    <SiteFooter locale="en"/>
  </main>;
}
