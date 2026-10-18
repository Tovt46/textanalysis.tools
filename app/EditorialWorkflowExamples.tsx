import type { ReactNode } from "react";
import Link from "next/link";
import fixture from "../public/examples/editorial-revision.json";

function percentage(count:number,total:number){
  return `${(count/total*100).toFixed(2)}%`;
}

function percentagePointChange(countA:number,totalA:number,countB:number,totalB:number){
  const change=(countB/totalB-countA/totalA)*100;
  return `${change>0?"+":""}${change.toFixed(2)} pp`;
}

type WebpageExtractionCopy={
  introduction:ReactNode;
  results:ReactNode;
  reproduction:ReactNode;
  decision:ReactNode;
  next:ReactNode;
};

export function WebpageExtractionExample({id="webpage-extraction-example",copy}:{id?:string;copy?:WebpageExtractionCopy}){
  return <section id={id} className="editorial-workflow-example">
    <p className="section-number">WORKED EXAMPLE · WEBPAGE EXTRACTION</p>
    <h2>Same article, different menu: why the extracted text matters</h2>
    <p>{copy?.introduction??<>The two downloadable pages contain the same article. Page B adds repeated navigation and footer labels. With <strong>English</strong> selected and <strong>Keep stop words</strong> enabled, analyzing the whole page produces different word counts even though the article has not changed.</>}</p>
    <div className="article-callout subtle"><b>The unchanged article</b><p>{fixture.webpageExample.articleText}</p></div>
    <div className="table-scroll">
      <table aria-label="Word frequency changes caused by navigation and footer text">
        <thead><tr><th scope="col">Extracted source</th><th scope="col">Words</th><th scope="col">revision count</th><th scope="col">revision share</th><th scope="col">contact count</th><th scope="col">contact share</th></tr></thead>
        <tbody>{fixture.webpageExample.expected.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.words}</td><td>{row.revision}</td><td>{percentage(row.revision,row.words)}</td><td>{row.contact}</td><td>{percentage(row.contact,row.words)}</td></tr>)}</tbody>
      </table>
    </div>
    <p>{copy?.results??<>“revision” still appears twice, but its share drops from 4.44% to 4.08% when the extra template words enter the denominator. “contact” rises from two to five occurrences. Selecting the main content gives the same 40-word input on both pages: “revision” is 5.00%, and “contact” is absent.</>}</p>
    <p>{copy?.reproduction??<>To reproduce this, use <Link href="/tools/word-frequency-counter">Word Frequency Counter</Link> with the example URLs below. Preview the extracted text, compare whole-page and main-content selection, then run the calculation. The preview should include the heading and article paragraph in main-content mode, without the navigation or footer.</>}</p>
    <ul>
      <li><a href="/examples/article-basic-navigation.html" download>Download page A HTML</a> · <a href="/examples/article-basic-navigation.html">Open page A</a></li>
      <li><a href="/examples/article-expanded-navigation.html" download>Download page B HTML</a> · <a href="/examples/article-expanded-navigation.html">Open page B</a></li>
    </ul>
    <div className="article-callout"><b>Editorial decision</b><p>{copy?.decision??<>When comparing article vocabulary, use the same extraction scope on both sources. When reviewing the full page, retain the template text deliberately. A cleaner extraction does not prove that the article is better or more likely to rank.</>}</p></div>
    <p>{copy?.next??<>For two-page work, <Link href="/tools/text-analysis-comparison">compare the extracted texts side by side</Link>. The web tools fetch URL content through the stateless server, then calculate from the reviewed text in your browser. The public analysis API keeps its existing whole-source behavior; it does not inherit your web preview selection.</>}</p>
  </section>;
}

export function EditorialRevisionExample({mode="comparison",id="editorial-revision-example"}:{mode?:"comparison"|"density";id?:string}){
  const {wordsA,wordsB,bigramWindowsA,bigramWindowsB,phrases}=fixture.expected;
  const denominatorA=mode==="density"?wordsA:bigramWindowsA;
  const denominatorB=mode==="density"?wordsB:bigramWindowsB;
  return <section id={id} className="editorial-workflow-example">
    <p className="section-number">WORKED EXAMPLE · REVISION REVIEW</p>
    <h2>A revision adds repetition and removes a useful phrase</h2>
    <p>Version B is only one word longer. Yet “content review” grows from one exact occurrence to four, while “source note” disappears. Paste these original example texts as A and B, select <strong>English</strong>, and enable <strong>Keep stop words</strong> to reproduce the counts.</p>
    <div className="example-docs"><p><b>A · Original · {wordsA} words</b>{fixture.original}</p><p><b>B · Revision · {wordsB} words</b>{fixture.revised}</p></div>
    <div className="table-scroll">
      <table aria-label={mode==="density"?"Exact phrase occurrence density before and after editing":"Bigram frequency changes before and after editing"}>
        <thead><tr><th scope="col">Exact phrase</th><th scope="col">A count</th><th scope="col">B count</th><th scope="col">A {mode==="density"?"density":"bigram share"}</th><th scope="col">B {mode==="density"?"density":"bigram share"}</th><th scope="col">Change</th></tr></thead>
        <tbody>{phrases.map(row=><tr key={row.term}><th scope="row">{row.term}</th><td>{row.countA}</td><td>{row.countB}</td><td>{percentage(row.countA,denominatorA)}</td><td>{percentage(row.countB,denominatorB)}</td><td>{percentagePointChange(row.countA,denominatorA,row.countB,denominatorB)}</td></tr>)}</tbody>
      </table>
    </div>
    {mode==="density"
      ?<p>These are occurrence densities: exact phrase count divided by all {wordsA} words in A or {wordsB} words in B. The checker does not multiply the count by the two words inside each phrase. A bigram frequency table uses a different denominator: the available two-word positions.</p>
      :<p>These are bigram shares. A has {bigramWindowsA} consecutive two-word positions; B has {bigramWindowsB}. The <Link href="/tools/keyword-density-checker">Keyword Density Checker</Link> instead divides each exact phrase count by the total words, giving “content review” occurrence densities of 2.50% and 9.76%. Both calculations are useful when their denominators stay explicit.</p>}
    <div className="article-callout"><b>What the editor checks next</b><p>Open the “content review” occurrences and read them in context: the revised sentences repeat a label where a direct subject could work. Then inspect the passages that contained “source note.” The missing phrase is a reason to check whether attribution was lost, not proof that the claim is false. Decide from the text and its sources, rather than aiming for a target percentage.</p></div>
    <p>{mode==="density"
      ?<>Use <Link href="/tools/keyword-density-checker">tracked phrases in Keyword Density Checker</Link> for “content review” and “source note,” or <Link href="/tools/text-analysis-comparison">compare the full A/B vocabulary</Link> to find other changes.</>
      :<>Use <Link href="/tools/text-analysis-comparison">Text Analysis Comparison</Link> to inspect changed words and bigrams, then open their source context. For a single version, <Link href="/tools/word-frequency-counter">Word Frequency Counter</Link> gives a simpler repetition table.</>}</p>
    <p><a href="/examples/editorial-revision.json" download>Download both texts, settings, and expected counts (JSON)</a>. The file is a readable fixture; copy its original and revised text values into the tools.</p>
  </section>;
}
