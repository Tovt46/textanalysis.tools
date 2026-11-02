import assert from "node:assert/strict";
import {createServer} from "node:http";
import test from "node:test";
import {
  assertContentSignal,assertJsonLd,assertLinkHeader,assertLlms,assertMcpCard,
  assertOrganization,assertSameAs,assertSchemaTypes,assertSitemap,assertVaryAccept,parseHomepage,runHttpChecks,
} from "../scripts/agent-readiness/http.mjs";

const site="https://textanalysis.tools";
const organization={
  "@type":"Organization","@id":`${site}/#organization`,name:"Text Analysis Tools",url:site,
  description:"Text analysis",logo:`${site}/logo.png`,email:"alextovt2@gmail.com",
  contactPoint:{"@type":"ContactPoint",contactType:"support",email:"alextovt2@gmail.com"},
  sameAs:["https://github.com/Tovt46/textanalysis.tools","https://www.npmjs.com/package/textanalysis-tools"],
};
const graph={"@context":"https://schema.org","@graph":[organization,...["WebSite","WebPage","WebApplication"].map(type=>({"@type":type}))]};
const html=schema=>`<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><a href="/about">About</a></body></html>`;
const sitemap=(date="2026-11-01")=>`<urlset>${["/","/about","/contact","/privacy"].map(path=>`<url><loc>${site}${path}</loc><lastmod>${date}</lastmod></url>`).join("")}</urlset>`;
const now=Date.parse("2026-11-02T00:00:00Z");

test("robots policy requires real search and AI-training directives",()=>{
  assert.doesNotThrow(()=>assertContentSignal("User-agent: *\nContent-Signal: search=yes, ai-train=no\n"));
  for(const robots of ["# Content-Signal: search=yes, ai-train=no","Content-Signal: search=yes","Content-Signal: search=no, ai-train=yes"]){
    assert.throws(()=>assertContentSignal(robots));
  }
});

test("Content Signals apply to wildcard agents without conflicting group policies",()=>{
  const expected="Content-Signal: search=yes, ai-train=no";
  const opposite="Content-Signal: search=no, ai-train=yes";
  assert.doesNotThrow(()=>assertContentSignal(`User-agent: *\n${expected}\n\nUser-agent: SomeBot\n${opposite}`));
  assert.doesNotThrow(()=>assertContentSignal(`User-agent: *\nUser-agent: SomeBot\nAllow: /\n${expected} # policy comment`));
  for(const robots of [
    `User-agent: *\n${opposite}\n\nUser-agent: SomeBot\n${expected}`,
    `User-agent: *\nAllow: /\nUser-agent: SomeBot\n${expected}`,
    `User-agent: SomeBot\n${expected}`,
    `User-agent: *\n${opposite}\n${expected}`,
    `User-agent: *\n${opposite}\nUser-agent: *\n${expected}`,
    `User-agent: *\nContent-Signal: search=no, search=yes, ai-train=no`,
  ])assert.throws(()=>assertContentSignal(robots));
});

test("every sitemap URL needs a valid, nonfuture lastmod",()=>{
  assert.equal(assertSitemap(sitemap(),now).lastmodCount,4);
  for(const xml of [
    "<urlset></urlset>",
    sitemap().replace("<lastmod>2026-11-01</lastmod>",""),
    sitemap("undefined"),sitemap("2026-02-30"),sitemap("2026-13-01"),sitemap("2026-11-03"),
    sitemap().replace(`${site}/about`,"https://wrong.example/about"),
    sitemap().replace(`${site}/contact`,`${site}/about`),
  ])assert.throws(()=>assertSitemap(xml,now));
});

test("sitemap validation rejects truncated roots and unclosed or nested URL containers",()=>{
  for(const xml of [
    sitemap().replace("</urlset>",""),
    sitemap()+"</urlset>",
    sitemap().replace("</url>",""),
    sitemap().replace("<url>","<url><url>"),
    sitemap().replace("</lastmod>","</loc>"),
    `<urlset>${sitemap()}</urlset>`,
  ])assert.throws(()=>assertSitemap(xml,now));
});

test("JSON-LD rejects absent, malformed, empty and contextless blocks",()=>{
  const parsed=parseHomepage(html(graph));
  assert.deepEqual(assertJsonLd(parsed),{blocks:1,entities:4});
  assert.deepEqual(parsed.links,["/about"]);
  for(const content of [
    "<h1>No schema</h1>",
    '<script type="application/ld+json">{bad JSON}</script>',
    html({"@context":"https://schema.org","@graph":[]}),
    html({"@graph":[organization]}),
    html({"@context":"https://schema.org","@graph":[{}]}),
    html(graph)+'<script type="application/ld+json">broken</script>',
  ])assert.throws(()=>assertJsonLd(parseHomepage(content)));
});

test("Organization completeness includes a usable structured contact",()=>{
  assert.equal(assertOrganization(graph["@graph"]).email,"alextovt2@gmail.com");
  for(const field of ["@id","name","url","description","logo","email","contactPoint"]){
    const incomplete=structuredClone(organization);
    delete incomplete[field];
    assert.throws(()=>assertOrganization([incomplete]),field);
  }
  assert.throws(()=>assertOrganization([{...organization,contactPoint:{email:organization.email}}]));
  assert.throws(()=>assertOrganization([{...organization,url:"https://wrong.example"}]));
  assert.throws(()=>assertOrganization([{...organization,email:"unrelated@example.com"}]));
});

test("sameAs must retain both public project identities with HTTPS",()=>{
  assert.deepEqual(assertSameAs(organization),organization.sameAs);
  for(const sameAs of [undefined,[],[organization.sameAs[0]],[`${site}/about`],["http://github.com/Tovt46/textanalysis.tools"],organization.sameAs.concat("https://user:secret@external.example/profile")]){
    assert.throws(()=>assertSameAs({...organization,sameAs}));
  }
});

test("schema coverage rejects loss of any required entity type",()=>{
  assert.equal(assertSchemaTypes(graph["@graph"]).length,4);
  for(const type of ["Organization","WebSite","WebPage","WebApplication"]){
    assert.throws(()=>assertSchemaTypes(graph["@graph"].filter(node=>node["@type"]!==type)),type);
  }
});

test("llms.txt needs a title, blockquote, sections and actual links to key pages",()=>{
  const content=["# Text Analysis Tools","> Text analysis for agents","## Pages",...["/","/tools","/agents","/api-docs","/cli","/about","/contact","/privacy"].map(path=>`- [${path}](${site}${path})`)].join("\n");
  assert.equal(assertLlms(content).markdownLinks,8);
  for(const invalid of [
    content.replace("# Text Analysis Tools","Text Analysis Tools"),
    content.replace("> Text analysis for agents","Text analysis for agents"),
    content.replace("## Pages","Pages"),
    content.replace(`- [/contact](${site}/contact)`,`${site}/contact`),
    content.replaceAll("https://textanalysis.tools","https://wrong.example"),
  ])assert.throws(()=>assertLlms(invalid));
});

test("Accept-Encoding alone cannot satisfy the exact Vary Accept requirement",()=>{
  assert.doesNotThrow(()=>assertVaryAccept("Accept-Encoding, ACCEPT"));
  for(const value of [undefined,"","Accept-Encoding","X-Accept, Accept-Encoding","*"]){
    assert.throws(()=>assertVaryAccept(value));
  }
  assert.throws(()=>assertVaryAccept("Accept, RSC",{router:true}));
  assert.doesNotThrow(()=>assertVaryAccept("Accept, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch",{router:true}));
});

test("Link relations and media types must belong to the correct resource",()=>{
  const header=`<${site}/llms.txt>; rel="describedby"; type="text/plain", <${site}/index.md>; rel="alternate"; type="text/markdown"`;
  assert.equal(assertLinkHeader(header).length,2);
  for(const invalid of [undefined,"",header.replace("describedby","alternate"),header.replace("text/markdown","text/html"),header.replace("/index.md","/missing.md"),header.replace('rel="describedby"','rel="alternate"').replace('rel="alternate"; type="text/markdown"','rel="describedby"; type="text/markdown"')]){
    assert.throws(()=>assertLinkHeader(invalid));
  }
});

test("MCP card requires version, protocol, transport, identity and tools capabilities",()=>{
  const card={version:"1.0",protocolVersion:"2025-03-26",serverInfo:{name:"textanalysis-tools-http",version:"0.2.0"},transport:{type:"streamable-http",endpoint:`${site}/mcp`},capabilities:{tools:{listChanged:true}}};
  assert.equal(assertMcpCard(card),card);
  for(const field of ["version","protocolVersion","serverInfo","transport","capabilities"]){
    const incomplete=structuredClone(card);
    delete incomplete[field];
    assert.throws(()=>assertMcpCard(incomplete),field);
  }
  assert.throws(()=>assertMcpCard({...card,transport:{type:"stdio",endpoint:`${site}/mcp`}}));
  assert.throws(()=>assertMcpCard({...card,transport:{type:"streamable-http",endpoint:"https://wrong.example/mcp"}}));
  assert.throws(()=>assertMcpCard({...card,capabilities:{resources:{}}}));
});

test("HTTP gate reports every missing readiness capability as a failure",async()=>{
  const requested=[];
  const revision="abcd1234";
  const server=createServer((request,response)=>{
    requested.push(request.url);
    if(request.url==="/api/health"){
      response.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
      response.end(JSON.stringify({status:"ok",revision}));
    }else{
      response.writeHead(404,{"content-type":"text/plain"});
      response.end("Missing capability");
    }
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  try{
    const checks=await runHttpChecks({baseUrl:`http://127.0.0.1:${server.address().port}`,expectedRevision:revision});
    assert.deepEqual(checks.map(check=>check.number),[1,2,3,4,5,6,7,8,9,10,11,13]);
    assert.ok(checks.every(check=>check.status==="FAIL"&&check.error));
    assert.equal(requested.filter(path=>path==="/api/health").length,2);
    for(const path of ["/robots.txt","/sitemap.xml","/","/llms.txt","/.well-known/mcp/server-card.json"]){
      assert.ok(requested.includes(path),path);
    }
  }finally{
    await new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});
  }
});
