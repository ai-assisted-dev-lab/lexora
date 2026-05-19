-- 0003_review_gamification_schema
--
-- Adds all tables needed for FSRS card state, detailed review logging, study
-- sessions, daily progress tracking, running XP/level, achievement catalog,
-- per-user achievement unlocks, backup metadata, and study reminders.
--
-- Creation order matters for foreign-key references:
--   study_sessions → review_logs (session_id FK)
--   achievements   → user_achievements (achievement_id FK)

-- ── Study sessions ────────────────────────────────────────────────────────────
-- Created before review_logs because review_logs carries a FK → study_sessions.
CREATE TABLE IF NOT EXISTS study_sessions (
    id            INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id       INTEGER          REFERENCES decks(id) ON DELETE SET NULL,
    session_type  TEXT    NOT NULL DEFAULT 'review'
                          CHECK (session_type IN ('review', 'learn', 'cram')),
    started_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ended_at      TEXT,
    cards_studied INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,
    xp_earned     INTEGER NOT NULL DEFAULT 0,
    device        TEXT
);

-- ── FSRS card state ───────────────────────────────────────────────────────────
-- One row per (user, word) pair.  All FSRS scheduling fields live here so the
-- review engine can read due cards in a single index scan.
CREATE TABLE IF NOT EXISTS review_cards (
    id             INTEGER PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id        INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    deck_id        INTEGER          REFERENCES decks(id) ON DELETE SET NULL,
    due            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    stability      REAL    NOT NULL DEFAULT 0.0,
    difficulty     REAL    NOT NULL DEFAULT 0.0,
    elapsed_days   INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps           INTEGER NOT NULL DEFAULT 0,
    lapses         INTEGER NOT NULL DEFAULT 0,
    state          TEXT    NOT NULL DEFAULT 'new'
                           CHECK (state IN ('new', 'learning', 'review', 'relearning')),
    last_review    TEXT,
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (user_id, word_id)
);

-- ── Review event log ──────────────────────────────────────────────────────────
-- Immutable append-only; rows must never be updated or deleted.
-- state_before / state_after carry JSON snapshots of the FSRS card fields so
-- that the full review history can be replayed for analytics or re-scheduling.
CREATE TABLE IF NOT EXISTS review_logs (
    id                 INTEGER PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
    word_id            INTEGER NOT NULL REFERENCES words(id)            ON DELETE CASCADE,
    session_id         INTEGER          REFERENCES study_sessions(id)   ON DELETE SET NULL,
    rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    result             TEXT    NOT NULL CHECK (result IN ('pass', 'fail')),
    mode               TEXT    NOT NULL DEFAULT 'review'
                               CHECK (mode IN ('review', 'learn', 'cram', 'preview')),
    state_before       TEXT    NOT NULL,
    state_after        TEXT    NOT NULL,
    review_duration_ms INTEGER NOT NULL DEFAULT 0,
    device             TEXT,
    reviewed_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Daily progress snapshots ──────────────────────────────────────────────────
-- One row per (user, calendar date).  Used for streak calculation and goal
-- tracking; heavier aggregations use review_logs directly.
CREATE TABLE IF NOT EXISTS user_progress (
    id             INTEGER PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date           TEXT    NOT NULL,
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_correct  INTEGER NOT NULL DEFAULT 0,
    xp_earned      INTEGER NOT NULL DEFAULT 0,
    goal_met       INTEGER NOT NULL DEFAULT 0 CHECK (goal_met IN (0, 1)),
    streak_day     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (user_id, date)
);

-- ── Running XP and level ──────────────────────────────────────────────────────
-- One row per user; updated atomically when XP is awarded.
CREATE TABLE IF NOT EXISTS user_xp (
    user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp       INTEGER NOT NULL DEFAULT 0,
    level          INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Achievement catalog ───────────────────────────────────────────────────────
-- Static definitions shipped with the app.  hidden=1 means the achievement
-- is not shown in the UI until it is unlocked (secret/surprise achievements).
CREATE TABLE IF NOT EXISTS achievements (
    id              INTEGER PRIMARY KEY,
    slug            TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    description     TEXT,
    icon            TEXT,
    condition_type  TEXT    NOT NULL
                            CHECK (condition_type IN (
                                'streak', 'cards_reviewed', 'words_mastered',
                                'sessions_completed', 'xp_earned', 'deck_completed'
                            )),
    condition_value INTEGER NOT NULL,
    xp_reward       INTEGER NOT NULL DEFAULT 0,
    hidden          INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Per-user achievement unlocks ──────────────────────────────────────────────
-- notified=0 means the UI has not yet shown the unlock toast.
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id        INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    notified       INTEGER NOT NULL DEFAULT 0 CHECK (notified IN (0, 1)),
    PRIMARY KEY (user_id, achievement_id)
);

-- ── Backup file metadata ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backups (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    file_path       TEXT    NOT NULL,
    file_size_bytes INTEGER,
    note            TEXT,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Study reminders ───────────────────────────────────────────────────────────
-- days_of_week is a 7-character string of '0'/'1' for Mon–Sun.
CREATE TABLE IF NOT EXISTS reminders (
    id           INTEGER PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at    TEXT    NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    days_of_week TEXT    NOT NULL DEFAULT '1111111',
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- review_cards: primary access pattern is due cards per user; secondary by state
CREATE INDEX IF NOT EXISTS idx_review_cards_user_due   ON review_cards (user_id, due);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_state ON review_cards (user_id, state);
CREATE INDEX IF NOT EXISTS idx_review_cards_deck       ON review_cards (deck_id);

-- review_logs: history by session, word, and time
CREATE INDEX IF NOT EXISTS idx_review_logs_user_session ON review_logs (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_word    ON review_logs (user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at  ON review_logs (reviewed_at);

-- study_sessions: list and date-ordered queries per user; deck analytics
CREATE INDEX IF NOT EXISTS idx_study_sessions_user         ON study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_deck         ON study_sessions (deck_id);

-- user_progress: daily streak and goal queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_date ON user_progress (user_id, date);

-- user_achievements: per-user unlock list and achievement-level stats
CREATE INDEX IF NOT EXISTS idx_user_achievements_user        ON user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements (achievement_id);
