import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {assertIndexNowConfig,assertManifest,collectManifest,planChanges,semanticFingerprint,submitUrls} from "../scripts/indexnow-core.mjs";

const site="https://textanalysis.tools";
const config=JSON.parse(await readFile(new URL("../indexnow.config.json",import.meta.url),"utf8"));
const revision="a".repeat(40);
const paths=["/","/about","/contact","/privacy"];
const date="2026-01-01";
const sitemap=`<urlset>${paths.map(path=>`<url><loc>${site}${path}</loc><lastmod>${date}</lastmod></url>`).join("")}</urlset>`;
const page=(path="/",{copy="Useful analysis",build="build-one",description="Count words",schema={"@context":"https://schema.org","@type":"WebPage",name:"Analysis"}}={})=>`<!doctype html><html><head><title>Analysis</title><meta name="description" content="${description}"><meta name="robots" content="index, follow"><link rel="canonical" href="${site}${path}"><link rel="preload" href="/_next/static/${build}.js"><link rel="stylesheet" href="/_next/static/${build}.css"><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><main class="${build}" id="${build}"><h1>Analysis</h1><p>${copy}</p><a href="/about">About</a><img src="/logo.png" alt="Logo"><input name="source" placeholder="Paste text" id="${build}-input"><link rel="stylesheet" href="/_next/static/${build}.css"><div hidden>Runtime ${build}</div><script src="/_next/static/${build}.js"></script><script>self.__next_f.push(["${build}"])</script></main></body></html>`;
const manifest=(pages={[site+"/"]:{lastmod:date,fingerprint:"a".repeat(64)}})=>({version:1,host:config.host,revision,generatedAt:"2026-01-01T00:00:00Z",pages});

test("the production app serves the IndexNow ownership proof as public plain text",{skip:!process.env.TEST_BASE_URL},async()=>{
  const response=await fetch(new URL(`/${config.key}.txt`,process.env.TEST_BASE_URL));
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type"),/^text\/plain/);
  assert.equal((await response.text()).trim(),config.key);
});

async function fixture(callback,{ownership=config.key,healthRevisions=[revision,revision],mutateHtml=value=>value,statusFor=()=>200}={}){
  const requests=[];
  let healthCount=0;
  const server=createServer((request,response)=>{
    requests.push({path:request.url,method:request.method,headers:request.headers});
    const path=new URL(request.url,"http://localhost").pathname;
    if(path==="/api/health"){
      response.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});
      response.end(JSON.stringify({status:"ok",service:config.host,revision:healthRevisions[Math.min(healthCount++,healthRevisions.length-1)],rateLimit:"local"}));
    }else if(path===`/${config.key}.txt`){
      response.writeHead(200,{"Content-Type":"text/plain"});response.end(ownership);
    }else if(path==="/sitemap.xml"){
      response.writeHead(200,{"Content-Type":"application/xml"});response.end(sitemap);
    }else if(paths.includes(path)){
      response.writeHead(statusFor(path),{"Content-Type":"text/html"});response.end(mutateHtml(page(path),path));
    }else{response.writeHead(404);response.end("Not found");}
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  try{return await callback({baseUrl:`http://127.0.0.1:${server.address().port}`,requests});}
  finally{await new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});}
}

test("IndexNow ownership configuration is canonical and its public file matches",async()=>{
  assert.equal(assertIndexNowConfig(config),config);
  assert.equal((await readFile(new URL(`../public/${config.key}.txt`,import.meta.url),"utf8")).trim(),config.key);
  for(const invalid of [
    {...config,host:"another.example"},{...config,key:"short"},
    {...config,keyLocation:`${site}/nested/${config.key}.txt`},
    {...config,keyLocation:`https://another.example/${config.key}.txt`},
    {...config,endpoint:"https://another.example/indexnow"},
  ])assert.throws(()=>assertIndexNowConfig(invalid));
});

test("semantic fingerprints ignore bundle churn, runtime IDs, hidden data and JSON-LD object key order",()=>{
  const first=semanticFingerprint(page(),site+"/");
  const second=page("/",{build:"entirely-different-build",schema:{name:"Analysis","@type":"WebPage","@context":"https://schema.org"}});
  assert.equal(semanticFingerprint(second,site+"/"),first);
  assert.equal(semanticFingerprint(page().replace("Useful analysis","Useful  \n analysis"),site+"/"),first);
  assert.equal(semanticFingerprint(page().replace("</main>",'<input type="hidden" name="runtime-token" value="random-token"></main>'),site+"/"),first);
});

test("content, metadata, structured facts and link changes each notify even without a new lastmod",()=>{
  const first=semanticFingerprint(page(),site+"/");
  const changed=[
    page("/",{copy:"New analysis guidance"}),page("/",{description:"Updated description"}),
    page("/",{schema:{"@context":"https://schema.org","@type":"WebPage",name:"New name"}}),
    page().replace('href="/about"','href="/contact"'),
    page().replace('alt="Logo"','alt="New product logo"'),
    page().replace('placeholder="Paste text"','placeholder="Paste two texts"'),
    page().replace("<html>",'<html lang="fr">'),
    page().replace("<html>",'<html dir="rtl">'),
  ];
  for(const html of changed){
    const fingerprint=semanticFingerprint(html,site+"/");
    assert.notEqual(fingerprint,first);
    assert.deepEqual(planChanges(manifest({[site+"/"]:{lastmod:date,fingerprint:first}}),manifest({[site+"/"]:{lastmod:date,fingerprint}})),[site+"/"]);
  }
});

test("fingerprints reject fallback pages, noindex responses and malformed structured data",()=>{
  for(const html of [
    page().replace('rel="canonical"','rel="alternate"'),
    page().replace(`href="${site}/"`,`href="${site}/about"`),
    page().replace('content="index, follow"','content="noindex, follow"'),
    page().replace("<h1>Analysis</h1>",""),
    page().replace('{"@context":"https://schema.org","@type":"WebPage","name":"Analysis"}',"invalid-json"),
  ])assert.throws(()=>semanticFingerprint(html,site+"/"));
});

test("manifest validation fails closed for corrupted or offsite saved state",()=>{
  assert.equal(assertManifest(manifest()).host,config.host);
  for(const invalid of [
    {...manifest(),version:2},{...manifest(),host:"another.example"},
    {...manifest(),revision:"unknown"},{...manifest(),generatedAt:"not a date"},
    {...manifest(),pages:{}},manifest({"https://another.example/":{lastmod:date,fingerprint:"a".repeat(64)}}),
    manifest({[site+"/api/private"]:{lastmod:date,fingerprint:"a".repeat(64)}}),
    manifest({[site+"/?token=secret"]:{lastmod:date,fingerprint:"a".repeat(64)}}),
    manifest({[site+"/"]:{lastmod:"2026-02-30",fingerprint:"a".repeat(64)}}),
    manifest({[site+"/"]:{lastmod:date,fingerprint:"missing"}}),
  ])assert.throws(()=>assertManifest(invalid));
  assert.throws(()=>planChanges({broken:true},manifest()));
});

test("plans contain only new or changed URLs, never unchanged or removed pages",()=>{
  const before=manifest({[site+"/"]:{lastmod:date,fingerprint:"a".repeat(64)},[site+"/removed"]:{lastmod:date,fingerprint:"c".repeat(64)}});
  const same=manifest({[site+"/"]:{lastmod:date,fingerprint:"a".repeat(64)}});
  assert.deepEqual(planChanges(before,same),[]);
  assert.deepEqual(planChanges(null,same),[site+"/"]);
  const after=manifest({[site+"/"]:{lastmod:"2026-01-02",fingerprint:"a".repeat(64)},[site+"/new"]:{lastmod:date,fingerprint:"b".repeat(64)}});
  assert.deepEqual(planChanges(before,after),[site+"/",site+"/new"]);
});

test("collection verifies ownership and deployment around a fresh semantic snapshot",async()=>{
  await fixture(async({baseUrl,requests})=>{
    const current=await collectManifest({baseUrl,config,expectedRevision:revision,concurrency:2});
    assert.equal(current.revision,revision);
    assert.equal(Object.keys(current.pages).length,4);
    assert.equal(requests.filter(request=>request.path==="/api/health").length,2);
    assert.ok(requests.some(request=>request.path===`/${config.key}.txt`));
    for(const request of requests){assert.equal(request.method,"GET");assert.equal(request.headers["cache-control"],"no-cache");}
    const again=await collectManifest({baseUrl,config,expectedRevision:revision});
    assert.deepEqual(planChanges(current,again),[]);
  });
});

test("collection rejects ownership mismatch, deployment drift and bad content without submitting",async()=>{
  await fixture(({baseUrl})=>assert.rejects(collectManifest({baseUrl,config,expectedRevision:revision}),/ownership file does not match/),{ownership:"wrong-key"});
  await fixture(({baseUrl})=>assert.rejects(collectManifest({baseUrl,config,expectedRevision:revision}),/revision does not match/),{healthRevisions:[revision,"b".repeat(40)]});
  await fixture(({baseUrl})=>assert.rejects(collectManifest({baseUrl,config}),/Deployment changed/),{healthRevisions:[revision,"b".repeat(40)]});
  await fixture(({baseUrl})=>assert.rejects(collectManifest({baseUrl,config,expectedRevision:revision}),/content page failed/),{statusFor:path=>path==="/about"?503:200});
  await fixture(({baseUrl})=>assert.rejects(collectManifest({baseUrl,config,expectedRevision:revision}),/noindex/),{mutateHtml:html=>html.replace('content="index, follow"','content="noindex"')});
});

test("an explicit predeployment baseline can skip only the absent ownership proof",async()=>{
  await fixture(async({baseUrl,requests})=>{
    const current=await collectManifest({baseUrl,config,expectedRevision:revision,verifyKey:false});
    assert.equal(Object.keys(current.pages).length,4);
    assert.equal(requests.some(request=>request.path===`/${config.key}.txt`),false);
    assert.equal(requests.filter(request=>request.path==="/api/health").length,2);
  },{ownership:"not deployed yet"});
});

test("submission sends one canonical JSON payload and reports provider acceptance honestly",async()=>{
  for(const status of [200,202]){
    const calls=[];
    const receipt=await submitUrls({config,urls:[site+"/about"],request:async(url,options)=>{calls.push({url,options});return new Response("",{status});}});
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,"https://www.bing.com/indexnow");
    assert.equal(calls[0].options.method,"POST");
    assert.equal(calls[0].options.redirect,"manual");
    assert.deepEqual(JSON.parse(calls[0].options.body),{host:config.host,key:config.key,keyLocation:config.keyLocation,urlList:[site+"/about"]});
    assert.equal(receipt.status,status);
    assert.equal(receipt.pendingVerification,status===202);
    assert.ok(receipt.acceptedAt);
    assert.equal(receipt.submitted,1);
  }
});

test("provider rejection and transport failure preserve a retryable unaccepted outcome",async()=>{
  for(const status of [400,403,422,429,500,503]){
    await assert.rejects(submitUrls({config,urls:[site+"/"],request:async()=>new Response("Rejected",{status,headers:{"Retry-After":"60"}})}),error=>{
      assert.equal(error.receipt.status,status);assert.equal(error.receipt.acceptedAt,null);assert.equal(error.receipt.retryAfter,"60");return true;
    });
  }
  await assert.rejects(submitUrls({config,urls:[site+"/"],request:async()=>{throw new Error("network unavailable");}}),/network unavailable/);
});

test("empty plans do not call IndexNow and unsafe payloads fail before network access",async()=>{
  const request=async()=>assert.fail("No request should be made.");
  assert.equal((await submitUrls({config,urls:[],request})).submitted,0);
  for(const urls of [[site+"/",site+"/"],["https://another.example/"],[site+"/api/private"],[site+"/?secret=value"],Array.from({length:10_001},(_,i)=>`${site}/page-${i}`)]){
    await assert.rejects(submitUrls({config,urls,request}));
  }
});
