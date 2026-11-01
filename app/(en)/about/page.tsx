import {SiteHeader,SiteFooter} from "../../SiteChrome";
import type {Metadata} from "next";
import {SITE_URL} from "../../seo-metadata";
export const metadata:Metadata={metadataBase:new URL(SITE_URL),title:'About Text Analysis Tools',alternates:{canonical:"/about"}};
export const revalidate=300;
export default function Page(){return <main className="article-page"><SiteHeader locale="en" active="home"/><article className="article-body"><h1>About Text Analysis Tools</h1><p>Text Analysis Tools provides free, transparent word frequency, keyword density, n-gram, Bag of Words, TF-IDF, and similarity analysis for people, developers, and AI agents.</p><p>Use the browser tools, public API, or local CLI and MCP server. Deterministic text analysis measures vocabulary and frequency; it does not verify facts or predict search rankings.</p><p><a href="https://github.com/Tovt46/textanalysis.tools">Source on GitHub</a> · <a href="https://www.npmjs.com/package/textanalysis-tools">npm package</a></p><p><a href="/privacy">Privacy and data handling</a></p></article><SiteFooter locale="en"/></main>;}
