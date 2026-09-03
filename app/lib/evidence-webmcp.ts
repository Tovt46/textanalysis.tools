import type {EvidenceWorkspaceState,WorkspaceReviewPlanRecommendation} from "./evidence-workspace";
import {WorkspaceError,workspaceSummary} from "./evidence-workspace";

type JsonSchema={
  type:"object";
  properties:Record<string,unknown>;
  required?:string[];
  additionalProperties:false;
};

export type WebMcpTool={
  name:string;
  description:string;
  inputSchema:JsonSchema;
  annotations?:{readOnlyHint?:boolean;destructiveHint?:boolean;idempotentHint?:boolean;openWorldHint?:boolean};
  execute:(input:Record<string,unknown>)=>Promise<unknown>|unknown;
};

export type EvidenceWorkspaceActions={
  create:(input:{originalText:string;currentText?:string;goal:string;focusTerms?:string[]})=>EvidenceWorkspaceState;
  analyze:()=>EvidenceWorkspaceState;
  submitReviewPlan:(input:{baseRevision:number;recommendations:WorkspaceReviewPlanRecommendation[]})=>EvidenceWorkspaceState;
  applyPatch:(input:{patchId:string;expectedRevision:number})=>EvidenceWorkspaceState;
  exportReport:(format:"markdown"|"json")=>{format:string;filename:string;content:string};
};

export const EVIDENCE_WEBMCP_TOOL_NAMES=[
  "create_analysis_workspace",
  "analyze_workspace",
  "submit_review_plan",
  "apply_approved_patch",
  "export_analysis_report",
] as const;

function text(description:string,maxLength:number){return{type:"string",description,minLength:1,maxLength};}
function strings(description:string,maxItems:number){return{type:"array",description,items:{type:"string"},minItems:1,maxItems,uniqueItems:true};}
function success(state:EvidenceWorkspaceState,extra:Record<string,unknown>={}){return{ok:true,...workspaceSummary(state),...extra};}
function failure(error:unknown){
  if(error instanceof WorkspaceError||(error instanceof Error&&"code" in error&&typeof error.code==="string"))return{ok:false,error:{code:error.code,message:error.message}};
  return{ok:false,error:{code:"UNEXPECTED_ERROR",message:error instanceof Error?error.message:"Unexpected workspace error."}};
}
function safe<T extends Record<string,unknown>>(handler:(input:T)=>unknown){return async(input:Record<string,unknown>)=>{try{return await handler(input as T);}catch(error){return failure(error);}};}

export function createEvidenceWorkspaceTools(actions:EvidenceWorkspaceActions):WebMcpTool[]{
  return[
    {
      name:"create_analysis_workspace",
      description:"Create or replace the visible evidence workspace from an original text, an optional current version, a review goal, and focus terms. This resets previous findings and patches on the page.",
      inputSchema:{type:"object",properties:{originalText:text("Immutable baseline text to review.",100_000),currentText:{type:"string",description:"Optional current version to compare with the baseline.",maxLength:100_000},goal:text("Concrete review goal for the human and agent.",500),focusTerms:{type:"array",description:"Optional exact words or phrases to measure.",items:{type:"string",maxLength:120},maxItems:20,uniqueItems:true}},required:["originalText","goal"],additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},
      execute:safe<{originalText:string;currentText?:string;goal:string;focusTerms?:string[]}>(input=>success(actions.create(input),{nextAction:"Run analyze_workspace before adding findings."})),
    },
    {
      name:"analyze_workspace",
      description:"Build a deterministic claim-aware version review for the current revision: exact block changes, commercial claim ledger, verification risks, prioritized review queue, repeated phrases, focus coverage, and stable evidence references.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
      execute:safe(()=>success(actions.analyze(),{nextAction:"Do not stop at diagnostics or duplicate cleanup. Submit one complete 3–5 item plan with submit_review_plan: include a structural or clarity improvement, include a trust or verification improvement when claim risks exist, and use at most one cleanup item."})),
    },
    {
      name:"submit_review_plan",
      description:"Submit one complete human-review plan containing 3 to 5 evidence-linked exact-text proposals. The plan must prioritize substantive structure, clarity, trust, or verification work; at most one item may be simple cleanup. Every diff remains unapplied until the person reviews it in the page.",
      inputSchema:{type:"object",properties:{baseRevision:{type:"integer",description:"Current workspace revision returned by analyze_workspace.",minimum:1},recommendations:{type:"array",description:"A diverse, decision-ready set of 3 to 5 recommendations. Do not submit a plan made mostly of duplicate removal.",minItems:3,maxItems:5,items:{type:"object",properties:{kind:{type:"string",enum:["structure","clarity","trust","verification","cleanup"],description:"The decision value of this recommendation."},title:text("Outcome-focused recommendation title.",160),explanation:text("Why this matters for the review goal and cited evidence.",1_500),evidenceRefs:strings("Current evidence ids from analyze_workspace.",20),expectedText:text("One unique exact span from the current revision.",10_000),replacementText:{type:"string",description:"The proposed replacement. May be empty for deletion.",maxLength:10_000},rationale:text("Why this exact before/after change resolves the finding without inventing facts.",1_000)},required:["kind","title","explanation","evidenceRefs","expectedText","replacementText","rationale"],additionalProperties:false}}},required:["baseRevision","recommendations"],additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},
      execute:safe<{baseRevision:number;recommendations:WorkspaceReviewPlanRecommendation[]}>(input=>{
        const state=actions.submitReviewPlan(input);
        const submittedPlan=state.patches.filter(item=>item.baseRevision===input.baseRevision&&item.recommendationKind).slice(-input.recommendations.length);
        return success(state,{submittedPlan,nextAction:"Stop and ask the human reviewer to approve or reject each visible proposal. There is intentionally no approval tool."});
      }),
    },
    {
      name:"apply_approved_patch",
      description:"Apply a patch only after the page records explicit human approval. Exact revision and source-span checks prevent stale or ambiguous edits; all other pending patches become stale.",
      inputSchema:{type:"object",properties:{patchId:text("Approved patch id shown in the workspace.",200),expectedRevision:{type:"integer",description:"Revision the approved patch targets.",minimum:1}},required:["patchId","expectedRevision"],additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},
      execute:safe<{patchId:string;expectedRevision:number}>(input=>success(actions.applyPatch(input),{nextAction:"Run analyze_workspace again to measure the new revision before exporting."})),
    },
    {
      name:"export_analysis_report",
      description:"Prepare a Markdown or JSON evidence report for the current analyzed revision, including baseline/current metrics, cited findings, and patch decisions.",
      inputSchema:{type:"object",properties:{format:{type:"string",description:"Report format.",enum:["markdown","json"]}},required:["format"],additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
      execute:safe<{format:"markdown"|"json"}>(input=>{
        if(input.format!=="markdown"&&input.format!=="json")throw new WorkspaceError("INVALID_FORMAT","Format must be markdown or json.");
        const report=actions.exportReport(input.format);
        return{ok:true,format:report.format,filename:report.filename,content:report.content};
      }),
    },
  ];
}

type ModelContext={registerTool:(tool:WebMcpTool)=>void|Promise<void>};

export async function registerEvidenceWorkspaceTools(modelContext:ModelContext,actions:EvidenceWorkspaceActions){
  const tools=createEvidenceWorkspaceTools(actions);
  for(const tool of tools)await modelContext.registerTool(tool);
  return tools.map(tool=>tool.name);
}
