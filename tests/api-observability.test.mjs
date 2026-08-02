import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL,fileURLToPath} from "node:url";
import test,{after} from "node:test";
import {build} from "esbuild";

const buildDirectory=await mkdtemp(join(tmpdir(),"textanalysis-observability-"));
const bundledModule=join(buildDirectory,"api-observability.mjs");
const bundledHealthRoute=join(buildDirectory,"health-route.mjs");
const bundledAnalyzeRoute=join(buildDirectory,"analyze-route.mjs");
await build({
  entryPoints:[fileURLToPath(new URL("../app/lib/api-observability.ts",import.meta.url))],
  outfile:bundledModule,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
await build({
  entryPoints:[fileURLToPath(new URL("../app/api/health/route.ts",import.meta.url))],
  outfile:bundledHealthRoute,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
await build({
  entryPoints:[fileURLToPath(new URL("../app/api/v1/analyze/route.ts",import.meta.url))],
  outfile:bundledAnalyzeRoute,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
const observability=await import(`${pathToFileURL(bundledModule).href}?test=${Date.now()}`);
const healthRoute=await import(`${pathToFileURL(bundledHealthRoute).href}?test=${Date.now()}`);
const analyzeRoute=await import(`${pathToFileURL(bundledAnalyzeRoute).href}?test=${Date.now()}`);
after(()=>rm(buildDirectory,{recursive:true,force:true}));

function clock(...values){
  let index=0;
  return ()=>values[Math.min(index++,values.length-1)];
}

test("adds a request ID and logs only the bounded operational schema",async()=>{
  const lines=[];
  const sensitiveText="private draft and confidential result term";
  const request=new Request("https://textanalysis.tools/api/v1/analyze?target=https://secret.example/private",{
    method:"POST",
    headers:{"content-type":"application/json","x-forwarded-for":"192.0.2.25"},
    body:JSON.stringify({source:sensitiveText}),
  });
  const response=await observability.observeApiRequest(
    request,
    "analyze",
    ()=>new Response("Привет",{status:200,headers:{"Access-Control-Expose-Headers":"RateLimit-Limit"}}),
    {now:clock(1_725_000_000_000,1_725_000_000_012),requestId:()=>"00000000-0000-4000-8000-000000000001",writeLog:line=>lines.push(line)},
  );

  assert.equal(response.headers.get("x-request-id"),"00000000-0000-4000-8000-000000000001");
  assert.match(response.headers.get("access-control-expose-headers"),/X-Request-ID/);
  assert.equal(lines.length,0,"the response body is counted without delaying the handler");
  assert.equal(await response.text(),"Привет");
  assert.equal(lines.length,1);

  const event=JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(event),[
    "event","timestamp","requestId","operation","method","status","durationMs","responseBytes","errorClass",
  ]);
  assert.deepEqual(event,{
    event:"api_request",
    timestamp:"2024-08-30T06:40:00.000Z",
    requestId:"00000000-0000-4000-8000-000000000001",
    operation:"analyze",
    method:"POST",
    status:200,
    durationMs:12,
    responseBytes:new TextEncoder().encode("Привет").byteLength,
    errorClass:null,
  });
  assert.doesNotMatch(lines[0],/secret|private draft|confidential|192\.0\.2\.25/i);
});

test("classifies quota responses without inspecting or logging their body",async()=>{
  const lines=[];
  const responseBody=JSON.stringify({error:{code:"RATE_LIMITED",message:"sensitive diagnostic"}});
  const response=await observability.observeApiRequest(
    new Request("https://textanalysis.tools/api/v1/analyze",{method:"POST"}),
    "analyze",
    ()=>new Response(responseBody,{status:429}),
    {now:clock(100,104),requestId:()=>"request-2",writeLog:line=>lines.push(line)},
  );
  await response.arrayBuffer();
  const event=JSON.parse(lines[0]);
  assert.equal(event.status,429);
  assert.equal(event.errorClass,"rate_limit");
  assert.equal(event.responseBytes,new TextEncoder().encode(responseBody).byteLength);
  assert.doesNotMatch(lines[0],/RATE_LIMITED|sensitive diagnostic/);
});

test("uses an explicitly marked safe error class without exposing error content",async()=>{
  const lines=[];
  const response=await observability.observeApiRequest(
    new Request("https://textanalysis.tools/api/v1/analyze",{method:"POST"}),
    "analyze",
    ()=>observability.markApiResponseErrorClass(
      new Response(JSON.stringify({error:{code:"INSUFFICIENT_TEXT",message:"private source detail"}}),{status:422}),
      "unprocessable_input",
    ),
    {now:clock(150,155),requestId:()=>"request-marked",writeLog:line=>lines.push(line)},
  );
  await response.arrayBuffer();
  const event=JSON.parse(lines[0]);
  assert.equal(event.errorClass,"unprocessable_input");
  assert.doesNotMatch(lines[0],/INSUFFICIENT_TEXT|private source detail/);
});

test("records a safe class and rethrows unexpected handler errors",async()=>{
  const lines=[];
  const failure=new Error("submitted URL https://private.example must not be logged");
  await assert.rejects(
    observability.observeApiRequest(
      new Request("https://textanalysis.tools/api/v1/analyze",{method:"POST"}),
      "analyze",
      ()=>{throw failure;},
      {now:clock(200,209),requestId:()=>"request-3",writeLog:line=>lines.push(line)},
    ),
    error=>error===failure,
  );
  assert.equal(lines.length,1);
  const event=JSON.parse(lines[0]);
  assert.equal(event.status,500);
  assert.equal(event.responseBytes,0);
  assert.equal(event.errorClass,"unexpected_exception");
  assert.doesNotMatch(lines[0],/private\.example|must not be logged/);
});

test("logging failures cannot break a completed API response",async()=>{
  const response=await observability.observeApiRequest(
    new Request("https://textanalysis.tools/api/health"),
    "health",
    ()=>new Response(null,{status:204}),
    {now:clock(300,301),requestId:()=>"request-4",writeLog:()=>{throw new Error("logger unavailable");}},
  );
  assert.equal(response.status,204);
  assert.equal(await response.text(),"");
});

test("health endpoint returns only bounded liveness metadata",async()=>{
  const lines=[];
  const originalInfo=console.info;
  console.info=line=>lines.push(String(line));
  try{
    const response=await healthRoute.GET(new Request("https://textanalysis.tools/api/health"));
    assert.equal(response.status,200);
    assert.equal(response.headers.get("cache-control"),"no-store");
    assert.match(response.headers.get("x-request-id"),/^[0-9a-f-]{36}$/);
    const body=await response.json();
    assert.deepEqual({...body,rateLimit:undefined,revision:undefined},{
      status:"ok",
      service:"textanalysis.tools",
      apiVersion:"1.0",
      storage:"none",
      rateLimit:undefined,
      revision:undefined,
    });
    assert.ok(["shared","local","degraded"].includes(body.rateLimit));
    assert.match(body.revision,/^(?:[0-9a-f]{7,64}|unknown)$/);
    assert.equal(lines.length,1);
    const event=JSON.parse(lines[0]);
    assert.equal(event.operation,"health");
    assert.equal(event.status,200);
    assert.equal(event.errorClass,null);
    assert.ok(event.responseBytes>0);
  }finally{
    console.info=originalInfo;
  }
});

test("versioned route propagates request IDs and a safe API error class",async()=>{
  const lines=[];
  const originalInfo=console.info;
  console.info=line=>lines.push(String(line));
  try{
    const response=await analyzeRoute.POST(new Request("https://textanalysis.tools/api/v1/analyze",{
      method:"POST",
      headers:{"content-type":"application/json","x-real-ip":"203.0.113.201"},
      body:JSON.stringify({source:"one",language:"en"}),
    }));
    assert.equal(response.status,422);
    assert.match(response.headers.get("x-request-id"),/^[0-9a-f-]{36}$/);
    assert.equal((await response.json()).error.code,"INSUFFICIENT_TEXT");
    assert.equal(lines.length,1);
    const event=JSON.parse(lines[0]);
    assert.equal(event.operation,"analyze");
    assert.equal(event.status,422);
    assert.equal(event.errorClass,"unprocessable_input");
    assert.doesNotMatch(lines[0],/one|INSUFFICIENT_TEXT|203\.0\.113\.201/);
  }finally{
    console.info=originalInfo;
  }
});
