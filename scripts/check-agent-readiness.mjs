import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {appendFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {createServer} from "node:net";
import {resolve} from "node:path";
import {setTimeout as wait} from "node:timers/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import {runHttpChecks} from "./agent-readiness/http.mjs";
import {runWebMcpCheck} from "./agent-readiness/browser.mjs";

export function readinessSummary(checks){
  const numbers=checks.map(check=>check.number).sort((a,b)=>a-b);
  const complete=numbers.length===13&&numbers.every((number,index)=>number===index+1);
  return {
    status:complete&&checks.every(check=>check.status==="PASS")?"PASS":"FAIL",
    complete,
    passed:checks.filter(check=>check.status==="PASS").length,
    failed:checks.filter(check=>check.status!=="PASS").length,
    total:checks.length,
  };
}

export async function verifyAgentReadiness({
  baseUrl=process.env.SMOKE_BASE_URL||"https://textanalysis.tools/",
  expectedRevision=process.env.EXPECT_DEPLOYMENT_REVISION?.trim().toLowerCase(),
  outputDir=process.env.AGENT_READINESS_OUTPUT_DIR||"test-results/agent-readiness",
  executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
}={}){
  const directory=resolve(outputDir);
  await mkdir(directory,{recursive:true});
  const report={site:new URL(baseUrl).origin,checkedAt:new Date().toISOString(),expectedRevision:expectedRevision??null,checks:[]};
  try{
    report.checks=await runHttpChecks({baseUrl:report.site,expectedRevision});
    report.checks.push(await runWebMcpCheck({baseUrl:report.site,outputDir:directory,executablePath}));
    const health=await fetch(new URL("/api/health",report.site),{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20_000)});
    assert.equal(health.status,200,"Final deployment health request failed.");
    assert.equal(health.headers.get("cache-control"),"no-store");
    report.health=await health.json();
    assert.equal(report.health.status,"ok");
    const revisionBefore=report.checks.find(check=>check.number===13)?.evidence?.revisionBefore;
    assert.ok(revisionBefore,"HTTP verification did not record the served revision.");
    assert.equal(report.health.revision,revisionBefore,"Deployment changed during browser verification.");
    if(expectedRevision)assert.equal(report.health.revision,expectedRevision);
  }catch(error){
    report.error=error instanceof Error?error.message:String(error);
  }
  report.checks.sort((a,b)=>a.number-b.number);
  report.summary=readinessSummary(report.checks);
  if(report.error)report.summary.status="FAIL";
  report.finishedAt=new Date().toISOString();
  const cell=value=>String(value).replaceAll("|","\\|").replaceAll(/\r?\n/g," ");
  const markdown=[
    "# Agent-readiness gate",
    "",
    `Site: ${report.site}`,
    `Checked: ${report.checkedAt}`,
    `Expected revision: ${report.expectedRevision??"not pinned"}`,
    `Served revision: ${report.health?.revision??"not verified"}`,
    `Result: **${report.summary.status}** (${report.summary.passed}/13 passed)`,
    "",
    "| # | Check | Result | Evidence |",
    "| --- | --- | --- | --- |",
    ...report.checks.map(check=>`| ${check.number} | ${cell(check.name)} | ${check.status} | ${cell(check.error??JSON.stringify(check.evidence??{}))} |`),
    ...(report.error?["",`Infrastructure/revision failure: ${cell(report.error)}`]:[]),
    ...(!report.summary.complete?["","FAIL: the gate did not produce exactly one result for each of the 13 checks."]:[]),
    "",
    "sameAs checks validate the declared project profile identities; they do not depend on third-party website availability.",
    "",
  ].join("\n");
  await writeFile(resolve(directory,"report.json"),JSON.stringify(report,null,2)+"\n");
  await writeFile(resolve(directory,"report.md"),markdown);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,markdown);
  for(const check of report.checks)console.log(`${check.status} ${check.number}/13 ${check.name}${check.error?`: ${check.error}`:""}`);
  if(report.error)console.error(report.error);
  console.log(`Agent-readiness ${report.summary.status}: ${report.summary.passed}/13; report: ${resolve(directory,"report.json")}`);
  return report;
}

async function withLocalProductionServer(outputDir,callback){
  await readFile(new URL("../.next/BUILD_ID",import.meta.url)).catch(()=>{
    throw new Error("A production build is required. Run npm run build:hostinger before test:agent-readiness.");
  });
  const port=await new Promise((accept,reject)=>{
    const probe=createServer();
    probe.once("error",reject);
    probe.listen(0,"127.0.0.1",()=>{
      const port=probe.address().port;
      probe.close(error=>error?reject(error):accept(port));
    });
  });
  const baseUrl=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,[fileURLToPath(new URL("../node_modules/next/dist/bin/next",import.meta.url)),"start","--hostname","127.0.0.1","--port",String(port)],{
    env:{...process.env,NODE_ENV:"production",PORT:String(port)},
    stdio:["ignore","pipe","pipe"],
  });
  let logs="";
  let stopping=false;
  const controller=new AbortController();
  const closed=new Promise(accept=>server.once("close",accept));
  server.stdout.on("data",chunk=>{logs=(logs+chunk).slice(-100_000);});
  server.stderr.on("data",chunk=>{logs=(logs+chunk).slice(-100_000);});
  const failed=new Promise((_,reject)=>{
    server.once("error",reject);
    server.once("exit",(code,signal)=>{if(!stopping)reject(new Error(`Production server exited (${signal??code}).\n${logs}`));});
  });
  try{
    return await Promise.race([failed,(async()=>{
      let ready=false;
      for(let attempt=0;attempt<60;attempt+=1){
        controller.signal.throwIfAborted();
        try{
          const response=await fetch(new URL("/api/health",baseUrl),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(1000)])});
          await response.body?.cancel();
          if(response.status===200){ready=true;break;}
        }catch{/* Keep waiting only for local server startup. */}
        await wait(500,undefined,{signal:controller.signal});
      }
      assert.ok(ready,`Production server did not start.\n${logs}`);
      return callback(baseUrl);
    })()]);
  }finally{
    stopping=true;
    controller.abort();
    server.kill("SIGTERM");
    const force=setTimeout(()=>server.kill("SIGKILL"),5000);
    await closed;
    clearTimeout(force);
    await writeFile(resolve(outputDir,"local-server.log"),logs);
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const outputDir=resolve(process.env.AGENT_READINESS_OUTPUT_DIR||"test-results/agent-readiness");
  try{
    await mkdir(outputDir,{recursive:true});
    const args=process.argv.slice(2);
    assert.ok(args.every(arg=>arg==="--local"),"Only --local is supported; use SMOKE_BASE_URL for another server.");
    const report=args.includes("--local")
      ?await withLocalProductionServer(outputDir,baseUrl=>verifyAgentReadiness({baseUrl,outputDir}))
      :await verifyAgentReadiness({outputDir});
    if(report.summary.status!=="PASS")process.exitCode=1;
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await writeFile(resolve(outputDir,"startup-error.log"),message+"\n");
    console.error(message);
    process.exitCode=1;
  }
}
