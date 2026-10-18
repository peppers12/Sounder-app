# Sounder Crew Report migration

Status: **staging deployed and API-tested; production deployed at sounderreport.com; preview crew login, submissions, daily closeout, administrator retrieval and PDF export passed; main-domain administrator sign-in, persisted report retrieval and PDF download passed; main-domain crew sign-in remains pending.**

- Staging: https://staging.sounderreport.com
- Production candidate: https://preview.sounderreport.com (separate production database; permanent accounts configured)
- Production: https://sounderreport.com (attached to sounder-app after preview verification)
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

`wrangler.jsonc` defaults to staging. Production must be selected explicitly; its custom domain is sounderreport.com. The encrypted Worker secret `AUTH_PEPPER` is required; never store its value in this repository. The production candidate has its own encrypted pepper and has independent permanent accounts. The schema migrations are additive and contain no private records or credentials.

The connected Cloudflare API deployed `dist/worker.mjs`, produced by `npm run bundle`. That deterministic bundle embeds static text assets so API deployments need only one Worker module; the source backend and frontend are the same as the standard assets-binding deployment. Build output is ignored by Git. Keep deployments and code commits in sync.

Initial credentials and setup tokens are generated outside the repository by `scripts/prepare-test-credentials.mjs`. That script is for migration/testing and must never run as an application endpoint. Setup tokens are random, stored hashed in D1, expire, and can be used once. Issue a new token through the authorized Cloudflare connector if a reset is needed; invalidate old unused tokens. No public registration is available.

## Validation

Run `npm ci && npm test`. Tests use synthetic fixtures, local workerd/D1 and JSDOM:

- 27 backend authentication, authorization, validation, CSRF, idempotency, persistence, rate-limit, logout and setup checks.
- 16 frontend submission, failed-report retry, daily closeout, stored HTML injection, and individual/combined PDF checks.
- `tests/live-api.py` separately exercised 20 checks against deployed staging, including both logins, D1 persistence, role isolation, duplicate retry, daily closeout, retrieval and logout. It requires private credentials outside the repository and writes only synthetic evidence outside the repository.
- PDF output was rendered and inspected; PDF libraries were upgraded to patched versions after an audit identified vulnerabilities in the initial versions.

These automated checks do not replace the remaining authenticated desktop/mobile browser checks. Do not mark production complete until the real domain and `/admin` have been exercised after cutover.

## Final production verification

1. Permanent staging and production accounts are configured, with independent peppers and databases. Setup links are single-use. Never request passwords in chat.
2. Preview production crew submissions and daily closeout persisted two synthetic reports totaling 20 passengers. Administrator retrieval and combined PDF download passed. Both interfaces were exercised at a 390px frame width; header/card overflow was corrected and no horizontal document overflow remained. This is responsive Chromium verification, not physical iOS/Android testing. A download-event check inside the test iframe timed out; top-level PDF export succeeded. The temporary responsive harness was removed from the deployed release.
3. Production D1 contains only synthetic migration tests. No private employee data was imported. Remove synthetic reports after final authenticated main-domain verification.
4. The tested release is deployed at sounderreport.com, including /admin. Main-domain crew sign-in requires user credential verification (the first attempt was rejected). Main-domain administrator login, retrieval of the preview-created records and PDF download passed. Complete crew sign-in/submission and logout checks on the main domain before declaring completion.
5. Email remains an explicit limitation until authorized/configured and tested. No additional publication approval is needed beyond the user's existing instruction once release gates pass.
