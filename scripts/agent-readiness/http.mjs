import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {parse} from "parse5";

const require=createRequire(import.meta.url);
const {setCacheBustingSearchParam}=require("next/dist/client/components/router-reducer/set-cache-busting-search-param.js");
export const SITE_ORIGIN="https://textanalysis.tools";
const EMAIL="alextovt2@gmail.com";
const PROFILES=["https://github.com/Tovt46/textanalysis.tools","https://www.npmjs.com/package/textanalysis-tools"];
const ROUTER_VARY=["rsc","next-router-state-tree","next-router-prefetch","next-router-segment-prefetch"];
const TYPES=["Organization","WebSite","WebPage","WebApplication"];
const nonempty=value=>typeof value==="string"&&value.trim().length>0;
const types=node=>Array.isArray(node?.["@type"])?node["@type"]:[node?.["@type"]];
const attribute=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const hash=value=>createHash("sha256").update(value).digest("hex");

function descendants(root){
  const result=[];
  const visit=node=>{result.push(node);for(const child of node.childNodes??[])visit(child);};
  visit(root);
  return result;
}

export function assertContentSignal(robots){
  const groups=[];
  let group;
  for(const raw of robots.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,"").trim();
    const directive=line.match(/^([^:]+):\s*(.*)$/);
    if(!directive)continue;
    const field=directive[1].trim().toLowerCase();
    if(field==="user-agent"){
      if(!group||group.hasDirectives){group={agents:[],lines:[],hasDirectives:false};groups.push(group);}
      group.agents.push(directive[2].trim().toLowerCase());
    }else if(group){
      group.hasDirectives=true;
      if(field==="content-signal")group.lines.push(line);
    }
  }
  const lines=groups.filter(group=>group.agents.includes("*")).flatMap(group=>group.lines);
  assert.ok(lines.length,"robots.txt has no Content-Signal directive for User-agent: *");
  const signals=new Map();
  for(const line of lines)for(const item of line.replace(/^[^:]+:/,"").split(",")){
    const [key,value]=item.trim().toLowerCase().split(/\s*=\s*/);
    assert.ok(!signals.has(key)||signals.get(key)===value,`Contradictory Content-Signal policy for ${key}`);
    signals.set(key,value);
  }
  assert.equal(signals.get("search"),"yes","Content-Signal must allow search");
  assert.equal(signals.get("ai-train"),"no","Content-Signal must decline AI training");
  return lines;
}

export function assertSitemap(xml,now=Date.now()){
  // Validate the generated sitemap's bounded XML shape before extracting dates.
  // Otherwise a truncated document can retain valid-looking URL fragments.
  const attributes=String.raw`(?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*`;
  const root=xml.match(new RegExp(String.raw`^\s*(?:<\?xml\s+[^?]*\?>\s*)?<urlset${attributes}\s*>([\s\S]*)<\/urlset>\s*$`));
  assert.ok(root,"Sitemap needs one complete urlset root");
  const entryPattern=/<url\s*>([\s\S]*?)<\/url>/g;
  const entries=[...root[1].matchAll(entryPattern)].map(match=>match[1]);
  assert.equal(root[1].replace(entryPattern,"").trim(),"","Sitemap has malformed or unclosed URL containers");
  assert.ok(entries.length>0,"Sitemap has no URL entries");
  const locations=new Set();
  const dates=[];
  for(const entry of entries){
    const remaining=entry.replace(/<(loc|lastmod|changefreq|priority)>[^<>]*<\/\1>/g,"")
      .replace(new RegExp(String.raw`<xhtml:link${attributes}\s*\/>`,"g"),"");
    assert.equal(remaining.trim(),"","Sitemap URL contains malformed XML fields");
    const locs=[...entry.matchAll(/<loc>([^<]+)<\/loc>/g)];
    assert.equal(locs.length,1,"Every sitemap URL needs exactly one loc");
    const location=new URL(locs[0][1]);
    assert.equal(location.origin,SITE_ORIGIN,"Sitemap URL must be canonical");
    assert.ok(!locations.has(location.href),`Duplicate sitemap URL: ${location.href}`);
    locations.add(location.href);
    const values=[...entry.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)];
    assert.equal(values.length,1,`${location.pathname} needs exactly one lastmod`);
    const date=values[0][1];
    assert.match(date,/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/,`Invalid lastmod: ${date}`);
    const timestamp=Date.parse(date);
    assert.ok(Number.isFinite(timestamp),`Invalid lastmod: ${date}`);
    // Date.parse silently normalizes dates such as February 30.
    assert.equal(new Date(Date.parse(date.slice(0,10))).toISOString().slice(0,10),date.slice(0,10),`Invalid calendar date: ${date}`);
    assert.ok(timestamp<=now,`Future lastmod for ${location.pathname}: ${date}`);
    dates.push(date);
  }
  for(const path of ["/","/about","/contact","/privacy"]){
    assert.ok(locations.has(new URL(path,SITE_ORIGIN).href),`Sitemap is missing ${path}`);
  }
  dates.sort();
  return {urls:entries.length,lastmodCount:dates.length,earliest:dates[0],latest:dates.at(-1)};
}

export function parseHomepage(html){
  const nodes=descendants(parse(html));
  const scripts=nodes.filter(node=>node.tagName==="script"&&attribute(node,"type")?.toLowerCase()==="application/ld+json");
  const schemas=[];
  const schemaErrors=[];
  for(const script of scripts){
    try{schemas.push(JSON.parse((script.childNodes??[]).map(node=>node.value??"").join("")));}
    catch(error){schemaErrors.push(error.message);}
  }
  return {
    nodes,
    links:nodes.filter(node=>node.tagName==="a").map(node=>attribute(node,"href")),
    schemas,
    schemaErrors,
    entities:schemas.flatMap(schema=>Array.isArray(schema)?schema:schema?.["@graph"]??[schema]),
  };
}

export function assertJsonLd(home){
  assert.equal(home.schemaErrors.length,0,`Invalid JSON-LD: ${home.schemaErrors.join("; ")}`);
  assert.ok(home.schemas.length>0,"Homepage has no JSON-LD blocks");
  for(const schema of home.schemas){
    assert.ok(schema&&typeof schema==="object"&&!Array.isArray(schema),"JSON-LD must be an object");
    assert.equal(schema["@context"],"https://schema.org","JSON-LD must declare the Schema.org context");
  }
  assert.ok(home.entities.length>0,"JSON-LD has no entities");
  for(const entity of home.entities){
    assert.ok(entity&&typeof entity==="object"&&types(entity).some(nonempty),"JSON-LD entity has no schema type");
  }
  return {blocks:home.schemas.length,entities:home.entities.length};
}

export function assertOrganization(entities){
  const organization=entities.find(node=>types(node).some(type=>["Organization","LocalBusiness"].includes(type)));
  assert.ok(organization,"No Organization or LocalBusiness entity");
  for(const field of ["@id","name","url","description","logo","email"]){
    assert.ok(nonempty(organization[field]),`Organization is missing ${field}`);
  }
  assert.equal(new URL(organization.url).origin,SITE_ORIGIN);
  assert.equal(new URL(organization.logo).origin,SITE_ORIGIN);
  assert.equal(organization.email,EMAIL);
  const contacts=Array.isArray(organization.contactPoint)?organization.contactPoint:[organization.contactPoint];
  assert.ok(contacts.some(contact=>types(contact).includes("ContactPoint")&&nonempty(contact.contactType)&&contact.email===EMAIL),"Organization needs a ContactPoint with an email and contactType");
  return organization;
}

export function assertSameAs(organization){
  assert.ok(Array.isArray(organization?.sameAs)&&organization.sameAs.length>0,"Organization has no sameAs profiles");
  for(const value of organization.sameAs){
    const url=new URL(value);
    assert.equal(url.protocol,"https:","sameAs profiles must use HTTPS");
    assert.notEqual(url.origin,SITE_ORIGIN,"sameAs must point to external profiles");
    assert.ok(!url.username&&!url.password,"sameAs profile contains credentials");
  }
  for(const profile of PROFILES)assert.ok(organization.sameAs.includes(profile),`Missing project profile: ${profile}`);
  return organization.sameAs;
}

export function assertSchemaTypes(entities){
  const found=[...new Set(entities.flatMap(types).filter(nonempty))];
  for(const type of TYPES)assert.ok(found.includes(type),`Missing schema type: ${type}`);
  return found;
}

export function assertLlms(content){
  assert.match(content,/^# [^\n]+\r?\n/,"llms.txt needs a Markdown title");
  assert.match(content,/^> \S.+$/m,"llms.txt needs a blockquote summary");
  assert.match(content,/^## \S.+$/m,"llms.txt needs sections");
  const links=[...content.matchAll(/^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gm)].map(match=>({label:match[1],url:match[2]}));
  assert.ok(links.length>0,"llms.txt has no Markdown links");
  for(const path of ["/","/tools","/agents","/api-docs","/cli","/about","/contact","/privacy"]){
    assert.ok(links.some(link=>link.url===new URL(path,SITE_ORIGIN).href),`llms.txt is missing a Markdown link to ${path}`);
  }
  return {markdownLinks:links.length};
}

export function assertVaryAccept(value,{router=false}={}){
  const fields=(value??"").split(",").map(item=>item.trim().toLowerCase());
  assert.ok(fields.includes("accept"),`Missing exact Vary: Accept token: ${value??"(missing)"}`);
  if(router)for(const field of ROUTER_VARY)assert.ok(fields.includes(field),`Vary is missing ${field}`);
  return fields;
}

export function assertLinkHeader(value){
  const links=[...String(value??"").matchAll(/<([^>]+)>\s*((?:;\s*[^,]+)?)/g)].map(match=>{
    const params=new Map([...match[2].matchAll(/;\s*([\w-]+)\s*=\s*(?:"([^"]*)"|([^;\s,]+))/g)].map(param=>[param[1].toLowerCase(),param[2]??param[3]]));
    return {url:match[1],rel:(params.get("rel")??"").split(/\s+/),type:params.get("type")};
  });
  for(const [path,relation,type] of [["/llms.txt","describedby","text/plain"],["/index.md","alternate","text/markdown"]]){
    assert.ok(links.some(link=>link.url===SITE_ORIGIN+path&&link.rel.includes(relation)&&link.type===type),`Link header needs ${path} with rel=${relation} and type=${type}`);
  }
  return links;
}

export function assertMcpCard(card){
  assert.ok(card&&typeof card==="object","MCP card must be an object");
  assert.ok(nonempty(card.version),"MCP card is missing its version");
  assert.match(card.protocolVersion??"",/^\d{4}-\d{2}-\d{2}$/,"MCP card needs a protocolVersion");
  assert.ok(nonempty(card.serverInfo?.name)&&nonempty(card.serverInfo?.version),"MCP card needs serverInfo name and version");
  assert.equal(card.transport?.type,"streamable-http");
  assert.equal(card.transport.endpoint,SITE_ORIGIN+"/mcp");
  assert.ok(card.capabilities?.tools&&typeof card.capabilities.tools==="object","MCP card needs tools capabilities");
  return card;
}

function assertHtmlCache(headers){
  const control=headers.get("cache-control")??"";
  const ttl=control.match(/(?:^|,)\s*s-maxage=(\d+)(?:\s*(?:,|$))/i);
  assert.ok(ttl&&Number(ttl[1])>0&&Number(ttl[1])<=300,`HTML needs a shared-cache TTL of at most 300 seconds: ${control}`);
  const stale=control.match(/(?:^|,)\s*stale-while-revalidate=(\d+)(?:\s*(?:,|$))/i);
  assert.ok(!stale||Number(stale[1])<=300,`HTML stale cache window exceeds 300 seconds: ${control}`);
}

export async function runHttpChecks({baseUrl,expectedRevision}){
  const base=new URL(baseUrl);
  const checks=[];
  async function request(path,init={}){
    const response=await fetch(new URL(path,base),{redirect:"manual",...init,signal:AbortSignal.timeout(20_000)});
    const text=await response.text();
    return {status:response.status,headers:response.headers,text,json:()=>JSON.parse(text)};
  }
  async function health(){
    const response=await request("/api/health");
    assert.equal(response.status,200,"Deployment health request failed");
    assert.equal(response.headers.get("cache-control"),"no-store","Health must not be cached");
    const body=response.json();
    assert.equal(body.status,"ok","Deployment is unhealthy");
    if(expectedRevision)assert.equal(body.revision,expectedRevision,"The served deployment revision does not match the revision being tested");
    return body;
  }
  const revisionBefore=await health();
  let homePromise;
  const homepage=()=>homePromise??=(async()=>{
    const response=await request("/",{headers:{Accept:"text/html"}});
    assert.equal(response.status,200,"Homepage must return 200");
    assert.match(response.headers.get("content-type")??"",/^text\/html(?:;|$)/);
    return {...response,...parseHomepage(response.text)};
  })();
  async function check(number,name,verify){
    const evidence={};
    try{
      const result=await verify(evidence);
      checks.push({number,name,status:"PASS",evidence:{...evidence,...result}});
    }
    catch(error){
      const last=evidence.requests?.at(-1);
      const context=last?`${last.method} ${last.url} Accept=${JSON.stringify(last.accept)} status=${last.status??"no response"}: `:"";
      checks.push({number,name,status:"FAIL",error:context+error.message,evidence});
    }
  }
  await check(1,"Content Signals declared",async()=>{
    const response=await request("/robots.txt");
    assert.equal(response.status,200);
    return {directives:assertContentSignal(response.text)};
  });
  await check(2,"Sitemap carries lastmod dates for every URL",async()=>{
    const response=await request("/sitemap.xml");
    assert.equal(response.status,200);
    return assertSitemap(response.text);
  });
  await check(3,"Valid JSON-LD on the homepage",async()=>assertJsonLd(await homepage()));
  await check(4,"Complete Organization or LocalBusiness schema",async()=>{
    const org=assertOrganization((await homepage()).entities);
    return {type:org["@type"],name:org.name,url:org.url,email:org.email};
  });
  await check(5,"External identity profiles in sameAs",async()=>{
    const org=assertOrganization((await homepage()).entities);
    return {profiles:assertSameAs(org)};
  });
  await check(6,"Multiple schema types",async()=>({types:assertSchemaTypes((await homepage()).entities)}));
  await check(7,"About, contact and legal pages linked",async()=>{
    const home=await homepage();
    const pages=[];
    for(const path of ["/about","/contact","/privacy"]){
      assert.ok(home.links.some(href=>{try{return new URL(href,SITE_ORIGIN).href===SITE_ORIGIN+path;}catch{return false;}}),`Homepage lacks a link to ${path}`);
      const response=await request(path);
      assert.equal(response.status,200,`${path} must be available`);
      assert.match(response.headers.get("content-type")??"",/^text\/html(?:;|$)/);
      assert.ok(parseHomepage(response.text).nodes.some(node=>node.tagName==="h1"),`${path} has no heading`);
      pages.push(path);
    }
    return {pages};
  });
  await check(8,"Machine-readable contact details",async()=>{
    const home=await homepage();
    assert.ok(home.links.includes(`mailto:${EMAIL}`),"Homepage lacks its public mailto link");
    assert.equal(assertOrganization(home.entities).email,EMAIL);
    return {email:EMAIL,mailto:`mailto:${EMAIL}`};
  });
  await check(9,"Well-formed llms.txt with key Markdown links",async()=>{
    const response=await request("/llms.txt");
    assert.equal(response.status,200);
    return assertLlms(response.text);
  });
  await check(10,"Markdown negotiation and cache isolation",async evidence=>{
    const requests=evidence.requests=[];
    const hashes={html:[],markdown:[]};
    let etag;
    const variant=async(path,init={},negotiated=true)=>{
      const accept=init.headers?.Accept??null;
      const entry={url:new URL(path,base).href,accept,method:init.method??"GET",requestHeaders:init.headers??{},...(init.cache?{requestCache:init.cache}:{})};
      requests.push(entry);
      const response=await request(path,init);
      Object.assign(entry,{status:response.status,headers:Object.fromEntries(response.headers),vary:response.headers.get("vary"),cacheControl:response.headers.get("cache-control"),edgeCache:response.headers.get("x-hcdn-cache-status"),etag:response.headers.get("etag"),hash:hash(response.text),bytes:Buffer.byteLength(response.text)});
      if(response.status>=400)entry.bodyPreview=response.text.slice(0,1000);
      // Preserve the complete response before any assertion so a region-specific
      // CDN failure identifies the actual GET/HEAD/304/Flight variant and headers.
      if(negotiated)assertVaryAccept(response.headers.get("vary"),{router:accept==="text/html"});
      return response;
    };
    // Use the canonical URL and ordinary request headers: a cache-busting query
    // or Cache-Control: no-cache would hide cross-representation CDN regressions.
    for(let round=0;round<3;round++)for(const kind of ["html","markdown"]){
      const accept=`text/${kind}`;
      const response=await variant("/",{headers:{Accept:accept}});
      assert.equal(response.status,200);
      assert.match(response.headers.get("content-type")??"",kind==="html"?/^text\/html(?:;|$)/:/^text\/markdown(?:;|$)/);
      assert.match(response.text,kind==="html"?/<h1\b/:/^# Text Analysis Tools/);
      hashes[kind].push(hash(response.text));
      if(kind==="html"){
        assertHtmlCache(response.headers);
        etag=response.headers.get("etag");
        assert.ok(etag,"HTML must provide an ETag");
      }
    }
    assert.equal(new Set(hashes.html).size,1,"Warm HTML representation changed during negotiation");
    assert.equal(new Set(hashes.markdown).size,1,"Warm Markdown representation changed during negotiation");
    assert.notEqual(hashes.html[0],hashes.markdown[0],"HTML and Markdown must be different representations");
    const direct=await variant("/index.md",{},false);
    assert.equal(direct.status,200);
    assert.match(direct.headers.get("content-type")??"",/^text\/markdown(?:;|$)/);
    assert.equal(hash(direct.text),hashes.markdown[0],"Negotiated Markdown differs from its advertised alternate");
    for(const accept of ["text/markdown;q=0, text/html","text/markdown;q=0.2, text/html;q=0.9"]){
      const response=await variant("/",{headers:{Accept:accept}});
      assert.equal(response.status,200);
      assert.match(response.headers.get("content-type")??"",/^text\/html(?:;|$)/);
    }
    for(const kind of ["html","markdown"]){
      const accept=`text/${kind}`;
      const response=await variant("/",{method:"HEAD",headers:{Accept:accept}});
      assert.equal(response.status,200);
      assert.equal(response.text,"");
      assert.match(response.headers.get("content-type")??"",kind==="html"?/^text\/html(?:;|$)/:/^text\/markdown(?:;|$)/);
    }
    // Node fetch otherwise adds Cache-Control: no-cache for conditional headers,
    // which asks Next to ignore the validator. This mode sends max-age=0 instead.
    const unchanged=await variant("/",{headers:{Accept:"text/html","If-None-Match":etag},cache:"no-cache"});
    assert.equal(unchanged.status,304,"Matching HTML ETag must return 304");
    assert.equal(unchanged.text,"");
    assertHtmlCache(unchanged.headers);
    const cross=await variant("/",{headers:{Accept:"text/markdown","If-None-Match":etag},cache:"no-cache"});
    assert.equal(cross.status,200,"An HTML ETag must not validate a Markdown representation");
    assert.match(cross.headers.get("content-type")??"",/^text\/markdown(?:;|$)/);
    assert.equal(hash(cross.text),hashes.markdown[0]);
    // Next's real client transport always adds its _rsc marker; use the
    // installed helper so this exercises Flight rather than a synthetic header.
    const flightHeaders={Accept:"text/x-component",rsc:"1"};
    const flightUrl=new URL("/",base);
    await setCacheBustingSearchParam(flightUrl,flightHeaders);
    evidence.rsc={url:flightUrl.href,requestHeaders:flightHeaders};
    const flight=await variant(flightUrl,{headers:flightHeaders},false);
    Object.assign(evidence.rsc,{status:flight.status,type:flight.headers.get("content-type"),vary:flight.headers.get("vary"),headers:Object.fromEntries(flight.headers)});
    assert.equal(flight.status,200);
    assert.match(flight.headers.get("content-type")??"",/^text\/x-component(?:;|$)/);
    assertVaryAccept(flight.headers.get("vary"),{router:true});
    assert.doesNotMatch(flight.text,/^<!doctype html/i);
    return evidence;
  });
  await check(11,"Homepage resource Link response headers",async()=>{
    const home=await homepage();
    assertVaryAccept(home.headers.get("vary"),{router:true});
    const html=assertLinkHeader(home.headers.get("link"));
    const markdown=await request("/",{headers:{Accept:"text/markdown"}});
    assert.equal(markdown.status,200);
    assertVaryAccept(markdown.headers.get("vary"));
    return {html,markdown:assertLinkHeader(markdown.headers.get("link"))};
  });
  await check(13,"MCP Server Card and real analysis protocol",async()=>{
    const response=await request("/.well-known/mcp/server-card.json");
    assert.equal(response.status,200);
    assert.match(response.headers.get("content-type")??"",/^application\/json(?:;|$)/);
    assert.equal(response.headers.get("access-control-allow-origin"),"*");
    const card=assertMcpCard(response.json());
    // The card advertises the canonical public endpoint. Resolve its path on
    // the test origin so local CI never makes accidental calls to production.
    const endpoint=new URL(card.transport.endpoint).pathname;
    let id=0;
    async function rpc(method,params){
      const response=await request(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream",...(method!=="initialize"?{"MCP-Protocol-Version":card.protocolVersion}:{})},body:JSON.stringify({jsonrpc:"2.0",id:++id,method,params})});
      assert.equal(response.status,200,`${method}: ${response.text.slice(0,300)}`);
      assert.equal(response.headers.get("access-control-allow-origin"),"*");
      assert.equal(response.headers.get("cache-control"),"no-store");
      const body=response.json();
      assert.equal(body.jsonrpc,"2.0");
      assert.equal(body.id,id);
      assert.ok(!body.error,`${method}: ${JSON.stringify(body.error)}`);
      return body.result;
    }
    const initialized=await rpc("initialize",{protocolVersion:card.protocolVersion,capabilities:{},clientInfo:{name:"textanalysis-agent-readiness-ci",version:"1.0"}});
    assert.equal(initialized.protocolVersion,card.protocolVersion);
    assert.deepEqual(initialized.serverInfo,card.serverInfo);
    assert.deepEqual(initialized.capabilities.tools,card.capabilities.tools);
    const listed=await rpc("tools/list",{});
    const tool=listed.tools?.find(tool=>tool.name==="analyze_text");
    assert.ok(tool,"MCP tools/list is missing analyze_text");
    assert.ok(nonempty(tool.description));
    assert.equal(tool.inputSchema?.type,"object");
    assert.ok(tool.inputSchema.required?.includes("source"));
    const analyzed=await rpc("tools/call",{name:"analyze_text",arguments:{source:"agent agent discovery",language:"en",keepStopwords:true}});
    assert.equal(analyzed.isError,false);
    const output=JSON.parse(analyzed.content?.find(item=>item.type==="text")?.text??"null");
    assert.equal(output?.storage,"none");
    assert.equal(output?.result?.tokenCount,3);
    assert.equal(output?.result?.vocabularySize,2);
    assert.equal(output?.result?.rows?.find(row=>row.term==="agent")?.actualCount,2);
    const preflight=await request(endpoint,{method:"OPTIONS",headers:{Origin:"https://untrusted.example","Access-Control-Request-Method":"POST"}});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get("access-control-allow-origin"),"*");
    const rejected=await request(endpoint,{method:"POST",headers:{Origin:"https://untrusted.example","Content-Type":"application/json"},body:"{}"});
    assert.equal(rejected.status,403,"MCP must reject untrusted browser origins");
    return {serverInfo:card.serverInfo,protocolVersion:initialized.protocolVersion,tools:listed.tools.map(tool=>tool.name),tokenCount:output.result.tokenCount,vocabularySize:output.result.vocabularySize,untrustedOriginStatus:rejected.status};
  });
  const revisionAfter=await health();
  assert.equal(revisionAfter.revision,revisionBefore.revision,"Deployment changed while agent readiness was being verified");
  checks.at(-1).evidence={...checks.at(-1).evidence,revisionBefore:revisionBefore.revision,revisionAfter:revisionAfter.revision};
  return checks;
}
