import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  analyzeNgram,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
} from "../app/lib/analyze";
import {
  compareResults,
  normalizeAnalyzeBody,
  runComparisonAnalysis,
  runPublicAnalysis,
} from "../app/lib/public-api";

const languageSchema=z.enum(["auto","en","ru","uk","es"]).default("auto");
const sourceSchema=z.object({
  source:z.string().min(1).max(500_000).describe("UTF-8 text, HTML, or a public HTTP(S) URL."),
  sourceType:z.enum(["text","url"]).default("text").describe("Use url only when source is a public HTTP(S) URL."),
  language:languageSchema,
  keepStopwords:z.boolean().default(false),
});
const topSchema=z.number().int().min(1).max(100).default(50);
const analysisTopSchema=z.number().int().min(5).max(100).default(20);
const outputSchema=z.object({
  storage:z.literal("local"),
  result:z.unknown(),
});
const readOnlyAnnotations={
  readOnlyHint:true,
  destructiveHint:false,
  idempotentHint:true,
  openWorldHint:false,
};

type ToolSuccess={storage:"local";result:unknown};

function success(result:unknown){
  const structuredContent:ToolSuccess={storage:"local",result};
  return {
    content:[{type:"text" as const,text:JSON.stringify(structuredContent)}],
    structuredContent,
  };
}

async function safely(run:()=>unknown|Promise<unknown>){
  try{
    return success(await run());
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    return {
      isError:true,
      content:[{type:"text" as const,text:`Text analysis failed: ${message}`}],
    };
  }
}

function trimRows<T extends {rows:unknown[]}>(result:T,top:number){
  return {...result,rows:result.rows.slice(0,top),returnedRows:Math.min(result.rows.length,top)};
}

async function normalized(source:z.infer<typeof sourceSchema>){
  return normalizeAnalyzeBody(source);
}

export function createMcpServer(version:string){
  const server=new McpServer(
    {name:"textanalysis-tools",version},
    {
      instructions:"Eight deterministic, read-only text analysis tools. Prefer a focused tool over analyze_text when the user asks for one metric. Text input is processed locally. URL input requires a network request to that public page.",
    },
  );

  server.registerTool("analyze_text",{
    title:"Analyze text",
    description:"Inspect word and bigram frequency, tracked phrase coverage, and Zipf-distribution diagnostics for text or a public URL.",
    inputSchema:sourceSchema.extend({
      focus:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:analysisTopSchema,
      tolerance:z.number().min(1.2).max(4).default(2),
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async(args)=>safely(async()=>{
    return runPublicAnalysis({...args,focus:args.focus});
  }));

  server.registerTool("word_frequency",{
    title:"Count word frequency",
    description:"Return deterministic word counts, percentages, and occurrences per 1,000 words.",
    inputSchema:sourceSchema.extend({top:topSchema}),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({top,...source})=>safely(async()=>{
    return trimRows(analyzeWordFrequency(await normalized(source)),top);
  }));

  server.registerTool("keyword_density",{
    title:"Measure keyword density",
    description:"Return unigram, bigram, trigram, and exact tracked-phrase density without treating density as a ranking score.",
    inputSchema:sourceSchema.extend({
      trackedKeywords:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:topSchema,
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({trackedKeywords,top,...source})=>safely(async()=>{
    const result=analyzeKeywordDensity(await normalized(source),trackedKeywords.join("\n"));
    return {
      ...result,
      trackedKeywords:result.trackedKeywords.slice(0,top),
      unigrams:result.unigrams.slice(0,top),
      bigrams:result.bigrams.slice(0,top),
      trigrams:result.trigrams.slice(0,top),
    };
  }));

  server.registerTool("ngram_analysis",{
    title:"Analyze n-grams",
    description:"Count recurring phrases from one to ten tokens with normalized rates.",
    inputSchema:sourceSchema.extend({
      ngramSize:z.number().int().min(1).max(10).default(2),
      top:topSchema,
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({ngramSize,top,...source})=>safely(async()=>{
    return trimRows(analyzeNgram(await normalized(source),ngramSize),top);
  }));

  server.registerTool("bag_of_words",{
    title:"Build a Bag of Words vector",
    description:"Build a transparent term-frequency vector with counts and normalized frequencies.",
    inputSchema:sourceSchema.extend({top:topSchema}),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({top,...source})=>safely(async()=>{
    return trimRows(analyzeBagOfWords(await normalized(source)),top);
  }));

  server.registerTool("compare_texts",{
    title:"Compare two texts",
    description:"Compare two texts or public URLs by normalized word and bigram frequency plus Zipf diagnostics.",
    inputSchema:z.object({
      a:sourceSchema,
      b:sourceSchema,
      focus:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:analysisTopSchema,
      tolerance:z.number().min(1.2).max(4).default(2),
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({a,b,focus,top,tolerance})=>safely(async()=>{
    const analysisOptions={focus,top,tolerance};
    const [analysisA,analysisB]=await Promise.all([
      runComparisonAnalysis({...a,...analysisOptions}),
      runComparisonAnalysis({...b,...analysisOptions}),
    ]);
    const comparison=compareResults(analysisA,analysisB);
    return {
      resultA:analysisA.result,
      resultB:analysisB.result,
      comparison:{
        ...comparison,
        wordChanges:comparison.wordChanges.slice(0,top),
        bigramChanges:comparison.bigramChanges.slice(0,top),
      },
    };
  }));

  server.registerTool("tfidf",{
    title:"Calculate TF-IDF",
    description:"Calculate TF-IDF weights across a corpus of two to ten documents.",
    inputSchema:z.object({
      documents:z.array(sourceSchema).min(2).max(10),
      top:topSchema,
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({documents,top})=>safely(async()=>{
    const analyzed=await Promise.all(documents.map(async document=>analyzeBagOfWords(await normalized(document))));
    const calculated=calculateTfIdfCorpus(analyzed,top);
    return {
      language:analyzed.every(document=>document.language===analyzed[0].language)?analyzed[0].language:"auto",
      documentCount:analyzed.length,
      top,
      totalVocabularySize:calculated.totalVocabularySize,
      averageDocumentFrequency:calculated.averageDocumentFrequency,
      documents:calculated.documents,
      idfTable:calculated.idfTable,
    };
  }));

  server.registerTool("text_similarity",{
    title:"Measure text similarity",
    description:"Measure cosine similarity between two texts using Bag of Words or TF-IDF and return contributing terms.",
    inputSchema:z.object({
      a:sourceSchema,
      b:sourceSchema,
      method:z.enum(["bow","tfidf"]).default("tfidf"),
      top:topSchema,
    }),
    outputSchema,
    annotations:readOnlyAnnotations,
  },async({a,b,method,top})=>safely(async()=>{
    const [documentA,documentB]=await Promise.all([
      normalized(a).then(analyzeBagOfWords),
      normalized(b).then(analyzeBagOfWords),
    ]);
    return calculateTextSimilarity(documentA,documentB,method,top);
  }));

  return server;
}

export async function startMcpServer(version:string){
  const server=createMcpServer(version);
  await server.connect(new StdioServerTransport());
  console.error(`textanalysis MCP ${version} running on stdio`);
}
