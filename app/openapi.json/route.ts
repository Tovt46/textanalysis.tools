import { SITE_URL } from "../seo-metadata";

const sourceSchema={
  type:"object",
  required:["source"],
  properties:{
    sourceType:{type:"string",enum:["text","url"],default:"text",description:"Whether source contains raw text/HTML or a public URL."},
    source:{type:"string",minLength:1,maxLength:500000,description:"Text, HTML, or a public HTTP(S) URL. URL values are limited to 2,048 characters; each resolved source is limited to 100,000 analyzable words."},
    language:{type:"string",enum:["auto","en","ru","uk","es"],default:"auto"},
    focus:{oneOf:[{type:"string",maxLength:20099,description:"Up to 100 comma-separated phrases."},{type:"array",items:{type:"string",minLength:1,maxLength:200},maxItems:100}],description:"Up to 100 non-empty, analyzable phrases whose coverage should be measured. Each phrase is limited to 200 characters."},
    top:{type:"integer",minimum:5,maximum:100,default:20},
    tolerance:{type:"number",minimum:1.2,maximum:4,default:2,description:"Multiplier used for above/below Zipf model zones."},
    keepStopwords:{type:"boolean",default:false},
    stopwordLists:{type:"object",properties:{en:{type:"array",maxItems:1000,items:{type:"string",maxLength:100}},ru:{type:"array",maxItems:1000,items:{type:"string",maxLength:100}},uk:{type:"array",maxItems:1000,items:{type:"string",maxLength:100}},es:{type:"array",maxItems:1000,items:{type:"string",maxLength:100}}}},
  },
  allOf:[{oneOf:[
    {properties:{sourceType:{type:"string",const:"text",default:"text"}}},
    {required:["sourceType"],properties:{
      sourceType:{type:"string",const:"url"},
      source:{type:"string",format:"uri",maxLength:2048,pattern:"^[Hh][Tt][Tt][Pp][Ss]?://(?:[^/?#:@]+|\\[[0-9A-Fa-f:.]+\\])(?::(?:80|443))?(?:[/?#]|$)"},
    }},
  ]}],
};

const resultLimitProperty={
  limit:{type:"integer",minimum:1,maximum:5000,default:5000,description:"Maximum rows returned in the operation's bounded result table. Totals and truncation metadata remain available."},
  offset:{type:"integer",minimum:0,maximum:250000,default:0,description:"Zero-based row offset. Follow nextOffset until it is null to retrieve the complete ordered table."},
};

const densityResultLimitProperty={
  limit:{...resultLimitProperty.limit,default:2000,description:"Maximum rows returned in each generated unigram, bigram, and trigram table. Up to 100 explicitly tracked phrases are always preserved."},
  offset:resultLimitProperty.offset,
};

const idfResultLimitProperty={
  limit:{...resultLimitProperty.limit,description:"Maximum rows returned in idfTable. Per-document and contribution rows are controlled by top."},
  offset:{...resultLimitProperty.offset,description:"Zero-based idfTable offset. Follow nextIdfOffset until it is null to retrieve the complete ordered IDF table."},
};

const tableLimitProperties={
  totalRows:{type:"integer",minimum:0},
  returnedRows:{type:"integer",minimum:0,maximum:5000},
  offset:{type:"integer",minimum:0,maximum:250000},
  nextOffset:{oneOf:[{type:"integer",minimum:0,maximum:250000},{type:"null"}]},
  hasMore:{type:"boolean"},
  truncated:{type:"boolean"},
};

const analysisResult={
  type:"object",
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},tokenCount:{type:"integer"},vocabularySize:{type:"integer"},fittedExponent:{type:"number"},rSquared:{type:"number"},
    zoneCounts:{type:"object",properties:{above:{type:"integer"},within:{type:"integer"},below:{type:"integer"},sparseTail:{type:"integer"}},description:"Zone totals across the full vocabulary; independent of top."},
    rows:{type:"array",items:{type:"object",properties:{rank:{type:"integer"},term:{type:"string"},actualCount:{type:"integer"},share:{type:"number"},percentage:{type:"number"},per1000:{type:"number"},expectedCount:{type:"number"},ratio:{type:"number"},zone:{type:"string",enum:["above","within","below","sparse-tail"]}}}},
    bigrams:{type:"array",items:{type:"object",properties:{term:{type:"string"},count:{type:"integer"},share:{type:"number"},percentage:{type:"number"},per1000:{type:"number"}}}},
    focusCoverage:{type:"array",items:{type:"object",properties:{term:{type:"string"},count:{type:"integer"},percentage:{type:"number"},per1000:{type:"number"}}}},
    stopwordCount:{type:"integer"},notes:{type:"array",items:{type:"string"}},
  },
};

const comparisonChange={
  type:"object",
  required:["term","countA","countB","countDelta","shareA","shareB","shareDelta"],
  properties:{term:{type:"string"},countA:{type:"integer"},countB:{type:"integer"},countDelta:{type:"integer"},shareA:{type:"number"},shareB:{type:"number"},shareDelta:{type:"number"}},
};

const comparisonResult={
  type:"object",
  required:["metrics","wordChanges","bigramChanges","totalRows","returnedRows","offset","nextOffset","hasMore","truncated"],
  properties:{
    metrics:{type:"object"},
    wordChanges:{type:"array",maxItems:5000,items:comparisonChange},
    bigramChanges:{type:"array",maxItems:5000,items:comparisonChange},
    totalRows:{type:"object",required:["wordChanges","bigramChanges"],properties:{wordChanges:{type:"integer",minimum:0},bigramChanges:{type:"integer",minimum:0}}},
    returnedRows:{type:"object",required:["wordChanges","bigramChanges"],properties:{wordChanges:{type:"integer",minimum:0,maximum:5000},bigramChanges:{type:"integer",minimum:0,maximum:5000}}},
    offset:{type:"integer",minimum:0,maximum:250000},
    nextOffset:{oneOf:[{type:"integer",minimum:0,maximum:250000},{type:"null"}]},
    hasMore:{type:"boolean"},
    truncated:{type:"boolean"},
  },
};

const frequencyRow={
  type:"object",
  required:["term","count","percentage","per1000"],
  properties:{term:{type:"string"},count:{type:"integer"},percentage:{type:"number"},per1000:{type:"number"}},
};

const wordFrequencyResult={
  type:"object",
  required:["language","tokenCount","vocabularySize","stopwordCount","rows","totalRows","returnedRows","offset","nextOffset","hasMore","truncated"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},
    tokenCount:{type:"integer",description:"Words remaining after the selected stop-word rule."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    rows:{type:"array",maxItems:5000,items:frequencyRow,description:"Vocabulary rows ordered by descending count, up to the requested limit."},
    ...tableLimitProperties,
  },
};

const densityRow={
  type:"object",
  required:["term","count","n","percentage","per1000"],
  properties:{term:{type:"string"},count:{type:"integer"},n:{type:"integer",minimum:1},percentage:{type:"number"},per1000:{type:"number"}},
};

const keywordDensityResult={
  type:"object",
  required:["language","wordCount","vocabularySize","stopwordCount","keepStopwords","trackedKeywords","unigrams","bigrams","trigrams","totalRows","returnedRows","offset","nextOffset","hasMore","truncated"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},
    wordCount:{type:"integer",description:"Total normalized words used as the density denominator."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    keepStopwords:{type:"boolean"},
    trackedKeywords:{type:"array",items:densityRow},
    unigrams:{type:"array",maxItems:5000,items:densityRow},
    bigrams:{type:"array",maxItems:5000,items:densityRow},
    trigrams:{type:"array",maxItems:5000,items:densityRow},
    totalRows:{type:"object",required:["trackedKeywords","unigrams","bigrams","trigrams"],properties:{trackedKeywords:{type:"integer"},unigrams:{type:"integer"},bigrams:{type:"integer"},trigrams:{type:"integer"}}},
    returnedRows:{type:"object",required:["trackedKeywords","unigrams","bigrams","trigrams"],properties:{trackedKeywords:{type:"integer"},unigrams:{type:"integer"},bigrams:{type:"integer"},trigrams:{type:"integer"}}},
    offset:{type:"integer",minimum:0,maximum:250000},
    nextOffset:{oneOf:[{type:"integer",minimum:0,maximum:250000},{type:"null"}]},
    hasMore:{type:"boolean"},
    truncated:{type:"boolean"},
  },
};

const ngramResult={
  type:"object",
  required:["language","tokenCount","ngramCount","vocabularySize","stopwordCount","keepStopwords","n","rows","totalRows","returnedRows","offset","nextOffset","hasMore","truncated"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},
    tokenCount:{type:"integer",description:"Tokenized words used as source for sliding-window extraction."},
    ngramCount:{type:"integer",description:"Number of sliding windows for n-gram extraction."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    keepStopwords:{type:"boolean"},
    n:{type:"integer",minimum:1,maximum:10},
    rows:{type:"array",maxItems:5000,items:{type:"object",required:["term","count","percentage","per1000"],properties:{term:{type:"string"},count:{type:"integer"},percentage:{type:"number"},per1000:{type:"number"}}}},
    ...tableLimitProperties,
  },
};

const bagOfWordsTerm={
  type:"object",
  required:["term","count","frequency","percentage","per1000"],
  properties:{
    term:{type:"string"},
    count:{type:"integer"},
    frequency:{type:"number"},
    percentage:{type:"number"},
    per1000:{type:"number"},
  },
};

const bagOfWordsResult={
  type:"object",
  required:["language","tokenCount","vocabularySize","stopwordCount","rows","totalRows","returnedRows","offset","nextOffset","hasMore","truncated"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},
    tokenCount:{type:"integer",description:"Words remaining after the selected stop-word rule."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    rows:{type:"array",maxItems:5000,items:bagOfWordsTerm},
    ...tableLimitProperties,
  },
};

const tfIdfTerm={
  type:"object",
  required:["term","count","tf","idf","tfidf","percentage","per1000"],
  properties:{
    term:{type:"string"},
    count:{type:"integer"},
    tf:{type:"number"},
    idf:{type:"number"},
    tfidf:{type:"number"},
    percentage:{type:"number"},
    per1000:{type:"number"},
  },
};

const tfIdfDocument={
  type:"object",
  required:["language","tokenCount","vocabularySize","stopwordCount","rows"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es"]},
    tokenCount:{type:"integer"},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    rows:{type:"array",items:{$ref:"#/components/schemas/TfIdfTerm"}},
    vectorNorm:{type:"number",description:"Norm of the complete TF-IDF vector. Present in TF-IDF corpus responses and omitted from similarity support documents."},
  },
};

const idfTerm={
  type:"object",
  required:["term","documentFrequency","idf"],
  properties:{term:{type:"string"},documentFrequency:{type:"integer"},idf:{type:"number"}},
};

const tfIdfResult={
  type:"object",
  required:["language","documentCount","top","totalVocabularySize","averageDocumentFrequency","documents","idfTable","totalIdfRows","returnedIdfRows","idfOffset","nextIdfOffset","hasMoreIdfRows","idfTableTruncated"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es","auto"]},
    documentCount:{type:"integer"},
    top:{type:"integer"},
    totalVocabularySize:{type:"integer"},
    averageDocumentFrequency:{type:"number"},
    documents:{type:"array",items:{$ref:"#/components/schemas/TfIdfDocument"}},
    idfTable:{type:"array",maxItems:5000,items:{$ref:"#/components/schemas/IdfTerm"}},
    totalIdfRows:{type:"integer",minimum:0},
    returnedIdfRows:{type:"integer",minimum:0,maximum:5000},
    idfOffset:{type:"integer",minimum:0,maximum:250000},
    nextIdfOffset:{oneOf:[{type:"integer",minimum:0,maximum:250000},{type:"null"}]},
    hasMoreIdfRows:{type:"boolean"},
    idfTableTruncated:{type:"boolean"},
  },
};

const similarityTerm={
  type:"object",
  required:["term","count","frequency","percentage","per1000","weightA","weightB","contribution"],
  properties:{
    term:{type:"string"},
    count:{type:"integer"},
    frequency:{type:"number"},
    percentage:{type:"number"},
    per1000:{type:"number"},
    weightA:{type:"number"},
    weightB:{type:"number"},
    contribution:{type:"number"},
  },
};

const similarityResult={
  type:"object",
  required:["language","method","tokenCounts","top","cosine","dotProduct","normA","normB","overlapTerms","topTerms"],
  properties:{
    language:{type:"string",enum:["en","ru","uk","es","auto"]},
    method:{type:"string",enum:["bow","tfidf"]},
    tokenCounts:{type:"object",required:["a","b"],properties:{a:{type:"integer"},b:{type:"integer"}}},
    top:{type:"integer",minimum:1,maximum:100},
    cosine:{type:"number"},
    dotProduct:{type:"number"},
    normA:{type:"number"},
    normB:{type:"number"},
    overlapTerms:{type:"integer"},
    topTerms:{type:"array",items:{$ref:"#/components/schemas/SimilarityTerm"}},
    documents:{type:"array",items:{$ref:"#/components/schemas/TfIdfDocument"}},
    idfTable:{type:"array",maxItems:5000,items:{$ref:"#/components/schemas/IdfTerm"}},
    totalIdfRows:{type:"integer",minimum:0},
    returnedIdfRows:{type:"integer",minimum:0,maximum:5000},
    idfOffset:{type:"integer",minimum:0,maximum:250000},
    nextIdfOffset:{oneOf:[{type:"integer",minimum:0,maximum:250000},{type:"null"}]},
    hasMoreIdfRows:{type:"boolean"},
    idfTableTruncated:{type:"boolean"},
  },
};

const errorResponse={
  type:"object",
  required:["apiVersion","error"],
  properties:{
    apiVersion:{type:"string"},
    error:{type:"object",required:["code","message"],properties:{code:{type:"string"},message:{type:"string"}}},
  },
};

const requestIdResponseHeader={schema:{type:"string",format:"uuid"},description:"Random correlation ID. It is not derived from submitted content, an analyzed URL, result terms, or a network address."};

const rateLimitResponseHeaders={
  "X-Request-ID":requestIdResponseHeader,
  "RateLimit-Limit":{schema:{type:"integer"},description:"Maximum request-cost units allowed in the active window."},
  "RateLimit-Remaining":{schema:{type:"integer"},description:"Request-cost units remaining in the active window."},
  "RateLimit-Reset":{schema:{type:"integer"},description:"Seconds until the active window resets."},
};

const errorContent={"application/json":{schema:{$ref:"#/components/schemas/ErrorResponse"}}};
const commonErrorResponses={
  "400":{description:"Invalid input",headers:rateLimitResponseHeaders,content:errorContent},
  "413":{description:"Input, remote content, combined workload, or serialized result is too large",headers:rateLimitResponseHeaders,content:errorContent},
  "415":{description:"Unsupported request or remote content type",headers:rateLimitResponseHeaders,content:errorContent},
  "422":{description:"The input or remote resource could not be analyzed",headers:rateLimitResponseHeaders,content:errorContent},
  "429":{description:"Rate limited",headers:{...rateLimitResponseHeaders,"Retry-After":{schema:{type:"integer"}}},content:errorContent},
  "500":{description:"Unexpected analysis failure",headers:rateLimitResponseHeaders,content:errorContent},
};

const document={
  openapi:"3.1.0",
  info:{title:"Text Analysis Tools API",version:"1.0.0",description:"Stateless Bag of Words, word-frequency, keyword-density, n-gram, focus-phrase, Zipf-distribution, and comparison analysis for text and public webpages. Submitted content is not stored. JSON request bodies are limited to approximately 2 MB and serialized responses to 5 MB."},
  servers:[{url:SITE_URL}],
  components:{schemas:{
    AnalyzeInput:sourceSchema,
    ErrorResponse:errorResponse,
    HealthResponse:{type:"object",required:["status","service","apiVersion","storage","rateLimit","revision"],properties:{status:{type:"string",const:"ok"},service:{type:"string",const:"textanalysis.tools"},apiVersion:{type:"string"},storage:{type:"string",const:"none"},rateLimit:{type:"string",enum:["shared","local","degraded"],description:"Current rate-limit backend state for this application worker. Degraded means the shared store is unavailable and bounded local fallback is active."},revision:{type:"string",description:"Git revision embedded at build time, or unknown when the build environment does not expose repository metadata."}}},
    AnalysisResult:analysisResult,
    ComparisonResult:comparisonResult,
    AnalyzeResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/AnalysisResult"}}},
    CompareResponse:{type:"object",required:["apiVersion","storage","resultA","resultB","comparison"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},resultA:{$ref:"#/components/schemas/AnalysisResult"},resultB:{$ref:"#/components/schemas/AnalysisResult"},comparison:{$ref:"#/components/schemas/ComparisonResult"}}},
    WordFrequencyResult:wordFrequencyResult,
    WordFrequencyResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/WordFrequencyResult"}}},
    KeywordDensityResult:keywordDensityResult,
    KeywordDensityResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/KeywordDensityResult"}}},
    BagOfWordsTerm:bagOfWordsTerm,
    BagOfWordsResult:bagOfWordsResult,
    BagOfWordsResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/BagOfWordsResult"}}},
    TfIdfTerm:tfIdfTerm,
    TfIdfDocument:tfIdfDocument,
    IdfTerm:idfTerm,
    TfIdfResult:tfIdfResult,
    TfIdfResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/TfIdfResult"}}},
    SimilarityTerm:similarityTerm,
    SimilarityResult:similarityResult,
    SimilarityResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/SimilarityResult"}}},
    NgramAnalyzerResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/NgramAnalyzerResult"}}},
    NgramAnalyzerResult:ngramResult,
  }},
  paths:{
    "/api/health":{
      get:{
        operationId:"getApiHealth",
        summary:"Check API process liveness",
        responses:{
          "200":{description:"The API process can return a response",headers:{"X-Request-ID":requestIdResponseHeader},content:{"application/json":{schema:{$ref:"#/components/schemas/HealthResponse"}}}},
        },
      },
    },
    "/api/v1/analyze":{
      post:{
        operationId:"analyzeTextOrUrl",
        summary:"Analyze one text or public URL",
        requestBody:{
          required:true,
          content:{"application/json":{schema:{$ref:"#/components/schemas/AnalyzeInput"}}},
        },
        responses:{
          "200":{description:"Analysis completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/AnalyzeResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/compare":{
      post:{
        operationId:"compareTextsOrUrls",
        summary:"Analyze and compare two inputs",
        requestBody:{
          required:true,
          content:{
            "application/json":{
              schema:{
                type:"object",
                description:"The two pasted sources may contain at most 2,000,000 characters and 250,000 analyzable words in total. Remote sources share a 5,000,000-byte fetch budget.",
                required:["a","b"],
                properties:{
                  a:{$ref:"#/components/schemas/AnalyzeInput"},
                  b:{$ref:"#/components/schemas/AnalyzeInput"},
                  limit:{...resultLimitProperty.limit,default:1000,description:"Maximum rows returned in each comparison change table."},
                  offset:resultLimitProperty.offset,
                },
              },
            },
          },
        },
        responses:{
          "200":{description:"Both analyses and their differences",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/CompareResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/word-frequency":{
      post:{
        operationId:"countWordFrequency",
        summary:"Return a bounded word-frequency table",
        requestBody:{required:true,content:{"application/json":{schema:{allOf:[{$ref:"#/components/schemas/AnalyzeInput"},{type:"object",properties:resultLimitProperty}]}}}},
        responses:{
          "200":{description:"Frequency analysis completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/WordFrequencyResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/bag-of-words":{
      post:{
        operationId:"analyzeBagOfWords",
        summary:"Return a bounded Bag-of-Words term table",
        requestBody:{required:true,content:{"application/json":{schema:{allOf:[{$ref:"#/components/schemas/AnalyzeInput"},{type:"object",properties:resultLimitProperty}]}}}},
        responses:{
          "200":{description:"Bag-of-Words analysis completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/BagOfWordsResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/keyword-density":{
      post:{
        operationId:"analyzeKeywordDensity",
        summary:"Return unigram, bigram, trigram, and tracked-phrase density",
        requestBody:{
          required:true,
          content:{"application/json":{schema:{allOf:[
            {$ref:"#/components/schemas/AnalyzeInput"},
            {type:"object",properties:{trackedKeywords:{type:"string",description:"Up to 100 distinct comma-, semicolon-, or newline-separated exact phrases, each up to 200 characters.",maxLength:20000},...densityResultLimitProperty}},
          ]}}},
        },
        responses:{
          "200":{description:"Density analysis completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/KeywordDensityResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/tf-idf":{
      post:{
        operationId:"analyzeTfIdf",
        summary:"Build TF-IDF scores for a document collection",
        requestBody:{
          required:true,
          content:{
            "application/json":{
              schema:{
                type:"object",
                description:"The collection may contain at most 2,000,000 pasted characters and 250,000 analyzable words in total. Remote sources share a 5,000,000-byte fetch budget.",
                required:["documents"],
                properties:{
                  documents:{
                    type:"array",
                    minItems:2,
                    maxItems:10,
                    items:{$ref:"#/components/schemas/AnalyzeInput"},
                  },
                  top:{type:"integer",minimum:1,maximum:100,default:100},
                  ...idfResultLimitProperty,
                },
              },
            },
          },
        },
        responses:{
          "200":{description:"TF-IDF results completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/TfIdfResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/ngram-analyzer":{
      post:{
        operationId:"analyzeNgram",
        summary:"Return a focused n-gram frequency table",
        requestBody:{
          required:true,
        content:{"application/json":{schema:{allOf:[
            {$ref:"#/components/schemas/AnalyzeInput"},
            {type:"object",properties:{ngramSize:{type:"integer",minimum:1,maximum:10,default:2,description:"N-gram size used for sliding extraction."},...resultLimitProperty}},
          ]}}},
        },
        responses:{
          "200":{description:"N-gram analysis completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/NgramAnalyzerResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
    "/api/v1/similarity":{
      post:{
        operationId:"compareTextSimilarity",
        summary:"Compare two inputs with cosine similarity",
        requestBody:{
          required:true,
          content:{
            "application/json":{
              schema:{
                type:"object",
                description:"The two pasted sources may contain at most 2,000,000 characters and 250,000 analyzable words in total. Remote sources share a 5,000,000-byte fetch budget.",
                required:["a","b"],
                properties:{
                  a:{$ref:"#/components/schemas/AnalyzeInput"},
                  b:{$ref:"#/components/schemas/AnalyzeInput"},
                  method:{type:"string",enum:["bow","tf-idf"],default:"bow"},
                  top:{type:"integer",minimum:1,maximum:100,default:100},
                  ...idfResultLimitProperty,
                },
              },
            },
          },
        },
        responses:{
          "200":{description:"Similarity results completed",headers:rateLimitResponseHeaders,content:{"application/json":{schema:{$ref:"#/components/schemas/SimilarityResponse"}}}},
          ...commonErrorResponses,
        },
      },
    },
  },
};

export function GET(){return Response.json(document,{headers:{"Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
export function HEAD(){return new Response(null,{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
