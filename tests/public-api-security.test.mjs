import assert from "node:assert/strict";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL,fileURLToPath} from "node:url";
import test,{after} from "node:test";
import {build} from "esbuild";

const buildDirectory=await mkdtemp(join(tmpdir(),"textanalysis-public-api-"));
const bundledModule=join(buildDirectory,"public-api.mjs");
await build({
  entryPoints:[fileURLToPath(new URL("../app/lib/public-api.ts",import.meta.url))],
  outfile:bundledModule,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  logLevel:"silent",
});
const api=await import(`${pathToFileURL(bundledModule).href}?test=${Date.now()}`);
after(()=>rm(buildDirectory,{recursive:true,force:true}));

const publicLookup=async()=>[{address:"93.184.216.34",family:4}];
const textResponse=(body="ok")=>new Response(body,{headers:{"content-type":"text/plain; charset=utf-8"}});

async function expectApiError(promise,{status,code}){
  await assert.rejects(promise,error=>{
    assert.equal(error?.status,status);
    assert.equal(error?.code,code);
    return true;
  });
}

test("classifies comprehensive private and reserved IP ranges",()=>{
  const blocked=[
    "0.0.0.1","10.1.2.3","100.64.0.1","127.0.0.1","169.254.169.254","172.31.255.255",
    "192.0.0.1","192.0.2.1","192.168.1.1","198.18.0.1","198.51.100.1","203.0.113.1",
    "224.0.0.1","240.0.0.1","255.255.255.255","::1","::ffff:127.0.0.1","64:ff9b::1",
    "100::1","2001::1","2001:db8::1","2002::1","3fff::1","5f00::1","fc00::1","fe80::1","fec0::1","ff00::1",
  ];
  for(const address of blocked)assert.equal(api.isPrivateOrReservedIp(address),true,address);
  for(const address of ["8.8.8.8","93.184.216.34","2001:4860:4860::8888","2606:4700:4700::1111"]){
    assert.equal(api.isPrivateOrReservedIp(address),false,address);
  }
});

test("rejects private literal hosts before any network request",async()=>{
  let fetched=false;
  const context={lookup:publicLookup,fetchImpl:async()=>{fetched=true;return textResponse();}};
  for(const url of ["http://127.0.0.1/","http://169.254.169.254/","http://[::1]/","http://[fc00::1]/"]){
    await expectApiError(api.fetchRemoteText(url,context),{status:400,code:"UNSAFE_URL"});
  }
  assert.equal(fetched,false);
});

test("rejects a hostname when any resolved A or AAAA address is private",async()=>{
  let fetched=false;
  await expectApiError(api.fetchRemoteText("https://mixed.example/article",{
    lookup:async()=>[
      {address:"93.184.216.34",family:4},
      {address:"fd00::1",family:6},
    ],
    fetchImpl:async()=>{fetched=true;return textResponse();},
  }),{status:400,code:"UNSAFE_URL"});
  assert.equal(fetched,false);
});

test("validates DNS again before following every redirect",async()=>{
  const resolved=[];
  let fetches=0;
  await expectApiError(api.fetchRemoteText("https://public.example/start",{
    lookup:async hostname=>{
      resolved.push(hostname);
      return hostname==="public.example"
        ?[{address:"93.184.216.34",family:4}]
        :[{address:"127.0.0.1",family:4}];
    },
    fetchImpl:async()=>{
      fetches+=1;
      return new Response(null,{status:302,headers:{location:"https://private.example/next"}});
    },
  }),{status:400,code:"UNSAFE_URL"});
  assert.deepEqual(resolved,["public.example","private.example"]);
  assert.equal(fetches,1);
});

test("maps DNS failures to the existing structured fetch error",async()=>{
  await expectApiError(api.fetchRemoteText("https://missing.example/",{
    lookup:async()=>{throw new Error("ENOTFOUND");},
    fetchImpl:async()=>textResponse(),
  }),{status:422,code:"FETCH_FAILED"});
});

test("applies one deadline to DNS resolution",async()=>{
  const startedAt=Date.now();
  await expectApiError(api.fetchRemoteText("https://slow.example/",{
    timeoutMs:25,
    lookup:async()=>new Promise(()=>{}),
    fetchImpl:async()=>textResponse(),
  }),{status:422,code:"FETCH_FAILED"});
  assert.ok(Date.now()-startedAt<500);
});

test("passes the validated address to the remote transport",async()=>{
  let pinnedAddress;
  const text=await api.fetchRemoteText("https://public.example/",{
    lookup:async()=>[{address:"93.184.216.34",family:4}],
    fetchImpl:async(_url,_init,address)=>{pinnedAddress=address;return textResponse("pinned");},
  });
  assert.equal(text,"pinned");
  assert.deepEqual(pinnedAddress,{address:"93.184.216.34",family:4});
});

test("falls back across validated public addresses within one budget",async()=>{
  const attempted=[];
  const budget=api.createRemoteFetchBudget({maxRequests:2,maxBytes:20,maxConcurrent:1});
  const text=await api.fetchRemoteText("https://public.example/",{
    budget,
    lookup:async()=>[
      {address:"93.184.216.34",family:4},
      {address:"93.184.216.35",family:4},
    ],
    fetchImpl:async(_url,_init,address)=>{
      attempted.push(address.address);
      if(address.address.endsWith(".34"))throw new Error("unreachable");
      return textResponse("fallback");
    },
  });
  assert.equal(text,"fallback");
  assert.deepEqual(attempted,["93.184.216.34","93.184.216.35"]);
  assert.equal(budget.snapshot().requests,2);
});

test("a blackholed address cannot consume the whole multi-address deadline",async()=>{
  const attempted=[];
  const startedAt=Date.now();
  const text=await api.fetchRemoteText("https://public.example/",{
    timeoutMs:80,
    lookup:async()=>[
      {address:"93.184.216.34",family:4},
      {address:"93.184.216.35",family:4},
    ],
    fetchImpl:async(_url,init,address)=>{
      attempted.push(address.address);
      if(address.address.endsWith(".35"))return textResponse("fallback after timeout");
      return new Promise((_resolve,reject)=>{
        init.signal?.addEventListener("abort",()=>reject(init.signal.reason),{once:true});
      });
    },
  });
  assert.equal(text,"fallback after timeout");
  assert.deepEqual(attempted,["93.184.216.34","93.184.216.35"]);
  assert.ok(Date.now()-startedAt<500);
});

test("the default pinned transport preserves the original Host header",async t=>{
  let receivedHost="";
  let markInvalidSocketClosed=()=>{};
  const invalidSocketClosed=new Promise(resolve=>{markInvalidSocketClosed=resolve;});
  const server=createServer((request,response)=>{
    receivedHost=request.headers.host||"";
    if(request.url==="/invalid-status"){
      request.socket.once("close",markInvalidSocketClosed);
      response.writeHead(700,"Invalid Status",{"content-type":"text/plain"});
      response.write("invalid");
      return;
    }
    response.writeHead(200,{"content-type":"text/plain"});
    response.end("pinned transport");
  });
  await new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolve);
  });
  t.after(()=>{
    server.closeAllConnections();
    return new Promise(resolve=>server.close(resolve));
  });
  const address=server.address();
  assert.ok(address&&typeof address==="object");
  const url=new URL(`http://public.example:${address.port}/path?q=1`);
  const response=await api.fetchPinnedRemote(url,{method:"GET"},{address:"127.0.0.1",family:4});
  assert.equal(await response.text(),"pinned transport");
  assert.equal(receivedHost,`public.example:${address.port}`);
  await assert.rejects(
    api.fetchPinnedRemote(
      new URL(`http://public.example:${address.port}/invalid-status`),
      {method:"GET"},
      {address:"127.0.0.1",family:4},
    ),
    /unsupported HTTP status 700/,
  );
  await Promise.race([
    invalidSocketClosed,
    new Promise((_resolve,reject)=>setTimeout(()=>reject(new Error("Invalid-status socket was not closed.")),500)),
  ]);
});

test("streams a normal chunked text response",async()=>{
  const encoder=new TextEncoder();
  const body=new ReadableStream({
    start(controller){
      controller.enqueue(encoder.encode("alpha "));
      controller.enqueue(encoder.encode("beta"));
      controller.close();
    },
  });
  const text=await api.fetchRemoteText("https://public.example/article",{
    lookup:publicLookup,
    fetchImpl:async()=>new Response(body,{headers:{"content-type":"text/html"}}),
  });
  assert.equal(text,"alpha beta");
});

test("aborts a chunked response as soon as its byte cap is exceeded",async()=>{
  let cancelled=false;
  const body=new ReadableStream({
    start(controller){
      controller.enqueue(new Uint8Array(api.MAX_REMOTE_BYTES).fill(97));
      controller.enqueue(Uint8Array.of(97));
    },
    cancel(){cancelled=true;},
  });
  await expectApiError(api.fetchRemoteText("https://public.example/large",{
    lookup:publicLookup,
    fetchImpl:async()=>new Response(body,{headers:{"content-type":"text/plain"}}),
  }),{status:413,code:"REMOTE_CONTENT_TOO_LARGE"});
  assert.equal(cancelled,true);
});

test("rejects an oversized declared body without reading it",async()=>{
  let cancelled=false;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  await expectApiError(api.fetchRemoteText("https://public.example/declared-large",{
    lookup:publicLookup,
    fetchImpl:async()=>new Response(body,{headers:{
      "content-type":"text/plain",
      "content-length":String(api.MAX_REMOTE_BYTES+1),
    }}),
  }),{status:413,code:"REMOTE_CONTENT_TOO_LARGE"});
  assert.equal(cancelled,true);
});

test("a shared remote budget bounds requests, bytes, and concurrency",async()=>{
  const budget=api.createRemoteFetchBudget({maxRequests:2,maxBytes:5,maxConcurrent:1});
  let active=0;
  let maximumActive=0;
  const task=()=>budget.run(async()=>{
    active+=1;
    maximumActive=Math.max(maximumActive,active);
    await new Promise(resolve=>setImmediate(resolve));
    active-=1;
  });
  const results=await Promise.allSettled([task(),task(),task()]);
  assert.deepEqual(results.map(result=>result.status),["fulfilled","fulfilled","rejected"]);
  assert.equal(results[2].reason.code,"REMOTE_BUDGET_EXCEEDED");
  assert.equal(maximumActive,1);
  budget.consumeBytes(3);
  assert.throws(()=>budget.consumeBytes(3),error=>error?.code==="REMOTE_BUDGET_EXCEEDED");
  assert.deepEqual(budget.snapshot(),{
    maxRequests:2,maxBytes:5,maxConcurrent:1,requests:2,bytes:3,active:0,queued:0,
  });
});

test("fetchRemoteText shares the supplied concurrency and byte budget",async()=>{
  const budget=api.createRemoteFetchBudget({maxRequests:2,maxBytes:20,maxConcurrent:1});
  let active=0;
  let maximumActive=0;
  const fetchImpl=async()=>{
    active+=1;
    maximumActive=Math.max(maximumActive,active);
    const body=new ReadableStream({
      async start(controller){
        await new Promise(resolve=>setImmediate(resolve));
        controller.enqueue(new TextEncoder().encode("four"));
        controller.close();
        active-=1;
      },
    });
    return new Response(body,{headers:{"content-type":"text/plain"}});
  };
  const context={lookup:publicLookup,fetchImpl,budget};
  const output=await Promise.all([
    api.fetchRemoteText("https://one.example/",context),
    api.fetchRemoteText("https://two.example/",context),
  ]);
  assert.deepEqual(output,["four","four"]);
  assert.equal(maximumActive,1);
  assert.equal(budget.snapshot().bytes,8);
});

test("a mixed remote corpus rejects an unsafe source without fetching it",async()=>{
  const fetched=[];
  const context={
    budget:api.createRemoteFetchBudget({maxRequests:2,maxBytes:20,maxConcurrent:2}),
    lookup:async hostname=>hostname==="unsafe.example"
      ?[{address:"127.0.0.1",family:4}]
      :[{address:"93.184.216.34",family:4}],
    fetchImpl:async url=>{fetched.push(url.hostname);return textResponse("safe");},
  };
  const results=await Promise.allSettled([
    api.fetchRemoteText("https://safe.example/",context),
    api.fetchRemoteText("https://unsafe.example/",context),
  ]);
  assert.equal(results[0].status,"fulfilled");
  assert.equal(results[1].status,"rejected");
  assert.equal(results[1].reason.code,"UNSAFE_URL");
  assert.deepEqual(fetched,["safe.example"]);
});

test("mapWithConcurrency preserves order and enforces its bound",async()=>{
  let active=0;
  let maximumActive=0;
  const output=await api.mapWithConcurrency([3,1,2],2,async value=>{
    active+=1;
    maximumActive=Math.max(maximumActive,active);
    await new Promise(resolve=>setImmediate(resolve));
    active-=1;
    return value*2;
  });
  assert.deepEqual(output,[6,2,4]);
  assert.equal(maximumActive,2);
});

test("apiJson returns a stable non-recursive error when serialized output exceeds its cap",async()=>{
  const response=api.apiJson({payload:"x".repeat(api.MAX_API_RESPONSE_BYTES)});
  assert.equal(response.status,413);
  assert.equal(response.headers.get("access-control-allow-origin"),"*");
  assert.match(response.headers.get("access-control-expose-headers")||"",/RateLimit-Remaining/);
  assert.equal(response.headers.get("cache-control"),"no-store");
  assert.deepEqual(await response.json(),{
    apiVersion:api.API_VERSION,
    error:{code:"RESULT_TOO_LARGE",message:"The analysis result is too large to return in one response."},
  });
});

test("rate-limit cost scales with documents, remote sources, and input size",()=>{
  assert.equal(api.calculateRateLimitCost({source:"short text"}),1);
  assert.equal(api.calculateRateLimitCost({source:"x".repeat(100_000)}),2);
  assert.equal(api.calculateRateLimitCost({sourceType:"url",source:"https://example.com"}),3);
  assert.equal(api.calculateRateLimitCost({
    documents:[
      {source:"alpha"},
      {sourceType:"url",source:"https://example.com/a"},
      {sourceType:"url",source:"https://example.com/b"},
    ],
  }),7);
  assert.equal(api.calculateRateLimitCost({
    documents:Array.from({length:10},()=>({sourceType:"url",source:"https://example.com"})),
  }),api.RATE_LIMIT);
});

test("rate-limit identities are hashed before reaching any store",()=>{
  const identity="203.0.113.10";
  const key=api.hashRateLimitIdentity(identity);
  assert.match(key,/^[a-f0-9]{64}$/);
  assert.notEqual(key,identity);
  assert.equal(api.hashRateLimitIdentity(identity),key);
  assert.notEqual(api.hashRateLimitIdentity("203.0.113.11"),key);
});

test("configured shared-store failures degrade with bounded backoff and safe diagnostics",async()=>{
  let attempts=0;
  const logs=[];
  const primary={
    async increment(key){
      attempts+=1;
      throw new Error(`shared path /private/rate-store failed for ${key}`);
    },
  };
  const store=new api.ResilientRateLimitStore(primary,new api.MemoryRateLimitStore(10),{
    retryBaseMs:100,
    retryMaximumMs:400,
    writeLog:(line,level)=>logs.push({line,level}),
  });
  assert.equal(store.status(),"shared");
  assert.deepEqual(await store.increment("hashed-client-key",1,1_000,60_000),{startedAt:1_000,count:1});
  assert.equal(store.status(),"degraded");
  assert.equal(attempts,1);
  assert.deepEqual(await store.increment("hashed-client-key",1,1_050,60_000),{startedAt:1_000,count:2});
  assert.equal(attempts,1,"backoff must skip the unavailable shared store");
  assert.deepEqual(await store.increment("hashed-client-key",1,1_100,60_000),{startedAt:1_000,count:3});
  assert.equal(attempts,2);
  assert.equal(logs.length,2);
  assert.ok(logs.every(log=>log.level==="warn"));
  assert.deepEqual(logs.map(log=>JSON.parse(log.line).retryAfterMs),[100,200]);
  assert.doesNotMatch(JSON.stringify(logs),/private|rate-store|hashed-client-key|shared path failed/i);
});

test("a degraded shared store recovers after its backoff probe",async()=>{
  let attempts=0;
  const logs=[];
  const primary={
    async increment(_key,cost,now){
      attempts+=1;
      if(attempts===1)throw new Error("temporary outage");
      return{startedAt:now,count:cost};
    },
  };
  const store=new api.ResilientRateLimitStore(primary,new api.MemoryRateLimitStore(10),{
    retryBaseMs:100,
    retryMaximumMs:400,
    writeLog:(line,level)=>logs.push({line,level}),
  });
  await store.increment("client",1,2_000,60_000);
  assert.equal(store.status(),"degraded");
  await store.increment("client",1,2_100,60_000);
  assert.equal(store.status(),"shared");
  assert.equal(attempts,2);
  assert.equal(JSON.parse(logs.at(-1).line).event,"rate_limit_store_recovered");
  assert.equal(logs.at(-1).level,"info");
});

test("relative shared-store paths are rejected and reported as degraded",async()=>{
  assert.throws(()=>new api.FileRateLimitStore("relative/rate-limit"),/absolute path/i);
  const logs=[];
  const store=api.createConfiguredRateLimitStore("relative/rate-limit",{
    resilient:{retryBaseMs:100,probeTimeoutMs:100,writeLog:(line,level)=>logs.push({line,level})},
  });
  assert.equal(await store.probe(3_000),"degraded");
  assert.equal(store.status(),"degraded");
  assert.equal(logs.length,1);
  assert.doesNotMatch(JSON.stringify(logs),/relative\/rate-limit/);
});

test("an absolute but unwritable shared-store target fails its real health probe",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-rate-limit-unwritable-"));
  const blockingFile=join(directory,"not-a-directory");
  await writeFile(blockingFile,"blocked","utf8");
  try{
    const logs=[];
    const configuredPath=join(blockingFile,"rate-limit");
    const store=api.createConfiguredRateLimitStore(configuredPath,{
      resilient:{retryBaseMs:100,probeTimeoutMs:100,writeLog:(line,level)=>logs.push({line,level})},
    });
    assert.equal(await store.probe(4_000),"degraded");
    assert.equal(store.status(),"degraded");
    assert.deepEqual(await store.increment("client",1,4_001,60_000),{startedAt:4_001,count:1});
    assert.doesNotMatch(JSON.stringify(logs),/not-a-directory|rate-limit-unwritable/);
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});

test("shared health probes are bounded and never consume or reset user quota",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-rate-limit-probe-"));
  try{
    const fileStore=new api.FileRateLimitStore(directory,{bucketCount:1,maximumKeys:100});
    assert.deepEqual(await fileStore.increment("user-key",1,5_000,60_000),{startedAt:5_000,count:1});
    await fileStore.probe(5_100);
    assert.deepEqual(await fileStore.increment("user-key",1,5_100,60_000),{startedAt:5_000,count:2});

    const stalledPrimary={
      async increment(){throw new Error("not used");},
      async probe(){return new Promise(()=>{});},
    };
    const resilient=new api.ResilientRateLimitStore(stalledPrimary,new api.MemoryRateLimitStore(10),{
      retryBaseMs:100,
      probeTimeoutMs:100,
      writeLog:()=>undefined,
    });
    const startedAt=Date.now();
    assert.equal(await resilient.probe(5_200),"degraded");
    assert.ok(Date.now()-startedAt<500,"health probe exceeded its bounded timeout");
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});

test("file rate-limit store shares atomic counters across worker instances",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-rate-limit-"));
  try{
    const first=new api.FileRateLimitStore(directory,{bucketCount:1,maximumKeys:100});
    const second=new api.FileRateLimitStore(directory,{bucketCount:1,maximumKeys:100});
    const increments=Array.from({length:30},(_,index)=>(index%2?first:second).increment("203.0.113.10",1,1_000,60_000));
    const windows=await Promise.all(increments);
    assert.deepEqual(windows.map(window=>window.count).sort((a,b)=>a-b),Array.from({length:30},(_,index)=>index+1));
    assert.deepEqual(await first.increment("203.0.113.10",1,61_001,60_000),{startedAt:61_001,count:1});
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});

test("normalizeAnalyzeBody forwards an optional shared remote context",async()=>{
  const budget=api.createRemoteFetchBudget({maxRequests:1,maxBytes:20,maxConcurrent:1});
  const normalized=await api.normalizeAnalyzeBody({sourceType:"url",source:"https://public.example/",language:"en"},{
    lookup:publicLookup,
    fetchImpl:async()=>textResponse("alpha beta gamma"),
    budget,
  });
  assert.equal(normalized.text,"alpha beta gamma");
  assert.equal(budget.snapshot().requests,1);
});
