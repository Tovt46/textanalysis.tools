import assert from "node:assert/strict";

const baseUrl=new URL(process.env.SMOKE_BASE_URL||"https://textanalysis.tools/");
const canonicalOrigin=new URL(process.env.SMOKE_CANONICAL_ORIGIN||"https://textanalysis.tools/").origin;
const expectedGaId=process.env.EXPECT_GA_MEASUREMENT_ID?.trim();

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

async function checkHomepage(){
  const response=await request("/");
  assert.equal(response.status,200,"The bare homepage must return HTTP 200.");
  const html=await response.text();
  assert.match(html,/Free text analysis tools\./i,"The bare homepage is not the current product homepage.");
  assert.doesNotMatch(html,/Free Bag of Words SEO analyzer\./i,"The bare homepage still contains the retired analyzer hero.");

  const cacheControl=response.headers.get("cache-control")||"";
  const maxAge=cacheControl.match(/s-maxage=(\d+)/i);
  assert.ok(!maxAge||Number(maxAge[1])<=300,`Homepage CDN TTL is too long: ${cacheControl||"(missing)"}`);

  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(match=>new URL(match[1],baseUrl));
  assert.ok(scripts.length>0,"The homepage did not declare any JavaScript assets.");
  await Promise.all(scripts.map(async script=>{
    const asset=await fetch(script,{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(15_000)});
    assert.equal(asset.status,200,`JavaScript asset is unavailable: ${script.pathname}`);
    assert.match(asset.headers.get("content-type")||"",/javascript/i,`Unexpected content type for ${script.pathname}`);
  }));

  if(expectedGaId){
    assert.match(html,new RegExp(`googletagmanager\\.com/gtag/js\\?id=${expectedGaId.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),"Expected GA4 script is missing from the homepage.");
  }
}

async function checkRedirect(){
  const response=await request("/en");
  assert.equal(response.status,308,"/en must return a permanent redirect.");
  assert.equal(response.headers.get("location"),`${canonicalOrigin}/`,"/en redirects to a non-public origin.");
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

  await Promise.all([
    "/api/v1/analyze",
    "/api/v1/compare",
    "/api/v1/word-frequency",
    "/api/v1/keyword-density",
  ].map(checkCors));
}

await checkHomepage();
await checkRedirect();
await checkApis();

console.log(`Production smoke check passed for ${baseUrl.origin}.`);
