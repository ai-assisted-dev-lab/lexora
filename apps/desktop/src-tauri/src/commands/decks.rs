use rusqlite::{params, Connection};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::decks::{DiscoverDeckDto, DiscoverDecksDto, DeckSummaryDto, SeededDecksDto};
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

// ── Discover: inner helpers ────────────────────────────────────────────────────

fn query_discover_decks(conn: &Connection, user_id: i64) -> Result<Vec<DiscoverDeckDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.slug, d.name, d.description, d.difficulty, d.word_count,
                    d.tags, p.name, p.slug,
                    CASE WHEN ds.deck_id IS NOT NULL THEN 1 ELSE 0 END AS installed
             FROM   decks d
             JOIN   packs p ON p.id = d.pack_id
             LEFT JOIN deck_subscriptions ds ON ds.deck_id = d.id AND ds.user_id = ?1
             WHERE  p.source = 'bundled'
             ORDER  BY d.id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare discover query: {e}")))?;

    type Row = (i64, String, String, Option<String>, Option<String>, i64, Option<String>, String, String, i64);

    let rows: Vec<Row> = stmt
        .query_map(params![user_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query discover decks: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    let decks = rows
        .into_iter()
        .map(|(id, slug, name, description, level, word_count, tags_json, pack_name, pack_slug, installed)| {
            let tags: Vec<String> = tags_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();
            DiscoverDeckDto { id, slug, title: name, description, level, word_count, tags, pack_name, pack_slug, installed: installed != 0 }
        })
        .collect();

    Ok(decks)
}

fn do_install_deck(conn: &Connection, user_id: i64, deck_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO deck_subscriptions(user_id, deck_id) VALUES(?1, ?2)",
        params![user_id, deck_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to install deck: {e}")))?;
    Ok(())
}

fn do_uninstall_deck(conn: &Connection, user_id: i64, deck_id: i64) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM deck_subscriptions WHERE user_id = ?1 AND deck_id = ?2",
        params![user_id, deck_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to uninstall deck: {e}")))?;
    Ok(())
}

// ── Discover: Tauri commands ──────────────────────────────────────────────────

/// Returns all bundled catalog decks, each annotated with whether the current
/// user has it installed in their library.  Requires an active session.
#[tauri::command]
pub fn list_discover_decks(db: State<'_, DbConn>) -> Result<DiscoverDecksDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    let decks = query_discover_decks(&conn, user.id)?;
    let total = decks.len();
    Ok(DiscoverDecksDto { decks, total })
}

/// Adds a deck to the current user's library.  Safe to call more than once
/// (idempotent — duplicate rows are silently ignored).
#[tauri::command]
pub fn install_deck(deck_id: i64, db: State<'_, DbConn>) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    do_install_deck(&conn, user.id, deck_id)
}

/// Removes a deck from the current user's library.
#[tauri::command]
pub fn uninstall_deck(deck_id: i64, db: State<'_, DbConn>) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    do_uninstall_deck(&conn, user.id, deck_id)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_data() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::db::seeder::load_bundled(&mut conn).expect("seeder");
        crate::auth::create_default_accounts(&conn).expect("accounts");
        conn
    }

    fn login_as(conn: &Connection, username: &str) -> i64 {
        crate::auth::login(conn, username, username).expect("login");
        crate::auth::require_session(conn).expect("session").id
    }

    #[test]
    fn list_discover_decks_returns_bundled_decks() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "owner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        assert!(!decks.is_empty(), "bundled decks must be present after seeding");
    }

    #[test]
    fn installed_flag_is_false_before_install() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        assert!(
            decks.iter().all(|d| !d.installed),
            "no decks should be installed before any install call"
        );
    }

    #[test]
    fn installed_flag_reflects_subscription() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        let first_id = decks[0].id;

        do_install_deck(&conn, user_id, first_id).expect("install");

        let decks = query_discover_decks(&conn, user_id).expect("query after install");
        let first = decks.iter().find(|d| d.id == first_id).expect("deck");
        assert!(first.installed, "deck must be marked installed after install");
    }

    #[test]
    fn uninstall_removes_subscription() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        let first_id = decks[0].id;

        do_install_deck(&conn, user_id, first_id).expect("install");
        do_uninstall_deck(&conn, user_id, first_id).expect("uninstall");

        let decks = query_discover_decks(&conn, user_id).expect("query after uninstall");
        let first = decks.iter().find(|d| d.id == first_id).expect("deck");
        assert!(!first.installed, "deck must not be installed after uninstall");
    }

    #[test]
    fn install_is_idempotent() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        let first_id = decks[0].id;

        do_install_deck(&conn, user_id, first_id).expect("first install");
        do_install_deck(&conn, user_id, first_id).expect("idempotent second install");

        let decks = query_discover_decks(&conn, user_id).expect("query after double install");
        let first = decks.iter().find(|d| d.id == first_id).expect("deck");
        assert!(first.installed, "deck still installed after duplicate insert");
    }

    #[test]
    fn subscriptions_are_per_user() {
        let conn = db_with_data();
        let owner_id = login_as(&conn, "owner");

        let decks = query_discover_decks(&conn, owner_id).expect("query");
        let first_id = decks[0].id;
        do_install_deck(&conn, owner_id, first_id).expect("owner installs");

        // Log in as learner and verify their view is unaffected
        crate::auth::logout(&conn).expect("logout owner");
        let learner_id = login_as(&conn, "learner");
        let learner_decks = query_discover_decks(&conn, learner_id).expect("learner query");
        let first = learner_decks.iter().find(|d| d.id == first_id).expect("deck");
        assert!(
            !first.installed,
            "learner should not see owner's install"
        );
    }

    #[test]
    fn tags_are_parsed_from_json() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "owner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        let has_tags = decks.iter().any(|d| !d.tags.is_empty());
        assert!(has_tags, "at least one deck should have non-empty parsed tags");
    }
}
