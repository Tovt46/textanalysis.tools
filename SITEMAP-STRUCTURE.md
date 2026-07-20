# Sitemap structure

Public sitemap: `https://bow-zipf-lab.tovt7.chatgpt.site/sitemap.xml`

The sitemap contains eight canonical, indexable HTTPS URLs:

- Analyzer: `/`, `/ru`, `/uk`
- Bag of Words guide: `/bag-of-words-model`, `/ru/bag-of-words-model`, `/uk/bag-of-words-model`
- English comparison guide: `/bag-of-words-vs-word2vec`
- English API documentation: `/api-docs`

English is the default language. Redirecting `/en` is intentionally excluded because only final canonical URLs belong in the sitemap. The complete English, Russian, Ukrainian, and `x-default` alternate sets are declared in each page's HTML head rather than duplicated in the sitemap.

The sitemap is declared in `/robots.txt`. `lastmod` reflects the latest content deployment and should only change when page content changes.

The sitemap uses the minimal Google-supported tags: `urlset`, `url`, `loc`, and `lastmod`. It uses explicit line breaks and two-space indentation without an XSL presentation layer. Both GET and HEAD return HTTP 200 with an `application/xml` content type.
