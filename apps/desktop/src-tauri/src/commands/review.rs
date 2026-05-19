use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::review::{
    CompleteStudySessionInputDto, EnsureReviewCardsForDeckDto, MultipleChoiceOptionDto,
    MultipleChoiceQuestionDto, MultipleChoiceSessionDto, ReviewCardDto, ReviewCardStateInputDto,
    SmartReviewQueueDto, SmartReviewQueueItemDto, SmartReviewQueueRequestDto,
    SmartReviewQueueSummaryDto, StartFlashcardSessionInputDto, StartMultipleChoiceSessionInputDto,
    StartTypeAnswerSessionInputDto, StartWeakWordsDrillInputDto, StudySessionDto,
    StudySessionProgressDto, StudySessionSummaryDto, SubmitFlashcardReviewInputDto,
    SubmitMultipleChoiceReviewInputDto, SubmitReviewResultDto, SubmitTypeAnswerReviewInputDto,
    WeakWordsDto,
};
use crate::errors::AppError;

const SQLITE_UTC_NOW: &str = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";
const SMART_REVIEW_MODE: &str = "smart_review";
const FLASHCARD_MODE: &str = "flashcard";
const MULTIPLE_CHOICE_MODE: &str = "multiple_choice";
const TYPE_ANSWER_MODE: &str = "type_answer";
const WEAK_DRILL_MODE: &str = "weak_drill";

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
        learning_steps: row.get(9)?,
        reps: row.get(10)?,
        lapses: row.get(11)?,
        state: row.get(12)?,
        last_review: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
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
    ipa_uk: Option<String>,
    ipa_us: Option<String>,
    definition_en: Option<String>,
    definition_vi: Option<String>,
    example_sentence_en: Option<String>,
    example_sentence_vi: Option<String>,
    additional_sense_count: i64,
}

impl QueueCandidate {
    fn into_item(self, position: i64, category: QueueCategory) -> SmartReviewQueueItemDto {
        SmartReviewQueueItemDto {
            position,
            category: category.as_str().to_string(),
            card: self.card,
            headword: self.headword,
            part_of_speech: self.part_of_speech,
            ipa_uk: self.ipa_uk,
            ipa_us: self.ipa_us,
            definition_en: self.definition_en,
            definition_vi: self.definition_vi,
            example_sentence_en: self.example_sentence_en,
            example_sentence_vi: self.example_sentence_vi,
            additional_sense_count: self.additional_sense_count,
        }
    }
}

#[derive(Clone, Debug)]
struct MultipleChoiceOptionCandidate {
    vocabulary_item_id: i64,
    label: String,
}

fn primary_option_label(
    definition_vi: Option<&str>,
    definition_en: Option<&str>,
    headword: &str,
) -> String {
    definition_vi
        .or(definition_en)
        .unwrap_or(headword)
        .trim()
        .to_string()
}

fn normalize_option_label(label: &str) -> String {
    label.trim().to_lowercase()
}

fn stable_option_sort_key(question_word_id: i64, option: &MultipleChoiceOptionDto) -> i64 {
    (option.vocabulary_item_id * 31 + question_word_id * 17 + option.label.len() as i64)
        .rem_euclid(997)
}

fn query_review_card(
    conn: &Connection,
    vocabulary_item_id: i64,
    user_id: i64,
) -> Result<Option<ReviewCardDto>, AppError> {
    conn.query_row(
        "SELECT id, user_id, word_id, deck_id, due, stability, difficulty,
                elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review,
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
        headword: row.get(16)?,
        part_of_speech: row.get(17)?,
        ipa_uk: row.get(18)?,
        ipa_us: row.get(19)?,
        definition_en: row.get(20)?,
        definition_vi: row.get(21)?,
        example_sentence_en: row.get(22)?,
        example_sentence_vi: row.get(23)?,
        additional_sense_count: row.get(24)?,
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
                rc.scheduled_days, rc.learning_steps, rc.reps, rc.lapses, rc.state,
                rc.last_review, rc.created_at, rc.updated_at,
                w.headword, w.part_of_speech, w.ipa_uk, w.ipa_us,
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
                ) AS definition_vi,
                (
                    SELECT e.sentence_en
                    FROM   senses s
                    JOIN   examples e ON e.sense_id = s.id
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, e.id
                    LIMIT  1
                ) AS example_sentence_en,
                (
                    SELECT e.sentence_vi
                    FROM   senses s
                    JOIN   examples e ON e.sense_id = s.id
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, e.id
                    LIMIT  1
                ) AS example_sentence_vi,
                MAX(0, (
                    SELECT COUNT(*)
                    FROM   senses s
                    WHERE  s.word_id = w.id
                ) - 1) AS additional_sense_count
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

fn query_multiple_choice_option_candidates(
    conn: &Connection,
    target_word_id: i64,
    deck_id: Option<i64>,
    limit: i64,
) -> Result<Vec<MultipleChoiceOptionCandidate>, AppError> {
    let mut candidates = Vec::new();
    let scoped_sql = "
        SELECT DISTINCT w.id,
               COALESCE(
                   NULLIF((
                       SELECT s.definition_vi
                       FROM   senses s
                       WHERE  s.word_id = w.id
                       ORDER  BY s.sense_index, s.id
                       LIMIT  1
                   ), ''),
                   NULLIF((
                       SELECT s.definition_en
                       FROM   senses s
                       WHERE  s.word_id = w.id
                       ORDER  BY s.sense_index, s.id
                       LIMIT  1
                   ), ''),
                   w.headword
               ) AS label
        FROM   words target
        JOIN   words w ON w.id != target.id
        JOIN   deck_words dw ON dw.word_id = w.id
        WHERE  target.id = ?1
          AND  (?2 IS NULL OR dw.deck_id = ?2)
        ORDER  BY
               CASE WHEN w.part_of_speech IS target.part_of_speech THEN 0 ELSE 1 END,
               CASE WHEN w.cefr_level IS target.cefr_level THEN 0 ELSE 1 END,
               dw.position ASC,
               w.id ASC
        LIMIT  ?3";

    read_option_candidates(
        conn,
        scoped_sql,
        params![target_word_id, deck_id, limit],
        &mut candidates,
    )?;

    if candidates.len() < limit as usize {
        let fallback_sql = "
            SELECT DISTINCT w.id,
                   COALESCE(
                       NULLIF((
                           SELECT s.definition_vi
                           FROM   senses s
                           WHERE  s.word_id = w.id
                           ORDER  BY s.sense_index, s.id
                           LIMIT  1
                       ), ''),
                       NULLIF((
                           SELECT s.definition_en
                           FROM   senses s
                           WHERE  s.word_id = w.id
                           ORDER  BY s.sense_index, s.id
                           LIMIT  1
                       ), ''),
                       w.headword
                   ) AS label
            FROM   words target
            JOIN   words w ON w.id != target.id
            WHERE  target.id = ?1
            ORDER  BY
                   CASE WHEN w.part_of_speech IS target.part_of_speech THEN 0 ELSE 1 END,
                   CASE WHEN w.cefr_level IS target.cefr_level THEN 0 ELSE 1 END,
                   w.frequency_rank IS NULL,
                   w.frequency_rank ASC,
                   w.id ASC
            LIMIT  ?2";
        read_option_candidates(
            conn,
            fallback_sql,
            params![target_word_id, limit * 3],
            &mut candidates,
        )?;
    }

    let mut seen = std::collections::HashSet::new();
    let mut unique = Vec::new();
    for candidate in candidates {
        let normalized = normalize_option_label(&candidate.label);
        if normalized.is_empty() || !seen.insert(normalized) {
            continue;
        }
        unique.push(candidate);
        if unique.len() == limit as usize {
            break;
        }
    }

    Ok(unique)
}

fn read_option_candidates<P: rusqlite::Params>(
    conn: &Connection,
    sql: &str,
    params: P,
    candidates: &mut Vec<MultipleChoiceOptionCandidate>,
) -> Result<(), AppError> {
    let mut stmt = conn.prepare(sql).map_err(|e| {
        AppError::Internal(format!(
            "Failed to prepare multiple choice distractor query: {e}"
        ))
    })?;

    let rows = stmt
        .query_map(params, |row| {
            Ok(MultipleChoiceOptionCandidate {
                vocabulary_item_id: row.get(0)?,
                label: row.get(1)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query distractors: {e}")))?;

    for row in rows {
        candidates
            .push(row.map_err(|e| AppError::Internal(format!("Failed to read distractor: {e}")))?);
    }

    Ok(())
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
                    rc.scheduled_days, rc.learning_steps, rc.reps, rc.lapses, rc.state,
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
             elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review,
             created_at, updated_at
         )
         SELECT ?1, dw.word_id, ?2, {now}, 0.0, 0.0,
                0, 0, 0, 0, 0, 'new', NULL, {now}, {now}
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
             elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review,
             created_at, updated_at
         )
         SELECT ?1, dw.word_id, MIN(ds.deck_id), {now}, 0.0, 0.0,
                0, 0, 0, 0, 0, 'new', NULL, {now}, {now}
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

fn validate_flashcard_start_input(input: &StartFlashcardSessionInputDto) -> Result<(), AppError> {
    validate_study_session_start(input.mode.as_str(), FLASHCARD_MODE, input.session_length)
}

fn validate_multiple_choice_start_input(
    input: &StartMultipleChoiceSessionInputDto,
) -> Result<(), AppError> {
    validate_study_session_start(
        input.mode.as_str(),
        MULTIPLE_CHOICE_MODE,
        input.session_length,
    )
}

fn validate_type_answer_start_input(
    input: &StartTypeAnswerSessionInputDto,
) -> Result<(), AppError> {
    validate_study_session_start(input.mode.as_str(), TYPE_ANSWER_MODE, input.session_length)
}

fn validate_study_session_start(
    submitted_mode: &str,
    expected_mode: &str,
    session_length: i64,
) -> Result<(), AppError> {
    if submitted_mode != expected_mode {
        return Err(AppError::Validation(format!(
            "Unsupported study mode '{submitted_mode}'. Only '{expected_mode}' is available."
        )));
    }

    if !(1..=200).contains(&session_length) {
        return Err(AppError::Validation(
            "sessionLength must be between 1 and 200".to_string(),
        ));
    }

    Ok(())
}

fn validate_review_state(state: &ReviewCardStateInputDto) -> Result<(), AppError> {
    if !state.stability.is_finite() || !state.difficulty.is_finite() {
        return Err(AppError::Validation(
            "Review card stability and difficulty must be finite numbers.".to_string(),
        ));
    }

    if state.elapsed_days < 0
        || state.scheduled_days < 0
        || state.learning_steps < 0
        || state.reps < 0
        || state.lapses < 0
    {
        return Err(AppError::Validation(
            "Review card counters must be non-negative.".to_string(),
        ));
    }

    match state.state.as_str() {
        "new" | "learning" | "review" | "relearning" => Ok(()),
        _ => Err(AppError::Validation(format!(
            "Invalid review card state '{}'.",
            state.state
        ))),
    }
}

fn validate_review_transition(
    previous: &ReviewCardDto,
    next: &ReviewCardStateInputDto,
    reviewed_at: &str,
) -> Result<(), AppError> {
    if next.reps != previous.reps + 1 {
        return Err(AppError::Validation(
            "Submitted review state must increment reps exactly once.".to_string(),
        ));
    }

    if next.lapses < previous.lapses {
        return Err(AppError::Validation(
            "Submitted review state cannot reduce lapse count.".to_string(),
        ));
    }

    if next.last_review.as_deref() != Some(reviewed_at) {
        return Err(AppError::Validation(
            "Submitted review state must record the reviewedAt timestamp.".to_string(),
        ));
    }

    if next.due.trim().is_empty() {
        return Err(AppError::Validation(
            "Submitted review state must include a due timestamp.".to_string(),
        ));
    }

    Ok(())
}

fn rating_value(rating: &str) -> Result<i64, AppError> {
    match rating {
        "again" => Ok(1),
        "hard" => Ok(2),
        "good" => Ok(3),
        "easy" => Ok(4),
        _ => Err(AppError::Validation(format!(
            "Invalid flashcard rating '{rating}'."
        ))),
    }
}

fn is_correct_rating(rating: &str) -> bool {
    matches!(rating, "good" | "easy")
}

fn state_from_card(card: &ReviewCardDto) -> ReviewCardStateInputDto {
    ReviewCardStateInputDto {
        due: card.due.clone(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        learning_steps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state.clone(),
        last_review: card.last_review.clone(),
    }
}

fn state_json(state: &ReviewCardStateInputDto) -> Result<String, AppError> {
    serde_json::to_string(state).map_err(|e| {
        AppError::Internal(format!(
            "Failed to serialize flashcard review state snapshot: {e}"
        ))
    })
}

fn query_review_card_by_id(
    conn: &Connection,
    review_card_id: i64,
    user_id: i64,
) -> Result<ReviewCardDto, AppError> {
    conn.query_row(
        "SELECT id, user_id, word_id, deck_id, due, stability, difficulty,
                elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review,
                created_at, updated_at
         FROM   review_cards
         WHERE  id = ?1
           AND  user_id = ?2",
        params![review_card_id, user_id],
        review_card_from_row,
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to query review card: {e}")))?
    .ok_or_else(|| AppError::NotFound(format!("Review card {review_card_id} was not found")))
}

fn query_session_progress(
    conn: &Connection,
    session_id: i64,
    user_id: i64,
    mode: &str,
) -> Result<StudySessionProgressDto, AppError> {
    conn.query_row(
        "SELECT id, total_items, cards_studied, cards_correct,
                again_count, hard_count, good_count, easy_count, ended_at
         FROM   study_sessions
         WHERE  id = ?1
           AND  user_id = ?2
           AND  session_type = ?3",
        params![session_id, user_id, mode],
        |row| {
            Ok(StudySessionProgressDto {
                session_id: row.get(0)?,
                total_items: row.get(1)?,
                reviewed_count: row.get(2)?,
                correct_count: row.get(3)?,
                again_count: row.get(4)?,
                hard_count: row.get(5)?,
                good_count: row.get(6)?,
                easy_count: row.get(7)?,
                ended_at: row.get(8)?,
            })
        },
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to query {mode} session: {e}")))?
    .ok_or_else(|| AppError::NotFound(format!("{mode} session {session_id} was not found")))
}

fn query_flashcard_or_weak_drill_session_progress(
    conn: &Connection,
    session_id: i64,
    user_id: i64,
) -> Result<StudySessionProgressDto, AppError> {
    conn.query_row(
        "SELECT id, total_items, cards_studied, cards_correct,
                again_count, hard_count, good_count, easy_count, ended_at
         FROM   study_sessions
         WHERE  id = ?1
           AND  user_id = ?2
           AND  session_type IN ('flashcard', 'weak_drill')",
        params![session_id, user_id],
        |row| {
            Ok(StudySessionProgressDto {
                session_id: row.get(0)?,
                total_items: row.get(1)?,
                reviewed_count: row.get(2)?,
                correct_count: row.get(3)?,
                again_count: row.get(4)?,
                hard_count: row.get(5)?,
                good_count: row.get(6)?,
                easy_count: row.get(7)?,
                ended_at: row.get(8)?,
            })
        },
    )
    .optional()
    .map_err(|e| {
        AppError::Internal(format!(
            "Failed to query flashcard/weak_drill session: {e}"
        ))
    })?
    .ok_or_else(|| {
        AppError::NotFound(format!(
            "Flashcard/weak_drill session {session_id} was not found"
        ))
    })
}

fn query_all_weak_candidates(
    conn: &Connection,
    user_id: i64,
    deck_id: Option<i64>,
    limit: i64,
) -> Result<Vec<QueueCandidate>, AppError> {
    let sql = format!(
        "SELECT rc.id, rc.user_id, rc.word_id, rc.deck_id, rc.due,
                rc.stability, rc.difficulty, rc.elapsed_days,
                rc.scheduled_days, rc.learning_steps, rc.reps, rc.lapses, rc.state,
                rc.last_review, rc.created_at, rc.updated_at,
                w.headword, w.part_of_speech, w.ipa_uk, w.ipa_us,
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
                ) AS definition_vi,
                (
                    SELECT e.sentence_en
                    FROM   senses s
                    JOIN   examples e ON e.sense_id = s.id
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, e.id
                    LIMIT  1
                ) AS example_sentence_en,
                (
                    SELECT e.sentence_vi
                    FROM   senses s
                    JOIN   examples e ON e.sense_id = s.id
                    WHERE  s.word_id = w.id
                    ORDER  BY s.sense_index, e.id
                    LIMIT  1
                ) AS example_sentence_vi,
                MAX(0, (
                    SELECT COUNT(*)
                    FROM   senses s
                    WHERE  s.word_id = w.id
                ) - 1) AS additional_sense_count
         FROM   review_cards rc
         JOIN   words w ON w.id = rc.word_id
         JOIN   deck_words dw ON dw.word_id = rc.word_id
         WHERE  rc.user_id = ?1
           AND  {scope}
           AND  rc.state != 'new'
           AND  (rc.lapses > 0 OR rc.difficulty >= 7.0 OR (rc.stability > 0.0 AND rc.stability < 2.0))
         GROUP  BY rc.id
         ORDER  BY rc.lapses DESC, rc.difficulty DESC, rc.stability ASC, rc.last_review ASC, rc.id ASC
         LIMIT  ?3",
        scope = queue_scope_predicate(),
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| {
        AppError::Internal(format!("Failed to prepare weak candidates query: {e}"))
    })?;

    let rows = stmt
        .query_map(params![user_id, deck_id, limit], queue_candidate_from_row)
        .map_err(|e| AppError::Internal(format!("Failed to query weak candidates: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read weak candidates: {e}")))?;

    Ok(rows)
}

fn query_weak_words_counts(
    conn: &Connection,
    user_id: i64,
    deck_id: Option<i64>,
) -> Result<(i64, i64, i64, i64), AppError> {
    let sql = format!(
        "SELECT
            COUNT(DISTINCT rc.word_id)                                                     AS total,
            COUNT(DISTINCT CASE WHEN rc.lapses > 0 THEN rc.word_id END)                   AS high_lapses,
            COUNT(DISTINCT CASE WHEN rc.difficulty >= 7.0 THEN rc.word_id END)            AS high_difficulty,
            COUNT(DISTINCT CASE WHEN rc.stability > 0.0
                                 AND rc.stability < 2.0 THEN rc.word_id END)              AS low_stability
         FROM   review_cards rc
         JOIN   deck_words dw ON dw.word_id = rc.word_id
         WHERE  rc.user_id = ?1
           AND  {scope}
           AND  rc.state != 'new'
           AND  (rc.lapses > 0 OR rc.difficulty >= 7.0 OR (rc.stability > 0.0 AND rc.stability < 2.0))",
        scope = queue_scope_predicate(),
    );

    conn.query_row(&sql, params![user_id, deck_id], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    })
    .map_err(|e| AppError::Internal(format!("Failed to query weak word counts: {e}")))
}

fn get_weak_words_for_user(
    conn: &Connection,
    user_id: i64,
    deck_id: Option<i64>,
) -> Result<WeakWordsDto, AppError> {
    let (total_count, high_lapses_count, high_difficulty_count, low_stability_count) =
        query_weak_words_counts(conn, user_id, deck_id)?;
    let candidates = query_all_weak_candidates(conn, user_id, deck_id, 50)?;
    let items: Vec<SmartReviewQueueItemDto> = candidates
        .into_iter()
        .enumerate()
        .map(|(i, c)| c.into_item(i as i64, QueueCategory::Weak))
        .collect();
    Ok(WeakWordsDto {
        user_id,
        deck_id,
        total_count,
        high_lapses_count,
        high_difficulty_count,
        low_stability_count,
        items,
    })
}

fn start_weak_words_drill_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: StartWeakWordsDrillInputDto,
    now_sql: &str,
) -> Result<StudySessionDto, AppError> {
    if input.session_length < 1 || input.session_length > 100 {
        return Err(AppError::Validation(
            "Session length must be between 1 and 100.".to_string(),
        ));
    }

    let queue = generate_smart_review_queue_for_user_at(
        conn,
        user_id,
        SmartReviewQueueRequestDto {
            deck_id: input.deck_id,
            session_length: input.session_length,
            due_ratio: 0.3,
            weak_ratio: 0.7,
            new_ratio: 0.0,
            mode: SMART_REVIEW_MODE.to_string(),
        },
        now_sql,
    )?;
    let started_at = generated_at(conn, now_sql)?;

    conn.execute(
        "INSERT INTO study_sessions (
             user_id, deck_id, session_type, started_at, total_items
         )
         VALUES (?1, ?2, 'weak_drill', ?3, ?4)",
        params![user_id, input.deck_id, started_at, queue.items.len() as i64],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create weak drill session: {e}")))?;

    Ok(StudySessionDto {
        session_id: conn.last_insert_rowid(),
        user_id,
        deck_id: input.deck_id,
        mode: WEAK_DRILL_MODE.to_string(),
        started_at,
        ended_at: None,
        total_items: queue.items.len() as i64,
        reviewed_count: 0,
        correct_count: 0,
        again_count: 0,
        hard_count: 0,
        good_count: 0,
        easy_count: 0,
        queue,
    })
}

fn start_flashcard_session_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: StartFlashcardSessionInputDto,
    now_sql: &str,
) -> Result<StudySessionDto, AppError> {
    validate_flashcard_start_input(&input)?;

    let queue = generate_smart_review_queue_for_user_at(
        conn,
        user_id,
        SmartReviewQueueRequestDto {
            deck_id: input.deck_id,
            session_length: input.session_length,
            due_ratio: 0.7,
            weak_ratio: 0.2,
            new_ratio: 0.1,
            mode: SMART_REVIEW_MODE.to_string(),
        },
        now_sql,
    )?;
    let started_at = generated_at(conn, now_sql)?;

    conn.execute(
        "INSERT INTO study_sessions (
             user_id, deck_id, session_type, started_at, total_items
         )
         VALUES (?1, ?2, 'flashcard', ?3, ?4)",
        params![user_id, input.deck_id, started_at, queue.items.len() as i64],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create flashcard session: {e}")))?;

    Ok(StudySessionDto {
        session_id: conn.last_insert_rowid(),
        user_id,
        deck_id: input.deck_id,
        mode: FLASHCARD_MODE.to_string(),
        started_at,
        ended_at: None,
        total_items: queue.items.len() as i64,
        reviewed_count: 0,
        correct_count: 0,
        again_count: 0,
        hard_count: 0,
        good_count: 0,
        easy_count: 0,
        queue,
    })
}

fn build_multiple_choice_question(
    conn: &Connection,
    item: &SmartReviewQueueItemDto,
    deck_id: Option<i64>,
) -> Result<Option<MultipleChoiceQuestionDto>, AppError> {
    let correct_label = primary_option_label(
        item.definition_vi.as_deref(),
        item.definition_en.as_deref(),
        &item.headword,
    );
    if correct_label.is_empty() {
        return Ok(None);
    }

    let distractors =
        query_multiple_choice_option_candidates(conn, item.card.vocabulary_item_id, deck_id, 8)?;
    let mut seen = std::collections::HashSet::new();
    seen.insert(normalize_option_label(&correct_label));

    let mut options = vec![MultipleChoiceOptionDto {
        vocabulary_item_id: item.card.vocabulary_item_id,
        label: correct_label,
    }];

    for distractor in distractors {
        if options.len() == 4 {
            break;
        }
        let normalized = normalize_option_label(&distractor.label);
        if normalized.is_empty() || !seen.insert(normalized) {
            continue;
        }
        options.push(MultipleChoiceOptionDto {
            vocabulary_item_id: distractor.vocabulary_item_id,
            label: distractor.label,
        });
    }

    if options.len() < 4 {
        return Ok(None);
    }

    options.sort_by_key(|option| stable_option_sort_key(item.card.vocabulary_item_id, option));

    Ok(Some(MultipleChoiceQuestionDto {
        position: item.position,
        category: item.category.clone(),
        card: item.card.clone(),
        headword: item.headword.clone(),
        part_of_speech: item.part_of_speech.clone(),
        ipa_uk: item.ipa_uk.clone(),
        ipa_us: item.ipa_us.clone(),
        definition_en: item.definition_en.clone(),
        definition_vi: item.definition_vi.clone(),
        example_sentence_en: item.example_sentence_en.clone(),
        example_sentence_vi: item.example_sentence_vi.clone(),
        additional_sense_count: item.additional_sense_count,
        options,
        correct_vocabulary_item_id: item.card.vocabulary_item_id,
    }))
}

fn build_multiple_choice_questions(
    conn: &Connection,
    queue: &SmartReviewQueueDto,
) -> Result<Vec<MultipleChoiceQuestionDto>, AppError> {
    let mut questions = Vec::new();
    for item in &queue.items {
        if let Some(mut question) = build_multiple_choice_question(conn, item, queue.deck_id)? {
            question.position = questions.len() as i64;
            questions.push(question);
        }
    }

    Ok(questions)
}

fn start_multiple_choice_session_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: StartMultipleChoiceSessionInputDto,
    now_sql: &str,
) -> Result<MultipleChoiceSessionDto, AppError> {
    validate_multiple_choice_start_input(&input)?;

    let queue = generate_smart_review_queue_for_user_at(
        conn,
        user_id,
        SmartReviewQueueRequestDto {
            deck_id: input.deck_id,
            session_length: input.session_length,
            due_ratio: 0.7,
            weak_ratio: 0.2,
            new_ratio: 0.1,
            mode: SMART_REVIEW_MODE.to_string(),
        },
        now_sql,
    )?;
    let questions = build_multiple_choice_questions(conn, &queue)?;
    let started_at = generated_at(conn, now_sql)?;

    conn.execute(
        "INSERT INTO study_sessions (
             user_id, deck_id, session_type, started_at, total_items
         )
         VALUES (?1, ?2, 'multiple_choice', ?3, ?4)",
        params![user_id, input.deck_id, started_at, questions.len() as i64],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create multiple choice session: {e}")))?;

    Ok(MultipleChoiceSessionDto {
        session_id: conn.last_insert_rowid(),
        user_id,
        deck_id: input.deck_id,
        mode: MULTIPLE_CHOICE_MODE.to_string(),
        started_at,
        ended_at: None,
        total_items: questions.len() as i64,
        reviewed_count: 0,
        correct_count: 0,
        again_count: 0,
        hard_count: 0,
        good_count: 0,
        easy_count: 0,
        queue,
        questions,
    })
}

fn start_type_answer_session_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: StartTypeAnswerSessionInputDto,
    now_sql: &str,
) -> Result<StudySessionDto, AppError> {
    validate_type_answer_start_input(&input)?;

    let queue = generate_smart_review_queue_for_user_at(
        conn,
        user_id,
        SmartReviewQueueRequestDto {
            deck_id: input.deck_id,
            session_length: input.session_length,
            due_ratio: 0.7,
            weak_ratio: 0.2,
            new_ratio: 0.1,
            mode: SMART_REVIEW_MODE.to_string(),
        },
        now_sql,
    )?;
    let started_at = generated_at(conn, now_sql)?;

    conn.execute(
        "INSERT INTO study_sessions (
             user_id, deck_id, session_type, started_at, total_items
         )
         VALUES (?1, ?2, 'type_answer', ?3, ?4)",
        params![user_id, input.deck_id, started_at, queue.items.len() as i64],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create type answer session: {e}")))?;

    Ok(StudySessionDto {
        session_id: conn.last_insert_rowid(),
        user_id,
        deck_id: input.deck_id,
        mode: TYPE_ANSWER_MODE.to_string(),
        started_at,
        ended_at: None,
        total_items: queue.items.len() as i64,
        reviewed_count: 0,
        correct_count: 0,
        again_count: 0,
        hard_count: 0,
        good_count: 0,
        easy_count: 0,
        queue,
    })
}

fn submit_type_answer_review_for_user(
    conn: &Connection,
    user_id: i64,
    input: SubmitTypeAnswerReviewInputDto,
) -> Result<SubmitReviewResultDto, AppError> {
    validate_review_state(&input.next_state)?;
    let numeric_rating = rating_value(&input.rating)?;
    let existing_card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    if existing_card.vocabulary_item_id != input.vocabulary_item_id {
        return Err(AppError::Validation(
            "Review card does not match the submitted vocabulary item.".to_string(),
        ));
    }
    validate_review_transition(&existing_card, &input.next_state, &input.reviewed_at)?;

    let progress = query_session_progress(conn, input.session_id, user_id, TYPE_ANSWER_MODE)?;
    if progress.ended_at.is_some() {
        return Err(AppError::Validation(format!(
            "Type answer session {} is already completed.",
            input.session_id
        )));
    }

    let state_before = state_json(&state_from_card(&existing_card))?;
    let state_after = state_json(&input.next_state)?;

    let updated = conn
        .execute(
            "UPDATE review_cards
             SET due = ?1,
                 stability = ?2,
                 difficulty = ?3,
                 elapsed_days = ?4,
                 scheduled_days = ?5,
                 learning_steps = ?6,
                 reps = ?7,
                 lapses = ?8,
                 state = ?9,
                 last_review = ?10,
                 updated_at = ?11
             WHERE id = ?12
               AND user_id = ?13
               AND word_id = ?14",
            params![
                input.next_state.due,
                input.next_state.stability,
                input.next_state.difficulty,
                input.next_state.elapsed_days,
                input.next_state.scheduled_days,
                input.next_state.learning_steps,
                input.next_state.reps,
                input.next_state.lapses,
                input.next_state.state,
                input.next_state.last_review,
                input.reviewed_at,
                input.review_card_id,
                user_id,
                input.vocabulary_item_id,
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to update review card: {e}")))?;

    if updated != 1 {
        return Err(AppError::NotFound(format!(
            "Review card {} was not found",
            input.review_card_id
        )));
    }

    let result = if is_correct_rating(&input.rating) {
        "pass"
    } else {
        "fail"
    };
    let response_time_ms = input.response_time_ms.unwrap_or(0);

    conn.execute(
        "INSERT INTO review_logs (
             user_id, word_id, review_card_id, deck_id, session_id, rating,
             result, mode, state_before, state_after, review_duration_ms,
             response_time_ms, reviewed_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'type_answer', ?8, ?9, ?10, ?11, ?12)",
        params![
            user_id,
            input.vocabulary_item_id,
            input.review_card_id,
            existing_card.deck_id,
            input.session_id,
            numeric_rating,
            result,
            state_before,
            state_after,
            response_time_ms,
            input.response_time_ms,
            input.reviewed_at,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to write type answer review log: {e}")))?;

    let correct_increment = if is_correct_rating(&input.rating) { 1 } else { 0 };
    let (again_increment, hard_increment, good_increment, easy_increment) =
        match input.rating.as_str() {
            "again" => (1, 0, 0, 0),
            "hard" => (0, 1, 0, 0),
            "good" => (0, 0, 1, 0),
            "easy" => (0, 0, 0, 1),
            _ => unreachable!("rating validated above"),
        };

    conn.execute(
        "UPDATE study_sessions
         SET cards_studied = cards_studied + 1,
             cards_correct = cards_correct + ?1,
             again_count = again_count + ?2,
             hard_count = hard_count + ?3,
             good_count = good_count + ?4,
             easy_count = easy_count + ?5
         WHERE id = ?6
           AND user_id = ?7
           AND session_type = 'type_answer'
           AND ended_at IS NULL",
        params![
            correct_increment,
            again_increment,
            hard_increment,
            good_increment,
            easy_increment,
            input.session_id,
            user_id,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update type answer session: {e}")))?;

    let card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    let session = query_session_progress(conn, input.session_id, user_id, TYPE_ANSWER_MODE)?;

    Ok(SubmitReviewResultDto {
        session,
        card,
        rating: input.rating,
        reviewed_at: input.reviewed_at,
    })
}

fn submit_flashcard_review_for_user(
    conn: &Connection,
    user_id: i64,
    input: SubmitFlashcardReviewInputDto,
) -> Result<SubmitReviewResultDto, AppError> {
    validate_review_state(&input.next_state)?;
    let numeric_rating = rating_value(&input.rating)?;
    let existing_card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    if existing_card.vocabulary_item_id != input.vocabulary_item_id {
        return Err(AppError::Validation(
            "Review card does not match the submitted vocabulary item.".to_string(),
        ));
    }
    validate_review_transition(&existing_card, &input.next_state, &input.reviewed_at)?;

    let progress =
        query_flashcard_or_weak_drill_session_progress(conn, input.session_id, user_id)?;
    if progress.ended_at.is_some() {
        return Err(AppError::Validation(format!(
            "Session {} is already completed.",
            input.session_id
        )));
    }

    let state_before = state_json(&state_from_card(&existing_card))?;
    let state_after = state_json(&input.next_state)?;

    let updated = conn
        .execute(
            "UPDATE review_cards
             SET due = ?1,
                 stability = ?2,
                 difficulty = ?3,
                 elapsed_days = ?4,
                 scheduled_days = ?5,
                 learning_steps = ?6,
                 reps = ?7,
                 lapses = ?8,
                 state = ?9,
                 last_review = ?10,
                 updated_at = ?11
             WHERE id = ?12
               AND user_id = ?13
               AND word_id = ?14",
            params![
                input.next_state.due,
                input.next_state.stability,
                input.next_state.difficulty,
                input.next_state.elapsed_days,
                input.next_state.scheduled_days,
                input.next_state.learning_steps,
                input.next_state.reps,
                input.next_state.lapses,
                input.next_state.state,
                input.next_state.last_review,
                input.reviewed_at,
                input.review_card_id,
                user_id,
                input.vocabulary_item_id,
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to update review card: {e}")))?;

    if updated != 1 {
        return Err(AppError::NotFound(format!(
            "Review card {} was not found",
            input.review_card_id
        )));
    }

    let result = if is_correct_rating(&input.rating) {
        "pass"
    } else {
        "fail"
    };
    let response_time_ms = input.response_time_ms.unwrap_or(0);

    conn.execute(
        "INSERT INTO review_logs (
             user_id, word_id, review_card_id, deck_id, session_id, rating,
             result, mode, state_before, state_after, review_duration_ms,
             response_time_ms, reviewed_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'flashcard', ?8, ?9, ?10, ?11, ?12)",
        params![
            user_id,
            input.vocabulary_item_id,
            input.review_card_id,
            existing_card.deck_id,
            input.session_id,
            numeric_rating,
            result,
            state_before,
            state_after,
            response_time_ms,
            input.response_time_ms,
            input.reviewed_at,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to write flashcard review log: {e}")))?;

    let correct_increment = if is_correct_rating(&input.rating) {
        1
    } else {
        0
    };
    let (again_increment, hard_increment, good_increment, easy_increment) =
        match input.rating.as_str() {
            "again" => (1, 0, 0, 0),
            "hard" => (0, 1, 0, 0),
            "good" => (0, 0, 1, 0),
            "easy" => (0, 0, 0, 1),
            _ => unreachable!("rating validated above"),
        };

    conn.execute(
        "UPDATE study_sessions
         SET cards_studied = cards_studied + 1,
             cards_correct = cards_correct + ?1,
             again_count = again_count + ?2,
             hard_count = hard_count + ?3,
             good_count = good_count + ?4,
             easy_count = easy_count + ?5
         WHERE id = ?6
           AND user_id = ?7
           AND session_type IN ('flashcard', 'weak_drill')
           AND ended_at IS NULL",
        params![
            correct_increment,
            again_increment,
            hard_increment,
            good_increment,
            easy_increment,
            input.session_id,
            user_id,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update flashcard session: {e}")))?;

    let card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    let session =
        query_flashcard_or_weak_drill_session_progress(conn, input.session_id, user_id)?;

    Ok(SubmitReviewResultDto {
        session,
        card,
        rating: input.rating,
        reviewed_at: input.reviewed_at,
    })
}

fn submit_multiple_choice_review_for_user(
    conn: &Connection,
    user_id: i64,
    input: SubmitMultipleChoiceReviewInputDto,
) -> Result<SubmitReviewResultDto, AppError> {
    validate_review_state(&input.next_state)?;
    let numeric_rating = rating_value(&input.rating)?;
    let existing_card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    if existing_card.vocabulary_item_id != input.vocabulary_item_id {
        return Err(AppError::Validation(
            "Review card does not match the submitted vocabulary item.".to_string(),
        ));
    }
    validate_review_transition(&existing_card, &input.next_state, &input.reviewed_at)?;

    let progress = query_session_progress(conn, input.session_id, user_id, MULTIPLE_CHOICE_MODE)?;
    if progress.ended_at.is_some() {
        return Err(AppError::Validation(format!(
            "Multiple choice session {} is already completed.",
            input.session_id
        )));
    }

    let state_before = state_json(&state_from_card(&existing_card))?;
    let state_after = state_json(&input.next_state)?;

    let updated = conn
        .execute(
            "UPDATE review_cards
             SET due = ?1,
                 stability = ?2,
                 difficulty = ?3,
                 elapsed_days = ?4,
                 scheduled_days = ?5,
                 learning_steps = ?6,
                 reps = ?7,
                 lapses = ?8,
                 state = ?9,
                 last_review = ?10,
                 updated_at = ?11
             WHERE id = ?12
               AND user_id = ?13
               AND word_id = ?14",
            params![
                input.next_state.due,
                input.next_state.stability,
                input.next_state.difficulty,
                input.next_state.elapsed_days,
                input.next_state.scheduled_days,
                input.next_state.learning_steps,
                input.next_state.reps,
                input.next_state.lapses,
                input.next_state.state,
                input.next_state.last_review,
                input.reviewed_at,
                input.review_card_id,
                user_id,
                input.vocabulary_item_id,
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to update review card: {e}")))?;

    if updated != 1 {
        return Err(AppError::NotFound(format!(
            "Review card {} was not found",
            input.review_card_id
        )));
    }

    let is_correct = input.selected_vocabulary_item_id == input.vocabulary_item_id;
    let result = if is_correct { "pass" } else { "fail" };
    let response_time_ms = input.response_time_ms.unwrap_or(0);

    conn.execute(
        "INSERT INTO review_logs (
             user_id, word_id, review_card_id, deck_id, session_id, rating,
             result, mode, state_before, state_after, review_duration_ms,
             response_time_ms, reviewed_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'multiple_choice', ?8, ?9, ?10, ?11, ?12)",
        params![
            user_id,
            input.vocabulary_item_id,
            input.review_card_id,
            existing_card.deck_id,
            input.session_id,
            numeric_rating,
            result,
            state_before,
            state_after,
            response_time_ms,
            input.response_time_ms,
            input.reviewed_at,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to write multiple choice review log: {e}")))?;

    let correct_increment = if is_correct { 1 } else { 0 };
    let (again_increment, hard_increment, good_increment, easy_increment) =
        match input.rating.as_str() {
            "again" => (1, 0, 0, 0),
            "hard" => (0, 1, 0, 0),
            "good" => (0, 0, 1, 0),
            "easy" => (0, 0, 0, 1),
            _ => unreachable!("rating validated above"),
        };

    conn.execute(
        "UPDATE study_sessions
         SET cards_studied = cards_studied + 1,
             cards_correct = cards_correct + ?1,
             again_count = again_count + ?2,
             hard_count = hard_count + ?3,
             good_count = good_count + ?4,
             easy_count = easy_count + ?5
         WHERE id = ?6
           AND user_id = ?7
           AND session_type = 'multiple_choice'
           AND ended_at IS NULL",
        params![
            correct_increment,
            again_increment,
            hard_increment,
            good_increment,
            easy_increment,
            input.session_id,
            user_id,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update multiple choice session: {e}")))?;

    let card = query_review_card_by_id(conn, input.review_card_id, user_id)?;
    let session = query_session_progress(conn, input.session_id, user_id, MULTIPLE_CHOICE_MODE)?;

    Ok(SubmitReviewResultDto {
        session,
        card,
        rating: input.rating,
        reviewed_at: input.reviewed_at,
    })
}

fn complete_study_session_for_user_at(
    conn: &Connection,
    user_id: i64,
    input: CompleteStudySessionInputDto,
    now_sql: &str,
) -> Result<StudySessionSummaryDto, AppError> {
    let ended_at = generated_at(conn, now_sql)?;

    conn.execute(
        "UPDATE study_sessions
         SET ended_at = COALESCE(ended_at, ?1)
         WHERE id = ?2
           AND user_id = ?3
           AND session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
        params![ended_at, input.session_id, user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to complete study session: {e}")))?;

    conn.query_row(
        "SELECT id, user_id, deck_id, session_type, started_at,
                COALESCE(ended_at, ?1), total_items, cards_studied,
                cards_correct, again_count, hard_count, good_count,
                easy_count,
                MAX(0, CAST(strftime('%s', COALESCE(ended_at, ?1)) AS INTEGER)
                       - CAST(strftime('%s', started_at) AS INTEGER)),
                xp_earned
         FROM   study_sessions
         WHERE  id = ?2
           AND  user_id = ?3
           AND  session_type IN ('flashcard', 'multiple_choice', 'type_answer', 'weak_drill')",
        params![ended_at, input.session_id, user_id],
        |row| {
            let total_items: i64 = row.get(6)?;
            let correct_count: i64 = row.get(8)?;
            let accuracy = if total_items > 0 {
                (correct_count * 100 / total_items).clamp(0, 100)
            } else {
                0
            };

            Ok(StudySessionSummaryDto {
                session_id: row.get(0)?,
                user_id: row.get(1)?,
                deck_id: row.get(2)?,
                mode: row.get(3)?,
                started_at: row.get(4)?,
                ended_at: row.get(5)?,
                total_items,
                reviewed_count: row.get(7)?,
                correct_count,
                again_count: row.get(9)?,
                hard_count: row.get(10)?,
                good_count: row.get(11)?,
                easy_count: row.get(12)?,
                accuracy,
                time_spent_seconds: row.get(13)?,
                xp_earned: row.get(14)?,
            })
        },
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to summarize study session: {e}")))?
    .ok_or_else(|| AppError::NotFound(format!("Study session {} was not found", input.session_id)))
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

#[tauri::command]
pub fn start_flashcard_session(
    input: StartFlashcardSessionInputDto,
    db: State<'_, DbConn>,
) -> Result<StudySessionDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    start_flashcard_session_for_user_at(&conn, user.id, input, SQLITE_UTC_NOW)
}

#[tauri::command]
pub fn start_multiple_choice_session(
    input: StartMultipleChoiceSessionInputDto,
    db: State<'_, DbConn>,
) -> Result<MultipleChoiceSessionDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    start_multiple_choice_session_for_user_at(&conn, user.id, input, SQLITE_UTC_NOW)
}

#[tauri::command]
pub fn submit_flashcard_review(
    input: SubmitFlashcardReviewInputDto,
    db: State<'_, DbConn>,
) -> Result<SubmitReviewResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    submit_flashcard_review_for_user(&conn, user.id, input)
}

#[tauri::command]
pub fn submit_multiple_choice_review(
    input: SubmitMultipleChoiceReviewInputDto,
    db: State<'_, DbConn>,
) -> Result<SubmitReviewResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    submit_multiple_choice_review_for_user(&conn, user.id, input)
}

#[tauri::command]
pub fn start_type_answer_session(
    input: StartTypeAnswerSessionInputDto,
    db: State<'_, DbConn>,
) -> Result<StudySessionDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    start_type_answer_session_for_user_at(&conn, user.id, input, SQLITE_UTC_NOW)
}

#[tauri::command]
pub fn submit_type_answer_review(
    input: SubmitTypeAnswerReviewInputDto,
    db: State<'_, DbConn>,
) -> Result<SubmitReviewResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    submit_type_answer_review_for_user(&conn, user.id, input)
}

#[tauri::command]
pub fn complete_study_session(
    input: CompleteStudySessionInputDto,
    db: State<'_, DbConn>,
) -> Result<StudySessionSummaryDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    complete_study_session_for_user_at(&conn, user.id, input, SQLITE_UTC_NOW)
}

#[tauri::command]
pub fn get_weak_words(
    deck_id: Option<i64>,
    db: State<'_, DbConn>,
) -> Result<WeakWordsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    get_weak_words_for_user(&conn, user.id, deck_id)
}

#[tauri::command]
pub fn start_weak_words_drill(
    input: StartWeakWordsDrillInputDto,
    db: State<'_, DbConn>,
) -> Result<StudySessionDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    start_weak_words_drill_for_user_at(&conn, user.id, input, SQLITE_UTC_NOW)
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

    fn flashcard_start(deck_id: Option<i64>, session_length: i64) -> StartFlashcardSessionInputDto {
        StartFlashcardSessionInputDto {
            deck_id,
            session_length,
            mode: FLASHCARD_MODE.to_string(),
        }
    }

    fn multiple_choice_start(
        deck_id: Option<i64>,
        session_length: i64,
    ) -> StartMultipleChoiceSessionInputDto {
        StartMultipleChoiceSessionInputDto {
            deck_id,
            session_length,
            mode: MULTIPLE_CHOICE_MODE.to_string(),
        }
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
            response_time_ms: Some(1500),
            next_state: next_state_for(card, rating),
        }
    }

    fn submit_choice_input(
        session_id: i64,
        card: &ReviewCardDto,
        selected_vocabulary_item_id: i64,
        rating: &str,
    ) -> SubmitMultipleChoiceReviewInputDto {
        SubmitMultipleChoiceReviewInputDto {
            session_id,
            review_card_id: card.id,
            vocabulary_item_id: card.vocabulary_item_id,
            selected_vocabulary_item_id,
            rating: rating.to_string(),
            reviewed_at: "2026-01-01T00:00:00Z".to_string(),
            response_time_ms: Some(900),
            next_state: next_state_for(card, rating),
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

    #[test]
    fn start_flashcard_session_returns_valid_session() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let session = start_flashcard_session_for_user_at(
            &conn,
            user_id,
            flashcard_start(Some(deck_id), 3),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start session");

        assert!(session.session_id > 0);
        assert_eq!(session.user_id, user_id);
        assert_eq!(session.deck_id, Some(deck_id));
        assert_eq!(session.mode, "flashcard");
        assert_eq!(session.total_items, 3);
        assert_eq!(session.queue.items.len(), 3);
        assert_eq!(session.reviewed_count, 0);
    }

    #[test]
    fn submit_flashcard_review_updates_review_card_state() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_flashcard_session_for_user_at(
            &conn,
            user_id,
            flashcard_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start session");
        let card = &session.queue.items[0].card;

        let result = submit_flashcard_review_for_user(
            &conn,
            user_id,
            submit_input(session.session_id, card, "good"),
        )
        .expect("submit review");

        assert_eq!(result.card.reps, card.reps + 1);
        assert_eq!(result.card.state, "review");
        assert_eq!(result.card.due, "2026-01-02T00:00:00Z");
        assert_eq!(result.session.reviewed_count, 1);
        assert_eq!(result.session.correct_count, 1);
        assert_eq!(result.session.good_count, 1);
    }

    #[test]
    fn submit_flashcard_review_writes_review_log() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_flashcard_session_for_user_at(
            &conn,
            user_id,
            flashcard_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start session");
        let card = &session.queue.items[0].card;

        submit_flashcard_review_for_user(
            &conn,
            user_id,
            submit_input(session.session_id, card, "again"),
        )
        .expect("submit review");

        let log: (i64, i64, i64, i64, String, i64, Option<i64>) = conn
            .query_row(
                "SELECT user_id, session_id, review_card_id, word_id, mode, rating, response_time_ms
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
                    ))
                },
            )
            .expect("review log");

        assert_eq!(log.0, user_id);
        assert_eq!(log.1, session.session_id);
        assert_eq!(log.2, card.id);
        assert_eq!(log.3, card.vocabulary_item_id);
        assert_eq!(log.4, "flashcard");
        assert_eq!(log.5, 1);
        assert_eq!(log.6, Some(1500));
    }

    #[test]
    fn submitting_multiple_flashcard_reviews_advances_session_counters() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_flashcard_session_for_user_at(
            &conn,
            user_id,
            flashcard_start(Some(deck_id), 2),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start session");

        let first = &session.queue.items[0].card;
        let second = &session.queue.items[1].card;
        submit_flashcard_review_for_user(
            &conn,
            user_id,
            submit_input(session.session_id, first, "hard"),
        )
        .expect("first review");
        let second_result = submit_flashcard_review_for_user(
            &conn,
            user_id,
            submit_input(session.session_id, second, "easy"),
        )
        .expect("second review");

        assert_eq!(second_result.session.reviewed_count, 2);
        assert_eq!(second_result.session.correct_count, 1);
        assert_eq!(second_result.session.hard_count, 1);
        assert_eq!(second_result.session.easy_count, 1);
    }

    #[test]
    fn completing_flashcard_session_returns_summary() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_flashcard_session_for_user_at(
            &conn,
            user_id,
            flashcard_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start session");
        let card = &session.queue.items[0].card;
        submit_flashcard_review_for_user(
            &conn,
            user_id,
            submit_input(session.session_id, card, "easy"),
        )
        .expect("submit");

        let summary = complete_study_session_for_user_at(
            &conn,
            user_id,
            CompleteStudySessionInputDto {
                session_id: session.session_id,
            },
            "'2026-01-01T00:02:00Z'",
        )
        .expect("summary");

        assert_eq!(summary.session_id, session.session_id);
        assert_eq!(summary.reviewed_count, 1);
        assert_eq!(summary.correct_count, 1);
        assert_eq!(summary.accuracy, 100);
        assert_eq!(summary.time_spent_seconds, 120);
    }

    #[test]
    fn start_multiple_choice_session_generates_four_unique_options() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);

        let session = start_multiple_choice_session_for_user_at(
            &conn,
            user_id,
            multiple_choice_start(Some(deck_id), 3),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start multiple choice");

        assert!(session.session_id > 0);
        assert_eq!(session.mode, MULTIPLE_CHOICE_MODE);
        assert_eq!(session.total_items, session.questions.len() as i64);
        assert!(!session.questions.is_empty());

        for question in &session.questions {
            let labels = question
                .options
                .iter()
                .map(|option| normalize_option_label(&option.label))
                .collect::<std::collections::HashSet<_>>();
            assert_eq!(question.options.len(), 4);
            assert_eq!(labels.len(), 4);
            assert!(question.options.iter().any(|option| {
                option.vocabulary_item_id == question.correct_vocabulary_item_id
            }));
        }
    }

    #[test]
    fn submit_multiple_choice_review_updates_card_and_writes_log() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_multiple_choice_session_for_user_at(
            &conn,
            user_id,
            multiple_choice_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start multiple choice");
        let question = &session.questions[0];

        let result = submit_multiple_choice_review_for_user(
            &conn,
            user_id,
            submit_choice_input(
                session.session_id,
                &question.card,
                question.correct_vocabulary_item_id,
                "good",
            ),
        )
        .expect("submit multiple choice");

        assert_eq!(result.card.reps, question.card.reps + 1);
        assert_eq!(result.session.reviewed_count, 1);
        assert_eq!(result.session.correct_count, 1);
        assert_eq!(result.session.good_count, 1);

        let log: (String, String, Option<i64>) = conn
            .query_row(
                "SELECT mode, result, response_time_ms
                 FROM review_logs
                 WHERE session_id = ?1",
                params![session.session_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("review log");

        assert_eq!(log.0, "multiple_choice");
        assert_eq!(log.1, "pass");
        assert_eq!(log.2, Some(900));
    }

    #[test]
    fn incorrect_multiple_choice_answer_logs_fail_and_again_count() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let deck_id = first_deck_id(&conn);
        let session = start_multiple_choice_session_for_user_at(
            &conn,
            user_id,
            multiple_choice_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("start multiple choice");
        let question = &session.questions[0];
        let wrong_option = question
            .options
            .iter()
            .find(|option| option.vocabulary_item_id != question.correct_vocabulary_item_id)
            .expect("wrong option");

        let result = submit_multiple_choice_review_for_user(
            &conn,
            user_id,
            submit_choice_input(
                session.session_id,
                &question.card,
                wrong_option.vocabulary_item_id,
                "again",
            ),
        )
        .expect("submit incorrect multiple choice");

        assert_eq!(result.session.reviewed_count, 1);
        assert_eq!(result.session.correct_count, 0);
        assert_eq!(result.session.again_count, 1);

        let logged_result: String = conn
            .query_row(
                "SELECT result FROM review_logs WHERE session_id = ?1",
                params![session.session_id],
                |row| row.get(0),
            )
            .expect("review log");
        assert_eq!(logged_result, "fail");
    }

    #[test]
    fn normal_user_cannot_submit_review_for_another_users_session() {
        let conn = db_with_data();
        let owner_id = login_as(&conn, "owner");
        let deck_id = first_deck_id(&conn);
        let owner_session = start_flashcard_session_for_user_at(
            &conn,
            owner_id,
            flashcard_start(Some(deck_id), 1),
            "'2026-01-01T00:00:00Z'",
        )
        .expect("owner session");
        let owner_card = owner_session.queue.items[0].card.clone();

        crate::auth::logout(&conn).expect("logout owner");
        let learner_id = login_as(&conn, "learner");
        let result = submit_flashcard_review_for_user(
            &conn,
            learner_id,
            submit_input(owner_session.session_id, &owner_card, "good"),
        );

        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
