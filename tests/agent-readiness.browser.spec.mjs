import {test,expect} from "@playwright/test";
for(const surface of ["document","navigator"]){
  test(`homepage registers and executes WebMCP via ${surface}`,async({page})=>{
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(surface=>{
      window.registeredTools={};
      Object.defineProperty(surface==="document"?document:navigator,"modelContext",{configurable:true,value:{registerTool(tool){window.registeredTools[tool.name]=tool;},unregisterTool(name){delete window.registeredTools[name];}}});
    },surface);
    await page.goto("/");
    await expect.poll(()=>page.evaluate(()=>Object.keys(window.registeredTools))).toContain("discover_textanalysis_tools");
    const result=await page.evaluate(async()=>window.registeredTools.discover_textanalysis_tools.execute({}));
    expect(JSON.parse(result.content[0].text).mcp).toBe("https://textanalysis.tools/mcp");
    await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test("homepage works without WebMCP",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await page.locator('a[href="/contact"]').first().click();
  await expect(page.getByRole("heading",{level:1})).toHaveText("Contact Text Analysis Tools");
  await expect(page.locator('article a[href="mailto:alextovt2@gmail.com"]')).toBeVisible();
});
