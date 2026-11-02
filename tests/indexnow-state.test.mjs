import assert from "node:assert/strict";
import test from "node:test";
import {loadState,MAX_MANIFEST_BYTES,saveState,STATE_BRANCH,STATE_FILE} from "../scripts/indexnow-state.mjs";

const repository="Tovt46/textanalysis.tools";
const token="state-test-token";
const previous="a".repeat(40);
const blob="b".repeat(40);
const tree="c".repeat(40);
const commit="d".repeat(40);
const refName=`refs/heads/${STATE_BRANCH}`;
const manifest=()=>({version:1,host:"textanalysis.tools",revision:"1".repeat(40),generatedAt:"2026-11-02T00:00:00Z",pages:{"https://textanalysis.tools/":{lastmod:"2020-01-01",fingerprint:"f".repeat(64)}}});
const reference=sha=>({ref:refName,object:{type:"commit",sha}});
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...headers}});
function requests(responses){
  const calls=[];
  const request=async(url,options)=>{
    calls.push({url:new URL(url),...options,body:options.body?JSON.parse(options.body):undefined});
    assert.equal(new URL(url).origin,"https://api.github.com");
    assert.ok(new URL(url).pathname.startsWith(`/repos/${repository}/` )||new URL(url).pathname===`/repos/${repository}`);
    assert.equal(options.redirect,"manual");
    assert.equal(options.headers.Authorization,`Bearer ${token}`);
    assert.ok(options.signal instanceof AbortSignal);
    const next=responses.shift();
    assert.ok(next,"Unexpected extra request.");
    if(next instanceof Error)throw next;
    return next;
  };
  return {request,calls};
}
const options=request=>({repository,token,request});

test("IndexNow state bootstraps only a missing branch in a readable repository",async()=>{
  const mock=requests([json({message:"Not Found"},404),json({full_name:repository})]);
  assert.deepEqual(await loadState(options(mock.request)),{manifest:null,refSha:null});
  assert.equal(mock.calls[0].url.pathname,`/repos/${repository}/git/ref/heads/${STATE_BRANCH}`);
  assert.equal(mock.calls[1].url.pathname,`/repos/${repository}`);
  const denied=requests([json({},404),json({},404)]);
  await assert.rejects(loadState(options(denied.request)),/HTTP 404/);
});

test("IndexNow manifest is loaded from the immutable state commit",async()=>{
  const data=manifest();
  const mock=requests([json(reference(previous)),json(data)]);
  assert.deepEqual(await loadState(options(mock.request)),{manifest:data,refSha:previous});
  assert.equal(mock.calls[1].url.pathname,`/repos/${repository}/contents/${STATE_FILE}`);
  assert.equal(mock.calls[1].url.searchParams.get("ref"),previous);
  assert.equal(mock.calls[1].headers.Accept,"application/vnd.github.raw+json");
});

test("existing state errors cannot silently become an empty baseline",async()=>{
  for(const response of [json({},404),json({},403),json({},500),new Response("not JSON"),json({...manifest(),host:"another.example"}),json({})]){
    const mock=requests([json(reference(previous)),response]);
    await assert.rejects(loadState(options(mock.request)));
    assert.equal(mock.calls.length,2);
    assert.ok(mock.calls.every(call=>call.method==="GET"));
  }
  for(const status of [401,403,429,500]){
    const mock=requests([json({message:token},status)]);
    await assert.rejects(loadState(options(mock.request)),error=>error.message.includes(`HTTP ${status}`)&&!error.message.includes(token));
    assert.equal(mock.calls.length,1);
  }
});

test("state reads reject malformed references and overlarge manifest responses",async()=>{
  for(const value of [{...reference(previous),ref:"refs/heads/main"},reference("invalid"),{ref:refName,object:{type:"tag",sha:previous}}]){
    const mock=requests([json(value)]);
    await assert.rejects(loadState(options(mock.request)));
    assert.equal(mock.calls.length,1);
  }
  const mock=requests([json(reference(previous)),json({},200,{"content-length":String(MAX_MANIFEST_BYTES+1)})]);
  await assert.rejects(loadState(options(mock.request)),/size limit/);
  const huge=requests([json(reference(previous)),new Response(" ".repeat(MAX_MANIFEST_BYTES+1))]);
  await assert.rejects(loadState(options(huge.request)),/size limit/);
});

test("initial state save creates an orphan commit with only manifest.json",async()=>{
  const data=manifest();
  const mock=requests([json({},404),json({full_name:repository}),json({sha:blob},201),json({sha:tree},201),json({sha:commit},201),json({},404),json(reference(commit),201)]);
  assert.deepEqual(await saveState({...options(mock.request),manifest:data,previousRefSha:null}),{refSha:commit});
  const blobCall=mock.calls.find(call=>call.url.pathname.endsWith("/git/blobs"));
  assert.deepEqual(JSON.parse(blobCall.body.content),data);
  const treeCall=mock.calls.find(call=>call.url.pathname.endsWith("/git/trees"));
  assert.deepEqual(treeCall.body,{tree:[{path:STATE_FILE,mode:"100644",type:"blob",sha:blob}]});
  const commitCall=mock.calls.find(call=>call.url.pathname.endsWith("/git/commits"));
  assert.deepEqual(commitCall.body.parents,[]);
  assert.equal(commitCall.body.tree,tree);
  assert.equal(mock.calls.at(-1).method,"POST");
  assert.deepEqual(mock.calls.at(-1).body,{ref:refName,sha:commit});
  assert.ok(!JSON.stringify(data).includes(token));
});

test("state updates advance only the dedicated branch without forcing",async()=>{
  const mock=requests([json(reference(previous)),json({sha:blob},201),json({sha:tree},201),json({sha:commit},201),json(reference(previous)),json(reference(commit))]);
  assert.deepEqual(await saveState({...options(mock.request),manifest:manifest(),previousRefSha:previous}),{refSha:commit});
  assert.deepEqual(mock.calls.find(call=>call.url.pathname.endsWith("/git/commits")).body.parents,[previous]);
  const update=mock.calls.at(-1);
  assert.equal(update.method,"PATCH");
  assert.equal(update.url.pathname,`/repos/${repository}/git/refs/heads/${STATE_BRANCH}`);
  assert.deepEqual(update.body,{sha:commit,force:false});
  assert.ok(mock.calls.every(call=>!call.url.pathname.endsWith("/heads/main")));
});

test("stale state cannot overwrite another accepted manifest",async()=>{
  const moved="e".repeat(40);
  const early=requests([json(reference(moved))]);
  await assert.rejects(saveState({...options(early.request),manifest:manifest(),previousRefSha:previous}),/changed/);
  assert.equal(early.calls.length,1);
  const late=requests([json(reference(previous)),json({sha:blob},201),json({sha:tree},201),json({sha:commit},201),json(reference(moved))]);
  await assert.rejects(saveState({...options(late.request),manifest:manifest(),previousRefSha:previous}),/changed/);
  assert.ok(!late.calls.some(call=>call.method==="PATCH"));
});

test("a create-ref race never falls back to overwriting an existing branch",async()=>{
  const mock=requests([json({},404),json({full_name:repository}),json({sha:blob},201),json({sha:tree},201),json({sha:commit},201),json({},404),json({message:token},422)]);
  await assert.rejects(saveState({...options(mock.request),manifest:manifest(),previousRefSha:null}),error=>/HTTP 422/.test(error.message)&&!error.message.includes(token));
  assert.equal(mock.calls.at(-1).method,"POST");
  assert.ok(!mock.calls.some(call=>call.method==="PATCH"));
});

test("a non-fast-forward or permission failure never triggers a forced update",async()=>{
  for(const status of [403,409,422,500]){
    const mock=requests([json(reference(previous)),json({sha:blob},201),json({sha:tree},201),json({sha:commit},201),json(reference(previous)),json({message:token},status)]);
    await assert.rejects(saveState({...options(mock.request),manifest:manifest(),previousRefSha:previous}),error=>error.message.includes(`HTTP ${status}`)&&!error.message.includes(token));
    assert.equal(mock.calls.filter(call=>call.method==="PATCH").length,1);
    assert.equal(mock.calls.at(-1).body.force,false);
  }
});

test("failed object creation cannot advance the state reference",async()=>{
  for(const responses of [
    [json(reference(previous)),json({},500)],
    [json(reference(previous)),json({sha:blob},201),json({},403)],
    [json(reference(previous)),json({sha:blob},201),json({sha:tree},201),json({},422)],
  ]){
    const mock=requests(responses);
    await assert.rejects(saveState({...options(mock.request),manifest:manifest(),previousRefSha:previous}));
    assert.ok(!mock.calls.some(call=>call.method==="PATCH"));
  }
});

test("invalid state or credentials fail before any network writes",async()=>{
  const request=async()=>assert.fail("Invalid inputs must not make a request.");
  for(const overrides of [
    {repository:"https://github.com/Tovt46/textanalysis.tools"},
    {repository:"Tovt46/../another"},
    {repository:"Tovt46/repo?other=true"},
    {token:""},{token:"secret\nother-header"},
    {manifest:{...manifest(),host:"another.example"}},
    {previousRefSha:"main"},
    {manifest:{...manifest(),credential:token}},
    {manifest:{...manifest(),toJSON(){return {host:"another.example"};}}},
    {manifest:{...manifest(),oversized:"x".repeat(MAX_MANIFEST_BYTES)}},
  ]){
    await assert.rejects(saveState({repository,token,manifest:manifest(),previousRefSha:null,request,...overrides}));
  }
});

test("transport and malformed JSON errors cannot leak reflected authorization",async()=>{
  for(const response of [new Error(`Request headers: Authorization Bearer ${token}`),new Response(`invalid JSON ${token}`)]){
    const mock=requests([response]);
    await assert.rejects(loadState(options(mock.request)),error=>!error.message.includes(token)&&!String(error.stack).includes(token));
  }
  for(const response of [{...reference(previous),ref:token},reference(token),{ref:refName,object:{type:token,sha:previous}}]){
    const mock=requests([json(response)]);
    await assert.rejects(loadState(options(mock.request)),error=>!error.message.includes(token)&&!String(error.stack).includes(token));
  }
  const badMetadata=requests([json({},404),json({full_name:token})]);
  await assert.rejects(loadState(options(badMetadata.request)),error=>!error.message.includes(token));
  const badBlob=requests([json(reference(previous)),json({sha:token},201)]);
  await assert.rejects(saveState({...options(badBlob.request),manifest:manifest(),previousRefSha:previous}),error=>!error.message.includes(token));
});
