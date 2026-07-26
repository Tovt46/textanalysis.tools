#!/usr/bin/env node

import {writeFile} from "node:fs/promises";
import packageInfo from "../package.json";
import {booleanOption,CliUsageError,parseCliArgs} from "./arguments";
import {runOperation} from "./operations";
import {renderCliOutput} from "./output";
import {StdinReader} from "./sources";

const HELP=`textanalysis ${packageInfo.version}

Local-first command line tools for textanalysis.tools.

Usage:
  textanalysis <command> [inputs...] [options]

Commands:
  analyze       Bag of Words and Zipf distribution analysis
  frequency     Complete word-frequency table
  density       Unigram, bigram, trigram, and tracked-keyword density
  compare       Compare frequency and Zipf changes between two inputs
  ngram         Count phrases from 1 to 10 tokens
  bow           Generate a Bag of Words vector
  tfidf         Calculate TF-IDF across 2 to 10 documents
  similarity    Calculate BoW or TF-IDF cosine similarity

Inputs:
  A positional input can be a local file, an HTTP(S) URL, or - for stdin.
  Single-input commands also accept --text <value> or --url <url>.
  Pair commands accept two positionals or --text-a/--url-a and --text-b/--url-b.

Common options:
  -l, --language <auto|en|ru|uk>   Text language (default: auto)
  -f, --format <table|json|csv>    Output format (default: table)
  -o, --output <file>              Save output instead of writing to stdout
      --top <number>               Maximum result rows
      --keep-stopwords             Include default stop words
      --stopwords <file>           Replace stop words with a custom list
  -h, --help                       Show help
  -V, --version                    Show version

Command options:
  analyze:     --focus <phrases> --tolerance <1.2-4>
  frequency:   --min-count <number>
  density:     --keywords <comma-separated phrases> --min-count <number>
  compare:     --focus <phrases> --tolerance <1.2-4> --min-count <number>
  ngram:       --size <1-10> --min-count <number>
  bow:         --min-count <number>
  similarity:  --method <bow|tfidf>

Examples:
  textanalysis frequency article.txt
  cat article.txt | textanalysis density --keywords "text analysis,SEO" --format json
  textanalysis ngram https://example.com/article --size 3 --format csv
  textanalysis tfidf draft.txt competitor.txt --output tfidf.json --format json
  textanalysis similarity a.txt b.txt --method tfidf
`;

function writeStdout(value:string){
  return new Promise<void>((resolve,reject)=>{
    process.stdout.write(value,(error)=>error?reject(error):resolve());
  });
}

async function main(){
  const parsed=parseCliArgs(process.argv.slice(2));
  if(booleanOption(parsed,"version")){
    await writeStdout(`${packageInfo.version}\n`);
    return;
  }
  if(booleanOption(parsed,"help")||!parsed.command){
    await writeStdout(HELP);
    return;
  }

  const stdin=new StdinReader(process.stdin,Boolean(process.stdin.isTTY));
  const operation=await runOperation(parsed.command,parsed,stdin);
  const rendered=renderCliOutput(
    parsed.command,
    operation.payload,
    {
      version:packageInfo.version,
      generatedAt:new Date().toISOString(),
      labels:operation.labels,
    },
    operation.settings.format,
  );
  if(operation.settings.output){
    await writeFile(operation.settings.output,rendered,"utf8");
    await writeStdout(`Saved ${operation.settings.format} output to ${operation.settings.output}\n`);
  }else{
    await writeStdout(rendered);
  }
}

process.stdout.on("error",(error:NodeJS.ErrnoException)=>{
  if(error.code==="EPIPE") process.exit(0);
  throw error;
});

try{
  await main();
}catch(error){
  const message=error instanceof Error?error.message:String(error);
  process.stderr.write(`textanalysis: ${message}\n`);
  if(error instanceof CliUsageError) process.stderr.write("Run textanalysis --help for usage.\n");
  process.exitCode=error instanceof CliUsageError?error.exitCode:1;
}
