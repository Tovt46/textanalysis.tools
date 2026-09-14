import * as z from "zod/v4";
import {MAX_TEXT_CONTRACT_RULES,TEXT_CONTRACT_VERSION,isApproved,sameContract} from "./text-contract";

export const languageSchema=z.enum(["same","en","ru","uk","es"]);
export const severitySchema=z.enum(["high","medium","low"]);
export const contractRuleSchema=z.object({
  id:z.string().min(1).max(80),kind:z.enum(["exact_text","numeric_value","url","html_structure","semantic_invariant","freshness_required"]),
  statement:z.string().trim().min(1).max(500),severity:severitySchema,required:z.boolean(),enabled:z.boolean(),sourceExcerpt:z.string().max(500),
  expectedValue:z.string().trim().min(1).max(500).optional(),expectation:z.enum(["preserve","forbid"]),checkStrategy:z.enum(["deterministic","nemotron","tavily"]),requiresLiveEvidence:z.boolean(),sourceOfTruthDomains:z.array(z.string().min(3).max(253)).max(5),
  group:z.enum(["numbers","links","ctas","attributes","headings","schema","markup","phrases"]).optional(),values:z.array(z.string().max(30_000)).max(15_000).optional(),
}).superRefine((rule,ctx)=>{
  if(rule.required&&!rule.enabled)ctx.addIssue({code:"custom",message:"Required guards cannot be disabled."});
  if(rule.group&&(rule.checkStrategy!=="deterministic"||!rule.required||!rule.values))ctx.addIssue({code:"custom",message:"Source guards must stay required and deterministic."});
  if(rule.checkStrategy==="deterministic"&&!rule.group&&!rule.expectedValue)ctx.addIssue({code:"custom",message:"An exact rule needs a value."});
  if(rule.requiresLiveEvidence!==(rule.checkStrategy==="tavily"))ctx.addIssue({code:"custom",message:"Live checks require Tavily."});
});
export const textContractSchema=z.object({
  version:z.literal(TEXT_CONTRACT_VERSION),id:z.string().min(1).max(120),title:z.string().min(1).max(160),source:z.string().min(1).max(30_000),brief:z.string().min(1).max(2_000).refine(value=>Boolean(value.trim())),outputLanguage:languageSchema,
  revision:z.number().int().positive(),rules:z.array(contractRuleSchema).min(1).max(MAX_TEXT_CONTRACT_RULES),createdAt:z.string().min(1).max(80),approvedAt:z.string().min(1).max(80).optional(),approvedRevision:z.number().int().positive().optional(),
}).superRefine((contract,ctx)=>{
  if(new Set(contract.rules.map(rule=>rule.id)).size!==contract.rules.length)ctx.addIssue({code:"custom",message:"Rule IDs must be unique."});
  if(contract.rules.filter(rule=>rule.enabled&&rule.requiresLiveEvidence).length>3)ctx.addIssue({code:"custom",message:"At most three live rules are allowed."});
});
const status=z.enum(["READY","NEEDS_REVIEW","BLOCKED"]);
export const modelUsageSchema=z.object({provider:z.enum(["nebius","tavily","human"]),model:z.string().max(300).optional(),operation:z.enum(["compile","generate","evaluate","search"]),promptTokens:z.number().nonnegative().optional(),completionTokens:z.number().nonnegative().optional(),totalTokens:z.number().nonnegative().optional(),credits:z.number().nonnegative().optional()});
const evidenceSchema=z.object({title:z.string().max(1000),url:z.url().refine(url=>/^https?:\/\//iu.test(url)),excerpt:z.string().max(2000),score:z.number(),publishedDate:z.string().optional()});
export const ruleEvaluationSchema=z.object({ruleId:z.string().min(1).max(80),status:z.enum(["pass","fail","uncertain"]),explanation:z.string().max(700),sourceExcerpt:z.string().max(500),candidateExcerpt:z.string().max(500),evidence:z.array(evidenceSchema).max(3),evaluator:z.enum(["deterministic","nemotron","tavily"])});
export const attemptSchema=z.object({id:z.string().min(1).max(120),number:z.number().int().positive(),kind:z.enum(["draft","repair","manual"]),content:z.string().min(1).max(30_000),createdAt:z.string().max(80),model:z.string().max(300),usage:modelUsageSchema,evaluations:z.array(ruleEvaluationSchema).max(20).optional(),finalStatus:status.optional(),evaluationError:z.string().max(1000).optional()});
export const agentRunSchema=z.object({contract:textContractSchema,attempts:z.array(attemptSchema).max(30),finalCandidate:z.string().max(30_000),finalStatus:status,evaluations:z.array(ruleEvaluationSchema).max(20),modelUsage:z.array(modelUsageSchema).max(150),acceptedAt:z.string().max(80).optional()});
export const storedWorkspaceSchema=z.object({source:z.string().max(30_000),brief:z.string().max(2_000),outputLanguage:languageSchema,domains:z.string().max(1500),contract:textContractSchema.nullable(),compileUsage:z.array(modelUsageSchema).max(10),run:agentRunSchema.nullable(),manualCandidate:z.string().max(30_000)}).superRefine((workspace,ctx)=>{
  const {contract,run}=workspace;
  if(contract&&(contract.source!==workspace.source||contract.brief!==workspace.brief||contract.outputLanguage!==workspace.outputLanguage))ctx.addIssue({code:"custom",message:"Stored source does not match its contract."});
  if(run&&(!contract||!isApproved(contract)||!sameContract(contract,run.contract)||run.attempts.at(-1)?.content!==run.finalCandidate))ctx.addIssue({code:"custom",message:"Stored run belongs to a different revision."});
});
export const compileResultSchema=z.object({contract:textContractSchema,usage:z.array(modelUsageSchema).max(10)});
export const generateResultSchema=z.object({attempt:attemptSchema,summary:z.string().max(500)});
export const evaluateResultSchema=z.object({evaluations:z.array(ruleEvaluationSchema).max(20),finalStatus:status,usage:z.array(modelUsageSchema).max(10)});
