CREATE TABLE IF NOT EXISTS sounder_accounts (
 role TEXT PRIMARY KEY CHECK(role IN ('employee','admin')),
 username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sounder_sessions (
 token_hash TEXT PRIMARY KEY, role TEXT NOT NULL,
 account_version INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON sounder_sessions(expires);
CREATE TABLE IF NOT EXISTS sounder_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sounder_receipts (
 id TEXT PRIMARY KEY, body_hash TEXT NOT NULL, report_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sounder_setup (
 token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sounder_email_outbox (
 report_id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'disabled',
 attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sounder_daily_reports (
 id TEXT PRIMARY KEY, line_label TEXT NOT NULL, assignment TEXT NOT NULL,
 report_date TEXT NOT NULL, report_ids TEXT NOT NULL, passengers INTEGER NOT NULL,
 saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
