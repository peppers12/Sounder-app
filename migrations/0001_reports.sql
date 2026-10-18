CREATE TABLE IF NOT EXISTS demo_trip_reports (
  id TEXT PRIMARY KEY,
  line_label TEXT NOT NULL,
  assignment TEXT,
  train TEXT,
  direction TEXT,
  actuals TEXT DEFAULT '[]',
  bikes INTEGER DEFAULT 0,
  ada INTEGER DEFAULT 0,
  passengers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'saved',
  report_date TEXT,
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  crew_info TEXT DEFAULT '{}',
  passenger_activity TEXT DEFAULT '[]',
  delays TEXT DEFAULT '[]',
  customer_service_issues TEXT,
  mechanical_issues TEXT DEFAULT '[]',
  consist_info TEXT,
  door_override_completed INTEGER DEFAULT 0,
  door_override_initials TEXT,
  crew_signoff TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_reports_date ON demo_trip_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_saved ON demo_trip_reports(saved_at);
