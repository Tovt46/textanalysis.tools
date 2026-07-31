import assert from "node:assert/strict";
import test from "node:test";

const baseUrl=process.env.TEST_BASE_URL?.trim();
let postSequence=0;

async function post(path,body){
  if(!baseUrl) throw new Error("TEST_BASE_URL is required for API resource-limit tests.");
  postSequence+=1;
  return fetch(new URL(path,baseUrl),{
    method:"POST",
    headers:{"content-type":"application/json","x-real-ip":`203.0.113.${100+postSequence}`},
    body:JSON.stringify(body),
  });
}

test("caps large single-table API results and reports truncation",async()=>{
  const source=Array.from({length:12},(_,index)=>`term${index}`).join(" ");
  for(const path of ["/api/v1/word-frequency","/api/v1/bag-of-words"]){
    const response=await post(path,{source,language:"en",keepStopwords:true,limit:3});
    assert.equal(response.status,200,path);
    const body=await response.json();
    assert.equal(body.result.rows.length,3,path);
    assert.equal(body.result.totalRows,12,path);
    assert.equal(body.result.returnedRows,3,path);
    assert.equal(body.result.truncated,true,path);
  }

  const ngramResponse=await post("/api/v1/ngram-analyzer",{
    source:"alpha beta gamma delta epsilon zeta",
    language:"en",
    keepStopwords:true,
    ngramSize:2,
    limit:2,
  });
  assert.equal(ngramResponse.status,200);
  const ngram=await ngramResponse.json();
  assert.equal(ngram.result.rows.length,2);
  assert.equal(ngram.result.totalRows,5);
  assert.equal(ngram.result.truncated,true);
});

test("caps every generated density table without dropping tracked phrases",async()=>{
  const response=await post("/api/v1/keyword-density",{
    source:"alpha beta gamma delta alpha beta gamma delta",
    language:"en",
    keepStopwords:true,
    trackedKeywords:"alpha beta",
    limit:2,
  });
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.result.trackedKeywords.length,1);
  assert.equal(body.result.unigrams.length,2);
  assert.equal(body.result.bigrams.length,2);
  assert.equal(body.result.trigrams.length,2);
  assert.equal(body.result.totalRows.unigrams,4);
  assert.equal(body.result.returnedRows.unigrams,2);
  assert.equal(body.result.truncated,true);

  const longPhrase=await post("/api/v1/keyword-density",{
    source:"alpha beta gamma delta alpha beta gamma delta",
    language:"en",
    keepStopwords:true,
    trackedKeywords:"alpha beta gamma delta",
  });
  assert.equal(longPhrase.status,200);
  assert.equal((await longPhrase.json()).result.trackedKeywords[0].n,4);

  const invalidPhrase=await post("/api/v1/keyword-density",{
    source:"alpha beta gamma",
    language:"en",
    trackedKeywords:"!!!",
  });
  assert.equal(invalidPhrase.status,400);

  const tooManyPhrases=await post("/api/v1/keyword-density",{
    source:"alpha beta gamma",
    language:"en",
    trackedKeywords:Array.from({length:101},(_,index)=>`phrase ${index}x`).join(","),
  });
  assert.equal(tooManyPhrases.status,400);
});

test("caps TF-IDF support tables and validates the requested limit",async()=>{
  const documents=[
    {source:"alpha beta gamma delta epsilon",language:"en",keepStopwords:true},
    {source:"alpha zeta eta theta iota",language:"en",keepStopwords:true},
  ];
  const response=await post("/api/v1/tf-idf",{documents,top:5,limit:2});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.result.idfTable.length,2);
  assert.equal(body.result.totalIdfRows,9);
  assert.equal(body.result.returnedIdfRows,2);
  assert.equal(body.result.idfTableTruncated,true);

  const invalid=await post("/api/v1/word-frequency",{
    source:"alpha beta gamma",
    language:"en",
    keepStopwords:true,
    limit:5_001,
  });
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error.code,"INVALID_ARGUMENT");

  const invalidDocument=await post("/api/v1/tf-idf",{documents:[null,documents[0]]});
  assert.equal(invalidDocument.status,400);
  assert.equal((await invalidDocument.json()).error.code,"INVALID_ARGUMENT");
});

test("caps optional TF-IDF details in similarity responses",async()=>{
  const response=await post("/api/v1/similarity",{
    a:{source:"alpha beta gamma delta",language:"en",keepStopwords:true},
    b:{source:"alpha beta epsilon zeta",language:"en",keepStopwords:true},
    method:"tf-idf",
    top:10,
    limit:2,
  });
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.result.idfTable.length,2);
  assert.equal(body.result.totalIdfRows,6);
  assert.equal(body.result.returnedIdfRows,2);
  assert.equal(body.result.idfTableTruncated,true);

  const invalidBowLimit=await post("/api/v1/similarity",{
    a:{source:"alpha beta gamma",language:"en",keepStopwords:true},
    b:{source:"alpha beta delta",language:"en",keepStopwords:true},
    method:"bow",
    limit:5001,
  });
  assert.equal(invalidBowLimit.status,400);
});

test("reports comparison truncation instead of silently dropping rows",async()=>{
  const terms=Array.from({length:1005},(_,index)=>`term${index}`);
  const response=await post("/api/v1/compare",{
    a:{source:terms.join(" "),language:"en",keepStopwords:true},
    b:{source:[...terms,"extraone","extratwo","extrathree"].join(" "),language:"en",keepStopwords:true},
  });
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.comparison.wordChanges.length,1000);
  assert.equal(body.comparison.totalRows.wordChanges,1008);
  assert.equal(body.comparison.returnedRows.wordChanges,1000);
  assert.equal(body.comparison.truncated,true);
});

test("rejects workloads above the analysis-token budgets before building result tables",async()=>{
  const tooManyWords=Array.from({length:100001},()=>"a").join(" ");
  const single=await post("/api/v1/word-frequency",{
    source:tooManyWords,
    language:"en",
    keepStopwords:true,
  });
  assert.equal(single.status,413);
  assert.equal((await single.json()).error.code,"ANALYSIS_TOO_LARGE");

  const chunk=Array.from({length:84000},()=>"a").join(" ");
  const compound=await post("/api/v1/tf-idf",{
    documents:[
      {source:chunk,language:"en",keepStopwords:true},
      {source:chunk,language:"en",keepStopwords:true},
      {source:chunk,language:"en",keepStopwords:true},
    ],
  });
  assert.equal(compound.status,413);
  assert.equal((await compound.json()).error.code,"COMPOUND_INPUT_TOO_LARGE");
});

test("rejects non-object JSON bodies consistently across every v1 operation",async()=>{
  for(const path of [
    "/api/v1/analyze",
    "/api/v1/compare",
    "/api/v1/word-frequency",
    "/api/v1/keyword-density",
    "/api/v1/ngram-analyzer",
    "/api/v1/bag-of-words",
    "/api/v1/tf-idf",
    "/api/v1/similarity",
  ]){
    const response=await post(path,null);
    assert.equal(response.status,400,path);
    assert.equal((await response.json()).error.code,"INVALID_ARGUMENT",path);
  }
});
