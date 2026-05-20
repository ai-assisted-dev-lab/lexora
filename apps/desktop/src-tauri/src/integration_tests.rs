use rusqlite::{params, Connection};

use crate::dto::review::{
    CompleteStudySessionInputDto, ReviewCardDto, ReviewCardStateInputDto,
    StartFlashcardSessionInputDto, SubmitFlashcardReviewInputDto,
};
use crate::dto::search::SearchFiltersDto;

fn seeded_db() -> Connection {
    let mut conn = Connection::open_in_memory().expect("in-memory DB");
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .expect("foreign keys");
    crate::db::migrations::run(&mut conn).expect("migrations");
    crate::db::seeder::load_bundled(&mut conn).expect("seed");
    crate::auth::create_default_accounts(&conn).expect("accounts");
    conn
}

fn login_as(conn: &Connection, username: &str) -> i64 {
    crate::auth::logout(conn).expect("reset session");
    crate::auth::login(conn, username, username).expect("login");
    crate::auth::require_session(conn).expect("session").id
}

fn first_deck_id(conn: &Connection) -> i64 {
    conn.query_row("SELECT id FROM decks ORDER BY id LIMIT 1", [], |row| {
        row.get(0)
    })
    .expect("seed deck")
}

fn next_state_for(card: &ReviewCardDto, rating: &str) -> ReviewCardStateInputDto {
    ReviewCardStateInputDto {
        due: "2026-01-02T00:00:00Z".to_string(),
        stability: match rating {
            "again" => 0.6,
            "hard" => 1.2,
            "good" => 2.5,
            "easy" => 4.0,
            _ => 1.0,
        },
        difficulty: match rating {
            "again" => 8.0,
            "hard" => 6.5,
            "good" => 5.0,
            "easy" => 3.5,
            _ => 5.0,
        },
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: if rating == "again" { 1 } else { 0 },
        reps: card.reps + 1,
        lapses: card.lapses + if rating == "again" { 1 } else { 0 },
        state: if rating == "again" {
            "learning".to_string()
        } else {
            "review".to_string()
        },
        last_review: Some("2026-01-01T00:00:00Z".to_string()),
    }
}

fn submit_input(
    session_id: i64,
    card: &ReviewCardDto,
    rating: &str,
) -> SubmitFlashcardReviewInputDto {
    SubmitFlashcardReviewInputDto {
        session_id,
        review_card_id: card.id,
        vocabulary_item_id: card.vocabulary_item_id,
        rating: rating.to_string(),
        reviewed_at: "2026-01-01T00:00:00Z".to_string(),
        response_time_ms: Some(1200),
        next_state: next_state_for(card, rating),
    }
}

#[test]
fn seeded_database_loads_searchable_demo_content() {
    let conn = seeded_db();

    let counts: (i64, i64, i64) = conn
        .query_row(
            "SELECT
                (SELECT COUNT(*) FROM packs),
                (SELECT COUNT(*) FROM decks),
                (SELECT COUNT(*) FROM words)",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("seed counts");

    assert_eq!(counts, (1, 3, 15));

    let response = crate::commands::search::search_with_conn(
        &conn,
        "run".to_string(),
        Some(SearchFiltersDto {
            result_types: Some(vec!["word".to_string()]),
            deck_id: None,
            limit: Some(5),
        }),
    )
    .expect("search");

    assert!(response.total >= 1);
    assert!(response
        .groups
        .iter()
        .flat_map(|group| &group.results)
        .any(|result| result.title == "run" && result.route.starts_with("/word/")));
}

#[test]
fn flashcard_review_flow_writes_and_reads_review_log() {
    let conn = seeded_db();
    let user_id = login_as(&conn, "learner");
    let deck_id = first_deck_id(&conn);

    let session = crate::commands::review::start_flashcard_session_for_user_at(
        &conn,
        user_id,
        StartFlashcardSessionInputDto {
            deck_id: Some(deck_id),
            session_length: 1,
            mode: "flashcard".to_string(),
        },
        "'2026-01-01T00:00:00Z'",
    )
    .expect("start flashcard session");

    let card = &session.queue.items[0].card;
    let result = crate::commands::review::submit_flashcard_review_for_user(
        &conn,
        user_id,
        submit_input(session.session_id, card, "good"),
    )
    .expect("submit flashcard review");

    assert_eq!(result.session.reviewed_count, 1);
    assert_eq!(result.session.correct_count, 1);
    assert_eq!(result.card.reps, card.reps + 1);

    let log: (i64, i64, i64, String, i64, String, Option<i64>, String) = conn
        .query_row(
            "SELECT user_id, session_id, word_id, mode, rating, result,
                    response_time_ms, reviewed_at
             FROM review_logs
             WHERE session_id = ?1",
            params![session.session_id],
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
                ))
            },
        )
        .expect("review log");

    assert_eq!(log.0, user_id);
    assert_eq!(log.1, session.session_id);
    assert_eq!(log.2, card.vocabulary_item_id);
    assert_eq!(log.3, "flashcard");
    assert_eq!(log.4, 3);
    assert_eq!(log.5, "pass");
    assert_eq!(log.6, Some(1200));
    assert_eq!(log.7, "2026-01-01T00:00:00Z");

    let summary = crate::commands::review::complete_study_session_for_user_at(
        &conn,
        user_id,
        CompleteStudySessionInputDto {
            session_id: session.session_id,
        },
        "'2026-01-01T00:02:00Z'",
    )
    .expect("complete session");

    assert_eq!(summary.reviewed_count, 1);
    assert_eq!(summary.correct_count, 1);
    assert_eq!(summary.accuracy, 100);
}
