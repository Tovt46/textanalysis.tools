import {expect,test} from "@playwright/test";

const baseline="Clear product documentation helps readers complete a task. Clear documentation names the task, shows the next step, and explains the expected result. Product documentation should be accurate, concise, and easy to verify.";

async function callTool(page,name,input={}){
  return page.evaluate(async({name,input})=>{
    const tool=window.__registeredEvidenceTools.find(item=>item.name===name);
    if(!tool)throw new Error(`Missing WebMCP tool: ${name}`);
    return tool.execute(input);
  },{name,input});
}

test("WebMCP workflow preserves human approval between proposal and apply",async({page})=>{
  await page.addInitScript(()=>{
    window.__registeredEvidenceTools=[];
    Object.defineProperty(document,"modelContext",{configurable:true,value:{registerTool(tool){window.__registeredEvidenceTools.push(tool);}}});
  });
  await page.goto("/tools/evidence-workspace");
  await expect(page.locator(".evidence-capability")).toHaveAttribute("data-status","ready");
  await expect.poll(()=>page.evaluate(()=>window.__registeredEvidenceTools.map(tool=>tool.name))).toEqual([
    "create_analysis_workspace","analyze_workspace","submit_review_plan","apply_approved_patch","export_analysis_report",
  ]);

  let result=await callTool(page,"create_analysis_workspace",{originalText:baseline,goal:"Make verification more specific.",focusTerms:["documentation","verify"]});
  expect(result.ok).toBe(true);
  await expect(page.getByTestId("workspace-revision")).toHaveText("1");

  result=await callTool(page,"analyze_workspace");
  expect(result.ok).toBe(true);
  expect(result.evidence.length).toBeGreaterThan(2);
  expect(result.changeMap).toBeTruthy();
  expect(Array.isArray(result.claimSummary)).toBe(true);
  expect(Array.isArray(result.reviewQueue)).toBe(true);
  await expect(page.getByTestId("analysis-metrics")).toBeVisible();

  const evidenceRef=result.evidence.find(item=>item.label==="Focus: verify").id;
  result=await callTool(page,"submit_review_plan",{baseRevision:1,recommendations:[
    {kind:"structure",title:"Lead with the reader task",explanation:"The opening can make the measured task more actionable.",evidenceRefs:[evidenceRef],expectedText:"Clear product documentation helps readers complete a task.",replacementText:"Start product documentation with the task readers need to complete.",rationale:"Turn the opening into an instruction."},
    {kind:"clarity",title:"Expose the workflow",explanation:"The measured text compresses the sequence into one abstract sentence.",evidenceRefs:[evidenceRef],expectedText:"Clear documentation names the task, shows the next step, and explains the expected result.",replacementText:"Name the task first, show the next step, then explain the expected result.",rationale:"Make the sequence easier to follow."},
    {kind:"verification",title:"Verification needs a concrete target",explanation:"The measured focus phrase appears once and can name what the reader should verify.",evidenceRefs:[evidenceRef],expectedText:"easy to verify",replacementText:"easy to verify against the expected result",rationale:"Connect verification to a concrete outcome."},
  ]});
  expect(result.ok).toBe(true);
  expect(result.submittedPlan).toHaveLength(3);
  await expect(page.getByTestId("agent-mission")).toHaveAttribute("data-status","ready");
  await expect(page.getByTestId("finding-card")).toHaveCount(3);
  const patchId=result.submittedPlan.find(item=>item.replacementText.includes("verify against")).id;
  const patchCard=page.getByTestId("patch-card").filter({hasText:"Verification needs a concrete target"});
  await expect(patchCard).toHaveAttribute("data-status","proposed");
  await expect(patchCard).toContainText("easy to verify against the expected result");

  result=await callTool(page,"apply_approved_patch",{patchId,expectedRevision:1});
  expect(result.ok).toBe(false);
  expect(result.error.code).toBe("HUMAN_APPROVAL_REQUIRED");
  await expect(page.getByTestId("workspace-revision")).toHaveText("1");

  await patchCard.getByRole("button",{name:"Approve patch"}).click();
  await expect(patchCard).toHaveAttribute("data-status","approved");
  result=await callTool(page,"apply_approved_patch",{patchId,expectedRevision:1});
  expect(result.ok).toBe(true);
  await expect(page.getByTestId("workspace-revision")).toHaveText("2");
  await expect(page.getByTestId("current-text")).toHaveValue(/easy to verify against the expected result/);
  await expect(page.getByTestId("analysis-metrics")).toHaveCount(0);

  result=await callTool(page,"analyze_workspace");
  expect(result.metrics.wordDelta).toBeGreaterThan(0);
  result=await callTool(page,"export_analysis_report",{format:"markdown"});
  expect(result.ok).toBe(true);
  expect(result.content).toContain("Before / after metrics");
  expect(result.content).toContain("Verification needs a concrete target");
});

test("ordinary browser keeps the full manual fallback visible",async({page})=>{
  await page.goto("/tools/evidence-workspace");
  await expect(page.locator(".evidence-capability")).toHaveAttribute("data-status","fallback");
  await expect(page.getByTestId("original-text")).toBeVisible();
  await expect(page.getByRole("button",{name:/Create workspace/})).toBeEnabled();
});

test("claim-aware UI converts a safe duplicate into a reviewable patch without applying it",async({page})=>{
  const originalText=`Provider A
Welcome offer: 50% off first reading
Price: $2.99/min
Money-back guarantee`;
  const currentText=`Provider A
New User Offer: $10 free + 80% OFF
New User Offer: $10 free + 80% OFF
Price: $1.00/min
37,396 users got a reading this month`;
  await page.goto("/tools/evidence-workspace");
  await page.getByTestId("original-text").fill(originalText);
  await page.getByTestId("current-version-input").fill(currentText);
  await page.getByTestId("workspace-goal").fill("Find claim drift and safe duplicate cleanup.");
  await page.getByRole("button",{name:/Create workspace/}).click();
  await page.getByRole("button",{name:"Build review"}).click();

  await expect(page.getByTestId("claim-ledger")).toBeVisible();
  await expect(page.getByTestId("review-queue")).toContainText("Verify changed prices");
  await page.getByText(/Quick cleanup/).click();
  const duplicateItem=page.getByTestId("review-item").filter({hasText:"Remove adjacent duplicate"});
  await duplicateItem.getByRole("button",{name:"Queue exact patch"}).click();
  await expect(duplicateItem.getByRole("button",{name:"Queued"})).toBeDisabled();
  await expect(page.getByTestId("finding-card")).toContainText("Remove adjacent duplicate");
  await expect(page.getByTestId("patch-card")).toHaveAttribute("data-status","proposed");
  await expect(page.getByTestId("current-text")).toHaveValue(currentText);
});
