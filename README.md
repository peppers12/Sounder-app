# Sounder Crew Report — Cloudflare migration

**Status: Source files migrated; NOT ready for production or employee use.**

## Included
- Original Hatchable employee reporting interface: `public/index.html`, `public/app.js`, `public/styles.css`
- Original administrator interface, alerts, PDF export, and PWA assets: `public/admin*`
- Cloudflare Worker: `src/index.js`
- D1 schema: `migrations/0001_reports.sql`
- Cloudflare Worker configuration: `wrangler.jsonc`

## Routes
- `/` — employee reporting interface
- `/admin` and `/admin.html` — administrator dashboard
- `/api/admin/login`, `/api/admin/session`, `/api/admin/reports` — admin APIs
- `/api/send-demo-report` — **intentionally disabled (HTTP 503)** pending employee authentication, rate limits, and an email provider.

## Cloudflare setup still required
1. D1 database `sounder-reports` exists; the configured database ID is in `wrangler.jsonc`. Verify the `demo_trip_reports` table exists in that database (created manually via D1 Console). The migration now uses the same table name; do not re-run blindly against existing data.
2. Set Worker **encrypted secrets** `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` (random 32+ byte secret). Never commit credentials to GitHub.
3. Deploy to a temporary `workers.dev` address and test administrator login and D1 report queries. The employee screen currently saves to browser storage only.
4. Decide on employee authentication, abuse protection, report validation, outbound email service, retention policy, and authorized access before enabling submissions.
5. Test all flows on iPhone and desktop before connecting `sounderreport.com`. Existing Hatchable data is **not** copied to D1.

## Important
The original Hatchable application is unchanged. This repository is public: never commit employee records, passwords, API keys, or production secrets. The migrated frontend may still contain demo-only wording and should not be represented as an official operational reporting system.
