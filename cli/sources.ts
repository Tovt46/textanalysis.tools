import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import type {Readable} from "node:stream";
import type {ParsedCliArgs} from "./arguments";
import {CliUsageError,stringOption} from "./arguments";

export type SourceSpec={
  sourceType:"text"|"url";
  source:string;
  label:string;
};

export class StdinReader{
  private cached?:Promise<string>;

  constructor(private readonly input:Readable,private readonly interactive:boolean){}

  available(){
    return !this.interactive;
  }

  read(){
    if(!this.cached){
      this.cached=(async()=>{
        const chunks:Buffer[]=[];
        for await(const chunk of this.input){
          chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk)));
        }
        return Buffer.concat(chunks).toString("utf8");
      })();
    }
    return this.cached;
  }
}

function isPublicUrl(value:string){
  return /^https?:\/\//i.test(value);
}

async function sourceFromToken(token:string,stdin:StdinReader):Promise<SourceSpec>{
  if(token==="-"){
    if(!stdin.available()) throw new CliUsageError("Standard input is interactive. Pipe text into the command or provide a file.");
    return {sourceType:"text",source:await stdin.read(),label:"stdin"};
  }
  if(isPublicUrl(token)){
    return {sourceType:"url",source:token,label:token};
  }
  const path=resolve(token);
  try{
    return {sourceType:"text",source:await readFile(path,"utf8"),label:path};
  }catch(error){
    const reason=error instanceof Error?error.message:String(error);
    throw new CliUsageError(`Cannot read input file "${token}": ${reason}`);
  }
}

function explicitSource(parsed:ParsedCliArgs,side?:"a"|"b"){
  const suffix=side?`-${side}`:"";
  const text=stringOption(parsed,`text${suffix}`);
  const url=stringOption(parsed,`url${suffix}`);
  if(text!==undefined&&url!==undefined){
    throw new CliUsageError(`Use only one of --text${suffix} or --url${suffix}.`);
  }
  if(text!==undefined) return {sourceType:"text" as const,source:text,label:side?`inline text ${side.toUpperCase()}`:"inline text"};
  if(url!==undefined) return {sourceType:"url" as const,source:url,label:url};
  return undefined;
}

export async function resolveSingleSource(parsed:ParsedCliArgs,stdin:StdinReader){
  const explicit=explicitSource(parsed);
  if(explicit&&parsed.positionals.length){
    throw new CliUsageError("Do not combine --text or --url with a positional input.");
  }
  if(parsed.positionals.length>1){
    throw new CliUsageError("This command accepts one file, URL, or stdin input.");
  }
  if(explicit) return explicit;
  if(parsed.positionals.length===1) return sourceFromToken(parsed.positionals[0],stdin);
  if(stdin.available()) return sourceFromToken("-",stdin);
  throw new CliUsageError("Provide a file, URL, --text, --url, or piped stdin.");
}

export async function resolvePairSources(parsed:ParsedCliArgs,stdin:StdinReader){
  const sources:Array<SourceSpec|undefined>=[explicitSource(parsed,"a"),explicitSource(parsed,"b")];
  const tokens=[...parsed.positionals];
  for(let index=0;index<sources.length;index+=1){
    if(!sources[index]&&tokens.length) sources[index]=await sourceFromToken(tokens.shift()!,stdin);
  }
  if(tokens.length) throw new CliUsageError("This command accepts exactly two inputs.");

  const missing=sources.flatMap((source,index)=>source?[]:[index]);
  if(missing.length===1&&stdin.available()){
    sources[missing[0]]=await sourceFromToken("-",stdin);
  }
  if(!sources[0]||!sources[1]){
    throw new CliUsageError("Provide two files or URLs, or use --text-a/--url-a and --text-b/--url-b.");
  }
  if(sources[0].label==="stdin"&&sources[1].label==="stdin"){
    throw new CliUsageError("Standard input can only be used for one side of a comparison.");
  }
  return [sources[0],sources[1]] as const;
}

export async function resolveCorpusSources(parsed:ParsedCliArgs,stdin:StdinReader){
  if(stringOption(parsed,"text")!==undefined||stringOption(parsed,"url")!==undefined){
    throw new CliUsageError("TF-IDF accepts 2–10 positional files or URLs. Use - for one stdin document.");
  }
  if(parsed.positionals.length<2||parsed.positionals.length>10){
    throw new CliUsageError("TF-IDF requires between 2 and 10 files or URLs.");
  }
  const sources=await Promise.all(parsed.positionals.map((token)=>sourceFromToken(token,stdin)));
  if(sources.filter((source)=>source.label==="stdin").length>1){
    throw new CliUsageError("Standard input can only represent one TF-IDF document.");
  }
  return sources;
}

