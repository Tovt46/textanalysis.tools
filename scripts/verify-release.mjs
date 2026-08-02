import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

async function json(path){
  return JSON.parse(await readFile(new URL(path,import.meta.url),"utf8"));
}

const rootPackage=await json("../package.json");
const cliPackage=await json("../packages/cli/package.json");
const lockfile=await json("../package-lock.json");
const actionManifest=await readFile(new URL("../action.yml",import.meta.url),"utf8");
const explicitTagIndex=process.argv.indexOf("--tag");
const tag=explicitTagIndex===-1?process.env.GITHUB_REF_NAME:process.argv[explicitTagIndex+1];

assert.equal(rootPackage.version,cliPackage.version,"Root and npm package versions must match.");
assert.equal(lockfile.version,rootPackage.version,"package-lock root version must match package.json.");
assert.equal(lockfile.packages?.[""]?.version,rootPackage.version,"package-lock package version must match package.json.");
assert.equal(cliPackage.name,"textanalysis-tools");
assert.equal(cliPackage.private,undefined,"The npm package must remain publishable.");
assert.equal(cliPackage.repository?.url,"git+https://github.com/Tovt46/textanalysis.tools.git");
assert.equal(cliPackage.exports?.["."]?.import,"./dist/index.mjs","The public ESM export is missing.");
assert.equal(cliPackage.exports?.["."]?.types,"./index.d.ts","The public type declaration export is missing.");
assert.ok(cliPackage.files.includes("dist/textanalysis.mjs"),"The CLI bundle is missing from package files.");
assert.ok(cliPackage.files.includes("dist/index.mjs"),"The SDK bundle is missing from package files.");
assert.ok(cliPackage.files.includes("index.d.ts"),"Type declarations are missing from package files.");

const actionVersionBlock=actionManifest.match(/^  package-version:\s*$([\s\S]*?)(?=^  [\w-]+:\s*$|^runs:\s*$)/m)?.[1];
const actionVersion=actionVersionBlock?.match(/^    default:\s*["']?([^\s"'#]+)["']?\s*$/m)?.[1];
assert.equal(actionVersion,cliPackage.version,"GitHub Action package-version must match the npm package version.");
assert.match(actionManifest,/uses:\s*actions\/setup-node@v\d+/,"GitHub Action must install a supported Node.js runtime.");
const actionNodeVersion=actionManifest.match(/^        node-version:\s*["']?([^\s"']+)["']?\s*$/m)?.[1];
assert.equal(actionNodeVersion,"22.13.0","GitHub Action Node.js runtime must match the package engine floor.");

if(tag){
  assert.match(tag,/^v\d+\.\d+\.\d+$/,"Release tags must use a stable v<major>.<minor>.<patch> version; prereleases require a separate dist-tag workflow.");
  assert.equal(tag,`v${cliPackage.version}`,`Tag ${tag} does not match textanalysis-tools@${cliPackage.version}.`);
}

process.stdout.write(`Release contract is synchronized for textanalysis-tools@${cliPackage.version}${tag?` (${tag})`:""}.\n`);
