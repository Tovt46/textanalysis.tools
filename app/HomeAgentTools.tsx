"use client";

import {useEffect} from "react";

// No document text is read or submitted: this homepage tool only lists entry points.
export default function HomeAgentTools(){
  useEffect(()=>{
    const context=document.modelContext??(navigator as Navigator&{modelContext?:Document["modelContext"]}).modelContext;
    if(!context)return;
    const tool={
      name:"discover_textanalysis_tools",
      description:"Find text analysis tools, API documentation, the hosted MCP server, and the human-reviewed Evidence Workspace.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      execute:async()=>({content:[{type:"text",text:JSON.stringify({tools:"https://textanalysis.tools/tools",api:"https://textanalysis.tools/openapi.json",mcp:"https://textanalysis.tools/mcp",workspace:"https://textanalysis.tools/tools/evidence-workspace"})}]}),
      annotations:{readOnlyHint:true},
    };
    try{
      Promise.resolve(context.registerTool(tool)).catch(()=>{/* Keep the normal homepage usable if registration is rejected. */});
    }catch{return;}
    return ()=>{(context as typeof context&{unregisterTool?:(name:string)=>void}).unregisterTool?.(tool.name);};
  },[]);
  return null;
}
