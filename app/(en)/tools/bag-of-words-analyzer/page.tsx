import type { Metadata } from "next";
import BowApp from "../../../BowApp";
import { bowMetadata,toolWebApplicationSchema } from "../../../seo-metadata";

export const metadata:Metadata=bowMetadata("en");

const schema=toolWebApplicationSchema({
  name:"Bag of Words Analyzer",
  description:"Analyze word and bigram frequency, tracked phrases, and Zipf distribution, then compare two text results.",
  path:"/tools/bag-of-words-analyzer",
  featureList:["Word and bigram frequency","Tracked phrase coverage","Zipf distribution diagnostics","Side-by-side text comparison","CSV export"],
});

export default function EnglishBowAnalyzerPage(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><BowApp uiLang="en"/></>;}
