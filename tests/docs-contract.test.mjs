import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
const CLI_PATH=fileURLToPath(new URL("../packages/cli/dist/textanalysis.mjs",import.meta.url));
const TEST_BASE_URL=process.env.TEST_BASE_URL?.trim();
const CANONICAL_ORIGIN="https://textanalysis.tools";
let workerCache;

function runCli(args,{cwd,input}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[CLI_PATH,...args],{
      cwd:cwd??PROJECT_ROOT,
      env:{...process.env,NO_COLOR:"1"},
      stdio:["pipe","pipe","pipe"],
    });
    let stdout="";
    let stderr="";
    child.stdout.on("data",chunk=>{stdout+=chunk;});
    child.stderr.on("data",chunk=>{stderr+=chunk;});
    child.once("error",reject);
    child.once("exit",(code,signal)=>resolve({code,signal,stdout,stderr}));
    child.stdin.end(input);
  });
}

async function requestFromWorker(path,init={}){
  if(!workerCache){
    const workerUrl=new URL("../dist/server/index.js",import.meta.url);
    workerUrl.searchParams.set("docs-contract",`${process.pid}-${Date.now()}`);
    workerCache=import(workerUrl.href).then(({default:worker})=>worker);
  }
  const worker=await workerCache;
  return worker.fetch(
    new Request(`http://localhost${path}`,init),
    {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},
    {waitUntil(){},passThroughOnException(){}},
  );
}

const request=TEST_BASE_URL
  ?(path,init={})=>fetch(new URL(path,TEST_BASE_URL),init)
  :requestFromWorker;

function decodeHtml(value){
  return value
    .replaceAll("&amp;","&")
    .replaceAll("&quot;",'"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi,(_,code)=>String.fromCodePoint(Number.parseInt(code,16)));
}

function attributeValues(html,element,attribute){
  const values=[];
  const tagName=element==="*"?"[a-z][\\w:-]*":element;
  const elementPattern=new RegExp(`<${tagName}\\b[^>]*>`,"gi");
  const attributePattern=new RegExp(`\\s${attribute}=(?:"([^"]*)"|'([^']*)')`,"i");
  for(const match of html.matchAll(elementPattern)){
    const attributeMatch=attributePattern.exec(match[0]);
    if(attributeMatch) values.push(decodeHtml(attributeMatch[1]??attributeMatch[2]??""));
  }
  return values;
}

async function mapLimit(values,limit,mapper){
  const results=new Array(values.length);
  let nextIndex=0;
  async function worker(){
    while(nextIndex<values.length){
      const index=nextIndex;
      nextIndex+=1;
      results[index]=await mapper(values[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,values.length)},worker));
  return results;
}

test("localized copy-ready CLI examples match and execute against the built CLI",async()=>{
  const docsSource=await readFile(new URL("../app/LocalizedInfoPage.tsx",import.meta.url),"utf8");
  const requiredExamples=[
    "textanalysis frequency article.txt --language auto",
    'npx --yes textanalysis-tools frequency --text "alpha beta alpha"',
    "cat article.txt | textanalysis ngram --size 2 --format csv",
    "textanalysis compare draft.txt final.txt --format json",
    "textanalysis tfidf a.txt b.txt c.txt --format json",
  ];
  for(const example of requiredExamples) assert.ok(docsSource.includes(example),`Missing documented CLI example: ${example}`);
  for(const unsupported of ["--file article.txt","--file-b","--file-c","ngram --n 2"]){
    assert.ok(!docsSource.includes(unsupported),`Unsupported CLI syntax remains documented: ${unsupported}`);
  }

  const fixtureDirectory=await mkdtemp(join(tmpdir(),"textanalysis-docs-"));
  const article="Transparent text analysis counts words and phrases. Transparent methods make each result inspectable and repeatable for people, developers, and agents.";
  const draft="Text analysis compares an early draft with a later revision. The draft repeats text analysis so editors can inspect normalized vocabulary changes.";
  const final="A revised document compares vocabulary with the original draft. Editors inspect word frequency, recurring phrases, and normalized changes before publishing.";
  try{
    await Promise.all([
      writeFile(join(fixtureDirectory,"article.txt"),article,"utf8"),
      writeFile(join(fixtureDirectory,"draft.txt"),draft,"utf8"),
      writeFile(join(fixtureDirectory,"final.txt"),final,"utf8"),
      writeFile(join(fixtureDirectory,"a.txt"),article,"utf8"),
      writeFile(join(fixtureDirectory,"b.txt"),draft,"utf8"),
      writeFile(join(fixtureDirectory,"c.txt"),final,"utf8"),
    ]);

    const cases=[
      {label:"positional frequency input",args:["frequency","article.txt","--language","auto"]},
      {label:"inline text through the npx-equivalent binary",args:["frequency","--text","alpha beta alpha"]},
      {label:"piped n-gram input",args:["ngram","--size","2","--format","csv"],input:article},
      {label:"positional comparison inputs",args:["compare","draft.txt","final.txt","--format","json"],json:true},
      {label:"positional TF-IDF corpus",args:["tfidf","a.txt","b.txt","c.txt","--format","json"],json:true},
    ];
    for(const example of cases){
      const result=await runCli(example.args,{cwd:fixtureDirectory,input:example.input});
      assert.equal(result.signal,null,`${example.label} exited from signal ${result.signal}`);
      assert.equal(result.code,0,`${example.label} failed:\n${result.stderr}`);
      assert.ok(result.stdout.trim(),`${example.label} returned no output`);
      if(example.json) assert.doesNotThrow(()=>JSON.parse(result.stdout),`${example.label} did not return valid JSON`);
    }
  }finally{
    await rm(fixtureDirectory,{recursive:true,force:true});
  }
});

test("every same-origin fragment link in rendered sitemap pages targets an existing id",async()=>{
  const sitemapResponse=await request("/sitemap.xml",{headers:{accept:"application/xml"}});
  assert.equal(sitemapResponse.status,200);
  const sitemap=await sitemapResponse.text();
  const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>decodeHtml(match[1]));
  assert.ok(sitemapUrls.length>=80,`Expected the complete sitemap, received ${sitemapUrls.length} URLs`);

  const htmlByPath=new Map();
  async function htmlFor(path){
    if(htmlByPath.has(path)) return htmlByPath.get(path);
    const response=await request(path,{headers:{accept:"text/html"}});
    assert.equal(response.status,200,`Expected ${path} to render successfully`);
    const html=await response.text();
    htmlByPath.set(path,html);
    return html;
  }

  const sitemapPaths=sitemapUrls.map(value=>{
    const url=new URL(value);
    assert.equal(url.origin,CANONICAL_ORIGIN,`Unexpected sitemap origin: ${value}`);
    return url.pathname;
  });
  await mapLimit(sitemapPaths,8,htmlFor);

  const broken=[];
  let fragmentLinkCount=0;
  for(const sourcePath of sitemapPaths){
    const sourceHtml=await htmlFor(sourcePath);
    for(const href of attributeValues(sourceHtml,"a","href")){
      let target;
      try{target=new URL(href,`${CANONICAL_ORIGIN}${sourcePath}`);}catch{continue;}
      if(target.origin!==CANONICAL_ORIGIN||!target.hash||target.hash==="#") continue;
      fragmentLinkCount+=1;
      const targetPath=target.pathname;
      let targetHtml;
      try{targetHtml=await htmlFor(targetPath);}catch(error){
        broken.push(`${sourcePath} -> ${href}: ${error instanceof Error?error.message:String(error)}`);
        continue;
      }
      const ids=new Set(attributeValues(targetHtml,"*","id"));
      let fragment;
      try{fragment=decodeURIComponent(target.hash.slice(1));}catch{fragment=target.hash.slice(1);}
      if(!ids.has(fragment)) broken.push(`${sourcePath} -> ${href}: missing id="${fragment}" on ${targetPath}`);
    }
  }

  assert.ok(fragmentLinkCount>0,"Expected at least one same-origin fragment link in rendered pages");
  assert.deepEqual(broken,[]);
});
