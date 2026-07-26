# textanalysis-tools

Local-first command-line tools for word frequency, keyword density, Bag of
Words, TF-IDF, n-grams, text comparison, and cosine similarity.

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

## Examples

```bash
textanalysis frequency article.txt
cat article.txt | textanalysis density --keywords "text analysis,SEO" --format json
textanalysis ngram https://example.com/article --size 3 --format csv
textanalysis tfidf draft.txt competitor.txt --output tfidf.json --format json
textanalysis similarity draft.txt competitor.txt --method tfidf
```

Common options include `--language auto|en|ru|uk`, `--keep-stopwords`,
`--stopwords <file>`, `--top <number>`, `--format table|json|csv`, and
`--output <file>`.

Full documentation and the web tools are available at
[textanalysis.tools](https://textanalysis.tools/).

## License

The npm CLI package is available under the [MIT License](./LICENSE).
