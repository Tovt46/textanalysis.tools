import {readFile,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const supportedVersion="16.4.3";
const original=`            const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);
            res.setHeader('Vary', varyHeader);`;
const patched=`            const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);
            // textanalysis.tools: preserve negotiated Vary fields (Next 16.4.3 compatibility fix).
            const existingVary = res.getHeader('Vary');
            const varyFields = new Map();
            for (const value of [...(Array.isArray(existingVary) ? existingVary : [existingVary ?? '']), varyHeader]) {
                for (const field of String(value).split(',')) {
                    const token = field.trim();
                    if (token && !varyFields.has(token.toLowerCase())) varyFields.set(token.toLowerCase(), token);
                }
            }
            res.setHeader('Vary', varyFields.has('*') ? '*' : [...varyFields.values()].join(', '));`;

// Next's page renderer overwrites headers set by proxy/config, including on ISR
// hits. Until upstream fixes https://github.com/vercel/next.js/pull/91039, apply
// the merge at its owning template before compilation. Never patch an unreviewed
// Next version or silently accept an unexpected template. Standard next start,
// static rendering, cache TTLs, and RSC Vary fields remain in use.
export function patchVaryTemplate(source){
  if(source.includes(patched))return source;
  if(source.split(original).length!==2)throw new Error("Next Vary template changed; review the compatibility fix before building.");
  return source.replace(original,patched);
}

async function patchNext(){
  const require=createRequire(import.meta.url);
  const root=dirname(require.resolve("next/package.json"));
  const manifest=JSON.parse(await readFile(join(root,"package.json"),"utf8"));
  if(manifest.version!==supportedVersion)throw new Error(`Review/remove the Next Vary compatibility fix before using Next ${manifest.version}; supported: ${supportedVersion}.`);
  const paths=["dist/build/templates/app-page-runtime.js","dist/esm/build/templates/app-page-runtime.js"];
  const updates=await Promise.all(paths.map(async path=>{
    const file=join(root,path);
    const source=await readFile(file,"utf8");
    return {file,source,updated:patchVaryTemplate(source)};
  }));
  for(const {file,source,updated} of updates)if(source!==updated)await writeFile(file,updated);
  console.log(`Next ${supportedVersion} Vary compatibility fix: ${updates.filter(file=>file.source!==file.updated).length} templates patched; both verified.`);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await patchNext();
