import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import test from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";

const CLI_PATH=new URL("../packages/cli/dist/textanalysis.mjs",import.meta.url);
const CLI_PACKAGE=JSON.parse(await readFile(new URL("../packages/cli/package.json",import.meta.url),"utf8"));

function runCli(args,{input}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[CLI_PATH.pathname,...args],{
      stdio:["pipe","pipe","pipe"],
      env:{...process.env,NO_COLOR:"1"},
    });
    let stdout="";
    let stderr="";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",(chunk)=>{stdout+=chunk;});
    child.stderr.on("data",(chunk)=>{stderr+=chunk;});
    child.once("error",reject);
    child.once("close",(code,signal)=>resolve({code,signal,stdout,stderr}));
    if(input!==undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

test("CLI exposes help and version",async()=>{
  const [help,version]=await Promise.all([
    runCli(["--help"]),
    runCli(["--version"]),
  ]);
  assert.equal(help.code,0);
  assert.match(help.stdout,/Commands:\s+analyze/);
  assert.match(help.stdout,/similarity/);
  assert.match(help.stdout,/mcp/);
  assert.equal(version.code,0);
  assert.equal(version.stdout,`${CLI_PACKAGE.version}\n`);
});

test("MCP exposes eight local read-only tools with structured results",async(t)=>{
  const transport=new StdioClientTransport({
    command:process.execPath,
    args:[CLI_PATH.pathname,"mcp"],
    stderr:"pipe",
  });
  const client=new Client({name:"textanalysis-tools-test",version:"1.0.0"});
  t.after(async()=>client.close());
  await client.connect(transport);

  const listed=await client.listTools();
  assert.equal(listed.tools.length,8);
  assert.deepEqual(
    listed.tools.map(tool=>tool.name),
    ["analyze_text","word_frequency","keyword_density","ngram_analysis","bag_of_words","compare_texts","tfidf","text_similarity"],
  );
  assert.ok(listed.tools.every(tool=>tool.annotations?.readOnlyHint===true));

  const response=await client.callTool({
    name:"word_frequency",
    arguments:{
      source:"alpha beta alpha gamma",
      language:"en",
      keepStopwords:true,
    },
  });
  assert.equal(response.isError,undefined);
  assert.deepEqual(response.structuredContent.outcome.result.rows[0],{
    term:"alpha",
    count:2,
    percentage:50,
    per1000:500,
  });
  assert.equal(response.structuredContent.storage,"local");

  const comparisonResponse=await client.callTool({
    name:"compare_texts",
    arguments:{
      a:{source:"alpha beta gamma delta epsilon zeta eta theta",language:"en",keepStopwords:true},
      b:{source:"alpha beta iota kappa lambda mu nu xi",language:"en",keepStopwords:true},
      top:5,
    },
  });
  const mcpComparison=comparisonResponse.structuredContent.outcome.result.comparison;
  assert.equal(mcpComparison.wordChanges.length,5);
  assert.equal(mcpComparison.returnedRows.wordChanges,5);
  assert.equal(mcpComparison.truncated,true);
  assert.equal(mcpComparison.hasMore,true);
  assert.equal(mcpComparison.nextOffset,5);
});

test("focus phrases preserve stop-word adjacency when table stop words are hidden",async()=>{
  const response=await runCli([
    "analyze",
    "--text","Analysis of text improves clarity. Analysis of text supports review. Analysis of text provides evidence.",
    "--language","en",
    "--focus","analysis of text",
    "--format","json",
  ]);
  assert.equal(response.code,0,response.stderr);
  const data=JSON.parse(response.stdout);
  assert.equal(data.result.focusCoverage[0].count,3);
  assert.equal(data.result.focusCoverage[0].per1000,200);
});

test("invalid focus option values exit with CLI usage status",async()=>{
  const response=await runCli([
    "analyze",
    "--text","alpha beta gamma",
    "--language","en",
    "--focus",Array.from({length:101},(_,index)=>`phrase ${index}x`).join(","),
    "--format","json",
  ]);
  assert.equal(response.code,2);
  assert.match(response.stderr,/Option --focus must contain at most 100/);
  assert.match(response.stderr,/Run textanalysis --help for usage/);
});

test("frequency reads stdin and returns deterministic local JSON",async()=>{
  const response=await runCli(["frequency","-","--language","en","--keep-stopwords","--format","json"],{
    input:"alpha beta alpha gamma",
  });
  assert.equal(response.code,0,response.stderr);
  const data=JSON.parse(response.stdout);
  assert.equal(data.command,"frequency");
  assert.equal(data.storage,"local");
  assert.deepEqual(data.inputs,["stdin"]);
  assert.equal(data.result.tokenCount,4);
  assert.deepEqual(data.result.rows[0],{term:"alpha",count:2,percentage:50,per1000:500});
});

test("frequency supports Spanish detection and default stop words",async()=>{
  const response=await runCli(["frequency","-","--language","auto","--format","json"],{
    input:"El análisis de texto permite comparar palabras y encontrar patrones en el contenido.",
  });
  assert.equal(response.code,0,response.stderr);
  const data=JSON.parse(response.stdout);
  assert.equal(data.result.language,"es");
  assert.equal(data.result.rows.some((row)=>row.term==="el"),false);
  assert.ok(data.result.rows.some((row)=>row.term==="análisis"));
});

test("bounded single-source commands expose explicit truncation metadata",async()=>{
  const source="alpha alpha beta beta gamma gamma";
  const [frequency,ngram,bow,density]=await Promise.all([
    runCli(["frequency","--text",source,"--language","en","--keep-stopwords","--top","1","--format","json"]),
    runCli(["ngram","--text",source,"--language","en","--keep-stopwords","--size","1","--top","1","--format","json"]),
    runCli(["bow","--text",source,"--language","en","--keep-stopwords","--top","1","--format","json"]),
    runCli(["density","--text",source,"--language","en","--keep-stopwords","--keywords","alpha,beta","--top","1","--format","json"]),
  ]);
  for(const response of [frequency,ngram,bow]){
    assert.equal(response.code,0,response.stderr);
    const result=JSON.parse(response.stdout).result;
    assert.deepEqual(
      {totalRows:result.totalRows,returnedRows:result.returnedRows,truncated:result.truncated},
      {totalRows:3,returnedRows:1,truncated:true},
    );
  }
  assert.equal(density.code,0,density.stderr);
  const densityResult=JSON.parse(density.stdout).result;
  assert.equal(densityResult.totalRows.trackedKeywords,2);
  assert.equal(densityResult.returnedRows.trackedKeywords,1);
  assert.equal(densityResult.totalRows.unigrams,3);
  assert.equal(densityResult.returnedRows.unigrams,1);
  assert.equal(densityResult.truncated,true);
});

test("analyze, density, ngram, and bow commands expose their focused results",async()=>{
  const source="text analysis makes text analysis measurable and text evidence useful";
  const [analyze,density,ngram,bow]=await Promise.all([
    runCli(["analyze","--text",source,"--language","en","--focus","text analysis","--format","json"]),
    runCli(["density","--text",source,"--language","en","--keywords","text analysis","--format","json"]),
    runCli(["ngram","--text",source,"--language","en","--size","2","--format","json"]),
    runCli(["bow","--text",source,"--language","en","--format","json"]),
  ]);
  for(const result of [analyze,density,ngram,bow]) assert.equal(result.code,0,result.stderr);

  const analyzeData=JSON.parse(analyze.stdout);
  const densityData=JSON.parse(density.stdout);
  const ngramData=JSON.parse(ngram.stdout);
  const bowData=JSON.parse(bow.stdout);
  assert.equal(analyzeData.result.focusCoverage[0].count,2);
  assert.equal(densityData.result.trackedKeywords[0].count,2);
  assert.equal(ngramData.result.n,2);
  assert.equal(ngramData.result.rows[0].term,"text analysis");
  assert.equal(bowData.result.rows[0].term,"text");
  assert.equal(bowData.result.rows[0].frequency,3/9);
});

test("density preserves tracked phrases with zero occurrences",async()=>{
  const response=await runCli([
    "density",
    "--text","alpha beta alpha",
    "--language","en",
    "--keywords","missing phrase",
    "--format","json",
  ]);
  assert.equal(response.code,0,response.stderr);
  const data=JSON.parse(response.stdout);
  assert.deepEqual(data.result.trackedKeywords,[{
    term:"missing phrase",
    count:0,
    n:2,
    percentage:0,
    per1000:0,
  }]);
});

test("density rejects tracked phrase lists that would be silently truncated",async()=>{
  const tooMany=await runCli([
    "density","--text","alpha beta gamma","--language","en",
    "--keywords",Array.from({length:101},(_,index)=>`phrase ${index}x`).join(","),
    "--format","json",
  ]);
  assert.equal(tooMany.code,2);
  assert.match(tooMany.stderr,/at most 100 analyzable phrases/);

  const tooLong=await runCli([
    "density","--text","alpha beta gamma","--language","en",
    "--keywords","x".repeat(201),"--format","json",
  ]);
  assert.equal(tooLong.code,2);
  assert.match(tooLong.stderr,/up to 200 characters/);
});

test("TF-IDF, similarity, and comparison accept file pairs",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-cli-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const fileA=join(directory,"a.txt");
  const fileB=join(directory,"b.txt");
  await Promise.all([
    writeFile(fileA,"common common common alpha alpha alpha","utf8"),
    writeFile(fileB,"common common common beta beta beta","utf8"),
  ]);

  const [tfidf,bowSimilarity,tfidfSimilarity,comparison,limitedComparison]=await Promise.all([
    runCli(["tfidf",fileA,fileB,"--language","en","--format","json"]),
    runCli(["similarity",fileA,fileB,"--language","en","--method","bow","--format","json"]),
    runCli(["similarity",fileA,fileB,"--language","en","--method","tfidf","--format","json"]),
    runCli(["compare",fileA,fileB,"--language","en","--keep-stopwords","--format","json"]),
    runCli(["compare","--text-a","alpha beta gamma delta epsilon zeta eta theta","--text-b","alpha beta iota kappa lambda mu nu xi","--language","en","--keep-stopwords","--top","5","--format","json"]),
  ]);
  for(const result of [tfidf,bowSimilarity,tfidfSimilarity,comparison,limitedComparison]) assert.equal(result.code,0,result.stderr);

  const tfidfData=JSON.parse(tfidf.stdout);
  const bowData=JSON.parse(bowSimilarity.stdout);
  const similarityData=JSON.parse(tfidfSimilarity.stdout);
  const comparisonData=JSON.parse(comparison.stdout);
  const limitedComparisonData=JSON.parse(limitedComparison.stdout);
  assert.equal(tfidfData.result.documentCount,2);
  assert.equal(tfidfData.result.documents.length,2);
  assert.equal(similarityData.result.method,"tfidf");
  assert.ok(similarityData.result.cosine<bowData.result.cosine);
  assert.ok(similarityData.result.documents[0].rows.some((row)=>row.idf>1));
  assert.equal(comparisonData.comparison.metrics.tokenCount.delta,0);
  assert.ok(comparisonData.comparison.wordChanges.some((row)=>row.term==="alpha"));
  assert.equal(limitedComparisonData.comparison.wordChanges.length,5);
  assert.equal(limitedComparisonData.comparison.returnedRows.wordChanges,5);
  assert.equal(limitedComparisonData.comparison.truncated,true);
  assert.equal(limitedComparisonData.comparison.totalRows.wordChanges,14);
  assert.equal("hasMore" in limitedComparisonData.comparison,false);
  assert.equal("nextOffset" in limitedComparisonData.comparison,false);
});

test("similarity CSV includes the score even when documents have no shared terms",async()=>{
  const response=await runCli([
    "similarity",
    "--text-a","alpha alpha",
    "--text-b","beta beta",
    "--language","en",
    "--method","tfidf",
    "--format","csv",
  ]);
  assert.equal(response.code,0,response.stderr);
  const [header,row]=response.stdout.trim().split("\n");
  assert.equal(
    header,
    "method,language,cosine,dot_product,norm_a,norm_b,overlap_terms,token_count_a,token_count_b",
  );
  assert.match(row,/^tfidf,en,0,0,/);
  assert.equal(row.split(",")[6],"0");
});

test("TF-IDF CLI bounds support vocabulary and reports truncation",async(t)=>{
  const vocabulary=Array.from({length:180},(_,index)=>`term${index}x`);
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-cli-tfidf-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const fileA=join(directory,"a.txt");
  const fileB=join(directory,"b.txt");
  await Promise.all([
    writeFile(fileA,vocabulary.join(" "),"utf8"),
    writeFile(fileB,[...vocabulary].reverse().join(" "),"utf8"),
  ]);
  const response=await runCli([
    "tfidf",
    fileA,
    fileB,
    "--language","en",
    "--keep-stopwords",
    "--top","20",
    "--format","json",
  ]);
  assert.equal(response.code,0,response.stderr);
  const result=JSON.parse(response.stdout).result;
  assert.equal(result.idfTable.length,20);
  assert.equal(result.totalIdfRows,180);
  assert.equal(result.returnedIdfRows,20);
  assert.equal(result.idfTableTruncated,true);
});

test("comparison metadata counts disjoint vocabularies beyond one-source token limit",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-cli-compare-wide-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const fileA=join(directory,"a.txt");
  const fileB=join(directory,"b.txt");
  const vocabularySize=50_100;
  await Promise.all([
    writeFile(fileA,Array.from({length:vocabularySize},(_,index)=>`a${index.toString(36)}`).join(" "),"utf8"),
    writeFile(fileB,Array.from({length:vocabularySize},(_,index)=>`b${index.toString(36)}`).join(" "),"utf8"),
  ]);
  const response=await runCli(["compare",fileA,fileB,"--language","en","--keep-stopwords","--top","5","--format","json"]);
  assert.equal(response.code,0,response.stderr);
  const comparison=JSON.parse(response.stdout).comparison;
  assert.equal(comparison.wordChanges.length,5);
  assert.equal(comparison.totalRows.wordChanges,vocabularySize*2);
  assert.equal(comparison.truncated,true);
});

test("CSV output can be saved to a file",async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),"textanalysis-cli-output-"));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const output=join(directory,"density.csv");
  const response=await runCli([
    "density",
    "--text","alpha beta alpha",
    "--language","en",
    "--keep-stopwords",
    "--keywords","alpha",
    "--format","csv",
    "--output",output,
  ]);
  assert.equal(response.code,0,response.stderr);
  assert.match(response.stdout,/Saved csv output/);
  const csv=await readFile(output,"utf8");
  assert.match(csv,/^table,term,count,n,percentage,per_1000/m);
  assert.match(csv,/tracked,alpha,2,1/);
});

test("invalid options fail with a usage exit code",async()=>{
  const response=await runCli(["ngram","--text","alpha beta gamma","--size","11"]);
  assert.equal(response.code,2);
  assert.match(response.stderr,/--size must be an integer between 1 and 10/);
  assert.match(response.stderr,/--help/);
});

test("CLI handles a substantial stdin document without truncating metrics",async()=>{
  const paragraph="Text analysis converts language into measurable evidence while preserving transparent counts and useful context. ";
  const source=paragraph.repeat(2500);
  assert.ok(source.length>250_000);
  const response=await runCli(["frequency","-","--language","en","--format","json","--top","25"],{input:source});
  assert.equal(response.code,0,response.stderr);
  const data=JSON.parse(response.stdout);
  assert.ok(data.result.tokenCount>20_000);
  assert.equal(data.result.rows.length,12);
  assert.equal(data.result.rows[0].count,2500);
});
