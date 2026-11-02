import type { NextConfig } from "next";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

const varyPatchFingerprint=createHash("sha256").update(readFileSync("scripts/patch-next-vary.mjs")).digest("hex");

function deploymentRevision(){
  const configured=process.env.TEXTANALYSIS_BUILD_REVISION?.trim()||process.env.GITHUB_SHA?.trim();
  if(configured&&/^[0-9a-f]{7,64}$/i.test(configured))return configured.toLowerCase();
  try{
    const revision=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
    return /^[0-9a-f]{7,64}$/i.test(revision)?revision.toLowerCase():"unknown";
  }catch{return "unknown";}
}

const nextConfig: NextConfig = {
  expireTime: 300,
  webpack(config){
    // Next excludes its own files from webpack cache dependencies. A template
    // compatibility fix must therefore participate in the cache version.
    if(config.cache&&typeof config.cache==="object"){
      config.cache.version=`${config.cache.version??""}|vary:${varyPatchFingerprint}`;
    }
    return config;
  },
  redirects(){
    return [{
      source:"/:path*",
      has:[{type:"host",value:"www\\.textanalysis\\.tools"}],
      destination:"https://textanalysis.tools/:path*",
      permanent:true,
    }];
  },
  env:{
    TEXTANALYSIS_BUILD_REVISION:deploymentRevision(),
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
