-- 0002_core_schema
--
-- Core product schema for Lexora V1.
-- Covers: user accounts, vocabulary content (packs → decks → words → senses →
-- examples, pronunciations, word_relations), the user library (deck_subscriptions),
-- FTS5 search indexes, and a data_provenance audit table.
--
-- Excluded intentionally (later migrations):
--   review_cards, review_logs, sessions  → Milestone 4 (FSRS)
--   achievement_definitions, user_achievements, daily_progress, user_xp
--                                        → Milestone 5 (Gamification)
--   backups                              → Milestone 6
--
-- All timestamp columns store ISO 8601 UTC strings (TEXT).
-- Booleans are stored as INTEGER (0 = false, 1 = true).
-- Tables are created in dependency order (parents before children).

-- ── 1. Content packs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS packs (
    id               INTEGER PRIMARY KEY,
    slug             TEXT    UNIQUE NOT NULL,
    name             TEXT    NOT NULL,
    description      TEXT,
    version          TEXT    NOT NULL DEFAULT '0.1.0',
    author           TEXT,
    cover_image_path TEXT,
    -- Where this pack came from.
    source           TEXT    NOT NULL DEFAULT 'bundled'
                                 CHECK (source IN ('bundled', 'downloaded', 'imported')),
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 2. Decks ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS decks (
    id               INTEGER PRIMARY KEY,
    -- NULL pack_id = standalone deck not part of a published pack.
    pack_id          INTEGER REFERENCES packs(id) ON DELETE CASCADE,
    slug             TEXT    UNIQUE NOT NULL,
    name             TEXT    NOT NULL,
    description      TEXT,
    cover_image_path TEXT,
    -- Denormalized count kept in sync by the application layer.
    word_count       INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
    difficulty       TEXT    CHECK (difficulty IS NULL OR
                                   difficulty IN ('beginner', 'intermediate', 'advanced')),
    -- JSON array of tag strings e.g. '["ielts","business"]'.
    tags             TEXT,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 3. Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT    UNIQUE NOT NULL,
    -- Argon2 hash; the plaintext password is never stored.
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'learner'
                              CHECK (role IN ('owner', 'learner')),
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    last_login_at TEXT
);

-- ── 4. User settings (1:1 with users) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
    user_id              INTEGER PRIMARY KEY
                                 REFERENCES users(id) ON DELETE CASCADE,
    daily_goal_cards     INTEGER NOT NULL DEFAULT 20  CHECK (daily_goal_cards >= 1),
    notification_enabled INTEGER NOT NULL DEFAULT 1   CHECK (notification_enabled IN (0, 1)),
    -- HH:MM local time string, e.g. '08:00'.
    notification_time    TEXT             DEFAULT '08:00',
    audio_autoplay       INTEGER NOT NULL DEFAULT 1   CHECK (audio_autoplay IN (0, 1)),
    review_order         TEXT    NOT NULL DEFAULT 'fsrs'
                                         CHECK (review_order IN ('fsrs', 'random', 'new_first')),
    -- Learner's preferred UI language ('en', 'vi', etc.).
    ui_language          TEXT    NOT NULL DEFAULT 'en',
    updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 5. Deck subscriptions (user library) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS deck_subscriptions (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id  INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    added_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (user_id, deck_id)
);

-- ── 6. Words (vocabulary items / headwords) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS words (
    id             INTEGER PRIMARY KEY,
    pack_id        INTEGER REFERENCES packs(id) ON DELETE CASCADE,
    headword       TEXT    NOT NULL,
    part_of_speech TEXT,
    ipa_uk         TEXT,
    ipa_us         TEXT,
    -- Corpus frequency rank; lower number = more common word.
    frequency_rank INTEGER CHECK (frequency_rank IS NULL OR frequency_rank >= 1),
    cefr_level     TEXT    CHECK (cefr_level IS NULL OR
                                  cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 7. Senses (vocabulary senses — one word has one or more meanings) ─────────

CREATE TABLE IF NOT EXISTS senses (
    id            INTEGER PRIMARY KEY,
    word_id       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    -- 0-based display order within the parent word.
    sense_index   INTEGER NOT NULL CHECK (sense_index >= 0),
    definition_en TEXT    NOT NULL,
    definition_vi TEXT,
    -- Usage register: formal, informal, slang, archaic, etc.
    register      TEXT,
    -- Subject domain: medicine, law, technology, etc.
    domain        TEXT,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (word_id, sense_index)
);

-- ── 8. Examples (usage examples per sense) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS examples (
    id          INTEGER PRIMARY KEY,
    sense_id    INTEGER NOT NULL REFERENCES senses(id) ON DELETE CASCADE,
    sentence_en TEXT    NOT NULL,
    sentence_vi TEXT,
    -- Relative path inside the audio package directory.
    audio_path  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 9. Pronunciations (vocabulary pronunciations — audio per word/dialect) ────

CREATE TABLE IF NOT EXISTS pronunciations (
    id         INTEGER PRIMARY KEY,
    word_id    INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    dialect    TEXT    NOT NULL CHECK (dialect IN ('uk', 'us')),
    -- Relative path inside the audio package directory.
    audio_path TEXT    NOT NULL,
    tts_engine TEXT    CHECK (tts_engine IS NULL OR
                              tts_engine IN ('bundled', 'edge-tts', 'gtts')),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── 10. Word relations (vocabulary relations — synonyms, antonyms, etc.) ──────

CREATE TABLE IF NOT EXISTS word_relations (
    id            INTEGER PRIMARY KEY,
    from_word_id  INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    to_word_id    INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    relation_type TEXT    NOT NULL
                      CHECK (relation_type IN ('synonym', 'antonym', 'collocation', 'see_also')),
    -- Prevent self-referential relations.
    CHECK (from_word_id != to_word_id)
);

-- ── 11. Deck words (deck items — M:N words ↔ decks) ──────────────────────────

CREATE TABLE IF NOT EXISTS deck_words (
    deck_id  INTEGER NOT NULL REFERENCES decks(id)  ON DELETE CASCADE,
    word_id  INTEGER NOT NULL REFERENCES words(id)  ON DELETE CASCADE,
    -- Display order within the deck; application layer keeps this monotonic.
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    PRIMARY KEY (deck_id, word_id)
);

-- ── 12. Full-text search ──────────────────────────────────────────────────────
--
-- External-content FTS5 tables: the tokenised content lives in the FTS index;
-- the source-of-truth stays in the base tables.  Triggers below keep the
-- indexes in sync for INSERT / UPDATE / DELETE on the base tables.

CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
    headword,
    content='words',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS words_fts_ai AFTER INSERT ON words BEGIN
    INSERT INTO words_fts(rowid, headword) VALUES (new.id, new.headword);
END;

CREATE TRIGGER IF NOT EXISTS words_fts_ad AFTER DELETE ON words BEGIN
    INSERT INTO words_fts(words_fts, rowid, headword) VALUES ('delete', old.id, old.headword);
END;

CREATE TRIGGER IF NOT EXISTS words_fts_au AFTER UPDATE OF headword ON words BEGIN
    INSERT INTO words_fts(words_fts, rowid, headword) VALUES ('delete', old.id, old.headword);
    INSERT INTO words_fts(rowid, headword) VALUES (new.id, new.headword);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS senses_fts USING fts5(
    definition_en,
    definition_vi,
    content='senses',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS senses_fts_ai AFTER INSERT ON senses BEGIN
    INSERT INTO senses_fts(rowid, definition_en, definition_vi)
    VALUES (new.id, new.definition_en, new.definition_vi);
END;

CREATE TRIGGER IF NOT EXISTS senses_fts_ad AFTER DELETE ON senses BEGIN
    INSERT INTO senses_fts(senses_fts, rowid, definition_en, definition_vi)
    VALUES ('delete', old.id, old.definition_en, old.definition_vi);
END;

CREATE TRIGGER IF NOT EXISTS senses_fts_au AFTER UPDATE OF definition_en, definition_vi ON senses BEGIN
    INSERT INTO senses_fts(senses_fts, rowid, definition_en, definition_vi)
    VALUES ('delete', old.id, old.definition_en, old.definition_vi);
    INSERT INTO senses_fts(rowid, definition_en, definition_vi)
    VALUES (new.id, new.definition_en, new.definition_vi);
END;

-- ── 13. Data provenance audit ─────────────────────────────────────────────────
--
-- Optional supplementary audit log recording where each content row came from.
-- The base content tables (packs, words, senses …) each carry inline source /
-- pack_id / timestamp columns for quick access; this table provides a richer
-- import-history record when needed.

CREATE TABLE IF NOT EXISTS data_provenance (
    id          INTEGER PRIMARY KEY,
    -- Which table and row this record belongs to.
    table_name  TEXT    NOT NULL,
    row_id      INTEGER NOT NULL,
    source      TEXT    NOT NULL DEFAULT 'manual'
                            CHECK (source IN ('bundled', 'downloaded', 'imported', 'manual')),
    -- The pack that brought in this content (NULL for manual entries).
    pack_id     INTEGER REFERENCES packs(id) ON DELETE SET NULL,
    imported_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    -- Free-text notes, e.g. import batch ID or file name.
    notes       TEXT,
    -- One provenance record per (table, row) pair.
    UNIQUE (table_name, row_id)
);

-- ── 14. Indexes ───────────────────────────────────────────────────────────────

-- words
CREATE INDEX IF NOT EXISTS idx_words_pack        ON words(pack_id);
CREATE INDEX IF NOT EXISTS idx_words_headword    ON words(headword);
CREATE INDEX IF NOT EXISTS idx_words_cefr        ON words(cefr_level);

-- senses
CREATE INDEX IF NOT EXISTS idx_senses_word       ON senses(word_id);

-- examples
CREATE INDEX IF NOT EXISTS idx_examples_sense    ON examples(sense_id);

-- pronunciations
CREATE INDEX IF NOT EXISTS idx_pronunciations_word    ON pronunciations(word_id);

-- word_relations
CREATE INDEX IF NOT EXISTS idx_word_relations_from   ON word_relations(from_word_id);
CREATE INDEX IF NOT EXISTS idx_word_relations_to     ON word_relations(to_word_id);

-- deck_words
CREATE INDEX IF NOT EXISTS idx_deck_words_deck       ON deck_words(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_words_word       ON deck_words(word_id);

-- deck_subscriptions
CREATE INDEX IF NOT EXISTS idx_deck_subscriptions_user  ON deck_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_deck_subscriptions_deck  ON deck_subscriptions(deck_id);

-- decks
CREATE INDEX IF NOT EXISTS idx_decks_pack            ON decks(pack_id);

-- data_provenance
CREATE INDEX IF NOT EXISTS idx_data_provenance_pack  ON data_provenance(pack_id);
