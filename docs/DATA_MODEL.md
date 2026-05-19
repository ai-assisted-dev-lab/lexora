# Lexora — Data Model

> Version: 1.0 | Status: Draft — subject to refinement in implementation prompts

---

## Principles

- All data lives in a local SQLite database (SQLCipher encrypted)
- The JS/TS layer never constructs SQL; all queries run in Rust
- Every content table carries provenance columns: `source`, `pack_id`, `created_at`, `updated_at`
- Soft deletes on user-generated content; hard deletes only on owner action in Data Studio
- FTS5 virtual tables shadow `words` and `senses` for full-text search
- FSRS card state is stored denormalized per (user, word) pair for fast read access

---

## Entity Overview

```
users
  └── settings (1:1)
  └── deck_subscriptions (1:N) → decks
  └── review_cards (1:N) → words
  └── review_logs (1:N)
  └── study_sessions (1:N)
  └── user_achievements (1:N) → achievements
  └── user_progress (1:N)
  └── user_xp (1:1)

packs
  └── decks (1:N)
      └── deck_words (N:M) → words

words
  └── senses (1:N)
      └── examples (1:N)
  └── pronunciations (1:N)
  └── word_relations (N:M) → words

backups (metadata only; file on disk)
reminders
```

---

## Table Definitions

### `users`

| Column          | Type                 | Notes                             |
| --------------- | -------------------- | --------------------------------- |
| `id`            | INTEGER PK           | Auto-increment                    |
| `username`      | TEXT UNIQUE NOT NULL | Display name and login identifier |
| `password_hash` | TEXT NOT NULL        | Argon2 hash; never stored plain   |
| `role`          | TEXT NOT NULL        | `'owner'` or `'learner'`          |
| `created_at`    | TEXT NOT NULL        | ISO 8601 UTC                      |
| `updated_at`    | TEXT NOT NULL        | ISO 8601 UTC                      |
| `last_login_at` | TEXT                 | ISO 8601 UTC                      |

---

### `user_settings`

One row per user.

| Column                 | Type                  | Notes                               |
| ---------------------- | --------------------- | ----------------------------------- |
| `user_id`              | INTEGER PK FK → users |                                     |
| `daily_goal_cards`     | INTEGER DEFAULT 20    | Cards per day target                |
| `notification_enabled` | INTEGER DEFAULT 1     | Boolean 0/1                         |
| `notification_time`    | TEXT                  | HH:MM local time                    |
| `audio_autoplay`       | INTEGER DEFAULT 1     | Boolean                             |
| `review_order`         | TEXT DEFAULT 'fsrs'   | `'fsrs'`, `'random'`, `'new_first'` |
| `ui_language`          | TEXT DEFAULT 'en'     | Learner's UI language preference    |
| `updated_at`           | TEXT NOT NULL         | ISO 8601 UTC                        |

---

### `packs`

Vocabulary content packs, authored in Data Studio.

| Column             | Type                 | Notes                                     |
| ------------------ | -------------------- | ----------------------------------------- |
| `id`               | INTEGER PK           |                                           |
| `slug`             | TEXT UNIQUE NOT NULL | URL-safe identifier                       |
| `name`             | TEXT NOT NULL        | Display name                              |
| `description`      | TEXT                 |                                           |
| `version`          | TEXT NOT NULL        | SemVer string                             |
| `author`           | TEXT                 |                                           |
| `cover_image_path` | TEXT                 | Relative to app data dir                  |
| `source`           | TEXT                 | `'bundled'`, `'downloaded'`, `'imported'` |
| `created_at`       | TEXT NOT NULL        |                                           |
| `updated_at`       | TEXT NOT NULL        |                                           |

---

### `decks`

Thematic groupings within a pack.

| Column             | Type                 | Notes                                        |
| ------------------ | -------------------- | -------------------------------------------- |
| `id`               | INTEGER PK           |                                              |
| `pack_id`          | INTEGER FK → packs   |                                              |
| `slug`             | TEXT UNIQUE NOT NULL |                                              |
| `name`             | TEXT NOT NULL        |                                              |
| `description`      | TEXT                 |                                              |
| `cover_image_path` | TEXT                 |                                              |
| `word_count`       | INTEGER DEFAULT 0    | Denormalized for fast display                |
| `difficulty`       | TEXT                 | `'beginner'`, `'intermediate'`, `'advanced'` |
| `tags`             | TEXT                 | JSON array of tag strings                    |
| `created_at`       | TEXT NOT NULL        |                                              |
| `updated_at`       | TEXT NOT NULL        |                                              |

---

### `deck_subscriptions`

Maps which users have added which decks to their library.

| Column      | Type                   | Notes |
| ----------- | ---------------------- | ----- |
| `user_id`   | INTEGER FK → users     |       |
| `deck_id`   | INTEGER FK → decks     |       |
| `added_at`  | TEXT NOT NULL          |       |
| PRIMARY KEY | (`user_id`, `deck_id`) |       |

---

### `words`

Core vocabulary entries (English headwords).

| Column           | Type               | Notes                                       |
| ---------------- | ------------------ | ------------------------------------------- |
| `id`             | INTEGER PK         |                                             |
| `pack_id`        | INTEGER FK → packs |                                             |
| `headword`       | TEXT NOT NULL      | The English word/phrase                     |
| `part_of_speech` | TEXT               | `'noun'`, `'verb'`, `'adjective'`, etc.     |
| `ipa_uk`         | TEXT               | British IPA transcription                   |
| `ipa_us`         | TEXT               | American IPA transcription                  |
| `frequency_rank` | INTEGER            | Corpus frequency rank (lower = more common) |
| `cefr_level`     | TEXT               | `'A1'`–`'C2'`                               |
| `created_at`     | TEXT NOT NULL      |                                             |
| `updated_at`     | TEXT NOT NULL      |                                             |

---

### `words_fts` (FTS5 virtual table)

Mirrors `words` for full-text search.

```sql
CREATE VIRTUAL TABLE words_fts USING fts5(
  headword,
  content='words',
  content_rowid='id'
);
```

---

### `senses`

One word may have multiple senses (meanings).

| Column          | Type               | Notes                                       |
| --------------- | ------------------ | ------------------------------------------- |
| `id`            | INTEGER PK         |                                             |
| `word_id`       | INTEGER FK → words |                                             |
| `sense_index`   | INTEGER NOT NULL   | Ordering within the word                    |
| `definition_en` | TEXT NOT NULL      | English definition                          |
| `definition_vi` | TEXT               | Vietnamese definition/translation           |
| `register`      | TEXT               | `'formal'`, `'informal'`, `'slang'`, etc.   |
| `domain`        | TEXT               | `'medicine'`, `'law'`, `'technology'`, etc. |
| `created_at`    | TEXT NOT NULL      |                                             |
| `updated_at`    | TEXT NOT NULL      |                                             |

---

### `examples`

Usage examples per sense.

| Column        | Type                | Notes                           |
| ------------- | ------------------- | ------------------------------- |
| `id`          | INTEGER PK          |                                 |
| `sense_id`    | INTEGER FK → senses |                                 |
| `sentence_en` | TEXT NOT NULL       | English example sentence        |
| `sentence_vi` | TEXT                | Vietnamese translation          |
| `audio_path`  | TEXT                | Relative path to sentence audio |
| `created_at`  | TEXT NOT NULL       |                                 |

---

### `pronunciations`

Audio entries per word (can have UK and US variants).

| Column       | Type               | Notes                               |
| ------------ | ------------------ | ----------------------------------- |
| `id`         | INTEGER PK         |                                     |
| `word_id`    | INTEGER FK → words |                                     |
| `dialect`    | TEXT NOT NULL      | `'uk'`, `'us'`                      |
| `audio_path` | TEXT NOT NULL      | Relative to audio package dir       |
| `tts_engine` | TEXT               | `'bundled'`, `'edge-tts'`, `'gtts'` |
| `created_at` | TEXT NOT NULL      |                                     |

---

### `word_relations`

Synonyms, antonyms, and other semantic links between words.

| Column          | Type               | Notes                                                   |
| --------------- | ------------------ | ------------------------------------------------------- |
| `id`            | INTEGER PK         |                                                         |
| `from_word_id`  | INTEGER FK → words |                                                         |
| `to_word_id`    | INTEGER FK → words |                                                         |
| `relation_type` | TEXT NOT NULL      | `'synonym'`, `'antonym'`, `'collocation'`, `'see_also'` |

---

### `deck_words`

Many-to-many mapping of words to decks.

| Column      | Type                   | Notes                     |
| ----------- | ---------------------- | ------------------------- |
| `deck_id`   | INTEGER FK → decks     |                           |
| `word_id`   | INTEGER FK → words     |                           |
| `position`  | INTEGER                | Display order within deck |
| PRIMARY KEY | (`deck_id`, `word_id`) |                           |

---

### `review_cards`

FSRS state per (user, word) pair.

| Column           | Type                       | Notes                                             |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `id`             | INTEGER PK                 |                                                   |
| `user_id`        | INTEGER FK → users         |                                                   |
| `word_id`        | INTEGER FK → words         |                                                   |
| `deck_id`        | INTEGER FK → decks         | Context deck for this card                        |
| `due`            | TEXT NOT NULL              | ISO 8601 UTC — next review time                   |
| `stability`      | REAL NOT NULL              | FSRS stability (S)                                |
| `difficulty`     | REAL NOT NULL              | FSRS difficulty (D)                               |
| `elapsed_days`   | INTEGER NOT NULL           | Days since last review                            |
| `scheduled_days` | INTEGER NOT NULL           | Days until next review                            |
| `reps`           | INTEGER NOT NULL DEFAULT 0 | Total reviews                                     |
| `lapses`         | INTEGER NOT NULL DEFAULT 0 | Times forgotten                                   |
| `state`          | TEXT NOT NULL              | `'new'`, `'learning'`, `'review'`, `'relearning'` |
| `last_review`    | TEXT                       | ISO 8601 UTC                                      |
| UNIQUE           | (`user_id`, `word_id`)     | One card per user-word pair                       |

---

### `review_logs`

Immutable append-only log of every review event.

| Column               | Type                         | Notes                                            |
| -------------------- | ---------------------------- | ------------------------------------------------ |
| `id`                 | INTEGER PK                   |                                                  |
| `user_id`            | INTEGER FK → users           |                                                  |
| `word_id`            | INTEGER FK → words           |                                                  |
| `session_id`         | INTEGER FK → study_sessions  |                                                  |
| `rating`             | INTEGER NOT NULL             | 1=Again, 2=Hard, 3=Good, 4=Easy                  |
| `result`             | TEXT NOT NULL                | `'pass'`, `'fail'`                               |
| `mode`               | TEXT NOT NULL                | `'review'`, `'learn'`, `'cram'`, `'preview'`     |
| `state_before`       | TEXT NOT NULL                | JSON snapshot of FSRS state before               |
| `state_after`        | TEXT NOT NULL                | JSON snapshot of FSRS state after                |
| `review_duration_ms` | INTEGER                      | Time spent on this card                          |
| `device`             | TEXT                         | Device identifier/type                           |
| `reviewed_at`        | TEXT NOT NULL                | ISO 8601 UTC                                     |

---

### `study_sessions`

One row per study session.

| Column          | Type               | Notes                           |
| --------------- | ------------------ | ------------------------------- |
| `id`            | INTEGER PK         |                                 |
| `user_id`       | INTEGER FK → users |                                 |
| `deck_id`       | INTEGER FK → decks | NULL if cross-deck session      |
| `started_at`    | TEXT NOT NULL      | ISO 8601 UTC                    |
| `ended_at`      | TEXT               | NULL if still in progress       |
| `cards_studied` | INTEGER DEFAULT 0  |                                 |
| `cards_correct` | INTEGER DEFAULT 0  | Rating >= 3                     |
| `xp_earned`     | INTEGER DEFAULT 0  |                                 |
| `session_type`  | TEXT NOT NULL      | `'review'`, `'learn'`, `'cram'` |
| `device`        | TEXT               | Device identifier/type          |

---

### `achievements`

Static definitions for achievement types (can be shipped in app bundle).

| Column            | Type                 | Notes                                                    |
| ----------------- | -------------------- | -------------------------------------------------------- |
| `id`              | INTEGER PK           |                                                          |
| `slug`            | TEXT UNIQUE NOT NULL |                                                          |
| `name`            | TEXT NOT NULL        |                                                          |
| `description`     | TEXT                 |                                                          |
| `icon`            | TEXT                 | Emoji or asset path                                      |
| `condition_type`  | TEXT NOT NULL        | `'streak'`, `'cards_reviewed'`, `'words_mastered'`, etc. |
| `condition_value` | INTEGER NOT NULL     | Threshold for unlock                                     |
| `xp_reward`       | INTEGER DEFAULT 0    |                                                          |
| `hidden`          | INTEGER DEFAULT 0    | 1 = secret; not shown until unlocked                     |

---

### `user_achievements`

Per-user unlock records.

| Column           | Type                          | Notes                              |
| ---------------- | ----------------------------- | ---------------------------------- |
| `user_id`        | INTEGER FK → users            |                                    |
| `achievement_id` | INTEGER FK → achievements     |                                    |
| `unlocked_at`    | TEXT NOT NULL                 | ISO 8601 UTC                       |
| `notified`       | INTEGER DEFAULT 0             | 1 = UI toast already shown         |
| PRIMARY KEY      | (`user_id`, `achievement_id`) |                                    |

---

### `user_progress`

Daily learning snapshots for streak and goal tracking.

| Column           | Type                | Notes                       |
| ---------------- | ------------------- | --------------------------- |
| `id`             | INTEGER PK          |                             |
| `user_id`        | INTEGER FK → users  |                             |
| `date`           | TEXT NOT NULL       | ISO 8601 date (YYYY-MM-DD)  |
| `cards_reviewed` | INTEGER DEFAULT 0   |                             |
| `cards_correct`  | INTEGER DEFAULT 0   |                             |
| `xp_earned`      | INTEGER DEFAULT 0   |                             |
| `goal_met`       | INTEGER DEFAULT 0   | Boolean                     |
| `streak_day`     | INTEGER DEFAULT 0   | Streak count as of this day |
| UNIQUE           | (`user_id`, `date`) |                             |

---

### `user_xp`

Running XP and level totals.

| Column           | Type                  | Notes |
| ---------------- | --------------------- | ----- |
| `user_id`        | INTEGER PK FK → users |       |
| `total_xp`       | INTEGER DEFAULT 0     |       |
| `level`          | INTEGER DEFAULT 1     |       |
| `current_streak` | INTEGER DEFAULT 0     |       |
| `longest_streak` | INTEGER DEFAULT 0     |       |
| `updated_at`     | TEXT NOT NULL         |       |

---

### `backups`

Metadata for backup files created on disk.

| Column            | Type               | Notes                        |
| ----------------- | ------------------ | ---------------------------- |
| `id`              | INTEGER PK         |                              |
| `user_id`         | INTEGER FK → users |                              |
| `file_path`       | TEXT NOT NULL      | Absolute path to backup file |
| `file_size_bytes` | INTEGER            |                              |
| `created_at`      | TEXT NOT NULL      |                              |
| `note`            | TEXT               | User-provided label          |

---

## Validation Rules

- `users.role` must be exactly `'owner'` or `'learner'`
- `review_cards.state` must be one of `'new'`, `'learning'`, `'review'`, `'relearning'`
- `review_logs.rating` must be 1–4 inclusive
- `pronunciations.dialect` must be `'uk'` or `'us'`
- All timestamp columns store ISO 8601 UTC strings
- `daily_progress.date` stores date-only strings (`YYYY-MM-DD`)
- `deck_words.position` must be >= 0
- `senses.sense_index` must be >= 0 and unique within a word

---

### `reminders`

Per-user study reminder configuration.

| Column        | Type               | Notes                             |
| ------------- | ------------------ | --------------------------------- |
| `id`          | INTEGER PK         |                                   |
| `user_id`     | INTEGER FK → users |                                   |
| `remind_at`   | TEXT NOT NULL      | HH:MM local time                  |
| `enabled`     | INTEGER DEFAULT 1  | Boolean                           |
| `days_of_week`| TEXT DEFAULT '1111111' | 7-char bitmask Mon–Sun         |
| `created_at`  | TEXT NOT NULL      |                                   |
| `updated_at`  | TEXT NOT NULL      |                                   |

---

## Indexes (Key)

```sql
-- review_cards
CREATE INDEX idx_review_cards_user_due   ON review_cards (user_id, due);
CREATE INDEX idx_review_cards_user_state ON review_cards (user_id, state);
CREATE INDEX idx_review_cards_deck       ON review_cards (deck_id);
-- review_logs
CREATE INDEX idx_review_logs_user_session ON review_logs (user_id, session_id);
CREATE INDEX idx_review_logs_user_word    ON review_logs (user_id, word_id);
CREATE INDEX idx_review_logs_reviewed_at  ON review_logs (reviewed_at);
-- study_sessions
CREATE INDEX idx_study_sessions_user         ON study_sessions (user_id);
CREATE INDEX idx_study_sessions_user_started ON study_sessions (user_id, started_at);
CREATE INDEX idx_study_sessions_deck         ON study_sessions (deck_id);
-- user_progress
CREATE INDEX idx_user_progress_user_date ON user_progress (user_id, date);
-- user_achievements
CREATE INDEX idx_user_achievements_user        ON user_achievements (user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements (achievement_id);
-- content tables
CREATE INDEX idx_words_pack     ON words (pack_id);
CREATE INDEX idx_senses_word    ON senses (word_id);
CREATE INDEX idx_deck_words_deck ON deck_words (deck_id);
```
