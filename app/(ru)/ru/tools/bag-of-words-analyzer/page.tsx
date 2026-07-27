import type { Metadata } from "next";
import BowApp from "../../../../BowApp";
import { bowMetadata,toolWebApplicationSchema } from "../../../../seo-metadata";

export const metadata:Metadata=bowMetadata("ru");

const schema=toolWebApplicationSchema({
  name:"Bag of Words-анализатор",
  description:"Анализ частотности слов и биграмм, контрольных фраз и распределения Ципфа со сравнением двух результатов.",
  path:"/ru/tools/bag-of-words-analyzer",
  inLanguage:"ru",
  featureList:["Частотность слов и биграмм","Контрольные фразы","Распределение Ципфа","Сравнение двух текстов","Экспорт CSV"],
});

export default function RussianBowAnalyzerPage(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><BowApp uiLang="ru"/></>;}
