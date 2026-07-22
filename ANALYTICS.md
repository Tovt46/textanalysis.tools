# Analytics setup

The application renders no Google Analytics scripts unless a GA4 measurement
ID is configured. Submitted text, analyzed URLs, and result-table terms are
never included in analytics events.

## GA4 environment variables

Configure these in the production hosting environment:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=replace-with-a-measurement-protocol-secret
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` enables browser analytics. The two server-only
variables enable aggregate Measurement Protocol events for public API usage.
`GA_API_SECRET` must never be exposed to browser code or committed to Git.

## Event taxonomy

| Event | Trigger | Useful parameters |
| --- | --- | --- |
| `analysis_started` | User submits an analyzer | `tool`, `source_type`, `text_language` |
| `url_analysis_started` | User submits a URL | `tool`, `text_language` |
| `analysis_completed` | UI analysis succeeds | `tool`, `source_type`, `text_language`, `word_count` |
| `comparison_result_saved` | Result A is saved locally | `tool`, `word_count` |
| `comparison_completed` | Result B succeeds | `tool`, `source_type` |
| `language_changed` | User changes analysis language | `tool`, `text_language`, `control` |
| `analysis_error` | UI analysis fails | `tool`, `source_type`, truncated `error_message` |
| `result_exported` | CSV or JSON is downloaded | `tool`, `format`, `row_count` |
| `api_analysis` | Public API request succeeds | `operation`, `source_type`, `text_language` |
| `api_error` | Public API request fails | `operation` |

In GA4 Admin, mark `analysis_completed` as a key event if successful analyses
are the primary product outcome. Register `tool`, `source_type`, and
`text_language` as event-scoped custom dimensions when those breakdowns are
needed in reports.

## Google Search Console sitemap check

The repository exposes `https://textanalysis.tools/sitemap.xml` and declares it
in `robots.txt`. Submission status itself must be checked in the authenticated
Search Console property:

1. Open the `https://textanalysis.tools/` URL-prefix or domain property.
2. Go to **Indexing → Sitemaps**.
3. Submit `https://textanalysis.tools/sitemap.xml` if it is not listed.
4. Confirm the status is **Success** and compare discovered pages with the
   canonical URLs documented in `SITEMAP-STRUCTURE.md`.

## Monthly report: impressions → clicks → analyses

Use one row per month and preserve the same date range and timezone across
sources.

| Metric | Source | Definition |
| --- | --- | --- |
| Impressions | Search Console | Total Web search impressions for the site |
| Clicks | Search Console | Total Web search clicks for the site |
| Organic CTR | Calculated | `clicks ÷ impressions` |
| Analyses | GA4 | Event count for `analysis_completed`, filtered to Organic Search when reporting acquisition efficiency |
| Click → analysis rate | Calculated | `analyses ÷ clicks` |

Add a landing-page breakdown beneath the total row. This reveals whether a new
tool page earns search visibility but fails to start analyses, or converts
well but has too few impressions. Keep public API events in a separate table;
they do not represent browser sessions or search landing-page conversion.
