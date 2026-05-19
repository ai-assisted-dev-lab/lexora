use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::review::{EnsureReviewCardsForDeckDto, ReviewCardDto};
use crate::errors::AppError;

const SQLITE_UTC_NOW: &str = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

fn review_card_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReviewCardDto> {
    Ok(ReviewCardDto {
        id: row.get(0)?,
        user_id: row.get(1)?,
        vocabulary_item_id: row.get(2)?,
        deck_id: row.get(3)?,
        due: row.get(4)?,
        stability: row.get(5)?,
        difficulty: row.get(6)?,
        elapsed_days: row.get(7)?,
        scheduled_days: row.get(8)?,
        reps: row.get(9)?,
        lapses: row.get(10)?,
        state: row.get(11)?,
        last_review: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}

fn query_review_card(
    conn: &Connection,
    vocabulary_item_id: i64,
    user_id: i64,
) -> Result<Option<ReviewCardDto>, AppError> {
    conn.query_row(
        "SELECT id, user_id, word_id, deck_id, due, stability, difficulty,
                elapsed_days, scheduled_days, reps, lapses, state, last_review,
                created_at, updated_at
         FROM   review_cards
         WHERE  word_id = ?1
           AND  user_id = ?2",
        params![vocabulary_item_id, user_id],
        review_card_from_row,
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to query review card: {e}")))
}

fn query_review_cards_for_deck(
    conn: &Connection,
    deck_id: i64,
    user_id: i64,
) -> Result<Vec<ReviewCardDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT rc.id, rc.user_id, rc.word_id, rc.deck_id, rc.due,
                    rc.stability, rc.difficulty, rc.elapsed_days,
                    rc.scheduled_days, rc.reps, rc.lapses, rc.state,
                    rc.last_review, rc.created_at, rc.updated_at
             FROM   review_cards rc
             JOIN   deck_words dw ON dw.word_id = rc.word_id
             WHERE  dw.deck_id = ?1
               AND  rc.user_id = ?2
             ORDER  BY dw.position, rc.word_id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare review cards query: {e}")))?;

    let cards = stmt
        .query_map(params![deck_id, user_id], review_card_from_row)
        .map_err(|e| AppError::Internal(format!("Failed to query review cards: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read review cards: {e}")))?;

    Ok(cards)
}

fn count_deck_words(conn: &Connection, deck_id: i64) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COUNT(*) FROM deck_words WHERE deck_id = ?1",
        params![deck_id],
        |row| row.get(0),
    )
    .map_err(|e| AppError::Internal(format!("Failed to count deck vocabulary items: {e}")))
}

fn ensure_user_exists(conn: &Connection, user_id: i64) -> Result<(), AppError> {
    let exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)",
            params![user_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to validate user: {e}")))?;

    if exists == 0 {
        return Err(AppError::NotFound(format!("User {user_id} was not found")));
    }

    Ok(())
}

fn ensure_deck_exists(conn: &Connection, deck_id: i64) -> Result<(), AppError> {
    let exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM decks WHERE id = ?1)",
            params![deck_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to validate deck: {e}")))?;

    if exists == 0 {
        return Err(AppError::NotFound(format!("Deck {deck_id} was not found")));
    }

    Ok(())
}

fn review_card_count_for_deck(
    conn: &Connection,
    deck_id: i64,
    user_id: i64,
) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COUNT(*)
         FROM   review_cards rc
         JOIN   deck_words dw ON dw.word_id = rc.word_id
         WHERE  dw.deck_id = ?1
           AND  rc.user_id = ?2",
        params![deck_id, user_id],
        |row| row.get(0),
    )
    .map_err(|e| AppError::Internal(format!("Failed to count existing review cards: {e}")))
}

fn ensure_review_cards_for_deck_at(
    conn: &Connection,
    deck_id: i64,
    user_id: i64,
    now_sql: &str,
) -> Result<EnsureReviewCardsForDeckDto, AppError> {
    ensure_user_exists(conn, user_id)?;
    ensure_deck_exists(conn, deck_id)?;

    let total_vocabulary_items = count_deck_words(conn, deck_id)?;
    let before_count = review_card_count_for_deck(conn, deck_id, user_id)?;

    let sql = format!(
        "INSERT OR IGNORE INTO review_cards (
             user_id, word_id, deck_id, due, stability, difficulty,
             elapsed_days, scheduled_days, reps, lapses, state, last_review,
             created_at, updated_at
         )
         SELECT ?1, dw.word_id, ?2, {now}, 0.0, 0.0,
                0, 0, 0, 0, 'new', NULL, {now}, {now}
         FROM   deck_words dw
         WHERE  dw.deck_id = ?2",
        now = now_sql,
    );

    conn.execute(&sql, params![user_id, deck_id])
        .map_err(|e| AppError::Internal(format!("Failed to create review cards: {e}")))?;

    let after_count = review_card_count_for_deck(conn, deck_id, user_id)?;
    let created_count = after_count - before_count;
    let cards = query_review_cards_for_deck(conn, deck_id, user_id)?;

    Ok(EnsureReviewCardsForDeckDto {
        deck_id,
        user_id,
        total_vocabulary_items,
        created_count,
        existing_count: after_count - created_count,
        cards,
    })
}

pub fn ensure_review_cards_for_deck_for_user(
    conn: &Connection,
    deck_id: i64,
    user_id: i64,
) -> Result<EnsureReviewCardsForDeckDto, AppError> {
    ensure_review_cards_for_deck_at(conn, deck_id, user_id, SQLITE_UTC_NOW)
}

/// Creates missing FSRS review cards for every vocabulary item in a deck for
/// the current user. Safe to call repeatedly; existing cards are preserved.
#[tauri::command]
pub fn ensure_review_cards_for_deck(
    deck_id: i64,
    db: State<'_, DbConn>,
) -> Result<EnsureReviewCardsForDeckDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    ensure_review_cards_for_deck_for_user(&conn, deck_id, user.id)
}

/// Returns the current user's review card for a vocabulary item, or null when
/// the item has not entered learning yet.
#[tauri::command]
pub fn get_review_card(
    vocabulary_item_id: i64,
    db: State<'_, DbConn>,
) -> Result<Option<ReviewCardDto>, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    query_review_card(&conn, vocabulary_item_id, user.id)
}

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

    fn first_deck_id(conn: &Connection) -> i64 {
        conn.query_row("SELECT id FROM decks ORDER BY id LIMIT 1", [], |row| {
            row.get(0)
        })
        .expect("seed deck")
    }

    fn first_word_id_for_deck(conn: &Connection, deck_id: i64) -> i64 {
        conn.query_row(
            "SELECT word_id FROM deck_words WHERE deck_id = ?1 ORDER BY position LIMIT 1",
            params![deck_id],
            |row| row.get(0),
        )
        .expect("deck word")
    }

    #[test]
    fn ensure_review_cards_for_deck_creates_one_card_per_deck_word() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let result =
            ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-01T00:00:00Z'")
                .expect("ensure cards");

        assert_eq!(result.created_count, result.total_vocabulary_items);
        assert_eq!(result.existing_count, 0);
        assert_eq!(result.cards.len() as i64, result.total_vocabulary_items);
        assert!(result.cards.iter().all(|card| card.user_id == user_id));
        assert!(result
            .cards
            .iter()
            .all(|card| card.deck_id == Some(deck_id)));
    }

    #[test]
    fn ensure_review_cards_for_deck_is_idempotent() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let first =
            ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-01T00:00:00Z'")
                .expect("first ensure");
        let second =
            ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-02T00:00:00Z'")
                .expect("second ensure");

        assert!(first.created_count > 0);
        assert_eq!(second.created_count, 0);
        assert_eq!(second.existing_count, first.total_vocabulary_items);
        assert_eq!(second.cards.len(), first.cards.len());
        assert!(
            second
                .cards
                .iter()
                .all(|card| card.due == "2026-01-01T00:00:00Z"),
            "existing card due timestamps must be preserved"
        );
    }

    #[test]
    fn created_cards_use_initial_fsrs_state() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let result =
            ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-01T00:00:00Z'")
                .expect("ensure cards");
        let card = &result.cards[0];

        assert_eq!(card.due, "2026-01-01T00:00:00Z");
        assert_eq!(card.stability, 0.0);
        assert_eq!(card.difficulty, 0.0);
        assert_eq!(card.elapsed_days, 0);
        assert_eq!(card.scheduled_days, 0);
        assert_eq!(card.reps, 0);
        assert_eq!(card.lapses, 0);
        assert_eq!(card.state, "new");
        assert!(card.last_review.is_none());
    }

    #[test]
    fn get_review_card_returns_created_card_for_user_and_word() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let word_id = first_word_id_for_deck(&conn, deck_id);

        ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-01T00:00:00Z'")
            .expect("ensure cards");

        let card = query_review_card(&conn, word_id, user_id)
            .expect("query card")
            .expect("review card");

        assert_eq!(card.vocabulary_item_id, word_id);
        assert_eq!(card.user_id, user_id);
        assert_eq!(card.deck_id, Some(deck_id));
    }

    #[test]
    fn get_review_card_is_user_scoped() {
        let conn = db_with_data();
        let owner_id = login_as(&conn, "owner");
        let deck_id = first_deck_id(&conn);
        let word_id = first_word_id_for_deck(&conn, deck_id);

        ensure_review_cards_for_deck_at(&conn, deck_id, owner_id, "'2026-01-01T00:00:00Z'")
            .expect("owner cards");

        crate::auth::logout(&conn).expect("logout owner");
        let learner_id = login_as(&conn, "learner");
        let learner_card = query_review_card(&conn, word_id, learner_id).expect("query learner");

        assert!(learner_card.is_none());
    }

    #[test]
    fn ensure_review_cards_for_deck_returns_not_found_for_missing_deck() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let result = ensure_review_cards_for_deck_for_user(&conn, 999_999, user_id);

        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
