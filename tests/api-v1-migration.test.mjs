import assert from "node:assert/strict";
import {access,readFile,readdir} from "node:fs/promises";
import test from "node:test";
import {build} from "esbuild";

const ROOT=new URL("../",import.meta.url);
const APP_ROOT=new URL("../app/",import.meta.url);
const LEGACY_ROUTES=[
  "app/api/analyze/route.ts",
  "app/api/word-frequency/route.ts",
  "app/api/keyword-density/route.ts",
];
const LEGACY_ENDPOINTS=["/api/analyze","/api/word-frequency","/api/keyword-density"];

async function sourceFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(async entry=>{
    const url=new URL(`${entry.name}${entry.isDirectory()?"/":""}`,directory);
    if(entry.isDirectory())return sourceFiles(url);
    return /\.[cm]?[jt]sx?$/.test(entry.name)?[url]:[];
  }));
  return nested.flat();
}

async function loadPublicApi(){
  const output=await build({
    entryPoints:[new URL("../app/lib/public-api.ts",import.meta.url).pathname],
    bundle:true,
    format:"esm",
    platform:"node",
    target:"node22",
    write:false,
  });
  const code=output.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("Bag of Words URL analysis uses and safely unwraps the versioned API",async()=>{
  const source=await readFile(new URL("../app/BowApp.tsx",import.meta.url),"utf8");
  assert.match(source,/fetch\("\/api\/v1\/analyze"/);
  assert.doesNotMatch(source,/fetch\("\/api\/analyze"/);
  assert.match(source,/stopwordLists:parsedStopwords/);
  assert.match(source,/const versionedResult=readVersionedAnalysis\(payload\)/);
  assert.match(source,/envelope\.storage!=="none"/);
  assert.match(source,/code==="INSUFFICIENT_TEXT"/);
  assert.match(source,/code==="FETCH_FAILED"/);
});

test("versioned analysis preserves explicit Spanish and Spanish custom stop words",async()=>{
  const {runPublicAnalysis}=await loadPublicApi();
  const result=await runPublicAnalysis({
    source:"El análisis de texto permite revisar texto con datos claros. El análisis de texto compara texto y contenido de forma reproducible.",
    language:"es",
    focus:["análisis de texto"],
    keepStopwords:false,
    stopwordLists:{es:["texto"]},
    top:20,
  });
  assert.equal(result.language,"es");
  assert.equal(result.rows.some(row=>row.term==="texto"),false);
  assert.equal(result.focusCoverage.find(row=>row.term==="análisis de texto")?.count,2);
});

test("legacy endpoint routes and application consumers are removed",async()=>{
  for(const route of LEGACY_ROUTES){
    await assert.rejects(access(new URL(route,ROOT)),error=>error?.code==="ENOENT",route);
  }

  const files=await sourceFiles(APP_ROOT);
  for(const file of files){
    const source=await readFile(file,"utf8");
    for(const endpoint of LEGACY_ENDPOINTS){
      assert.equal(source.includes(`"${endpoint}"`),false,`${file.pathname} still consumes ${endpoint}`);
      assert.equal(source.includes(`'${endpoint}'`),false,`${file.pathname} still consumes ${endpoint}`);
    }
  }
});
