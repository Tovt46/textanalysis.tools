# Text Analysis Tools Roadmap

Last updated: August 2, 2026

## Product direction

Text Analysis Tools is one deterministic, privacy-conscious analysis engine
exposed through Web UI, public HTTP API, local CLI, importable TypeScript SDK,
and local MCP. The product is designed both for people and for AI agents that
need inspectable measurements instead of generated judgments.

The current priority is dependable workflows and adoption of the existing
eight operations, not more isolated calculators.

## Current release baseline

- Eight analysis operations across Web, API v1, CLI, SDK, and MCP
- English, Ukrainian, Russian, and Spanish tool interfaces
- Canonical integration, automation, privacy, and release documentation in English
- Local browser analysis for pasted text; URL analysis uses the stateless API
- Public OpenAPI 3.1 contract, `llms.txt`, JSON schemas, and 89 sitemap pages
- `textanalysis-tools` 0.2.0 release candidate in source; npm publication and
  production deployment remain rollout gates
- Hostinger-native GitHub deployment with no Cloudflare dependency

## Completed implementation queue

### API safety and scale

- [x] DNS-pinned public URL fetching with redirect revalidation and reserved-IP blocking
- [x] Streamed byte, duration, URL-count, token, concurrency, and response-size budgets
- [x] Bounded result tables with explicit truncation metadata
- [x] Stable pagination for vocabulary, density, n-gram, comparison, and IDF tables
- [x] Dynamic request cost based on documents, URLs, and accepted input size
- [x] Shared Hostinger-compatible filesystem rate limiter with bounded local fallback
- [x] Real shared-store health probe; relative or unwritable paths report `degraded`
- [x] Request IDs, privacy-safe structured logs, quota headers, and CORS coverage

### First-run product experience

- [x] People, Developers, and AI Agents entry paths on the homepage
- [x] Localized realistic examples for all eight web tools
- [x] Copy-result actions and visible partial-result notices
- [x] Desktop and mobile Playwright coverage for all eight workflows
- [x] Shared Web Worker execution with cancellation, progress, input limits, and output caps

### Agent and automation interfaces

- [x] Eight read-only MCP tools with operation-specific input and output schemas
- [x] Discriminated structured success/error results and stable error categories
- [x] MCP pagination for bounded support and comparison tables
- [x] Three tested agent recipes: repetition audit, baseline regression, and similarity review
- [x] `textanalysis check` with a versioned JSON schema, deterministic rules, and CI exits
- [x] Reusable GitHub Action for the same check contract
- [x] Side-effect-free ESM SDK with curated TypeScript declarations

### Release and operations

- [x] Synchronized application, Action, CLI, SDK, and lockfile versions
- [x] Tag-driven npm trusted publishing with provenance
- [x] One packed artifact tested and audited in a clean consumer before publication
- [x] Revision-aware post-deployment smoke check for all routes, assets, APIs, and health
- [x] npm-registry gate so production cannot advertise an unpublished package version
- [x] Privacy and Data Handling page

## Rollout gates before 0.2.0 is live

These require account or hosting configuration rather than more application code:

1. In Hostinger, set `RATE_LIMIT_STORE_PATH` to an absolute, persistent,
   writable directory outside the replaceable application build.
2. Confirm Hostinger strips or overwrites untrusted public forwarding headers.
3. In npm, configure the trusted publisher for repository
   `Tovt46/textanalysis.tools` and workflow `publish-npm.yml`.
4. Push stable tag `v0.2.0`, wait for the npm workflow, and confirm the registry
   contains 0.2.0 before pushing the same commit to `main`.
5. Let Hostinger deploy `main`, then require the post-deployment smoke workflow
   to confirm the exact revision, `rateLimit: shared`, and npm version.

Cloudflare is not part of this deployment. GA changes remain intentionally
deferred.

## Next product queue after rollout

### P1: Contract consolidation

- Generate or share more validation definitions across HTTP, CLI, MCP, and OpenAPI
  to reduce manual schema drift.
- Decide whether CLI users need `--offset`/`--all` streaming for very large
  tables; current CLI output is deliberately bounded and reports truncation.
- Add more SDK examples for batch processing and application integration.
- Publish a stable public-export and semantic-versioning policy.

### P2: Operational monitoring

- Connect the privacy-safe log events to Hostinger-supported metrics or an
  external uptime monitor.
- Alert on elevated 5xx, 429, remote-fetch failures, latency, and a degraded
  rate-limit backend without recording submitted content or URLs.
- Benchmark representative large inputs on constrained mobile and Node runtimes.

### P2: Documentation and discoverability

- Keep the deepest developer and agent documentation in English, as decided.
- Keep localized tool UI and existing core guides accurate when contracts change.
- Improve links among each tool, its method guide, API operation, CLI command,
  SDK example, and MCP recipe.
- Use fresh Search Console evidence before adding indexed landing pages.

## Intentionally deferred

- Additional isolated text calculators
- Cloudflare infrastructure
- GA configuration changes
- Mandatory accounts, cloud document history, or a database without a validated workflow
- High-volume paid API plans before real production demand and monitoring exist
- Remote MCP before authentication and durable quotas
- AI detection, grammar scoring, content generation, or a fabricated SEO score
- More interface languages before current localized product surfaces are maintained

## Definition of done for this release

```bash
npm run release:verify
npm run lint
npm test
npm run test:cli
npm run test:browser
npm run test:package
```

The release is complete only after the exact npm tarball is published, the
same commit is deployed by Hostinger, `/api/health` reports that revision with
`rateLimit: shared`, and the production smoke suite passes.
