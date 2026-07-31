# Text Analysis Tools Roadmap

Last updated: July 31, 2026

## Product direction

Text Analysis Tools is a deterministic, privacy-conscious text analysis
toolkit for people, applications, automation, and AI agents. The same eight
analysis operations are available through the Web UI, public HTTP API, local
CLI, and local MCP server.

The next phase should make those existing capabilities safer, easier to try,
and easier to integrate. Adding more isolated calculators is not a priority.

## Current baseline

- Eight production text analysis operations
- English, Ukrainian, Russian, and Spanish web interfaces
- Versioned public JSON API and OpenAPI 3.1 document
- Published `textanalysis-tools` npm CLI
- Local stdio MCP server with eight read-only tools
- Local-first analysis for pasted text and files
- Production smoke coverage for 88 sitemap pages, linked static assets, all
  eight tools, and all eight versioned API operations
- GitHub CI for linting, builds, rendered tests, CLI/MCP tests, dependency
  auditing, and npm package inspection

## Delivery status

Completed on July 31, 2026:

- Executable CLI examples and internal fragment-link validation
- Migration of the Web UI to API v1 and removal of legacy API routes
- DNS-pinned remote fetching, redirect revalidation, one end-to-end deadline,
  streamed byte limits, and compound concurrency budgets
- Bounded result tables, explicit truncation metadata, a 5 MB response cap,
  weighted request costs, and browser-readable rate-limit headers
- Contract regression coverage for all eight versioned API operations

Still pending:

- A durable rate-limit store shared by all Hostinger application workers
- Pagination for consumers that need more than the bounded response tables
- Browser interaction tests for all eight tools
- The P1 activation, MCP contract, workflow, SDK, and release work below

## Product principles

1. Keep calculations deterministic and inspectable.
2. Keep pasted text and local files local whenever possible.
3. Preserve one analysis engine across Web, API, CLI, and MCP.
4. Prefer complete workflows over additional single-metric tools.
5. Do not present diagnostic measurements as SEO or content-quality scores.
6. Do not require accounts or server-side document storage for core use cases.

## P0: Correctness and contract cleanup

### Completed: executable documentation

The localized CLI pages previously showed unsupported file and n-gram options.
They now use positional inputs and `--size`, and the published commands are
covered by executable contract tests.

Actions:

- [x] Correct every published CLI command example.
- [ ] Derive examples from a shared source instead of duplicating command syntax.
- [x] Add a test that executes every command presented as a copy-ready example.
- [x] Add a rendered-link test that verifies every internal `path#fragment`
  points to an existing element ID.

Acceptance criteria:

- Every documented CLI example exits successfully against the built npm CLI
  bundle; installing and testing the exact tarball remains a release gate.
- No internal documentation link points to a missing page fragment.

### Completed: remove legacy API drift

The Bag of Words URL workflow now uses `/api/v1/analyze`. The unversioned API
routes have been removed, including their incomplete Spanish-language path.

Actions:

- [x] Move the Bag of Words URL workflow to `/api/v1/analyze`.
- [x] Normalize the UI adapter to the versioned response envelope.
- [x] Remove the unversioned `/api/analyze`, `/api/word-frequency`, and
  `/api/keyword-density` routes after confirming that no clients use them.
- [x] Add Spanish analysis regression coverage with custom stopwords.

Acceptance criteria:

- Every web tool uses a versioned API route for remote URL input.
- Explicit Spanish language settings and Spanish custom stopwords work for
  both pasted text and URL input.
- The production smoke suite contains no legacy API dependency.

## P0: API security and resource safety

### Completed: harden remote URL fetching

Hostname string checks alone do not protect against DNS rebinding or domains
that resolve to private and reserved addresses. Reading an entire response
before enforcing its final size also allows excessive memory use.

Actions:

- [x] Resolve and validate all A and AAAA records before each request and redirect.
- [x] Connect to the validated address while preserving the original Host and
  TLS server name, closing the DNS-rebinding gap.
- [x] Block private, loopback, link-local, multicast, documentation, and other
  reserved address ranges.
- [x] Prevent redirects from changing to an unsafe destination.
- [x] Stream response bodies with a hard byte limit and abort immediately when the
  limit is exceeded.
- [x] Apply a total URL count, byte, duration, token, and concurrency budget to compound
  operations such as TF-IDF.
- [x] Add tests for unsafe DNS results, redirect chains, chunked oversized bodies,
  timeouts, and mixed safe/unsafe corpus inputs.

Acceptance criteria:

- No remote analysis request can reach a private or reserved address.
- A body larger than the configured limit is aborted without being fully
  buffered.
- One API request cannot start more than the configured number of concurrent
  remote fetches.

### In progress: make quotas consistent

The current rate limiter is stored in a process-local map. It resets on a
restart, is not shared between application instances, and cannot reliably
represent the cost of multi-document requests.

Actions:

- [x] Parse client IPs from Hostinger-compatible proxy headers without a
  Cloudflare dependency.
- [ ] Confirm Hostinger strips untrusted forwarding headers at the public edge.
- [ ] Use a shared token bucket backed by a Hostinger-compatible Redis or KV
  service; Cloudflare is not required.
- [x] Weight compound operations more heavily than single-text operations.
- [x] Return rate-limit limit, remaining, reset, and retry headers.
- [x] Add maximum row, token, aggregate request, and response-byte limits.
- [ ] Weight quota dynamically by document count, URL count, and accepted size.
- [ ] Add pagination where a complete vocabulary or corpus table is useful.

Acceptance criteria:

- Limits remain consistent across restarts and multiple application workers.
- Expensive corpus operations consume more quota than a short single-text
  request.
- No successful API response exceeds the documented row or byte budget.

## P1: Faster first success

### Create three clear entry paths

The homepage already positions the toolkit for people, code, and AI agents.
Turn that promise into three direct onboarding paths:

- **People:** open a web tool with a meaningful example ready to run.
- **Developers:** copy an API request or install the CLI.
- **AI agents:** copy an MCP configuration and run a focused workflow.

### Add runnable examples

Actions:

- Add a localized **Load example** action to all eight web tools.
- Use realistic input long enough to produce meaningful results.
- Show one sentence explaining what the user should notice in the output.
- Add copy actions for JSON, CLI commands, and API requests where appropriate.
- Cover all eight example flows with browser tests that verify hydration,
  interaction, and calculated results.

Acceptance criteria:

- A first-time visitor can produce a meaningful result with one action.
- Each example returns a deterministic value asserted by an automated browser
  test.
- The examples work at mobile and desktop viewport sizes.

## P1: Agent-grade interfaces

### Strengthen MCP contracts

The MCP tools currently use one generic `result: unknown` output schema and
return unstructured text errors.

Actions:

- Define a specific output schema for every MCP tool.
- Return stable structured error codes and retryability information.
- Avoid duplicating full result payloads in both text and structured content.
- Mark URL-capable tools accurately in their network/open-world annotations.
- Validate MCP results against their declared schemas in CI.

### Publish workflow recipes

Add copy-ready examples to the agent integration guide:

1. Repetition and phrase-density audit
2. Draft-versus-baseline regression check
3. Duplicate or near-duplicate text check

Each recipe should state which tool to call, the expected input shape, how to
interpret the result, and the limits of the measurement.

Acceptance criteria:

- An MCP client can discover a precise schema for every input and output.
- Agents can distinguish input, network, quota, and analysis failures without
  parsing prose.
- Each documented recipe is backed by a fixture test.

## P1: Repeatable quality checks

Create a workflow command that composes the existing analysis methods:

```bash
textanalysis check article.md
```

Example configuration:

```json
{
  "requiredPhrases": ["text analysis"],
  "maxPhraseDensity": 3,
  "maxSimilarity": 0.8,
  "minimumWords": 500
}
```

Actions:

- Define a versioned `textanalysis.config.json` schema.
- Support required and forbidden phrases, repetition thresholds, minimum text
  length, and similarity thresholds.
- Return human-readable, JSON, and CI-friendly output.
- Exit with a non-zero status when a configured rule fails.
- Publish a reusable GitHub Action after the CLI contract is stable.

Acceptance criteria:

- The same configuration produces identical decisions locally and in CI.
- Every failure explains the measured value, configured threshold, and
  responsible rule.
- The command remains diagnostic and never claims to guarantee rankings or
  writing quality.

## P1: SDK and release engineering

### Publish an importable TypeScript API

The npm package currently exposes a binary. Add an importable ESM API so
applications and agents do not need to launch a subprocess or call the hosted
API for local analysis.

Target usage:

```ts
import {
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
} from "textanalysis-tools";
```

Actions:

- Extract a side-effect-free core package with TypeScript declarations.
- Share validation schemas across HTTP API, CLI, MCP, and OpenAPI generation.
- Define stable public exports and semantic-versioning rules.
- Add package-size and runtime compatibility checks.

### Automate releases

Actions:

- Add tag-driven npm trusted publishing with provenance.
- Verify application, CLI, MCP, and package version synchronization.
- Install the packed tarball in a clean temporary project.
- Run all eight CLI commands and an MCP discovery call against that tarball.
- Run the production smoke suite after deployment.

Acceptance criteria:

- A release tag produces one reproducible npm artifact without a manual local
  publish step.
- CI tests the exact tarball that will be published.
- The website never advertises an npm version that is not available.

## P2: Performance and operations

### Keep large local analyses responsive

- Move heavy browser analysis into a shared Web Worker.
- Enforce client-side document limits before starting work.
- Add cancellation and, where meaningful, progress reporting.
- Test large inputs on a representative mobile viewport.

### Add privacy-safe operational visibility

- Add request IDs and structured logs for operation, status, duration,
  response size, and error class.
- Never log submitted text, analyzed URLs, result terms, or document content.
- Move optional analytics delivery off the response-critical path.
- Add a minimal health endpoint and monitor API latency, errors, quota
  responses, and remote-fetch failures.
- Keep GA optional and out of the current implementation scope.

## P2: Content and trust

- Bring localized guides to the same methodological depth as the English
  guides before creating more indexed URLs.
- Keep formulas, examples, limitations, and source references aligned across
  languages.
- Normalize guide breadcrumbs and structured data.
- Add one substantial Privacy and Data Handling page that explains Web, API,
  CLI, MCP, URL fetching, storage, retention, and optional analytics.
- Improve internal links among each tool, its method guide, API operation, CLI
  command, and MCP workflow.
- Use fresh Search Console evidence before creating any new search landing
  page.

## Work intentionally deferred

- Additional isolated text calculators
- Mandatory accounts or cloud document history
- A database without a validated server-side workflow
- High-volume paid API plans before durable quotas and operational metrics
- Remote MCP before authentication and quotas
- AI detection, grammar scoring, content generation, or a fabricated SEO score
- Mass-produced `/for-*`, industry, glossary, competitor-alternative, or
  synonym landing pages
- Additional interface languages before current localized content reaches
  parity
- GA configuration changes

## Recommended execution order

### Sprint 1: Correctness and safety

1. [x] Correct CLI examples and broken documentation fragments.
2. [x] Move Bag of Words URL analysis to `/api/v1/analyze` and remove legacy API
   dependencies.
3. [x] Harden URL fetching and add adversarial security tests.
4. [x] Add compound-request and response-size budgets.
5. [x] Add weighted costs and standard quota headers.
6. [ ] Replace the process-local limiter with a Hostinger-compatible shared store.
7. [ ] Add browser interaction tests for the current eight tools.

### Sprint 2: Activation and agent workflows

1. Add the People, Developers, and AI Agents homepage paths.
2. Add runnable examples to all eight tools.
3. Add typed MCP output schemas and structured errors.
4. Publish the three agent workflow recipes.
5. Add npm tarball and release gates.
6. Finalize the `textanalysis check` configuration contract and fixtures.

### Sprint 3: Platform growth

1. Implement `textanalysis check` and the GitHub Action.
2. Publish the importable TypeScript API.
3. Move large browser calculations into a Web Worker.
4. Add privacy-safe operational monitoring.
5. Deepen existing content and internal links using measured demand.

## Definition of success

The roadmap is working when:

- A new visitor can run a meaningful example immediately.
- All public examples and deep links are executable and tested.
- Web, API, CLI, SDK, and MCP produce contract-compatible results.
- Remote input cannot access private networks or exhaust unbounded resources.
- Agents receive typed results and structured failures.
- Teams can enforce deterministic text checks in CI.
- Releases and post-deployment verification require no ad hoc local steps.
- Growth preserves the project's privacy and transparency advantages.
