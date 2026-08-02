import type { NextConfig } from "next";
import {execFileSync} from "node:child_process";

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
  env:{
    TEXTANALYSIS_BUILD_REVISION:deploymentRevision(),
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
