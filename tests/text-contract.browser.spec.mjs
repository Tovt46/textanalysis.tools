import {expect,test} from "@playwright/test";

const baseContract={
  version:2,source:"",revision:1,id:"contract-browser",title:"Guarded demo rewrite",brief:"Shorten safely.",outputLanguage:"same",createdAt:"2026-09-03T00:00:00.000Z",
  rules:[
    {id:"price",kind:"numeric_value",statement:"Preserve the exact value $5.99.",severity:"high",required:true,enabled:true,sourceExcerpt:"costs $5.99",expectedValue:"$5.99",expectation:"preserve",checkStrategy:"deterministic",requiresLiveEvidence:false,sourceOfTruthDomains:["example.com"]},
    {id:"caveat",kind:"semantic_invariant",statement:"Do not strengthen may help into a guarantee.",severity:"high",required:true,enabled:true,sourceExcerpt:"may help",expectation:"preserve",checkStrategy:"nemotron",requiresLiveEvidence:false,sourceOfTruthDomains:["example.com"]},
    {id:"refund",kind:"freshness_required",statement:"The currently stated refund period is 30 days.",severity:"medium",required:true,enabled:true,sourceExcerpt:"30-day refund",expectedValue:"current 30-day refund policy",expectation:"preserve",checkStrategy:"tavily",requiresLiveEvidence:true,sourceOfTruthDomains:["example.com"]},
  ],
};

function envelope(result){return{status:200,contentType:"application/json",body:JSON.stringify({apiVersion:"1.0",storage:"none",result})};}

async function mockSuccessfulRepair(page){
  await page.route("**/api/text-contract/compile",route=>route.fulfill(envelope({contract:{...baseContract,...route.request().postDataJSON()},usage:[{provider:"nebius",model:"reasoning-nemotron",operation:"compile",totalTokens:200}]})));
  await page.route("**/api/text-contract/generate",async route=>{
    const body=route.request().postDataJSON();
    const repair=body.mode==="repair";
    route.fulfill(envelope({attempt:{id:repair?"repair-1":"draft-1",number:repair?2:1,kind:repair?"repair":"draft",content:repair?"The plan costs $5.99 and may help. A 30-day refund is available.":"The plan costs $6.99 and will help. A 30-day refund is available.",createdAt:"2026-09-03T00:02:00.000Z",model:"fast-nemotron",usage:{provider:"nebius",model:"fast-nemotron",operation:"generate",totalTokens:160}},summary:repair?"Repaired two violations.":"Shortened the draft."}));
  });
  await page.route("**/api/text-contract/evaluate",async route=>{
    const body=route.request().postDataJSON();
    const repaired=body.candidate.includes("$5.99")&&body.candidate.includes("may help");
    const evidence=[{title:"Official refund policy",url:"https://example.com/refunds",excerpt:"Eligible refunds are available for 30 days.",score:.94}];
    route.fulfill(envelope({
      finalStatus:repaired?"READY":"BLOCKED",
      evaluations:[
        {ruleId:"price",status:repaired?"pass":"fail",explanation:repaired?"The exact price is preserved.":"The price changed.",sourceExcerpt:"$5.99",candidateExcerpt:repaired?"$5.99":"$6.99",evidence:[],evaluator:"deterministic"},
        {ruleId:"caveat",status:repaired?"pass":"fail",explanation:repaired?"The caveat remains.":"May was strengthened to will.",sourceExcerpt:"may help",candidateExcerpt:repaired?"may help":"will help",evidence:[],evaluator:"nemotron"},
        {ruleId:"refund",status:"pass",explanation:"The stated period matches the official source.",sourceExcerpt:"30-day refund",candidateExcerpt:"30-day refund",evidence,evaluator:"tavily"},
      ],
      usage:[{provider:"nebius",model:"reasoning-nemotron",operation:"evaluate",totalTokens:190},{provider:"tavily",operation:"search",credits:1}],
    }));
  });
}

test("one source and one brief produce an approved draft, self-detected failures, one repair, and evidence",async({page})=>{
  await mockSuccessfulRepair(page);
  await page.goto("/tools/text-contract");
  await expect(page.getByTestId("text-contract-workspace")).toBeVisible();
  await page.getByRole("button",{name:"Load demo"}).click();
  await expect(page.getByTestId("contract-source")).toHaveValue(/\$5\.99/);
  await expect(page.getByTestId("contract-brief")).toHaveValue(/may help/);
  await page.getByTestId("build-contract").click();
  await expect(page.getByTestId("contract-rules").locator("article")).toHaveCount(3);
  await expect(page.getByTestId("run-contract")).toHaveCount(0);
  await page.getByTestId("approve-contract").click();
  await page.getByTestId("run-contract").click();

  await expect(page.locator(".contract-results")).toHaveAttribute("data-status","READY");
  await expect(page.locator(".contract-result-head")).toContainText("3/3 rules passed");
  await expect(page.getByTestId("final-candidate")).toHaveValue(/\$5\.99 and may help/);
  await expect(page.locator(".contract-diff")).toHaveCount(2);
  await expect(page.locator(".contract-evaluations")).toContainText("Official refund policy");
  await expect(page.locator(".contract-usage")).toContainText("tavily");
  await page.getByRole("button",{name:"Accept",exact:true}).click();
  await expect(page.locator(".contract-result-head")).toContainText("ACCEPTED BY HUMAN");
  await page.getByTestId("final-candidate").fill("Human edit that has not been checked.");
  await expect(page.locator(".contract-result-head")).toContainText("RECHECK REQUIRED");
  await expect(page.getByRole("button",{name:"Accept",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Download report"})).toBeDisabled();
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("textanalysis-text-contract-v2")));
  expect(stored.run.attempts).toHaveLength(2);
  expect(stored.run.finalStatus).toBe("READY");
  expect(stored.run.attempts[0].evaluations.some(item=>item.status==="fail")).toBe(true);
  expect(stored.run.attempts[1].evaluations.every(item=>item.status==="pass")).toBe(true);
  await page.reload();
  await expect(page.getByTestId("final-candidate")).toHaveValue("Human edit that has not been checked.");
  await expect(page.getByRole("button",{name:"Accept",exact:true})).toBeDisabled();
});

test("an evaluator failure preserves the draft but never marks an incomplete run ready",async({page})=>{
  const oneRule={...baseContract,rules:[baseContract.rules[0]]};
  await page.route("**/api/text-contract/compile",route=>route.fulfill(envelope({contract:{...oneRule,...route.request().postDataJSON()},usage:[]})));
  await page.route("**/api/text-contract/generate",route=>route.fulfill(envelope({attempt:{id:"draft",number:1,kind:"draft",content:"The plan costs $5.99.",createdAt:"2026-09-03T00:02:00.000Z",model:"fast-nemotron",usage:{provider:"nebius",model:"fast-nemotron",operation:"generate",totalTokens:80}},summary:"Drafted."})));
  await page.route("**/api/text-contract/evaluate",route=>route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({apiVersion:"1.0",error:{code:"INVALID_MODEL_OUTPUT",message:"Nebius returned invalid structured output."}})}));
  await page.goto("/tools/text-contract");
  await page.getByRole("button",{name:"Load demo"}).click();
  await page.getByTestId("build-contract").click();
  await page.getByTestId("approve-contract").click();
  await page.getByTestId("run-contract").click();
  await expect(page.locator(".contract-results")).toHaveAttribute("data-status","BLOCKED");
  await expect(page.getByTestId("final-candidate")).toHaveValue("The plan costs $5.99.");
  await expect(page.getByText(/No incomplete run was marked READY/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Accept",exact:true})).toBeDisabled();
});

test("source is frozen during compilation; cancelling makes late responses harmless",async({page})=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route("**/api/text-contract/compile",async route=>{await gate;await route.fulfill(envelope({contract:{...baseContract,...route.request().postDataJSON()},usage:[]})).catch(()=>{});});
  await page.goto("/tools/text-contract");await page.getByRole("button",{name:"Load demo"}).click();
  const requested=page.waitForRequest("**/api/text-contract/compile");
  await page.getByTestId("build-contract").click();await requested;
  await expect(page.getByTestId("contract-source")).toBeDisabled();await expect(page.getByTestId("contract-brief")).toBeDisabled();
  await page.getByRole("button",{name:"Stop run"}).click();release();
  await expect(page.getByTestId("contract-source")).toBeEnabled();
  await page.getByTestId("contract-source").fill("Replacement source after cancellation.");
  await expect(page.getByTestId("approve-contract")).toHaveCount(0);
  await expect(page.locator(".contract-results")).toHaveCount(0);
});

test("running contract is locked and cancellation cannot reveal stale READY",async({page})=>{
  await mockSuccessfulRepair(page);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route("**/api/text-contract/generate",async route=>{await gate;await route.fulfill(envelope({attempt:{id:"cancelled",number:1,kind:"draft",content:"Old result",createdAt:"today",model:"mock",usage:{provider:"nebius",operation:"generate"}},summary:"Mock"})).catch(()=>{});});
  await page.goto("/tools/text-contract");await page.getByRole("button",{name:"Load demo"}).click();await page.getByTestId("build-contract").click();await page.getByTestId("approve-contract").click();
  const requested=page.waitForRequest("**/api/text-contract/generate");await page.getByTestId("run-contract").click();await requested;
  await expect(page.getByRole("textbox",{name:"Rule 2 statement"})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Edit source"})).toBeDisabled();
  await page.getByRole("button",{name:"Stop run"}).click();release();
  await page.getByRole("textbox",{name:"Rule 2 statement"}).fill("New rule after stopping.");
  await expect(page.getByTestId("approve-contract")).toBeEnabled();
  await expect(page.locator('.contract-results[data-status="READY"]')).toHaveCount(0);
});

test("failed manual recheck is auditable, retryable and persisted",async({page})=>{
  await mockSuccessfulRepair(page);
  await page.goto("/tools/text-contract");await page.getByRole("button",{name:"Load demo"}).click();await page.getByTestId("build-contract").click();await page.getByTestId("approve-contract").click();await page.getByTestId("run-contract").click();
  await expect(page.locator(".contract-results")).toHaveAttribute("data-status","READY");
  await page.route("**/api/text-contract/evaluate",route=>route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({error:{message:"Simulated timeout"}})}));
  const edit="The plan costs $5.99 and may help. A 30-day refund is available. Human clarification.";
  await page.getByTestId("final-candidate").fill(edit);await page.getByRole("button",{name:"Recheck edit"}).click();
  await expect(page.getByTestId("text-contract-workspace").getByRole("alert")).toContainText("retry this same candidate");
  await expect(page.getByRole("button",{name:"Recheck edit"})).toBeEnabled();
  await expect(page.getByRole("button",{name:"Accept",exact:true})).toBeDisabled();
  await page.reload();await expect(page.getByTestId("final-candidate")).toHaveValue(edit);
  await expect(page.getByRole("button",{name:"Recheck edit"})).toBeEnabled();
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("textanalysis-text-contract-v2")));
  expect(stored.run.attempts.at(-1).content).toBe(edit);expect(stored.run.attempts.at(-1).evaluationError).toBe("Simulated timeout");
  await mockSuccessfulRepair(page);await page.getByRole("button",{name:"Recheck edit"}).click();
  await expect(page.locator(".contract-results")).toHaveAttribute("data-status","READY");
});

test("invalid stored state recovers source without trusting old approval",async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem("textanalysis-text-contract-v2",JSON.stringify({source:"Recovered source",brief:"Keep facts",contract:{id:"broken",approvedAt:"today"},run:{finalStatus:"READY"}})));
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/tools/text-contract");await expect(page.getByTestId("contract-source")).toHaveValue("Recovered source");
  await expect(page.getByText(/older or invalid workspace/)).toBeVisible();
  await expect(page.locator(".contract-results")).toHaveCount(0);expect(errors).toEqual([]);
});
