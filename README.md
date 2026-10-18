# Sounder Crew Report — Cloudflare migration starter

**Not production ready.** This is a secure-by-default infrastructure starter, not a copy of the finished Hatchable application. The employee interface, administrator interface, full API parity, data migration, email provider, employee authentication, and testing remain to be completed.

## Contents
- Cloudflare Worker + static asset configuration
- Cloudflare D1 database schema matching existing Hatchable report fields
- Admin login using environment secrets and short-lived signed sessions
- Admin report listing API
- Employee report submissions intentionally disabled until proper authentication and anti-abuse protection are added

## Setup
1. Upload these files to the **existing** `peppers12/Sounder-app` repository. Do not commit credentials or employee reports.
2. In Cloudflare, create a D1 database named `sounder-reports` and replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with its ID.
3. Apply schema: `npx wrangler d1 migrations apply sounder-reports --remote` (after authenticating Wrangler to the appropriate Cloudflare account).
4. Set Worker secrets `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (long random string). Do **not** put them in GitHub or in this archive. For example, use Cloudflare's Workers settings Secrets UI.
5. Configure the Cloudflare Workers Git integration to build/deploy this repository using `npx wrangler deploy`. Set up the GitHub repo's source files before deployment.
6. Test on the Workers preview URL before connecting `sounderreport.com`.

## Compatibility caveats
- The existing Hatchable client uses `x-demo-session` and expects `/api/admin/login`, `/api/admin/session`, `/api/admin/reports`, and `/api/send-demo-report`; the admin session response should be checked against the original frontend during porting.
- Original Hatchable APIs use PostgreSQL and Hatchable email; D1 uses SQLite and no built-in email sender.
- Do not import real employee information without authorization and an appropriate data-retention/security plan.
- This starter does not expose the demo admin credentials or the report email address.
