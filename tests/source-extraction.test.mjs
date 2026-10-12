import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import test,{after} from "node:test";
import {build} from "esbuild";

const buildDirectory=await mkdtemp(join(tmpdir(),"textanalysis-source-extraction-"));
after(()=>rm(buildDirectory,{recursive:true,force:true}));
const bundledModule=join(buildDirectory,"source-extraction.mjs");
await build({
  stdin:{
    contents:`export * from "./app/lib/source-extraction";
export {PublicApiError,MAX_TEXT_CHARS,MAX_ANALYSIS_TOKENS,createRemoteFetchBudget} from "./app/lib/public-api";
export * as route from "./app/api/source-preview/route";`,
    resolveDir:fileURLToPath(new URL("..",import.meta.url)),
    sourcefile:"source-extraction-test.ts",
    loader:"ts",
  },
  outfile:bundledModule,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
const api=await import(pathToFileURL(bundledModule).href);
const publicLookup=async()=>[{address:"93.184.216.34",family:4}];

function htmlWithMenu(menu){
  return `<!doctype html><html><head><title>Article &amp; analysis</title></head><body>
    <header><nav>${menu}</nav></header>
    <main><nav>Section menu</nav><article><h1>Useful article</h1><p>Alpha beta alpha.</p>
      <aside>Suggested links</aside><footer>Article footer</footer></article></main>
    <footer>Site footer</footer></body></html>`;
}

test("the same article produces the same main text when navigation changes",()=>{
  const first=api.extractSourcePreview(htmlWithMenu("Home Pricing"),"main","text/html");
  const second=api.extractSourcePreview(htmlWithMenu("Support Account News"),"main","text/html");
  assert.deepEqual(first,second);
  assert.equal(first.text,"Useful article\nAlpha beta alpha.");
  assert.equal(first.title,"Article & analysis");
  assert.equal(first.requestedScope,"main");
  assert.equal(first.usedScope,"main");
  assert.equal(first.fallback,false);
});

test("whole-page mode keeps visible navigation and footers while excluding the head",()=>{
  const first=api.extractSourcePreview(htmlWithMenu("Home Pricing"),"page","text/html");
  const second=api.extractSourcePreview(htmlWithMenu("Support Account News"),"page","text/html");
  assert.notEqual(first.text,second.text);
  assert.match(first.text,/Home Pricing/);
  assert.match(first.text,/Section menu/);
  assert.match(first.text,/Suggested links/);
  assert.match(first.text,/Article footer/);
  assert.match(first.text,/Site footer/);
  assert.doesNotMatch(first.text,/Article & analysis/);
  assert.equal(first.usedScope,"page");
  assert.equal(first.fallback,false);
});

test("local article and main headers retain their title and lead without including site banners",()=>{
  const article=api.extractSourcePreview(`<body><header><h1>Site name</h1><p>Site navigation</p></header>
    <article><header><h1>Article title</h1><p>Article lead.</p></header><p>Article body.</p></article></body>`,"main","text/html");
  assert.equal(article.text,"Article title\nArticle lead.\nArticle body.");
  assert.equal(article.usedScope,"main");
  assert.equal(article.fallback,false);
  const headerOnly=api.extractSourcePreview("<article><header><h1>Title only</h1><p>Lead only.</p></header></article>","main","text/html");
  assert.equal(headerOnly.text,"Title only\nLead only.");
  assert.equal(headerOnly.fallback,false);
  const main=api.extractSourcePreview(`<header>Site banner</header><main><header><h1>Main title</h1><p>Main lead.</p></header>
    <header role="banner">Explicit site banner</header><p>Main body.</p></main>`,"main","text/html");
  assert.equal(main.text,"Main title\nMain lead.\nMain body.");
  assert.equal(main.fallback,false);
});

test("entities and block boundaries are decoded without breaking inline words",()=>{
  const preview=api.extractSourcePreview(
    "<article><h1>Tom &amp; Jos&eacute;</h1><p><strong>Rea</strong>d &lt; 4 &#x1f642; &nbsp; words.</p><p>Second<br>line</p><table><tr><td>One</td><td>Two</td></tr></table></article>",
    "main",
    "text/html",
  );
  assert.equal(preview.text,"Tom & José\nRead < 4 🙂 words.\nSecond\nline\nOne\nTwo");
});

test("hidden subtrees and non-content elements never contribute text",()=>{
  const html=`<main><p>Visible text.</p><div hidden="false"><article>Hidden attribute</article></div>
    <p aria-hidden=" TRUE ">Hidden aria</p><p style="color:red;display: none !important">Hidden style</p>
    <div style="visibility: hidden">Hidden visibility</div><script>script text</script><style>style text</style>
    <noscript>noscript text</noscript><svg><text>svg text</text></svg><canvas>canvas text</canvas>
    <template><article>template text</article></template></main>`;
  for(const scope of ["main","page"]){
    assert.equal(api.extractSourcePreview(html,scope,"text/html").text,"Visible text.");
  }
});

test("main roles and multiple articles are selected in source order without nested duplication",()=>{
  const role=api.extractSourcePreview("<div role='main'><p>Role content.</p><div role='navigation'>Links</div></div>","main","text/html");
  assert.equal(role.text,"Role content.");
  assert.equal(role.usedScope,"main");
  const articles=api.extractSourcePreview("<nav><article>Navigation teaser</article></nav><article><p>First.</p><article>Nested.</article></article><article><p>Second.</p></article>","main","text/html");
  assert.equal(articles.text,"First.\nNested.\nSecond.");
});

test("malformed HTML is repaired deterministically and empty main markup can use article markup",()=>{
  const malformed=api.extractSourcePreview("<main><h1>Heading<p>First<p>Second &amp; third", "main","text/html");
  assert.equal(malformed.text,"Heading\nFirst\nSecond & third");
  assert.equal(malformed.fallback,false);
  const outsideArticle=api.extractSourcePreview("<main><nav>Menu</nav></main><article>Actual story</article>","main","text/html");
  assert.equal(outsideArticle.text,"Actual story");
  assert.equal(outsideArticle.usedScope,"main");
});

test("main absence is an explicit page fallback and plain text is labelled separately",()=>{
  const fallback=api.extractSourcePreview("<body><nav>Home</nav><div>Unmarked article text.</div><footer>Contact</footer></body>","main","text/html");
  assert.equal(fallback.text,"Home\nUnmarked article text.\nContact");
  assert.equal(fallback.usedScope,"page");
  assert.equal(fallback.fallback,true);
  const plain=api.extractSourcePreview("  A <article> example &amp; literal text.\r\nNext line.  ","main","text/plain; charset=utf-8");
  assert.equal(plain.text,"A <article> example &amp; literal text.\nNext line.");
  assert.equal(plain.usedScope,"plain");
  assert.equal(plain.fallback,false);
  assert.equal(api.extractSourcePreview("ordinary text","page").usedScope,"plain");
  assert.equal(api.extractSourcePreview("<main>HTML without a type</main>","main").usedScope,"main");
});

test("empty server responses return a useful structured error instead of an empty preview",()=>{
  for(const raw of ["   ","<html><head><title>App</title></head><body><div id='app'></div><script>renderApp()</script></body></html>"]){
    assert.throws(()=>api.extractSourcePreview(raw,"main"),error=>{
      assert.ok(error instanceof api.PublicApiError);
      assert.equal(error.status,422);
      assert.equal(error.code,"INSUFFICIENT_TEXT");
      assert.match(error.message,/JavaScript.*Paste the text/);
      return true;
    });
  }
});

test("preview text and token limits are enforced before returning a source",()=>{
  assert.throws(()=>api.extractSourcePreview("x".repeat(api.MAX_TEXT_CHARS+1),"page","text/plain"),error=>error.code==="TEXT_TOO_LARGE"&&error.status===413);
  assert.throws(()=>api.extractSourcePreview("a ".repeat(api.MAX_ANALYSIS_TOKENS+1),"main","text/plain"),error=>error.code==="ANALYSIS_TOO_LARGE"&&error.status===413);
  assert.throws(()=>api.extractSourcePreview("1 ".repeat(api.MAX_ANALYSIS_TOKENS+1),"main","text/plain"),error=>error.code==="ANALYSIS_TOO_LARGE"&&error.status===413);
  assert.throws(()=>api.extractSourcePreview(`<${"a ".repeat(api.MAX_ANALYSIS_TOKENS+1)}>`,"main","text/plain"),error=>error.code==="ANALYSIS_TOO_LARGE"&&error.status===413);
});

test("remote preview uses validated DNS-pinned fetching and respects the final content type",async()=>{
  const requests=[];
  const preview=await api.fetchSourcePreview("https://public.example/start","main",{
    lookup:publicLookup,
    fetchImpl:async(url,init,address)=>{
      requests.push({url:url.href,redirect:init.redirect,address,signal:init.signal});
      if(url.pathname==="/start")return new Response(null,{status:302,headers:{location:"/final","content-type":"text/html"}});
      return new Response("Literal <article> text",{headers:{"content-type":"text/plain"}});
    },
  });
  assert.equal(preview.text,"Literal <article> text");
  assert.equal(preview.usedScope,"plain");
  assert.deepEqual(requests.map(request=>request.url),["https://public.example/start","https://public.example/final"]);
  for(const request of requests){
    assert.equal(request.redirect,"manual");
    assert.deepEqual(request.address,{address:"93.184.216.34",family:4});
    assert.ok(request.signal instanceof AbortSignal);
  }
});

test("remote extraction rejects unsafe targets and redirects before an unsafe request",async()=>{
  let requests=0;
  const fetchImpl=async()=>{requests+=1;return new Response(null,{status:302,headers:{location:"http://127.0.0.1/private"}});};
  await assert.rejects(api.fetchSourcePreview("http://127.0.0.1/private","main",{lookup:publicLookup,fetchImpl}),error=>error.code==="UNSAFE_URL");
  assert.equal(requests,0);
  await assert.rejects(api.fetchSourcePreview("https://public.example/start","main",{lookup:publicLookup,fetchImpl}),error=>error.code==="UNSAFE_URL");
  assert.equal(requests,1);
  await assert.rejects(api.fetchSourcePreview("https://public.example/start","main",{
    lookup:async()=>[{address:"10.0.0.1",family:4}],fetchImpl,
  }),error=>error.code==="UNSAFE_URL");
  assert.equal(requests,1);
});

test("remote byte limits and unsupported types remain part of the fetch contract",async()=>{
  await assert.rejects(api.fetchSourcePreview("https://public.example/source","main",{
    lookup:publicLookup,
    budget:api.createRemoteFetchBudget({maxBytes:12}),
    fetchImpl:async()=>new Response("This response is too large",{headers:{"content-type":"text/plain"}}),
  }),error=>error.code==="REMOTE_BUDGET_EXCEEDED");
  await assert.rejects(api.fetchSourcePreview("https://public.example/source","main",{
    lookup:publicLookup,
    fetchImpl:async()=>new Response("{}",{headers:{"content-type":"application/json"}}),
  }),error=>error.code==="UNSUPPORTED_REMOTE_TYPE");
});

let requestSequence=0;
function request(body,headers={}){
  requestSequence+=1;
  return new Request("https://textanalysis.tools/api/source-preview",{
    method:"POST",
    headers:{"content-type":"application/json","x-real-ip":`203.0.113.${requestSequence}`,...headers},
    body:typeof body==="string"?body:JSON.stringify(body),
  });
}

test("the endpoint validates JSON, source, and scope and returns no-store observed errors",async()=>{
  for(const [input,headers,status,code] of [
    ["{",{},400,"INVALID_JSON"],
    [[],{},400,"INVALID_ARGUMENT"],
    [{contentScope:"main"},{},400,"MISSING_SOURCE"],
    [{source:"https://public.example",contentScope:"all"},{},400,"INVALID_ARGUMENT"],
    [{source:"https://public.example",contentScope:"main"},{"content-type":"text/plain"},415,"UNSUPPORTED_MEDIA_TYPE"],
    [{source:"http://127.0.0.1",contentScope:"main"},{},400,"UNSAFE_URL"],
  ]){
    const response=await api.route.POST(request(input,headers));
    assert.equal(response.status,status);
    assert.equal(response.headers.get("cache-control"),"no-store");
    assert.ok(response.headers.get("x-request-id"));
    assert.equal((await response.json()).error.code,code);
    if(code==="UNSAFE_URL")assert.equal(response.headers.get("ratelimit-remaining"),"27");
  }
  const metadata=await api.route.GET(new Request("https://textanalysis.tools/api/source-preview"));
  assert.deepEqual((await metadata.json()).contentScopes,["main","page"]);
  const options=await api.route.OPTIONS(new Request("https://textanalysis.tools/api/source-preview",{method:"OPTIONS"}));
  assert.equal(options.status,204);
});

test("unrelated compound-input fields cannot reduce the URL preview rate-limit cost",async()=>{
  for(const extraFields of [
    {documents:[]},
    {a:{sourceType:"text",source:"short"}},
    {a:{sourceType:"text",source:"short"},b:{sourceType:"text",source:"short"}},
    {documents:[],a:{sourceType:"text"},b:{sourceType:"text"}},
  ]){
    const response=await api.route.POST(request({
      source:"http://127.0.0.1",
      contentScope:"main",
      ...extraFields,
    }));
    assert.equal(response.status,400);
    assert.equal((await response.json()).error.code,"UNSAFE_URL");
    assert.equal(response.headers.get("ratelimit-limit"),"30");
    assert.equal(response.headers.get("ratelimit-remaining"),"27");
  }
});
