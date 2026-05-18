use std::collections::HashSet;

use rusqlite::{Connection, params};

use crate::errors::AppError;

// ── Migration registry ────────────────────────────────────────────────────────

struct Migration {
    version: u32,
    name: &'static str,
    sql: &'static str,
}

/// All migrations in ascending version order.
/// Add new entries at the END of this slice; never renumber existing ones.
static MIGRATIONS: &[Migration] = &[Migration {
    version: 1,
    name: "initial_metadata",
    sql: include_str!("../../migrations/0001_initial_metadata.sql"),
}];

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
    conn.query_row(
        "SELECT COUNT(*) FROM schema_migrations",
        [],
        |row| row.get(0),
    )
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
    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to start transaction for migration {}: {e}", migration.version)))?;

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
        assert_eq!(current_version(&conn).expect("current_version"), MIGRATIONS.last().unwrap().version);
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
}
