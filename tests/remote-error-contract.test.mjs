import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import test,{after} from "node:test";
import {build} from "esbuild";

const buildDirectory=await mkdtemp(join(tmpdir(),"textanalysis-remote-contract-"));
after(()=>rm(buildDirectory,{recursive:true,force:true}));
await symlink(fileURLToPath(new URL("../node_modules",import.meta.url)),join(buildDirectory,"node_modules"),"dir");
const bundledModule=join(buildDirectory,"remote-contract.mjs");
// Export the real private formatter only in this test bundle, keeping its
// PublicApiError identity and the API observability WeakMap shared.
await build({
  stdin:{
    contents:`${await readFile(new URL("../cli/mcp.ts",import.meta.url),"utf8")}
export {structuredError,PublicApiError};
export {fetchRemoteText,apiErrorResponse} from "../app/lib/public-api";
export {observeApiRequest} from "../app/lib/api-observability";`,
    resolveDir:fileURLToPath(new URL("../cli",import.meta.url)),
    sourcefile:"mcp-test.ts",
    loader:"ts",
  },
  outfile:bundledModule,
  bundle:true,
  format:"esm",
  platform:"node",
  target:"node22",
  external:["@modelcontextprotocol/sdk","@modelcontextprotocol/sdk/*","zod","zod/*"],
  logLevel:"silent",
});
const api=await import(pathToFileURL(bundledModule).href);
const publicLookup=async()=>[{address:"93.184.216.34",family:4}];

async function remoteFailure(context){
  let failure;
  await assert.rejects(api.fetchRemoteText("https://public.example/article",{
    lookup:publicLookup,
    fetchImpl:async()=>new Response("ok",{headers:{"content-type":"text/plain"}}),
    ...context,
  }),error=>{
    assert.ok(error instanceof api.PublicApiError);
    failure=error;
    return true;
  });
  return failure;
}

function assertMcpError(error,{code=error.code,category="network",retryable}){
  assert.deepEqual(api.structuredError(error),{
    code,status:error.status,category,retryable,message:error.message,
  });
}

test("MCP classifies actual remote failures and preserves legacy fetch errors",async()=>{
  const cases=[
    ["REMOTE_FETCH_TIMEOUT",true,{fetchImpl:async()=>{throw new DOMException("timeout","TimeoutError");}}],
    ["REMOTE_REQUEST_FAILED",true,{fetchImpl:async()=>{throw new Error("ECONNRESET");}}],
    ["REMOTE_CONTENT_READ_FAILED",true,{fetchImpl:async()=>new Response(new ReadableStream({
      pull(controller){controller.error(new Error("stream reset"));},
    }),{headers:{"content-type":"text/plain"}})}],
    ["REMOTE_INVALID_REDIRECT",false,{fetchImpl:async()=>new Response(null,{status:302})}],
  ];
  for(const [code,retryable,context] of cases){
    assertMcpError(await remoteFailure(context),{code,retryable});
  }
  assertMcpError(new api.PublicApiError(422,"FETCH_FAILED","Legacy failure"),{retryable:true});
  assertMcpError(new api.PublicApiError(400,"UNSAFE_URL","Private target"),{category:"validation",retryable:false});
});

test("MCP retryability distinguishes temporary DNS failures from missing domains",async()=>{
  for(const [code,retryable] of [["EAI_AGAIN",true],["ENOTFOUND",false]]){
    const failure=await remoteFailure({lookup:async()=>{throw Object.assign(new Error(code),{code});}});
    assertMcpError(failure,{code:"REMOTE_DNS_LOOKUP_FAILED",retryable});
  }
});

test("MCP retryability follows upstream HTTP status despite the public 422 envelope",async()=>{
  for(const [status,retryable] of [[408,true],[425,true],[429,true],[500,true],[503,true],[400,false],[403,false],[404,false]]){
    const failure=await remoteFailure({fetchImpl:async()=>new Response(null,{status})});
    assert.equal(failure.status,422);
    assertMcpError(failure,{code:"REMOTE_HTTP_ERROR",retryable});
  }
  assertMcpError(new api.PublicApiError(422,"FETCH_FAILED","Explicit permanent failure",undefined,{},false),{retryable:false});
});

test("API observations classify new remote codes without logging URL or error details",async()=>{
  const codes=[
    "FETCH_FAILED","REMOTE_FETCH_TIMEOUT","REMOTE_DNS_LOOKUP_FAILED","REMOTE_REQUEST_FAILED",
    "REMOTE_CONTENT_READ_FAILED","REMOTE_INVALID_REDIRECT","REMOTE_HTTP_ERROR",
  ];
  for(const code of [...codes,"UNSAFE_URL"]){
    const lines=[];
    const error=new api.PublicApiError(code==="UNSAFE_URL"?400:422,code,"private diagnostic https://secret.example/draft");
    const response=await api.observeApiRequest(
      new Request("https://textanalysis.tools/api/v1/analyze?source=https://secret.example/draft",{method:"POST"}),
      "analyze",
      ()=>api.apiErrorResponse(error),
      {now:()=>100,requestId:()=>"remote-error-test",writeLog:line=>lines.push(line)},
    );
    assert.equal(response.status,error.status);
    assert.equal((await response.json()).error.code,code);
    assert.equal(lines.length,1);
    const event=JSON.parse(lines[0]);
    assert.equal(event.errorClass,code==="UNSAFE_URL"?"remote_safety":"remote_fetch_error");
    assert.equal(event.status,error.status);
    assert.doesNotMatch(lines[0],/secret\.example|private diagnostic|draft|https:\/\//);
  }
});
