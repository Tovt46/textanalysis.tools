export const COMMANDS=[
  "analyze",
  "frequency",
  "density",
  "compare",
  "ngram",
  "bow",
  "tfidf",
  "similarity",
] as const;

export type CliCommand=typeof COMMANDS[number];
export type CliOptionValue=string|boolean;

export class CliUsageError extends Error{
  exitCode=2;
}

export type ParsedCliArgs={
  command?:CliCommand;
  positionals:string[];
  options:Record<string,CliOptionValue>;
};

const COMMAND_ALIASES:Record<string,CliCommand>={
  analyze:"analyze",
  frequency:"frequency",
  "word-frequency":"frequency",
  density:"density",
  "keyword-density":"density",
  compare:"compare",
  ngram:"ngram",
  "ngram-analyzer":"ngram",
  bow:"bow",
  "bag-of-words":"bow",
  tfidf:"tfidf",
  "tf-idf":"tfidf",
  similarity:"similarity",
  "text-similarity":"similarity",
};

const BOOLEAN_OPTIONS=new Set([
  "help",
  "version",
  "keep-stopwords",
]);

const VALUE_OPTIONS=new Set([
  "language",
  "format",
  "output",
  "top",
  "focus",
  "tolerance",
  "keywords",
  "size",
  "method",
  "text",
  "url",
  "text-a",
  "text-b",
  "url-a",
  "url-b",
  "stopwords",
  "min-count",
]);

const SHORT_OPTIONS:Record<string,string>={
  "-h":"help",
  "-V":"version",
  "-l":"language",
  "-f":"format",
  "-o":"output",
};

function setOption(options:Record<string,CliOptionValue>,name:string,value:CliOptionValue){
  if(options[name]!==undefined) throw new CliUsageError(`Option --${name} may only be provided once.`);
  options[name]=value;
}

function parseBoolean(name:string,value:string|undefined){
  if(value===undefined||value==="true") return true;
  if(value==="false") return false;
  throw new CliUsageError(`Option --${name} accepts only true or false.`);
}

export function parseCliArgs(rawArgs:string[]):ParsedCliArgs{
  const args=[...rawArgs];
  let command:CliCommand|undefined;

  if(args[0]&&!args[0].startsWith("-")){
    const rawCommand=args.shift()!;
    command=COMMAND_ALIASES[rawCommand];
    if(!command){
      throw new CliUsageError(`Unknown command "${rawCommand}". Run textanalysis --help to list commands.`);
    }
  }

  const options:Record<string,CliOptionValue>={};
  const positionals:string[]=[];
  let positionalOnly=false;

  for(let index=0;index<args.length;index+=1){
    const argument=args[index];
    if(positionalOnly){
      positionals.push(argument);
      continue;
    }
    if(argument==="--"){
      positionalOnly=true;
      continue;
    }
    if(!argument.startsWith("-")||argument==="-"){
      positionals.push(argument);
      continue;
    }

    const shortName=SHORT_OPTIONS[argument];
    if(shortName){
      if(BOOLEAN_OPTIONS.has(shortName)){
        setOption(options,shortName,true);
      }else{
        const value=args[index+1];
        if(value===undefined) throw new CliUsageError(`Option ${argument} requires a value.`);
        index+=1;
        setOption(options,shortName,value);
      }
      continue;
    }

    if(!argument.startsWith("--")){
      throw new CliUsageError(`Unknown option "${argument}".`);
    }

    const separator=argument.indexOf("=");
    const name=argument.slice(2,separator===-1?undefined:separator);
    const inlineValue=separator===-1?undefined:argument.slice(separator+1);
    if(BOOLEAN_OPTIONS.has(name)){
      setOption(options,name,parseBoolean(name,inlineValue));
      continue;
    }
    if(!VALUE_OPTIONS.has(name)){
      throw new CliUsageError(`Unknown option "--${name}".`);
    }
    const value=inlineValue??args[index+1];
    if(value===undefined) throw new CliUsageError(`Option --${name} requires a value.`);
    if(inlineValue===undefined) index+=1;
    setOption(options,name,value);
  }

  return {command,positionals,options};
}

export function stringOption(parsed:ParsedCliArgs,name:string){
  const value=parsed.options[name];
  return typeof value==="string"?value:undefined;
}

export function booleanOption(parsed:ParsedCliArgs,name:string){
  return parsed.options[name]===true;
}

