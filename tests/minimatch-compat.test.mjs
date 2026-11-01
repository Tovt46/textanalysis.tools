import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import test from "node:test";
import minimatch,{Minimatch} from "minimatch";
import {ESLint} from "eslint";

const require=createRequire(import.meta.url);

test("lint consumers use patched matching with their expected CommonJS or named API",async()=>{
  for(const name of ["eslint","@eslint/config-array","@eslint/eslintrc","eslint-plugin-import","eslint-plugin-jsx-a11y","eslint-plugin-react"]){
    const consumerRequire=createRequire(require.resolve(name));
    assert.equal(consumerRequire("minimatch"),minimatch,name);
    const manifest=JSON.parse(await readFile(consumerRequire.resolve("minimatch/package.json"),"utf8"));
    assert.equal(manifest.name,"@textanalysis/minimatch-compat");
  }
  const parserRequire=createRequire(require.resolve("@typescript-eslint/typescript-estree"));
  const parserManifest=JSON.parse(await readFile(parserRequire.resolve("minimatch/package.json"),"utf8"));
  assert.equal(parserManifest.version,"11.0.3");
  assert.equal(typeof parserRequire("minimatch").Minimatch,"function");
  assert.equal(typeof minimatch,"function");
  assert.equal(minimatch.Minimatch,Minimatch);
});

test("compatibility entry preserves brace, globstar, negation, dot and default-factory matching",()=>{
  assert.equal(minimatch("src/lib/file.ts","src/**/*.{js,ts}"),true);
  assert.equal(minimatch("src/lib/file.css","src/**/*.{js,ts}"),false);
  assert.equal(new Minimatch("src/**/file.ts").match("src/lib/file.ts"),true);
  assert.equal(new Minimatch("src/**/file.ts").match("src/lib",true),true);
  assert.equal(minimatch("src/file.ts","*.ts",{matchBase:true}),true);
  assert.equal(minimatch("FILE.TS","*.ts",{nocase:true}),true);
  assert.equal(minimatch("file.ts","!*.js"),true);
  assert.equal(minimatch(".config.ts","*.ts"),false);
  const withDots=minimatch.defaults({dot:true});
  assert.equal(typeof withDots,"function");
  assert.equal(withDots(".config.ts","*.ts"),true);
  assert.equal(new withDots.Minimatch("*.ts").match(".config.ts"),true);
  assert.equal(withDots.defaults({nocase:true})(".CONFIG.TS","*.ts"),true);
  assert.deepEqual(minimatch.braceExpand("*.{js,ts}"),["*.js","*.ts"]);
  assert.deepEqual(minimatch.match(["a.js","b.ts","c.css"],"*.{js,ts}"),["a.js","b.ts"]);
  assert.deepEqual(["a.js","b.ts"].filter(minimatch.filter("*.ts")),["b.ts"]);
});

test("ESLint file selection, ignores and per-file rules still work",async()=>{
  const eslint=new ESLint({overrideConfigFile:true,overrideConfig:[
    {ignores:["src/**/ignored/**"]},
    {files:["src/**/*.{js,ts}"],rules:{"no-unused-vars":"error"}},
    {files:["src/**/special.ts"],rules:{"no-alert":"error"}},
  ]});
  assert.equal(await eslint.isPathIgnored("src/nested/ignored/file.ts"),true);
  assert.equal(await eslint.isPathIgnored("src/nested/file.ts"),false);
  const [ordinary]=await eslint.lintText("const unused=1;",{filePath:"src/nested/file.ts"});
  assert.deepEqual(ordinary.messages.map(message=>message.ruleId),["no-unused-vars"]);
  const [special]=await eslint.lintText("alert('message');",{filePath:"src/nested/special.ts"});
  assert.deepEqual(special.messages.map(message=>message.ruleId),["no-alert"]);
});

test("patched glob parsing rejects oversized patterns and handles many path parts in a bounded process",async()=>{
  // A subprocess deadline prevents a regression in the matcher from freezing
  // the test runner. No pattern length or parsed glob is truncated by the shim.
  const child=spawn(process.execPath,["--input-type=commonjs","--eval",`
    const assert=require('node:assert/strict');
    const minimatch=require('minimatch');
    assert.throws(()=>minimatch('x','a'.repeat(65537)),/pattern is too long/);
    const path=Array(2048).fill('a').join('/');
    assert.equal(minimatch(path,Array(2048).fill('*').join('/')),true);
    assert.equal(minimatch('a/b/file.ts','**/*.ts'),true);
  `],{cwd:new URL("../",import.meta.url),stdio:["ignore","ignore","pipe"],signal:AbortSignal.timeout(5_000)});
  let stderr="";
  child.stderr.on("data",chunk=>{stderr+=chunk;});
  let error;
  child.once("error",value=>{error=value;});
  const code=await new Promise(resolve=>child.once("close",resolve));
  assert.ifError(error);
  assert.equal(code,0,stderr);
});
