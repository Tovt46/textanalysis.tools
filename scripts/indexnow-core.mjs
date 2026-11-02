import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {parse} from "parse5";
import {assertSitemap} from "./agent-readiness/http.mjs";

const host="textanalysis.tools";
const origin=`https://${host}`;
const endpoint="https://www.bing.com/indexnow";
const skipped=new Set(["script","style","template","noscript"]);
const attributes=node=>Object.fromEntries((node.attrs??[]).map(({name,value})=>[name,value]));
const normalize=value=>String(value??"").replace(/\s+/g," ").trim();

export function assertIndexNowConfig(config){
  assert.equal(config?.host,host,"IndexNow host must be textanalysis.tools.");
  assert.match(config.key??"",/^[A-Za-z0-9-]{8,128}$/, "IndexNow key is invalid.");
  assert.equal(config.keyLocation,`${origin}/${config.key}.txt`,"IndexNow ownership file must be at the canonical root.");
  assert.equal(config.endpoint,endpoint,"IndexNow submissions must use the Bing endpoint.");
  return config;
}

function pageUrl(value){
  assert.equal(typeof value,"string","Manifest page URL must be a string.");
  const url=new URL(value);
  assert.equal(url.origin,origin,"IndexNow page URLs must use the canonical host and HTTPS.");
  assert.ok(!url.username&&!url.password&&!url.search&&!url.hash,"IndexNow page URLs must not contain credentials, queries or fragments.");
  assert.equal(url.href,value,"IndexNow page URL is not canonical.");
  assert.ok(!/^\/(?:api(?:\/|$)|_next(?:\/|$)|\.well-known(?:\/|$))/.test(url.pathname),"IndexNow only accepts public content pages.");
  return url;
}

function validDate(value){
  assert.match(value??"",/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/, "Invalid content lastmod.");
  const parsed=Date.parse(value);
  assert.ok(Number.isFinite(parsed)&&parsed<=Date.now(),"Content lastmod must be a real, non-future date.");
  assert.equal(new Date(Date.parse(value.slice(0,10))).toISOString().slice(0,10),value.slice(0,10),"Invalid content calendar date.");
}

export function assertManifest(manifest){
  assert.equal(manifest?.version,1,"Unsupported IndexNow manifest version.");
  assert.equal(manifest.host,host,"IndexNow manifest belongs to another host.");
  assert.match(manifest.revision??"",/^[0-9a-f]{7,64}$/, "IndexNow manifest revision is invalid.");
  assert.ok(typeof manifest.generatedAt==="string"&&Number.isFinite(Date.parse(manifest.generatedAt)),"IndexNow manifest timestamp is invalid.");
  assert.ok(manifest.pages&&typeof manifest.pages==="object"&&!Array.isArray(manifest.pages),"IndexNow manifest pages are invalid.");
  const entries=Object.entries(manifest.pages);
  assert.ok(entries.length>0&&entries.length<=10_000,"IndexNow manifest must contain 1–10,000 public pages.");
  for(const [url,entry] of entries){
    pageUrl(url);
    assert.ok(entry&&typeof entry==="object"&&!Array.isArray(entry),`Invalid IndexNow entry: ${url}`);
    validDate(entry.lastmod);
    assert.match(entry.fingerprint??"",/^[0-9a-f]{64}$/,`Invalid IndexNow fingerprint: ${url}`);
  }
  return manifest;
}

function sortedJson(value){
  if(Array.isArray(value))return value.map(sortedJson);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sortedJson(value[key])]));
  return value;
}

// Fingerprint content crawlers can use, rather than Next build identifiers,
// bundles, CSS classes, React IDs, hydration scripts or preload order.
export function semanticFingerprint(html,url){
  pageUrl(url);
  const nodes=[];
  const visit=node=>{nodes.push(node);for(const child of node.childNodes??[])visit(child);};
  visit(parse(html));
  const canonical=nodes.filter(node=>node.tagName==="link"&&(attributes(node).rel??"").toLowerCase().split(/\s+/).includes("canonical"));
  assert.equal(canonical.length,1,`${url} must declare exactly one canonical URL.`);
  assert.equal(new URL(attributes(canonical[0]).href,url).href,url,`${url} canonical points elsewhere.`);
  const textOf=node=>{
    const attr=attributes(node);
    if(skipped.has(node.tagName)||Object.hasOwn(attr,"hidden")||attr["aria-hidden"]==="true"||(node.tagName==="input"&&attr.type?.toLowerCase()==="hidden"))return "";
    return node.nodeName==="#text"?node.value:(node.childNodes??[]).map(textOf).join(" ");
  };
  const title=normalize(nodes.filter(node=>node.tagName==="title").map(textOf).join(" "));
  assert.ok(title,`${url} must have a title.`);
  assert.ok(nodes.some(node=>node.tagName==="h1"&&normalize(textOf(node))),`${url} must have a visible primary heading.`);
  const metadata=nodes.filter(node=>node.tagName==="meta").map(node=>attributes(node)).filter(attr=>{
    const key=(attr.name??attr.property??"").toLowerCase();
    return ["description","robots","bingbot"].includes(key)||/^(?:og:|twitter:)/.test(key);
  }).map(attr=>({name:(attr.name??attr.property).toLowerCase(),content:normalize(attr.content)}));
  for(const meta of metadata.filter(meta=>["robots","bingbot"].includes(meta.name))){
    assert.doesNotMatch(meta.content,/(?:^|[,;\s])(?:noindex|none)(?:$|[,;\s])/i,`${url} is marked noindex.`);
  }
  metadata.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const alternates=nodes.filter(node=>node.tagName==="link"&&(attributes(node).rel??"").toLowerCase().split(/\s+/).includes("alternate")&&attributes(node).hreflang)
    .map(node=>({language:attributes(node).hreflang,url:new URL(attributes(node).href,url).href}))
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const structuredData=nodes.filter(node=>node.tagName==="script"&&(attributes(node).type??"").toLowerCase()==="application/ld+json")
    .map(node=>sortedJson(JSON.parse((node.childNodes??[]).map(child=>child.value??"").join(""))))
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const body=nodes.find(node=>node.tagName==="body");
  assert.ok(body,`${url} must have an HTML body.`);
  const meaningful=[];
  const contentVisit=node=>{
    const attr=attributes(node);
    if(skipped.has(node.tagName)||["link","meta","title"].includes(node.tagName)||Object.hasOwn(attr,"hidden")||attr["aria-hidden"]==="true"||(node.tagName==="input"&&attr.type?.toLowerCase()==="hidden"))return;
    const selected={};
    for(const name of ["href","src","alt","title","aria-label","type","name","value","placeholder"]){
      if(attr[name]!==undefined)selected[name]=normalize(attr[name]);
    }
    if(Object.keys(selected).length)meaningful.push({tag:node.tagName,...selected});
    for(const child of node.childNodes??[])contentVisit(child);
  };
  contentVisit(body);
  const documentAttributes=attributes(nodes.find(node=>node.tagName==="html"));
  const content={title,language:normalize(documentAttributes.lang),...(documentAttributes.dir?{direction:normalize(documentAttributes.dir)}:{}),canonical:url,metadata,alternates,structuredData,text:normalize(textOf(body)),elements:meaningful};
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function testOrigin(baseUrl){
  const base=new URL(baseUrl);
  assert.ok(["https:","http:"].includes(base.protocol)&&!base.username&&!base.password,"IndexNow source must be HTTP(S) without credentials.");
  assert.ok(base.origin===origin||["localhost","127.0.0.1","[::1]"].includes(base.hostname),"IndexNow collection only permits the canonical site or local tests.");
  assert.equal(base.pathname,"/","IndexNow source must use the site root.");
  assert.ok(!base.search&&!base.hash,"IndexNow source must not contain a query or fragment.");
  return base;
}

export async function collectManifest({baseUrl=origin,expectedRevision,config,request=fetch,concurrency=4,verifyKey=true}={}){
  assertIndexNowConfig(config);
  const base=testOrigin(baseUrl);
  if(expectedRevision!==undefined)assert.match(expectedRevision,/^[0-9a-f]{7,64}$/,"Expected deployment revision is invalid.");
  assert.ok(Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=12,"IndexNow page concurrency must be 1–12.");
  assert.equal(typeof verifyKey,"boolean","IndexNow ownership verification flag must be boolean.");
  const get=async(path,headers={})=>request(new URL(path,base),{redirect:"manual",cache:"no-store",headers:{"Cache-Control":"no-cache",...headers},signal:AbortSignal.timeout(20_000)});
  const health=async()=>{
    const response=await get("/api/health",{Accept:"application/json"});
    assert.equal(response.status,200,"IndexNow deployment health request failed.");
    assert.equal(response.headers.get("cache-control"),"no-store","IndexNow deployment health must not be cached.");
    const health=await response.json();
    assert.equal(health.status,"ok","IndexNow deployment is not healthy.");
    assert.equal(health.service,host,"IndexNow deployment returned another service.");
    assert.match(health.revision??"",/^[0-9a-f]{7,64}$/,"IndexNow deployment revision is unknown.");
    assert.notEqual(health.rateLimit,"degraded","IndexNow deployment has a degraded rate-limit backend.");
    if(expectedRevision!==undefined)assert.equal(health.revision,expectedRevision,"IndexNow deployment revision does not match the validated revision.");
    return health;
  };
  const before=await health();
  // Only an explicit, read-only predeployment baseline uses verifyKey:false.
  // Notification workflows use the default and require the deployed proof file.
  if(verifyKey){
    const key=await get(new URL(config.keyLocation).pathname,{Accept:"text/plain"});
    assert.equal(key.status,200,"IndexNow ownership file is unavailable.");
    assert.match(key.headers.get("content-type")??"",/^text\/plain(?:;|$)/i,"IndexNow ownership file must be plain text.");
    assert.equal((await key.text()).trim(),config.key,"IndexNow ownership file does not match the configured key.");
  }
  const sitemap=await get("/sitemap.xml",{Accept:"application/xml"});
  assert.equal(sitemap.status,200,"IndexNow sitemap is unavailable.");
  assert.match(sitemap.headers.get("content-type")??"",/^(?:application|text)\/xml(?:;|$)/i,"IndexNow sitemap must be XML.");
  const xml=await sitemap.text();
  assertSitemap(xml);
  const entries=[...xml.matchAll(/<url\s*>([\s\S]*?)<\/url>/g)].map(match=>({url:match[1].match(/<loc>([^<]+)<\/loc>/)[1],lastmod:match[1].match(/<lastmod>([^<]+)<\/lastmod>/)[1]}));
  assert.ok(entries.length<=10_000,"IndexNow sitemap exceeds the configured 10,000-page bound.");
  const pages=Object.create(null);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,entries.length)},async()=>{
    while(cursor<entries.length){
      const entry=entries[cursor++];
      const url=pageUrl(entry.url);
      const response=await get(url.pathname,{Accept:"text/html"});
      assert.equal(response.status,200,`IndexNow content page failed: ${entry.url}`);
      assert.match(response.headers.get("content-type")??"",/^text\/html(?:;|$)/i,`IndexNow content page is not HTML: ${entry.url}`);
      assert.doesNotMatch(response.headers.get("x-robots-tag")??"",/(?:^|[,;:\s])(?:noindex|none)(?:$|[,;\s])/i,`IndexNow page is excluded by X-Robots-Tag: ${entry.url}`);
      pages[entry.url]={lastmod:entry.lastmod,fingerprint:semanticFingerprint(await response.text(),entry.url)};
    }
  }));
  const after=await health();
  assert.equal(after.revision,before.revision,"Deployment changed during IndexNow content collection.");
  return assertManifest({version:1,host,revision:after.revision,generatedAt:new Date().toISOString(),pages:Object.fromEntries(Object.entries(pages).sort(([a],[b])=>a.localeCompare(b)))});
}

export function planChanges(previous,current){
  assertManifest(current);
  if(previous!==null&&previous!==undefined)assertManifest(previous);
  return Object.keys(current.pages).filter(url=>{
    const old=previous?.pages[url];
    return !old||old.lastmod!==current.pages[url].lastmod||old.fingerprint!==current.pages[url].fingerprint;
  }).sort();
}

export async function submitUrls({config,urls,request=fetch}={}){
  assertIndexNowConfig(config);
  assert.ok(Array.isArray(urls)&&urls.length<=10_000,"IndexNow submission must contain at most 10,000 URLs.");
  assert.equal(new Set(urls).size,urls.length,"IndexNow submission must not contain duplicate URLs.");
  for(const url of urls)pageUrl(url);
  if(!urls.length)return {status:200,submitted:0,endpoint,acceptedAt:null,skipped:true};
  const response=await request(endpoint,{method:"POST",redirect:"manual",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({host:config.host,key:config.key,keyLocation:config.keyLocation,urlList:urls}),signal:AbortSignal.timeout(20_000)});
  const body=(await response.text()).slice(0,2000);
  const accepted=[200,202].includes(response.status);
  const receipt={status:response.status,submitted:urls.length,endpoint,acceptedAt:accepted?new Date().toISOString():null,pendingVerification:response.status===202,...(body?{body}:{}),...(response.headers.get("retry-after")?{retryAfter:response.headers.get("retry-after")}:{})};
  if(!accepted){
    const error=new Error(`IndexNow HTTP ${response.status}: submission was not accepted; the accepted manifest must not advance.`);
    error.receipt=receipt;
    throw error;
  }
  return receipt;
}
