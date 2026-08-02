import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const cliPackage=JSON.parse(await readFile(new URL("../packages/cli/package.json",import.meta.url),"utf8"));
const escapedCliVersion=cliPackage.version.replaceAll(/[.*+?^${}()|[\]\\]/g,"\\$&");

const baseUrl=new URL(process.env.SMOKE_BASE_URL||"https://textanalysis.tools/");
const canonicalOrigin=new URL(process.env.SMOKE_CANONICAL_ORIGIN||"https://textanalysis.tools/").origin;
const expectedGaId=process.env.EXPECT_GA_MEASUREMENT_ID?.trim();
const expectedRateLimitBackend=process.env.EXPECT_RATE_LIMIT_BACKEND?.trim();
const expectedDeploymentRevision=process.env.EXPECT_DEPLOYMENT_REVISION?.trim().toLowerCase();
const checkNpmRelease=process.env.CHECK_NPM_RELEASE==="1";
const pageConcurrency=Number(process.env.SMOKE_PAGE_CONCURRENCY||8);
const expectedSitemapPages=89;
const toolPages=[
  "/tools/bag-of-words-analyzer",
  "/tools/word-frequency-counter",
  "/tools/keyword-density-checker",
  "/tools/text-analysis-comparison",
  "/tools/ngram-analyzer",
  "/tools/bag-of-words-generator",
  "/tools/tf-idf-calculator",
  "/tools/text-similarity-calculator",
];
const apiPaths=[
  "/api/v1/analyze",
  "/api/v1/compare",
  "/api/v1/word-frequency",
  "/api/v1/keyword-density",
  "/api/v1/ngram-analyzer",
  "/api/v1/bag-of-words",
  "/api/v1/tf-idf",
  "/api/v1/similarity",
];

async function request(path,init={}){
  const response=await fetch(new URL(path,baseUrl),{
    redirect:"manual",
    signal:AbortSignal.timeout(15_000),
    ...init,
  });
  return response;
}

async function jsonPost(path,body){
  const response=await request(path,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(body),
  });
  assert.match(response.headers.get("x-request-id")||"",/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,`${path} is missing a random request ID.`);
  assert.match(response.headers.get("access-control-expose-headers")||"",/\bX-Request-ID\b/i,`${path} does not expose its request ID to browser clients.`);
  return response;
}

function assertDeploySafeCache(response,label){
  const cacheControl=response.headers.get("cache-control")||"";
  const maxAge=cacheControl.match(/s-maxage=(\d+)/i);
  const staleWindow=cacheControl.match(/stale-while-revalidate=(\d+)/i);
  assert.ok(maxAge,`${label} is missing a shared-cache TTL: ${cacheControl||"(missing)"}`);
  assert.ok(Number(maxAge[1])<=300,`${label} CDN TTL is too long: ${cacheControl}`);
  assert.ok(!staleWindow||Number(staleWindow[1])<=300,`${label} stale cache window is too long: ${cacheControl}`);
}

async function mapConcurrent(items,limit,worker){
  assert.ok(Number.isInteger(limit)&&limit>0,`Invalid smoke-test concurrency: ${limit}`);
  const results=new Array(items.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(cursor<items.length){
      const index=cursor;
      cursor+=1;
      results[index]=await worker(items[index],index);
    }
  }));
  return results;
}

function assetsFromHtml(html){
  const references=[
    ...html.matchAll(/<script[^>]+src="([^"]+)"/gi),
    ...html.matchAll(/<link[^>]+href="([^"]+)"/gi),
  ];
  return references
    .map(match=>new URL(match[1],baseUrl))
    .filter(asset=>asset.origin===baseUrl.origin&&asset.pathname.startsWith("/_next/static/"));
}

async function checkAssetUrls(assets,label){
  assert.ok(assets.length>0,`${label} did not declare any Next.js static assets.`);
  await mapConcurrent(assets,12,async asset=>{
    const response=await fetch(asset,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(15_000)});
    assert.equal(response.status,200,`Static asset is unavailable for ${label}: ${asset.pathname}`);
    const contentType=response.headers.get("content-type")||"";
    if(asset.pathname.endsWith(".js")){
      assert.match(contentType,/javascript/i,`Unexpected content type for ${asset.pathname}`);
    }else if(asset.pathname.endsWith(".css")){
      assert.match(contentType,/text\/css/i,`Unexpected content type for ${asset.pathname}`);
    }
    await response.body?.cancel();
  });
}

async function checkHomepage(){
  const response=await request("/");
  assert.equal(response.status,200,"The bare homepage must return HTTP 200.");
  const html=await response.text();
  assert.match(html,/Free text analysis tools\./i,"The bare homepage is not the current product homepage.");
  assert.doesNotMatch(html,/Free Bag of Words SEO analyzer\./i,"The bare homepage still contains the retired analyzer hero.");
  assertDeploySafeCache(response,"Homepage");

  if(expectedGaId){
    assert.match(html,new RegExp(`googletagmanager\\.com/gtag/js\\?id=${expectedGaId.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),"Expected GA4 script is missing from the homepage.");
  }
}

async function checkRedirect(){
  const response=await request("/en");
  assert.equal(response.status,308,"/en must return a permanent redirect.");
  assert.equal(response.headers.get("location"),`${canonicalOrigin}/`,"/en redirects to a non-public origin.");
}

async function checkToolPages(){
  await Promise.all(toolPages.map(async path=>{
    const response=await request(path);
    assert.equal(response.status,200,`${path} must return HTTP 200.`);
    const html=await response.text();
    assert.match(html,/<form\b/i,`${path} did not render its analysis form.`);
    assert.match(html,/<textarea\b/i,`${path} did not render a text input.`);
    assert.match(html,/class="[^"]*analyze-button/i,`${path} did not render its analysis action.`);
    assertDeploySafeCache(response,path);
  }));
}

async function checkAgentPage(){
  const response=await request("/agents");
  assert.equal(response.status,200,"Agent integration page must return HTTP 200.");
  const html=await response.text();
  assert.match(html,/Text Analysis Tools for AI Agents/i,"Agent integration page has the wrong heading.");
  assert.match(html,new RegExp(`textanalysis-tools@${escapedCliVersion}`,"i"),"Agent integration page does not advertise the current npm release.");
  assert.match(html,/analyze_text/i,"Agent integration page does not list MCP tools.");
  assert.match(html,/href="\/openapi\.json"/i,"Agent integration page is missing OpenAPI discovery.");
  assertDeploySafeCache(response,"Agent integration page");
}

async function checkSitemapPagesAndAssets(){
  const sitemapResponse=await request("/sitemap.xml");
  assert.equal(sitemapResponse.status,200,"Sitemap must return HTTP 200.");
  const sitemap=await sitemapResponse.text();
  const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match=>match[1]);
  assert.equal(locations.length,expectedSitemapPages,"Sitemap URL count changed unexpectedly.");

  const pageAssets=await mapConcurrent(locations,pageConcurrency,async location=>{
    const canonicalUrl=new URL(location);
    assert.equal(canonicalUrl.origin,canonicalOrigin,`Sitemap contains a non-canonical origin: ${location}`);
    const path=`${canonicalUrl.pathname}${canonicalUrl.search}`;
    const response=await request(path);
    assert.equal(response.status,200,`${path} must return HTTP 200.`);
    assert.match(response.headers.get("content-type")||"",/text\/html/i,`${path} did not return HTML.`);
    assertDeploySafeCache(response,path);
    const html=await response.text();
    assert.match(html,/href="\/(?:ru\/|uk\/|es\/)?agents"/i,`${path} appears to be stale and is missing the Agents navigation link.`);
    return assetsFromHtml(html);
  });

  const uniqueAssets=[...new Map(pageAssets.flat().map(asset=>[asset.href,asset])).values()];
  await checkAssetUrls(uniqueAssets,"Sitemap pages");
}

async function checkCors(path){
  const response=await request(path,{
    method:"OPTIONS",
    headers:{
      "Origin":"https://example.com",
      "Access-Control-Request-Method":"POST",
      "Access-Control-Request-Headers":"content-type",
    },
  });
  assert.equal(response.status,204,`${path} preflight must return 204.`);
  assert.equal(response.headers.get("access-control-allow-origin"),"*",`${path} preflight is missing CORS access.`);
  assert.match(response.headers.get("access-control-allow-methods")||"",/POST/,`${path} preflight does not allow POST.`);
  assert.match(response.headers.get("x-request-id")||"",/^[0-9a-f-]{36}$/i,`${path} preflight is missing a request ID.`);
}

async function checkHealth(){
  const response=await request("/api/health");
  assert.equal(response.status,200,"Health endpoint failed.");
  assert.equal(response.headers.get("cache-control"),"no-store","Health response must not be cached.");
  assert.match(response.headers.get("x-request-id")||"",/^[0-9a-f-]{36}$/i,"Health response is missing a request ID.");
  const body=await response.json();
  assert.deepEqual({...body,rateLimit:undefined,revision:undefined},{
    status:"ok",
    service:"textanalysis.tools",
    apiVersion:"1.0",
    storage:"none",
    rateLimit:undefined,
    revision:undefined,
  });
  assert.ok(["shared","local","degraded"].includes(body.rateLimit),`Unexpected health rate-limit state: ${body.rateLimit}`);
  assert.match(body.revision,/^(?:[0-9a-f]{7,64}|unknown)$/,`Unexpected deployment revision: ${body.revision}`);
  assert.notEqual(body.rateLimit,"degraded","Rate-limit backend is degraded and the service is using process-local fallback.");
  if(expectedRateLimitBackend){
    assert.ok(["shared","local"].includes(expectedRateLimitBackend),`Invalid EXPECT_RATE_LIMIT_BACKEND: ${expectedRateLimitBackend}`);
    assert.equal(body.rateLimit,expectedRateLimitBackend,`Expected ${expectedRateLimitBackend} rate-limit backend, received ${body.rateLimit}.`);
  }
  if(expectedDeploymentRevision){
    assert.match(expectedDeploymentRevision,/^[0-9a-f]{7,64}$/,`Invalid EXPECT_DEPLOYMENT_REVISION: ${expectedDeploymentRevision}`);
    assert.equal(body.revision,expectedDeploymentRevision,`Expected deployed revision ${expectedDeploymentRevision}, received ${body.revision}.`);
  }
}

async function checkPublishedNpmPackage(){
  if(!checkNpmRelease)return;
  const response=await fetch(`https://registry.npmjs.org/${encodeURIComponent(cliPackage.name)}/${encodeURIComponent(cliPackage.version)}`,{
    headers:{Accept:"application/json"},
    signal:AbortSignal.timeout(15_000),
  });
  assert.equal(response.status,200,`${cliPackage.name}@${cliPackage.version} is not available from the npm registry.`);
  const manifest=await response.json();
  assert.equal(manifest.name,cliPackage.name,"npm registry returned the wrong package.");
  assert.equal(manifest.version,cliPackage.version,"npm registry returned the wrong package version.");
}

async function checkApis(){
  const analyze=await jsonPost("/api/v1/analyze",{source:"alpha beta alpha gamma",language:"en",keepStopwords:true});
  assert.equal(analyze.status,200,"Analyze API failed.");
  const analyzeBody=await analyze.json();
  assert.equal(analyzeBody.apiVersion,"1.0");
  assert.equal(analyzeBody.storage,"none");
  assert.equal(analyzeBody.result.tokenCount,4);

  const compare=await jsonPost("/api/v1/compare",{
    a:{source:"alpha beta gamma",language:"en",keepStopwords:true},
    b:{source:"alpha alpha delta",language:"en",keepStopwords:true},
  });
  assert.equal(compare.status,200,"Compare API failed.");
  const compareBody=await compare.json();
  assert.ok(Array.isArray(compareBody.comparison.wordChanges),"Compare API did not return word changes.");

  const frequency=await jsonPost("/api/v1/word-frequency",{source:"alpha beta alpha",language:"en",keepStopwords:true});
  assert.equal(frequency.status,200,"Word Frequency API failed.");
  const frequencyBody=await frequency.json();
  assert.deepEqual(frequencyBody.result.rows[0],{term:"alpha",count:2,percentage:(2/3)*100,per1000:(2/3)*1000});

  const density=await jsonPost("/api/v1/keyword-density",{
    source:"keyword density keyword density",
    language:"en",
    keepStopwords:true,
    trackedKeywords:"keyword density",
  });
  assert.equal(density.status,200,"Keyword Density API failed.");
  const densityBody=await density.json();
  assert.equal(densityBody.result.trackedKeywords[0].count,2);

  const ngram=await jsonPost("/api/v1/ngram-analyzer",{
    source:"alpha beta alpha beta gamma",
    language:"en",
    keepStopwords:true,
    ngramSize:2,
  });
  assert.equal(ngram.status,200,"N-gram API failed.");
  const ngramBody=await ngram.json();
  assert.equal(ngramBody.result.n,2);
  assert.equal(ngramBody.result.rows[0].term,"alpha beta");
  assert.equal(ngramBody.result.rows[0].count,2);

  const bow=await jsonPost("/api/v1/bag-of-words",{source:"alpha beta alpha",language:"en",keepStopwords:true});
  assert.equal(bow.status,200,"Bag of Words API failed.");
  const bowBody=await bow.json();
  assert.equal(bowBody.result.rows[0].term,"alpha");
  assert.equal(bowBody.result.rows[0].count,2);

  const weightedPayload={
    a:{source:"common common common alpha alpha alpha",language:"en",keepStopwords:true},
    b:{source:"common common common beta beta beta",language:"en",keepStopwords:true},
    top:50,
  };
  const tfidf=await jsonPost("/api/v1/tf-idf",{documents:[weightedPayload.a,weightedPayload.b],top:50});
  assert.equal(tfidf.status,200,"TF-IDF API failed.");
  const tfidfBody=await tfidf.json();
  assert.equal(tfidfBody.result.documents.length,2);
  assert.ok(tfidfBody.result.documents[0].rows.some(row=>row.term==="alpha"&&row.idf>1),"TF-IDF API did not weight a distinctive term.");

  const [bowSimilarity,tfidfSimilarity,noOverlap]=await Promise.all([
    jsonPost("/api/v1/similarity",{...weightedPayload,method:"bow"}),
    jsonPost("/api/v1/similarity",{...weightedPayload,method:"tf-idf"}),
    jsonPost("/api/v1/similarity",{
      a:{source:"alpha alpha",language:"en",keepStopwords:true},
      b:{source:"beta beta",language:"en",keepStopwords:true},
      method:"tf-idf",
    }),
  ]);
  assert.equal(bowSimilarity.status,200,"Bag of Words similarity API failed.");
  assert.equal(tfidfSimilarity.status,200,"TF-IDF similarity API failed.");
  assert.equal(noOverlap.status,200,"No-overlap similarity API failed.");
  const bowSimilarityBody=await bowSimilarity.json();
  const tfidfSimilarityBody=await tfidfSimilarity.json();
  const noOverlapBody=await noOverlap.json();
  assert.ok(tfidfSimilarityBody.result.cosine<bowSimilarityBody.result.cosine,"TF-IDF similarity did not use weighted vectors.");
  assert.equal(noOverlapBody.result.cosine,0);
  assert.equal(noOverlapBody.result.overlapTerms,0);

  await Promise.all(apiPaths.map(checkCors));
}

await checkHomepage();
await checkRedirect();
await checkToolPages();
await checkAgentPage();
await checkSitemapPagesAndAssets();
await checkHealth();
await checkPublishedNpmPackage();
await checkApis();

console.log(`Production smoke check passed for ${baseUrl.origin}: ${expectedSitemapPages} pages, linked assets, 8 tools, 8 APIs, and health.`);
