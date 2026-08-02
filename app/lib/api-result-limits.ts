import { PublicApiError } from "./public-api";

export const DEFAULT_RESULT_ROW_LIMIT=5_000;
export const MAX_RESULT_ROW_LIMIT=5_000;
export const MAX_RESULT_ROW_OFFSET=250_000;
export const DEFAULT_DENSITY_ROW_LIMIT=2_000;

type RowsResult<Row>=Record<string,unknown>&{
  rows:Row[];
};

export function parseResultRowLimit(
  value:unknown,
  fallback=DEFAULT_RESULT_ROW_LIMIT,
  maximum=MAX_RESULT_ROW_LIMIT,
){
  if(value===undefined||value===null||value==="") return fallback;
  const limit=Number(value);
  if(!Number.isInteger(limit)||limit<1||limit>maximum){
    throw new PublicApiError(400,"INVALID_ARGUMENT",`limit must be an integer between 1 and ${maximum}.`);
  }
  return limit;
}

export function parseResultRowOffset(value:unknown,maximum=MAX_RESULT_ROW_OFFSET){
  if(value===undefined||value===null||value==="")return 0;
  const offset=Number(value);
  if(!Number.isInteger(offset)||offset<0||offset>maximum){
    throw new PublicApiError(400,"INVALID_ARGUMENT",`offset must be an integer between 0 and ${maximum}.`);
  }
  return offset;
}

export function limitRows<Row,Result extends RowsResult<Row>>(result:Result,limit:number,offset=0){
  const totalRows=result.rows.length;
  const rows=result.rows.slice(offset,offset+limit);
  const nextOffset=offset+rows.length<totalRows?offset+rows.length:null;
  return {
    ...result,
    rows,
    totalRows,
    returnedRows:rows.length,
    offset,
    nextOffset,
    hasMore:nextOffset!==null,
    truncated:rows.length<totalRows,
  };
}

type DensityTable={term:string;count:number};
type DensityResult=Record<string,unknown>&{
  trackedKeywords:DensityTable[];
  unigrams:DensityTable[];
  bigrams:DensityTable[];
  trigrams:DensityTable[];
};

export function limitDensityRows<Result extends DensityResult>(result:Result,limit:number,offset=0){
  const totalRows={
    trackedKeywords:result.trackedKeywords.length,
    unigrams:result.unigrams.length,
    bigrams:result.bigrams.length,
    trigrams:result.trigrams.length,
  };
  const unigrams=result.unigrams.slice(offset,offset+limit);
  const bigrams=result.bigrams.slice(offset,offset+limit);
  const trigrams=result.trigrams.slice(offset,offset+limit);
  const nextOffset=offset+Math.max(unigrams.length,bigrams.length,trigrams.length)<Math.max(totalRows.unigrams,totalRows.bigrams,totalRows.trigrams)
    ?offset+limit
    :null;
  return {
    ...result,
    unigrams,
    bigrams,
    trigrams,
    totalRows,
    returnedRows:{
      trackedKeywords:result.trackedKeywords.length,
      unigrams:unigrams.length,
      bigrams:bigrams.length,
      trigrams:trigrams.length,
    },
    offset,
    nextOffset,
    hasMore:nextOffset!==null,
    truncated:unigrams.length<totalRows.unigrams||bigrams.length<totalRows.bigrams||trigrams.length<totalRows.trigrams,
  };
}

type IdfRow={term:string};
type IdfResult=Record<string,unknown>&{
  idfTable:IdfRow[];
};

export function limitIdfRows<Result extends IdfResult>(result:Result,limit:number,offset=0){
  const totalIdfRows=result.idfTable.length;
  const idfTable=result.idfTable.slice(offset,offset+limit);
  const nextIdfOffset=offset+idfTable.length<totalIdfRows?offset+idfTable.length:null;
  return {
    ...result,
    idfTable,
    totalIdfRows,
    returnedIdfRows:idfTable.length,
    idfOffset:offset,
    nextIdfOffset,
    hasMoreIdfRows:nextIdfOffset!==null,
    idfTableTruncated:idfTable.length<totalIdfRows,
  };
}
