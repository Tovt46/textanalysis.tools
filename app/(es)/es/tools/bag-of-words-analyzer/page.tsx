import type { Metadata } from "next";
import BowApp from "../../../../BowApp";
import { bowMetadata,toolWebApplicationSchema } from "../../../../seo-metadata";

export const metadata:Metadata=bowMetadata("es");

const schema=toolWebApplicationSchema({
  name:"Analizador Bag of Words",
  description:"Analiza frecuencias de palabras y bigramas, frases controladas y distribución de Zipf, y compara dos resultados.",
  path:"/es/tools/bag-of-words-analyzer",
  inLanguage:"es",
  featureList:["Frecuencia de palabras y bigramas","Frases controladas","Distribución de Zipf","Comparación de dos textos","Exportación CSV"],
});

export default function SpanishBowAnalyzerPage(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><BowApp uiLang="es"/></>;}
