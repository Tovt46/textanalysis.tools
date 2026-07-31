# Text Analysis Tools

A multilingual text analysis engine with web tools for people, a public API
for applications, and local CLI and MCP interfaces for automation and AI
agents.

## Features

- complete English, Ukrainian, Russian, and Spanish interfaces across all tools, guides,
  API documentation, and CLI documentation
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

Available commands are `analyze`, `frequency`, `density`, `compare`, `ngram`,
`bow`, `tfidf`, and `similarity`; `mcp` starts the local agent server. Analysis
is performed locally by default; only URL inputs are downloaded. Use
`--language auto|en|ru|uk|es`,
`--keep-stopwords`, `--stopwords <file>`, `--top <number>`, and
`--format table|json|csv` to control common behavior.

## Validation

```bash
npm test
npm run lint
npm run test:cli
```

`npm test` creates a production build and runs the rendered-page and analyzer
test suite.

For Hostinger production, use standard Node runtime scripts (без Cloudflare):

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
- `/tools/bag-of-words-generator` — full Bag-of-Words vector with counts and frequencies
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
- `/openapi.json` — OpenAPI 3.1 schema
- `/llms.txt` — machine-readable agent guidance

## Public API

- `POST /api/v1/analyze` analyzes one text or public URL.
- `POST /api/v1/compare` analyzes and compares two inputs.
- `POST /api/v1/word-frequency` returns the complete vocabulary table.
- `POST /api/v1/keyword-density` returns unigram, bigram, trigram, and tracked-phrase density.
- `POST /api/v1/ngram-analyzer` returns n-grams for a selected phrase length.
- `POST /api/v1/bag-of-words` returns a full Bag-of-Words vector with term frequencies.
- `POST /api/v1/tf-idf` scores documents with corpus-aware TF-IDF values.
- `POST /api/v1/similarity` returns cosine similarity and top contributing terms (BoW or TF-IDF).

Example:

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"source":"Paste enough text here for a meaningful analysis.","language":"en"}'
```

See `/api-docs` and `/openapi.json` for the complete request and response
formats.

## Production smoke check

After each deployment run:

```bash
npm run smoke:production
```

The smoke check verifies the homepage contract, canonical `/en`
redirect, versioned API operations, CORS preflight responses, and current
JavaScript assets. Set `SMOKE_BASE_URL` to test another environment. Set
`SMOKE_CANONICAL_ORIGIN` only when that environment uses a different canonical
domain. Set `EXPECT_GA_MEASUREMENT_ID` when the deployment is expected to load
GA4.

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

Before pushing production changes, run:

```bash
npm run test
```

## Analytics

GA4 is optional and disabled unless environment variables are configured. The
event taxonomy, setup variables, Search Console sitemap checklist, and monthly
`impressions → clicks → analyses` report definition are documented in
[`ANALYTICS.md`](./ANALYTICS.md).
