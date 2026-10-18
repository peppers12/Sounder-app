CREATE TABLE IF NOT EXISTS trip_reports (
 id TEXT PRIMARY KEY, line_label TEXT NOT NULL, assignment TEXT NOT NULL,
 train TEXT NOT NULL, direction TEXT NOT NULL, actuals TEXT NOT NULL DEFAULT '[]',
 bikes INTEGER NOT NULL DEFAULT 0, ada INTEGER NOT NULL DEFAULT 0,
 passengers INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'saved',
 report_date TEXT NOT NULL, saved_at TEXT NOT NULL,
 crew_info TEXT NOT NULL DEFAULT '{}', passenger_activity TEXT NOT NULL DEFAULT '[]',
 delays TEXT NOT NULL DEFAULT '[]', customer_service_issues TEXT NOT NULL DEFAULT '',
 mechanical_issues TEXT NOT NULL DEFAULT '[]', consist_info TEXT NOT NULL DEFAULT '',
 door_override_completed INTEGER NOT NULL DEFAULT 0,
 door_override_initials TEXT NOT NULL DEFAULT '', crew_signoff TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_trip_reports_date ON trip_reports(report_date, saved_at);
