use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::words::{
    WordDetailDto, WordExampleDto, WordPronunciationDto, WordRelationDto, WordReviewLogDto,
    WordReviewStateDto, WordSenseDto,
};
use crate::errors::AppError;

fn query_word_examples(conn: &Connection, sense_id: i64) -> Result<Vec<WordExampleDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, sentence_en, sentence_vi, audio_path
             FROM   examples
             WHERE  sense_id = ?1
             ORDER  BY id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare examples query: {e}")))?;

    let rows = stmt
        .query_map(params![sense_id], |row| {
            Ok(WordExampleDto {
                id: row.get(0)?,
                sentence_en: row.get(1)?,
                sentence_vi: row.get(2)?,
                audio_path: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query examples: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read examples: {e}")))?;

    Ok(rows)
}

fn query_word_senses(conn: &Connection, word_id: i64) -> Result<Vec<WordSenseDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, sense_index, definition_en, definition_vi, register, domain
             FROM   senses
             WHERE  word_id = ?1
             ORDER  BY sense_index, id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare senses query: {e}")))?;

    type SenseRow = (
        i64,
        i64,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
    );
    let rows = stmt
        .query_map(params![word_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query senses: {e}")))?
        .collect::<Result<Vec<SenseRow>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read senses: {e}")))?;

    rows.into_iter()
        .map(
            |(id, sense_index, definition_en, definition_vi, register, domain)| {
                Ok(WordSenseDto {
                    id,
                    sense_index,
                    definition_en,
                    definition_vi,
                    register,
                    domain,
                    examples: query_word_examples(conn, id)?,
                })
            },
        )
        .collect()
}

fn query_pronunciations(
    conn: &Connection,
    word_id: i64,
) -> Result<Vec<WordPronunciationDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, dialect, audio_path, tts_engine
             FROM   pronunciations
             WHERE  word_id = ?1
             ORDER  BY dialect, id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare pronunciations query: {e}")))?;

    let rows = stmt
        .query_map(params![word_id], |row| {
            Ok(WordPronunciationDto {
                id: row.get(0)?,
                dialect: row.get(1)?,
                audio_path: row.get(2)?,
                tts_engine: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query pronunciations: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read pronunciations: {e}")))?;

    Ok(rows)
}

fn query_relations(conn: &Connection, word_id: i64) -> Result<Vec<WordRelationDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT wr.id, wr.relation_type, w.id, w.headword
             FROM   word_relations wr
             JOIN   words w ON w.id = wr.to_word_id
             WHERE  wr.from_word_id = ?1
             UNION ALL
             SELECT wr.id, wr.relation_type, w.id, w.headword
             FROM   word_relations wr
             JOIN   words w ON w.id = wr.from_word_id
             WHERE  wr.to_word_id = ?1
             ORDER  BY relation_type, headword",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare relations query: {e}")))?;

    let rows = stmt
        .query_map(params![word_id], |row| {
            Ok(WordRelationDto {
                id: row.get(0)?,
                relation_type: row.get(1)?,
                word_id: row.get(2)?,
                headword: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query relations: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read relations: {e}")))?;

    Ok(rows)
}

fn query_review_state(
    conn: &Connection,
    user_id: i64,
    word_id: i64,
) -> Result<Option<WordReviewStateDto>, AppError> {
    conn.query_row(
        "SELECT state, due, reps, lapses, last_review
         FROM   review_cards
         WHERE  user_id = ?1
           AND  word_id = ?2",
        params![user_id, word_id],
        |row| {
            Ok(WordReviewStateDto {
                state: row.get(0)?,
                due: row.get(1)?,
                reps: row.get(2)?,
                lapses: row.get(3)?,
                last_review: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to query review state: {e}")))
}

fn query_review_history(
    conn: &Connection,
    user_id: i64,
    word_id: i64,
) -> Result<Vec<WordReviewLogDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, rating, result, mode, reviewed_at
             FROM   review_logs
             WHERE  user_id = ?1
               AND  word_id = ?2
             ORDER  BY reviewed_at DESC, id DESC
             LIMIT  10",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare review history query: {e}")))?;

    let rows = stmt
        .query_map(params![user_id, word_id], |row| {
            Ok(WordReviewLogDto {
                id: row.get(0)?,
                rating: row.get(1)?,
                result: row.get(2)?,
                mode: row.get(3)?,
                reviewed_at: row.get(4)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query review history: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read review history: {e}")))?;

    Ok(rows)
}

fn query_word_detail(
    conn: &Connection,
    user_id: i64,
    word_id: i64,
) -> Result<WordDetailDto, AppError> {
    type WordRow = (
        i64,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<String>,
        Option<String>,
        Option<String>,
    );

    let word: WordRow = conn
        .query_row(
            "SELECT w.id, w.headword, w.part_of_speech, w.ipa_uk, w.ipa_us,
                    w.frequency_rank, w.cefr_level, p.name, p.slug
             FROM   words w
             LEFT JOIN packs p ON p.id = w.pack_id
             WHERE  w.id = ?1",
            params![word_id],
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
                ))
            },
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to query word detail: {e}")))?
        .ok_or_else(|| AppError::NotFound(format!("Word {word_id} was not found")))?;

    let (
        id,
        headword,
        part_of_speech,
        ipa_uk,
        ipa_us,
        frequency_rank,
        cefr_level,
        pack_name,
        pack_slug,
    ) = word;

    Ok(WordDetailDto {
        id,
        headword,
        part_of_speech,
        ipa_uk,
        ipa_us,
        frequency_rank,
        cefr_level,
        pack_name,
        pack_slug,
        senses: query_word_senses(conn, id)?,
        pronunciations: query_pronunciations(conn, id)?,
        relations: query_relations(conn, id)?,
        review_state: query_review_state(conn, user_id, id)?,
        review_history: query_review_history(conn, user_id, id)?,
    })
}

#[tauri::command]
pub fn get_word_detail(word_id: i64, db: State<'_, DbConn>) -> Result<WordDetailDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    query_word_detail(&conn, user.id, word_id)
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

    #[test]
    fn get_word_detail_returns_core_fields_senses_and_examples() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        // Scope to the demo pack's "run" entry, which carries multiple
        // senses. Both bundled packs include the headword, so we filter on
        // pack slug to keep the assertion stable.
        let word_id: i64 = conn
            .query_row(
                "SELECT w.id FROM words w
                 JOIN packs p ON p.id = w.pack_id
                 WHERE w.headword = 'run' AND p.slug = 'english-essentials-demo'",
                [],
                |row| row.get(0),
            )
            .expect("seed word");

        let detail = query_word_detail(&conn, user_id, word_id).expect("word detail");

        assert_eq!(detail.headword, "run");
        assert_eq!(detail.part_of_speech.as_deref(), Some("verb"));
        assert_eq!(detail.cefr_level.as_deref(), Some("A1"));
        assert!(detail.senses.len() >= 2);
        assert_eq!(detail.senses[0].sense_index, 0);
        assert!(!detail.senses[0].examples.is_empty());
        assert!(detail.review_state.is_none());
    }

    #[test]
    fn get_word_detail_returns_multiple_senses_in_order() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let word_id: i64 = conn
            .query_row("SELECT id FROM words WHERE headword = 'walk'", [], |row| {
                row.get(0)
            })
            .expect("seed word");

        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
             VALUES (?1, 2, 'To operate', 'vận hành')",
            params![word_id],
        )
        .expect("insert second sense");
        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
             VALUES (?1, 1, 'To manage', 'quản lý')",
            params![word_id],
        )
        .expect("insert middle sense");

        let detail = query_word_detail(&conn, user_id, word_id).expect("word detail");
        let indexes: Vec<i64> = detail.senses.iter().map(|s| s.sense_index).collect();

        assert_eq!(indexes, vec![0, 1, 2]);
    }

    #[test]
    fn get_word_detail_returns_pronunciations_relations_and_review_state() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");
        let eat_id: i64 = conn
            .query_row("SELECT id FROM words WHERE headword = 'eat'", [], |row| {
                row.get(0)
            })
            .expect("eat word");
        let sleep_id: i64 = conn
            .query_row("SELECT id FROM words WHERE headword = 'sleep'", [], |row| {
                row.get(0)
            })
            .expect("related word");

        conn.execute(
            "INSERT INTO pronunciations (word_id, dialect, audio_path, tts_engine)
             VALUES (?1, 'uk', 'audio/eat-uk.mp3', 'bundled')",
            params![eat_id],
        )
        .expect("pronunciation");
        conn.execute(
            "INSERT INTO word_relations (from_word_id, to_word_id, relation_type)
             VALUES (?1, ?2, 'see_also')",
            params![eat_id, sleep_id],
        )
        .expect("relation");
        conn.execute(
            "INSERT INTO review_cards (user_id, word_id, due, state, reps, lapses)
             VALUES (?1, ?2, '2026-05-20T00:00:00Z', 'learning', 3, 1)",
            params![user_id, eat_id],
        )
        .expect("review card");

        let detail = query_word_detail(&conn, user_id, eat_id).expect("word detail");

        assert_eq!(detail.pronunciations.len(), 1);
        assert_eq!(detail.relations.len(), 1);
        assert_eq!(detail.review_state.as_ref().map(|s| s.reps), Some(3));
    }

    #[test]
    fn get_word_detail_returns_not_found_for_missing_word() {
        let conn = db_with_data();
        let user_id = login_as(&conn, "learner");

        let result = query_word_detail(&conn, user_id, 999_999);

        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
