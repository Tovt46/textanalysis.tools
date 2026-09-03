# Text Analysis Evidence Workspace

Challenge build notes for the OpenAI WebMCP Challenge. This document describes
the local implementation. It does not claim that the current branch has been
committed, pushed, deployed, recorded, or submitted.

## Product idea

Text Analysis Evidence Workspace is a claim-aware review surface for a person
and an agent. The agent supplies interpretation; textanalysis.tools maps exact
content changes, extracts commercial claim patterns, prioritizes verification
risks, preserves revisioned state and exact diffs, and enforces human approval.

The end-to-end workflow is:

1. Create a workspace with an immutable baseline, optional current version,
   review goal, and focus terms.
2. Analyze the current revision and baseline into an exact block-change map,
   commercial claim ledger, and prioritized review queue.
3. Require the agent to submit one complete 3–5 item review plan. Every item
   cites stable evidence and includes a unique exact before/after diff.
4. Keep simple cleanup to at most one item; prioritize structure, clarity,
   trust, and verification decisions.
5. Ask the person to approve or reject the visible diff. Approval is never
   exposed to the agent as a tool.
6. Apply an approved patch with exact-span and revision checks.
7. Analyze the new revision and export a Markdown or JSON before/after report.

## What is substantially new

The existing product exposes individual analyzers through web forms, HTTP,
CLI, and a read-only stdio MCP server. The challenge workspace adds a stateful,
page-bound collaboration model rather than wrapping those existing endpoints:

- five WebMCP tools compose a complete review workflow;
- one atomic `submit_review_plan` action prevents the agent from stopping after
  diagnostics or filling the result with trivial duplicate removals;
- one analysis call returns a decision brief instead of making the agent infer
  meaning from a wall of raw counts;
- the claim ledger separates prices, offers, ratings, advisor counts,
  availability, channels, guarantees, accuracy language, privacy, refunds, and
  social proof across baseline/current versions;
- deterministic review items flag exact duplicates, claim drift, missing
  categories, verification-sensitive claims, and promotion/trust imbalance;
- analysis outputs become addressable evidence references;
- findings must cite current deterministic evidence;
- patches must cite current findings and a unique exact source span;
- the visible UI, tool calls, and browser session share the same revisioned
  state;
- only the human UI can record approval;
- applying a patch invalidates the previous analysis and makes other pending
  patches stale;
- the exported report preserves metrics, findings, and patch decisions.

## Minimal WebMCP contract

| Tool | Role | Important boundary |
| --- | --- | --- |
| `create_analysis_workspace` | Start or replace the visible case | Resets old findings and patches |
| `analyze_workspace` | Build change map, claim ledger, review queue, and raw evidence | Read-only and deterministic; flags review needs rather than judging truth |
| `submit_review_plan` | Add 3–5 evidence-linked findings and exact diffs | Requires substantive variety; does not modify text |
| `apply_approved_patch` | Apply a reviewed change | Fails without human approval or on stale revision |
| `export_analysis_report` | Return Markdown or JSON evidence trail | Requires a current analysis |

There is intentionally no `approve_patch` tool. Focus terms are part of
workspace creation, and before/after comparison is part of analysis, keeping
the contract small and coherent.

## Architecture and privacy

- Route: `/tools/evidence-workspace`
- WebMCP registration: client-side feature detection for
  `document.modelContext.registerTool`
- Fallback: the same workflow is available with ordinary form controls
- Analysis: existing in-repository deterministic functions
- State: browser `sessionStorage`, versioned as workspace schema 2
- Persistence: no database, user account, or server-side document storage
- AI: the ChatGPT agent provides reasoning; the app does not call the OpenAI API
- Input limit: 100,000 characters per baseline/current text

## Local verification

Install dependencies and run:

```bash
npm run lint
npm test
npm run test:browser
```

The browser test injects a small `document.modelContext` test double, verifies
that exactly five tools register, submits a three-item review plan, and confirms
that the agent cannot apply a proposal until a person clicks the visible approval
button.

## Demo script target (under three minutes)

1. Open the public workspace and point out the WebMCP-ready indicator.
2. Paste two commercial page versions and ask ChatGPT to compare claim drift.
3. Show the version map, claim ledger, and prioritized verification queue.
4. Let ChatGPT submit three meaningful diffs: structure, clarity, and trust or
   verification. Keep duplicate cleanup secondary.
5. Show that every patch remains proposed and that the agent has no approval
   tool.
6. Click **Approve patch** as the human reviewer.
7. Let ChatGPT apply the approved patch and re-run analysis.
8. Show revision 2, the before/after delta, and export the Markdown report.

## Submission checkpoints

- [ ] Product name and scope approved by the project owner
- [ ] Local unit, build, rendered, and browser checks pass
- [ ] Commit and push explicitly authorized, then public repository updated
- [ ] Production deployment explicitly authorized, then public URL verified in
      the ChatGPT in-app browser
- [ ] README and this challenge changelog match the deployed revision
- [ ] Public YouTube demo with audio is shorter than three minutes
- [ ] Devpost eligibility, legal declarations, project copy, links, and final
      submission completed by the project owner

Challenge deadline supplied for planning: September 3, 2026 at 1:00 PM PT.
