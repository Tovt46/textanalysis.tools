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
import {limitIdfRows} from "../app/lib/api-result-limits";
import {createCompoundFetchContext} from "../app/lib/api-request-budget";
import {
  compareResults,
  normalizeAnalyzeBody,
  PublicApiError,
  runComparisonAnalysis,
  runPublicAnalysis,
} from "../app/lib/public-api";

const languageSchema=z.enum(["auto","en","ru","uk","es"]).default("auto");
const resultLanguageSchema=z.enum(["en","ru","uk","es"]);
const sourceSchema=z.object({
  source:z.string().min(1).max(500_000).describe("UTF-8 text, HTML, or a public HTTP(S) URL."),
  sourceType:z.enum(["text","url"]).default("text").describe("Use url only when source is a public HTTP(S) URL."),
  language:languageSchema,
  keepStopwords:z.boolean().default(false),
});
const topSchema=z.number().int().min(1).max(100).default(50);
const analysisTopSchema=z.number().int().min(5).max(100).default(20);
const nonNegativeIntegerSchema=z.number().int().nonnegative();
const positiveIntegerSchema=z.number().int().positive();
const resultOffsetSchema=z.number().int().min(0).max(250_000).default(0);

const frequencyRowSchema=z.object({
  term:z.string(),
  count:nonNegativeIntegerSchema,
  percentage:z.number(),
  per1000:z.number(),
});
const bagOfWordsRowSchema=frequencyRowSchema.extend({frequency:z.number()});
const densityRowSchema=frequencyRowSchema.extend({n:nonNegativeIntegerSchema});
const analysisRowSchema=z.object({
  rank:positiveIntegerSchema,
  term:z.string(),
  actualCount:nonNegativeIntegerSchema,
  expectedCount:z.number(),
  ratio:z.number(),
  zone:z.enum(["above","within","below","sparse-tail"]),
  share:z.number(),
  percentage:z.number(),
  per1000:z.number(),
});
const analysisResultSchema=z.object({
  language:resultLanguageSchema,
  tokenCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  fittedExponent:z.number(),
  rSquared:z.number(),
  zoneCounts:z.object({
    above:nonNegativeIntegerSchema,
    within:nonNegativeIntegerSchema,
    below:nonNegativeIntegerSchema,
    sparseTail:nonNegativeIntegerSchema,
  }),
  rows:z.array(analysisRowSchema),
  bigrams:z.array(z.object({
    term:z.string(),
    count:nonNegativeIntegerSchema,
    share:z.number(),
    percentage:z.number(),
    per1000:z.number(),
  })),
  focusCoverage:z.array(z.object({
    term:z.string(),
    count:nonNegativeIntegerSchema,
    per1000:z.number(),
    percentage:z.number(),
  })),
  stopwordCount:nonNegativeIntegerSchema,
  notes:z.array(z.string()),
});
const wordFrequencyResultSchema=z.object({
  language:resultLanguageSchema,
  tokenCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  stopwordCount:nonNegativeIntegerSchema,
  rows:z.array(frequencyRowSchema),
  returnedRows:nonNegativeIntegerSchema,
  totalRows:nonNegativeIntegerSchema,
  truncated:z.boolean(),
});
const keywordDensityResultSchema=z.object({
  language:resultLanguageSchema,
  wordCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  stopwordCount:nonNegativeIntegerSchema,
  keepStopwords:z.boolean(),
  trackedKeywords:z.array(densityRowSchema),
  unigrams:z.array(densityRowSchema),
  bigrams:z.array(densityRowSchema),
  trigrams:z.array(densityRowSchema),
  returnedRows:z.object({
    trackedKeywords:nonNegativeIntegerSchema,
    unigrams:nonNegativeIntegerSchema,
    bigrams:nonNegativeIntegerSchema,
    trigrams:nonNegativeIntegerSchema,
  }),
  totalRows:z.object({
    trackedKeywords:nonNegativeIntegerSchema,
    unigrams:nonNegativeIntegerSchema,
    bigrams:nonNegativeIntegerSchema,
    trigrams:nonNegativeIntegerSchema,
  }),
  truncated:z.boolean(),
});
const ngramResultSchema=z.object({
  language:resultLanguageSchema,
  tokenCount:nonNegativeIntegerSchema,
  ngramCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  stopwordCount:nonNegativeIntegerSchema,
  keepStopwords:z.boolean(),
  n:positiveIntegerSchema,
  rows:z.array(frequencyRowSchema),
  returnedRows:nonNegativeIntegerSchema,
  totalRows:nonNegativeIntegerSchema,
  truncated:z.boolean(),
});
const bagOfWordsResultSchema=z.object({
  language:resultLanguageSchema,
  tokenCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  stopwordCount:nonNegativeIntegerSchema,
  rows:z.array(bagOfWordsRowSchema),
  returnedRows:nonNegativeIntegerSchema,
  totalRows:nonNegativeIntegerSchema,
  truncated:z.boolean(),
});
const comparisonMetricSchema=z.object({a:z.number(),b:z.number(),delta:z.number()});
const comparisonChangeSchema=z.object({
  term:z.string(),
  countA:nonNegativeIntegerSchema,
  countB:nonNegativeIntegerSchema,
  countDelta:z.number().int(),
  shareA:z.number(),
  shareB:z.number(),
  shareDelta:z.number(),
});
const comparisonResultSchema=z.object({
  metrics:z.object({
    tokenCount:comparisonMetricSchema,
    vocabularySize:comparisonMetricSchema,
    fittedExponent:comparisonMetricSchema,
    rSquared:comparisonMetricSchema,
    aboveModel:comparisonMetricSchema,
  }),
  wordChanges:z.array(comparisonChangeSchema),
  bigramChanges:z.array(comparisonChangeSchema),
  totalRows:z.object({wordChanges:nonNegativeIntegerSchema,bigramChanges:nonNegativeIntegerSchema}),
  returnedRows:z.object({wordChanges:nonNegativeIntegerSchema,bigramChanges:nonNegativeIntegerSchema}),
  offset:nonNegativeIntegerSchema,
  nextOffset:nonNegativeIntegerSchema.nullable(),
  hasMore:z.boolean(),
  truncated:z.boolean(),
});
const compareTextsResultSchema=z.object({
  resultA:analysisResultSchema,
  resultB:analysisResultSchema,
  comparison:comparisonResultSchema,
});
const tfIdfRowSchema=z.object({
  term:z.string(),
  count:nonNegativeIntegerSchema,
  tf:z.number(),
  idf:z.number(),
  tfidf:z.number(),
  percentage:z.number(),
  per1000:z.number(),
});
const tfIdfDocumentSchema=z.object({
  language:resultLanguageSchema,
  tokenCount:nonNegativeIntegerSchema,
  vocabularySize:nonNegativeIntegerSchema,
  stopwordCount:nonNegativeIntegerSchema,
  rows:z.array(tfIdfRowSchema),
  vectorNorm:z.number().optional(),
});
const idfRowSchema=z.object({term:z.string(),documentFrequency:positiveIntegerSchema,idf:z.number()});
const idfPaginationSchema={
  totalIdfRows:nonNegativeIntegerSchema,
  returnedIdfRows:z.number().int().min(0).max(100),
  idfOffset:z.number().int().min(0).max(250_000),
  nextIdfOffset:z.number().int().min(0).max(250_000).nullable(),
  hasMoreIdfRows:z.boolean(),
  idfTableTruncated:z.boolean(),
};
const tfIdfResultSchema=z.object({
  language:z.enum(["auto","en","ru","uk","es"]),
  documentCount:z.number().int().min(2).max(10),
  top:positiveIntegerSchema,
  totalVocabularySize:nonNegativeIntegerSchema,
  averageDocumentFrequency:z.number(),
  documents:z.array(tfIdfDocumentSchema),
  idfTable:z.array(idfRowSchema).max(100),
  ...idfPaginationSchema,
});
const similarityTermSchema=bagOfWordsRowSchema.extend({
  weightA:z.number(),
  weightB:z.number(),
  contribution:z.number(),
});
const textSimilarityResultSchema=z.object({
  language:z.enum(["auto","en","ru","uk","es"]),
  method:z.enum(["bow","tfidf"]),
  tokenCounts:z.object({a:nonNegativeIntegerSchema,b:nonNegativeIntegerSchema}),
  top:positiveIntegerSchema,
  cosine:z.number(),
  dotProduct:z.number(),
  normA:z.number(),
  normB:z.number(),
  overlapTerms:nonNegativeIntegerSchema,
  topTerms:z.array(similarityTermSchema),
  documents:z.array(tfIdfDocumentSchema).optional(),
  idfTable:z.array(idfRowSchema).max(100).optional(),
  totalIdfRows:idfPaginationSchema.totalIdfRows.optional(),
  returnedIdfRows:idfPaginationSchema.returnedIdfRows.optional(),
  idfOffset:idfPaginationSchema.idfOffset.optional(),
  nextIdfOffset:idfPaginationSchema.nextIdfOffset.optional(),
  hasMoreIdfRows:idfPaginationSchema.hasMoreIdfRows.optional(),
  idfTableTruncated:idfPaginationSchema.idfTableTruncated.optional(),
});

const toolErrorSchema=z.object({
  code:z.string(),
  status:z.number().int().min(400).max(599),
  category:z.enum(["validation","network","resource_limit","rate_limit","analysis","internal"]),
  retryable:z.boolean(),
  message:z.string(),
  retryAfter:z.number().int().positive().optional(),
});

const INVALID_TOOL_INPUT={"textanalysis.tools/invalidInput":true} as const;

function structuredInput<Shape extends z.ZodRawShape>(schema:z.ZodObject<Shape>){
  const requiredFields=Object.entries(schema.shape)
    .filter(([,field])=>!(field as z.ZodType).safeParse(undefined).success)
    .map(([key])=>key);
  const guardedShape=Object.fromEntries(Object.entries(schema.shape).map(([key,field])=>{
    const inputField=field as z.ZodType;
    const contract=z.toJSONSchema(inputField) as Record<string,unknown>;
    return [key,inputField.catch(INVALID_TOOL_INPUT as never).meta({default:contract.default})];
  })) as unknown as Shape;
  return z.object(guardedShape).meta({required:requiredFields});
}

function invalidToolInput(value:unknown):value is typeof INVALID_TOOL_INPUT{
  if(!value||typeof value!=="object")return false;
  if((value as Record<string,unknown>)["textanalysis.tools/invalidInput"]===true)return true;
  return Object.values(value).some(invalidToolInput);
}

function outputSchema<T extends z.ZodType>(result:T){
  return z.object({
    storage:z.literal("local"),
    outcome:z.discriminatedUnion("ok",[
      z.object({ok:z.literal(true),result}),
      z.object({ok:z.literal(false),error:toolErrorSchema}),
    ]),
  });
}

const readOnlyNetworkAnnotations={
  readOnlyHint:true,
  destructiveHint:false,
  idempotentHint:true,
  openWorldHint:true,
};
const conditionalNetworkMeta={
  "textanalysis.tools/networkBehavior":{
    access:"conditional",
    trigger:"A sourceType field is set to url.",
    destination:"Only the user-supplied public HTTP(S) URL and its bounded redirects.",
    localTextBehavior:"Text inputs are processed inside the local MCP process without contacting textanalysis.tools.",
  },
};

type ToolError=z.infer<typeof toolErrorSchema>;

function success<T>(result:T){
  const structuredContent={storage:"local" as const,outcome:{ok:true as const,result}};
  return {
    content:[{type:"text" as const,text:"Analysis complete. The typed result is available in structuredContent.outcome.result."}],
    structuredContent,
  };
}

const networkErrorCodes=new Set(["FETCH_FAILED","TOO_MANY_REDIRECTS","UNSUPPORTED_REMOTE_TYPE"]);

function structuredError(error:unknown):ToolError{
  if(error instanceof PublicApiError){
    let category:ToolError["category"]="analysis";
    if(error.status===429)category="rate_limit";
    else if(error.status===413)category="resource_limit";
    else if(networkErrorCodes.has(error.code))category="network";
    else if(error.status===400||error.status===415)category="validation";
    else if(error.status>=500)category="internal";
    return {
      code:error.code,
      status:error.status,
      category,
      retryable:error.status===429||error.status>=500||error.code==="FETCH_FAILED",
      message:error.message,
      ...(error.retryAfter?{retryAfter:error.retryAfter}:{}),
    };
  }
  return {
    code:"INTERNAL_ERROR",
    status:500,
    category:"internal",
    retryable:false,
    message:error instanceof Error?error.message:String(error),
  };
}

function failure(detail:ToolError){
  const structuredContent={storage:"local" as const,outcome:{ok:false as const,error:detail}};
  return {
    isError:true,
    content:[{type:"text" as const,text:`Text analysis failed [${detail.code}]: ${detail.message}`}],
    structuredContent,
  };
}

async function safely(run:()=>unknown|Promise<unknown>,args?:unknown){
  if(invalidToolInput(args)){
    return failure({
      code:"INVALID_ARGUMENT",
      status:400,
      category:"validation",
      retryable:false,
      message:"Tool arguments do not match the declared input schema.",
    });
  }
  try{
    return success(await run());
  }catch(error){
    return failure(structuredError(error));
  }
}

function safeHandler<Args>(run:(args:Args)=>unknown|Promise<unknown>){
  return (args:Args)=>safely(()=>run(args),args);
}

function trimRows<T extends {rows:unknown[]}>(result:T,top:number){
  const rows=result.rows.slice(0,top);
  return {
    ...result,
    rows,
    returnedRows:rows.length,
    totalRows:result.rows.length,
    truncated:rows.length<result.rows.length,
  };
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
    inputSchema:structuredInput(sourceSchema.extend({
      focus:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:analysisTopSchema,
      tolerance:z.number().min(1.2).max(4).default(2),
    })),
    outputSchema:outputSchema(analysisResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async(args)=>runPublicAnalysis({...args,focus:args.focus})));

  server.registerTool("word_frequency",{
    title:"Count word frequency",
    description:"Return deterministic word counts, percentages, and occurrences per 1,000 words.",
    inputSchema:structuredInput(sourceSchema.extend({top:topSchema})),
    outputSchema:outputSchema(wordFrequencyResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({top,...source})=>trimRows(analyzeWordFrequency(await normalized(source)),top)));

  server.registerTool("keyword_density",{
    title:"Measure keyword density",
    description:"Return unigram, bigram, trigram, and exact tracked-phrase density without treating density as a ranking score.",
    inputSchema:structuredInput(sourceSchema.extend({
      trackedKeywords:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:topSchema,
    })),
    outputSchema:outputSchema(keywordDensityResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({trackedKeywords,top,...source})=>{
    const result=analyzeKeywordDensity(await normalized(source),trackedKeywords);
    const tracked=result.trackedKeywords.slice(0,top);
    const unigrams=result.unigrams.slice(0,top);
    const bigrams=result.bigrams.slice(0,top);
    const trigrams=result.trigrams.slice(0,top);
    const totalRows={
      trackedKeywords:result.trackedKeywords.length,
      unigrams:result.unigrams.length,
      bigrams:result.bigrams.length,
      trigrams:result.trigrams.length,
    };
    const returnedRows={
      trackedKeywords:tracked.length,
      unigrams:unigrams.length,
      bigrams:bigrams.length,
      trigrams:trigrams.length,
    };
    return {
      ...result,
      trackedKeywords:tracked,
      unigrams,
      bigrams,
      trigrams,
      returnedRows,
      totalRows,
      truncated:Object.keys(totalRows).some(key=>returnedRows[key as keyof typeof returnedRows]<totalRows[key as keyof typeof totalRows]),
    };
  }));

  server.registerTool("ngram_analysis",{
    title:"Analyze n-grams",
    description:"Count recurring phrases from one to ten tokens with normalized rates.",
    inputSchema:structuredInput(sourceSchema.extend({
      ngramSize:z.number().int().min(1).max(10).default(2),
      top:topSchema,
    })),
    outputSchema:outputSchema(ngramResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({ngramSize,top,...source})=>trimRows(analyzeNgram(await normalized(source),ngramSize),top)));

  server.registerTool("bag_of_words",{
    title:"Build a Bag of Words vector",
    description:"Build a transparent term-frequency vector with counts and normalized frequencies.",
    inputSchema:structuredInput(sourceSchema.extend({top:topSchema})),
    outputSchema:outputSchema(bagOfWordsResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({top,...source})=>trimRows(analyzeBagOfWords(await normalized(source)),top)));

  server.registerTool("compare_texts",{
    title:"Compare two texts",
    description:"Compare two texts or public URLs by normalized word and bigram frequency plus Zipf diagnostics.",
    inputSchema:structuredInput(z.object({
      a:sourceSchema,
      b:sourceSchema,
      focus:z.array(z.string().min(1).max(200)).max(100).default([]),
      top:analysisTopSchema,
      tolerance:z.number().min(1.2).max(4).default(2),
      offset:resultOffsetSchema.describe("Zero-based comparison-table offset. Follow nextOffset until null."),
    })),
    outputSchema:outputSchema(compareTextsResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({a,b,focus,top,tolerance,offset})=>{
    const analysisOptions={focus,top,tolerance};
    const [analysisA,analysisB]=await Promise.all([
      runComparisonAnalysis({...a,...analysisOptions}),
      runComparisonAnalysis({...b,...analysisOptions}),
    ]);
    const comparison=compareResults(analysisA,analysisB,top,offset);
    return {
      resultA:analysisA.result,
      resultB:analysisB.result,
      comparison,
    };
  }));

  server.registerTool("tfidf",{
    title:"Calculate TF-IDF",
    description:"Calculate TF-IDF weights across a corpus of two to ten documents.",
    inputSchema:structuredInput(z.object({
      documents:z.array(sourceSchema).min(2).max(10),
      top:topSchema,
      offset:resultOffsetSchema.describe("Zero-based IDF table offset. Follow nextIdfOffset until null."),
    })),
    outputSchema:outputSchema(tfIdfResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({documents,top,offset})=>{
    const context=createCompoundFetchContext(documents);
    const analyzed=await Promise.all(documents.map(async document=>analyzeBagOfWords(await normalizeAnalyzeBody(document,context))));
    const calculated=calculateTfIdfCorpus(analyzed,top);
    return limitIdfRows({
      language:analyzed.every(document=>document.language===analyzed[0].language)?analyzed[0].language:"auto",
      documentCount:analyzed.length,
      top,
      totalVocabularySize:calculated.totalVocabularySize,
      averageDocumentFrequency:calculated.averageDocumentFrequency,
      documents:calculated.documents,
      idfTable:calculated.idfTable,
    },top,offset);
  }));

  server.registerTool("text_similarity",{
    title:"Measure text similarity",
    description:"Measure cosine similarity between two texts using Bag of Words or TF-IDF and return contributing terms.",
    inputSchema:structuredInput(z.object({
      a:sourceSchema,
      b:sourceSchema,
      method:z.enum(["bow","tfidf"]).default("tfidf"),
      top:topSchema,
      offset:resultOffsetSchema.describe("Zero-based IDF table offset for TF-IDF mode."),
    })),
    outputSchema:outputSchema(textSimilarityResultSchema),
    annotations:readOnlyNetworkAnnotations,
    _meta:conditionalNetworkMeta,
  },safeHandler(async({a,b,method,top,offset})=>{
    const [documentA,documentB]=await Promise.all([
      normalized(a).then(analyzeBagOfWords),
      normalized(b).then(analyzeBagOfWords),
    ]);
    const result=calculateTextSimilarity(documentA,documentB,method,top);
    return result.idfTable?limitIdfRows(result as typeof result&{idfTable:NonNullable<typeof result.idfTable>},top,offset):result;
  }));

  return server;
}

export async function startMcpServer(version:string){
  const server=createMcpServer(version);
  await server.connect(new StdioServerTransport());
  console.error(`textanalysis MCP ${version} running on stdio`);
}
