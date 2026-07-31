import { createRemoteFetchBudget,MAX_REMOTE_REQUESTS_PER_SOURCE,PublicApiError,type RemoteFetchContext } from "./public-api";

export const MAX_COMPOUND_TEXT_CHARS=2_000_000;
export const MAX_COMPOUND_REMOTE_BYTES=5_000_000;
export const MAX_COMPOUND_REMOTE_CONCURRENCY=3;
export const MAX_COMPOUND_ANALYSIS_TOKENS=250_000;

function objectValue(value:unknown):Record<string,unknown>|null{
  return value!==null&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>
    :null;
}

export function createCompoundFetchContext(entries:readonly unknown[]):RemoteFetchContext{
  let textCharacters=0;
  let remoteSources=0;
  for(const entry of entries){
    const source=objectValue(entry);
    if(!source)continue;
    if(source.sourceType==="url"){
      remoteSources+=1;
      continue;
    }
    if(typeof source.source==="string")textCharacters+=source.source.length;
  }
  if(textCharacters>MAX_COMPOUND_TEXT_CHARS){
    throw new PublicApiError(
      413,
      "COMPOUND_INPUT_TOO_LARGE",
      `Combined text input is limited to ${MAX_COMPOUND_TEXT_CHARS.toLocaleString("en-US")} characters.`,
    );
  }
  let analysisTokens=0;
  return {
    budget:createRemoteFetchBudget({
      maxRequests:Math.max(1,remoteSources*MAX_REMOTE_REQUESTS_PER_SOURCE),
      maxBytes:MAX_COMPOUND_REMOTE_BYTES,
      maxConcurrent:MAX_COMPOUND_REMOTE_CONCURRENCY,
    }),
    consumeAnalysisTokens(tokens){
      analysisTokens+=tokens;
      if(analysisTokens>MAX_COMPOUND_ANALYSIS_TOKENS){
        throw new PublicApiError(
          413,
          "COMPOUND_INPUT_TOO_LARGE",
          `Combined inputs are limited to ${MAX_COMPOUND_ANALYSIS_TOKENS.toLocaleString("en-US")} analyzable words.`,
        );
      }
    },
  };
}
