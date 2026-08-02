import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import test from "node:test";

const CLI_PATH=new URL("../packages/cli/dist/textanalysis.mjs",import.meta.url);
const CONFIG_SCHEMA_URL=new URL("../packages/cli/schema/textanalysis.config.schema.json",import.meta.url);

function runCli(args,{cwd,input}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[CLI_PATH.pathname,...args],{
      cwd,
      stdio:["pipe","pipe","pipe"],
      env:{...process.env,NO_COLOR:"1"},
    });
    let stdout="";
    let stderr="";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",chunk=>{stdout+=chunk;});
    child.stderr.on("data",chunk=>{stderr+=chunk;});
    child.once("error",reject);
    child.once("close",code=>resolve({code,stdout,stderr}));
    child.stdin.end(input);
  });
}

test("check passes a versioned deterministic rule set",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-pass-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"Text analysis turns language into evidence. Clear evidence supports review and useful decisions.","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases:["text analysis"],
      forbiddenPhrases:["guaranteed ranking"],
      minimumWords:10,
      maxTermDensity:20,
      maxPhraseDensity:20,
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","json"],{cwd:directory});
  assert.equal(response.code,0,response.stderr);
  const result=JSON.parse(response.stdout);
  assert.equal(result.schemaVersion,1);
  assert.equal(result.passed,true);
  assert.equal(result.summary.rules,5);
  assert.equal(result.summary.failures,0);
});

test("check explains failures and exits non-zero in CI format",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-fail-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"spam spam spam spam guaranteed ranking","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases:["text analysis"],
      forbiddenPhrases:["guaranteed ranking"],
      minimumWords:100,
      maxTermDensity:20,
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","ci"],{cwd:directory});
  assert.equal(response.code,1);
  assert.match(response.stdout,/::error title=textanalysis check::\[requiredPhrase:text analysis\]/);
  assert.match(response.stdout,/Forbidden phrase .* appears 1 time/);
  assert.match(response.stdout,/FAIL: 0\/4 rules passed/);
  assert.equal(response.stderr,"");
});

test("check applies a config-relative baseline similarity threshold",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-similarity-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const article="alpha beta gamma delta alpha beta gamma delta";
  await Promise.all([
    writeFile(join(directory,"article.md"),article,"utf8"),
    writeFile(join(directory,"baseline.md"),article,"utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      maxSimilarity:0.8,
      baseline:"baseline.md",
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","json","--keep-stopwords"],{cwd:directory});
  assert.equal(response.code,1);
  const result=JSON.parse(response.stdout);
  assert.equal(result.rules[0].rule,"maxSimilarity");
  assert.equal(result.rules[0].measured,1);
  assert.match(result.baseline,/baseline\.md$/);
});

test("check clamps identical-document cosine similarity at one",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-cosine-bound-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const article="t0x t1x t1x t2x t2x t2x";
  await Promise.all([
    writeFile(join(directory,"article.md"),article,"utf8"),
    writeFile(join(directory,"baseline.md"),article,"utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      maxSimilarity:1,
      baseline:"baseline.md",
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","json","--keep-stopwords"],{cwd:directory});
  assert.equal(response.code,0,response.stderr);
  const result=JSON.parse(response.stdout);
  assert.equal(result.rules[0].measured,1);
  assert.equal(result.rules[0].passed,true);
});

test("check rejects unversioned configuration",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-config-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"alpha beta gamma","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({minimumWords:2}),"utf8"),
  ]);
  const response=await runCli(["check","article.md"],{cwd:directory});
  assert.equal(response.code,2);
  assert.match(response.stderr,/schemaVersion must be 1/);
});

test("published check schema mirrors non-empty runtime rule requirements",async(t)=>{
  const schema=JSON.parse(await readFile(CONFIG_SCHEMA_URL,"utf8"));
  const requiredBranch=schema.anyOf.find(branch=>branch.required?.includes("requiredPhrases"));
  const forbiddenBranch=schema.anyOf.find(branch=>branch.required?.includes("forbiddenPhrases"));
  assert.equal(requiredBranch.properties.requiredPhrases.minItems,1);
  assert.equal(forbiddenBranch.properties.forbiddenPhrases.minItems,1);
  const requiredPhrasePattern=new RegExp(schema.properties.requiredPhrases.items.pattern);
  const forbiddenPhrasePattern=new RegExp(schema.properties.forbiddenPhrases.items.pattern);
  assert.equal(requiredPhrasePattern.test("text analysis"),true);
  assert.equal(forbiddenPhrasePattern.test("аналіз тексту"),true);
  assert.equal(requiredPhrasePattern.test("!!!"),false);
  assert.equal(forbiddenPhrasePattern.test("12345"),false);
  assert.equal(schema.properties.baseline.pattern,"\\S");

  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-empty-rules-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"alpha beta gamma","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({schemaVersion:1,requiredPhrases:[]}),"utf8"),
  ]);
  const emptyRules=await runCli(["check","article.md"],{cwd:directory});
  assert.equal(emptyRules.code,2);
  assert.match(emptyRules.stderr,/at least one rule/);
});

test("check rejects phrases without analyzable tokens",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-analyzable-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await writeFile(join(directory,"article.md"),"Alpha beta gamma","utf8");

  for(const phrase of ["!!!","12345"]){
    await writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      forbiddenPhrases:[phrase],
    }),"utf8");
    const response=await runCli(["check","article.md"],{cwd:directory});
    assert.equal(response.code,2);
    assert.match(response.stderr,/non-empty analyzable phrases/);
  }
});

test("check rejects a phrase that is both required and forbidden",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-overlap-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"Text analysis measures text.","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases:["Text Analysis"],
      forbiddenPhrases:["text  analysis"],
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md"],{cwd:directory});
  assert.equal(response.code,2);
  assert.match(response.stderr,/cannot be both required and forbidden/);
});

test("check detects required and forbidden overlap after analysis tokenization",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-token-overlap-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"Alpha beta gamma.","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases:["alpha, beta"],
      forbiddenPhrases:["alpha beta"],
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md"],{cwd:directory});
  assert.equal(response.code,2);
  assert.match(response.stderr,/cannot be both required and forbidden/);
});

test("check keeps comma and semicolon inside configured phrases",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-punctuation-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await Promise.all([
    writeFile(join(directory,"article.md"),"Alpha beta provides clear evidence for review.","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases:["alpha, beta"],
      forbiddenPhrases:["missing; phrase"],
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","json","--keep-stopwords"],{cwd:directory});
  assert.equal(response.code,0,response.stderr);
  const result=JSON.parse(response.stdout);
  assert.equal(result.rules[0].measured,1);
  assert.equal(result.rules[1].measured,0);
});

test("check evaluates forbidden phrases after a full required-phrase list",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-check-phrase-limits-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const requiredPhrases=Array.from({length:100},(_,index)=>`required phrase ${index}x`);
  await Promise.all([
    writeFile(join(directory,"article.md"),"This article contains the blocked phrase near the end.","utf8"),
    writeFile(join(directory,"textanalysis.config.json"),JSON.stringify({
      schemaVersion:1,
      requiredPhrases,
      forbiddenPhrases:["blocked phrase"],
    }),"utf8"),
  ]);
  const response=await runCli(["check","article.md","--format","json","--keep-stopwords"],{cwd:directory});
  assert.equal(response.code,1,response.stderr);
  const result=JSON.parse(response.stdout);
  const forbidden=result.rules.find(item=>item.rule==="forbiddenPhrase:blocked phrase");
  assert.equal(forbidden.measured,1);
  assert.equal(forbidden.passed,false);
});
