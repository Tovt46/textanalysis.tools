import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {basename} from 'node:path';
const repo=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const bundle=await build({entryPoints:[`${repo}/app/lib/text-contract.ts`],bundle:true,format:'esm',platform:'node',write:false});
const domain=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
await build({entryPoints:[`${repo}/app/lib/text-contract-ai.ts`],bundle:true,format:'esm',platform:'node',packages:'external',outfile:`${repo}/work/text-contract-recheck-ai.mjs`});
const agent=await import(`${repo}/work/text-contract-recheck-ai.mjs`);
const brief='Make the prose shorter. Preserve all numbers, percentages, links including fragment links, CTA attributes, HTML attributes, headings, and FAQ schema. Do not strengthen cautious claims.';
const fixtures=process.argv.slice(2).map(path=>[basename(path),path]);
if(!fixtures.length)throw new Error('Pass local HTML paths explicitly. Sources are read-only and never sent to a provider.');
const approved=(rules,source)=>({version:2,source,revision:1,approvedRevision:1,id:'audit',title:'Audit',brief,outputLanguage:'same',createdAt:new Date().toISOString(),approvedAt:new Date().toISOString(),rules});
const emptyCompiler=async()=>({model:'MOCK-no-semantic-claims',usage:{provider:'nebius',operation:'compile'},data:{title:'Audit',rules:[]}});
const report={scope:'Actual local PsychicBook HTML; no source changes, no external transmission. Compilation model stubbed; measurements cover deterministic rules only, not whole-agent recall.',texts:[],edgeCases:[]};
for(const [name,file] of fixtures){
 const path=file;
 const source=await readFile(path,'utf8');
 const local=domain.extractDeterministicContractRules(source,brief);
 const {contract}=await agent.compileTextContract({source,brief,outputLanguage:'same'},{structuredCall:emptyCompiler});
 const compiled=contract.rules.filter(r=>r.checkStrategy==='deterministic');
 const mutations=[];
 const add=(label,candidate)=>{if(candidate!==source)mutations.push({label,candidate});};
 for(const link of [...new Set([...source.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))]){
   add(`Replace href ${link}`,source.replaceAll(`href="${link}"`,'href="/audit-wrong-destination/"'));
 }
 add('Change offer 50% off to 75% off',source.replaceAll('50% off','75% off'));
 add('Change 10 free minutes to 20 free minutes',source.replaceAll('10 free minutes','20 free minutes'));
 add('Change 400+ advisors to 900+ advisors',source.replaceAll('>400+<','>900+<'));
 add('Remove FAQ microdata attributes',source.replace(/\s+(?:itemscope(?:="[^"]*")?|itemtype="[^"]*"|itemprop="[^"]*")/g,''));
 add('Remove JSON-LD script',source.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,''));
 add('Break JSON-LD syntax, retaining type names',source.replace(/(<script[^>]*type="application\/ld\+json"[^>]*>)/i,'$1INVALID_JSON'));
 add('Remove all closing h2 tags',source.replaceAll('</h2>',''));
 add('Remove CTA aria-label attributes',source.replace(/(<a\b[^>]*?)\s+aria-label="[^"]*"/g,'$1'));
 add('Remove first h2 element',source.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i,''));
 add('Rename 3-card to 4-card',source.replaceAll('3-card','4-card'));
 const evaluate=(rules,candidate)=>domain.evaluateDeterministicRules(approved(rules,source),candidate).filter(e=>e.status==='fail').map(e=>e.ruleId);
 const cases=mutations.map(({label,candidate})=>({label,rawFailedRules:evaluate(local,candidate),compiledFailedRules:evaluate(compiled,candidate)}));
 report.texts.push({name,path,chars:source.length,rawRuleCount:local.length,compiledDeterministicRuleCount:compiled.length,compiledRules:compiled.map(r=>({id:r.id,kind:r.kind,expected:r.expectedValue})),baselineFailures:evaluate(compiled,source),mutations:cases,rawDetected:cases.filter(c=>c.rawFailedRules.length).length,compiledDetected:cases.filter(c=>c.compiledFailedRules.length).length,totalMutations:cases.length});
}
for(const [label,source,candidate,task] of [
 ['Percentage boundary','Save 50% today.','Save 75% today.','Preserve all numbers and percentages.'],
 ['Price changes to larger number','The price is $5.99 per month.','The price is $5.999 per month.','Preserve the exact price.'],
 ['Price only remains in hidden comment','The price is $5.99 per month.','The price is $9.99 per month. <!-- old $5.99 -->','Preserve the exact price.'],
 ['Harmless price punctuation change','The price is $5.99.','The price is $5.99!','Preserve the exact price.'],
 ['Unchanged source with mixed forbidden/required quotes','We may help.','We may help.','Do not use “guaranteed”. Preserve “may help”.'],
 ['FAQ JSON invalid','<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Why?"}]}</script>','<script type="application/ld+json">INVALID {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Why?"}]}</script>','Preserve valid FAQ schema.'],
 ]){
 const rules=domain.extractDeterministicContractRules(source,task);
 report.edgeCases.push({label,rules:rules.map(r=>({id:r.id,expected:r.expectedValue,expectation:r.expectation})),evaluations:domain.evaluateDeterministicRules(approved(rules,source),candidate).map(e=>({ruleId:e.ruleId,status:e.status}))});
}
console.log(JSON.stringify(report,null,2));
if(report.texts.some(item=>item.baselineFailures.length||item.compiledDetected!==item.totalMutations))process.exitCode=1;
