use tauri::State;

use crate::db::DbConn;
use crate::dto::db::{DbHealthDto, SchemaVersionDto};
use crate::errors::AppError;

/// Verifies that the managed SQLite connection is alive and queryable.
/// Returns the SQLite version string and the absolute path to the DB file so
/// callers can confirm the database lives in the correct app-data directory.
#[tauri::command]
pub fn db_health_check(db: State<'_, DbConn>) -> Result<DbHealthDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    let ok: i64 = conn
        .query_row("SELECT 1", [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Health query failed: {e}")))?;

    let sqlite_version: String = conn
        .query_row("SELECT sqlite_version()", [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Version query failed: {e}")))?;

    Ok(DbHealthDto {
        ok: ok == 1,
        sqlite_version,
        db_path: db.path.display().to_string(),
        message: "Database connection is healthy".to_string(),
    })
}

/// Returns the current schema version and total number of applied migrations.
#[tauri::command]
pub fn get_schema_version(db: State<'_, DbConn>) -> Result<SchemaVersionDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    let version = crate::db::migrations::current_version(&conn)?;
    let migration_count = crate::db::migrations::applied_count(&conn)?;

    Ok(SchemaVersionDto {
        version,
        migration_count,
    })
}
