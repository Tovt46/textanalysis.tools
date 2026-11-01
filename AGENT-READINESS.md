# Agent discovery

The homepage provides Organization, WebSite, WebPage, and WebApplication JSON-LD, verified project profiles, and the owner's public email. About, Contact, and Privacy are linked in the shared footer.

- `robots.txt`: `Content-Signal: search=yes, ai-train=no` declares the requested content-use preference. This is a voluntary directive, not access control.
- `sitemap.xml`: every URL has a date in `app/content-lastmod.json`. Initial dates were taken from Git history of page and shared content sources. Update the matching dates when content or analysis behavior changes; do not replace them with request/build timestamps.
- `llms.txt`: Markdown index of tools, documentation, and agent entry points.
- `GET /` with `Accept: text/markdown`: returns the curated homepage representation. `GET /index.md` exposes the same representation directly. Keep `app/home-markdown.ts` aligned with homepage capabilities. HTML responses remain available; homepage responses vary on Accept and advertise both resources via Link headers.
- Homepage WebMCP: registers the read-only `discover_textanalysis_tools` tool when the browser exposes `document.modelContext` or the older `navigator.modelContext`. No polyfill or text submission occurs. Evidence Workspace retains its separate human-approval workflow.
- `POST /mcp`: stateless Streamable HTTP, one `analyze_text` tool, using the existing public analysis handler with its input, workload, URL-fetch, and response limits. Unlike local stdio MCP, hosted MCP receives text on the server. No SSE subscription endpoint or persistent MCP session is provided. Browser Origin must match the request origin; non-browser clients may omit Origin.
- `/.well-known/mcp/server-card.json`: SEP-1649-style discovery with actual server identity, HTTP endpoint, and tools capability. Server card discovery specifications continue to evolve; this path implements the requested format.

The local npm stdio MCP server continues to offer its existing eight analysis tools. The hosted endpoint currently offers only `analyze_text`; its card does not advertise the other seven.

## Checks

`npm test` includes discovery/negotiation and a real initialize → tools/list → tools/call HTTP contract. `npx playwright test tests/agent-readiness.browser.spec.mjs` checks both WebMCP browser surfaces, tool execution, no-WebMCP fallback, contact navigation, and desktop/mobile overflow. `npm run lint` and `npm run build` cover the application changes. Local success does not establish deployment or production state.

## Security follow-up — 2026-11-01

The remote-address fallback test now advances a controlled clock instead of depending on the machine finishing work inside 80 ms. It verifies fallback at 40 ms and a separate regression verifies that a second address cannot extend the shared 80 ms deadline. Production fetch deadlines were not relaxed.

File-backed rate limiting now queues lock attempts within each Node process before acquiring the existing exclusive filesystem lock. Local queue wait and filesystem acquisition share the existing lock deadline. This avoids synchronized polling under bursts while preserving atomic counters between processes. Regression coverage checks exact concurrent counts, timeout recovery, and synchronized writes from two independent Node processes. Tests drain all writers and wait for child-process shutdown before removing temporary stores.

The runtime audit found two transitive advisories during this follow-up. Only the compatible lockfile resolutions were updated: `@hono/node-server` 2.0.12 → 2.1.5 and `follow-redirects` 1.16.1 → 1.16.2.

## Pre-deployment local verification — 2026-11-01

| Check | Result |
| --- | --- |
| Source/static | PASS: build TypeScript checks, `npm run lint` (exit 0; four existing warnings in unrelated report artifacts), changed-file ESLint, and `git diff --check` |
| Local automated suite | PASS: `TEST_PORT=3108 npm test` (exit 0); all 226 tests passed. After refining child shutdown cleanup, `TEST_PORT=3108 node scripts/run-rendered-tests.mjs` passed all 226 again against the same final production build. |
| CLI and package | PASS: `npm run test:cli` (39 tests) and `npm run test:package` (13 packed CLI/SDK/type/MCP/audit checks), both exit 0 |
| Local build | PASS: the fresh production build and TypeScript validation completed inside `npm test` before any rendered test started |
| Rendered browser QA | PASS: all 134 desktop/mobile checks against the production build using installed Google Chrome, exit 0. Command: `npx playwright test -c /tmp/textanalysis-security-playwright.config.mjs`; the temporary config selects Chrome and starts `next start`, keeping the repository test set and assertions. Bundled Playwright Chromium is not installed for this checkout's version. |
| Relevant accessibility | PASS: the browser suite exercises keyboard controls, labels, focus, and desktop/tablet/mobile overflow. Desktop/mobile screenshots were inspected. No separate full WCAG audit was performed. |
| Release/dependencies | PASS: `npm run release:verify` (exit 0); `npm audit --omit=dev` (exit 0, zero vulnerabilities) |
| Production website | NOT RUN: these checks cover the local build |
| Deployment | NOT DEPLOYED: no commit, push, or publication performed |

All requested local checks pass; there are no remaining test failures. Live production and a separate full accessibility audit remain unverified. Next.js regenerated the managed AGENTS.md heading during local development. Existing unrelated audit files were preserved; build artifacts and browser reports use ignored output directories.

## Deployment preflight — 2026-11-01

The deployment preflight also ran CI's full dependency audit, including development tooling. Its minimatch advisory was resolved with a dev-only compatibility entry backed entirely by patched minimatch 11.0.3. Scoped overrides preserve the callable CommonJS interface expected by ESLint consumers; the TypeScript parser receives version 11 directly. All compatibility/glob tests, repository lint, a clean isolated npm ci, and the full audit passed with zero vulnerabilities.

After this fix, TEST_PORT=3108 npm test completed a fresh production build and passed all 230 tests. npm run release:verify and git diff --check also passed. This document records local validation before the authorized main-branch release. Post-deployment HTTP/native WebMCP evidence is recorded separately in outputs/agent-readiness-live-2026-11-01/.
