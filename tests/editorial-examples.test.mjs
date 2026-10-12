import assert from "node:assert/strict";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import test,{after} from "node:test";
import {build} from "esbuild";

const buildDirectory=await mkdtemp(join(tmpdir(),"textanalysis-editorial-examples-"));
after(()=>rm(buildDirectory,{recursive:true,force:true}));
const bundledModule=join(buildDirectory,"editorial-examples.mjs");
await build({
  stdin:{
    contents:`export {extractSourcePreview} from "./app/lib/source-extraction";
export {analyzeWordFrequency,analyzeKeywordDensity,analyzeText} from "./app/lib/analyze";
export {compareAnalysisResults} from "./app/lib/comparison";`,
    resolveDir:fileURLToPath(new URL("..",import.meta.url)),
    sourcefile:"editorial-examples-test.ts",
    loader:"ts",
  },
  outfile:bundledModule,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
const {extractSourcePreview,analyzeWordFrequency,analyzeKeywordDensity,analyzeText,compareAnalysisResults}=await import(pathToFileURL(bundledModule).href);
const examplesDirectory=new URL("../public/examples/",import.meta.url);
const fixture=JSON.parse(await readFile(new URL("editorial-revision.json",examplesDirectory),"utf8"));
const html=await Promise.all(fixture.webpageExample.files.map(name=>readFile(new URL(name,examplesDirectory),"utf8")));
const settings={language:"en",keepStopwords:true};

function wordCount(result,term){
  return result.rows.find(row=>row.term===term)?.count??0;
}

test("published HTML examples keep their identical 40-word article when main content is selected",()=>{
  const previews=html.map(source=>extractSourcePreview(source,"main","text/html"));
  assert.equal(previews[0].text,previews[1].text);
  assert.equal(previews[0].text,fixture.webpageExample.articleText);
  for(const preview of previews){
    assert.equal(preview.usedScope,"main");
    assert.equal(preview.fallback,false);
    const result=analyzeWordFrequency({text:preview.text,...settings});
    assert.equal(result.tokenCount,40);
    assert.equal(wordCount(result,"revision"),2);
    assert.equal(wordCount(result,"contact"),0);
    assert.equal(result.rows.find(row=>row.term==="revision").percentage,5);
  }
  assert.deepEqual(fixture.webpageExample.expected[2],{
    label:"Either page · main content",words:40,revision:2,contact:0,
  });
});

test("published whole-page numbers describe the real menu and footer changes",()=>{
  const expected=[
    {label:"Page A · whole page",words:45,revision:2,contact:2},
    {label:"Page B · whole page",words:49,revision:2,contact:5},
  ];
  assert.deepEqual(fixture.webpageExample.expected.slice(0,2),expected);
  for(const [index,source] of html.entries()){
    assert.match(source,/<meta name="robots" content="noindex">/);
    const preview=extractSourcePreview(source,"page","text/html");
    assert.equal(preview.usedScope,"page");
    assert.equal(preview.fallback,false);
    const result=analyzeWordFrequency({text:preview.text,...settings});
    assert.equal(result.tokenCount,expected[index].words);
    assert.equal(wordCount(result,"revision"),expected[index].revision);
    assert.equal(wordCount(result,"contact"),expected[index].contact);
    assert.equal(result.rows.find(row=>row.term==="revision").percentage.toFixed(2),["4.44","4.08"][index]);
    assert.equal(result.rows.find(row=>row.term==="contact").percentage.toFixed(2),["4.44","10.20"][index]);
  }
});

test("published A/B comparison reproduces exact phrase counts and bigram denominators",()=>{
  assert.deepEqual(fixture.settings,settings);
  assert.deepEqual(fixture.expected,{
    wordsA:40,wordsB:41,bigramWindowsA:39,bigramWindowsB:40,
    phrases:[
      {term:"content review",countA:1,countB:4},
      {term:"source note",countA:2,countB:0},
    ],
  });
  const analyses=[fixture.original,fixture.revised].map(text=>analyzeText({text,...fixture.settings}));
  assert.equal(analyses[0].tokenCount,40);
  assert.equal(analyses[1].tokenCount,41);
  assert.equal(analyses[0].tokenCount-1,39);
  assert.equal(analyses[1].tokenCount-1,40);
  const comparison=compareAnalysisResults(...analyses.map(result=>({
    result,unigrams:result._allUnigrams,bigrams:result._allBigrams,
  })));
  for(const expected of fixture.expected.phrases){
    const row=comparison.bigramChanges.find(item=>item.term===expected.term);
    assert.ok(row,expected.term);
    assert.equal(row.countA,expected.countA);
    assert.equal(row.countB,expected.countB);
    assert.equal(row.shareA,expected.countA/39);
    assert.equal(row.shareB,expected.countB/40);
  }
  const repeated=comparison.bigramChanges.find(row=>row.term==="content review");
  assert.equal((repeated.shareA*100).toFixed(2),"2.56");
  assert.equal((repeated.shareB*100).toFixed(2),"10.00");
  assert.equal((repeated.shareDelta*100).toFixed(2),"7.44");
});

test("published phrase occurrence densities use all 40 or 41 words instead of bigram windows",()=>{
  const densities=[fixture.original,fixture.revised].map(text=>analyzeKeywordDensity({text,...fixture.settings},fixture.trackedPhrases));
  assert.equal(densities[0].wordCount,40);
  assert.equal(densities[1].wordCount,41);
  for(const expected of fixture.expected.phrases){
    const a=densities[0].trackedKeywords.find(row=>row.term===expected.term);
    const b=densities[1].trackedKeywords.find(row=>row.term===expected.term);
    assert.ok(a&&b,expected.term);
    assert.equal(a.count,expected.countA);
    assert.equal(b.count,expected.countB);
    assert.equal(a.percentage,expected.countA/40*100);
    assert.equal(b.percentage,expected.countB/41*100);
  }
  const a=densities[0].trackedKeywords.find(row=>row.term==="content review");
  const b=densities[1].trackedKeywords.find(row=>row.term==="content review");
  assert.equal(a.percentage.toFixed(2),"2.50");
  assert.equal(b.percentage.toFixed(2),"9.76");
  assert.equal((b.percentage-a.percentage).toFixed(2),"7.26");
});
