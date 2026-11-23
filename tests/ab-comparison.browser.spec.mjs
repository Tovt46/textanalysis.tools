import { expect, test } from "@playwright/test";

const original="apple berry cherry date olive plum";
const revision="apple berry cherry date kiwi olive";
const baselineKey="bow-zipf-baseline-v3";

test("Bag of Words preserves drafts and compares a term that moved below the selected top",async({page})=>{
  await page.goto("/tools/bag-of-words-analyzer");
  const form=page.locator("form.workspace");
  const text=form.locator(".textarea-wrap textarea");
  const submit=form.locator(".analyze-button");
  await text.fill(original);
  await form.getByRole("button",{name:"URL",exact:true}).click();
  const url=form.locator('input[type="url"]');
  await url.fill("https://example.com/article");
  await form.getByRole("button",{name:"Text",exact:true}).click();
  await expect(text).toHaveValue(original);
  await form.getByRole("button",{name:"URL",exact:true}).click();
  await expect(url).toHaveValue("https://example.com/article");
  await form.getByRole("button",{name:"Text",exact:true}).click();
  await submit.click();
  await expect(page.locator("#result")).toBeVisible();
  await form.locator('input[type="number"]').fill("5");
  await expect(page.locator("#result")).toHaveCount(0);
  await submit.click();
  await page.locator("#result .save-button").click();
  await page.reload();
  await expect(form.locator('input[type="number"]')).toBeDisabled();
  await text.fill(revision);
  await submit.click();
  const row=page.locator(".ab-frequency").first().getByRole("row").filter({has:page.getByRole("cell",{name:"olive",exact:true})});
  await expect(row.getByRole("cell").nth(1)).toContainText("×1");
  await expect(row.getByRole("cell").nth(2)).toContainText("×1");
  await expect(row.getByRole("cell").nth(3)).toContainText("0.00 pp");
});

test("a partial legacy Bag of Words baseline leaves its missing count and difference unknown",async({page})=>{
  await page.goto("/tools/bag-of-words-analyzer");
  const form=page.locator("form.workspace");
  await form.locator(".textarea-wrap textarea").fill(revision);
  await form.locator('input[type="number"]').fill("5");
  await form.locator(".analyze-button").click();
  await page.locator("#result .save-button").click();
  await page.evaluate(key=>{
    const saved=JSON.parse(localStorage.getItem(key));
    delete saved.counts;
    localStorage.setItem(key,JSON.stringify(saved));
  },baselineKey);
  await page.reload();
  await expect(form.locator('input[type="number"]')).toBeDisabled();
  await form.locator(".textarea-wrap textarea").fill(original);
  await form.locator(".analyze-button").click();
  const row=page.locator(".ab-frequency").first().getByRole("row").filter({has:page.getByRole("cell",{name:"olive",exact:true})});
  await expect(row.getByRole("cell").nth(1)).toContainText("outside displayed top");
  await expect(row.getByRole("cell").nth(3)).toHaveText("—");
});

test("Keyword Density compares the full A/B vocabularies before limiting displayed rows",async({page})=>{
  await page.goto("/tools/keyword-density-checker");
  const form=page.locator("form.density-workspace");
  const text=form.locator(".textarea-wrap textarea");
  const words=Array.from({length:2005},(_,index)=>`word${String(index).padStart(4,"0")}`).join(" ");
  const common=`${words} ${words} ${words}`;
  const source=`${common} zzzneedle rareterm droppedterm`;
  await text.fill(source);
  await form.getByRole("button",{name:"URL",exact:true}).click();
  await form.locator('input[type="url"]').fill("https://example.com/article");
  await form.getByRole("button",{name:"Text",exact:true}).click();
  await expect(text).toHaveValue(source);
  await form.locator(".analyze-button").click();
  await page.locator("#density-results .save-button").click();
  await text.fill(`${common} zzzneedle zzzneedle zzzneedle zzzneedle rareterm rareterm addedterm`);
  await form.locator(".analyze-button").click();
  const row=page.locator(".density-comparison tr").filter({has:page.getByRole("button",{name:/zzzneedle/})});
  await expect(row.locator("td").nth(1)).toHaveText("1 · 0.02%");
  await expect(row.locator("td").nth(2)).toHaveText("4 · 0.07%");
  // The rare term is below both 2,000-row display limits.
  const changes=page.locator(".density-comparison");
  const rare=changes.getByRole("row").filter({has:page.getByRole("button",{name:/rareterm/})});
  await expect(rare.locator("td").nth(1)).toHaveText("1 · 0.02%");
  await expect(rare.locator("td").nth(2)).toHaveText("2 · 0.03%");
  const dropped=changes.getByRole("row").filter({has:page.getByRole("button",{name:/droppedterm/})});
  await expect(dropped.locator("td").nth(2)).toHaveText("0 · 0.00%");
  await expect(changes.locator("tbody tr").first()).toContainText("zzzneedle");
});

test("the analysis API returns separate comparison counts only when requested",async({request})=>{
  const data={source:revision,top:5};
  const normal=await request.post("/api/v1/analyze",{data});
  expect(normal.ok()).toBeTruthy();
  expect(await normal.json()).not.toHaveProperty("counts");
  const response=await request.post("/api/v1/analyze",{data:{...data,includeComparisonCounts:true}});
  expect(response.ok()).toBeTruthy();
  const body=await response.json();
  expect(body.result.rows).toHaveLength(5);
  expect(body.result).not.toHaveProperty("counts");
  expect(body.counts.words).toContainEqual(["olive",1]);
});
