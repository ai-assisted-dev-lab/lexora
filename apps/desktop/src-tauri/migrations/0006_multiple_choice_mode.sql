-- 0006_multiple_choice_mode
--
-- Allows Multiple Choice study sessions and review logs to use the same
-- persisted session/review-card tables as flashcards.

CREATE TABLE study_sessions_v2 (
    id            INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id       INTEGER          REFERENCES decks(id) ON DELETE SET NULL,
    session_type  TEXT    NOT NULL DEFAULT 'review'
                          CHECK (session_type IN ('review', 'learn', 'cram', 'flashcard', 'multiple_choice')),
    started_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ended_at      TEXT,
    total_items   INTEGER NOT NULL DEFAULT 0,
    cards_studied INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,
    again_count   INTEGER NOT NULL DEFAULT 0,
    hard_count    INTEGER NOT NULL DEFAULT 0,
    good_count    INTEGER NOT NULL DEFAULT 0,
    easy_count    INTEGER NOT NULL DEFAULT 0,
    xp_earned     INTEGER NOT NULL DEFAULT 0,
    device        TEXT
);

INSERT INTO study_sessions_v2 (
    id, user_id, deck_id, session_type, started_at, ended_at, total_items,
    cards_studied, cards_correct, again_count, hard_count, good_count,
    easy_count, xp_earned, device
)
SELECT
    id, user_id, deck_id, session_type, started_at, ended_at, total_items,
    cards_studied, cards_correct, again_count, hard_count, good_count,
    easy_count, xp_earned, device
FROM study_sessions;

DROP TABLE study_sessions;
ALTER TABLE study_sessions_v2 RENAME TO study_sessions;

CREATE TABLE review_logs_v2 (
    id                 INTEGER PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
    word_id            INTEGER NOT NULL REFERENCES words(id)            ON DELETE CASCADE,
    review_card_id     INTEGER          REFERENCES review_cards(id)     ON DELETE SET NULL,
    deck_id            INTEGER          REFERENCES decks(id)            ON DELETE SET NULL,
    session_id         INTEGER          REFERENCES study_sessions(id)   ON DELETE SET NULL,
    rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    result             TEXT    NOT NULL CHECK (result IN ('pass', 'fail')),
    mode               TEXT    NOT NULL DEFAULT 'review'
                               CHECK (mode IN ('review', 'learn', 'cram', 'preview', 'flashcard', 'multiple_choice')),
    state_before       TEXT    NOT NULL,
    state_after        TEXT    NOT NULL,
    review_duration_ms INTEGER NOT NULL DEFAULT 0,
    response_time_ms   INTEGER,
    device             TEXT,
    reviewed_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO review_logs_v2 (
    id, user_id, word_id, review_card_id, deck_id, session_id, rating, result,
    mode, state_before, state_after, review_duration_ms, response_time_ms,
    device, reviewed_at
)
SELECT
    id, user_id, word_id, review_card_id, deck_id, session_id, rating, result,
    mode, state_before, state_after, review_duration_ms, response_time_ms,
    device, reviewed_at
FROM review_logs;

DROP TABLE review_logs;
ALTER TABLE review_logs_v2 RENAME TO review_logs;

CREATE INDEX IF NOT EXISTS idx_review_cards_user_due   ON review_cards (user_id, due);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_state ON review_cards (user_id, state);
CREATE INDEX IF NOT EXISTS idx_review_cards_deck       ON review_cards (deck_id);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_session ON review_logs (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_word    ON review_logs (user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at  ON review_logs (reviewed_at);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user         ON study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_deck         ON study_sessions (deck_id);
