# WebMCP Challenge submission kit

This file is drafting material. Replace every bracketed placeholder and verify
the public links before submitting.

## Project

**Name:** Text Analysis Evidence Workspace

**Tagline:** Turn a text comparison into an evidence-linked review plan where
the agent proposes and the person decides.

**Repository:** https://github.com/Tovt46/textanalysis.tools

**Live app:** https://textanalysis.tools/tools/evidence-workspace

**Demo video:** [PUBLIC YOUTUBE URL]

## Short description

Text Analysis Evidence Workspace is a browser-local collaboration surface for
reviewing two document versions with ChatGPT. The page deterministically maps
rewritten blocks and commercial claim drift, then requires the agent to submit
one complete review plan with three to five exact before/after proposals. Each
proposal cites current evidence and remains unapplied until the person approves
it in the visible interface.

## What it does

A person pastes a baseline, an optional current version, and a review goal.
ChatGPT uses five page-bound WebMCP tools to create the workspace, analyze the
revision, submit a diverse review plan, apply only human-approved edits, and
export the evidence trail.

The deterministic layer identifies exact block additions and removals, offer
and price changes, rating and advisor-count drift, missing guarantees or refund
language, verification-sensitive claims, and promotion-versus-trust imbalance.
The agent must convert those signals into three to five exact diffs. The
contract allows at most one cleanup recommendation, so the agent cannot stop at
counts or fill the result with duplicate removal.

## Why WebMCP matters

This is not a set of wrappers around existing analysis endpoints. WebMCP binds
the agent to the same visible, revisioned state as the person:

- `create_analysis_workspace` starts the shared case;
- `analyze_workspace` returns deterministic evidence and an explicit next task;
- `submit_review_plan` atomically validates a complete 3–5 item plan;
- `apply_approved_patch` fails unless the corresponding visible diff was
  approved by the person and still targets the current revision;
- `export_analysis_report` preserves the evidence, findings, diffs, and
  decisions.

Approval is intentionally absent from the tool contract. If a patch is not
approved in the page, application returns `HUMAN_APPROVAL_REQUIRED`. Applying
one patch creates a new revision, invalidates the previous analysis, and makes
other pending proposals stale.

## How it was built

- Next.js and React
- client-side `document.modelContext.registerTool` feature detection
- existing deterministic textanalysis.tools analysis modules
- browser `sessionStorage` for versioned workspace state
- exact-span and revision checks for patch safety
- normal page controls as a no-WebMCP fallback
- no server-side OpenAI API call, account, database, or document storage

## Accomplishments

- A single coherent human-agent workflow rather than isolated tools
- A contract that rejects shallow, cleanup-only agent output
- Exact evidence references connecting measurements, interpretations, and diffs
- Human-only approval that was verified in both domain and browser tests
- A real two-version test that produced structural, clarity, and trust proposals
  while leaving the source unchanged

## Challenges and lessons

The first implementation was technically safe but not useful enough: its most
visible recommendations were duplicate removals. The final workflow separates
deterministic evidence from agent judgment and requires a complete,
substantively varied review plan. Safety alone was not the product; the product
is useful judgment with inspectable evidence and retained human control.

## What is next

- source attachments for independently verifying volatile commercial claims
- semantic block alignment in addition to exact block matching
- collaborative saved workspaces without weakening the local-first mode
- batch application of multiple non-overlapping, individually approved patches

## Video script — target 2:25

### 0:00–0:15 — Problem

**Screen:** Open the public Evidence Workspace and show the WebMCP-ready badge.

**Narration:** “A normal text comparison gives you counts and leaves the real
editorial work to you. Evidence Workspace lets ChatGPT turn measured changes
into a review plan, while the person keeps control of every edit.”

### 0:15–0:35 — Shared case

**Screen:** Show the baseline, current version, and review goal. Ask ChatGPT:
“Analyze this workspace and submit a complete review plan. Do not apply edits.”

**Narration:** “Both versions stay in this browser. The agent works through
page-bound WebMCP tools; there is no server-side OpenAI call or document
database.”

### 0:35–1:00 — Deterministic evidence

**Screen:** Show the word delta, claim ledger, missing guarantees, changed
offers and prices, then briefly reveal the collapsed cleanup section.

**Narration:** “The page deterministically maps rewritten blocks and extracts
commercial claim patterns. It flags what changed or needs verification; it does
not pretend those claims are true or false.”

### 1:00–1:35 — Agent value

**Screen:** ChatGPT calls `submit_review_plan`; show the 3/3 badge and the three
visible structure, clarity, and trust diffs.

**Narration:** “The agent cannot finish with a wall of diagnostics. This tool
requires three to five evidence-linked exact proposals, at most one of which
may be cleanup. Here it restructures a result card, clarifies the comparison
promise, and adds a source-aware trust checklist.”

### 1:35–2:00 — Human boundary

**Screen:** Attempt to apply a proposed patch and show
`HUMAN_APPROVAL_REQUIRED`. Then click **Approve patch** on one diff and let
ChatGPT apply it.

**Narration:** “The agent has no approval tool. An unapproved edit fails. Only
after I approve the visible before-and-after diff can ChatGPT apply it.”

### 2:00–2:25 — Verification and export

**Screen:** Show revision 2, re-run analysis, and export Markdown.

**Narration:** “Application creates a new revision and invalidates stale work.
We analyze again and export the evidence, findings, patches, and decisions. The
agent proposes; the evidence stays inspectable; the person decides.”

## Final manual checklist

- [ ] Join/register on Devpost and confirm eligibility
- [ ] Replace the YouTube placeholder with a public video shorter than 3:00
- [ ] Verify the repository is public and contains the deployed source
- [ ] Verify the live workspace in ChatGPT's in-app browser
- [ ] Confirm the description, technologies, challenge declarations, and legal
      attestations on Devpost
- [ ] Submit before September 3, 2026 at 1:00 PM PT
