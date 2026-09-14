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
  const heading=page.getByRole("heading",{level:1});
  const tagline=page.locator(".home-hero-tagline");
  await expect(heading).toHaveText("Every word in focus",{useInnerText:true});
  await expect(tagline).toHaveText("For Humans and AI Agents");
  const [headingSize,taglineSize]=await Promise.all([
    heading.evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize)),
    tagline.evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize)),
  ]);
  expect(taglineSize).toBeLessThan(headingSize/2);
  await expect(page.locator('[data-audience="people"]')).toBeVisible();
  await expect(page.locator('[data-audience="people"]')).toHaveAttribute("href","/tools/word-frequency-counter");
  await expect(page.locator('[data-audience="developers"]')).toHaveAttribute("href","/api-docs");
  const agents=page.locator('[data-audience="agents"]');
  await expect(agents).toHaveAttribute("href","/agents");
  await expect(agents).toContainText("Codex");
  await expect(agents).toContainText("Claude Code");
  await expect(agents).toContainText("Gemini CLI");
});

test("light and dark theme choices persist between the homepage and tool workspace",async({page})=>{
  await page.goto("/");
  const documentRoot=page.locator("html");
  const body=page.locator("body");
  await expect(documentRoot).toHaveAttribute("data-theme","dark");
  const darkBackground=await body.evaluate(element=>getComputedStyle(element).backgroundColor);

  await page.getByRole("button",{name:"Switch to light theme",exact:true}).click();
  await expect(documentRoot).toHaveAttribute("data-theme","light");
  await expect(body).not.toHaveCSS("background-color",darkBackground);
  const lightBackground=await body.evaluate(element=>getComputedStyle(element).backgroundColor);
  await expect(page.getByRole("button",{name:"Switch to dark theme",exact:true})).toBeVisible();

  await page.locator('[data-audience="people"]').click();
  await expect(page).toHaveURL(/\/tools\/word-frequency-counter$/);
  await expect(documentRoot).toHaveAttribute("data-theme","light");
  await expect(body).toHaveCSS("background-color",lightBackground);
  await page.reload();
  await expect(documentRoot).toHaveAttribute("data-theme","light");
  await expect(body).toHaveCSS("background-color",lightBackground);

  await page.locator(".workspace-topbar").getByRole("button",{name:"Switch to dark theme",exact:true}).click();
  await expect(documentRoot).toHaveAttribute("data-theme","dark");
  await expect(body).toHaveCSS("background-color",darkBackground);
  await page.goto("/");
  await expect(documentRoot).toHaveAttribute("data-theme","dark");
  await expect(body).toHaveCSS("background-color",darkBackground);
  await expect(page.getByRole("button",{name:"Switch to light theme",exact:true})).toBeVisible();
});

test("large local analysis runs in a cancellable Worker and enforces the browser limit",async({page})=>{
  test.setTimeout(90_000);
  await page.addInitScript(()=>{
    const nativeAddEventListener=Worker.prototype.addEventListener;
    Worker.prototype.addEventListener=function(type,listener,options){
      if(type!=="message")return nativeAddEventListener.call(this,type,listener,options);
      const messages=[];
      window.__cancellationTestMessages=messages;
      window.__deliverCanceledWorkerMessages=()=>{
        for(const event of messages)listener.call(this,event);
      };
      return nativeAddEventListener.call(this,type,event=>messages.push(event),options);
    };
  });
  await page.goto("/tools/word-frequency-counter");
  const form=page.locator("form.frequency-workspace");
  const textarea=form.locator("textarea").first();
  const submit=form.locator(".analyze-button");
  const results=page.locator("#frequency-results");
  const largeText=Array.from({length:42_000},(_,index)=>`term${index}`).join(" ");
  await textarea.fill(largeText);

  const workerStarted=page.waitForEvent("worker");
  await submit.click();
  const worker=await workerStarted;
  const workerUrl=new URL(worker.url());
  expect(workerUrl.origin).toBe(new URL(page.url()).origin);
  expect(workerUrl.pathname).toMatch(/\.m?js$/);
  expect(await worker.evaluate(()=>typeof self.postMessage)).toBe("function");
  // Run the real analysis, but hold its messages so the job stays active
  // until the input edit, independent of the machine's processing speed.
  await expect.poll(()=>page.evaluate(()=>window.__cancellationTestMessages.some(event=>event.data.type==="result"))).toBe(true);
  await expect(form).toHaveAttribute("aria-busy","true");

  const workerClosed=worker.waitForEvent("close");
  await textarea.fill("replacement text cancels the previous local analysis");
  await workerClosed;
  // Even a result already queued before termination must remain obsolete.
  await page.evaluate(()=>window.__deliverCanceledWorkerMessages());
  await expect(form).toHaveAttribute("aria-busy","false");
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await expect(results.locator(".frequency-waiting")).toBeVisible();

  await textarea.fill("x".repeat(500_001));
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("500,000");
  await expect(form).toHaveAttribute("aria-busy","false");
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await expect(results.locator(".frequency-waiting")).toBeVisible();
  expect(page.workers()).toHaveLength(0);
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

for(const locale of [
  {code:"en",textTab:"Text",message:"The page could not be retrieved. Paste its text manually in the Text tab."},
  {code:"ru",textTab:"Текст",message:"Не удалось загрузить страницу. Вставьте её текст вручную во вкладке «Текст»."},
  {code:"uk",textTab:"Текст",message:"Не вдалося завантажити сторінку. Вставте її текст вручну у вкладці «Текст»."},
  {code:"es",textTab:"Texto",message:"No se pudo obtener la página. Pega su texto manualmente en la pestaña «Texto»."},
]){
  test(`URL fetch errors: ${locale.code} shows recovery guidance and can analyze pasted text`,async({page})=>{
    let errorCode="FETCH_FAILED";
    const requests=[];
    await page.route("**/api/v1/analyze",async intercepted=>{
      const request=intercepted.request();
      requests.push({method:request.method(),body:request.postDataJSON()});
      await intercepted.fulfill({
        status:422,
        contentType:"application/json",
        body:JSON.stringify({apiVersion:"2026-07-01",error:{code:errorCode,message:`Raw remote diagnostic: ${errorCode}`}}),
      });
    });
    await page.goto(route(locale.code,"bag-of-words-analyzer"));
    const form=page.locator("form.workspace");
    const submit=form.locator(".analyze-button");
    await form.getByRole("button",{name:"URL",exact:true}).click();

    for(const code of [
      "FETCH_FAILED",
      "REMOTE_FETCH_TIMEOUT",
      "REMOTE_DNS_LOOKUP_FAILED",
      "REMOTE_REQUEST_FAILED",
      "REMOTE_CONTENT_READ_FAILED",
      "REMOTE_INVALID_REDIRECT",
      "REMOTE_HTTP_ERROR",
    ]){
      await test.step(code,async()=>{
        errorCode=code;
        const url=`https://example.com/${code.toLowerCase()}`;
        await form.locator('input[type="url"]').fill(url);
        const previousRequests=requests.length;
        await submit.click();
        await expect.poll(()=>requests.length).toBe(previousRequests+1);
        expect(requests.at(-1)).toMatchObject({method:"POST",body:{sourceType:"url",source:url}});
        await expect(form.locator(".error")).toHaveText(locale.message);
        await expect(form).toHaveAttribute("aria-busy","false");
        await expect(submit).toBeEnabled();
        await expect(form.locator('input[type="url"]')).toHaveValue(url);
        await expect(page.locator("#result")).toHaveCount(0);
      });
    }

    await form.getByRole("button",{name:locale.textTab,exact:true}).click();
    await form.locator(".textarea-wrap textarea").fill("Transparent text analysis measures repeated terms and recurring phrases with deterministic counts. Text analysis helps editors review repeated phrases.");
    const remoteRequestCount=requests.length;
    await submit.click();
    await expect(page.locator("#result")).toBeVisible();
    await expect(form.locator(".error")).toHaveCount(0);
    expect(requests).toHaveLength(remoteRequestCount);
  });
}
