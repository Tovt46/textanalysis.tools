import { translate, type UiLang } from "../i18n";
import { DEFAULT_STOPWORD_LISTS, type TextLanguage } from "./stopwords";

type Lang = TextLanguage;

const STOPWORDS: Record<Lang, Set<string>> = {
  en: new Set(DEFAULT_STOPWORD_LISTS.en),
  ru: new Set(DEFAULT_STOPWORD_LISTS.ru),
  uk: new Set(DEFAULT_STOPWORD_LISTS.uk),
  es: new Set(DEFAULT_STOPWORD_LISTS.es),
};

export type AnalyzeInput = {
  text: string;
  language?: "auto" | Lang;
  focus?: string | string[];
  top?: number;
  tolerance?: number;
  keepStopwords?: boolean;
  stopwordLists?: Partial<Record<Lang, string[]>>;
  uiLanguage?: UiLang;
};

function detectLanguage(text: string): Lang {
  const lower = text.toLowerCase();
  const cyrillic = (lower.match(/[а-яёіїєґ]/g) || []).length;
  const latin = (lower.match(/[a-záéíóúüñ]/g) || []).length;
  if (cyrillic > latin) return /[іїєґ]/.test(lower) ? "uk" : "ru";
  const words=lower.match(/[a-záéíóúüñ]+/g) || [];
  const spanishHints=new Set(["el","la","los","las","de","del","que","en","por","para","con","una","un","es","son","como","más","pero","sus","este","esta"]);
  const englishHints=new Set(["the","and","of","to","in","for","with","is","are","that","this","from","as","on","by","an","be","or"]);
  const spanishScore=words.reduce((score,word)=>score+(spanishHints.has(word)?1:0),0);
  const englishScore=words.reduce((score,word)=>score+(englishHints.has(word)?1:0),0);
  if(/[áéíóúüñ¿¡]/.test(lower)||(spanishScore>=2&&spanishScore>englishScore))return "es";
  return "en";
}

function cleanHtml(raw: string) {
  const namedEntities: Record<string, string> = {
    amp: "&", apos: "'", bull: " • ", copy: " © ", gt: ">", hellip: "…",
    laquo: "«", ldquo: "“", lsquo: "‘", lt: "<", mdash: "—", middot: " · ",
    nbsp: " ", ndash: "–", quot: '"', raquo: "»", rdquo: "”", reg: " ® ",
    rsquo: "’", trade: " ™ ",
  };
  const decodeEntity = (_match: string, entity: string) => {
    if (entity.startsWith("#")) {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const value = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)) {
        return String.fromCodePoint(value);
      }
      return " ";
    }
    return namedEntities[entity.toLowerCase()] ?? " ";
  };

  return raw
    .replace(/<(script|style|noscript|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, decodeEntity)
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeAnalysisTerms(text:string){
  const matches = text.normalize("NFKC").toLowerCase().replaceAll("’", "'").match(/[a-záéíóúüñа-яёіїєґ0-9']+/gi) || [];
  return matches
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 0 && !/^\d+$/.test(token));
}

function tokenize(text: string, lang: Lang, keepStopwords: boolean, stopwords = STOPWORDS[lang]) {
  return tokenizeAnalysisTerms(text)
    .filter((token) => keepStopwords || !stopwords.has(token));
}

export function countAnalysisTokens(text:string,stopAfter=Number.MAX_SAFE_INTEGER){
  let count=0;
  const normalized=cleanHtml(text).normalize("NFKC").toLowerCase().replaceAll("’", "'");
  for(const match of normalized.matchAll(/[a-záéíóúüñа-яёіїєґ0-9']+/gi)){
    const token=match[0].replace(/^'+|'+$/g,"");
    if(!token||/^\d+$/.test(token))continue;
    count+=1;
    if(count>=stopAfter)break;
  }
  return count;
}

function countTerms(tokens: string[], n = 1) {
  const counts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const term = tokens.slice(i, i + n).join(" ");
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function prepareRawTokens(input: AnalyzeInput) {
  const plain = cleanHtml(input.text);
  const language = input.language === "auto" || !input.language ? detectLanguage(plain) : input.language;
  const suppliedStopwords = input.stopwordLists?.[language];
  const activeStopwords = suppliedStopwords ? new Set(suppliedStopwords.map((word) => word.trim().toLowerCase()).filter(Boolean)) : STOPWORDS[language];
  const rawTokens = tokenize(plain, language, true, activeStopwords);
  return { language, rawTokens, activeStopwords, stopwordCount:activeStopwords.size };
}

function prepareTokens(input: AnalyzeInput) {
  const prepared=prepareRawTokens(input);
  const tokens=input.keepStopwords
    ?prepared.rawTokens
    :prepared.rawTokens.filter(token=>!prepared.activeStopwords.has(token));
  return { language:prepared.language, tokens, stopwordCount:prepared.stopwordCount };
}

export function analyzeWordFrequency(input:AnalyzeInput){
  const {language,tokens,stopwordCount}=prepareTokens(input);
  const counts=countTerms(tokens);
  return {
    language,
    tokenCount:tokens.length,
    vocabularySize:counts.length,
    stopwordCount,
    rows:counts.map(([term,count])=>{
      const share=tokens.length?count/tokens.length:0;
      return {term,count,percentage:share*100,per1000:share*1000};
    }),
  };
}

function densityRows(counts:[string,number][],wordCount:number,n:number){
  return counts.map(([term,count])=>{
    const share=wordCount?count/wordCount:0;
    return {term,count,n,percentage:share*100,per1000:share*1000};
  });
}

function exactPhraseCount(tokens:string[],phraseTokens:string[]){
  let count=0;
  if(!phraseTokens.length)return count;
  for(let index=0;index<=tokens.length-phraseTokens.length;index+=1){
    if(phraseTokens.every((token,offset)=>tokens[index+offset]===token))count+=1;
  }
  return count;
}

export function analyzeKeywordDensity(input:AnalyzeInput,trackedInput:string|string[]=""){
  const {language,rawTokens,activeStopwords,stopwordCount}=prepareRawTokens(input);
  const keepStopwords=Boolean(input.keepStopwords);
  const unigramCounts=countTerms(rawTokens).filter(([term])=>keepStopwords||!activeStopwords.has(term));
  const meaningfulPhrase=([term]:[string,number])=>keepStopwords||term.split(" ").some(token=>!activeStopwords.has(token));
  const bigramCounts=countTerms(rawTokens,2).filter(meaningfulPhrase);
  const trigramCounts=countTerms(rawTokens,3).filter(meaningfulPhrase);
  const wordCount=rawTokens.length;
  const suppliedTerms=Array.isArray(trackedInput)?trackedInput:trackedInput.split(/[\n,;]+/);
  const trackedTerms=[...new Set(suppliedTerms.map(term=>term.trim()).filter(Boolean))].slice(0,100);
  const trackedKeywords=trackedTerms.map(term=>{
    const phraseTokens=tokenize(term,language,true,activeStopwords);
    const count=exactPhraseCount(rawTokens,phraseTokens);
    const share=wordCount?count/wordCount:0;
    return {term:phraseTokens.join(" ")||term.toLowerCase(),count,n:phraseTokens.length,percentage:share*100,per1000:share*1000};
  });
  return {
    language,
    wordCount,
    vocabularySize:unigramCounts.length,
    stopwordCount,
    keepStopwords,
    trackedKeywords,
    unigrams:densityRows(unigramCounts,wordCount,1),
    bigrams:densityRows(bigramCounts,wordCount,2),
    trigrams:densityRows(trigramCounts,wordCount,3),
  };
}

export type BagOfWordsTerm={
  term:string;
  count:number;
  frequency:number;
  percentage:number;
  per1000:number;
};

export type BagOfWordsResult={
  language:Lang;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:BagOfWordsTerm[];
};

export function analyzeBagOfWords(input:AnalyzeInput):BagOfWordsResult{
  const {language,tokens,stopwordCount}=prepareTokens(input);
  const total=Math.max(1,tokens.length);
  const rows=countTerms(tokens).map(([term,count])=>{
    const frequency=count/total;
    return {
      term,
      count,
      frequency,
      percentage:frequency*100,
      per1000:frequency*1000,
    };
  });
  return {
    language,
    tokenCount:tokens.length,
    vocabularySize:rows.length,
    stopwordCount,
    rows,
  };
}

export type TfIdfTerm ={
  term:string;
  count:number;
  tf:number;
  idf:number;
  tfidf:number;
  percentage:number;
  per1000:number;
};

export type TfIdfDocumentResult ={
  language:Lang;
  tokenCount:number;
  vocabularySize:number;
  stopwordCount:number;
  rows:TfIdfTerm[];
  vectorNorm:number;
};

export type TfIdfCorpusInput = BagOfWordsResult[];

export function calculateTfIdfCorpus(documents:TfIdfCorpusInput,top?:number){
  if(documents.length<2) throw new Error("TF-IDF requires at least two documents.");
  const totalDocs=documents.length;
  const docFrequency=new Map<string,number>();
  for(const doc of documents){
    for(const row of doc.rows) docFrequency.set(row.term, (docFrequency.get(row.term) || 0) + 1);
  }
  const idfTableEntries=[...docFrequency].map(([term,documentFrequency])=>{
    const idf=Math.log((totalDocs + 1) / (1 + documentFrequency)) + 1;
    return {term,documentFrequency,idf};
  });
  const idfLookup=new Map(idfTableEntries.map(item=>[item.term,item.idf] as const));
  const normalizeTop = top===undefined?undefined:Math.max(1,Math.min(top,1000));

  const resultDocuments:TfIdfDocumentResult[]=documents.map((document)=>{
    const rows: TfIdfTerm[] = document.rows.map((row)=>{
      const idf = idfLookup.get(row.term) ?? 1;
      const tfidf = row.frequency * idf;
      return {
        term: row.term,
        count: row.count,
        tf: row.frequency,
        idf,
        tfidf,
        percentage: row.percentage,
        per1000: row.per1000,
      };
    }).sort((left,right)=>right.tfidf-left.tfidf || left.term.localeCompare(right.term));
    const vectorNorm=Math.sqrt(rows.reduce((sum,row)=>sum+(row.tfidf*row.tfidf),0));
    const limited=rows.slice(0,normalizeTop===undefined?rows.length:Math.min(rows.length,normalizeTop));
    return {
      language: document.language,
      tokenCount: document.tokenCount,
      vocabularySize: document.vocabularySize,
      stopwordCount: document.stopwordCount,
      rows: limited,
      vectorNorm,
    };
  });

  return {
    documents: resultDocuments,
    idfTable: idfTableEntries.sort((left,right)=>right.idf-left.idf || left.term.localeCompare(right.term)),
    averageDocumentFrequency: [...docFrequency.values()].reduce((sum,value)=>sum+value,0)/Math.max(1,docFrequency.size),
    totalVocabularySize:docFrequency.size,
  };
}

export type SimilarityTerm=BagOfWordsTerm & {
  weightA:number;
  weightB:number;
  contribution:number;
};

function cosineFromMaps(a:Map<string,number>,b:Map<string,number>,terms:Iterable<string>){
  let dot=0;
  let normA=0;
  let normB=0;
  for(const [,value] of a) normA += value*value;
  for(const [,value] of b) normB += value*value;
  for(const term of terms){
    const leftWeight=a.get(term);
    const rightWeight=b.get(term);
    if(leftWeight===undefined||rightWeight===undefined) continue;
    dot += leftWeight*rightWeight;
  }
  const denominator=Math.sqrt(normA)*Math.sqrt(normB);
  const rawCosine=dot===0?0:dot/(denominator||1);
  return {
    dot,
    normA:Math.sqrt(normA),
    normB:Math.sqrt(normB),
    cosine:Math.max(0,Math.min(1,rawCosine)),
  };
}

export function cosineSimilarityFromTerms(rowsA:readonly {term:string;frequency:number}[],rowsB:readonly {term:string;frequency:number}[],top=100){
  const mapA=new Map(rowsA.map((row)=>[row.term,row.frequency]));
  const mapB=new Map(rowsB.map((row)=>[row.term,row.frequency]));
  const overlappingTerms=new Set([...mapA.keys()].filter((term)=>mapB.has(term)));
  const {dot,normA,normB,cosine}=cosineFromMaps(mapA,mapB,overlappingTerms);
  const topContributions=[...overlappingTerms].map((term)=>{
    const weightA=mapA.get(term) ?? 0;
    const weightB=mapB.get(term) ?? 0;
    if(weightA===0 || weightB===0) return null;
    return {term,weightA,weightB,contribution:weightA*weightB};
  }).filter((entry):entry is {term:string;weightA:number;weightB:number;contribution:number}=>Boolean(entry))
    .sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution) || a.term.localeCompare(b.term))
    .slice(0,top)
    .map((entry)=>({
      term:entry.term,
      count:0,
      frequency:0,
      percentage:(entry.weightA+entry.weightB)===0?0:(entry.contribution/((entry.weightA+entry.weightB)/2))*100,
      per1000:(entry.weightA+entry.weightB)*1000,
      weightA:entry.weightA,
      weightB:entry.weightB,
      contribution:entry.contribution,
    }));
  return {dot,normA,normB,cosine,terms:topContributions,sharedTerms:overlappingTerms.size};
}

export type SimilarityMethod="bow"|"tfidf";

export function calculateSimilarityFromTfIdf(
  sourceA:TfIdfDocumentResult,
  sourceB:TfIdfDocumentResult,
  method:SimilarityMethod,
  top=100,
){
  const rowsToWeights=(rows:TfIdfTerm[])=>rows.map((row)=>({term:row.term,frequency:method==="tfidf"?row.tfidf:row.tf}));
  const result=cosineSimilarityFromTerms(rowsToWeights(sourceA.rows), rowsToWeights(sourceB.rows), top);
  return {
    method,
    cosine:result.cosine,
    dotProduct:result.dot,
    normA:result.normA,
    normB:result.normB,
    overlapTerms:result.sharedTerms,
    topTerms:result.terms,
  };
}

export type TextSimilarityResult={
  language:Lang|"auto";
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

function bagOfWordsAsTfIdfDocument(result:BagOfWordsResult):TfIdfDocumentResult{
  const rows=result.rows.map((row)=>({
    term:row.term,
    count:row.count,
    tf:row.frequency,
    idf:1,
    tfidf:row.frequency,
    percentage:row.percentage,
    per1000:row.per1000,
  }));
  return {
    language:result.language,
    tokenCount:result.tokenCount,
    vocabularySize:result.vocabularySize,
    stopwordCount:result.stopwordCount,
    rows,
    vectorNorm:Math.sqrt(rows.reduce((sum,row)=>sum+(row.tfidf*row.tfidf),0)),
  };
}

export function calculateTextSimilarity(
  documentA:BagOfWordsResult,
  documentB:BagOfWordsResult,
  method:SimilarityMethod,
  top=100,
):TextSimilarityResult{
  const limit=Math.max(1,Math.min(Math.trunc(top)||100,100));
  const language=documentA.language===documentB.language?documentA.language:"auto";

  if(method==="bow"){
    return {
      language,
      tokenCounts:{a:documentA.tokenCount,b:documentB.tokenCount},
      top:limit,
      ...calculateSimilarityFromTfIdf(
        bagOfWordsAsTfIdfDocument(documentA),
        bagOfWordsAsTfIdfDocument(documentB),
        "bow",
        limit,
      ),
    };
  }

  const tfidf=calculateTfIdfCorpus([documentA,documentB]);
  const similarity=calculateSimilarityFromTfIdf(tfidf.documents[0],tfidf.documents[1],"tfidf",limit);
  return {
    language,
    tokenCounts:{a:documentA.tokenCount,b:documentB.tokenCount},
    top:limit,
    ...similarity,
    documents:tfidf.documents.map(({vectorNorm,...document})=>{
      void vectorNorm;
      return {...document,rows:document.rows.slice(0,limit)};
    }),
    idfTable:tfidf.idfTable,
  };
}

export type NgramResult={
  term:string;
  count:number;
  percentage:number;
  per1000:number;
};

export type NgramAnalysisResult={
  language:Lang;
  tokenCount:number;
  ngramCount:number;
  vocabularySize:number;
  stopwordCount:number;
  keepStopwords:boolean;
  n:number;
  rows:NgramResult[];
};

export function analyzeNgram(input:AnalyzeInput,n=2){
  const nValue=Number(n);
  if(!Number.isInteger(nValue)||nValue<1) throw new Error("N-gram size must be an integer of at least 1.");
  const {language,rawTokens,activeStopwords,stopwordCount}=prepareRawTokens(input);
  const keepStopwords=Boolean(input.keepStopwords);
  const termCounts=countTerms(rawTokens,nValue);
  const meaningful=(term:string)=>keepStopwords||term.split(" ").some(token=>!activeStopwords.has(token));
  const filtered=termCounts.filter(([term])=>meaningful(term));
  const denominator=Math.max(1,rawTokens.length-nValue+1);
  const rows=filtered.map(([term,count])=>{const share=count/denominator;return{term,count,percentage:share*100,per1000:share*1000};});
  return{language,tokenCount:rawTokens.length,ngramCount:Math.max(0,rawTokens.length-nValue+1),vocabularySize:rows.length,stopwordCount,keepStopwords,n:nValue,rows};
}

export function analyzeText(input: AnalyzeInput) {
  const uiLanguage = input.uiLanguage || "en";
  const {language,rawTokens,activeStopwords,stopwordCount}=prepareRawTokens(input);
  const tokens=input.keepStopwords
    ?rawTokens
    :rawTokens.filter(token=>!activeStopwords.has(token));
  if (tokens.length < 3) throw new Error(translate(uiLanguage, "tooLittle"));
  const unigramCounts = countTerms(tokens);
  const bigramCounts = countTerms(tokens, 2);
  const top = Math.max(5, Math.min(Number(input.top) || 20, 100));
  const tolerance = Math.max(1.2, Math.min(Number(input.tolerance) || 2, 4));
  const logRanks = unigramCounts.map((_, i) => Math.log(i + 1));
  const logCounts = unigramCounts.map(([, count]) => Math.log(count));
  const meanX = logRanks.reduce((a, b) => a + b, 0) / logRanks.length;
  const meanY = logCounts.reduce((a, b) => a + b, 0) / logCounts.length;
  const varianceX = logRanks.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const covariance = logRanks.reduce((sum, x, i) => sum + (x - meanX) * (logCounts[i] - meanY), 0);
  const slope = varianceX ? covariance / varianceX : 0;
  const intercept = meanY - slope * meanX;
  const totalVariance = logCounts.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const residualVariance = logCounts.reduce((sum, y, i) => sum + (y - (intercept + slope * logRanks[i])) ** 2, 0);
  const rSquared = totalVariance ? Math.max(0, 1 - residualVariance / totalVariance) : 0;

  const allRows = unigramCounts.map(([term, actualCount], index) => {
    const rank = index + 1;
    const expectedCount = Math.exp(intercept + slope * Math.log(rank));
    const ratio = actualCount / expectedCount;
    let zone: "above" | "within" | "below" | "sparse-tail" = "within";
    if (expectedCount < 1) zone = "sparse-tail";
    else if (ratio > tolerance) zone = "above";
    else if (ratio < 1 / tolerance) zone = "below";
    return { rank, term, actualCount, expectedCount, ratio, zone };
  });
  const rows = allRows.slice(0, top);

  const focusTerms = (Array.isArray(input.focus)?input.focus:(input.focus||"").split(","))
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
  const focusCoverage = focusTerms.map((term) => {
    const phraseTokens = tokenize(term, language, true, activeStopwords);
    const count=exactPhraseCount(rawTokens,phraseTokens);
    return { term, count, per1000: rawTokens.length ? (count / rawTokens.length) * 1000 : 0 };
  });

  const zoneCounts = {
    above: allRows.filter((row) => row.zone === "above").length,
    within: allRows.filter((row) => row.zone === "within").length,
    below: allRows.filter((row) => row.zone === "below").length,
    sparseTail: allRows.filter((row) => row.zone === "sparse-tail").length,
  };
  const above = allRows.filter((row) => row.zone === "above");
  const missingFocus = focusCoverage.filter((row) => row.count === 0);
  const notes: string[] = [];
  if (tokens.length < 100) notes.push(translate(uiLanguage, "shortNote"));
  if (above.length) notes.push(translate(uiLanguage, "aboveNote", { terms: above.slice(0, 3).map((row) => `“${row.term}”`).join(", ") }));
  else notes.push(translate(uiLanguage, "noneAbove"));
  if (missingFocus.length) notes.push(translate(uiLanguage, "missingFocus", { terms: missingFocus.slice(0, 3).map((row) => `“${row.term}”`).join(", ") }));
  else if (focusCoverage.length) notes.push(translate(uiLanguage, "allFocus"));
  notes.push(translate(uiLanguage, "templateNote"));

  return {
    language,
    tokenCount: tokens.length,
    vocabularySize: unigramCounts.length,
    fittedExponent: -slope,
    rSquared,
    zoneCounts,
    rows,
    bigrams: bigramCounts.slice(0, top).map(([term, count]) => ({ term, count, share: count / Math.max(tokens.length - 1, 1) })),
    focusCoverage,
    stopwordCount,
    notes,
    _allUnigrams: unigramCounts.map(([term, count]) => ({ term, count })),
    _allBigrams: bigramCounts.map(([term, count]) => ({ term, count })),
  };
}

/**
 * Removes comparison-only term arrays and adds the normalized fields exposed
 * by the Web, HTTP, CLI, and MCP contracts.
 */
export function toPublicAnalysisResult(result:ReturnType<typeof analyzeText>){
  const {_allUnigrams,_allBigrams,...publicResult}=result;
  void _allUnigrams;void _allBigrams;
  return {
    ...publicResult,
    rows:result.rows.map(row=>{
      const share=result.tokenCount?row.actualCount/result.tokenCount:0;
      return {...row,share,percentage:share*100,per1000:share*1000};
    }),
    bigrams:result.bigrams.map(row=>({...row,percentage:row.share*100,per1000:row.share*1000})),
    focusCoverage:result.focusCoverage.map(row=>({...row,percentage:row.per1000/10})),
  };
}
