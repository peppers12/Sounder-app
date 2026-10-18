ALTER TABLE demo_trip_reports ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE demo_trip_reports ADD COLUMN updated_at TEXT;
CREATE TABLE sounder_report_edits (
 id TEXT PRIMARY KEY,
 report_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 administrator TEXT NOT NULL,
 reason TEXT NOT NULL,
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL,
 edited_at TEXT NOT NULL,
 UNIQUE(report_id, revision)
);
CREATE INDEX idx_report_edits_report ON sounder_report_edits(report_id, revision);
