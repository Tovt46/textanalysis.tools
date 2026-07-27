import type { Metadata } from "next";
import BowApp from "../../../../BowApp";
import { bowMetadata,toolWebApplicationSchema } from "../../../../seo-metadata";

export const metadata:Metadata=bowMetadata("uk");

const schema=toolWebApplicationSchema({
  name:"Bag of Words-аналізатор",
  description:"Аналіз частотності слів і біграм, контрольних фраз та розподілу Ципфа з порівнянням двох результатів.",
  path:"/uk/tools/bag-of-words-analyzer",
  inLanguage:"uk",
  featureList:["Частотність слів і біграм","Контрольні фрази","Розподіл Ципфа","Порівняння двох текстів","Експорт CSV"],
});

export default function UkrainianBowAnalyzerPage(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><BowApp uiLang="uk"/></>;}
