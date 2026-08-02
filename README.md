# Text Analysis Tools

A multilingual text analysis engine with web tools for people, a public API
for applications, and local CLI and MCP interfaces for automation and AI
agents.

See [`ROADMAP.md`](./ROADMAP.md) for the English-language product and technical
development roadmap.

## Features

- English, Ukrainian, Russian, and Spanish interfaces across all tools and core guides
- canonical integration, automation, privacy, and release documentation in English
- local analysis for pasted text
- editable language-specific stopword lists
- saved result A and side-by-side A/B comparison
- counts, percentages, and occurrences per 1,000 words
- dedicated searchable word-frequency table with CSV and JSON export
- keyword-density tables for unigrams, bigrams, and trigrams
- exact tracked phrases and in-browser A/B density comparison
- standalone text and webpage comparison with normalized word and bigram changes
- Bag-of-Words and Zipf distribution metrics
- stateless JSON API for text and public URLs
- OpenAPI schema, `llms.txt`, sitemap, and multilingual SEO metadata
- local stdio MCP server with eight read-only tools and structured results
- importable ESM TypeScript API with bundled declarations
- deterministic `textanalysis check` rules for local and CI workflows

Submitted text is not stored on the server.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The local development URL is printed in the terminal.

## Command-line interface

The local-first CLI exposes the same eight analysis operations as the website.
It accepts UTF-8 files, public HTTP(S) URLs, inline text, or piped stdin and can
write terminal tables, JSON, or CSV.

Install the published CLI globally:

```bash
npm install --global textanalysis-tools
textanalysis --help
```

Or run a command without installing it:

```bash
npx --yes textanalysis-tools frequency article.txt
```

Build and run it inside the repository:

```bash
npm run cli -- frequency article.txt
cat article.txt | npm run cli -- density --keywords "text analysis,SEO" --format json
npm run cli -- ngram https://example.com/article --size 3 --format csv
npm run cli -- tfidf draft.txt competitor.txt --output tfidf.json --format json
npm run cli -- similarity draft.txt competitor.txt --method tfidf
```

To link the development build as the `textanalysis` executable:

```bash
npm run cli:build
npm link
textanalysis --help
```

Available analysis commands are `analyze`, `frequency`, `density`, `compare`,
`ngram`, `bow`, `tfidf`, and `similarity`; `check` composes them into a
versioned quality gate, and `mcp` starts the local agent server. Analysis
is performed locally by default; only URL inputs are downloaded. Use
`--language auto|en|ru|uk|es`,
`--keep-stopwords`, `--stopwords <file>`, `--top <number>`, and
`--format table|json|csv` to control common behavior.

### Repeatable checks and GitHub Actions

`textanalysis check article.md` reads a version 1
`textanalysis.config.json`. Rules cover required and forbidden phrases,
minimum length, maximum term or repeated-phrase density, and TF-IDF similarity
to a local baseline. Use `--format ci` for GitHub annotations; a failed rule
returns exit 1, while invalid configuration returns exit 2. The reusable
[`action.yml`](./action.yml) runs the same package contract in GitHub Actions.

The machine-readable schema is available at
`/textanalysis-config.schema.json` and ships inside the npm tarball.

### Importable TypeScript API

Applications can import the deterministic local engine without spawning the
CLI or calling the hosted API:

```ts
import {
  analyzeBagOfWords,
  analyzeText,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
  compareTexts,
} from "textanalysis-tools";

const analysis = analyzeText({text: "inspectable local text", language: "en"});
const comparison = compareTexts(
  {text: "approved baseline text", language: "en"},
  {text: "revised baseline text", language: "en"},
  {top: 50},
);
```

The public ESM entrypoint has no CLI startup side effects and includes curated
TypeScript declarations. `analyzeText` and `compareTexts` keep internal
full-frequency arrays private; comparison returns bounded, paginated word and
bigram change metadata.

## Validation

```bash
npm test
npm run lint
npm run test:cli
npm run test:browser
npm run test:package
```

`npm test` creates a production build and runs the rendered-page and analyzer
test suite.

For Hostinger production, use the standard Node runtime scripts without Cloudflare:

```bash
npm run build:hostinger
npm run start:hostinger
```

## MCP for AI agents

Start the local stdio server:

```bash
npx --yes textanalysis-tools mcp
```

The server exposes the same eight deterministic operations as read-only tools.
See `/agents` for a copy-ready MCP client configuration and `/openapi.json`
when an agent or application should use the public HTTP API instead.

## Main routes

- `/`, `/uk`, `/ru`, `/es` — localized product homepages
- `/tools/*`, `/uk/tools/*`, `/ru/tools/*`, `/es/tools/*` — all eight tools in
  English, Ukrainian, Russian, and Spanish
- `/guides`, `/uk/guides`, `/ru/guides`, `/es/guides` — localized guide directories
- `/<guide>`, `/uk/<guide>`, `/ru/<guide>`, `/es/<guide>` — all eight guides in each language
- `/api-docs`, `/uk/api-docs`, `/ru/api-docs`, `/es/api-docs` — localized API documentation
- `/cli`, `/uk/cli`, `/ru/cli`, `/es/cli` — localized npm CLI and MCP documentation
- `/agents`, `/uk/agents`, `/ru/agents`, `/es/agents` — integrations for AI agents
- `/bag-of-words-model` — Bag-of-Words guide
- `/bag-of-words-vs-word2vec` — Bag-of-Words and Word2Vec comparison
- `/api-docs` — public API documentation
- `/tools` — focused text-analysis tools
- `/guides` — text-analysis formulas, examples, and method limitations
- `/tools/word-frequency-counter` — searchable word counts for text and URLs
- `/tools/keyword-density-checker` — 1–3-word density tables and A/B comparison
- `/tools/text-analysis-comparison` — normalized A/B word and bigram changes
- `/tools/ngram-analyzer` — recurring phrase analysis for 1–10-word n-grams
- `/tools/bag-of-words-generator` — bounded Bag-of-Words rows with counts and frequencies
- `/tools/tf-idf-calculator` — corpus-aware TF-IDF scoring for 2–10 documents
- `/tools/text-similarity-calculator` — cosine similarity by BoW or TF-IDF
- `/how-to-calculate-word-frequency` — formulas and worked frequency example
- `/keyword-density-formula` — density formulas, examples, and limitations
- `/tf-idf-formula` — exact TF-IDF formula, corpus effects, and worked example
- `/cosine-similarity-for-text` — vector formula, weighting modes, and score interpretation
- `/what-are-n-grams` — unigram through 10-token window methodology
- `/compare-texts-by-word-frequency` — normalized A/B text-comparison workflow
- `/cli` — npm CLI installation, commands, inputs, output formats, and exit codes
- `/agents` — Web, API, CLI, OpenAPI, and local MCP integration guide
- `/privacy` — browser, API, CLI, MCP, storage, logging, and analytics boundaries
- `/api/health` — bounded API liveness response
- `/openapi.json` — OpenAPI 3.1 schema
- `/llms.txt` — machine-readable agent guidance

## Public API

- `POST /api/v1/analyze` analyzes one text or public URL.
- `POST /api/v1/compare` analyzes and compares two inputs.
- `POST /api/v1/word-frequency` returns a bounded vocabulary table with truncation metadata.
- `POST /api/v1/keyword-density` returns bounded unigram, bigram, and trigram tables plus up to 100 requested tracked-phrase counts.
- `POST /api/v1/ngram-analyzer` returns bounded n-grams for a selected phrase length.
- `POST /api/v1/bag-of-words` returns a bounded Bag-of-Words vector with term frequencies.
- `POST /api/v1/tf-idf` scores documents with corpus-aware TF-IDF values.
- `POST /api/v1/similarity` returns cosine similarity and top contributing terms (BoW or TF-IDF).
- `GET /api/health` returns API liveness and a safe `shared`, `local`, or `degraded` rate-limit backend state without exposing paths or runtime secrets.

Example:

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"source":"Paste enough text here for a meaningful analysis.","language":"en"}'
```

See `/api-docs` and `/openapi.json` for the complete request and response
formats, table limits, rate-limit headers, and the per-response `X-Request-ID`.

Bounded vocabulary, density, comparison, n-gram, and IDF tables accept
`offset` together with `limit`. Follow `nextOffset` or `nextIdfOffset` until it
is `null` when a consumer needs the complete ordered table.

## Production smoke check

After each deployment run:

```bash
npm run smoke:production
```

The smoke check verifies all 89 sitemap pages, a shared-cache lifetime of no
more than five minutes, the current navigation marker, every linked Next.js
static asset (including JavaScript and CSS), the canonical `/en` redirect,
versioned API operations, request IDs, health, and CORS preflight responses. Set `SMOKE_BASE_URL` to
test another environment. Set `SMOKE_CANONICAL_ORIGIN` only when that
environment uses a different canonical domain. Set `EXPECT_GA_MEASUREMENT_ID`
when the deployment is expected to load GA4. Set
`EXPECT_RATE_LIMIT_BACKEND=shared` for production: smoke checks always reject
`degraded`, while this option also rejects an unintended local-only backend.

For local verification against a production build:

```bash
npm run build:hostinger
npm run start:hostinger
# in another terminal:
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke:production
```

## GitHub auto deploy to Hostinger

Production uses Hostinger's native GitHub integration. The Hostinger Web App is
connected to this repository and automatically builds and deploys every push to
`main` with Next.js and Node.js 22.x.

No repository SSH secrets, deploy key, PM2 workflow, Cloudflare token, or custom
GitHub Actions deployment job is required. Build status and logs are available
in hPanel under `Websites → textanalysis.tools → Deployments`.

If the post-deployment smoke check reports a one-year page TTL or missing
`/_next/static/` assets, clear both the website cache and CDN cache in hPanel
before running the check again. A cache-busted URL is useful for diagnosis but
does not prove that the canonical URL is fixed.

Before pushing production changes, run:

```bash
npm run test
```

To share rate limits across Hostinger Node workers, configure
`RATE_LIMIT_STORE_PATH` as an absolute persistent writable directory outside
the replaceable application build. Without it, the API uses a bounded
process-local fallback and continues serving requests safely. Production smoke
sets `EXPECT_RATE_LIMIT_BACKEND=shared`; it also compares the revision embedded
in `/api/health` with the exact commit validated by CI, so a passing check
cannot accidentally describe the previous Hostinger deployment. With
`CHECK_NPM_RELEASE=1`, the same gate verifies that the package version shown by
the site is already available from the npm registry.

## npm release order

The npm package uses GitHub Actions trusted publishing with provenance, so no
long-lived npm token is stored in this repository. Configure the npm package
once with repository `Tovt46/textanalysis.tools` and workflow
`publish-npm.yml`, following npm's
[trusted publisher](https://docs.npmjs.com/trusted-publishers/) setup.

For a stable release, commit the synchronized version first, then publish the
tag before pushing that same commit to `main`:

```bash
npm run release:verify
npm test
git tag v0.2.0
git push origin v0.2.0
# wait for the Publish npm package workflow and confirm npm has 0.2.0
git push origin main
```

This order prevents Hostinger from deploying a page that advertises a package
version which npm does not have yet. Release verification intentionally rejects
prerelease tags; a future prerelease workflow must publish under a non-`latest`
dist-tag. The workflow packs once, tests that exact tarball in a clean consumer,
audits its production dependencies, then publishes the same bytes with an npm
[provenance statement](https://docs.npmjs.com/generating-provenance-statements/).

## Analytics

GA4 is optional and disabled unless environment variables are configured. The
event taxonomy, setup variables, Search Console sitemap checklist, and monthly
`impressions → clicks → analyses` report definition are documented in
[`ANALYTICS.md`](./ANALYTICS.md).
