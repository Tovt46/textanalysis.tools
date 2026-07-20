# Sitemap structure

Public sitemap: `https://bow-zipf-lab.tovt7.chatgpt.site/sitemap.xml`

The sitemap contains six canonical, indexable HTTPS URLs organized into two multilingual page sets:

- Analyzer: `/`, `/ru`, `/uk`
- Bag of Words guide: `/bag-of-words-model`, `/ru/bag-of-words-model`, `/uk/bag-of-words-model`

Every URL includes the complete English, Russian, Ukrainian, and `x-default` alternate set. English is the default language. Redirecting `/en` is intentionally excluded because only final canonical URLs belong in the sitemap.

The sitemap is declared in `/robots.txt`. `lastmod` reflects the latest content deployment and should only change when page content changes.

The XML response is formatted with explicit line breaks and two-space indentation so its source remains readable without adding an XSL presentation layer.
