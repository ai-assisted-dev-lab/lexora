-- 0010_admin_vocabulary_fields
--
-- Adds two curator-facing columns to the `words` table so the owner-only
-- Data Studio can classify and triage the prebuilt vocabulary catalog:
--
--   * `type`           — entry kind (word/phrase/idiom/phrasal_verb/collocation).
--                        Existing rows default to 'word'.
--   * `review_status`  — editorial state. Existing rows default to 'unverified'
--                        so the curator immediately sees the full backlog.
--
-- Both columns are NOT NULL with safe defaults so the migration is purely
-- additive. CHECK constraints keep enums stable across the codebase.
-- Indexes are added because the Data Studio filters heavily by these fields.

ALTER TABLE words
ADD COLUMN type TEXT NOT NULL DEFAULT 'word'
    CHECK (type IN ('word', 'phrase', 'idiom', 'phrasal_verb', 'collocation'));

ALTER TABLE words
ADD COLUMN review_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (review_status IN ('verified', 'unverified', 'needs_review', 'rejected', 'draft'));

CREATE INDEX IF NOT EXISTS idx_words_type ON words (type);
CREATE INDEX IF NOT EXISTS idx_words_review_status ON words (review_status);
