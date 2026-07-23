# Sitemap structure

Public sitemap: `https://textanalysis.tools/sitemap.xml`

The sitemap contains sixteen canonical, indexable HTTPS URLs:

- Product homepage: `/`, `/ru`, `/uk`
- Bag of Words analyzer: `/tools/bag-of-words-analyzer`, `/ru/tools/bag-of-words-analyzer`, `/uk/tools/bag-of-words-analyzer`
- Bag of Words guide: `/bag-of-words-model`, `/ru/bag-of-words-model`, `/uk/bag-of-words-model`
- English comparison guide: `/bag-of-words-vs-word2vec`
- English API documentation: `/api-docs`
- English tools directory: `/tools`
- English word-frequency tool: `/tools/word-frequency-counter`
- English keyword-density tool: `/tools/keyword-density-checker`
- English word-frequency guide: `/how-to-calculate-word-frequency`
- English keyword-density guide: `/keyword-density-formula`

English is the default language. Redirecting `/en` is intentionally excluded because only final canonical URLs belong in the sitemap. The product homepage, Bag of Words analyzer, and Bag of Words guide declare complete English, Russian, Ukrainian, and `x-default` alternate sets in their HTML head. English-only tool pages declare only `en` and `x-default`; nonexistent translations are not advertised with hreflang.

The sitemap is declared in `/robots.txt`. `lastmod` reflects the latest content deployment and should only change when page content changes.

The sitemap uses the minimal Google-supported tags: `urlset`, `url`, `loc`, and `lastmod`. It uses explicit line breaks and two-space indentation without an XSL presentation layer. Both GET and HEAD return HTTP 200 with an `application/xml` content type.
