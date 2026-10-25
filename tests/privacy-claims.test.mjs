import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const output=await build({entryPoints:[new URL("../app/lib/privacy-claims.ts",import.meta.url).pathname],bundle:true,format:"esm",platform:"node",target:"node22",write:false});
const {isPrivacyClaim}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);

test("privacy topics and personality descriptions are not privacy claims",()=>{
  for(const text of [
    "Life Path 7 | Analysis & privacy",
    "People with this number value privacy and time alone.",
    "Privacy terms available",
    "Read our privacy policy.",
    "The history of privacy in philosophy.",
    "Personal details can inspire a character in a novel.",
    "A confidential source described the historical event.",
  ])assert.equal(isPrivacyClaim(text),false,text);
});

test("privacy commitments and explicit data practices remain detectable",()=>{
  for(const text of [
    "We protect your privacy.",
    "Protecting your privacy is our priority.",
    "Your privacy is guaranteed.",
    "Privacy protected.",
    "All readings are confidential.",
    "Your personal details remain strictly confidential.",
    "Your data is kept secure.",
    "Our secure sessions are available around the clock.",
    "We never share your personal information.",
    "We do not sell your data.",
    "We may disclose personal information.",
    "Your data is not encrypted.",
    "We guarantee complete privacy.",
    "We keep your information confidential.",
    "Your personal information is never shared.",
    "All sessions are 100% confidential.",
  ])assert.equal(isPrivacyClaim(text),true,text);
});
