use std::collections::HashSet;

use rusqlite::{params, Connection};

use crate::errors::AppError;

// ── Migration registry ────────────────────────────────────────────────────────

struct Migration {
    version: u32,
    name: &'static str,
    sql: &'static str,
}

/// All migrations in ascending version order.
/// Add new entries at the END of this slice; never renumber existing ones.
static MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_metadata",
        sql: include_str!("../../migrations/0001_initial_metadata.sql"),
    },
    Migration {
        version: 2,
        name: "core_schema",
        sql: include_str!("../../migrations/0002_core_schema.sql"),
    },
    Migration {
        version: 3,
        name: "review_gamification_schema",
        sql: include_str!("../../migrations/0003_review_gamification_schema.sql"),
    },
    Migration {
        version: 4,
        name: "import_export_foundation",
        sql: include_str!("../../migrations/0004_import_export_foundation.sql"),
    },
    Migration {
        version: 5,
        name: "flashcard_sessions",
        sql: include_str!("../../migrations/0005_flashcard_sessions.sql"),
    },
    Migration {
        version: 6,
        name: "multiple_choice_mode",
        sql: include_str!("../../migrations/0006_multiple_choice_mode.sql"),
    },
];

// ── Public API ────────────────────────────────────────────────────────────────

/// Ensures the `schema_migrations` table exists, then applies every pending
/// migration in ascending version order.  Already-applied migrations are
/// skipped, so calling `run` multiple times is safe and free.
pub fn run(conn: &mut Connection) -> Result<(), AppError> {
    bootstrap(conn)?;

    let applied = get_applied_versions(conn)?;

    for migration in MIGRATIONS {
        if applied.contains(&migration.version) {
            continue;
        }
        apply(conn, migration)?;
    }

    Ok(())
}

/// Returns the highest applied migration version (0 if none).
pub fn current_version(conn: &Connection) -> Result<u32, AppError> {
    conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )
    .map_err(|e| AppError::Internal(format!("Failed to query schema version: {e}")))
}

/// Returns the number of rows in `schema_migrations`.
pub fn applied_count(conn: &Connection) -> Result<u32, AppError> {
    conn.query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to count applied migrations: {e}")))
}

// ── Private helpers ───────────────────────────────────────────────────────────

/// Creates the `schema_migrations` tracking table if it does not exist.
/// This step runs before any numbered migration so the table is always present.
fn bootstrap(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
             version    INTEGER PRIMARY KEY,
             name       TEXT    NOT NULL,
             applied_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         );",
    )
    .map_err(|e| AppError::Internal(format!("Failed to create schema_migrations table: {e}")))
}

fn get_applied_versions(conn: &Connection) -> Result<HashSet<u32>, AppError> {
    let mut stmt = conn
        .prepare("SELECT version FROM schema_migrations")
        .map_err(|e| AppError::Internal(format!("Failed to prepare migration query: {e}")))?;

    let versions = stmt
        .query_map([], |row| row.get::<_, u32>(0))
        .map_err(|e| AppError::Internal(format!("Failed to iterate migrations: {e}")))?
        .filter_map(|r| r.ok())
        .collect::<HashSet<_>>();

    Ok(versions)
}

fn apply(conn: &mut Connection, migration: &Migration) -> Result<(), AppError> {
    let tx = conn.transaction().map_err(|e| {
        AppError::Internal(format!(
            "Failed to start transaction for migration {}: {e}",
            migration.version
        ))
    })?;

    tx.execute_batch(migration.sql).map_err(|e| {
        AppError::Internal(format!(
            "Migration {} ({}) failed: {e}",
            migration.version, migration.name
        ))
    })?;

    tx.execute(
        "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
        params![migration.version, migration.name],
    )
    .map_err(|e| {
        AppError::Internal(format!(
            "Failed to record migration {} in schema_migrations: {e}",
            migration.version
        ))
    })?;

    tx.commit().map_err(|e| {
        AppError::Internal(format!(
            "Failed to commit migration {}: {e}",
            migration.version
        ))
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn in_memory() -> Connection {
        Connection::open_in_memory().expect("in-memory DB")
    }

    #[test]
    fn migrations_are_in_ascending_order_with_unique_versions() {
        let versions: Vec<u32> = MIGRATIONS.iter().map(|m| m.version).collect();
        let mut sorted = versions.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(
            versions, sorted,
            "MIGRATIONS must have unique, strictly ascending version numbers"
        );
    }

    #[test]
    fn run_on_empty_db_applies_all_migrations() {
        let mut conn = in_memory();
        run(&mut conn).expect("first run should succeed");

        let count = applied_count(&conn).expect("applied_count");
        assert_eq!(count, MIGRATIONS.len() as u32);
        assert_eq!(
            current_version(&conn).expect("current_version"),
            MIGRATIONS.last().unwrap().version
        );
    }

    #[test]
    fn run_twice_is_idempotent() {
        let mut conn = in_memory();
        run(&mut conn).expect("first run");
        run(&mut conn).expect("second run should be a no-op");

        let count = applied_count(&conn).expect("applied_count");
        assert_eq!(count, MIGRATIONS.len() as u32);
    }

    #[test]
    fn first_migration_creates_app_metadata_with_rows() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM app_metadata", [], |row| row.get(0))
            .expect("app_metadata should exist after migration 1");
        assert!(n > 0, "app_metadata should have at least one seed row");
    }

    // ── Migration 2 — core schema ─────────────────────────────────────────────

    fn tables_in(conn: &Connection) -> Vec<String> {
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master \
                 WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'",
            )
            .expect("prepare table list");
        stmt.query_map([], |row| row.get::<_, String>(0))
            .expect("query tables")
            .filter_map(|r| r.ok())
            .collect()
    }

    #[test]
    fn migration_002_creates_all_core_tables() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        let tables = tables_in(&conn);
        for expected in &[
            "packs",
            "decks",
            "users",
            "user_settings",
            "deck_subscriptions",
            "words",
            "senses",
            "examples",
            "pronunciations",
            "word_relations",
            "deck_words",
            "data_provenance",
        ] {
            assert!(
                tables.iter().any(|t| t == expected),
                "expected table '{expected}' to exist after migration 2; found: {tables:?}"
            );
        }
    }

    #[test]
    fn migration_004_creates_import_status_table() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        let tables = tables_in(&conn);
        assert!(
            tables.iter().any(|t| t == "content_imports"),
            "content_imports should exist after migration 4"
        );

        let valid = conn.execute(
            "INSERT INTO content_imports (import_type, source_path, status)
             VALUES ('deck_json', 'sample.json', 'rejected')",
            [],
        );
        assert!(valid.is_ok(), "valid import status row should insert");

        let invalid = conn.execute(
            "INSERT INTO content_imports (import_type, source_path, status)
             VALUES ('deck_json', 'sample.json', 'pending')",
            [],
        );
        assert!(invalid.is_err(), "invalid import status should be rejected");
    }

    #[test]
    fn migration_002_fts5_tables_exist() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        // FTS5 virtual tables appear in sqlite_master as type='table'.
        let all: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
                .expect("prepare");
            stmt.query_map([], |row| row.get::<_, String>(0))
                .expect("query")
                .filter_map(|r| r.ok())
                .collect()
        };
        assert!(
            all.iter().any(|t| t == "words_fts"),
            "words_fts virtual table should exist"
        );
        assert!(
            all.iter().any(|t| t == "senses_fts"),
            "senses_fts virtual table should exist"
        );
    }

    #[test]
    fn migration_002_enforces_user_role_check() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        // Valid role should succeed.
        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('alice', 'hash', 'owner')",
            [],
        )
        .expect("valid role insert should succeed");

        // Invalid role must be rejected by the CHECK constraint.
        let err = conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('bob', 'hash', 'admin')",
            [],
        );
        assert!(err.is_err(), "invalid role 'admin' should be rejected");
    }

    #[test]
    fn migration_002_fk_cascade_delete_word_removes_senses() {
        let mut conn = in_memory();
        // Foreign key enforcement requires a specific pragma.
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        run(&mut conn).expect("run migrations");

        conn.execute("INSERT INTO words (headword) VALUES ('test')", [])
            .expect("insert word");
        let word_id: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en) VALUES (?1, 0, 'a test')",
            rusqlite::params![word_id],
        )
        .expect("insert sense");

        let count_before: i64 = conn
            .query_row("SELECT COUNT(*) FROM senses", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count_before, 1);

        conn.execute(
            "DELETE FROM words WHERE id = ?1",
            rusqlite::params![word_id],
        )
        .expect("delete word");

        let count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM senses", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count_after, 0, "CASCADE DELETE should remove child senses");
    }

    #[test]
    fn migration_002_unique_sense_index_within_word() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute("INSERT INTO words (headword) VALUES ('run')", [])
            .unwrap();
        let word_id: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en) VALUES (?1, 0, 'move fast')",
            rusqlite::params![word_id],
        )
        .expect("first sense insert");

        let dup = conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en) VALUES (?1, 0, 'duplicate')",
            rusqlite::params![word_id],
        );
        assert!(
            dup.is_err(),
            "duplicate (word_id, sense_index) should violate UNIQUE constraint"
        );
    }

    #[test]
    fn migration_002_word_self_relation_rejected() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute("INSERT INTO words (headword) VALUES ('fast')", [])
            .unwrap();
        let word_id: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        let err = conn.execute(
            "INSERT INTO word_relations (from_word_id, to_word_id, relation_type) \
             VALUES (?1, ?1, 'synonym')",
            rusqlite::params![word_id],
        );
        assert!(
            err.is_err(),
            "self-referential word relation should be rejected by CHECK constraint"
        );
    }

    // ── Migration 3 — review / gamification schema ────────────────────────────

    #[test]
    fn migration_003_creates_all_review_and_gamification_tables() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        let tables = tables_in(&conn);
        for expected in &[
            "study_sessions",
            "review_cards",
            "review_logs",
            "user_progress",
            "user_xp",
            "achievements",
            "user_achievements",
            "backups",
            "reminders",
        ] {
            assert!(
                tables.iter().any(|t| t == expected),
                "expected table '{expected}' to exist after migration 3; found: {tables:?}"
            );
        }
    }

    #[test]
    fn migration_003_review_cards_state_check_rejects_invalid() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('u1', 'h', 'learner')",
            [],
        )
        .unwrap();
        let uid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();
        conn.execute("INSERT INTO words (headword) VALUES ('hello')", [])
            .unwrap();
        let wid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        let ok = conn.execute(
            "INSERT INTO review_cards (user_id, word_id, state) VALUES (?1, ?2, 'learning')",
            rusqlite::params![uid, wid],
        );
        assert!(ok.is_ok(), "valid state should be accepted");

        let err = conn.execute(
            "INSERT INTO review_cards (user_id, word_id, state) VALUES (?1, ?2, 'invalid')",
            rusqlite::params![uid, wid],
        );
        assert!(
            err.is_err(),
            "invalid state should be rejected by CHECK constraint"
        );
    }

    #[test]
    fn migration_003_review_cards_unique_user_word() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('u2', 'h', 'learner')",
            [],
        )
        .unwrap();
        let uid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();
        conn.execute("INSERT INTO words (headword) VALUES ('world')", [])
            .unwrap();
        let wid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        conn.execute(
            "INSERT INTO review_cards (user_id, word_id) VALUES (?1, ?2)",
            rusqlite::params![uid, wid],
        )
        .expect("first card insert should succeed");

        let dup = conn.execute(
            "INSERT INTO review_cards (user_id, word_id) VALUES (?1, ?2)",
            rusqlite::params![uid, wid],
        );
        assert!(
            dup.is_err(),
            "duplicate (user_id, word_id) should violate UNIQUE constraint"
        );
    }

    #[test]
    fn migration_003_review_logs_rating_check() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('u3', 'h', 'learner')",
            [],
        )
        .unwrap();
        let uid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();
        conn.execute("INSERT INTO words (headword) VALUES ('test')", [])
            .unwrap();
        let wid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        for rating in 1..=4 {
            conn.execute(
                "INSERT INTO review_logs (user_id, word_id, rating, result, state_before, state_after) \
                 VALUES (?1, ?2, ?3, 'pass', '{}', '{}')",
                rusqlite::params![uid, wid, rating],
            ).unwrap_or_else(|e| panic!("rating {rating} should be accepted: {e}"));
        }

        let err = conn.execute(
            "INSERT INTO review_logs (user_id, word_id, rating, result, state_before, state_after) \
             VALUES (?1, ?2, 5, 'pass', '{}', '{}')",
            rusqlite::params![uid, wid],
        );
        assert!(err.is_err(), "rating 5 should be rejected");
    }

    #[test]
    fn migration_003_achievements_hidden_field_and_check() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO achievements (slug, name, condition_type, condition_value, hidden) \
             VALUES ('secret_1', 'Secret', 'streak', 100, 1)",
            [],
        )
        .expect("hidden=1 should be accepted");

        let hidden: i64 = conn
            .query_row(
                "SELECT hidden FROM achievements WHERE slug = 'secret_1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(hidden, 1);

        let err = conn.execute(
            "INSERT INTO achievements (slug, name, condition_type, condition_value, hidden) \
             VALUES ('bad', 'Bad', 'streak', 1, 2)",
            [],
        );
        assert!(
            err.is_err(),
            "hidden=2 should be rejected by CHECK constraint"
        );
    }

    #[test]
    fn migration_003_user_achievements_composite_pk() {
        let mut conn = in_memory();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('u4', 'h', 'learner')",
            [],
        )
        .unwrap();
        let uid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();
        conn.execute(
            "INSERT INTO achievements (slug, name, condition_type, condition_value) VALUES ('ach1', 'Ach', 'streak', 7)",
            [],
        ).unwrap();
        let aid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        conn.execute(
            "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?1, ?2)",
            rusqlite::params![uid, aid],
        )
        .expect("first unlock should succeed");

        let dup = conn.execute(
            "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?1, ?2)",
            rusqlite::params![uid, aid],
        );
        assert!(
            dup.is_err(),
            "duplicate (user_id, achievement_id) should violate PRIMARY KEY"
        );
    }

    #[test]
    fn migration_003_fk_cascade_delete_user_removes_review_cards() {
        let mut conn = in_memory();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        run(&mut conn).expect("run migrations");

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES ('u5', 'h', 'learner')",
            [],
        )
        .unwrap();
        let uid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();
        conn.execute("INSERT INTO words (headword) VALUES ('cascade')", [])
            .unwrap();
        let wid: i64 = conn
            .query_row("SELECT last_insert_rowid()", [], |r| r.get(0))
            .unwrap();

        conn.execute(
            "INSERT INTO review_cards (user_id, word_id) VALUES (?1, ?2)",
            rusqlite::params![uid, wid],
        )
        .unwrap();

        conn.execute("DELETE FROM users WHERE id = ?1", rusqlite::params![uid])
            .unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM review_cards WHERE user_id = ?1",
                rusqlite::params![uid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            count, 0,
            "CASCADE DELETE should remove review_cards when user is deleted"
        );
    }
}
