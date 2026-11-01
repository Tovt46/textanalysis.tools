import {SiteHeader,SiteFooter} from "../../SiteChrome";
import type {Metadata} from "next";
import {SITE_URL} from "../../seo-metadata";
export const metadata:Metadata={metadataBase:new URL(SITE_URL),title:'Contact Text Analysis Tools',alternates:{canonical:"/contact"}};
export const revalidate=300;
export default function Page(){return <main className="article-page"><SiteHeader locale="en" active="home"/><article className="article-body"><h1>Contact Text Analysis Tools</h1><p>For questions, feedback, and privacy requests, email <a href="mailto:alextovt2@gmail.com">alextovt2@gmail.com</a>.</p><p>For reproducible bugs and feature requests, use the <a href="https://github.com/Tovt46/textanalysis.tools/issues">GitHub issue tracker</a>. Public issues are visible to everyone; remove private text and credentials before posting.</p><p><a href="/privacy">Privacy and data handling</a></p></article><SiteFooter locale="en"/></main>;}
