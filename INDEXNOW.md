# IndexNow notifications

The `Notify IndexNow after deployment` workflow runs after successful main-branch CI. It waits until `/api/health` serves that exact validated revision, verifies the public ownership file, and collects the canonical sitemap pages from the deployed site. Manual runs are available on `main`:

```bash
gh workflow run indexnow.yml --ref main
```

The workflow is independent of the production smoke job. A smoke failure remains visible while IndexNow checks its own prerequisites: successful CI, matching healthy deployment, valid sitemap, canonical/indexable HTML, and matching public ownership proof.

## What gets submitted

Only new URLs or pages whose meaningful content or declared `lastmod` changed are submitted. Fingerprints cover page language, title, description and social metadata, canonical/hreflang links, structured data, visible text, links, images, and form labels. Next build scripts, hydration payloads, runtime IDs, hidden fields, stylesheet classes, and preload ordering do not cause notifications. Each localized URL is handled separately.

The existing 94-page inventory was captured before this integration as a baseline without IndexNow notifications. Bing receives that inventory through the submitted XML sitemap. The initial release's four genuinely updated `/agents` pages document the existing hosted HTTP MCP interface and exercise the new notification path. Removed URLs are not submitted by this integration.

An unchanged deployment sends no notification and does not rewrite the saved baseline. If the same URL changes again within five minutes of its last accepted submission, the job waits in bounded intervals, then rechecks the exact deployed content before sending.

## Ownership and state

`indexnow.config.json` holds the canonical host, Bing endpoint, and public ownership identifier. Its matching `public/<identifier>.txt` file is deployed with Next.js. This proof file is intentionally public; no Bing account credential or API subscription is used.

`automation/indexnow-state` is an orphan Git branch containing only `manifest.json`: public URLs, semantic fingerprints, content dates, deployment revision, and submission timestamps/statuses. It does not deploy the app. This durable checkpoint avoids cache-expiry resubmissions. The workflow has `contents: write` only in its notification job, disables persisted checkout credentials, and passes its temporary GitHub token only to the state/submission step. The authenticated state helper can call only `api.github.com`; public page and Bing requests use separate unauthenticated clients.

State advances only after HTTP 200 or 202 acceptance. HTTP 202 is explicitly reported as key verification pending. Rejections, timeouts, invalid/corrupt state, inaccessible repositories, or concurrent checkpoint changes fail the job without overwriting the previous accepted state. A missing state branch initializes a new baseline without bulk-submitting historical pages.

## Verification and receipts

`npm test` covers semantic change detection, unchanged builds, ownership serving, deployment drift, provider failures, notification debouncing, and durable checkpoint races. Tests use local fixtures/mocked providers and never submit live URLs.

`npm run indexnow:plan` previews against the live site; `npm run indexnow:notify` applies the plan. Both require `EXPECT_DEPLOYMENT_REVISION`, `GITHUB_REPOSITORY`, and `INDEXNOW_GITHUB_TOKEN` for the trusted repository. GitHub Actions supplies these automatically. Reports and provider receipts are written to `test-results/indexnow/` (override with `INDEXNOW_OUTPUT_DIR`) and retained as workflow artifacts for 14 days.

HTTP acceptance confirms that Bing received the notification. Indexing and Webmaster Tools reporting can happen later. See the [IndexNow protocol](https://www.indexnow.org/documentation) and [automation guidance](https://www.indexnow.org/faq).
