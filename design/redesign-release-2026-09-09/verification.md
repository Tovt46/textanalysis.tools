# Redesign release — 2026-09-09

Published at https://textanalysis.tools. Final served revision: `36d007f5c87228466aff8e1b770c5c5f935d0276`.

## Changes

- Approved graphite/coral homepage, complete toolkit, and human/agent entry points in EN/RU/UK/ES.
- Shared tool navigation and persistent dark/light themes.
- Word Frequency Counter editor/results workspace, live result metrics, search, sorting, CSV/JSON, and existing Worker/API behavior.
- Existing engines, calculations, localized routes, SEO metadata, CLI/MCP, and Evidence Workspace retained.
- Next.js 16.3.4 and sharp 0.35.4, followed by the complete dependency-audit cleanup.

## Verified evidence

| Check | Result |
|---|---|
| Production build and rendered/API/CLI/MCP regression tests | 138/138 passed |
| Desktop/mobile browser regression | 64/64 passed |
| Packed CLI/MCP fresh installation | 13 checks passed; runtime audit clean |
| Full dependency audit, including development dependencies | 0 vulnerabilities |
| Original workspace merged dependency installation | 0 vulnerabilities |
| Lint and release version checks | Passed |
| Independent source reviews | No actionable P1/P2 findings |
| Local rendered QA | 1440, 768, 390 px; dark/light, localized homepage, tools, guides, Evidence Workspace |
| Live rendered QA | Desktop/mobile homepage and actual EN/RU word analysis; no document overflow at tested sizes |
| Live homepage console check | No captured warnings or errors |
| Final production smoke | 90 pages and linked assets, 8 tools, 8 APIs, health, expected Git revision and shared rate limiter passed |

- [Redesign PR #5](https://github.com/Tovt46/textanalysis.tools/pull/5), merged as `945adb1`.
- [Dependency cleanup PR #6](https://github.com/Tovt46/textanalysis.tools/pull/6), merged as `36d007f`.
- [Final main CI](https://github.com/Tovt46/textanalysis.tools/actions/runs/34337335415): success.
- [Final automatic production smoke](https://github.com/Tovt46/textanalysis.tools/actions/runs/34337579610): success.

The first smoke during the redesign transition saw one obsolete JavaScript asset returning404. A later independent read of all90 sitemap pages found only the current runtime; both the final manual and automatic smoke runs passed. This establishes a resolved deployment transition; it does not establish CDN caching as the specific cause.

## Security screenshot reconciliation

The five vulnerable packages in the pre-cleanup complete audit contained12 advisory entries: Browserslist2, fast-uri4, Hono3, js-yaml1, qs2. Seven were high. One qs entry had CVSS3.7 despite npm assigning moderate severity. This plausibly explains the supplied scanner summary of12 total,7 high,4 moderate,1 low; the scanner's detailed report was not independently read.

| Package | Before | Released |
|---|---|---|
| browserslist | 4.28.2 | 4.28.9 |
| fast-uri | 3.1.5 | 3.1.7 |
| hono | 4.13.3 | 4.13.7 |
| js-yaml | 4.3.1 | 4.3.2 |
| qs | 6.15.3 | 6.16.0 |

Related maintainer advisories: [Browserslist](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [fast-uri](https://github.com/advisories/GHSA-5jgf-p345-68v8), [Hono](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv), [js-yaml](https://github.com/advisories/GHSA-2883-xcg3-v3hh), [qs](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).

All five were development dependencies in the website root. fast-uri, Hono, and qs also belong to the CLI's MCP SDK runtime dependency tree. Fresh CLI installation was verified; existing external consumer lockfiles were not updated by this website release. No npm package was republished.

CI now runs `npm audit` over the complete tree and retains the separate packed-CLI runtime audit.

## Original workspace preservation

The original local main now matches final production. All pending TextContract edits and untracked files were retained; those changes were not deployed. Three original overlapping files were explicitly merged, and their package/lock dictionaries and all pending semantic changes were verified.67 non-overlapping files matched their original hashes. The subsequent security lock merge was conflict-free and retained all45 pending TextContract lock changes and all33 incoming security changes.

Retained recovery stashes:
- `fab33d019b93ba6bd2de191506263f34f57da163` — tracked changes before redesign synchronization.
- `ccf5872d823e7f388160dceb9ef84931e7259bb1` — pending lock before security synchronization.

Environment files were not read, copied, committed, or published. Browser viewport was reset after QA. Production screenshots and local/final audit logs are stored beside this report.
