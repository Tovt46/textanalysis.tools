import {
  analyzeText as analyzeTextForComparison,
  toPublicAnalysisResult,
  type AnalyzeInput,
} from "../app/lib/analyze";
import {compareAnalysisResults} from "../app/lib/comparison";

export {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  analyzeNgram,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
  cosineSimilarityFromTerms,
  countAnalysisTokens,
} from "../app/lib/analyze";

export type {
  AnalyzeInput,
  BagOfWordsResult,
  BagOfWordsTerm,
  NgramAnalysisResult,
  NgramResult,
  SimilarityMethod,
  SimilarityTerm,
  TextSimilarityResult,
  TfIdfCorpusInput,
  TfIdfDocumentResult,
  TfIdfTerm,
} from "../app/lib/analyze";

export {
  DEFAULT_STOPWORD_LISTS,
  parseStopwordText,
} from "../app/lib/stopwords";

export type {TextLanguage} from "../app/lib/stopwords";

export type CompareTextsOptions={
  top?:number;
  offset?:number;
};

/** Return the bounded public analysis contract without comparison internals. */
export function analyzeText(input:AnalyzeInput){
  return toPublicAnalysisResult(analyzeTextForComparison(input));
}

function boundedInteger(value:number|undefined,fallback:number,minimum:number,maximum:number){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return fallback;
  return Math.max(minimum,Math.min(Math.trunc(parsed),maximum));
}

/**
 * Analyze and compare two local inputs without exposing the full internal
 * frequency arrays used to calculate the paginated difference tables.
 */
export function compareTexts(a:AnalyzeInput,b:AnalyzeInput,options:CompareTextsOptions={}){
  const analysisA=analyzeTextForComparison(a);
  const analysisB=analyzeTextForComparison(b);
  const resultA=toPublicAnalysisResult(analysisA);
  const resultB=toPublicAnalysisResult(analysisB);
  const top=boundedInteger(options.top,100,1,100);
  const offset=boundedInteger(options.offset,0,0,250_000);
  return {
    resultA,
    resultB,
    comparison:compareAnalysisResults(
      {result:resultA,unigrams:analysisA._allUnigrams,bigrams:analysisA._allBigrams},
      {result:resultB,unigrams:analysisB._allUnigrams,bigrams:analysisB._allBigrams},
      top,
      offset,
    ),
  };
}
