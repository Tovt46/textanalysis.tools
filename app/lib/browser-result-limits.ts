export const BROWSER_ROW_LIMIT=5_000;
export const BROWSER_DENSITY_ROW_LIMIT=2_000;
export const BROWSER_COMPARISON_ROW_LIMIT=1_000;
export const BROWSER_IDF_ROW_LIMIT=5_000;

type RowsResult<Row>=Record<string,unknown>&{rows:Row[]};

export function capBrowserRows<Row,Result extends RowsResult<Row>>(result:Result,limit=BROWSER_ROW_LIMIT){
  const totalRows=result.rows.length;
  const rows=result.rows.slice(0,limit);
  const nextOffset=rows.length<totalRows?rows.length:null;
  return {
    ...result,
    rows,
    totalRows,
    returnedRows:rows.length,
    offset:0,
    nextOffset,
    hasMore:nextOffset!==null,
    truncated:rows.length<totalRows,
  };
}

type DensityResult=Record<string,unknown>&{
  trackedKeywords:unknown[];
  unigrams:unknown[];
  bigrams:unknown[];
  trigrams:unknown[];
};

export function capBrowserDensity<Result extends DensityResult>(result:Result,limit=BROWSER_DENSITY_ROW_LIMIT){
  const totalRows={
    trackedKeywords:result.trackedKeywords.length,
    unigrams:result.unigrams.length,
    bigrams:result.bigrams.length,
    trigrams:result.trigrams.length,
  };
  const unigrams=result.unigrams.slice(0,limit);
  const bigrams=result.bigrams.slice(0,limit);
  const trigrams=result.trigrams.slice(0,limit);
  const longest=Math.max(totalRows.unigrams,totalRows.bigrams,totalRows.trigrams);
  const nextOffset=limit<longest?limit:null;
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
    offset:0,
    nextOffset,
    hasMore:nextOffset!==null,
    truncated:unigrams.length<totalRows.unigrams||bigrams.length<totalRows.bigrams||trigrams.length<totalRows.trigrams,
  };
}

type IdfResult=Record<string,unknown>&{idfTable:unknown[]};

export function capBrowserIdf<Result extends IdfResult>(result:Result,limit=BROWSER_IDF_ROW_LIMIT){
  const totalIdfRows=result.idfTable.length;
  const idfTable=result.idfTable.slice(0,limit);
  const nextIdfOffset=idfTable.length<totalIdfRows?idfTable.length:null;
  return {
    ...result,
    idfTable,
    totalIdfRows,
    returnedIdfRows:idfTable.length,
    idfOffset:0,
    nextIdfOffset,
    hasMoreIdfRows:nextIdfOffset!==null,
    idfTableTruncated:idfTable.length<totalIdfRows,
  };
}

function record(value:unknown):Record<string,unknown>|null{
  return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

export function hasPartialBrowserResult(value:unknown){
  const result=record(value);
  if(!result)return false;
  if(result.truncated===true||result.hasMore===true||result.idfTableTruncated===true||result.hasMoreIdfRows===true)return true;
  const comparison=record(result.comparison);
  return comparison?.truncated===true||comparison?.hasMore===true;
}
