import assert from "node:assert/strict";
import {mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import {join,relative,resolve} from "node:path";
import test,{after,before} from "node:test";
import {ESLint} from "eslint";

const require=createRequire(import.meta.url);
const pluginRequire=createRequire(require.resolve("@next/eslint-plugin-next"));
const pluginModule=require("@next/eslint-plugin-next");
const nextPlugin=pluginModule.default??pluginModule;
const {getRootDirs}=pluginRequire("./utils/get-root-dirs.js");
const ruleId="@next/next/no-html-link-for-pages";
let fixture;

before(async()=>{
  fixture=await mkdtemp(join(tmpdir(),"textanalysis-next-lint-glob-"));
  await Promise.all([
    mkdir(join(fixture,"pages"),{recursive:true}),
    mkdir(join(fixture,"apps","a","pages"),{recursive:true}),
    mkdir(join(fixture,"apps","b","pages"),{recursive:true}),
  ]);
  await Promise.all([
    writeFile(join(fixture,"pages","base.jsx"),"export default function Page(){return null;}\n"),
    writeFile(join(fixture,"apps","a","pages","about.jsx"),"export default function Page(){return null;}\n"),
    writeFile(join(fixture,"apps","b","pages","pricing.jsx"),"export default function Page(){return null;}\n"),
    writeFile(join(fixture,"apps","not-a-directory.txt"),"A rootDir wildcard must not include this file.\n"),
  ]);
});
after(async()=>{if(fixture)await rm(fixture,{recursive:true,force:true});});

function roots(rootDir,cwd=process.cwd()){
  return getRootDirs({cwd,settings:{next:rootDir===undefined?{}:{rootDir}}}).sort();
}

test("Next's ESLint plugin resolves the maintained scoped glob adapter",async()=>{
  const manifest=JSON.parse(await readFile(pluginRequire.resolve("fast-glob/package.json"),"utf8"));
  assert.equal(manifest.name,"@textanalysis/next-lint-glob");
  assert.equal(manifest.private,true);
  assert.equal(manifest.dependencies.tinyglobby,"0.2.17");
  assert.equal(typeof pluginRequire("fast-glob").globSync,"function");
});

test("Next rootDir preserves default, static, absolute, relative and array directory selection",()=>{
  const a=join(fixture,"apps","a");
  const b=join(fixture,"apps","b");
  const wildcard=join(fixture,"apps","*");
  const relativeWildcard=relative(process.cwd(),wildcard).replaceAll("\\","/");
  assert.deepEqual(roots(undefined,fixture),[fixture]);
  assert.deepEqual(roots(fixture),[fixture],"a static root must not expand into its descendants");
  assert.deepEqual(roots(process.cwd()),[process.cwd()],"an absolute cwd root must not become an empty glob");
  assert.deepEqual(roots(a),[a]);
  assert.deepEqual(roots(wildcard),[a,b].sort(),"wildcards must return directories, not fixture files");
  assert.deepEqual(roots(join(fixture,"apps","{a,b}")),[a,b].sort());
  assert.deepEqual(roots([a,b]),[a,b].sort());
  assert.deepEqual(roots([join(fixture,"apps","a*"),join(fixture,"apps","b*")]),[a,b].sort());
  assert.deepEqual(roots(relativeWildcard),[a,b].map(value=>relative(process.cwd(),value).replaceAll("\\","/")).sort());
  assert.deepEqual(roots(join(fixture,"apps","missing")),[]);
});

async function lintAnchor(rootDir,hrefs){
  const eslint=new ESLint({
    cwd:fixture,
    overrideConfigFile:true,
    overrideConfig:[{
      files:["**/*.jsx"],
      languageOptions:{parserOptions:{ecmaVersion:"latest",sourceType:"module",ecmaFeatures:{jsx:true}}},
      plugins:{"@next/next":nextPlugin},
      settings:{next:rootDir===undefined?{}:{rootDir}},
      rules:{[ruleId]:"error"},
    }],
  });
  const [result]=await eslint.lintText(`export default function Links(){return <>${hrefs.map(href=>`<a href=${JSON.stringify(href)}>Go</a>`).join("")}</>;}`,{
    filePath:resolve(fixture,"links.jsx"),
  });
  assert.equal(result.fatalErrorCount,0);
  return result.messages;
}

test("Next's internal-navigation lint rule still reports real pages under every rootDir form",async()=>{
  const a=join(fixture,"apps","a");
  const b=join(fixture,"apps","b");
  const cases=[
    {rootDir:undefined,hrefs:["/base"],expected:1},
    {rootDir:fixture,hrefs:["/base"],expected:1},
    {rootDir:a,hrefs:["/about","/pricing"],expected:1},
    {rootDir:join(fixture,"apps","*"),hrefs:["/about","/pricing"],expected:2},
    {rootDir:join(fixture,"apps","{a,b}"),hrefs:["/about","/pricing"],expected:2},
    {rootDir:[a,b],hrefs:["/about","/pricing"],expected:2},
  ];
  for(const {rootDir,hrefs,expected} of cases){
    const messages=await lintAnchor(rootDir,hrefs);
    assert.equal(messages.length,expected,`rootDir=${JSON.stringify(rootDir)} must retain internal-page detection`);
    assert.ok(messages.every(message=>message.ruleId===ruleId&&message.severity===2));
    assert.ok(messages.every(message=>message.message.includes("Use `<Link />` from `next/link` instead")));
  }
});

test("the preserved Next lint rule still permits external links",async()=>{
  assert.deepEqual(await lintAnchor(fixture,["https://example.com/base"]),[]);
});
