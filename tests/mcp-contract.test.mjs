import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";

const CLI_PATH=new URL("../packages/cli/dist/textanalysis.mjs",import.meta.url);
const EXPECTED_TOOLS=[
  "analyze_text",
  "word_frequency",
  "keyword_density",
  "ngram_analysis",
  "bag_of_words",
  "compare_texts",
  "tfidf",
  "text_similarity",
];
const sourceA="Transparent text analysis measures repeated terms and recurring phrases with deterministic counts.";
const sourceB="A deterministic review compares vocabulary, recurring phrases, and measurable term frequency across drafts.";

async function withMcpClient(t,run){
  const transport=new StdioClientTransport({
    command:process.execPath,
    args:[CLI_PATH.pathname,"mcp"],
    stderr:"pipe",
  });
  const client=new Client({name:"textanalysis-mcp-contract-test",version:"1.0.0"});
  t.after(async()=>client.close());
  await client.connect(transport);
  return run(client);
}

test("MCP publishes typed results, structured errors, and conditional network metadata",async(t)=>{
  await withMcpClient(t,async(client)=>{
    const listed=await client.listTools();
    assert.deepEqual(listed.tools.map(tool=>tool.name),EXPECTED_TOOLS);

    for(const tool of listed.tools){
      assert.equal(tool.annotations?.readOnlyHint,true,`${tool.name} must remain read-only`);
      assert.equal(tool.annotations?.destructiveHint,false,`${tool.name} must remain non-destructive`);
      assert.equal(tool.annotations?.openWorldHint,true,`${tool.name} accepts explicit public URL inputs`);
      assert.equal(tool._meta?.["textanalysis.tools/networkBehavior"]?.access,"conditional");
      assert.ok(Object.keys(tool.inputSchema?.properties??{}).length>0,`${tool.name} must publish its input fields`);
      assert.equal(tool.outputSchema?.type,"object",`${tool.name} needs an object output schema`);
      assert.equal(tool.outputSchema?.properties?.storage?.const,"local");
      const outcome=tool.outputSchema?.properties?.outcome;
      const alternatives=outcome?.oneOf??outcome?.anyOf;
      assert.equal(alternatives?.length,2,`${tool.name} must distinguish success from failure`);
      assert.ok(alternatives.some(option=>option.properties?.result),`${tool.name} is missing a typed result schema`);
      assert.ok(alternatives.some(option=>option.properties?.error),`${tool.name} is missing its structured error schema`);
    }

    const calls=[
      {name:"analyze_text",arguments:{source:sourceA,language:"en",keepStopwords:true,focus:["text analysis"]}},
      {name:"word_frequency",arguments:{source:sourceA,language:"en",keepStopwords:true,top:10}},
      {name:"keyword_density",arguments:{source:sourceA,language:"en",keepStopwords:true,trackedKeywords:["text analysis"],top:10}},
      {name:"ngram_analysis",arguments:{source:sourceA,language:"en",keepStopwords:true,ngramSize:2,top:10}},
      {name:"bag_of_words",arguments:{source:sourceA,language:"en",keepStopwords:true,top:10}},
      {name:"compare_texts",arguments:{
        a:{source:sourceA,language:"en",keepStopwords:true},
        b:{source:sourceB,language:"en",keepStopwords:true},
        top:10,
      }},
      {name:"tfidf",arguments:{
        documents:[
          {source:sourceA,language:"en",keepStopwords:true},
          {source:sourceB,language:"en",keepStopwords:true},
        ],
        top:10,
      }},
      {name:"text_similarity",arguments:{
        a:{source:sourceA,language:"en",keepStopwords:true},
        b:{source:sourceB,language:"en",keepStopwords:true},
        method:"tfidf",
        top:10,
      }},
    ];

    for(const call of calls){
      const response=await client.callTool(call);
      assert.equal(response.isError,undefined,`${call.name} returned an error: ${JSON.stringify(response.content)}`);
      assert.equal(response.structuredContent?.storage,"local");
      assert.equal(response.structuredContent?.outcome?.ok,true);
      assert.ok(response.structuredContent?.outcome?.result,`${call.name} returned no structured result`);
      assert.equal(response.structuredContent?.outcome?.error,undefined);
      assert.match(response.content[0]?.text??"",/structuredContent\.outcome\.result/);
      assert.ok((response.content[0]?.text?.length??0)<120,`${call.name} duplicated its full result in text content`);
      assert.doesNotMatch(response.content[0]?.text??"",/Transparent text analysis/);
    }

    const compareTool=listed.tools.find(tool=>tool.name==="compare_texts");
    assert.deepEqual(compareTool?.inputSchema?.required,["a","b"]);
    assert.equal(compareTool?.inputSchema?.properties?.offset?.minimum,0);
    assert.equal(compareTool?.inputSchema?.properties?.offset?.maximum,250_000);
    assert.equal(compareTool?.inputSchema?.properties?.offset?.default,0);

    const vocabulary=Array.from({length:240},(_,index)=>`term${index}x`);
    const boundedTfIdf=await client.callTool({
      name:"tfidf",
      arguments:{
        documents:[
          {source:vocabulary.join(" "),language:"en",keepStopwords:true},
          {source:[...vocabulary].reverse().join(" "),language:"en",keepStopwords:true},
        ],
        top:25,
      },
    });
    const boundedResult=boundedTfIdf.structuredContent?.outcome?.result;
    assert.equal(boundedResult.idfTable.length,25);
    assert.equal(boundedResult.totalIdfRows,240);
    assert.equal(boundedResult.returnedIdfRows,25);
    assert.equal(boundedResult.nextIdfOffset,25);
    assert.equal(boundedResult.hasMoreIdfRows,true);
    assert.equal(boundedResult.idfTableTruncated,true);

    const secondPage=await client.callTool({
      name:"tfidf",
      arguments:{
        documents:[
          {source:vocabulary.join(" "),language:"en",keepStopwords:true},
          {source:[...vocabulary].reverse().join(" "),language:"en",keepStopwords:true},
        ],
        top:25,
        offset:boundedResult.nextIdfOffset,
      },
    });
    const secondResult=secondPage.structuredContent?.outcome?.result;
    assert.equal(secondResult.idfOffset,25);
    assert.equal(new Set([...boundedResult.idfTable,...secondResult.idfTable].map(row=>row.term)).size,50);

    const comparisonTerms=Array.from({length:120},(_,index)=>`compare${index}x`);
    const firstComparisonPage=await client.callTool({
      name:"compare_texts",
      arguments:{
        a:{source:comparisonTerms.join(" "),language:"en",keepStopwords:true},
        b:{source:[...comparisonTerms,"additionalterm"].join(" "),language:"en",keepStopwords:true},
        top:100,
      },
    });
    const firstComparison=firstComparisonPage.structuredContent?.outcome?.result?.comparison;
    assert.equal(firstComparison.offset,0);
    assert.equal(firstComparison.wordChanges.length,100);
    assert.equal(firstComparison.nextOffset,100);
    assert.equal(firstComparison.hasMore,true);

    const secondComparisonPage=await client.callTool({
      name:"compare_texts",
      arguments:{
        a:{source:comparisonTerms.join(" "),language:"en",keepStopwords:true},
        b:{source:[...comparisonTerms,"additionalterm"].join(" "),language:"en",keepStopwords:true},
        top:100,
        offset:firstComparison.nextOffset,
      },
    });
    const secondComparison=secondComparisonPage.structuredContent?.outcome?.result?.comparison;
    assert.equal(secondComparison.offset,100);
    assert.equal(secondComparison.nextOffset,null);
    assert.equal(secondComparison.hasMore,false);
    assert.equal(secondComparison.wordChanges.length,21);
    assert.equal(
      new Set([...firstComparison.wordChanges,...secondComparison.wordChanges].map(row=>row.term)).size,
      121,
    );

    const invalidComparisonOffset=await client.callTool({
      name:"compare_texts",
      arguments:{
        a:{source:sourceA,language:"en",keepStopwords:true},
        b:{source:sourceB,language:"en",keepStopwords:true},
        top:10,
        offset:250_001,
      },
    });
    assert.equal(invalidComparisonOffset.isError,true);
    assert.equal(invalidComparisonOffset.structuredContent?.outcome?.error?.code,"INVALID_ARGUMENT");

    for(const argumentsValue of [{language:"en"},{source:123,language:"en"}]){
      const invalidRequiredSource=await client.callTool({
        name:"word_frequency",
        arguments:argumentsValue,
      });
      assert.equal(invalidRequiredSource.isError,true);
      assert.equal(invalidRequiredSource.structuredContent?.storage,"local");
      assert.equal(invalidRequiredSource.structuredContent?.outcome?.ok,false);
      assert.equal(invalidRequiredSource.structuredContent?.outcome?.error?.code,"INVALID_ARGUMENT");
      assert.equal(invalidRequiredSource.structuredContent?.outcome?.error?.category,"validation");
    }

    const invalidArguments=await client.callTool({
      name:"word_frequency",
      arguments:{source:sourceA,language:"en",top:999},
    });
    assert.equal(invalidArguments.isError,true);
    assert.equal(invalidArguments.structuredContent?.outcome?.ok,false);
    assert.equal(invalidArguments.structuredContent?.outcome?.error?.code,"INVALID_ARGUMENT");
    assert.equal(invalidArguments.structuredContent?.outcome?.error?.category,"validation");
    assert.equal(invalidArguments.structuredContent?.outcome?.error?.retryable,false);

    const failed=await client.callTool({
      name:"analyze_text",
      arguments:{source:"alpha beta",language:"en",keepStopwords:true},
    });
    assert.equal(failed.isError,true);
    assert.equal(failed.structuredContent?.storage,"local");
    assert.equal(failed.structuredContent?.outcome?.ok,false);
    assert.equal(failed.structuredContent?.outcome?.result,undefined);
    assert.deepEqual(
      Object.keys(failed.structuredContent?.outcome?.error??{}).sort(),
      ["category","code","message","retryable","status"],
    );
    assert.equal(failed.structuredContent.outcome.error.code,"INSUFFICIENT_TEXT");
    assert.equal(failed.structuredContent.outcome.error.status,422);
    assert.equal(failed.structuredContent.outcome.error.category,"analysis");
    assert.equal(failed.structuredContent.outcome.error.retryable,false);

    const invalidUrl=await client.callTool({
      name:"word_frequency",
      arguments:{source:"not-a-url",sourceType:"url",language:"en"},
    });
    assert.equal(invalidUrl.isError,true);
    assert.equal(invalidUrl.structuredContent?.outcome?.error?.code,"INVALID_URL");
    assert.equal(invalidUrl.structuredContent?.outcome?.error?.category,"validation");

    const compoundInput="x ".repeat(84_000);
    const oversizedCorpus=await client.callTool({
      name:"tfidf",
      arguments:{
        documents:Array.from({length:3},()=>({source:compoundInput,language:"en",keepStopwords:true})),
        top:1,
      },
    });
    assert.equal(oversizedCorpus.isError,true);
    assert.equal(oversizedCorpus.structuredContent?.outcome?.error?.code,"COMPOUND_INPUT_TOO_LARGE");
    assert.equal(oversizedCorpus.structuredContent?.outcome?.error?.category,"resource_limit");
  });
});

test("agent integration page documents three operational recipes in English",async()=>{
  const source=await readFile(new URL("../app/AgentPage.tsx",import.meta.url),"utf8");
  for(const expected of [
    "Repetition and density audit",
    "Draft versus baseline regression",
    "Duplicate and near-duplicate detection",
    "keyword_density",
    "compare_texts",
    "text_similarity",
  ]){
    assert.ok(source.includes(expected),`Missing agent recipe content: ${expected}`);
  }
});
