# Sounder Crew Report migration

Status: **staging deployed and API-tested; staging administrator retrieval and individual/combined browser PDF exports verified; production candidate deployed, cutover pending production login setup and final verification.**

- Staging: https://staging.sounderreport.com
- Production candidate: https://preview.sounderreport.com (separate production database; accounts not provisioned yet)
- Production target: https://sounderreport.com (unchanged during staging work)
- Original Hatchable app: https://sounder-crew-report.hatchable.site (unchanged)
- Work branch: `work/sounder-app-build`

## Implemented

Original employee and administrator layouts, North/South schedules, assignments, actual station times, passenger activity, bikes/ADA counts, duty and crew fields, delays, mechanical issues, consist, door override, and signoffs are preserved. Server-side schedule validation uses a snapshot of the same original timetable. This migration does not certify timetable accuracy or connect the app to company systems; the original demo notices are retained.

The Worker uses parameterized D1 queries and atomic batches. A train is marked complete only after a database receipt. Unsent reports remain on the device with a retry button and stable submission identifiers. Lost-response retries do not duplicate records. Daily closeout validates all assignment train receipts, persists a daily report, and marks its train reports submitted. Administrator retrieval supports pagination across the original 90-day view without deleting older database records.

Crew authentication is a shared crew account, as selected by the owner. Administrator authentication is separate. Passwords are salted PBKDF2-SHA256 hashes with a Worker-secret pepper, 100,000 iterations, and a minimum 16-character setup password. The two passwords must differ. Login attempts are limited per role/IP. Random opaque session cookies are Secure, HttpOnly, SameSite=Strict and expire after eight hours. Only session hashes are stored; logout revokes them. Setup rotates both accounts and revokes all sessions. Mutations require the same Origin, JSON submissions are size-limited, and untrusted report text is HTML-escaped. CSP blocks inline scripts and external script execution.

PDF libraries are pinned and vendored locally with their licenses. Individual and filtered PDF exports are implemented. Email/share uses the device share sheet when supported, otherwise a download that the user can attach to email.

## Data separation and email

Staging uses `sounder-reports-staging`, separate from existing production D1 `sounder-reports`. No private Hatchable employee records were read or migrated. Only synthetic reports were used in tests.

Automatic email is **disabled and not implemented as an active delivery path**. Cloudflare Email Sending setup returned API error 2036 (Unauthorized). Each saved train gets a durable outbox row with state `disabled`; the UI states that email is not configured. Enabling delivery requires an authorized email provider/domain, an approved sender and recipient, retry delivery implementation, and a successful test. Do not toggle EMAIL_ENABLED and assume email works.

## Configuration and deployment

`wrangler.jsonc` defaults to staging. Production must be selected explicitly and is not attached to the domain yet. The encrypted Worker secret `AUTH_PEPPER` is required; never store its value in this repository. The production candidate has its own encrypted pepper and awaits independent account provisioning. The schema migrations are additive and contain no private records or credentials.

The connected Cloudflare API deployed `dist/worker.mjs`, produced by `npm run bundle`. That deterministic bundle embeds static text assets so API deployments need only one Worker module; the source backend and frontend are the same as the standard assets-binding deployment. Build output is ignored by Git. Keep deployments and code commits in sync.

Initial credentials and setup tokens are generated outside the repository by `scripts/prepare-test-credentials.mjs`. That script is for migration/testing and must never run as an application endpoint. Setup tokens are random, stored hashed in D1, expire, and can be used once. Issue a new token through the authorized Cloudflare connector if a reset is needed; invalidate old unused tokens. No public registration is available.

## Validation

Run `npm ci && npm test`. Tests use synthetic fixtures, local workerd/D1 and JSDOM:

- 27 backend authentication, authorization, validation, CSRF, idempotency, persistence, rate-limit, logout and setup checks.
- 16 frontend submission, failed-report retry, daily closeout, stored HTML injection, and individual/combined PDF checks.
- `tests/live-api.py` separately exercised 20 checks against deployed staging, including both logins, D1 persistence, role isolation, duplicate retry, daily closeout, retrieval and logout. It requires private credentials outside the repository and writes only synthetic evidence outside the repository.
- PDF output was rendered and inspected; PDF libraries were upgraded to patched versions after an audit identified vulnerabilities in the initial versions.

These automated checks do not replace the remaining authenticated desktop/mobile browser checks. Do not mark production complete until the real domain and `/admin` have been exercised after cutover.

## Remaining release gate

1. Owner has configured permanent staging accounts. Configure the separate production accounts through the one-time private setup page; never request passwords in chat.
2. Staging employee submission/daily closeout and administrator retrieval, individual/combined PDF downloads passed in the live browser. Complete remaining responsive/mobile verification and production authenticated checks.
3. Production D1 tables and independent pepper are provisioned; production contains no employee reports. No private employee data was imported.
4. Deploy the exact verified version, attach `sounderreport.com`, then repeat production smoke tests including `/admin`. Remove only the synthetic verification records and test sessions.
5. Email remains an explicit limitation until authorized/configured and tested. No additional publication approval is needed beyond the user's existing instruction once release gates pass.
