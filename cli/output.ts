import type {CliCommand} from "./arguments";

type Cell=string|number|boolean|null|undefined;
type FlatRow=Record<string,Cell>;

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function rows(value:unknown){
  return Array.isArray(value)?value.map(record):[];
}

function cell(value:unknown):Cell{
  if(value===null||value===undefined||typeof value==="string"||typeof value==="number"||typeof value==="boolean") return value;
  return JSON.stringify(value);
}

function select(row:Record<string,unknown>,fields:Array<[string,string]>):FlatRow{
  return Object.fromEntries(fields.map(([output,input])=>[output,cell(row[input])]));
}

function primaryRows(command:CliCommand,payload:Record<string,unknown>):FlatRow[]{
  const result=record(payload.result);
  if(command==="analyze"){
    return rows(result.rows).map((row)=>select(row,[
      ["rank","rank"],["term","term"],["actual_count","actualCount"],["expected_count","expectedCount"],
      ["ratio","ratio"],["zone","zone"],
    ]));
  }
  if(command==="frequency"){
    return rows(result.rows).map((row)=>select(row,[
      ["term","term"],["count","count"],["percentage","percentage"],["per_1000","per1000"],
    ]));
  }
  if(command==="density"){
    const groups=[
      ["tracked",rows(result.trackedKeywords)],
      ["unigram",rows(result.unigrams)],
      ["bigram",rows(result.bigrams)],
      ["trigram",rows(result.trigrams)],
    ] as const;
    return groups.flatMap(([table,items])=>items.map((row)=>({
      table,
      ...select(row,[["term","term"],["count","count"],["n","n"],["percentage","percentage"],["per_1000","per1000"]]),
    })));
  }
  if(command==="ngram"){
    return rows(result.rows).map((row)=>select(row,[
      ["term","term"],["count","count"],["percentage","percentage"],["per_1000","per1000"],
    ]));
  }
  if(command==="bow"){
    return rows(result.rows).map((row)=>select(row,[
      ["term","term"],["count","count"],["frequency","frequency"],["percentage","percentage"],["per_1000","per1000"],
    ]));
  }
  if(command==="tfidf"){
    return rows(result.documents).flatMap((document,index)=>{
      const documentRows=rows(document.rows);
      return documentRows.map((row)=>({
        document:index+1,
        ...select(row,[
          ["term","term"],["count","count"],["tf","tf"],["idf","idf"],["tfidf","tfidf"],
          ["percentage","percentage"],["per_1000","per1000"],
        ]),
      }));
    });
  }
  if(command==="similarity"){
    return rows(result.topTerms).map((row)=>select(row,[
      ["term","term"],["weight_a","weightA"],["weight_b","weightB"],["contribution","contribution"],
    ]));
  }

  const comparison=record(payload.comparison);
  return [
    ...rows(comparison.wordChanges).map((row)=>({
      kind:"word",
      ...select(row,[
        ["term","term"],["count_a","countA"],["count_b","countB"],["count_delta","countDelta"],
        ["share_a","shareA"],["share_b","shareB"],["share_delta","shareDelta"],
      ]),
    })),
    ...rows(comparison.bigramChanges).map((row)=>({
      kind:"bigram",
      ...select(row,[
        ["term","term"],["count_a","countA"],["count_b","countB"],["count_delta","countDelta"],
        ["share_a","shareA"],["share_b","shareB"],["share_delta","shareDelta"],
      ]),
    })),
  ];
}

function csvRows(command:CliCommand,payload:Record<string,unknown>,flattened:FlatRow[]){
  if(command!=="similarity") return flattened;
  const result=record(payload.result);
  const tokenCounts=record(result.tokenCounts);
  const metrics:FlatRow={
    method:cell(result.method),
    language:cell(result.language),
    cosine:cell(result.cosine),
    dot_product:cell(result.dotProduct),
    norm_a:cell(result.normA),
    norm_b:cell(result.normB),
    overlap_terms:cell(result.overlapTerms),
    token_count_a:cell(tokenCounts.a),
    token_count_b:cell(tokenCounts.b),
  };
  return flattened.length
    ?flattened.map((row)=>({...metrics,...row}))
    :[metrics];
}

function numeric(value:unknown){
  return typeof value==="number"&&Number.isFinite(value)?value:undefined;
}

function summary(command:CliCommand,payload:Record<string,unknown>){
  const result=record(payload.result);
  const resultA=record(payload.resultA);
  const resultB=record(payload.resultB);
  const comparison=record(payload.comparison);
  const metrics=record(comparison.metrics);
  const lines=[`Command: ${command}`];

  if(command==="compare"){
    lines.push(
      `Source A: ${numeric(resultA.tokenCount)??0} tokens · ${numeric(resultA.vocabularySize)??0} unique`,
      `Source B: ${numeric(resultB.tokenCount)??0} tokens · ${numeric(resultB.vocabularySize)??0} unique`,
    );
    const tokenMetric=record(metrics.tokenCount);
    lines.push(`Token delta: ${numeric(tokenMetric.delta)??0}`);
    return lines;
  }

  const language=typeof result.language==="string"?result.language:"auto";
  lines.push(`Language: ${language}`);
  if(command==="density"){
    lines.push(`Words: ${numeric(result.wordCount)??0} · Vocabulary: ${numeric(result.vocabularySize)??0}`);
  }else if(command==="tfidf"){
    lines.push(`Documents: ${numeric(result.documentCount)??0} · Vocabulary: ${numeric(result.totalVocabularySize)??0}`);
  }else if(command==="similarity"){
    const tokenCounts=record(result.tokenCounts);
    lines.push(
      `Tokens: A ${numeric(tokenCounts.a)??0} · B ${numeric(tokenCounts.b)??0}`,
      `Method: ${String(result.method??"tfidf")} · Cosine: ${(numeric(result.cosine)??0).toFixed(6)}`,
    );
  }else{
    lines.push(`Tokens: ${numeric(result.tokenCount)??0} · Vocabulary: ${numeric(result.vocabularySize)??0}`);
    if(command==="analyze"){
      lines.push(`Zipf exponent: ${(numeric(result.fittedExponent)??0).toFixed(4)} · R²: ${(numeric(result.rSquared)??0).toFixed(4)}`);
    }
    if(command==="ngram") lines.push(`N: ${numeric(result.n)??0} · N-grams: ${numeric(result.ngramCount)??0}`);
  }
  return lines;
}

function displayCell(value:Cell){
  if(value===null||value===undefined) return "";
  if(typeof value==="number"){
    if(Number.isInteger(value)) return String(value);
    return Number(value.toFixed(6)).toString();
  }
  const text=String(value).replaceAll(/\s+/g," ");
  return text.length>42?`${text.slice(0,39)}…`:text;
}

function table(rowsToRender:FlatRow[]){
  if(!rowsToRender.length) return "(no result rows)";
  const columns=[...new Set(rowsToRender.flatMap((row)=>Object.keys(row)))];
  const widths=columns.map((column)=>Math.min(42,Math.max(
    column.length,
    ...rowsToRender.map((row)=>displayCell(row[column]).length),
  )));
  const divider=`+-${widths.map((width)=>"-".repeat(width)).join("-+-")}-+`;
  const renderRow=(row:FlatRow)=>`| ${columns.map((column,index)=>{
    const value=displayCell(row[column]);
    return typeof row[column]==="number"?value.padStart(widths[index]):value.padEnd(widths[index]);
  }).join(" | ")} |`;
  const header=renderRow(Object.fromEntries(columns.map((column)=>[column,column])));
  return [divider,header,divider,...rowsToRender.map(renderRow),divider].join("\n");
}

function csvCell(value:Cell){
  const text=value===null||value===undefined?"":String(value);
  return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

function csv(rowsToRender:FlatRow[]){
  if(!rowsToRender.length) return "";
  const columns=[...new Set(rowsToRender.flatMap((row)=>Object.keys(row)))];
  return [
    columns.map(csvCell).join(","),
    ...rowsToRender.map((row)=>columns.map((column)=>csvCell(row[column])).join(",")),
  ].join("\n");
}

export function renderCliOutput(
  command:CliCommand,
  payload:Record<string,unknown>,
  metadata:{version:string;generatedAt:string;labels:string[]},
  format:"table"|"json"|"csv",
){
  const completePayload={
    cliVersion:metadata.version,
    command,
    generatedAt:metadata.generatedAt,
    storage:"local",
    inputs:metadata.labels,
    ...payload,
  };
  if(format==="json") return `${JSON.stringify(completePayload,null,2)}\n`;
  const flattened=primaryRows(command,payload);
  if(format==="csv") return `${csv(csvRows(command,payload,flattened))}\n`;
  return `${summary(command,payload).join("\n")}\n\n${table(flattened)}\n`;
}
