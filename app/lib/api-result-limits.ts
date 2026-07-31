import { PublicApiError } from "./public-api";

export const DEFAULT_RESULT_ROW_LIMIT=5_000;
export const MAX_RESULT_ROW_LIMIT=5_000;
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

export function limitRows<Row,Result extends RowsResult<Row>>(result:Result,limit:number){
  const totalRows=result.rows.length;
  const rows=result.rows.slice(0,limit);
  return {
    ...result,
    rows,
    totalRows,
    returnedRows:rows.length,
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

export function limitDensityRows<Result extends DensityResult>(result:Result,limit:number){
  const totalRows={
    trackedKeywords:result.trackedKeywords.length,
    unigrams:result.unigrams.length,
    bigrams:result.bigrams.length,
    trigrams:result.trigrams.length,
  };
  const unigrams=result.unigrams.slice(0,limit);
  const bigrams=result.bigrams.slice(0,limit);
  const trigrams=result.trigrams.slice(0,limit);
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
    truncated:unigrams.length<totalRows.unigrams||bigrams.length<totalRows.bigrams||trigrams.length<totalRows.trigrams,
  };
}

type IdfRow={term:string};
type IdfResult=Record<string,unknown>&{
  idfTable:IdfRow[];
};

export function limitIdfRows<Result extends IdfResult>(result:Result,limit:number){
  const totalIdfRows=result.idfTable.length;
  const idfTable=result.idfTable.slice(0,limit);
  return {
    ...result,
    idfTable,
    totalIdfRows,
    returnedIdfRows:idfTable.length,
    idfTableTruncated:idfTable.length<totalIdfRows,
  };
}
