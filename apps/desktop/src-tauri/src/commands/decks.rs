use tauri::State;

use crate::db::DbConn;
use crate::dto::decks::{DeckSummaryDto, SeededDecksDto};
use crate::errors::AppError;

/// Returns all decks that belong to a bundled (seeded) pack.
///
/// The result is ordered by pack name then deck name so the frontend can
/// render a stable list without needing to sort client-side.
#[tauri::command]
pub fn list_seeded_decks(db: State<'_, DbConn>) -> Result<SeededDecksDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.slug, d.name, d.description, d.word_count,
                    d.difficulty, d.tags, p.name, p.slug
             FROM   decks  d
             JOIN   packs  p ON p.id = d.pack_id
             WHERE  p.source = 'bundled'
             ORDER  BY p.name, d.name",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare deck query: {e}")))?;

    let decks: Vec<DeckSummaryDto> = stmt
        .query_map([], |row| {
            Ok(DeckSummaryDto {
                id: row.get(0)?,
                slug: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                word_count: row.get(4)?,
                difficulty: row.get(5)?,
                tags: row.get(6)?,
                pack_name: row.get(7)?,
                pack_slug: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query seeded decks: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    let total = decks.len();
    Ok(SeededDecksDto { decks, total })
}
