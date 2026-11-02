import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";
import {notifyIndexNow} from "../scripts/notify-indexnow.mjs";

const site="https://textanalysis.tools";
const revision="b".repeat(40);
const snapshot=(pages)=>({version:1,host:"textanalysis.tools",revision,generatedAt:"2026-11-02T00:00:00Z",pages});
const page=(fingerprint="a")=>({lastmod:"2026-11-01",fingerprint:fingerprint.repeat(64)});

async function scenario(previous,current,options={}){
  const directory=await mkdtemp(join(tmpdir(),"indexnow-notification-"));
  const calls={submitted:[],saved:[],collected:0};
  const services={
    load:async()=>({manifest:previous,refSha:previous?"c".repeat(40):null}),
    collect:async()=>{calls.collected+=1;return current;},
    submit:async({urls})=>{calls.submitted.push(urls);return {status:200,acceptedAt:"2026-11-02T00:00:00Z"};},
    save:async state=>{calls.saved.push(state);return {refSha:"d".repeat(40)};},
    ...options.services,
  };
  try{
    const report=await notifyIndexNow({repository:"Tovt46/textanalysis.tools",token:"test-token",expectedRevision:revision,apply:options.apply??true,outputDir:directory},services);
    return {report,calls};
  }finally{await rm(directory,{recursive:true,force:true});}
}

test("IndexNow initializes existing inventory without notifying historical URLs",async()=>{
  const current=snapshot({[site+"/"]:page(),[site+"/about"]:page()});
  const {report,calls}=await scenario(null,current);
  assert.equal(report.status,"BASELINED");
  assert.deepEqual(calls.submitted,[]);
  assert.equal(calls.saved.length,1);
  assert.equal(calls.saved[0].manifest.baselineOnly,true);
  assert.equal(calls.saved[0].previousRefSha,null);
});

test("IndexNow leaves unchanged content and its accepted checkpoint alone",async()=>{
  const current=snapshot({[site+"/"]:page()});
  const {report,calls}=await scenario(current,{...current,revision:"e".repeat(40)});
  assert.equal(report.status,"UNCHANGED");
  assert.deepEqual(calls.submitted,[]);
  assert.deepEqual(calls.saved,[]);
});

test("IndexNow submits exactly new and changed pages and records pending receipts accurately",async()=>{
  const before=snapshot({[site+"/"]:page(),[site+"/about"]:page()});
  const after=snapshot({[site+"/"]:page(),[site+"/about"]:page("b"),[site+"/contact"]:page()});
  const submitted=[];
  const {report,calls}=await scenario(before,after,{services:{submit:async({urls})=>{submitted.push(urls);return {status:202,acceptedAt:"2026-11-02T00:00:00Z",pendingVerification:true};}}});
  assert.deepEqual(submitted,[[site+"/about",site+"/contact"]]);
  assert.equal(report.status,"ACCEPTED_PENDING_VERIFICATION");
  assert.equal(calls.saved.length,1);
  assert.equal(calls.saved[0].manifest.pages[site+"/about"].submissionStatus,202);
  assert.equal(calls.saved[0].manifest.pages[site+"/"].submittedAt,undefined);
});

test("IndexNow preserves the prior checkpoint when the provider rejects a notification",async()=>{
  const {report,calls}=await scenario(snapshot({[site+"/"]:page()}),snapshot({[site+"/"]:page("b")}),{services:{submit:async()=>{throw Object.assign(new Error("Rate limited"),{receipt:{status:429,acceptedAt:null}});}}});
  assert.equal(report.status,"FAIL");
  assert.equal(report.receipt.status,429);
  assert.deepEqual(calls.saved,[]);
});

test("IndexNow debounces recent updates then rechecks the deployed content before sending",async()=>{
  const initialTime=Date.parse("2026-11-02T00:01:00Z");
  let clock=initialTime;
  let collections=0;
  const pauses=[];
  const before=snapshot({[site+"/"]:{...page(),submittedAt:"2026-11-02T00:00:00Z",submissionStatus:200}});
  const after=snapshot({[site+"/"]:page("b")});
  const {report,calls}=await scenario(before,after,{services:{
    now:()=>clock,
    pause:async milliseconds=>{assert.ok(milliseconds<=30_000);pauses.push(milliseconds);clock+=milliseconds;},
    collect:async()=>{collections+=1;return after;},
  }});
  assert.equal(pauses.reduce((a,b)=>a+b,0),240_000);
  assert.equal(collections,2);
  assert.equal(report.status,"ACCEPTED");
  assert.equal(calls.submitted.length,1);
});

test("IndexNow previews do not send notifications or write durable state",async()=>{
  const {report,calls}=await scenario(snapshot({[site+"/"]:page()}),snapshot({[site+"/"]:page("b")}),{apply:false});
  assert.equal(report.status,"PREVIEW");
  assert.deepEqual(report.urls,[site+"/"]);
  assert.deepEqual(calls.submitted,[]);
  assert.deepEqual(calls.saved,[]);
});
