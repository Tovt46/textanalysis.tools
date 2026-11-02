import assert from "node:assert/strict";
import test from "node:test";
import {patchVaryTemplate} from "../scripts/patch-next-vary.mjs";

const renderer=`            const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);
            res.setHeader('Vary', varyHeader);`;
const framework="rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";
function renderVary(existing){
  let output;
  const render=new Function("res","routeModule","resolvedPathname","interceptionRoutePatterns",patchVaryTemplate(renderer));
  render({getHeader:()=>existing,setHeader(name,value){assert.equal(name,"Vary");output=value;}},{getVaryHeader:()=>framework},"/",[]);
  return output;
}
const tokens=response=>(response.headers.get("vary")??"").split(",").map(token=>token.trim().toLowerCase());
const base=process.env.TEST_BASE_URL;
// Fetch otherwise adds Cache-Control: no-cache for conditional requests, which
// asks Next to ignore the validator. max-age=0 requests actual revalidation.
const request=(headers={},method="GET")=>fetch(new URL("/",base),{method,headers,...(headers["If-None-Match"]?{cache:"no-cache"}:{})});

test("page header merge preserves negotiation, compression and framework cache keys",()=>{
  assert.equal(renderVary("Accept, Accept-Encoding, RSC"),"Accept, Accept-Encoding, RSC, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch");
  assert.equal(renderVary(["Accept, accept", "Accept-Encoding"]),`Accept, Accept-Encoding, ${framework}`);
  assert.equal(renderVary(undefined),framework);
  assert.equal(renderVary(["Accept","*",framework]),"*");
});

test("build compatibility patch is idempotent and rejects unexpected framework templates",()=>{
  const once=patchVaryTemplate(renderer);
  assert.equal(patchVaryTemplate(once),once);
  assert.throws(()=>patchVaryTemplate("unexpected renderer"),/template changed/);
  assert.throws(()=>patchVaryTemplate(renderer+renderer),/template changed/);
});

test("homepage HTML and Markdown vary on exact Accept tokens across warm GET, HEAD and 304 responses",{skip:!base},async()=>{
  const html=await request({Accept:"text/html"});
  assert.equal(html.status,200);
  assert.match(html.headers.get("cache-control"),/s-maxage=300(?:\D|$)/);
  const etag=html.headers.get("etag");
  assert.ok(etag);
  const htmlBody=await html.text();
  assert.match(htmlBody,/<h1/);
  for(const accept of ["text/markdown","text/html","text/markdown;q=0, text/html","text/markdown;q=0.2, text/html;q=0.9","text/markdown"]){
    const response=await request({Accept:accept});
    assert.equal(response.status,200);
    assert.ok(tokens(response).includes("accept"),`${accept}: ${response.headers.get("vary")}`);
    const isMarkdown=accept==="text/markdown";
    assert.match(response.headers.get("content-type"),isMarkdown?/^text\/markdown/:/^text\/html/);
    const body=await response.text();
    assert.match(body,isMarkdown?/^# Text Analysis Tools/:/<h1/);
    if(!isMarkdown){
      for(const field of framework.split(", "))assert.ok(tokens(response).includes(field));
      assert.match(response.headers.get("cache-control"),/s-maxage=300(?:\D|$)/);
    }
  }
  for(const accept of ["text/html","text/markdown"]){
    const response=await request({Accept:accept},"HEAD");
    assert.equal(response.status,200);
    assert.ok(tokens(response).includes("accept"));
    assert.match(response.headers.get("content-type"),accept==="text/html"?/^text\/html/:/^text\/markdown/);
    assert.equal(await response.text(),"");
  }
  const unchanged=await request({Accept:"text/html","If-None-Match":etag});
  assert.equal(unchanged.status,304);
  assert.ok(tokens(unchanged).includes("accept"));
  for(const field of framework.split(", "))assert.ok(tokens(unchanged).includes(field));
  const markdownWithHtmlTag=await request({Accept:"text/markdown","If-None-Match":etag});
  assert.equal(markdownWithHtmlTag.status,200);
  assert.match(await markdownWithHtmlTag.text(),/^# Text Analysis Tools/);
});


test("RSC responses preserve router cache fields alongside Accept",{skip:!base},async()=>{
  const response=await request({Accept:"text/x-component",RSC:"1"});
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type"),/^text\/x-component/);
  for(const field of ["accept",...framework.split(", ")])assert.ok(tokens(response).includes(field),field);
  assert.ok(!(await response.text()).startsWith("<!DOCTYPE"));
});
