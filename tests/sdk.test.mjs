import assert from "node:assert/strict";
import test from "node:test";
import * as sdk from "../packages/cli/dist/index.mjs";
import {
  analyzeBagOfWords,
  analyzeKeywordDensity,
  analyzeNgram,
  analyzeText,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
  compareTexts,
  countAnalysisTokens,
} from "../packages/cli/dist/index.mjs";

test("SDK does not expose similarity helpers that accept truncated TF-IDF documents",()=>{
  assert.equal("calculateSimilarityFromTfIdf" in sdk,false);
  assert.equal("compareAnalysisResults" in sdk,false);
  assert.equal("toPublicAnalysisResult" in sdk,false);
});

test("importable ESM SDK exposes eight deterministic public analysis operations",()=>{
  const input={text:"alpha beta alpha gamma",language:"en",keepStopwords:true};
  const frequency=analyzeWordFrequency(input);
  const density=analyzeKeywordDensity(input,"alpha beta");
  const ngrams=analyzeNgram(input,2);
  const bow=analyzeBagOfWords(input);
  const zipf=analyzeText({...input,text:"alpha beta alpha gamma delta"});
  const tfidf=calculateTfIdfCorpus([
    bow,
    analyzeBagOfWords({text:"alpha delta delta gamma",language:"en",keepStopwords:true}),
  ],10);
  const similarity=calculateTextSimilarity(
    bow,
    analyzeBagOfWords({text:"alpha beta delta",language:"en",keepStopwords:true}),
    "tfidf",
    10,
  );
  const comparison=compareTexts(
    {...input,text:"alpha beta alpha gamma delta"},
    {...input,text:"alpha beta zeta gamma epsilon"},
    {top:2},
  );

  assert.equal(frequency.rows[0].term,"alpha");
  assert.equal(density.trackedKeywords[0].count,1);
  assert.equal(ngrams.rows[0].term,"alpha beta");
  assert.equal(bow.tokenCount,4);
  assert.equal(zipf.tokenCount,5);
  assert.equal("_allUnigrams" in zipf,false);
  assert.equal("_allBigrams" in zipf,false);
  assert.equal(typeof zipf.rows[0].share,"number");
  assert.equal(typeof zipf.rows[0].percentage,"number");
  assert.equal(typeof zipf.rows[0].per1000,"number");
  assert.ok(zipf.notes.every(note=>!/[а-яёіїєґ]/i.test(note)),"SDK defaults to English diagnostic notes");
  assert.equal(tfidf.documents.length,2);
  assert.ok(similarity.cosine>0&&similarity.cosine<1);
  assert.equal(comparison.comparison.wordChanges.length,2);
  assert.equal(comparison.comparison.returnedRows.wordChanges,2);
  assert.equal("_allUnigrams" in comparison.resultA,false);
  assert.equal("_allBigrams" in comparison.resultB,false);
  assert.equal(countAnalysisTokens("one two three"),3);
});

test("analyzeText returns at most 100 normalized public rows",()=>{
  const source=Array.from({length:140},(_,index)=>`public${index}x`).join(" ");
  const result=analyzeText({text:source,language:"en",keepStopwords:true,top:10_000});
  assert.equal(result.rows.length,100);
  assert.equal(result.bigrams.length,100);
  assert.deepEqual(
    Object.keys(result).filter(key=>key.startsWith("_all")),
    [],
  );
  assert.ok(result.rows.every(row=>
    Number.isFinite(row.share)&&Number.isFinite(row.percentage)&&Number.isFinite(row.per1000)
  ));
});

test("compareTexts bounds pages and returns stable non-overlapping metadata",()=>{
  const vocabulary=Array.from({length:140},(_,index)=>`term${index}x`);
  const inputA={text:vocabulary.join(" "),language:"en",keepStopwords:true};
  const inputB={text:[...vocabulary,"additionalterm"].join(" "),language:"en",keepStopwords:true};
  const snapshot=JSON.stringify([inputA,inputB]);
  const first=compareTexts(inputA,inputB,{top:10_000});
  const second=compareTexts(inputA,inputB,{top:10_000,offset:first.comparison.nextOffset});

  assert.equal(first.comparison.offset,0);
  assert.equal(first.comparison.wordChanges.length,100);
  assert.equal(first.comparison.nextOffset,100);
  assert.equal(first.comparison.hasMore,true);
  assert.equal(second.comparison.offset,100);
  assert.equal(second.comparison.wordChanges.length,41);
  assert.equal(second.comparison.nextOffset,null);
  assert.equal(second.comparison.hasMore,false);
  assert.equal(
    new Set([...first.comparison.wordChanges,...second.comparison.wordChanges].map(row=>row.term)).size,
    141,
  );
  assert.equal(JSON.stringify([inputA,inputB]),snapshot,"compareTexts must not mutate its inputs");
});

test("SDK keeps Spanish stop-word and focus phrase behavior",()=>{
  const input={
    text:"El análisis de texto mejora la claridad. El análisis de texto ayuda a revisar.",
    language:"es",
    focus:"análisis de texto",
  };
  const frequency=analyzeWordFrequency(input);
  const analysis=analyzeText(input);
  assert.equal(frequency.rows.some(row=>row.term==="el"),false);
  assert.equal(analysis.focusCoverage[0].count,2);
});
