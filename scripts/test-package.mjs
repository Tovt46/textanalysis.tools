import assert from "node:assert/strict";
import {mkdir,mkdtemp,readFile,rm,stat,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT=fileURLToPath(new URL("../",import.meta.url));
const tarballArgumentIndex=process.argv.indexOf("--tarball");
const suppliedTarball=tarballArgumentIndex===-1?null:process.argv[tarballArgumentIndex+1];

if(tarballArgumentIndex!==-1&&!suppliedTarball){
  throw new Error("--tarball requires a path to an existing .tgz file");
}

function run(command,args,{cwd=ROOT,input,env={}}={}){
  return new Promise((resolveProcess,reject)=>{
    const child=spawn(command,args,{
      cwd,
      stdio:["pipe","pipe","pipe"],
      env:{...process.env,NO_COLOR:"1",...env},
    });
    let stdout="";
    let stderr="";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",chunk=>{stdout+=chunk;});
    child.stderr.on("data",chunk=>{stderr+=chunk;});
    child.once("error",reject);
    child.once("close",code=>resolveProcess({code,stdout,stderr}));
    child.stdin.end(input);
  });
}

function succeeded(result,label){
  assert.equal(result.code,0,`${label} failed:\n${result.stderr||result.stdout}`);
}

const workspace=await mkdtemp(join(tmpdir(),"textanalysis-package-"));
const installDirectory=join(workspace,"consumer");

try{
  let tarball;
  if(suppliedTarball){
    tarball=resolve(suppliedTarball);
    assert.match(tarball,/\.tgz$/,"--tarball must point to an npm .tgz archive");
  }else{
    const packed=await run("npm",[
      "pack","./packages/cli","--json","--pack-destination",workspace,
    ]);
    succeeded(packed,"npm pack");
    const packResult=JSON.parse(packed.stdout)[0];
    assert.ok(packResult.filename,"npm pack did not report a tarball filename");
    tarball=join(workspace,packResult.filename);
  }
  const tarballStats=await stat(tarball);
  assert.ok(tarballStats.size<1_000_000,`Packed artifact is unexpectedly large: ${tarballStats.size} bytes`);

  await mkdir(installDirectory,{recursive:true});
  await writeFile(join(installDirectory,"package.json"),JSON.stringify({private:true,type:"module"}),"utf8");
  const installed=await run("npm",[
    "install",tarball,"--ignore-scripts","--no-audit","--no-fund",
  ],{cwd:installDirectory});
  succeeded(installed,"install packed tarball");

  const audited=await run("npm",["audit","--omit=dev"],{cwd:installDirectory});
  succeeded(audited,"audit packed runtime dependencies");
  process.stdout.write("ok 1 - packed runtime dependency audit\n");

  const installedRoot=join(installDirectory,"node_modules/textanalysis-tools");
  await Promise.all([
    stat(join(installedRoot,"dist/textanalysis.mjs")),
    stat(join(installedRoot,"dist/index.mjs")),
    stat(join(installedRoot,"index.d.ts")),
    stat(join(installedRoot,"schema/textanalysis.config.schema.json")),
  ]);

  const binary=resolve(installDirectory,"node_modules/.bin/textanalysis");
  const fileA=join(installDirectory,"a.txt");
  const fileB=join(installDirectory,"b.txt");
  const config=join(installDirectory,"textanalysis.config.json");
  await Promise.all([
    writeFile(fileA,"alpha beta alpha gamma delta epsilon","utf8"),
    writeFile(fileB,"alpha beta zeta eta theta iota","utf8"),
    writeFile(config,JSON.stringify({schemaVersion:1,requiredPhrases:["alpha beta"],minimumWords:5}),"utf8"),
  ]);

  const commands=[
    ["analyze","--text","alpha beta alpha gamma delta","--language","en","--format","json"],
    ["frequency",fileA,"--language","en","--format","json"],
    ["density",fileA,"--language","en","--keywords","alpha beta","--format","json"],
    ["compare",fileA,fileB,"--language","en","--format","json"],
    ["ngram",fileA,"--language","en","--size","2","--format","json"],
    ["bow",fileA,"--language","en","--format","json"],
    ["tfidf",fileA,fileB,"--language","en","--format","json"],
    ["similarity",fileA,fileB,"--language","en","--format","json"],
    ["check",fileA,"--config",config,"--format","json"],
  ];
  for(const [index,args] of commands.entries()){
    const executed=await run(binary,args,{cwd:installDirectory});
    succeeded(executed,`packed CLI command ${args[0]}`);
    const payload=JSON.parse(executed.stdout);
    if(args[0]==="check")assert.equal(payload.passed,true);
    else assert.ok(payload.result||payload.comparison,`Command ${args[0]} returned no structured result`);
    process.stdout.write(`ok ${index+2} - packed ${args[0]}\n`);
  }

  const imported=await run(process.execPath,[
    "--input-type=module",
    "--eval",
    "import {analyzeText,analyzeWordFrequency,compareTexts} from 'textanalysis-tools'; const result=analyzeWordFrequency({text:'alpha beta alpha',language:'en',keepStopwords:true}); const analysis=analyzeText({text:'alpha beta alpha',language:'en',keepStopwords:true}); const compared=compareTexts({text:'alpha beta gamma',language:'en'},{text:'alpha beta delta',language:'en'},{top:2}); if(result.rows[0].count!==2||'_allUnigrams' in analysis||compared.comparison.wordChanges.length!==2||'_allUnigrams' in compared.resultA) process.exit(1);",
  ],{cwd:installDirectory});
  succeeded(imported,"import packed ESM SDK");
  process.stdout.write("ok 11 - packed ESM SDK\n");

  const typeFixture=join(installDirectory,"consumer.ts");
  await writeFile(typeFixture,`import {analyzeBagOfWords, analyzeText, analyzeWordFrequency, calculateTextSimilarity, compareTexts, type AnalyzeInput, type CompareTextsResult, type PublicZipfAnalysisResult} from "textanalysis-tools";
const input:AnalyzeInput={text:"alpha beta alpha",language:"en",keepStopwords:true};
const frequency=analyzeWordFrequency(input);
const analysis:PublicZipfAnalysisResult=analyzeText(input);
const left=analyzeBagOfWords(input);
const right=analyzeBagOfWords({...input,text:"alpha gamma"});
const score:number=calculateTextSimilarity(left,right,"tfidf").cosine;
const comparison:CompareTextsResult=compareTexts(input,{...input,text:"alpha gamma"},{top:10});
console.log(frequency.rows[0]?.term,analysis.rows[0]?.share,score,comparison.comparison.returnedRows.wordChanges);
`,"utf8");
  const typed=await run(process.execPath,[
    join(ROOT,"node_modules/typescript/bin/tsc"),
    "--noEmit","--strict","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",typeFixture,
  ],{cwd:installDirectory});
  succeeded(typed,"type-check packed SDK declarations");
  process.stdout.write("ok 12 - packed TypeScript declarations\n");

  const transport=new StdioClientTransport({command:binary,args:["mcp"],stderr:"pipe",cwd:installDirectory});
  const client=new Client({name:"packed-package-test",version:"1.0.0"});
  try{
    await client.connect(transport);
    const listed=await client.listTools();
    assert.equal(listed.tools.length,8);
    process.stdout.write("ok 13 - packed MCP discovery\n");
  }finally{
    await client.close();
  }

  const installedPackage=JSON.parse(await readFile(join(installedRoot,"package.json"),"utf8"));
  process.stdout.write(`Verified textanalysis-tools@${installedPackage.version} tarball (${tarballStats.size} bytes).\n`);
}finally{
  await rm(workspace,{recursive:true,force:true});
}
