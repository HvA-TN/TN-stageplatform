
-- R2 quota: bytes are reserved before upload. Existing objects are counted once
-- through the authenticated storage initialization endpoint before accepting work.
CREATE TABLE IF NOT EXISTS storage_quota (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  ready INTEGER NOT NULL DEFAULT 0 CHECK (ready IN (0, 1)),
  cursor TEXT
);
INSERT OR IGNORE INTO storage_quota(id) VALUES (1);
CREATE TABLE IF NOT EXISTS storage_files (
  object_key TEXT PRIMARY KEY,
  bytes INTEGER NOT NULL CHECK (bytes >= 0)
);
CREATE TABLE IF NOT EXISTS storage_receipts (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS storage_admit BEFORE INSERT ON storage_receipts BEGIN
  SELECT CASE WHEN COALESCE((SELECT ready FROM storage_quota WHERE id = 1), 0) != 1
    THEN RAISE(ABORT, 'STORAGE_NOT_READY') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM storage_receipts WHERE id = NEW.id AND fingerprint != NEW.fingerprint)
    THEN RAISE(ABORT, 'STORAGE_CONFLICT') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM storage_receipts WHERE id = NEW.id)
    AND (SELECT used_bytes FROM storage_quota WHERE id = 1) >= 8000000000
    THEN RAISE(ABORT, 'STORAGE_FULL') END;
END;
CREATE TRIGGER IF NOT EXISTS storage_reserve BEFORE INSERT ON storage_files
WHEN NOT EXISTS(SELECT 1 FROM storage_files WHERE object_key = NEW.object_key) BEGIN
  SELECT CASE WHEN (SELECT ready FROM storage_quota WHERE id = 1) = 1
    AND (SELECT used_bytes FROM storage_quota WHERE id = 1) + NEW.bytes > 8000000000
    THEN RAISE(ABORT, 'STORAGE_FULL') END;
END;
CREATE TRIGGER IF NOT EXISTS storage_count AFTER INSERT ON storage_files BEGIN
  UPDATE storage_quota SET used_bytes = used_bytes + NEW.bytes WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS storage_release AFTER DELETE ON storage_files BEGIN
  UPDATE storage_quota SET used_bytes = used_bytes - OLD.bytes WHERE id = 1;
END;
