-- 0012_performance_indexes
--
-- Targeted indexes for the 20k-50k vocabulary item performance pass.
-- These keep the existing normalized schema and offline-first query flow, but
-- make the high-volume list/search paths use index scans instead of broad
-- table scans where SQLite can do so.

-- Discover/catalog filters and ordering.
CREATE INDEX IF NOT EXISTS idx_packs_source_name ON packs (source, name);
CREATE INDEX IF NOT EXISTS idx_decks_name_nocase ON decks (name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_decks_slug_nocase ON decks (slug COLLATE NOCASE);

-- Admin/Data Studio vocabulary prefix search, filters, and duplicate checks.
CREATE INDEX IF NOT EXISTS idx_words_headword_nocase ON words (headword COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_words_type_headword ON words (type, headword COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_words_review_status_headword
    ON words (review_status, headword COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_words_cefr_headword
    ON words (cefr_level, headword COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_words_duplicate_check
    ON words (headword COLLATE NOCASE, part_of_speech);

-- Library summaries and review lookups used by deck cards/detail previews.
CREATE INDEX IF NOT EXISTS idx_review_cards_user_word_state_due
    ON review_cards (user_id, word_id, state, due);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_word_result
    ON review_logs (user_id, word_id, result);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_deck_started
    ON study_sessions (user_id, deck_id, started_at, ended_at);
