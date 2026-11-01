import assert from "node:assert/strict";
import test from "node:test";
const base=process.env.TEST_BASE_URL;
const request=(path,options)=>fetch(new URL(path,base),options);

test("agent discovery, sitemap dates, structured identity, and Markdown negotiation",{skip:!base},async()=>{
  const htmlResponse=await request("/");
  assert.match(htmlResponse.headers.get("link"),/llms\.txt/);
  assert.match(htmlResponse.headers.get("vary"),/Accept/i);
  const html=await htmlResponse.text();
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match=>JSON.parse(match[1]));
  const nodes=schemas.flatMap(schema=>schema["@graph"]??[schema]);
  for(const type of ["Organization","WebSite","WebPage","WebApplication"])assert.ok(nodes.some(node=>node["@type"]===type),type);
  const org=nodes.find(node=>node["@type"]==="Organization");
  assert.equal(org.email,"alextovt2@gmail.com");
  assert.ok(org.sameAs.includes("https://github.com/Tovt46/textanalysis.tools"));
  for(const href of ["/about","/contact","/privacy","mailto:alextovt2@gmail.com"])assert.ok(html.includes(`href="${href}"`),href);
  const markdown=await request("/",{headers:{Accept:"text/markdown"}});
  assert.match(markdown.headers.get("content-type"),/^text\/markdown/);
  assert.match(await markdown.text(),/^# Text Analysis Tools/);
  for(const accept of ["text/markdown;q=0, text/html","text/markdown;q=0.2, text/html;q=0.9"]){
    assert.match((await request("/",{headers:{Accept:accept}})).headers.get("content-type"),/^text\/html/);
  }
  const head=await request("/",{method:"HEAD",headers:{Accept:"text/markdown"}});
  assert.match(head.headers.get("content-type"),/^text\/markdown/);
  assert.equal(await head.text(),"");
  assert.match(await (await request("/robots.txt")).text(),/Content-Signal: search=yes, ai-train=no/);
  const xml=await (await request("/sitemap.xml")).text();
  for(const [entry] of xml.matchAll(/<url>.*?<\/url>/gs)){
    assert.match(entry,/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    assert.doesNotMatch(entry,/undefined/);
  }
  const llms=await (await request("/llms.txt")).text();
  assert.match(llms,/^- \[Product homepage\]\(https:\/\/textanalysis.tools\/\)/m);
  for(const path of ["/about","/contact","/index.md"])assert.equal((await request(path)).status,200,path);
});

test("MCP card describes a working stateless HTTP analysis tool",{skip:!base},async()=>{
  const cardResponse=await request("/.well-known/mcp/server-card.json");
  assert.equal(cardResponse.status,200);
  assert.equal(cardResponse.headers.get("access-control-allow-origin"),"*");
  const card=await cardResponse.json();
  assert.equal(card.transport.endpoint,"https://textanalysis.tools/mcp");
  const rpc=async(method,params,id=1)=>{
    const response=await request("/mcp",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id,method,params})});
    assert.equal(response.status,200,await response.clone().text());
    return response.json();
  };
  const initialized=await rpc("initialize",{protocolVersion:card.protocolVersion,capabilities:{},clientInfo:{name:"readiness-test",version:"1.0"}});
  assert.deepEqual(initialized.result.serverInfo,card.serverInfo);
  assert.deepEqual(initialized.result.capabilities.tools,card.capabilities.tools);
  const listed=await rpc("tools/list",{});
  assert.equal(listed.result.tools[0].name,"analyze_text");
  const analyzed=await rpc("tools/call",{name:"analyze_text",arguments:{source:"agent agent discovery",language:"en",keepStopwords:true}});
  assert.equal(analyzed.result.isError,false);
  assert.ok(JSON.parse(analyzed.result.content[0].text).result);
  assert.equal((await request("/mcp",{method:"POST",headers:{Origin:"https://untrusted.example","Content-Type":"application/json"},body:"{}"})).status,403);
});
