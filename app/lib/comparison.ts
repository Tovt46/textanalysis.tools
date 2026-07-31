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

function frequencyChanges(a:FrequencyCount[],b:FrequencyCount[],totalA:number,totalB:number){
  const terms=new Set([...a.map(row=>row.term),...b.map(row=>row.term)]);
  const aRows=new Map(a.map(row=>[row.term,row.count]));
  const bRows=new Map(b.map(row=>[row.term,row.count]));
  const rows=[...terms].map(term=>{
    const countA=aRows.get(term)||0;
    const countB=bRows.get(term)||0;
    const shareA=totalA?countA/totalA:0;
    const shareB=totalB?countB/totalB:0;
    return {term,countA,countB,countDelta:countB-countA,shareA,shareB,shareDelta:shareB-shareA};
  }).sort((x,y)=>Math.abs(y.shareDelta)-Math.abs(x.shareDelta)||x.term.localeCompare(y.term)).slice(0,1000);
  return {rows,totalRows:terms.size};
}

export function compareAnalysisResults(a:ComparisonInput,b:ComparisonInput){
  const words=frequencyChanges(a.unigrams,b.unigrams,a.result.tokenCount,b.result.tokenCount);
  const bigrams=frequencyChanges(a.bigrams,b.bigrams,Math.max(1,a.result.tokenCount-1),Math.max(1,b.result.tokenCount-1));
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
    truncated:words.rows.length<words.totalRows||bigrams.rows.length<bigrams.totalRows,
  };
}
