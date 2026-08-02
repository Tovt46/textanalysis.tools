# textanalysis-tools

Local-first command-line tools and an MCP server for word frequency, keyword
density, Bag of Words, TF-IDF, n-grams, text comparison, and cosine similarity.

The CLI accepts UTF-8 files, public HTTP(S) URLs, inline text, or piped stdin.
Pasted text and local files stay on your machine. Only URL inputs are
downloaded.

## Install

Requires Node.js 22.13 or newer.

```bash
npm install --global textanalysis-tools
textanalysis --help
```

You can also run it without a global installation:

```bash
npx --yes textanalysis-tools frequency article.txt
```

## Commands

- `analyze` — Bag of Words and Zipf distribution analysis
- `frequency` — bounded word-frequency table with counts and normalized rates
- `density` — unigram, bigram, trigram, and tracked-keyword density
- `compare` — compare frequency and Zipf changes between two inputs
- `ngram` — count phrases from 1 to 10 tokens
- `bow` — generate a Bag of Words vector
- `tfidf` — calculate TF-IDF across 2 to 10 documents
- `similarity` — calculate BoW or TF-IDF cosine similarity
- `check` — enforce versioned phrase, repetition, length, and similarity rules

## Repeatable checks

Create `textanalysis.config.json`:

```json
{
  "$schema": "https://textanalysis.tools/textanalysis-config.schema.json",
  "schemaVersion": 1,
  "requiredPhrases": ["text analysis"],
  "forbiddenPhrases": ["guaranteed ranking"],
  "minimumWords": 500,
  "maxTermDensity": 4,
  "maxPhraseDensity": 2,
  "maxSimilarity": 0.8,
  "baseline": "approved.md"
}
```

Then run the same deterministic decision locally or in CI:

```bash
textanalysis check article.md
textanalysis check article.md --format json
textanalysis check article.md --format ci
```

A failed rule exits with status 1 and reports the measured value and configured
threshold. Invalid arguments or configuration exit with status 2. The root
repository also provides a reusable GitHub Action.

## Importable ESM API

The package exports the side-effect-free TypeScript analysis core as well as
the CLI executable:

```ts
import {
  analyzeBagOfWords,
  analyzeText,
  analyzeWordFrequency,
  calculateTextSimilarity,
  calculateTfIdfCorpus,
  compareTexts,
} from "textanalysis-tools";

const analysis = analyzeText({text: "alpha beta alpha", language: "en"});
const left = analyzeBagOfWords({text: "alpha beta alpha", language: "en"});
const right = analyzeBagOfWords({text: "alpha gamma", language: "en"});
const similarity = calculateTextSimilarity(left, right, "tfidf");
const revisions = compareTexts(
  {text: "alpha beta alpha", language: "en"},
  {text: "alpha beta gamma", language: "en"},
  {top: 50},
);
```

Type declarations and the versioned check-config JSON schema ship in the npm
tarball. `analyzeText` and `compareTexts` return public normalized results
without internal term arrays. Each comparison page is capped at 100 rows; pass
`nextOffset` back as `offset` to read the next page. Local text never leaves
the importing process.

## MCP for AI agents

Start a local stdio MCP server with the same eight deterministic analysis
operations:

```bash
npx --yes textanalysis-tools mcp
```

The server exposes `analyze_text`, `word_frequency`, `keyword_density`,
`ngram_analysis`, `bag_of_words`, `compare_texts`, `tfidf`, and
`text_similarity` as read-only tools with validated inputs and structured
results. Every tool returns a discriminated `structuredContent.outcome`: when
`ok` is `true`, the typed value is in `outcome.result`; when it is `false`,
`outcome.error` contains a stable code, status, category, and retryable flag.
Text arguments stay in the local process. Explicit public URL inputs are
downloaded for analysis.

For `tfidf` and TF-IDF `text_similarity`, `top` also bounds the IDF support
table. MCP callers can pass `offset` and follow `nextIdfOffset` until it is
`null`; CLI JSON reports `totalIdfRows`, `returnedIdfRows`, and
`idfTableTruncated` without emitting an unbounded table.

### Agent recipes

- Repetition and density audit: run `keyword_density`, then
  `ngram_analysis`, and use `analyze_text` to verify above-model terms. Report
  counts and normalized rates rather than inventing a quality score.
- Draft versus baseline regression: send the approved document as `a` and the
  new draft as `b` to `compare_texts`. Rank changes by absolute `shareDelta`
  and keep the language and stop-word settings identical.
- Duplicate and near-duplicate detection: screen pairs with
  `text_similarity` using TF-IDF and a project-calibrated threshold. Explain
  flagged pairs with `compare_texts`, and route borderline cases to human
  review.

## Examples

```bash
textanalysis frequency article.txt
cat article.txt | textanalysis density --keywords "text analysis,SEO" --format json
textanalysis ngram https://example.com/article --size 3 --format csv
textanalysis tfidf draft.txt competitor.txt --output tfidf.json --format json
textanalysis similarity draft.txt competitor.txt --method tfidf
textanalysis check article.md --config textanalysis.config.json --format ci
```

Common options include `--language auto|en|ru|uk|es`, `--keep-stopwords`,
`--stopwords <file>`, `--top <number>`, `--format table|json|csv`, and
`--output <file>`.

Machine-readable frequency, n-gram, and Bag of Words results include
`totalRows`, `returnedRows`, and `truncated`. Density and comparison report the
same metadata per returned table. This makes every `--top` cut explicit; use
the paginated public API when a workflow must retrieve a larger ordered table.

Full CLI documentation is available at
[textanalysis.tools/cli](https://textanalysis.tools/cli). The same analysis
methods are also available through the web tools and public API. See the
[agent integration guide](https://textanalysis.tools/agents) for MCP and
OpenAPI setup.

## License

The npm CLI package is available under the [MIT License](./LICENSE).
