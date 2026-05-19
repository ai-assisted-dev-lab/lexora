use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::decks::{
    DeckDetailDto, DeckDetailProgressDto, DeckPreviewWordDto, DeckSummaryDto, DiscoverDeckDto,
    DiscoverDecksDto, LibraryDeckDto, LibraryDecksDto, SeededDecksDto,
};
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

    type Row = (
        i64,
        String,
        String,
        Option<String>,
        Option<String>,
        i64,
        Option<String>,
        String,
        String,
        i64,
    );

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
        .map(
            |(
                id,
                slug,
                name,
                description,
                level,
                word_count,
                tags_json,
                pack_name,
                pack_slug,
                installed,
            )| {
                let tags: Vec<String> = tags_json
                    .as_deref()
                    .and_then(|s| serde_json::from_str(s).ok())
                    .unwrap_or_default();
                DiscoverDeckDto {
                    id,
                    slug,
                    title: name,
                    description,
                    level,
                    word_count,
                    tags,
                    pack_name,
                    pack_slug,
                    installed: installed != 0,
                }
            },
        )
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

fn progress_percent(mastered_count: i64, word_count: i64) -> i64 {
    if word_count <= 0 {
        0
    } else {
        ((mastered_count * 100) / word_count).clamp(0, 100)
    }
}

fn query_library_decks(conn: &Connection, user_id: i64) -> Result<Vec<LibraryDeckDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.slug, d.name, d.description, d.difficulty, d.word_count,
                    d.tags, COALESCE(p.name, 'Standalone'), COALESCE(p.slug, 'standalone'), ds.added_at,
                    COALESCE((
                        SELECT COUNT(*)
                        FROM   review_cards rc
                        JOIN   deck_words dw ON dw.word_id = rc.word_id AND dw.deck_id = d.id
                        WHERE  rc.user_id = ?1
                          AND  rc.state = 'review'
                    ), 0) AS mastered_count,
                    COALESCE((
                        SELECT COUNT(*)
                        FROM   review_cards rc
                        JOIN   deck_words dw ON dw.word_id = rc.word_id AND dw.deck_id = d.id
                        WHERE  rc.user_id = ?1
                          AND  rc.due <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                    ), 0) AS due_count,
                    COALESCE((
                        SELECT CAST(ROUND(
                            100.0 * SUM(CASE WHEN rl.result = 'pass' THEN 1 ELSE 0 END)
                            / NULLIF(COUNT(*), 0)
                        ) AS INTEGER)
                        FROM   review_logs rl
                        JOIN   deck_words dw ON dw.word_id = rl.word_id AND dw.deck_id = d.id
                        WHERE  rl.user_id = ?1
                    ), 0) AS accuracy,
                    (
                        SELECT MAX(COALESCE(ss.ended_at, ss.started_at))
                        FROM   study_sessions ss
                        WHERE  ss.user_id = ?1
                          AND  ss.deck_id = d.id
                    ) AS last_studied
             FROM   deck_subscriptions ds
             JOIN   decks d ON d.id = ds.deck_id
             LEFT JOIN packs p ON p.id = d.pack_id
             WHERE  ds.user_id = ?1
             ORDER  BY COALESCE(last_studied, ds.added_at) DESC, d.name",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare library query: {e}")))?;

    type Row = (
        i64,
        String,
        String,
        Option<String>,
        Option<String>,
        i64,
        Option<String>,
        String,
        String,
        String,
        i64,
        i64,
        i64,
        Option<String>,
    );

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
                row.get(10)?,
                row.get(11)?,
                row.get(12)?,
                row.get(13)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query library decks: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    let decks = rows
        .into_iter()
        .map(
            |(
                id,
                slug,
                title,
                description,
                level,
                word_count,
                tags_json,
                pack_name,
                pack_slug,
                installed_at,
                mastered_count,
                due_count,
                accuracy,
                last_studied,
            )| {
                let tags: Vec<String> = tags_json
                    .as_deref()
                    .and_then(|s| serde_json::from_str(s).ok())
                    .unwrap_or_default();

                LibraryDeckDto {
                    id,
                    slug,
                    title,
                    description,
                    level,
                    word_count,
                    tags,
                    pack_name,
                    pack_slug,
                    installed_at,
                    mastered_count,
                    due_count,
                    accuracy,
                    last_studied,
                    progress: progress_percent(mastered_count, word_count),
                }
            },
        )
        .collect();

    Ok(decks)
}

fn query_deck_detail(
    conn: &Connection,
    user_id: i64,
    deck_id: i64,
) -> Result<DeckDetailDto, AppError> {
    type DeckRow = (
        i64,
        String,
        String,
        Option<String>,
        Option<String>,
        i64,
        Option<String>,
        String,
        String,
        Option<String>,
        i64,
        Option<String>,
        i64,
        i64,
        i64,
        Option<String>,
    );

    let deck: DeckRow = conn
        .query_row(
            "SELECT d.id, d.slug, d.name, d.description, d.difficulty, d.word_count,
                    d.tags, COALESCE(p.name, 'Standalone'), COALESCE(p.slug, 'standalone'),
                    d.cover_image_path,
                    CASE WHEN ds.deck_id IS NOT NULL THEN 1 ELSE 0 END AS installed,
                    ds.added_at,
                    COALESCE((
                        SELECT COUNT(*)
                        FROM   review_cards rc
                        JOIN   deck_words dw ON dw.word_id = rc.word_id AND dw.deck_id = d.id
                        WHERE  rc.user_id = ?2
                          AND  rc.state = 'review'
                    ), 0) AS mastered_count,
                    COALESCE((
                        SELECT COUNT(*)
                        FROM   review_cards rc
                        JOIN   deck_words dw ON dw.word_id = rc.word_id AND dw.deck_id = d.id
                        WHERE  rc.user_id = ?2
                          AND  rc.due <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                    ), 0) AS due_count,
                    COALESCE((
                        SELECT CAST(ROUND(
                            100.0 * SUM(CASE WHEN rl.result = 'pass' THEN 1 ELSE 0 END)
                            / NULLIF(COUNT(*), 0)
                        ) AS INTEGER)
                        FROM   review_logs rl
                        JOIN   deck_words dw ON dw.word_id = rl.word_id AND dw.deck_id = d.id
                        WHERE  rl.user_id = ?2
                    ), 0) AS accuracy,
                    (
                        SELECT MAX(COALESCE(ss.ended_at, ss.started_at))
                        FROM   study_sessions ss
                        WHERE  ss.user_id = ?2
                          AND  ss.deck_id = d.id
                    ) AS last_studied
             FROM   decks d
             LEFT JOIN packs p ON p.id = d.pack_id
             LEFT JOIN deck_subscriptions ds ON ds.deck_id = d.id AND ds.user_id = ?2
             WHERE  d.id = ?1",
            params![deck_id, user_id],
            |row| {
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
                    row.get(10)?,
                    row.get(11)?,
                    row.get(12)?,
                    row.get(13)?,
                    row.get(14)?,
                    row.get(15)?,
                ))
            },
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to query deck detail: {e}")))?
        .ok_or_else(|| AppError::NotFound(format!("Deck {deck_id} was not found")))?;

    let (
        id,
        slug,
        title,
        description,
        level,
        word_count,
        tags_json,
        pack_name,
        pack_slug,
        banner,
        installed,
        installed_at,
        mastered_count,
        due_count,
        accuracy,
        last_studied,
    ) = deck;

    let tags: Vec<String> = tags_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let mut stmt = conn
        .prepare(
            "SELECT w.id, w.headword, w.part_of_speech, w.cefr_level,
                    (
                        SELECT s.definition_en
                        FROM   senses s
                        WHERE  s.word_id = w.id
                        ORDER  BY s.sense_index
                        LIMIT  1
                    ) AS definition_en,
                    (
                        SELECT s.definition_vi
                        FROM   senses s
                        WHERE  s.word_id = w.id
                        ORDER  BY s.sense_index
                        LIMIT  1
                    ) AS definition_vi,
                    (
                        SELECT e.sentence_en
                        FROM   senses s
                        JOIN   examples e ON e.sense_id = s.id
                        WHERE  s.word_id = w.id
                        ORDER  BY s.sense_index, e.id
                        LIMIT  1
                    ) AS example,
                    CASE
                        WHEN rc.due IS NOT NULL
                         AND rc.due <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now') THEN 'Due today'
                        WHEN rc.state = 'review' THEN 'Mastered'
                        WHEN rc.state IS NOT NULL THEN 'Learning'
                        ELSE 'New'
                    END AS due_state
             FROM   deck_words dw
             JOIN   words w ON w.id = dw.word_id
             LEFT JOIN review_cards rc ON rc.word_id = w.id AND rc.user_id = ?2
             WHERE  dw.deck_id = ?1
             ORDER  BY dw.position, w.headword
             LIMIT  8",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare word preview query: {e}")))?;

    let words = stmt
        .query_map(params![deck_id, user_id], |row| {
            Ok(DeckPreviewWordDto {
                id: row.get(0)?,
                headword: row.get(1)?,
                part_of_speech: row.get(2)?,
                level: row.get(3)?,
                definition_en: row.get(4)?,
                definition_vi: row.get(5)?,
                example: row.get(6)?,
                due_state: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query word preview: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DeckDetailDto {
        id,
        slug,
        title,
        description,
        level,
        word_count,
        tags,
        pack_name,
        pack_slug,
        banner,
        installed: installed != 0,
        installed_at,
        progress: DeckDetailProgressDto {
            mastered_count,
            due_count,
            accuracy,
            last_studied,
            progress: progress_percent(mastered_count, word_count),
        },
        words,
    })
}

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

/// Returns the current user's installed library decks with available progress
/// summaries. Missing review/session data is reported as zero or null.
#[tauri::command]
pub fn list_library_decks(db: State<'_, DbConn>) -> Result<LibraryDecksDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    let decks = query_library_decks(&conn, user.id)?;
    let total = decks.len();
    Ok(LibraryDecksDto { decks, total })
}

/// Returns local deck metadata, install state, progress fields, and a small
/// vocabulary preview. Requires an active session.
#[tauri::command]
pub fn get_deck_detail(deck_id: i64, db: State<'_, DbConn>) -> Result<DeckDetailDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    query_deck_detail(&conn, user.id, deck_id)
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
        assert!(
            !decks.is_empty(),
            "bundled decks must be present after seeding"
        );
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
        assert!(
            first.installed,
            "deck must be marked installed after install"
        );
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
        assert!(
            !first.installed,
            "deck must not be installed after uninstall"
        );
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
        assert!(
            first.installed,
            "deck still installed after duplicate insert"
        );
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
        let first = learner_decks
            .iter()
            .find(|d| d.id == first_id)
            .expect("deck");
        assert!(!first.installed, "learner should not see owner's install");
    }

    #[test]
    fn tags_are_parsed_from_json() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "owner");

        let decks = query_discover_decks(&conn, user_id).expect("query");
        let has_tags = decks.iter().any(|d| !d.tags.is_empty());
        assert!(
            has_tags,
            "at least one deck should have non-empty parsed tags"
        );
    }

    #[test]
    fn list_library_decks_returns_only_installed_decks() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let discover = query_discover_decks(&conn, user_id).expect("discover query");
        let first_id = discover[0].id;
        do_install_deck(&conn, user_id, first_id).expect("install");

        let library = query_library_decks(&conn, user_id).expect("library query");

        assert_eq!(library.len(), 1);
        assert_eq!(library[0].id, first_id);
        assert_eq!(library[0].mastered_count, 0);
        assert_eq!(library[0].due_count, 0);
        assert_eq!(library[0].accuracy, 0);
        assert_eq!(library[0].progress, 0);
        assert!(library[0].last_studied.is_none());
    }

    #[test]
    fn list_library_decks_is_scoped_to_current_user() {
        let conn = db_with_data();
        let owner_id = login_as(&conn, "owner");

        let discover = query_discover_decks(&conn, owner_id).expect("discover query");
        do_install_deck(&conn, owner_id, discover[0].id).expect("owner install");

        crate::auth::logout(&conn).expect("logout owner");
        let learner_id = login_as(&conn, "learner");

        let library = query_library_decks(&conn, learner_id).expect("learner library");
        assert!(library.is_empty());
    }

    #[test]
    fn get_deck_detail_returns_metadata_and_word_preview() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let decks = query_discover_decks(&conn, user_id).expect("discover query");
        let first_id = decks[0].id;

        let detail = query_deck_detail(&conn, user_id, first_id).expect("deck detail");

        assert_eq!(detail.id, first_id);
        assert!(!detail.title.is_empty());
        assert!(!detail.pack_name.is_empty());
        assert!(!detail.words.is_empty());
        assert_eq!(detail.progress.mastered_count, 0);
        assert_eq!(detail.progress.due_count, 0);
        assert_eq!(detail.progress.accuracy, 0);
        assert_eq!(detail.progress.progress, 0);
        assert!(detail.words.iter().all(|w| w.due_state == "New"));
    }

    #[test]
    fn get_deck_detail_reports_installed_state_per_user() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let decks = query_discover_decks(&conn, user_id).expect("discover query");
        let first_id = decks[0].id;

        let before = query_deck_detail(&conn, user_id, first_id).expect("before install");
        assert!(!before.installed);
        assert!(before.installed_at.is_none());

        do_install_deck(&conn, user_id, first_id).expect("install");

        let after = query_deck_detail(&conn, user_id, first_id).expect("after install");
        assert!(after.installed);
        assert!(after.installed_at.is_some());
    }

    #[test]
    fn get_deck_detail_returns_not_found_for_missing_deck() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let result = query_deck_detail(&conn, user_id, 999_999);

        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
