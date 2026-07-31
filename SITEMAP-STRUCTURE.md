# Sitemap structure

Public sitemap: `https://textanalysis.tools/sitemap.xml`

The sitemap contains 22 canonical page families in four languages: 88 HTTPS
URLs in total.

- product homepages
- tool and guide directories
- API, CLI, and AI-agent integration documentation
- eight interactive text-analysis tools
- eight method and workflow guides

English is the default language. Every page family has reciprocal `en`, `ru`,
`uk`, `es`, and `x-default` alternates. Redirecting `/en` is intentionally
excluded because only final canonical URLs belong in the sitemap.

The sitemap is declared in `/robots.txt`. `lastmod` reflects the latest content
deployment and should change only when page content changes.

The XML uses `urlset`, `url`, `loc`, `lastmod`, and `xhtml:link` alternate
elements. GET and HEAD return HTTP 200 with an `application/xml` content type.
