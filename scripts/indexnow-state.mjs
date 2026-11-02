import assert from "node:assert/strict";
import {assertManifest} from "./indexnow-core.mjs";

export const STATE_BRANCH="automation/indexnow-state";
export const STATE_FILE="manifest.json";
export const MAX_MANIFEST_BYTES=4*1024*1024;
const refName=`refs/heads/${STATE_BRANCH}`;
const shaPattern=/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

function validateManifest(manifest){
  try{
    assertManifest(manifest);
    assert.equal(manifest.host,"textanalysis.tools");
  }catch{
    throw new Error("IndexNow state manifest is invalid.");
  }
  return manifest;
}

async function boundedText(response){
  const declared=Number(response.headers.get("content-length"));
  if(Number.isFinite(declared)&&declared>MAX_MANIFEST_BYTES){
    await response.body?.cancel().catch(()=>{});
    throw new Error("IndexNow state response exceeds its size limit.");
  }
  const reader=response.body?.getReader();
  if(!reader)return "";
  const chunks=[];
  let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_MANIFEST_BYTES){
        await reader.cancel().catch(()=>{});
        throw new Error("IndexNow state response exceeds its size limit.");
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks));
  }catch(error){
    if(error?.message==="IndexNow state response exceeds its size limit.")throw error;
    throw new Error("IndexNow state response could not be read.");
  }finally{
    reader.releaseLock();
  }
}

function client({repository,token,request}){
  assert.ok(typeof repository==="string"&&/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(repository),"IndexNow state repository must be owner/repository.");
  assert.ok(![".",".."].includes(repository.split("/")[1]),"IndexNow state repository name is invalid.");
  assert.ok(typeof token==="string"&&token.length>0&&token.length<=4096&&!/\s/.test(token),"A valid GitHub token is required for IndexNow state.");
  const [owner,name]=repository.split("/");
  const root=`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  let verifiedRepository=false;
  async function call(path,{method="GET",body,status=200,missing=false,raw=false}={}){
    // This helper has no configurable API origin. Public content/IndexNow
    // requests use a different client, so this credential never follows them.
    let response;
    try{
      response=await request(new URL(`https://api.github.com${root}${path}`),{
        method,redirect:"manual",cache:"no-store",
        headers:{Accept:raw?"application/vnd.github.raw+json":"application/vnd.github+json",Authorization:`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"textanalysis-indexnow",...(body?{"Content-Type":"application/json"}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),
        signal:AbortSignal.timeout(20_000),
      });
    }catch{
      throw new Error(`IndexNow state ${method} request did not complete.`);
    }
    if(response.status===404&&missing){
      await response.body?.cancel().catch(()=>{});
      return null;
    }
    if(response.status!==status){
      await response.body?.cancel().catch(()=>{});
      // API bodies and transport errors can contain reflected credentials.
      // Report only the operation/status, never headers or response contents.
      throw new Error(`IndexNow state ${method} ${path.split("?")[0]} returned HTTP ${response.status}.`);
    }
    const text=await boundedText(response);
    try{return JSON.parse(text);}
    catch{throw new Error("IndexNow state API returned invalid JSON.");}
  }
  async function reference(){
    const result=await call(`/git/ref/heads/${STATE_BRANCH}`,{missing:true});
    if(result===null){
      // GitHub can also use 404 for inaccessible repositories. A missing
      // branch is bootstrap state only when the repository itself is readable.
      if(!verifiedRepository){
        const metadata=await call("");
        assert.ok(metadata.full_name?.toLowerCase()===repository.toLowerCase(),"IndexNow state repository could not be verified.");
        verifiedRepository=true;
      }
      return null;
    }
    assert.ok(result.ref===refName,"IndexNow state API returned another reference.");
    assert.ok(result.object?.type==="commit","IndexNow state reference must identify a commit.");
    assert.ok(shaPattern.test(result.object.sha??""),"IndexNow state reference SHA is invalid.");
    verifiedRepository=true;
    return result.object.sha;
  }
  return {call,reference};
}

export async function loadState({repository,token,request=fetch}={}){
  const api=client({repository,token,request});
  const refSha=await api.reference();
  if(refSha===null)return {manifest:null,refSha:null};
  const manifest=await api.call(`/contents/${STATE_FILE}?ref=${refSha}`,{raw:true});
  return {manifest:validateManifest(manifest),refSha};
}

export async function saveState({repository,token,manifest,previousRefSha=null,request=fetch}={}){
  validateManifest(manifest);
  assert.ok(previousRefSha===null||shaPattern.test(previousRefSha),"Previous IndexNow state SHA is invalid.");
  let content;
  try{content=JSON.stringify(manifest,null,2)+"\n";}
  catch{throw new Error("IndexNow state manifest could not be serialized.");}
  assert.ok(Buffer.byteLength(content)<=MAX_MANIFEST_BYTES,"IndexNow state manifest exceeds its size limit.");
  // Validate the serialized representation as well: a caller's toJSON must
  // not replace an already-validated manifest with different data.
  validateManifest(JSON.parse(content));
  const api=client({repository,token,request});
  assert.ok(!content.includes(token),"IndexNow state must not contain its GitHub credential.");
  assert.ok(await api.reference()===previousRefSha,"IndexNow state changed; reload it before saving.");
  const blob=await api.call("/git/blobs",{method:"POST",status:201,body:{content,encoding:"utf-8"}});
  assert.ok(shaPattern.test(blob.sha??""),"IndexNow state blob SHA is invalid.");
  // No base_tree: this branch deliberately contains only the state manifest,
  // never a snapshot of main, application files, or credentials.
  const tree=await api.call("/git/trees",{method:"POST",status:201,body:{tree:[{path:STATE_FILE,mode:"100644",type:"blob",sha:blob.sha}]}});
  assert.ok(shaPattern.test(tree.sha??""),"IndexNow state tree SHA is invalid.");
  const commit=await api.call("/git/commits",{method:"POST",status:201,body:{message:`Update IndexNow state for ${manifest.revision}`,tree:tree.sha,parents:previousRefSha?[previousRefSha]:[]}});
  assert.ok(shaPattern.test(commit.sha??""),"IndexNow state commit SHA is invalid.");
  assert.ok(await api.reference()===previousRefSha,"IndexNow state changed; reload it before saving.");
  const updated=previousRefSha===null
    ?await api.call("/git/refs",{method:"POST",status:201,body:{ref:refName,sha:commit.sha}})
    :await api.call(`/git/refs/heads/${STATE_BRANCH}`,{method:"PATCH",body:{sha:commit.sha,force:false}});
  assert.ok(updated.ref===refName,"IndexNow state save returned another reference.");
  assert.ok(updated.object?.sha===commit.sha,"IndexNow state save returned another commit.");
  return {refSha:commit.sha};
}
