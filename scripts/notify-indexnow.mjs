import assert from "node:assert/strict";
import {appendFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {setTimeout as wait} from "node:timers/promises";
import {pathToFileURL} from "node:url";
import {collectManifest,planChanges,submitUrls} from "./indexnow-core.mjs";
import {loadState,saveState} from "./indexnow-state.mjs";

const config=JSON.parse(await readFile(new URL("../indexnow.config.json",import.meta.url),"utf8"));

export async function notifyIndexNow({repository,token,expectedRevision,apply=false,outputDir="test-results/indexnow"},services={}){
  const collect=services.collect??collectManifest;
  const load=services.load??loadState;
  const save=services.save??saveState;
  const submit=services.submit??submitUrls;
  const pause=services.pause??wait;
  const now=services.now??Date.now;
  assert.match(expectedRevision??"",/^[0-9a-f]{7,64}$/, "Set EXPECT_DEPLOYMENT_REVISION to the validated deployed revision.");
  const directory=resolve(outputDir);
  await mkdir(directory,{recursive:true});
  const report={checkedAt:new Date().toISOString(),expectedRevision,apply,status:"FAIL",urls:[]};
  try{
    const previous=await load({repository,token});
    let current=await collect({expectedRevision,config});
    report.pages=Object.keys(current.pages).length;
    report.baselineRevision=previous.manifest?.revision??null;
    // Existing inventory belongs in the sitemap. On first setup establish its
    // baseline without notifying every unchanged historical URL.
    if(!previous.manifest){
      report.status=apply?"BASELINED":"PREVIEW_BASELINE";
      if(apply)report.state=await save({repository,token,manifest:{...current,baselineOnly:true},previousRefSha:previous.refSha});
    }else{
      report.urls=planChanges(previous.manifest,current);
      report.status=apply?"UNCHANGED":"PREVIEW";
      if(apply&&report.urls.length){
        let delay=0;
        for(const url of report.urls){
          const submitted=previous.manifest.pages[url]?.submittedAt;
          if(submitted!==undefined){
            const timestamp=Date.parse(submitted);
            assert.ok(Number.isFinite(timestamp)&&timestamp<=now(),`Invalid previous submission time: ${url}`);
            delay=Math.max(delay,timestamp+300_000-now());
          }
        }
        if(delay>0){
          report.debounceMs=delay;
          console.log(`Waiting ${Math.ceil(delay/1000)} seconds before resubmitting recently changed URLs.`);
          // Keep waits bounded and observable, then re-collect in case another
          // deployment arrived while this notification was debounced.
          for(let remaining=delay;remaining>0;remaining-=Math.min(remaining,30_000))await pause(Math.min(remaining,30_000));
          current=await collect({expectedRevision,config});
          report.urls=planChanges(previous.manifest,current);
        }
        if(report.urls.length){
          report.receipt=await submit({config,urls:report.urls});
          assert.ok([200,202].includes(report.receipt.status),"IndexNow did not accept the changed URLs.");
          const submitted=new Set(report.urls);
          const manifest={...current,pages:Object.fromEntries(Object.entries(current.pages).map(([url,page])=>{
            const old=previous.manifest.pages[url];
            const timestamp=submitted.has(url)?report.receipt.acceptedAt:old?.submittedAt;
            const status=submitted.has(url)?report.receipt.status:old?.submissionStatus;
            return [url,{...page,...(timestamp?{submittedAt:timestamp,submissionStatus:status}:{})}];
          }))};
          report.state=await save({repository,token,manifest,previousRefSha:previous.refSha});
          report.status=report.receipt.status===202?"ACCEPTED_PENDING_VERIFICATION":"ACCEPTED";
        }
      }
    }
  }catch(error){
    report.status="FAIL";
    report.error=error instanceof Error?error.message:String(error);
    if(error.receipt)report.receipt=error.receipt;
  }
  report.finishedAt=new Date().toISOString();
  const markdown=["# IndexNow notification","",`Result: **${report.status}**`,`Validated deployment: ${expectedRevision}`,`Pages checked: ${report.pages??"not completed"}`,`New or updated URLs: ${report.urls.length}`,`Receipt: ${report.receipt?.status??"no notification required"}`,"",...report.urls.map(url=>`- ${url}`),...(report.error?["",report.error]:[]),"","HTTP 200 confirms receipt; HTTP 202 means accepted with key verification pending. Neither confirms search indexing.",""].join("\n");
  await writeFile(resolve(directory,"report.json"),JSON.stringify(report,null,2)+"\n");
  await writeFile(resolve(directory,"report.md"),markdown);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,markdown);
  console.log(`IndexNow ${report.status}: ${report.urls.length} new/updated URLs; ${resolve(directory,"report.json")}`);
  if(report.error)console.error(report.error);
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2);
    assert.ok(args.length===1&&["--apply","--dry-run"].includes(args[0]),"Use exactly --apply or --dry-run.");
    const report=await notifyIndexNow({repository:process.env.GITHUB_REPOSITORY,token:process.env.INDEXNOW_GITHUB_TOKEN,expectedRevision:process.env.EXPECT_DEPLOYMENT_REVISION,apply:args[0]==="--apply",outputDir:process.env.INDEXNOW_OUTPUT_DIR});
    if(report.status==="FAIL")process.exitCode=1;
  }catch(error){console.error(error.message??String(error));process.exitCode=1;}
}
