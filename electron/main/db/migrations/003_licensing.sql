-- Offline licensing v2: bind the license to a permanent School ID + Device ID
-- and store the Ed25519-signed activation code. The old license row only held
-- an HMAC token; these columns carry the new signed-license fields. Existing
-- rows get NULLs and are treated as "needs activation" until a code is applied
-- (the app re-issues a provisional license on next launch after setup).

ALTER TABLE schools ADD COLUMN school_id TEXT;

ALTER TABLE license ADD COLUMN school_id TEXT;
ALTER TABLE license ADD COLUMN device_id TEXT;
ALTER TABLE license ADD COLUMN activated_at TEXT;
-- 1 while running on the auto-issued first-year provisional license; a signed
-- ELIGNITE activation code sets this back to 0.
ALTER TABLE license ADD COLUMN provisional INTEGER NOT NULL DEFAULT 0;

-- Small key/value store for launch-time bookkeeping (e.g. the last month an
-- update reminder was shown) so each reminder fires once per period.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
