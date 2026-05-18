pub mod encryption;
pub mod migrations;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;

use crate::errors::AppError;

/// Tauri-managed state holding the open SQLite connection.
///
/// Commands receive this via `State<'_, DbConn>`. The inner `Mutex` serialises
/// access so only one thread queries at a time. `path` is kept for diagnostics
/// (e.g. the `db_health_check` command exposes it to the frontend).
pub struct DbConn {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

/// Opens (or creates) a SQLite database file at `path` and applies baseline
/// runtime pragmas. Returns an error if the file cannot be opened or if pragma
/// setup fails.
///
/// When compiled with `--features sqlcipher` the connection is keyed with a
/// 256-bit random key retrieved from the OS credential store before any other
/// operation, making the database file opaque to raw file readers.
pub fn open(path: &Path) -> Result<DbConn, AppError> {
    let conn = Connection::open(path).map_err(|e| {
        AppError::Internal(format!(
            "Failed to open database at {}: {e}",
            path.display()
        ))
    })?;

    // Encryption key must be the very first pragma applied; SQLCipher refuses
    // any query on an unkeyed connection opened against an encrypted file.
    #[cfg(feature = "sqlcipher")]
    {
        let key = encryption::get_or_create_key()?;
        conn.execute_batch(&format!("PRAGMA key = \"x'{key}'\";\n"))
            .map_err(|e| {
                AppError::Internal(format!("Failed to apply database encryption key: {e}"))
            })?;
    }

    // WAL — allows concurrent reads while a write is in progress.
    // foreign_keys — enforce referential integrity at the SQLite layer.
    // synchronous NORMAL — safe with WAL; faster than FULL.
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA synchronous = NORMAL;",
    )
    .map_err(|e| AppError::Internal(format!("Failed to configure database pragmas: {e}")))?;

    Ok(DbConn {
        conn: Mutex::new(conn),
        path: path.to_path_buf(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_in_memory_select_one() {
        let conn = Connection::open_in_memory().expect("in-memory DB");

        let one: i64 = conn
            .query_row("SELECT 1", [], |row| row.get(0))
            .expect("SELECT 1");
        assert_eq!(one, 1);
    }

    #[test]
    fn open_in_memory_sqlite_version() {
        let conn = Connection::open_in_memory().expect("in-memory DB");

        let ver: String = conn
            .query_row("SELECT sqlite_version()", [], |row| row.get(0))
            .expect("version query");
        assert!(!ver.is_empty(), "SQLite version should not be empty");
    }

    #[test]
    fn open_creates_db_file() {
        let dir = std::env::temp_dir();
        let path = dir.join("lexora_db_open_test.db");
        let _ = std::fs::remove_file(&path); // clean up any prior run

        let db = open(&path).expect("should create DB file");
        assert!(path.exists(), "DB file should exist after open()");
        assert_eq!(db.path, path);

        drop(db);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn open_applies_wal_pragma() {
        let dir = std::env::temp_dir();
        let path = dir.join("lexora_wal_test.db");
        let _ = std::fs::remove_file(&path);

        let db = open(&path).expect("should open DB");
        let conn = db.conn.lock().expect("lock");
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("journal_mode pragma");
        assert_eq!(mode, "wal");

        drop(conn);
        drop(db);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("db-wal"));
        let _ = std::fs::remove_file(path.with_extension("db-shm"));
    }
}
