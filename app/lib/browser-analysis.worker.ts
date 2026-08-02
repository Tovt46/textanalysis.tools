/// <reference lib="webworker" />

import {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  analyzeNgram,
  analyzeText,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
  toPublicAnalysisResult,
  type AnalyzeInput,
  type SimilarityMethod,
  type TfIdfCorpusInput,
} from "./analyze";
import { compareAnalysisResults } from "./comparison";
import {
  BROWSER_COMPARISON_ROW_LIMIT,
  capBrowserDensity,
  capBrowserIdf,
  capBrowserRows,
} from "./browser-result-limits";

type WorkerRequest={id:number;operation:string;payload:unknown};
type WorkerResponse=
  |{id:number;type:"progress";progress:number}
  |{id:number;type:"result";result:unknown}
  |{id:number;type:"error";message:string};

type KeywordDensityPayload={input:AnalyzeInput;trackedKeywords:string};
type NgramPayload={input:AnalyzeInput;n:number};
type ComparisonPayload={a:AnalyzeInput;b:AnalyzeInput};
type TfIdfPayload={documents:AnalyzeInput[];top:number};
type SimilarityPayload={a:AnalyzeInput;b:AnalyzeInput;method:SimilarityMethod;top:number};

const workerScope=self as DedicatedWorkerGlobalScope;

function post(message:WorkerResponse){workerScope.postMessage(message);}

function run(operation:string,payload:unknown){
  if(operation==="word-frequency")return capBrowserRows(analyzeWordFrequency(payload as AnalyzeInput));
  if(operation==="bag-of-words")return capBrowserRows(analyzeBagOfWords(payload as AnalyzeInput));
  if(operation==="keyword-density"){
    const request=payload as KeywordDensityPayload;
    return capBrowserDensity(analyzeKeywordDensity(request.input,request.trackedKeywords));
  }
  if(operation==="ngram"){
    const request=payload as NgramPayload;
    return capBrowserRows(analyzeNgram(request.input,request.n));
  }
  if(operation==="zipf"){
    const {_allUnigrams,_allBigrams,...result}=analyzeText(payload as AnalyzeInput);
    void _allUnigrams;
    void _allBigrams;
    return result;
  }
  if(operation==="comparison"){
    const request=payload as ComparisonPayload;
    const coreA=analyzeText(request.a);
    const coreB=analyzeText(request.b);
    return {
      resultA:toPublicAnalysisResult(coreA),
      resultB:toPublicAnalysisResult(coreB),
      comparison:compareAnalysisResults(
        {result:coreA,unigrams:coreA._allUnigrams,bigrams:coreA._allBigrams},
        {result:coreB,unigrams:coreB._allUnigrams,bigrams:coreB._allBigrams},
        BROWSER_COMPARISON_ROW_LIMIT,
      ),
    };
  }
  if(operation==="tf-idf"){
    const request=payload as TfIdfPayload;
    const documents=request.documents.map(input=>analyzeBagOfWords(input));
    const analysis=calculateTfIdfCorpus(documents as TfIdfCorpusInput,request.top);
    return capBrowserIdf({
      language:documents.every(document=>document.language===documents[0].language)?documents[0].language:"auto",
      documentCount:documents.length,
      top:request.top,
      totalVocabularySize:analysis.totalVocabularySize,
      averageDocumentFrequency:analysis.averageDocumentFrequency,
      documents:analysis.documents,
      idfTable:analysis.idfTable,
    });
  }
  if(operation==="similarity"){
    const request=payload as SimilarityPayload;
    const documentA=analyzeBagOfWords(request.a);
    const documentB=analyzeBagOfWords(request.b);
    const result=calculateTextSimilarity(documentA,documentB,request.method,request.top);
    return result.idfTable?capBrowserIdf(result as typeof result&{idfTable:NonNullable<typeof result.idfTable>}):result;
  }
  throw new Error(`Unknown browser analysis operation: ${operation}`);
}

workerScope.addEventListener("message",event=>{
  const request=event.data as WorkerRequest;
  if(!request||typeof request.id!=="number"||typeof request.operation!=="string")return;
  post({id:request.id,type:"progress",progress:10});
  try{
    const result=run(request.operation,request.payload);
    post({id:request.id,type:"progress",progress:100});
    post({id:request.id,type:"result",result});
  }catch(error){
    post({id:request.id,type:"error",message:error instanceof Error?error.message:"Analysis failed."});
  }
});

export {};
