# Draft calculation scope

This standalone design draft runs locally in the browser. `browser-engine.js` is an esbuild bundle of the existing `app/lib/analyze.ts` pure functions, exported by `adapter.ts`. No user text is sent to a provider or API.

- Words and unique words count all source tokens using production HTML cleanup and tokenization, before stop-word filtering. Pure numbers are excluded by the production default. Character count measures the source JavaScript string length, including spaces and HTML markup if pasted. Reading time is an approximate whole-minute estimate at 200 words per minute (minimum one minute for nonempty tokenized text).
- Single-word rows use production keyword-density results: count / all source words. Stop-word filtering hides rows while preserving this denominator.
- Two- and three-word rows use production n-gram results: count / the number of source n-gram windows (`source words - n + 1`). Phrases remain adjacent in the original token stream. When stop words are excluded, only phrases made entirely of stop words are hidden.
- The result table shows up to 12 matching terms, the chart shows the ten most frequent terms in the complete result, and search filters the table. CSV and clipboard include every matching term, with density percentages. Text edits retain the last result for reference and disable exports until analysis runs again.
- Language detection and EN/RU/UK/ES stop-word lists come from the existing production engine. The 50,000-character cap is specific to this prototype. There are no SEO quality scores or recommendations inferred from frequency.
- Comparison, TF-IDF, similarity, URL input, and developer documentation link to the current service. Source text in the prototype is held only in page memory. Context snippets show up to three literal matches in source text; token normalization can create analyzed terms without a corresponding literal match.

Rebuild from the repository root:

```sh
node_modules/.bin/esbuild design/redesign-draft-2026-09-09/adapter.ts --bundle --format=iife --global-name=DraftEngine --platform=browser --target=es2020 --minify --outfile=design/redesign-draft-2026-09-09/browser-engine.js
```
