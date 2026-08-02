export type FrequencyCount={
  term:string;
  count:number;
};

export type ComparisonInput={
  result:{
    tokenCount:number;
    vocabularySize:number;
    fittedExponent:number;
    rSquared:number;
    zoneCounts:{above:number};
  };
  unigrams:FrequencyCount[];
  bigrams:FrequencyCount[];
};

function frequencyChanges(a:FrequencyCount[],b:FrequencyCount[],totalA:number,totalB:number,limit:number,offset:number){
  const terms=new Set([...a.map(row=>row.term),...b.map(row=>row.term)]);
  const aRows=new Map(a.map(row=>[row.term,row.count]));
  const bRows=new Map(b.map(row=>[row.term,row.count]));
  const rows=[...terms].map(term=>{
    const countA=aRows.get(term)||0;
    const countB=bRows.get(term)||0;
    const shareA=totalA?countA/totalA:0;
    const shareB=totalB?countB/totalB:0;
    return {term,countA,countB,countDelta:countB-countA,shareA,shareB,shareDelta:shareB-shareA};
  }).sort((x,y)=>Math.abs(y.shareDelta)-Math.abs(x.shareDelta)||x.term.localeCompare(y.term));
  const page=rows.slice(offset,offset+limit);
  return {rows:page,totalRows:terms.size,hasMore:offset+page.length<terms.size};
}

export function compareAnalysisResults(a:ComparisonInput,b:ComparisonInput,limit=1000,offset=0){
  const words=frequencyChanges(a.unigrams,b.unigrams,a.result.tokenCount,b.result.tokenCount,limit,offset);
  const bigrams=frequencyChanges(a.bigrams,b.bigrams,Math.max(1,a.result.tokenCount-1),Math.max(1,b.result.tokenCount-1),limit,offset);
  const hasMore=words.hasMore||bigrams.hasMore;
  return {
    metrics:{
      tokenCount:{a:a.result.tokenCount,b:b.result.tokenCount,delta:b.result.tokenCount-a.result.tokenCount},
      vocabularySize:{a:a.result.vocabularySize,b:b.result.vocabularySize,delta:b.result.vocabularySize-a.result.vocabularySize},
      fittedExponent:{a:a.result.fittedExponent,b:b.result.fittedExponent,delta:b.result.fittedExponent-a.result.fittedExponent},
      rSquared:{a:a.result.rSquared,b:b.result.rSquared,delta:b.result.rSquared-a.result.rSquared},
      aboveModel:{a:a.result.zoneCounts.above,b:b.result.zoneCounts.above,delta:b.result.zoneCounts.above-a.result.zoneCounts.above},
    },
    wordChanges:words.rows,
    bigramChanges:bigrams.rows,
    totalRows:{wordChanges:words.totalRows,bigramChanges:bigrams.totalRows},
    returnedRows:{wordChanges:words.rows.length,bigramChanges:bigrams.rows.length},
    offset,
    nextOffset:hasMore?offset+limit:null,
    hasMore,
    truncated:words.rows.length<words.totalRows||bigrams.rows.length<bigrams.totalRows,
  };
}
