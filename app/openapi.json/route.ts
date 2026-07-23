import { SITE_URL } from "../seo-metadata";

const sourceSchema={
  type:"object",
  required:["source"],
  properties:{
    sourceType:{type:"string",enum:["text","url"],default:"text",description:"Whether source contains raw text/HTML or a public URL."},
    source:{type:"string",description:"Text, HTML, or a public HTTP(S) URL."},
    language:{type:"string",enum:["auto","en","ru","uk"],default:"auto"},
    focus:{oneOf:[{type:"string"},{type:"array",items:{type:"string"},maxItems:100}],description:"Phrases whose coverage should be measured."},
    top:{type:"integer",minimum:5,maximum:100,default:20},
    tolerance:{type:"number",minimum:1.2,maximum:4,default:2,description:"Multiplier used for above/below Zipf model zones."},
    keepStopwords:{type:"boolean",default:false},
    stopwordLists:{type:"object",properties:{en:{type:"array",items:{type:"string"}},ru:{type:"array",items:{type:"string"}},uk:{type:"array",items:{type:"string"}}}},
  },
};

const analysisResult={
  type:"object",
  properties:{
    language:{type:"string",enum:["en","ru","uk"]},tokenCount:{type:"integer"},vocabularySize:{type:"integer"},fittedExponent:{type:"number"},rSquared:{type:"number"},
    zoneCounts:{type:"object",properties:{above:{type:"integer"},within:{type:"integer"},below:{type:"integer"},sparseTail:{type:"integer"}},description:"Zone totals across the full vocabulary; independent of top."},
    rows:{type:"array",items:{type:"object",properties:{rank:{type:"integer"},term:{type:"string"},actualCount:{type:"integer"},share:{type:"number"},percentage:{type:"number"},per1000:{type:"number"},expectedCount:{type:"number"},ratio:{type:"number"},zone:{type:"string",enum:["above","within","below","sparse-tail"]}}}},
    bigrams:{type:"array",items:{type:"object",properties:{term:{type:"string"},count:{type:"integer"},share:{type:"number"},percentage:{type:"number"},per1000:{type:"number"}}}},
    focusCoverage:{type:"array",items:{type:"object",properties:{term:{type:"string"},count:{type:"integer"},percentage:{type:"number"},per1000:{type:"number"}}}},
    stopwordCount:{type:"integer"},notes:{type:"array",items:{type:"string"}},
  },
};

const frequencyRow={
  type:"object",
  required:["term","count","percentage","per1000"],
  properties:{term:{type:"string"},count:{type:"integer"},percentage:{type:"number"},per1000:{type:"number"}},
};

const wordFrequencyResult={
  type:"object",
  required:["language","tokenCount","vocabularySize","stopwordCount","rows"],
  properties:{
    language:{type:"string",enum:["en","ru","uk"]},
    tokenCount:{type:"integer",description:"Words remaining after the selected stop-word rule."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    rows:{type:"array",items:frequencyRow,description:"The complete vocabulary ordered by descending count."},
  },
};

const densityRow={
  type:"object",
  required:["term","count","n","percentage","per1000"],
  properties:{term:{type:"string"},count:{type:"integer"},n:{type:"integer",minimum:1,maximum:3},percentage:{type:"number"},per1000:{type:"number"}},
};

const keywordDensityResult={
  type:"object",
  required:["language","wordCount","vocabularySize","stopwordCount","keepStopwords","trackedKeywords","unigrams","bigrams","trigrams"],
  properties:{
    language:{type:"string",enum:["en","ru","uk"]},
    wordCount:{type:"integer",description:"Total normalized words used as the density denominator."},
    vocabularySize:{type:"integer"},
    stopwordCount:{type:"integer"},
    keepStopwords:{type:"boolean"},
    trackedKeywords:{type:"array",items:densityRow},
    unigrams:{type:"array",items:densityRow},
    bigrams:{type:"array",items:densityRow},
    trigrams:{type:"array",items:densityRow},
  },
};

const document={
  openapi:"3.1.0",
  info:{title:"Text Analysis Tools API",version:"1.0.0",description:"Stateless Bag of Words, word-frequency, keyword-density, n-gram, focus-phrase, Zipf-distribution, and comparison analysis for text and public webpages. Submitted content is not stored."},
  servers:[{url:SITE_URL}],
  components:{schemas:{
    AnalyzeInput:sourceSchema,
    AnalysisResult:analysisResult,
    AnalyzeResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/AnalysisResult"}}},
    CompareResponse:{type:"object",required:["apiVersion","storage","resultA","resultB","comparison"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},resultA:{$ref:"#/components/schemas/AnalysisResult"},resultB:{$ref:"#/components/schemas/AnalysisResult"},comparison:{type:"object"}}},
    WordFrequencyResult:wordFrequencyResult,
    WordFrequencyResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/WordFrequencyResult"}}},
    KeywordDensityResult:keywordDensityResult,
    KeywordDensityResponse:{type:"object",required:["apiVersion","storage","result"],properties:{apiVersion:{type:"string"},storage:{type:"string",enum:["none"]},result:{$ref:"#/components/schemas/KeywordDensityResult"}}},
  }},
  paths:{
    "/api/v1/analyze":{
      post:{
        operationId:"analyzeTextOrUrl",
        summary:"Analyze one text or public URL",
        requestBody:{
          required:true,
          content:{"application/json":{schema:{$ref:"#/components/schemas/AnalyzeInput"}}},
        },
        responses:{
          "200":{description:"Analysis completed",content:{"application/json":{schema:{$ref:"#/components/schemas/AnalyzeResponse"}}}},
          "400":{description:"Invalid input"},
          "413":{description:"Input too large"},
          "429":{description:"Rate limited"},
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
                required:["a","b"],
                properties:{
                  a:{$ref:"#/components/schemas/AnalyzeInput"},
                  b:{$ref:"#/components/schemas/AnalyzeInput"},
                },
              },
            },
          },
        },
        responses:{
          "200":{description:"Both analyses and their differences",content:{"application/json":{schema:{$ref:"#/components/schemas/CompareResponse"}}}},
          "400":{description:"Invalid input"},
          "413":{description:"Input too large"},
          "429":{description:"Rate limited"},
        },
      },
    },
    "/api/v1/word-frequency":{
      post:{
        operationId:"countWordFrequency",
        summary:"Return the complete word-frequency table",
        requestBody:{required:true,content:{"application/json":{schema:{$ref:"#/components/schemas/AnalyzeInput"}}}},
        responses:{
          "200":{description:"Frequency analysis completed",content:{"application/json":{schema:{$ref:"#/components/schemas/WordFrequencyResponse"}}}},
          "400":{description:"Invalid input"},
          "413":{description:"Input too large"},
          "429":{description:"Rate limited"},
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
            {type:"object",properties:{trackedKeywords:{type:"string",description:"Comma, semicolon, or newline-separated exact phrases.",maxLength:20000}}},
          ]}}},
        },
        responses:{
          "200":{description:"Density analysis completed",content:{"application/json":{schema:{$ref:"#/components/schemas/KeywordDensityResponse"}}}},
          "400":{description:"Invalid input"},
          "413":{description:"Input too large"},
          "429":{description:"Rate limited"},
        },
      },
    },
  },
};

export function GET(){return Response.json(document,{headers:{"Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
export function HEAD(){return new Response(null,{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
