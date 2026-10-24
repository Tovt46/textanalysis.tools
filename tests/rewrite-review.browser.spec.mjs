import {readFile,writeFile} from "node:fs/promises";
import {expect,test} from "@playwright/test";

const original="The Studio plan costs $45 per month.\nFor annual billing only.\nIncludes data export and team workspaces.";
const rewritten="The Studio plan costs $35 per month.\nIncludes team workspaces.";

function browserFailures(page){
  const failures=[];
  page.on("pageerror",error=>failures.push(`Page error: ${error.message}`));
  page.on("console",message=>{
    if(message.type()==="error")failures.push(`Console error: ${message.text()}`);
  });
  page.on("requestfailed",request=>{
    if(new URL(request.url()).hostname==="127.0.0.1")failures.push(`Request failed: ${request.url()} ${request.failure()?.errorText}`);
  });
  return failures;
}

async function downloadReport(page,format){
  const pending=page.waitForEvent("download");
  await page.getByRole("button",{name:`Download ${format}`,exact:true}).click();
  const download=await pending;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(format==="JSON"?/\.json$/:/\.md$/);
  return readFile(await download.path(),"utf8");
}

async function compareOwnTexts(page){
  await page.getByTestId("original-text").fill(original);
  await page.getByTestId("current-version-input").fill(rewritten);
  await page.getByTestId("focus-terms").fill("data export");
  await page.getByRole("button",{name:/Compare texts/}).click();
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(1);
  await expect(page.getByRole("heading",{name:"Changes to review",exact:true})).toBeFocused();
}

async function propose(page,{expected,replacement,rationale}){
  const summary=page.getByText("Propose an exact edit",{exact:true});
  if(!await page.getByTestId("patch-expected").isVisible())await summary.click();
  await page.getByTestId("patch-expected").fill(expected);
  await page.getByTestId("patch-replacement").fill(replacement);
  await page.getByTestId("patch-rationale").fill(rationale);
  await page.getByRole("button",{name:"Propose patch",exact:true}).click();
  return page.getByTestId("patch-card").filter({hasText:rationale});
}

test("home example works by keyboard and exports the three changes before starting a clean review",async({page})=>{
  const failures=browserFailures(page);
  await page.goto("/");
  const entry=page.getByTestId("home-rewrite-entry");
  await expect(entry.getByRole("heading",{name:"What got lost in the rewrite?"})).toBeVisible();
  await expect(entry.locator(".rh-rewrite-preview,.rh-rewrite-steps")).toHaveCount(0);
  await expect(entry).not.toContainText("Fieldnote Pro");
  const exampleLink=page.getByTestId("rewrite-example-link");
  await exampleLink.focus();
  await exampleLink.press("Enter");
  await expect(page).toHaveURL(/\/tools\/rewrite-review\?example=rewrite$/);
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(1);
  await expect(page.getByTestId("webmcp-status")).toHaveCount(0);
  await expect(page.getByText("FICTIONAL EXAMPLE · PRODUCT COPY",{exact:true})).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Original text · baseline",exact:true})).toHaveValue(/\$29 per month/);
  await expect(page.getByTestId("current-text")).toHaveValue(/\$19 per month/);
  await expect(page.getByTestId("current-text")).not.toHaveValue(/annual billing|data export/);
  const queue=page.getByTestId("review-queue");
  await expect(queue).toContainText("Verify changed prices");
  const changedPrice=page.getByTestId("review-item").filter({hasText:"Verify changed prices"});
  await expect(changedPrice).toContainText("$29");
  await expect(changedPrice).toContainText("$19");
  await expect(queue).toContainText("Review missing condition:");
  await expect(queue).toContainText("For annual billing only.");
  await expect(queue).toContainText("Review missing tracked term: “data export”");
  await expect(page.getByTestId("patch-card")).toHaveCount(0);

  const markdown=await downloadReport(page,"Markdown");
  expect(markdown).toContain("$29");
  expect(markdown).toContain("$19");
  expect(markdown).toContain("For annual billing only.");
  expect(markdown).toContain("Review missing tracked term: “data export”");
  expect(markdown).toContain("does not verify facts");
  expect(markdown).toContain("data export: baseline 1; current 0");
  const report=JSON.parse(await downloadReport(page,"JSON"));
  expect(report.revision).toBe(1);
  expect(report.analysis.revision).toBe(1);
  expect(report.analysis.reviewQueue.find(item=>item.title==="Verify changed prices").baselineExcerpts.join(" ")).toContain("$29");
  expect(report.analysis.reviewQueue.find(item=>item.title==="Verify changed prices").currentExcerpts.join(" ")).toContain("$19");
  expect(report.findings).toEqual([]);
  expect(report.patches).toEqual([]);

  await page.getByRole("button",{name:"Compare my texts",exact:true}).click();
  await expect(page.getByTestId("original-text")).toBeFocused();
  await expect(page.getByTestId("original-text")).toHaveValue("");
  await expect(page.getByTestId("current-version-input")).toHaveValue("");
  await expect(page.getByTestId("focus-terms")).toHaveValue("");
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(0);
  await expect(page.getByTestId("finding-card")).toHaveCount(0);
  await expect(page).toHaveURL(/\/tools\/rewrite-review$/);
  await page.reload();
  await expect(page.getByTestId("original-text")).toHaveValue("");
  await expect(page.getByTestId("workspace-revision")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("own-text notes and exact edits require approval, invalidate other edits, and lock export until reanalysis",async({page})=>{
  const failures=browserFailures(page);
  await page.goto("/tools/rewrite-review?mode=own");
  await compareOwnTexts(page);
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  const priceItem=page.getByTestId("review-item").filter({hasText:"Verify changed prices"});
  const addPriceNote=priceItem.getByRole("button",{name:"Add evidence note",exact:true});
  await addPriceNote.focus();
  await addPriceNote.press("Enter");
  await expect(priceItem.getByRole("button",{name:"Note added",exact:true})).toBeDisabled();
  const pricePatch=await propose(page,{expected:"$35",replacement:"$45",rationale:"Restore the source price after checking the product brief."});
  await expect(pricePatch).toHaveAttribute("data-status","proposed");
  await expect(pricePatch.getByRole("button",{name:"Apply approved patch",exact:true})).toHaveCount(0);
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);

  const termItem=page.getByTestId("review-item").filter({hasText:"Review missing tracked term: “data export”"});
  await termItem.getByRole("button",{name:"Add evidence note",exact:true}).click();
  const termPatch=await propose(page,{expected:"Includes team workspaces.",replacement:"Includes data export and team workspaces.",rationale:"Restore the product feature after checking it against the source."});
  await termPatch.getByRole("button",{name:"Approve patch",exact:true}).click();
  const approvePrice=pricePatch.getByRole("button",{name:"Approve patch",exact:true});
  await approvePrice.focus();
  await approvePrice.press("Enter");
  await expect(pricePatch).toHaveAttribute("data-status","approved");
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  const applyPrice=pricePatch.getByRole("button",{name:"Apply approved patch",exact:true});
  await applyPrice.focus();
  await applyPrice.press("Enter");
  await expect(page.getByTestId("workspace-revision")).toHaveText("2");
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten.replace("$35","$45"));
  await expect(pricePatch).toHaveAttribute("data-status","applied");
  await expect(termPatch).toHaveAttribute("data-status","stale");
  await expect(termPatch.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Download Markdown",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Download JSON",exact:true})).toBeDisabled();
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(0);
  await page.getByRole("button",{name:"Build review",exact:true}).click();
  const report=JSON.parse(await downloadReport(page,"JSON"));
  expect(report.revision).toBe(2);
  expect(report.analysis.revision).toBe(2);
  expect(report.patches.map(item=>item.status)).toEqual(["applied","stale"]);

  await page.getByRole("button",{name:"Undo last apply",exact:true}).click();
  await expect(page.getByTestId("workspace-revision")).toHaveText("3");
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  await expect(page.getByRole("button",{name:"Download Markdown",exact:true})).toBeDisabled();
  await expect(termPatch).toHaveAttribute("data-status","stale");
  await expect(page.getByRole("button",{name:"Apply approved patch",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Build review",exact:true}).click();
  await expect(page.getByTestId("finding-card")).toHaveCount(0);
  await page.getByRole("button",{name:"Edit these texts",exact:true}).click();
  await expect(page.getByTestId("original-text")).toBeFocused();
  await expect(page.getByTestId("original-text")).toHaveValue(original);
  await expect(page.getByTestId("current-version-input")).toHaveValue(rewritten);
  await expect(page.getByTestId("focus-terms")).toHaveValue("data export");
  await expect(page.getByTestId("patch-card")).toHaveCount(0);
  await page.getByTestId("current-version-input").fill(original);
  await page.getByRole("button",{name:/Compare texts/}).click();
  await expect(page.getByTestId("workspace-revision")).toHaveText("1");
  await expect(page.getByTestId("finding-card")).toHaveCount(0);
  await expect(page.getByTestId("patch-card")).toHaveCount(0);
  await expect(page.getByTestId("review-queue")).toHaveCount(0);
  const fresh=JSON.parse(await downloadReport(page,"JSON"));
  expect(fresh.id).not.toBe(report.id);
  expect(fresh.patches).toEqual([]);
  expect(fresh.findings).toEqual([]);
  expect(failures).toEqual([]);
});

test("editing the fictional example replaces its initial change summary with a current-revision prompt",async({page})=>{
  await page.goto("/tools/rewrite-review?example=rewrite");
  const priceItem=page.getByTestId("review-item").filter({hasText:"Verify changed prices"});
  await priceItem.getByRole("button",{name:"Add evidence note",exact:true}).click();
  const patch=await propose(page,{expected:"$19",replacement:"$29",rationale:"Restore the fictional baseline price for this review demonstration."});
  await patch.getByRole("button",{name:"Approve patch",exact:true}).click();
  await patch.getByRole("button",{name:"Apply approved patch",exact:true}).click();
  await expect(page.getByTestId("current-text")).toHaveValue(/Fieldnote Pro costs \$29/);
  await expect(page.locator(".evidence-example-note")).toContainText("You have edited the example; review the current revision below.");
  await expect(page.locator(".evidence-example-note")).not.toContainText("changed $29 to $19");
  await expect(page.getByRole("button",{name:"Download Markdown",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Build review",exact:true}).click();
  await expect(page.locator(".evidence-example-note")).toContainText("You have edited the example; review the current revision below.");
  await expect(page.getByTestId("review-queue")).not.toContainText("Verify changed prices");
});

test("reload restores review notes and an example link preserves saved work until explicit replacement",async({page})=>{
  const failures=browserFailures(page);
  await page.goto("/tools/rewrite-review?mode=own");
  await compareOwnTexts(page);
  await page.getByTestId("review-item").filter({hasText:"Verify changed prices"}).getByRole("button",{name:"Add evidence note",exact:true}).click();
  const saved=JSON.parse(await downloadReport(page,"JSON"));
  await page.reload();
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  await expect(page.getByTestId("finding-card")).toHaveCount(1);
  await page.goto("/");
  await page.getByTestId("rewrite-example-link").click();
  const notice=page.getByTestId("saved-review-notice");
  await expect(notice).toContainText("Your saved review is open.");
  await expect(notice).toContainText("Your example link has kept it intact.");
  await expect(notice.getByRole("button",{name:"Load the example instead",exact:true})).toBeVisible();
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  await expect(page.getByTestId("finding-card")).toHaveCount(1);
  const restored=JSON.parse(await downloadReport(page,"JSON"));
  expect(restored.id).toBe(saved.id);
  expect(restored.findings).toEqual(saved.findings);
  await page.goto("/tools/rewrite-review?mode=own");
  await expect(notice).toContainText("Your own-text link has kept it intact.");
  await expect(notice.getByRole("button",{name:"Start a new comparison",exact:true})).toBeVisible();
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  await page.goto("/tools/rewrite-review?example=rewrite");
  await notice.getByRole("button",{name:"Load the example instead",exact:true}).click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByTestId("current-text")).toHaveValue(/Fieldnote Pro costs \$19/);
  await expect(page.getByTestId("finding-card")).toHaveCount(0);
  await expect(page.getByTestId("patch-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("current-text")).toHaveValue(/Fieldnote Pro costs \$19/);
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(1);
  await expect(page.getByTestId("saved-review-notice")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("rewrite example and own-text sessions leave an expert workspace and its notes intact",async({page})=>{
  const failures=browserFailures(page);
  await page.goto("/tools/evidence-workspace");
  await compareOwnTexts(page);
  await page.getByTestId("review-item").filter({hasText:"Verify changed prices"}).getByRole("button",{name:"Add evidence note",exact:true}).click();
  const legacySaved=await page.evaluate(()=>sessionStorage.getItem("textanalysis-evidence-workspace-v2"));
  const legacy=JSON.parse(legacySaved);
  expect(legacy.findings).toHaveLength(1);

  await page.goto("/tools/rewrite-review?example=rewrite");
  await expect(page.getByTestId("current-text")).toHaveValue(/Fieldnote Pro costs \$19/);
  await expect(page.getByTestId("finding-card")).toHaveCount(0);
  expect(await page.evaluate(()=>sessionStorage.getItem("textanalysis-evidence-workspace-v2"))).toBe(legacySaved);
  await page.getByRole("button",{name:"Compare my texts",exact:true}).click();
  await compareOwnTexts(page);
  const rewriteSaved=JSON.parse(await page.evaluate(()=>sessionStorage.getItem("textanalysis-rewrite-review-v1")));
  expect(rewriteSaved.id).not.toBe(legacy.id);
  expect(rewriteSaved.findings).toEqual([]);
  expect(await page.evaluate(()=>sessionStorage.getItem("textanalysis-evidence-workspace-v2"))).toBe(legacySaved);
  await page.getByRole("button",{name:"Compare my texts",exact:true}).click();
  expect(await page.evaluate(()=>sessionStorage.getItem("textanalysis-rewrite-review-v1"))).toBeNull();

  await page.goto("/tools/evidence-workspace");
  await expect(page.getByTestId("current-text")).toHaveValue(rewritten);
  await expect(page.getByTestId("finding-card")).toHaveCount(1);
  const restored=JSON.parse(await downloadReport(page,"JSON"));
  expect(restored.id).toBe(legacy.id);
  expect(restored.findings).toEqual(legacy.findings);
  expect(restored.patches).toEqual(legacy.patches);
  expect(failures).toEqual([]);
});

test("rewrite comparison requires both versions and keeps advanced agent setup out of the first session",async({page})=>{
  await page.goto("/tools/rewrite-review?mode=own");
  await expect(page.getByText("Review goal and single-text workspace",{exact:true})).toHaveCount(0);
  await expect(page.getByTestId("webmcp-status")).toHaveCount(0);
  await page.getByTestId("original-text").fill(original);
  await page.getByRole("button",{name:/Compare texts/}).click();
  await expect(page.getByTestId("evidence-workspace").getByRole("alert")).toContainText("Paste the rewritten text");
  await expect(page.getByTestId("workspace-revision")).toHaveCount(0);
});

test("home, review, and input controls fit desktop, tablet, and mobile widths and work from the keyboard",async({page})=>{
  const failures=browserFailures(page);
  for(const width of [1440,768,360]){
    await page.setViewportSize({width,height:900});
    await page.goto("/");
    await expect(page.getByTestId("home-rewrite-entry")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`Home overflow at ${width}px`).toBe(true);
    const example=page.getByTestId("rewrite-example-link");
    await example.focus();
    await example.press("Enter");
    await expect(page.getByTestId("review-queue")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`Review overflow at ${width}px`).toBe(true);
    const measurements=page.getByText("Inspect measurements and commercial claims",{exact:true});
    await measurements.focus();
    await measurements.press("Enter");
    await expect(page.getByTestId("claim-ledger")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`Expanded measurements overflow at ${width}px`).toBe(true);
    const own=page.getByRole("button",{name:"Compare my texts",exact:true});
    await own.focus();
    await own.press("Enter");
    await expect(page.getByTestId("original-text")).toBeFocused();
    await page.getByTestId("original-text").press("Tab");
    await expect(page.getByTestId("current-version-input")).toBeFocused();
    await page.getByTestId("current-version-input").press("Tab");
    await expect(page.getByTestId("focus-terms")).toBeFocused();
    await page.getByTestId("focus-terms").press("Tab");
    await expect(page.getByRole("button",{name:/Compare texts/})).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`Input overflow at ${width}px`).toBe(true);
  }
  expect(failures).toEqual([]);
});

test("capture the rendered homepage entry and example review for visual inspection",async({page},testInfo)=>{
  const mobile=testInfo.project.name.includes("mobile");
  const size=mobile?"mobile":"desktop";
  await page.setViewportSize({width:mobile?375:1440,height:1000});
  await page.goto("/");
  await page.evaluate(async()=>{await document.fonts.ready;});
  const homePath=testInfo.outputPath(`home-entry-${size}.png`);
  await page.getByTestId("home-rewrite-entry").screenshot({path:homePath,scale:"css"});
  await testInfo.attach(`Homepage rewrite entry · ${size}`,{path:homePath,contentType:"image/png"});
  await page.getByTestId("rewrite-example-link").click();
  await expect(page.getByTestId("review-queue")).toBeVisible();
  await page.evaluate(async()=>{await document.fonts.ready;});
  const reviewPath=testInfo.outputPath(`example-review-${size}.png`);
  const result=mobile?page.getByTestId("review-queue"):page.getByTestId("evidence-workspace");
  await result.screenshot({path:reviewPath,scale:"css"});
  await testInfo.attach(`Example review · ${size}`,{path:reviewPath,contentType:"image/png"});
  if(mobile){
    await page.getByRole("heading",{level:1,name:"What got lost in the rewrite?"}).scrollIntoViewIfNeeded();
    const contextPath=testInfo.outputPath("example-page-mobile.png");
    await page.screenshot({path:contextPath,scale:"css"});
    await testInfo.attach("Example page context · mobile",{path:contextPath,contentType:"image/png"});
  }
  if(!mobile){
    const markdown=await downloadReport(page,"Markdown");
    const json=await downloadReport(page,"JSON");
    const markdownPath=testInfo.outputPath("example-report.md");
    const jsonPath=testInfo.outputPath("example-report.json");
    await writeFile(markdownPath,markdown);
    await writeFile(jsonPath,json);
    await testInfo.attach("Downloaded example report · Markdown",{path:markdownPath,contentType:"text/markdown"});
    await testInfo.attach("Downloaded example report · JSON",{path:jsonPath,contentType:"application/json"});
  }
});

test("localized home entries retain their language and fit a narrow screen",async({page})=>{
  const failures=browserFailures(page);
  await page.setViewportSize({width:360,height:900});
  const cases=[
    {locale:"ru",heading:"Что потерялось после рерайта?",language:"Инструмент на английском",own:"Сравнить свои тексты"},
    {locale:"uk",heading:"Що загубилося після рерайту?",language:"Інструмент англійською",own:"Порівняти свої тексти"},
    {locale:"es",heading:"¿Qué se perdió al reescribir?",language:"Herramienta en inglés",own:"Comparar mis textos"},
  ];
  for(const item of cases){
    await page.goto(`/${item.locale}`);
    const entry=page.getByTestId("home-rewrite-entry");
    await expect(entry.getByRole("heading",{name:item.heading,exact:true})).toBeVisible();
    await expect(entry.getByText(item.language,{exact:true})).toBeVisible();
    await expect(entry.getByTestId("rewrite-example-link")).toHaveAttribute("href","/tools/rewrite-review?example=rewrite");
    await expect(entry.getByRole("link",{name:item.own})).toHaveAttribute("href","/tools/rewrite-review?mode=own");
    await expect(entry.locator(".rh-rewrite-preview,.rh-rewrite-steps")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`Localized ${item.locale} home overflow at 360px`).toBe(true);
  }
  expect(failures).toEqual([]);
});
