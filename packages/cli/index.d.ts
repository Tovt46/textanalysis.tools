export type TextLanguage="en"|"ru"|"uk"|"es";
export type UiLanguage=TextLanguage;

export type AnalyzeInput={
  text:string;
  language?:"auto"|TextLanguage;
  focus?:string|string[];
  top?:number;
  tolerance?:number;
  keepStopwords?:boolean;
  stopwordLists?:Partial<Record<TextLanguage,string[]>>;
  uiLanguage?:UiLanguage;
};

export type FrequencyTerm={
  term:string;
  count:number;
  percentage:number;
  per1000:number;
};

export type WordFrequencyResult={
  language:TextLanguage;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:FrequencyTerm[];
};

export type BagOfWordsTerm=FrequencyTerm&{
  frequency:number;
};

export type BagOfWordsResult={
  language:TextLanguage;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:BagOfWordsTerm[];
};

export type DensityTerm=FrequencyTerm&{n:number};

export type KeywordDensityResult={
  language:TextLanguage;
  wordCount:number;
  vocabularySize:number;
  stopwordCount:number;
  keepStopwords:boolean;
  trackedKeywords:DensityTerm[];
  unigrams:DensityTerm[];
  bigrams:DensityTerm[];
  trigrams:DensityTerm[];
};

export type NgramResult=FrequencyTerm;

export type NgramAnalysisResult={
  language:TextLanguage;
  tokenCount:number;
  ngramCount:number;
  vocabularySize:number;
  stopwordCount:number;
  keepStopwords:boolean;
  n:number;
  rows:NgramResult[];
};

export type TfIdfTerm=FrequencyTerm&{
  tf:number;
  idf:number;
  tfidf:number;
};

export type TfIdfDocumentResult={
  language:TextLanguage;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:TfIdfTerm[];
  vectorNorm:number;
};

export type TfIdfCorpusInput=BagOfWordsResult[];

export type TfIdfCorpusResult={
  documents:TfIdfDocumentResult[];
  idfTable:Array<{term:string;documentFrequency:number;idf:number}>;
  averageDocumentFrequency:number;
  totalVocabularySize:number;
};

export type SimilarityMethod="bow"|"tfidf";

export type SimilarityTerm=BagOfWordsTerm&{
  weightA:number;
  weightB:number;
  contribution:number;
};

export type TextSimilarityResult={
  language:TextLanguage|"auto";
  method:SimilarityMethod;
  tokenCounts:{a:number;b:number};
  top:number;
  cosine:number;
  dotProduct:number;
  normA:number;
  normB:number;
  overlapTerms:number;
  topTerms:SimilarityTerm[];
  documents?:Array<Omit<TfIdfDocumentResult,"vectorNorm">>;
  idfTable?:Array<{term:string;documentFrequency:number;idf:number}>;
};

export type ZipfAnalysisResult={
  language:TextLanguage;
  tokenCount:number;
  vocabularySize:number;
  fittedExponent:number;
  rSquared:number;
  zoneCounts:{above:number;within:number;below:number;sparseTail:number};
  rows:Array<{
    rank:number;
    term:string;
    actualCount:number;
    expectedCount:number;
    ratio:number;
    zone:"above"|"within"|"below"|"sparse-tail";
    share:number;
    percentage:number;
    per1000:number;
  }>;
  bigrams:Array<{term:string;count:number;share:number;percentage:number;per1000:number}>;
  focusCoverage:Array<{term:string;count:number;per1000:number;percentage:number}>;
  stopwordCount:number;
  notes:string[];
};

export type PublicZipfAnalysisResult=ZipfAnalysisResult;

export type ComparisonMetric={a:number;b:number;delta:number};
export type ComparisonChange={
  term:string;
  countA:number;
  countB:number;
  countDelta:number;
  shareA:number;
  shareB:number;
  shareDelta:number;
};
export type TextComparisonResult={
  metrics:{
    tokenCount:ComparisonMetric;
    vocabularySize:ComparisonMetric;
    fittedExponent:ComparisonMetric;
    rSquared:ComparisonMetric;
    aboveModel:ComparisonMetric;
  };
  wordChanges:ComparisonChange[];
  bigramChanges:ComparisonChange[];
  totalRows:{wordChanges:number;bigramChanges:number};
  returnedRows:{wordChanges:number;bigramChanges:number};
  offset:number;
  nextOffset:number|null;
  hasMore:boolean;
  truncated:boolean;
};
export type CompareTextsOptions={top?:number;offset?:number};
export type CompareTextsResult={
  resultA:PublicZipfAnalysisResult;
  resultB:PublicZipfAnalysisResult;
  comparison:TextComparisonResult;
};

export declare function analyzeText(input:AnalyzeInput):PublicZipfAnalysisResult;
export declare function analyzeWordFrequency(input:AnalyzeInput):WordFrequencyResult;
export declare function analyzeKeywordDensity(input:AnalyzeInput,trackedInput?:string|string[]):KeywordDensityResult;
export declare function analyzeNgram(input:AnalyzeInput,n?:number):NgramAnalysisResult;
export declare function analyzeBagOfWords(input:AnalyzeInput):BagOfWordsResult;
export declare function calculateTfIdfCorpus(documents:TfIdfCorpusInput,top?:number):TfIdfCorpusResult;
export declare function calculateTextSimilarity(
  documentA:BagOfWordsResult,
  documentB:BagOfWordsResult,
  method:SimilarityMethod,
  top?:number,
):TextSimilarityResult;
export declare function compareTexts(
  a:AnalyzeInput,
  b:AnalyzeInput,
  options?:CompareTextsOptions,
):CompareTextsResult;
export declare function cosineSimilarityFromTerms(
  rowsA:readonly {term:string;frequency:number}[],
  rowsB:readonly {term:string;frequency:number}[],
  top?:number,
):{
  dot:number;
  normA:number;
  normB:number;
  cosine:number;
  terms:SimilarityTerm[];
  sharedTerms:number;
};
export declare function countAnalysisTokens(text:string,stopAfter?:number):number;

export declare const DEFAULT_STOPWORD_LISTS:Record<TextLanguage,readonly string[]>;
export declare function parseStopwordText(value:string):string[];
