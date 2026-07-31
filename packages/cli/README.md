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
- `frequency` — complete word-frequency table
- `density` — unigram, bigram, trigram, and tracked-keyword density
- `compare` — compare frequency and Zipf changes between two inputs
- `ngram` — count phrases from 1 to 10 tokens
- `bow` — generate a Bag of Words vector
- `tfidf` — calculate TF-IDF across 2 to 10 documents
- `similarity` — calculate BoW or TF-IDF cosine similarity

## MCP for AI agents

Start a local stdio MCP server with the same eight deterministic analysis
operations:

```bash
npx --yes textanalysis-tools mcp
```

The server exposes `analyze_text`, `word_frequency`, `keyword_density`,
`ngram_analysis`, `bag_of_words`, `compare_texts`, `tfidf`, and
`text_similarity` as read-only tools with validated inputs and structured
results. Text arguments stay in the local process. Explicit public URL inputs
are downloaded for analysis.

## Examples

```bash
textanalysis frequency article.txt
cat article.txt | textanalysis density --keywords "text analysis,SEO" --format json
textanalysis ngram https://example.com/article --size 3 --format csv
textanalysis tfidf draft.txt competitor.txt --output tfidf.json --format json
textanalysis similarity draft.txt competitor.txt --method tfidf
```

Common options include `--language auto|en|ru|uk|es`, `--keep-stopwords`,
`--stopwords <file>`, `--top <number>`, `--format table|json|csv`, and
`--output <file>`.

Full CLI documentation is available at
[textanalysis.tools/cli](https://textanalysis.tools/cli). The same analysis
methods are also available through the web tools and public API. See the
[agent integration guide](https://textanalysis.tools/agents) for MCP and
OpenAPI setup.

## License

The npm CLI package is available under the [MIT License](./LICENSE).
