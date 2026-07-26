import assert from "node:assert/strict";

const baseUrl=new URL(process.env.SMOKE_BASE_URL||"https://textanalysis.tools/");
const canonicalOrigin=new URL(process.env.SMOKE_CANONICAL_ORIGIN||"https://textanalysis.tools/").origin;
const expectedGaId=process.env.EXPECT_GA_MEASUREMENT_ID?.trim();
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
  return request(path,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(body),
  });
}

function assertDeploySafeCache(response,label){
  const cacheControl=response.headers.get("cache-control")||"";
  const maxAge=cacheControl.match(/s-maxage=(\d+)/i);
  const staleWindow=cacheControl.match(/stale-while-revalidate=(\d+)/i);
  assert.ok(maxAge,`${label} is missing a shared-cache TTL: ${cacheControl||"(missing)"}`);
  assert.ok(Number(maxAge[1])<=300,`${label} CDN TTL is too long: ${cacheControl}`);
  assert.ok(!staleWindow||Number(staleWindow[1])<=300,`${label} stale cache window is too long: ${cacheControl}`);
}

function scriptsFromHtml(html){
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(match=>new URL(match[1],baseUrl));
}

async function checkScriptUrls(scripts,label){
  assert.ok(scripts.length>0,`${label} did not declare any JavaScript assets.`);
  await Promise.all(scripts.map(async script=>{
    const asset=await fetch(script,{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(15_000)});
    assert.equal(asset.status,200,`JavaScript asset is unavailable for ${label}: ${script.pathname}`);
    assert.match(asset.headers.get("content-type")||"",/javascript/i,`Unexpected content type for ${script.pathname}`);
  }));
}

async function checkScripts(html,label){
  await checkScriptUrls(scriptsFromHtml(html),label);
}

async function checkHomepage(){
  const response=await request("/");
  assert.equal(response.status,200,"The bare homepage must return HTTP 200.");
  const html=await response.text();
  assert.match(html,/Free text analysis tools\./i,"The bare homepage is not the current product homepage.");
  assert.doesNotMatch(html,/Free Bag of Words SEO analyzer\./i,"The bare homepage still contains the retired analyzer hero.");
  assertDeploySafeCache(response,"Homepage");
  await checkScripts(html,"Homepage");

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
  const pageScripts=await Promise.all(toolPages.map(async path=>{
    const response=await request(path);
    assert.equal(response.status,200,`${path} must return HTTP 200.`);
    const html=await response.text();
    assert.match(html,/<form\b/i,`${path} did not render its analysis form.`);
    assert.match(html,/<textarea\b/i,`${path} did not render a text input.`);
    assert.match(html,/class="[^"]*analyze-button/i,`${path} did not render its analysis action.`);
    assertDeploySafeCache(response,path);
    return scriptsFromHtml(html);
  }));
  const uniqueScripts=[...new Map(pageScripts.flat().map(script=>[script.href,script])).values()];
  await checkScriptUrls(uniqueScripts,"Tool pages");
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
await checkApis();

console.log(`Production smoke check passed for ${baseUrl.origin}.`);
