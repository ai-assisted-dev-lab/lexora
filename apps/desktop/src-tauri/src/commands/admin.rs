use serde::Serialize;
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::errors::AppError;

/// System-wide database statistics returned to the Data Studio.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminStatsDto {
    pub user_count: i64,
    pub word_count: i64,
    pub deck_count: i64,
    pub pack_count: i64,
}

/// Returns system-wide database statistics.
///
/// Owner-only: returns `Unauthorized` for learner sessions and for any call
/// made without an active session.
#[tauri::command]
pub fn get_admin_stats(db: State<'_, DbConn>) -> Result<AdminStatsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    auth::require_owner(&conn)?;

    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| AppError::Internal(format!("Query failed: {e}")))?;
    let word_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))
        .map_err(|e| AppError::Internal(format!("Query failed: {e}")))?;
    let deck_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM decks", [], |r| r.get(0))
        .map_err(|e| AppError::Internal(format!("Query failed: {e}")))?;
    let pack_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM packs", [], |r| r.get(0))
        .map_err(|e| AppError::Internal(format!("Query failed: {e}")))?;

    Ok(AdminStatsDto {
        user_count,
        word_count,
        deck_count,
        pack_count,
    })
}
