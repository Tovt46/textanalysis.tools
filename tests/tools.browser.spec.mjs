import { expect,test } from "@playwright/test";

const TOOLS=[
  {key:"word-frequency",path:"word-frequency-counter",result:"#frequency-results",inputs:1},
  {key:"keyword-density",path:"keyword-density-checker",result:"#density-results",inputs:2},
  {key:"bag-of-words-analyzer",path:"bag-of-words-analyzer",result:"#result",inputs:1},
  {key:"text-comparison",path:"text-analysis-comparison",result:"#comparison-results",inputs:2},
  {key:"ngram",path:"ngram-analyzer",result:"#ngram-results",inputs:1},
  {key:"bag-of-words-generator",path:"bag-of-words-generator",result:"#bow-generator-results",inputs:1},
  {key:"tf-idf",path:"tf-idf-calculator",result:"#tfidf-results",inputs:3},
  {key:"text-similarity",path:"text-similarity-calculator",result:"#text-similarity-results",inputs:2},
];

function route(locale,path){return locale==="en"?`/tools/${path}`:`/${locale}/tools/${path}`;}

function assertDeterministicExample(tool,payload){
  if(tool.key==="word-frequency"){
    expect(payload.rows.find(row=>row.term==="analysis")?.count).toBe(3);
  }else if(tool.key==="keyword-density"){
    expect(payload.trackedKeywords.find(row=>row.term==="text analysis")?.count).toBe(3);
  }else if(tool.key==="bag-of-words-analyzer"){
    expect(payload.focusCoverage.find(row=>row.term==="text analysis")?.count).toBe(3);
  }else if(tool.key==="text-comparison"){
    expect(payload.comparison.wordChanges.find(row=>row.term==="revision")?.countB).toBe(1);
    expect(payload.resultA).not.toHaveProperty("_allUnigrams");
    expect(payload.resultA).not.toHaveProperty("_allBigrams");
    expect(payload.resultB).not.toHaveProperty("_allUnigrams");
    expect(payload.resultB).not.toHaveProperty("_allBigrams");
    expect(payload.resultA).not.toHaveProperty("_allUnigrams");
    expect(payload.resultA).not.toHaveProperty("_allBigrams");
    expect(payload.resultB).not.toHaveProperty("_allUnigrams");
    expect(payload.resultB).not.toHaveProperty("_allBigrams");
  }else if(tool.key==="ngram"){
    expect(payload.rows.find(row=>row.term==="text analysis")?.count).toBe(3);
  }else if(tool.key==="bag-of-words-generator"){
    expect(payload.rows.find(row=>row.term==="analysis")?.count).toBe(3);
  }else if(tool.key==="tf-idf"){
    expect(payload.documentCount).toBe(3);
    expect(payload.documents).toHaveLength(3);
    expect(payload.documents[0].rows.some(row=>row.term==="editor")).toBe(true);
  }else{
    expect(payload.tokenCounts.a).toBeGreaterThan(20);
    expect(payload.tokenCounts.b).toBeGreaterThan(20);
    expect(payload.cosine).toBeGreaterThan(0);
    expect(payload.cosine).toBeLessThan(1);
  }
}

for(const tool of TOOLS){
  test(`${tool.key}: example, local analysis, and copy result`,async({page,context})=>{
    await context.grantPermissions(["clipboard-read","clipboard-write"],{origin:"http://127.0.0.1:3000"});
    await page.goto(route("en",tool.path));

    const load=page.getByTestId(`load-example-${tool.key}`);
    await expect(load).toHaveAccessibleName("Load example");
    await expect(load).toHaveAttribute("aria-describedby",/.+/);
    await expect(load).toHaveAccessibleDescription(/.+/);
    await load.click();

    const populated=page.locator("form textarea").filter({hasNot:page.locator(".stopword-editor textarea")});
    await expect.poll(async()=>populated.evaluateAll(nodes=>nodes.filter(node=>!node.closest(".stopword-editor")).filter(node=>node.value.trim()).length)).toBe(tool.inputs);

    const submit=page.locator("form .analyze-button");
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.locator(tool.result)).toBeVisible();

    const copy=page.getByTestId(`copy-result-${tool.key}`);
    await expect(copy).toHaveAccessibleName("Copy result");
    await copy.click();
    await expect(copy).toHaveAccessibleName("Copied");
    const clipboard=await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain("{");
    void clipboard;
    const copied=JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()));
    assertDeterministicExample(tool,copied);
  });
}

for(const locale of [
  {code:"ru",label:"Загрузить пример"},
  {code:"es",label:"Cargar ejemplo"},
]){
  for(const tool of TOOLS){
    test(`${tool.key}: ${locale.code} example is localized and fills the workflow`,async({page})=>{
      await page.goto(route(locale.code,tool.path));
      const load=page.getByTestId(`load-example-${tool.key}`);
      await expect(load).toHaveAccessibleName(locale.label);
      await load.click();
      await expect(page.locator("form .analyze-button")).toBeEnabled();
    });
  }
}

test("home exposes entry paths for people, developers, and AI agents",async({page})=>{
  await page.goto("/");
  await expect(page.locator('[data-audience="people"]')).toBeVisible();
  await expect(page.locator('[data-audience="developers"]')).toHaveAttribute("href","/api-docs");
  await expect(page.locator('[data-audience="agents"]')).toHaveAttribute("href","/agents");
});

test("large local analysis runs in a cancellable Worker and enforces the browser limit",async({page})=>{
  test.setTimeout(90_000);
  await page.goto("/tools/word-frequency-counter");
  const form=page.locator("form.frequency-workspace");
  const textarea=form.locator("textarea").first();
  const submit=form.locator(".analyze-button");
  const largeText=Array.from({length:42_000},(_,index)=>`term${index}`).join(" ");
  await textarea.fill(largeText);

  const workerStarted=page.waitForEvent("worker");
  await submit.click();
  const worker=await workerStarted;
  expect(decodeURIComponent(worker.url())).toMatch(/browser-analysis[_-]worker/);

  await textarea.fill("replacement text cancels the previous local analysis");
  await expect(form).toHaveAttribute("aria-busy","false");
  await expect(page.locator("#frequency-results")).toHaveCount(0);

  await textarea.fill("x".repeat(500_001));
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("500,000");
  await expect(form).toHaveAttribute("aria-busy","false");
  await expect(page.locator("#frequency-results")).toHaveCount(0);
});

test("local Worker caps vocabulary rows and exposes partial-result metadata",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin:"http://127.0.0.1:3000"});
  await page.goto("/tools/word-frequency-counter");
  const source=Array.from({length:5_001},(_,index)=>`term${index}`).join(" ");
  await page.locator("form.frequency-workspace textarea").first().fill(source);
  await page.locator("form.frequency-workspace .analyze-button").click();

  await expect(page.getByTestId("partial-result-notice")).toContainText("API pagination");
  const copy=page.getByTestId("copy-result-word-frequency");
  await copy.click();
  await expect(copy).toHaveAccessibleName("Copied");
  const payload=JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()));
  expect(payload.rows).toHaveLength(5_000);
  expect(payload.totalRows).toBe(5_001);
  expect(payload.returnedRows).toBe(5_000);
  expect(payload.nextOffset).toBe(5_000);
  expect(payload.truncated).toBe(true);
});

test("URL-mode surfaces API truncation instead of implying a complete export",async({page})=>{
  await page.route("**/api/v1/word-frequency",route=>route.fulfill({
    status:200,
    contentType:"application/json",
    body:JSON.stringify({
      apiVersion:"2026-07-01",
      storage:"none",
      result:{
        language:"en",tokenCount:2,vocabularySize:2,stopwordCount:0,
        rows:[{term:"alpha",count:1,percentage:50,per1000:500}],
        totalRows:2,returnedRows:1,offset:0,nextOffset:1,hasMore:true,truncated:true,
      },
    }),
  }));
  await page.goto("/tools/word-frequency-counter");
  const form=page.locator("form.frequency-workspace");
  await form.getByRole("button",{name:"URL",exact:true}).click();
  await form.locator('input[type="url"]').fill("https://example.com/article");
  await form.locator(".analyze-button").click();
  await expect(page.getByTestId("partial-result-notice")).toContainText("table and its CSV or JSON export");
});
