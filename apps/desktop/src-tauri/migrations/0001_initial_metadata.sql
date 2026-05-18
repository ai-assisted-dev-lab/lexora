-- 0001_initial_metadata
--
-- Creates a general-purpose key-value table for application-level metadata
-- that does not belong in user settings (e.g. database creation timestamp).
-- The schema version itself is tracked by `schema_migrations`; this table
-- holds supplementary persistent state for the running app instance.

CREATE TABLE IF NOT EXISTS app_metadata (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Seed once; INSERT OR IGNORE makes the statement safe to re-run manually.
INSERT OR IGNORE INTO app_metadata (key, value)
VALUES
    ('db_created_at', strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('app_version',   '0.1.0');
