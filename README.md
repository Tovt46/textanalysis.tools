# textanalysis.tools

A multilingual text-analysis toolkit for word frequency, keyword density,
Bag-of-Words, bigrams, focus phrases, Zipf distribution, and side-by-side text
comparison.

## Features

- English, Ukrainian, and Russian interfaces
- local analysis for pasted text
- editable language-specific stopword lists
- saved result A and side-by-side A/B comparison
- counts, percentages, and occurrences per 1,000 words
- dedicated searchable word-frequency table with CSV and JSON export
- keyword-density tables for unigrams, bigrams, and trigrams
- exact tracked phrases and in-browser A/B density comparison
- Bag-of-Words and Zipf distribution metrics
- stateless JSON API for text and public URLs
- OpenAPI schema, `llms.txt`, sitemap, and multilingual SEO metadata

Submitted text is not stored on the server.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The local development URL is printed in the terminal.

## Validation

```bash
npm test
npm run lint
```

`npm test` creates a production build and runs the rendered-page and analyzer
test suite.

## Main routes

- `/` — English analyzer
- `/uk` — Ukrainian analyzer
- `/ru` — Russian analyzer
- `/bag-of-words-model` — Bag-of-Words guide
- `/bag-of-words-vs-word2vec` — Bag-of-Words and Word2Vec comparison
- `/api-docs` — public API documentation
- `/tools` — focused text-analysis tools
- `/tools/word-frequency-counter` — searchable word counts for text and URLs
- `/tools/keyword-density-checker` — 1–3-word density tables and A/B comparison
- `/how-to-calculate-word-frequency` — formulas and worked frequency example
- `/keyword-density-formula` — density formulas, examples, and limitations
- `/openapi.json` — OpenAPI 3.1 schema
- `/llms.txt` — machine-readable agent guidance

## Public API

- `POST /api/v1/analyze` analyzes one text or public URL.
- `POST /api/v1/compare` analyzes and compares two inputs.

Example:

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"source":"Paste enough text here for a meaningful analysis.","language":"en"}'
```

See `/api-docs` and `/openapi.json` for the complete request and response
formats.

## Analytics

GA4 is optional and disabled unless environment variables are configured. The
event taxonomy, setup variables, Search Console sitemap checklist, and monthly
`impressions → clicks → analyses` report definition are documented in
[`ANALYTICS.md`](./ANALYTICS.md).
