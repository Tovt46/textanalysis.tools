import assert from "node:assert/strict";
import test from "node:test";
import {waitForDeployment} from "../scripts/wait-for-deployment.mjs";

const revision="0b4e7a16a386746a11af711d55861bbebd695d63";
const quiet=()=>{};
const healthResponse=body=>new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});

test("deployment wait polls only uncached health and requires an exact revision",async()=>{
  const calls=[];
  const pauses=[];
  const responses=[
    {revision:revision.slice(0,7)},
    {revision:"0816934b90a0798d2c0e127c78ddaa7929501f5d"},
    {revision,status:"ok"},
  ];
  const health=await waitForDeployment({
    baseUrl:"https://textanalysis.tools/some/path?cached=true",
    expectedRevision:` ${revision.toUpperCase()} `,
    intervalMs:17,
    request:async(url,options)=>{
      calls.push({url:url.href,options});
      return healthResponse(responses.shift());
    },
    pause:async milliseconds=>pauses.push(milliseconds),
    log:quiet,
  });
  assert.equal(health.revision,revision);
  assert.equal(calls.length,3);
  assert.deepEqual(pauses,[17,17]);
  for(const call of calls){
    assert.equal(call.url,"https://textanalysis.tools/api/health");
    assert.equal(call.options.cache,"no-store");
    assert.equal(call.options.redirect,"manual");
    assert.equal(call.options.headers.Accept,"application/json");
    assert.ok(call.options.signal instanceof AbortSignal);
  }
});

test("deployment wait retries transport and HTTP failures without retrying a regression suite",async()=>{
  let calls=0;
  const pauses=[];
  await waitForDeployment({
    expectedRevision:revision,
    attempts:3,
    request:async()=>{
      calls+=1;
      if(calls===1)throw new TypeError("network unavailable");
      if(calls===2)return new Response("rolling out",{status:503});
      return healthResponse({revision});
    },
    pause:async milliseconds=>pauses.push(milliseconds),
    log:quiet,
  });
  assert.equal(calls,3);
  assert.deepEqual(pauses,[30_000,30_000]);
});

test("deployment wait fails after its final check and does not sleep afterward",async()=>{
  let calls=0;
  const pauses=[];
  await assert.rejects(waitForDeployment({
    expectedRevision:revision,
    attempts:2,
    request:async()=>{
      calls+=1;
      return new Response("not deployed",{status:404});
    },
    pause:async milliseconds=>pauses.push(milliseconds),
    log:quiet,
  }),/after 2 health checks.*HTTP 404/);
  assert.equal(calls,2);
  assert.equal(pauses.length,1);
});

test("deployment wait rejects missing revisions and invalid limits before network access",async()=>{
  const request=async()=>assert.fail("invalid configuration must not make a request");
  for(const options of [
    {},
    {expectedRevision:"main"},
    {expectedRevision:revision,attempts:0},
    {expectedRevision:revision,attempts:61},
    {expectedRevision:revision,intervalMs:-1},
    {expectedRevision:revision,intervalMs:60_001},
    {expectedRevision:revision,timeoutMs:0},
    {expectedRevision:revision,baseUrl:"file:///tmp/site"},
    {expectedRevision:revision,baseUrl:"https://name:secret@textanalysis.tools"},
  ]){
    await assert.rejects(waitForDeployment({...options,request,log:quiet}));
  }
});
