# Sounder Crew Report

Production: https://sounderreport.com  
Administrator: https://sounderreport.com/admin  
Staging: https://staging.sounderreport.com

Status: **Cloudflare migration deployed and live production workflows verified on October 18, 2026.**

## Reporting and authentication

The original employee and administrator layouts, North/South schedules, assignments, station times, passenger activity, bikes/ADA counts, duty and crew fields, delays, mechanical issues, consist, door override and signoffs are preserved. The application is independent and is not connected to official company systems. Schedule accuracy is not certified by this migration.

Train completion requires a database receipt. Unsent reports stay on the device with a retry button and stable submission identifiers; lost-response retries do not duplicate records. Daily closeout requires receipts for every assignment train and persists the combined report. Administrator retrieval includes pagination across the original rolling 90-day view; older records are not automatically deleted.

The owner configured a shared crew login and a separate administrator login. Passwords use salted PBKDF2-SHA256 hashes with an encrypted Worker-secret pepper. Random opaque Secure/HttpOnly/SameSite=Strict session cookies expire after eight hours; only session hashes are stored, and logout revokes them. Rate limits, JSON/body limits, same-origin mutation checks, parameterized SQL, output escaping and a restrictive CSP protect the application. Setup links expire and work once; no public registration is available.

Production uses Worker `sounder-app` and D1 `sounder-reports`; staging uses Worker `sounder-staging` and D1 `sounder-reports-staging`. They have separate peppers, accounts and sessions. Both workers.dev routes and preview URLs are disabled. The additional preview.sounderreport.com hostname serves the production Worker/database and is not a separate staging environment.

## Deployment and source

`wrangler.jsonc` defaults to staging; select the production environment explicitly for the main domain. Never commit secret values. `npm run bundle` creates `dist/worker.mjs`, embedding local frontend assets for deployment through the connected Cloudflare API. Build output is ignored by Git.

Initial production deployment ID: `a804641567c649ddbb2ab6910116b015`. The temporary responsive verification harness was removed before the release. The original Hatchable application was neither modified nor deleted, and private employee records were not migrated.

## Verification

- 38 automated backend/security/persistence checks and 22 frontend/XSS/PDF checks passed with `npm test`.
- 20 live staging API checks previously passed, including role isolation, persistence, duplicate-safe retries and logout.
- Live production crew and administrator sign-ins passed at sounderreport.com.
- Both assignment train submissions received database receipts; daily closeout persisted and cleared the form.
- The live administrator retrieved those reports, including records first created on the preview hostname, confirming persistence across sessions and hosts.
- Individual/combined PDFs passed frontend tests; live staging individual/combined and live production combined downloads succeeded. Production PDF content contained the expected train/crew/station details.
- Crew and administrator logout passed; revisiting the protected crew root returned to login.
- Phone-width Chromium testing exercised the crew workflow, daily closeout and administrator report details at a 390px frame width. Header/card overflow was corrected; both documents fit their available width.
- All four production synthetic train reports, their receipt/outbox records and both synthetic daily closeouts were removed by exact identifiers. The production administrator confirmed zero reports after cleanup. Permanent accounts remain configured.
- Anonymous administrator API requests return 401; the temporary QA route returns 404. No Peptide Tracker references remain in current project files or public application addresses.

## Known limitations

Automatic email delivery is disabled. Cloudflare Email Sending setup returned Unauthorized. Enabling delivery requires an authorized provider/domain, approved sender/recipients, retry implementation and a successful delivery test. Do not enable EMAIL_ENABLED and assume mail delivery works. PDFs can be downloaded and manually attached/shared; native sharing availability depends on the device/browser.

Mobile verification used responsive Chromium frames, not physical iOS/Android devices. A download-event check inside the temporary srcdoc test iframe timed out; the normal top-level production PDF download passed. Native device share sheets, installed-PWA behavior and operating-system notifications were not verified.

The Cloudflare hosting account retains its existing internal account name; the Sounder application and public URLs use Sounder naming. No unrelated projects or account-wide settings were renamed.

## Administrator corrections

Open a report from History or Today and choose Edit Report. Administrators can correct crew/duty fields, station times and delay reasons, passenger/bike/ADA counts, station passenger activity, issues/consist, door override and signoffs. A correction reason is required. Line, assignment, train and report date stay fixed to preserve daily report membership. Each correction saves its administrator, timestamp, reason and before/after values in sounder_report_edits. Concurrent stale saves are rejected. Daily passenger totals update in the same database transaction; original submission receipts remain retry-safe. Apply migrations/0003_admin_edits.sql once before deploying this version. Crew View has been removed from the administrator header.
