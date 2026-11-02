import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {join} from "node:path";
import {chromium} from "@playwright/test";

const canonicalOrigin="https://textanalysis.tools";
const toolName="discover_textanalysis_tools";
const viewports=[
  {name:"desktop",width:1440,height:1000},
  {name:"tablet",width:820,height:1180},
  {name:"mobile",width:390,height:844},
];

// These are native browser APIs. Deliberately do not inject modelContext or
// replace registerTool: a missing API or failed registration must fail the gate.
export async function runWebMcpCheck({baseUrl,outputDir,executablePath}={}){
  const origin=new URL(baseUrl).origin;
  const report={number:12,name:"Native WebMCP discovery and execution",status:"FAIL",pages:[]};
  let browser;
  try{
    if(outputDir)await mkdir(outputDir,{recursive:true});
    browser=await chromium.launch({
      ...(executablePath?{executablePath}:{}),
      headless:true,
      timeout:30_000,
      args:["--enable-experimental-web-platform-features","--enable-blink-features=WebMCP"],
    });
    report.browser=browser.version();
    for(const viewport of viewports){
      const pageReport={viewport,status:"FAIL",errors:[],failedRequests:[],flightResponses:[],consoleErrors:[]};
      report.pages.push(pageReport);
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
      const page=await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(45_000);
      const responseRecords=new WeakMap();
      page.on("pageerror",error=>pageReport.errors.push(error.message));
      page.on("console",message=>{if(message.type()==="error")pageReport.consoleErrors.push(message.text());});
      page.on("response",response=>{
        if(new URL(response.url()).origin!==origin)return;
        if(response.request().headers().rsc==="1"){
          pageReport.flightResponses.push({url:response.url(),status:response.status(),type:response.headers()["content-type"],vary:response.headers().vary});
        }
        if(response.status()>=400){
          const record={url:response.url(),status:response.status()};
          pageReport.failedRequests.push(record);
          responseRecords.set(response,record);
        }
      });
      page.on("requestfailed",request=>{
        if(new URL(request.url()).origin===origin){
          pageReport.failedRequests.push({url:request.url(),error:request.failure()?.errorText});
        }
      });
      try{
        let response=await page.goto(`${origin}/`,{waitUntil:"networkidle"});
        assert.ok(response,"Homepage navigation produced no response.");
        // Hostinger may require a real browser to finish its ordinary JS check.
        // Only this identified initial interstitial is exempted, and it is kept
        // in evidence; a blocked application page or later 403 still fails.
        const title=await page.title();
        if(response.status()===403&&/checking your browser/i.test(title)){
          pageReport.interstitial={status:403,title,url:response.url()};
          const initialChallenge=responseRecords.get(response);
          if(initialChallenge)initialChallenge.browserChallenge=true;
          await page.waitForFunction(()=>Boolean(document.querySelector('script[type="application/ld+json"]')),null,{timeout:45_000});
          response=await page.reload({waitUntil:"networkidle"});
        }
        assert.equal(response?.status(),200,"Homepage must load successfully in the browser.");
        assert.match(response.headers()["content-type"]??"",/^text\/html/);
        const surface=await page.evaluate(()=>{
          for(const [name,context] of [["document",document.modelContext],["navigator",navigator.modelContext]]){
            if(context&&typeof context.getTools==="function"&&typeof context.executeTool==="function")return name;
          }
          return null;
        });
        assert.ok(surface,`Chromium ${report.browser} does not expose native modelContext.getTools/executeTool. Install the pinned Playwright Chromium and enable WebMCP; API stubs are not accepted.`);
        pageReport.nativeApi=`${surface}.modelContext`;
        await page.waitForFunction(async({surface,name})=>{
          const context=surface==="document"?document.modelContext:navigator.modelContext;
          return (await context.getTools()).some(tool=>tool.name===name);
        },{surface,name:toolName});
        const native=await page.evaluate(async({surface,name})=>{
          const context=surface==="document"?document.modelContext:navigator.modelContext;
          const tool=(await context.getTools()).find(item=>item.name===name);
          // Chromium 151 exposes a JSON-string schema and takes serialized
          // arguments. Newer Chromium exposes the schema and arguments as JS
          // objects. In both cases invoke the real registered browser tool.
          const argumentsValue=typeof tool.inputSchema==="string"?"{}":{};
          const result=await Promise.race([
            context.executeTool(tool,argumentsValue),
            new Promise((_,reject)=>setTimeout(()=>reject(new Error("Native WebMCP executeTool timed out.")),15_000)),
          ]);
          return {name:tool.name,description:tool.description,inputSchema:tool.inputSchema,result};
        },{surface,name:toolName});
        pageReport.native=native;
        assert.equal(native.name,toolName);
        assert.ok(native.description?.length>=20,"WebMCP description must explain the tool.");
        const schema=typeof native.inputSchema==="string"?JSON.parse(native.inputSchema):native.inputSchema;
        assert.deepEqual(schema,{type:"object",properties:{},additionalProperties:false});
        const result=typeof native.result==="string"?JSON.parse(native.result):native.result;
        const discovery=JSON.parse(result.content.find(item=>item.type==="text").text);
        assert.deepEqual(discovery,{
          tools:`${canonicalOrigin}/tools`,api:`${canonicalOrigin}/openapi.json`,
          mcp:`${canonicalOrigin}/mcp`,workspace:`${canonicalOrigin}/tools/evidence-workspace`,
        });
        assert.equal(await page.getByRole("heading",{level:1}).count(),1);
        await page.locator('a[href="/contact"]').first().waitFor({state:"visible"});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Homepage overflows the viewport.");
        if(outputDir){
          pageReport.screenshot=join(outputDir,`${viewport.name}.png`);
          await page.screenshot({path:pageReport.screenshot,fullPage:true});
        }
        await page.locator('[data-audience="people"]').click();
        await page.waitForURL(`${origin}/tools/word-frequency-counter`);
        await page.getByRole("heading",{level:1}).waitFor({state:"visible"});
        await page.goBack({waitUntil:"networkidle"});
        await page.waitForURL(`${origin}/`);
        assert.ok(pageReport.flightResponses.some(response=>response.status===200&&response.type?.startsWith("text/x-component")),"Next client navigation did not receive a real RSC response.");
        await page.locator('a[href="/contact"]').first().click();
        await page.waitForURL(`${origin}/contact`);
        await page.locator('article a[href="mailto:alextovt2@gmail.com"]').waitFor({state:"visible"});
        assert.deepEqual(pageReport.errors,[],"Application raised browser errors.");
        assert.deepEqual(pageReport.failedRequests.filter(record=>!record.browserChallenge),[],"Application requests failed.");
        pageReport.status="PASS";
      }catch(error){
        pageReport.error=error instanceof Error?error.message:String(error);
        if(outputDir){
          pageReport.failureScreenshot=join(outputDir,`${viewport.name}-failure.png`);
          await page.screenshot({path:pageReport.failureScreenshot,fullPage:true}).catch(()=>{});
        }
      }finally{
        await context.close();
      }
    }
    const failed=report.pages.filter(page=>page.status!=="PASS");
    assert.equal(failed.length,0,failed.map(page=>`${page.viewport.name}: ${page.error}`).join("\n"));
    report.status="PASS";
    report.evidence="Native getTools discovery and executeTool on desktop, tablet and mobile, plus real Next client navigation and contact links. No API stubs.";
  }catch(error){
    report.error=error instanceof Error?error.message:String(error);
  }finally{
    await browser?.close();
  }
  return report;
}
