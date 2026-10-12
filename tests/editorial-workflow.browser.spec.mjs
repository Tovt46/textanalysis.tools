import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const editorialRevision = JSON.parse(await readFile(new URL("../public/examples/editorial-revision.json", import.meta.url), "utf8"));

function previewResponse(text, requestedScope = "main", { usedScope = requestedScope, fallback = false } = {}) {
  return {
    apiVersion: "2026-07-01",
    storage: "none",
    source: { text, requestedScope, usedScope, fallback, title: "Editorial workflow fixture" },
  };
}

async function fulfillPreview(route, text, options) {
  const request = route.request().postDataJSON();
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(previewResponse(text, request.contentScope, options)),
  });
}

function frequencyRow(results, term) {
  return results.locator("tbody tr").filter({
    has: results.page().getByRole("button", { name: `View occurrences: ${term}`, exact: true }),
  });
}

test("word frequency opens exact source occurrences, preserves spelling and escapes source markup", async ({ page }) => {
  const apiRequests = [];
  await page.route("**/api/**", async route => {
    apiRequests.push(route.request().postData());
    await route.fulfill({ status: 500, body: "Local analysis must not call an API." });
  });
  await page.goto("/tools/word-frequency-counter");
  const form = page.locator("form.frequency-workspace");
  const source = "<p>Analysis analysis ANALYSIS. &lt;img src=x onerror=alert(1)&gt; source fixture.</p>";
  await form.getByRole("textbox", { name: "Text to analyze", exact: true }).fill(source);
  await form.locator(".analyze-button").click();
  const results = page.locator("#frequency-results");
  const row = frequencyRow(results, "analysis");
  await expect(row.locator("td").nth(2)).toHaveText("3");

  const occurrences = row.getByRole("button", { name: "View occurrences: analysis", exact: true });
  await expect(occurrences).toHaveAttribute("aria-expanded", "false");
  await occurrences.click();
  await expect(occurrences).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByTestId("term-context-panel");
  await expect(panel.getByRole("heading", { name: "Occurrences in context: analysis", exact: true })).toBeFocused();
  await expect(panel.locator("mark")).toHaveText(["Analysis", "analysis", "ANALYSIS"]);
  await expect(panel.getByRole("heading", { level: 4 })).toContainText("3 occurrences");
  await expect(panel).toContainText("<img src=x onerror=alert(1)>");
  await expect(panel.locator("img, script")).toHaveCount(0);
  await panel.getByRole("button", { name: "Close occurrences", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(occurrences).toHaveAttribute("aria-expanded", "false");
  expect(apiRequests).toEqual([]);
});

test("URL text is previewed before local analysis and scope changes invalidate preview and results", async ({ page }) => {
  const requests = [];
  const mainText = "Analysis analysis article material.";
  const wholeText = "Navigation Navigation Analysis analysis article material Footer footer.";
  await page.route("**/api/**", async route => {
    const request = route.request();
    requests.push({ path: new URL(request.url()).pathname, method: request.method(), body: request.postDataJSON() });
    if (new URL(request.url()).pathname !== "/api/source-preview") {
      await route.fulfill({ status: 500, body: "Analyze the reviewed text locally." });
      return;
    }
    const body = request.postDataJSON();
    const fallback = body.source.endsWith("/missing-main");
    await fulfillPreview(route, body.contentScope === "main" && !fallback ? mainText : wholeText,
      fallback ? { usedScope: "page", fallback: true } : undefined);
  });
  await page.goto("/tools/word-frequency-counter");
  const form = page.locator("form.frequency-workspace");
  const results = page.locator("#frequency-results");
  await form.getByRole("button", { name: "URL", exact: true }).click();
  const url = form.getByRole("textbox", { name: "Webpage URL", exact: true });
  await url.fill("https://example.com/article");
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  const extracted = form.getByRole("textbox", { name: "Extracted page text", exact: true });
  await expect(extracted).toHaveValue(mainText);
  await expect(extracted).toHaveAttribute("readonly", "");
  await expect(results.locator("tbody tr")).toHaveCount(0);
  expect(requests).toEqual([{ path: "/api/source-preview", method: "POST", body: { source: "https://example.com/article", contentScope: "main" } }]);

  await form.locator(".analyze-button").click();
  await expect(frequencyRow(results, "analysis").locator("td").nth(2)).toHaveText("2");
  expect(requests).toHaveLength(1);

  await form.getByLabel("Page content").selectOption("page");
  await expect(extracted).toHaveCount(0);
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  await expect(extracted).toHaveValue(wholeText);
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await form.locator(".analyze-button").click();
  await expect(frequencyRow(results, "navigation").locator("td").nth(2)).toHaveText("2");
  expect(requests).toHaveLength(2);
  expect(requests[1].body.contentScope).toBe("page");

  await url.fill("https://example.com/missing-main");
  await form.getByLabel("Page content").selectOption("main");
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  await expect(extracted).toHaveValue(wholeText);
  await expect(form.getByTestId("source-preview").getByRole("note")).toHaveText(
    "Main material could not be identified. This preview uses the whole page. Review it or paste the article text instead.",
  );
  await expect(results.locator("tbody tr")).toHaveCount(0);
});

test("URL preview treats decoded HTML-looking text as literal content in analysis and contexts", async ({ page }) => {
  const literalText = '<script>Alpha beta</script> Use <main> tags &amp; literals. <img src=x onerror="window.__literalPreviewExecuted=true">';
  await page.route("**/api/source-preview", route => fulfillPreview(route, literalText));
  await page.goto("/tools/word-frequency-counter");
  const form = page.locator("form.frequency-workspace");
  await form.getByRole("button", { name: "URL", exact: true }).click();
  await form.getByRole("textbox", { name: "Webpage URL", exact: true }).fill("https://example.com/literal-markup");
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  const extracted = form.getByRole("textbox", { name: "Extracted page text", exact: true });
  await expect(extracted).toHaveValue(literalText);
  await expect(form.getByTestId("source-preview").locator("script, img, main")).toHaveCount(0);
  const results = page.locator("#frequency-results");
  await expect(results.locator("tbody tr")).toHaveCount(0);
  await form.locator(".analyze-button").click();
  await expect(frequencyRow(results, "alpha").locator("td").nth(2)).toHaveText("1");
  await expect(frequencyRow(results, "main").locator("td").nth(2)).toHaveText("1");
  await expect(frequencyRow(results, "script").locator("td").nth(2)).toHaveText("2");
  await expect(frequencyRow(results, "amp").locator("td").nth(2)).toHaveText("1");
  await results.getByRole("button", { name: "View occurrences: alpha", exact: true }).click();
  const panel = page.getByTestId("term-context-panel");
  await expect(panel.locator("mark")).toHaveText(["Alpha"]);
  await expect(panel).toContainText("<script>Alpha beta</script> Use <main> tags &amp;");
  await expect(panel.locator("script, img, main")).toHaveCount(0);
  await results.getByRole("button", { name: "View occurrences: main", exact: true }).click();
  await expect(panel.locator("mark")).toHaveText(["main"]);
  expect(await page.evaluate(() => window.__literalPreviewExecuted)).toBeUndefined();
});

test("mixed comparison fetches only the URL and shows source A/B occurrences including zero matches", async ({ page }) => {
  const privateText = "PrivateComparisonCanary Alpha alpha baseline original wording.";
  const fetchedText = "Alpha revised revised document details.";
  const requests = [];
  await page.route("**/api/**", async route => {
    const request = route.request();
    requests.push({ path: new URL(request.url()).pathname, method: request.method(), body: request.postDataJSON() });
    if (new URL(request.url()).pathname === "/api/source-preview") await fulfillPreview(route, fetchedText);
    else await route.fulfill({ status: 500, body: "Pasted comparison sources must stay in the browser." });
  });
  await page.goto("/tools/text-analysis-comparison");
  const form = page.locator("form.comparison-workspace");
  await form.getByRole("textbox", { name: "Original text", exact: true }).fill(privateText);
  await form.locator(".comparison-source-card").nth(1).getByRole("button", { name: "URL", exact: true }).click();
  await form.getByRole("textbox", { name: "Updated webpage URL", exact: true }).fill("https://example.com/revision");
  await form.getByRole("button", { name: "Preview URL sources", exact: true }).click();
  await expect(form.getByRole("textbox", { name: "B · Extracted page text", exact: true })).toHaveValue(fetchedText);
  await expect(page.locator("#comparison-results")).toHaveCount(0);
  await form.locator(".analyze-button").click();
  const results = page.locator("#comparison-results");
  await expect(results).toBeVisible();
  expect(requests).toEqual([{ path: "/api/source-preview", method: "POST", body: { source: "https://example.com/revision", contentScope: "main" } }]);
  expect(JSON.stringify(requests)).not.toContain(privateText);
  expect(JSON.stringify(requests)).not.toContain("PrivateComparisonCanary");

  await results.getByRole("button", { name: "View occurrences: alpha", exact: true }).click();
  let sources = page.getByTestId("term-context-panel").locator(".term-context-source");
  await expect(sources).toHaveCount(2);
  await expect(sources.nth(0).getByRole("heading")).toContainText("2 occurrences");
  await expect(sources.nth(1).getByRole("heading")).toContainText("1 occurrence");
  await expect(sources.nth(0).locator("mark")).toHaveText(["Alpha", "alpha"]);
  await expect(sources.nth(1).locator("mark")).toHaveText(["Alpha"]);

  await results.getByRole("button", { name: "View occurrences: privatecomparisoncanary", exact: true }).click();
  sources = page.getByTestId("term-context-panel").locator(".term-context-source");
  await expect(sources.nth(0).getByRole("heading")).toContainText("1 occurrence");
  await expect(sources.nth(1).getByRole("heading")).toContainText("0 occurrences");
  await expect(sources.nth(1)).toContainText("No occurrences in this source.");
  await expect(sources.nth(1).locator("mark")).toHaveCount(0);
});

test("density tracked phrases preserve raw token order and stop words in occurrence contexts", async ({ page }) => {
  await page.goto("/tools/keyword-density-checker");
  const form = page.locator("form.density-workspace");
  await form.getByRole("textbox", { name: "Text to check keyword density", exact: true }).fill(
    "SEO and content. Seo content. SEO AND CONTENT. keyword density details.",
  );
  await form.getByLabel("Tracked keywords and phrases").fill("seo and content, seo content");
  await form.locator(".analyze-button").click();
  const results = page.locator("#density-results");
  const tracked = results.locator(".tracked-density-card");
  const phrase = tracked.getByRole("button", { name: "View occurrences: seo and content", exact: true });
  await expect(tracked.locator("tbody tr").filter({
    has: page.getByRole("button", { name: "View occurrences: seo and content", exact: true }),
  }).locator("td").nth(2)).toHaveText("2");
  await phrase.click();
  const panel = page.getByTestId("term-context-panel");
  await expect(panel.locator("mark")).toHaveText(["SEO and content", "SEO AND CONTENT"]);
  await expect(panel.getByRole("heading", { level: 4 })).toContainText("2 occurrences");
  await tracked.getByRole("button", { name: "View occurrences: seo content", exact: true }).click();
  await expect(panel.locator("mark")).toHaveText(["Seo content"]);
  await expect(panel.getByRole("heading", { level: 4 })).toContainText("1 occurrence");
});

test("editorial revision fixture reproduces word counts and phrase changes with readable contexts", async ({ page }, testInfo) => {
  await page.goto("/tools/text-analysis-comparison");
  const form = page.locator("form.comparison-workspace");
  await form.getByRole("textbox", { name: "Original text", exact: true }).fill(editorialRevision.original);
  await form.getByRole("textbox", { name: "Updated text", exact: true }).fill(editorialRevision.revised);
  await form.locator(".comparison-settings-card select").selectOption(editorialRevision.settings.language);
  await form.getByRole("checkbox", { name: /^Keep stop words/ }).setChecked(editorialRevision.settings.keepStopwords);
  await form.locator(".analyze-button").click();
  const results = page.locator("#comparison-results");
  const words = results.locator(".comparison-metrics > div").filter({
    has: page.getByText("Analyzed words", { exact: true }),
  });
  await expect(words.locator(".comparison-metric-values strong")).toHaveText(["40", "41"]);
  await results.locator(".comparison-view-tabs").getByRole("button", { name: /^Bigrams/ }).click();
  await results.locator('.comparison-toolbar input[type="search"]').fill("content review");
  const row = frequencyRow(results, "content review");
  await expect(row.locator("td").nth(2)).toHaveText("1");
  await expect(row.locator("td").nth(4)).toHaveText("4");
  await row.getByRole("button", { name: "View occurrences: content review", exact: true }).click();
  const panel = page.getByTestId("term-context-panel");
  const sources = panel.locator(".term-context-source");
  await expect(sources).toHaveCount(2);
  await expect(sources.nth(0).getByRole("heading")).toContainText("1 occurrence");
  await expect(sources.nth(1).getByRole("heading")).toContainText("4 occurrences");
  await expect(panel.locator("mark")).toHaveText(Array(5).fill("content review"));
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(overflow).toBe(0);
  await results.screenshot({ path: testInfo.outputPath("editorial-comparison.png") });
  await panel.screenshot({ path: testInfo.outputPath("editorial-contexts.png") });
});

test("an edited URL cancels a pending preview and ignores its late response", async ({ page }) => {
  let release;
  let started;
  let finished;
  const heldResponse = new Promise(resolve => { release = resolve; });
  const previewStarted = new Promise(resolve => { started = resolve; });
  const oldResponseFinished = new Promise(resolve => { finished = resolve; });
  const requests = [];
  await page.route("**/api/source-preview", async route => {
    const source = route.request().postDataJSON().source;
    requests.push(source);
    if (source.endsWith("/old")) {
      started();
      await heldResponse;
      try { await fulfillPreview(route, "StaleOldSource analysis must never appear."); }
      catch { /* An aborted intercepted request may already be gone. */ }
      finally { finished(); }
    } else await fulfillPreview(route, "FreshNewSource analysis current material.");
  });
  await page.goto("/tools/word-frequency-counter");
  const form = page.locator("form.frequency-workspace");
  await form.getByRole("button", { name: "URL", exact: true }).click();
  const url = form.getByRole("textbox", { name: "Webpage URL", exact: true });
  await url.fill("https://example.com/old");
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  await previewStarted;
  await url.fill("https://example.com/new");
  release();
  await oldResponseFinished;
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(form.getByTestId("source-preview")).toHaveCount(0);
  await expect(page.locator("#frequency-results tbody tr")).toHaveCount(0);
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  await expect(form.getByRole("textbox", { name: "Extracted page text", exact: true })).toHaveValue("FreshNewSource analysis current material.");
  await expect(form).not.toContainText("StaleOldSource");
  expect(requests).toEqual(["https://example.com/old", "https://example.com/new"]);
});

test("a failed URL pair aborts the sibling preview and a retry keeps fresh text after the old response", async ({ page }) => {
  const sourceA = "https://example.com/parallel-source-a";
  const sourceB = "https://example.com/parallel-source-b";
  const freshA = "FreshAlpha analysis original source details.";
  const freshB = "FreshBeta FreshBeta analysis revised source details.";
  let startedOldB;
  let releaseOldB;
  let finishedOldB;
  const oldBStarted = new Promise(resolve => { startedOldB = resolve; });
  const oldBHeld = new Promise(resolve => { releaseOldB = resolve; });
  const oldBFinished = new Promise(resolve => { finishedOldB = resolve; });
  const attempts = new Map();
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.__abortedPreviewSources = [];
    window.fetch = (input, init) => {
      if (String(input) === "/api/source-preview" && init?.signal) {
        const source = JSON.parse(init.body).source;
        init.signal.addEventListener("abort", () => window.__abortedPreviewSources.push(source), { once: true });
      }
      return originalFetch(input, init);
    };
  });
  await page.route("**/api/source-preview", async route => {
    const source = route.request().postDataJSON().source;
    const attempt = (attempts.get(source) || 0) + 1;
    attempts.set(source, attempt);
    if (source === sourceA && attempt === 1) {
      // Both requests must be active when A fails; B remains unresolved.
      await oldBStarted;
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "FETCH_FAILED", message: "Fixture source A is unavailable." } }),
      });
    } else if (source === sourceB && attempt === 1) {
      startedOldB();
      await oldBHeld;
      try { await fulfillPreview(route, "StaleBeta stale source content from the failed attempt."); }
      catch { /* The failure of A should already have aborted this request. */ }
      finally { finishedOldB(); }
    } else await fulfillPreview(route, source === sourceA ? freshA : freshB);
  });
  await page.goto("/tools/text-analysis-comparison");
  const form = page.locator("form.comparison-workspace");
  const cards = form.locator(".comparison-source-card");
  await cards.nth(0).getByRole("button", { name: "URL", exact: true }).click();
  await cards.nth(1).getByRole("button", { name: "URL", exact: true }).click();
  await form.getByRole("textbox", { name: "Original webpage URL", exact: true }).fill(sourceA);
  await form.getByRole("textbox", { name: "Updated webpage URL", exact: true }).fill(sourceB);
  await form.getByRole("button", { name: "Preview URL sources", exact: true }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect.poll(() => page.evaluate(() => window.__abortedPreviewSources)).toContain(sourceB);

  // Retry the identical URLs before the old B request can return.
  await form.getByRole("button", { name: "Preview URL sources", exact: true }).click();
  const previewA = form.getByRole("textbox", { name: "A · Extracted page text", exact: true });
  const previewB = form.getByRole("textbox", { name: "B · Extracted page text", exact: true });
  await expect(previewA).toHaveValue(freshA);
  await expect(previewB).toHaveValue(freshB);
  releaseOldB();
  await oldBFinished;
  await expect(previewB).toHaveValue(freshB);
  await form.locator(".analyze-button").click();
  const results = page.locator("#comparison-results");
  await expect(results.getByRole("button", { name: "View occurrences: freshbeta", exact: true })).toBeVisible();
  await expect(results.getByRole("button", { name: "View occurrences: stalebeta", exact: true })).toHaveCount(0);
  await expect(previewB).toHaveValue(freshB);
  expect(attempts.get(sourceA)).toBe(2);
  expect(attempts.get(sourceB)).toBe(2);
});

test("source documents, entered URLs and selected terms stay out of analytics payloads", async ({ page }) => {
  const privateSource = "PrivateAnalyticsCanary PrivateAnalyticsCanary supporting document wording.";
  const enteredUrl = "https://example.com/private-analytics-url-canary";
  await page.route("**/api/source-preview", route => fulfillPreview(route, privateSource));
  await page.goto("/tools/word-frequency-counter");
  await page.evaluate(() => {
    window.__editorialAnalytics = [];
    window.gtag = (...args) => window.__editorialAnalytics.push(args);
  });
  const form = page.locator("form.frequency-workspace");
  await form.getByRole("textbox", { name: "Text to analyze", exact: true }).fill(privateSource);
  await form.locator(".analyze-button").click();
  await page.locator("#frequency-results").getByRole("button", { name: "View occurrences: privateanalyticscanary", exact: true }).click();
  await expect(page.getByTestId("term-context-panel").locator("mark")).toHaveCount(2);
  await form.getByRole("button", { name: "URL", exact: true }).click();
  await form.getByRole("textbox", { name: "Webpage URL", exact: true }).fill(enteredUrl);
  await form.getByRole("button", { name: "Preview page text", exact: true }).click();
  await expect(form.getByRole("textbox", { name: "Extracted page text", exact: true })).toHaveValue(privateSource);
  await form.locator(".analyze-button").click();
  await expect(frequencyRow(page.locator("#frequency-results"), "privateanalyticscanary").locator("td").nth(2)).toHaveText("2");
  const events = await page.evaluate(() => window.__editorialAnalytics);
  expect(events.some(event => event[1] === "analysis_completed")).toBe(true);
  const payloads = JSON.stringify(events).toLowerCase();
  expect(payloads).not.toContain(privateSource.toLowerCase());
  expect(payloads).not.toContain("privateanalyticscanary");
  expect(payloads).not.toContain(enteredUrl);
});


test("malformed preview titles produce a recoverable error before rendering", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  await page.route("**/api/source-preview", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ apiVersion: "2026-07-01", storage: "none", source: {
      text: "Valid preview text", requestedScope: "main", usedScope: "main", fallback: false, title: {},
    } }),
  }));
  await page.goto("/tools/word-frequency-counter");
  const form = page.locator("form.frequency-workspace");
  await form.getByRole("button", {name:"URL",exact:true}).click();
  await form.getByRole("textbox", {name:"Webpage URL",exact:true}).fill("https://example.com/malformed");
  await form.getByRole("button", {name:"Preview page text",exact:true}).click();
  await expect(form.getByRole("alert")).toContainText("Try another URL or paste the article text");
  await expect(form.getByTestId("source-preview")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});
