-- Run once on an existing database, before deploying the new Worker.
ALTER TABLE submissions ADD COLUMN archived_at TEXT;
ALTER TABLE submissions ADD COLUMN cleanup_started_at TEXT;
-- Existing archived submissions receive a full new retention period.
UPDATE submissions SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE state = 'archived' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS submissions_retention ON submissions(state, archived_at);
