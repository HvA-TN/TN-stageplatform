CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  project_json TEXT NOT NULL,
  contact_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'archived'))
);
CREATE INDEX IF NOT EXISTS submissions_queue ON submissions(state, created_at);
