# New brand release — September 9, 2026

Approved reference: user-supplied four-line convergence mark and coral dot. SVG adaptation uses graphite/ivory surfaces; no orange/coral surface or primary-button backgrounds.

## Scope

Shared header/footer logo, desktop workspace sidebar, mobile workspace header, neutral action tokens, favicon SVG/ICO/PNG, Apple/Android icons, versioned manifest and social metadata on all locales, 1200×630 social card. Human/AI-agent positioning and existing SEO copy/canonicals/language alternates retained. Native geometry and outlined Geist sources are included with a deterministic Sharp asset generator.

## Local verification

- Production build and 138 tests passed.
- 64 browser tests passed (desktop and mobile Chromium).
- ESLint, release version contract, and final git whitespace checks passed.
- Full npm audit: zero vulnerabilities.
- Rendered both themes at 1440 and 390 pixels; Russian homepage at 768 pixels. No horizontal overflow. Bag of Words example successfully generated 50 analyzed words / 43 terms.
- Browser warning/error log empty on checked local routes.
- All icon dimensions and 16/32/48 ICO entries verified independently.
- Brand kit rendered at 1280 pixels; all images loaded and no horizontal overflow.

## Release

PR: https://github.com/Tovt46/textanalysis.tools/pull/7
Feature head: 613a63e
CI: https://github.com/Tovt46/textanalysis.tools/actions/runs/34342238769
Published revision: 021b7e03aaef84947e29ec85e935ccf835c39eef

- PR CI passed before merge.
- Main CI passed: https://github.com/Tovt46/textanalysis.tools/actions/runs/34342548081
- Automatic production smoke passed: https://github.com/Tovt46/textanalysis.tools/actions/runs/34342792586
- Independent manual production smoke passed: 90 pages, linked assets, 8 tools, 8 APIs, health, exact revision, shared rate-limit backend, and existing npm release contract.
- Production health returned the published revision.
- 11 live brand assets verified. SVG/ICO files are byte-identical; all seven PNG images are pixel-identical after decoding. Hostinger CDN repackages PNG files, so encoded-file SHA differences do not indicate stale images. No cache change was needed.
- Live manifest has graphite theme, ivory background, and versioned icons.
- Rendered production Bag of Words Generator shows the new four-line mark, versioned favicon and OG tags, neutral action background, no horizontal overflow, and no captured browser warnings/errors.
- Local production QA server stopped; portable brand preview is available at http://127.0.0.1:4180/preview.html while its local server runs.

## Working-tree preservation

Implementation isolated in /private/tmp/textanalysis-redesign-release-20260909. Existing TextContract changes in the original repository excluded from this release. A tracked patch and SHA-256 manifest for 87 pre-existing working files were captured in /private/tmp/textanalysis-brand-sync-backup before synchronization.

Original worktree synchronized to the published revision. All 13 tracked changes matched the prepared three-way merge; 74 other pre-existing files remained byte-identical. Retained recovery stash: 9bfaff82e7bb17ae4fff7cef70ccb719406a90d5.
