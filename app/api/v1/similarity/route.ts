import { API_VERSION,apiErrorResponse,apiJson,apiOptions,enforceRateLimit,normalizeAnalyzeBody,PublicApiError,readJsonBody } from "../../../lib/public-api";
import { analyzeBagOfWords, calculateSimilarityFromTfIdf, calculateTfIdfCorpus } from "../../../lib/analyze";
import { sendServerAnalyticsEvent } from "../../../lib/server-analytics";

export function OPTIONS(){return apiOptions();}

export function GET(){
  return apiJson({
    apiVersion:API_VERSION,
    name:"Text Analysis Tools API",
    operation:"text-similarity",
    method:"POST",
    documentation:"/api-docs",
    openapi:"/openapi.json",
  });
}

function parseSimilarityMethod(value:unknown){
  if(value===undefined||value==="bow") return "bow";
  if(value==="tf-idf"||value==="tfidf"||value==="tf_idf") return "tfidf";
  throw new PublicApiError(400,"INVALID_ARGUMENT","method must be one of: bow, tf-idf.");
}

function parseTop(value:unknown){
  if(value===undefined||value===null||value==="") return 100;
  const top=Number(value);
  if(!Number.isInteger(top)||top<1||top>100) throw new PublicApiError(400,"INVALID_ARGUMENT","top must be an integer between 1 and 100.");
  return top;
}

function toTfIdfRows(rows:Array<{term:string;count:number;frequency:number;percentage:number;per1000:number}>){
  return rows.map((row)=>({
    term:row.term,
    count:row.count,
    tf:row.frequency,
    idf:1,
    tfidf:row.frequency,
    percentage:row.percentage,
    per1000:row.per1000,
  }));
}

export async function POST(request:Request){
  try{
    enforceRateLimit(request);
    const body=await readJsonBody(request) as {a?:unknown;b?:unknown;method?:unknown;top?:unknown};
    if(!body.a||typeof body.a!=="object"||Array.isArray(body.a)||!body.b||typeof body.b!=="object"||Array.isArray(body.b)){
      throw new PublicApiError(400,"INVALID_ARGUMENT","Both a and b analysis inputs are required.");
    }
    const method=parseSimilarityMethod(body.method);
    const top=parseTop(body.top);
    const leftInput=await normalizeAnalyzeBody(body.a as Record<string,unknown>);
    const rightInput=await normalizeAnalyzeBody(body.b as Record<string,unknown>);
    const documentA=analyzeBagOfWords(leftInput);
    const documentB=analyzeBagOfWords(rightInput);
    const sharedLanguage=documentA.language===documentB.language?documentA.language:"auto";

    if(method==="bow"){
      const similarity=calculateSimilarityFromTfIdf(
        {
          language:documentA.language,
          tokenCount:documentA.tokenCount,
          vocabularySize:documentA.vocabularySize,
          stopwordCount:documentA.stopwordCount,
          rows:toTfIdfRows(documentA.rows),
          vectorNorm:0,
        },
        {
          language:documentB.language,
          tokenCount:documentB.tokenCount,
          vocabularySize:documentB.vocabularySize,
          stopwordCount:documentB.stopwordCount,
          rows:toTfIdfRows(documentB.rows),
          vectorNorm:0,
        },
        "bow",
        top,
      );
      await sendServerAnalyticsEvent("api_analysis",{operation:"text_similarity_bow",source_type:"mixed",text_language:sharedLanguage});
      return apiJson({
        apiVersion:API_VERSION,
        storage:"none",
        result:{
          language:sharedLanguage,
          tokenCounts:{a:documentA.tokenCount,b:documentB.tokenCount},
          top,
          ...similarity,
        },
      });
    }

    const tfidf=calculateTfIdfCorpus([documentA,documentB]);
    const similarity=calculateSimilarityFromTfIdf(
      {
        language:documentA.language,
        tokenCount:documentA.tokenCount,
        vocabularySize:documentA.vocabularySize,
        stopwordCount:documentA.stopwordCount,
        rows:toTfIdfRows(documentA.rows),
        vectorNorm:0,
      },
      {
        language:documentB.language,
        tokenCount:documentB.tokenCount,
        vocabularySize:documentB.vocabularySize,
        stopwordCount:documentB.stopwordCount,
        rows:toTfIdfRows(documentB.rows),
        vectorNorm:0,
      },
      "tfidf",
      top,
    );
    const idfLookup=new Map<string,number>(tfidf.documents.flatMap((doc)=>doc.rows).map((row)=>[row.term,row.idf] as const));
    const responseDocuments=tfidf.documents.map((doc)=>({
      language:doc.language,
      tokenCount:doc.tokenCount,
      vocabularySize:doc.vocabularySize,
      stopwordCount:doc.stopwordCount,
      rows:doc.rows.map((row)=>({...row,idf:idfLookup.get(row.term)??1})),
    }));
    await sendServerAnalyticsEvent("api_analysis",{operation:"text_similarity_tfidf",source_type:"mixed",text_language:sharedLanguage});
    return apiJson({
      apiVersion:API_VERSION,
      storage:"none",
      result:{
        language:sharedLanguage,
        tokenCounts:{a:documentA.tokenCount,b:documentB.tokenCount},
        top,
        ...similarity,
        documents:responseDocuments,
        idfTable:tfidf.idfTable,
      },
    });
  }catch(error){
    await sendServerAnalyticsEvent("api_error",{operation:"text_similarity"});
    return apiErrorResponse(error);
  }
}
