CREATE TABLE IF NOT EXISTS sounder_viewer_accounts (
 username TEXT PRIMARY KEY,
 salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);
