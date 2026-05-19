use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::review::{
    EnsureReviewCardsForDeckDto, ReviewCardDto, SmartReviewQueueDto, SmartReviewQueueItemDto,
    SmartReviewQueueRequestDto, SmartReviewQueueSummaryDto,
};
use crate::errors::AppError;

const SQLITE_UTC_NOW: &str = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";
const SMART_REVIEW_MODE: &str = "smart_review";

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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum QueueCategory {
    Due,
    Weak,
    New,
}

impl QueueCategory {
    fn as_str(self) -> &'static str {
        match self {
            QueueCategory::Due => "due",
            QueueCategory::Weak => "weak",
            QueueCategory::New => "new",
        }
    }
}

#[derive(Clone, Debug)]
struct QueueCandidate {
    card: ReviewCardDto,
    headword: String,
    part_of_speech: Option<String>,
    definition_en: Option<String>,
    definition_vi: Option<String>,
}

impl QueueCandidate {
    fn into_item(self, position: i64, category: QueueCategory) -> SmartReviewQueueItemDto {
        SmartReviewQueueItemDto {
            position,
            category: category.as_str().to_string(),
            card: self.card,
            headword: self.headword,
            part_of_speech: self.part_of_speech,
            definition_en: self.definition_en,
            definition_vi: self.definition_vi,
        }
    }
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

fn queue_candidate_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<QueueCandidate> {
    Ok(QueueCandidate {
        card: review_card_from_row(row)?,
        headword: row.get(15)?,
        part_of_speech: row.get(16)?,
        definition_en: row.get(17)?,
        definition_vi: row.get(18)?,
    })
}

fn queue_scope_predicate() -> &'static str {
    "(
        (?2 IS NOT NULL AND dw.deck_id = ?2)
        OR
        (?2 IS NULL AND EXISTS (
            SELECT 1
            FROM   deck_subscriptions ds
            WHERE  ds.user_id = rc.user_id
              AND  ds.deck_id = dw.deck_id
        ))
    )"
}

fn query_queue_candidates(
    conn: &Connection,
    user_id: i64,
    deck_id: Option<i64>,
    now_sql: &str,
    category: QueueCategory,
) -> Result<Vec<QueueCandidate>, AppError> {
    let category_filter = match category {
        QueueCategory::Due => format!("rc.state != 'new' AND rc.due <= {now_sql}"),
        QueueCategory::Weak => format!(
            "rc.state != 'new'
             AND rc.due > {now_sql}
             AND (rc.lapses > 0 OR rc.difficulty >= 7.0 OR (rc.stability > 0.0 AND rc.stability < 2.0))"
        ),
        QueueCategory::New => "rc.state = 'new'".to_string(),
    };
    let order_by = match category {
        QueueCategory::Due => "rc.due ASC, rc.lapses DESC, rc.id ASC",
        QueueCategory::Weak => {
            "rc.lapses DESC, rc.difficulty DESC, rc.stability ASC, rc.last_review ASC, rc.id ASC"
        }
        QueueCategory::New => "MIN(dw.position) ASC, rc.word_id ASC",
    };
    let sql = format!(
        "SELECT rc.id, rc.user_id, rc.word_id, rc.deck_id, rc.due,
                rc.stability, rc.difficulty, rc.elapsed_days,
                rc.scheduled_days, rc.reps, rc.lapses, rc.state,
                rc.last_review, rc.created_at, rc.updated_at,
                w.headword, w.part_of_speech,
                (
                    SELECT s.definition_en
                    FROM   senses s
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, s.id
                    LIMIT  1
                ) AS definition_en,
                (
                    SELECT s.definition_vi
                    FROM   senses s
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, s.id
                    LIMIT  1
                ) AS definition_vi
         FROM   review_cards rc
         JOIN   words w ON w.id = rc.word_id
         JOIN   deck_words dw ON dw.word_id = rc.word_id
         WHERE  rc.user_id = ?1
           AND  {scope}
           AND  {category_filter}
         GROUP  BY rc.id
         ORDER  BY {order_by}",
        scope = queue_scope_predicate(),
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| {
        AppError::Internal(format!(
            "Failed to prepare {} queue query: {e}",
            category.as_str()
        ))
    })?;

    let rows = stmt
        .query_map(params![user_id, deck_id], queue_candidate_from_row)
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to query {} queue candidates: {e}",
                category.as_str()
            ))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to read {} queue candidates: {e}",
                category.as_str()
            ))
        })?;

    Ok(rows)
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

fn ensure_review_cards_for_installed_decks_at(
    conn: &Connection,
    user_id: i64,
    now_sql: &str,
) -> Result<(), AppError> {
    ensure_user_exists(conn, user_id)?;

    let sql = format!(
        "INSERT OR IGNORE INTO review_cards (
             user_id, word_id, deck_id, due, stability, difficulty,
             elapsed_days, scheduled_days, reps, lapses, state, last_review,
             created_at, updated_at
         )
         SELECT ?1, dw.word_id, MIN(ds.deck_id), {now}, 0.0, 0.0,
                0, 0, 0, 0, 'new', NULL, {now}, {now}
         FROM   deck_subscriptions ds
         JOIN   deck_words dw ON dw.deck_id = ds.deck_id
         WHERE  ds.user_id = ?1
         GROUP  BY dw.word_id",
        now = now_sql,
    );

    conn.execute(&sql, params![user_id]).map_err(|e| {
        AppError::Internal(format!(
            "Failed to create review cards for installed decks: {e}"
        ))
    })?;

    Ok(())
}

fn prepare_review_cards_for_queue(
    conn: &Connection,
    user_id: i64,
    deck_id: Option<i64>,
    now_sql: &str,
) -> Result<(), AppError> {
    if let Some(deck_id) = deck_id {
        ensure_review_cards_for_deck_at(conn, deck_id, user_id, now_sql)?;
    } else {
        ensure_review_cards_for_installed_decks_at(conn, user_id, now_sql)?;
    }

    Ok(())
}

fn validate_smart_queue_request(input: &SmartReviewQueueRequestDto) -> Result<(), AppError> {
    if input.mode != SMART_REVIEW_MODE {
        return Err(AppError::Validation(format!(
            "Unsupported review queue mode '{}'. Only '{SMART_REVIEW_MODE}' is available.",
            input.mode
        )));
    }

    if !(1..=200).contains(&input.session_length) {
        return Err(AppError::Validation(
            "sessionLength must be between 1 and 200".to_string(),
        ));
    }

    for (name, ratio) in [
        ("dueRatio", input.due_ratio),
        ("weakRatio", input.weak_ratio),
        ("newRatio", input.new_ratio),
    ] {
        if !ratio.is_finite() || ratio < 0.0 {
            return Err(AppError::Validation(format!(
                "{name} must be a finite non-negative number"
            )));
        }
    }

    if input.due_ratio + input.weak_ratio + input.new_ratio <= 0.0 {
        return Err(AppError::Validation(
            "At least one queue ratio must be greater than zero".to_string(),
        ));
    }

    Ok(())
}

fn target_counts(input: &SmartReviewQueueRequestDto) -> (usize, usize, usize) {
    let length = input.session_length as usize;
    let total_ratio = input.due_ratio + input.weak_ratio + input.new_ratio;
    let exact = [
        (
            QueueCategory::Due,
            length as f64 * input.due_ratio / total_ratio,
        ),
        (
            QueueCategory::Weak,
            length as f64 * input.weak_ratio / total_ratio,
        ),
        (
            QueueCategory::New,
            length as f64 * input.new_ratio / total_ratio,
        ),
    ];
    let mut counts = [
        (
            QueueCategory::Due,
            exact[0].1.floor() as usize,
            exact[0].1.fract(),
        ),
        (
            QueueCategory::Weak,
            exact[1].1.floor() as usize,
            exact[1].1.fract(),
        ),
        (
            QueueCategory::New,
            exact[2].1.floor() as usize,
            exact[2].1.fract(),
        ),
    ];

    let assigned: usize = counts.iter().map(|(_, count, _)| *count).sum();
    let mut remaining = length.saturating_sub(assigned);
    counts.sort_by(|left, right| {
        right
            .2
            .partial_cmp(&left.2)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| category_priority(left.0).cmp(&category_priority(right.0)))
    });

    for (_, count, _) in &mut counts {
        if remaining == 0 {
            break;
        }
        *count += 1;
        remaining -= 1;
    }

    let mut due = 0;
    let mut weak = 0;
    let mut new = 0;
    for (category, count, _) in counts {
        match category {
            QueueCategory::Due => due = count,
            QueueCategory::Weak => weak = count,
            QueueCategory::New => new = count,
        }
    }

    (due, weak, new)
}

fn category_priority(category: QueueCategory) -> u8 {
    match category {
        QueueCategory::Due => 0,
        QueueCategory::Weak => 1,
        QueueCategory::New => 2,
    }
}

fn take_candidates(
    source: &[QueueCandidate],
    start: &mut usize,
    count: usize,
    category: QueueCategory,
    items: &mut Vec<SmartReviewQueueItemDto>,
) {
    for candidate in source.iter().skip(*start).take(count) {
        let position = items.len() as i64;
        items.push(candidate.clone().into_item(position, category));
        *start += 1;
    }
}

fn build_queue_items(
    input: &SmartReviewQueueRequestDto,
    due: Vec<QueueCandidate>,
    weak: Vec<QueueCandidate>,
    new: Vec<QueueCandidate>,
) -> Vec<SmartReviewQueueItemDto> {
    let (due_target, weak_target, new_target) = target_counts(input);
    let requested_length = input.session_length as usize;
    let mut items = Vec::with_capacity(requested_length);
    let mut due_index = 0;
    let mut weak_index = 0;
    let mut new_index = 0;

    take_candidates(
        &due,
        &mut due_index,
        due_target.min(due.len()),
        QueueCategory::Due,
        &mut items,
    );
    take_candidates(
        &weak,
        &mut weak_index,
        weak_target.min(weak.len()),
        QueueCategory::Weak,
        &mut items,
    );
    take_candidates(
        &new,
        &mut new_index,
        new_target.min(new.len()),
        QueueCategory::New,
        &mut items,
    );

    while items.len() < requested_length {
        let before = items.len();
        take_candidates(
            &due,
            &mut due_index,
            requested_length - items.len(),
            QueueCategory::Due,
            &mut items,
        );
        take_candidates(
            &weak,
            &mut weak_index,
            requested_length - items.len(),
            QueueCategory::Weak,
            &mut items,
        );
        take_candidates(
            &new,
            &mut new_index,
            requested_length - items.len(),
            QueueCategory::New,
            &mut items,
        );

        if items.len() == before {
            break;
        }
    }

    items
}

fn generated_at(conn: &Connection, now_sql: &str) -> Result<String, AppError> {
    let sql = format!("SELECT {now_sql}");
    conn.query_row(&sql, [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to resolve queue timestamp: {e}")))
}

fn smart_queue_summary(
    items: &[SmartReviewQueueItemDto],
    requested_length: i64,
) -> SmartReviewQueueSummaryDto {
    SmartReviewQueueSummaryDto {
        due_count: items
            .iter()
            .filter(|item| item.category == QueueCategory::Due.as_str())
            .count() as i64,
        weak_count: items
            .iter()
            .filter(|item| item.category == QueueCategory::Weak.as_str())
            .count() as i64,
        new_count: items
            .iter()
            .filter(|item| item.category == QueueCategory::New.as_str())
            .count() as i64,
        requested_length,
        returned_length: items.len() as i64,
    }
}

fn generate_smart_review_queue_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: SmartReviewQueueRequestDto,
    now_sql: &str,
) -> Result<SmartReviewQueueDto, AppError> {
    validate_smart_queue_request(&input)?;
    prepare_review_cards_for_queue(conn, user_id, input.deck_id, now_sql)?;

    let due = query_queue_candidates(conn, user_id, input.deck_id, now_sql, QueueCategory::Due)?;
    let weak = query_queue_candidates(conn, user_id, input.deck_id, now_sql, QueueCategory::Weak)?;
    let new = query_queue_candidates(conn, user_id, input.deck_id, now_sql, QueueCategory::New)?;
    let generated_at = generated_at(conn, now_sql)?;
    let items = build_queue_items(&input, due, weak, new);
    let summary = smart_queue_summary(&items, input.session_length);

    Ok(SmartReviewQueueDto {
        user_id,
        deck_id: input.deck_id,
        mode: input.mode,
        generated_at,
        summary,
        items,
    })
}

pub fn generate_smart_review_queue_for_user(
    conn: &Connection,
    user_id: i64,
    input: SmartReviewQueueRequestDto,
) -> Result<SmartReviewQueueDto, AppError> {
    generate_smart_review_queue_for_user_at(conn, user_id, input, SQLITE_UTC_NOW)
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

/// Generates a Smart Review queue for the current user. This command may create
/// missing initial review cards, but it does not update scheduling state.
#[tauri::command]
pub fn generate_smart_review_queue(
    input: SmartReviewQueueRequestDto,
    db: State<'_, DbConn>,
) -> Result<SmartReviewQueueDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    generate_smart_review_queue_for_user(&conn, user.id, input)
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

    fn word_ids_for_deck(conn: &Connection, deck_id: i64) -> Vec<i64> {
        let mut stmt = conn
            .prepare("SELECT word_id FROM deck_words WHERE deck_id = ?1 ORDER BY position")
            .expect("prepare deck word ids");
        stmt.query_map(params![deck_id], |row| row.get(0))
            .expect("query deck word ids")
            .collect::<Result<Vec<_>, _>>()
            .expect("read deck word ids")
    }

    fn smart_request(
        deck_id: Option<i64>,
        session_length: i64,
        due_ratio: f64,
        weak_ratio: f64,
        new_ratio: f64,
    ) -> SmartReviewQueueRequestDto {
        SmartReviewQueueRequestDto {
            deck_id,
            session_length,
            due_ratio,
            weak_ratio,
            new_ratio,
            mode: SMART_REVIEW_MODE.to_string(),
        }
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

    #[test]
    fn smart_review_queue_respects_length_and_ratios() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let word_ids = word_ids_for_deck(&conn, deck_id);

        ensure_review_cards_for_deck_at(&conn, deck_id, user_id, "'2026-01-01T00:00:00Z'")
            .expect("ensure cards");

        for word_id in &word_ids[0..2] {
            conn.execute(
                "UPDATE review_cards
                 SET state = 'review', due = '2025-12-31T00:00:00Z', reps = 3
                 WHERE user_id = ?1 AND word_id = ?2",
                params![user_id, word_id],
            )
            .expect("mark due");
        }
        for word_id in &word_ids[2..4] {
            conn.execute(
                "UPDATE review_cards
                 SET state = 'review', due = '2026-01-10T00:00:00Z',
                     reps = 5, lapses = 1, difficulty = 8.0, stability = 1.5
                 WHERE user_id = ?1 AND word_id = ?2",
                params![user_id, word_id],
            )
            .expect("mark weak");
        }

        let queue = generate_smart_review_queue_for_user_at(
            &conn,
            user_id,
            smart_request(Some(deck_id), 5, 0.4, 0.4, 0.2),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("queue");

        assert_eq!(queue.items.len(), 5);
        assert_eq!(queue.summary.due_count, 2);
        assert_eq!(queue.summary.weak_count, 2);
        assert_eq!(queue.summary.new_count, 1);
        assert_eq!(
            queue
                .items
                .iter()
                .map(|item| item.category.as_str())
                .collect::<Vec<_>>(),
            vec!["due", "due", "weak", "weak", "new"]
        );
    }

    #[test]
    fn smart_review_queue_falls_back_when_priority_categories_are_sparse() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let queue = generate_smart_review_queue_for_user_at(
            &conn,
            user_id,
            smart_request(Some(deck_id), 4, 1.0, 0.0, 0.0),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("queue");

        assert_eq!(queue.summary.requested_length, 4);
        assert_eq!(queue.summary.returned_length, 4);
        assert_eq!(queue.summary.due_count, 0);
        assert_eq!(queue.summary.weak_count, 0);
        assert_eq!(queue.summary.new_count, 4);
        assert!(queue.items.iter().all(|item| item.category == "new"));
    }

    #[test]
    fn smart_review_queue_generates_for_seeded_deck_and_creates_initial_cards() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let before_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM review_cards WHERE user_id = ?1",
                params![user_id],
                |row| row.get(0),
            )
            .expect("before count");

        let queue = generate_smart_review_queue_for_user_at(
            &conn,
            user_id,
            smart_request(Some(deck_id), 3, 0.6, 0.2, 0.2),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("queue");

        let after_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM review_cards WHERE user_id = ?1",
                params![user_id],
                |row| row.get(0),
            )
            .expect("after count");

        assert_eq!(before_count, 0);
        assert!(after_count >= queue.summary.returned_length);
        assert_eq!(queue.summary.returned_length, 3);
        assert!(queue
            .items
            .iter()
            .all(|item| item.card.deck_id == Some(deck_id)));
        assert!(queue.items.iter().all(|item| !item.headword.is_empty()));
    }

    #[test]
    fn smart_review_queue_without_deck_uses_installed_decks() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        conn.execute(
            "INSERT INTO deck_subscriptions(user_id, deck_id, added_at)
             VALUES(?1, ?2, '2026-01-01T00:00:00Z')",
            params![user_id, deck_id],
        )
        .expect("subscribe");

        let queue = generate_smart_review_queue_for_user_at(
            &conn,
            user_id,
            smart_request(None, 2, 0.0, 0.0, 1.0),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("queue");

        assert_eq!(queue.deck_id, None);
        assert_eq!(queue.summary.returned_length, 2);
        assert!(queue.items.iter().all(|item| item.category == "new"));
    }

    #[test]
    fn smart_review_queue_rejects_unsupported_modes() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let mut input = smart_request(Some(deck_id), 5, 1.0, 0.0, 0.0);
        input.mode = "cram".to_string();

        let result = generate_smart_review_queue_for_user_at(
            &conn,
            user_id,
            input,
            "'2026-01-01T00:00:00Z'",
        );

        assert!(matches!(result, Err(AppError::Validation(_))));
    }
}
