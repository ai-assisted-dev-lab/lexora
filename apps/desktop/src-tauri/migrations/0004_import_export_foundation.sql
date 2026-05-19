-- 0004_import_export_foundation
--
-- Records import attempts for deck JSON imports. Content row provenance remains
-- in data_provenance; this table captures batch-level status and safe error
-- messages for the Settings import/export UI.

CREATE TABLE IF NOT EXISTS content_imports (
    id              INTEGER PRIMARY KEY,
    import_type     TEXT    NOT NULL CHECK (import_type IN ('deck_json', 'vocabulary_csv')),
    source_path     TEXT    NOT NULL,
    status          TEXT    NOT NULL CHECK (status IN ('imported', 'rejected', 'failed')),
    pack_slug       TEXT,
    deck_slug       TEXT,
    pack_id         INTEGER REFERENCES packs(id) ON DELETE SET NULL,
    deck_id         INTEGER REFERENCES decks(id) ON DELETE SET NULL,
    words_imported  INTEGER NOT NULL DEFAULT 0 CHECK (words_imported >= 0),
    error_message   TEXT,
    imported_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_content_imports_status
    ON content_imports(status, imported_at);

CREATE INDEX IF NOT EXISTS idx_content_imports_deck
    ON content_imports(deck_id);
