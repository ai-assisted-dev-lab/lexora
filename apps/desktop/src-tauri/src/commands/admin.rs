use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::admin::{
    AdminDeckListInputDto, AdminDeckPageDto, AdminDeckSummaryDto, AdminMissingFlagsDto,
    AdminValidationSummaryDto, AdminVocabularyDetailDto, AdminVocabularyListInputDto,
    AdminVocabularyListItemDto, AdminVocabularyPageDto, AdminVocabularyPatchDto,
};
use crate::errors::AppError;

const DEFAULT_PAGE_SIZE: i64 = 50;
const MAX_PAGE_SIZE: i64 = 200;

const VALID_TYPES: &[&str] = &["word", "phrase", "idiom", "phrasal_verb", "collocation"];
const VALID_CEFR: &[&str] = &["A1", "A2", "B1", "B2", "C1", "C2"];
const VALID_REVIEW_STATUS: &[&str] = &[
    "verified",
    "unverified",
    "needs_review",
    "rejected",
    "draft",
];

// ── Stats ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminStatsDto {
    pub user_count: i64,
    pub word_count: i64,
    pub deck_count: i64,
    pub pack_count: i64,
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

fn validate_enum(field: &str, value: &str, allowed: &[&str]) -> Result<(), AppError> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(AppError::Validation(format!(
            "Invalid {field}: '{value}'. Allowed: {}",
            allowed.join(", ")
        )))
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.map(|raw| raw.trim().to_string())
}

fn clamp_page_size(value: Option<i64>) -> i64 {
    value.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE)
}

fn clamp_page(value: Option<i64>) -> i64 {
    value.unwrap_or(1).max(1)
}

fn vocabulary_query_parts(
    input: &AdminVocabularyListInputDto,
) -> (String, Vec<rusqlite::types::Value>) {
    use rusqlite::types::Value;
    let mut where_clauses: Vec<String> = Vec::new();
    let mut binds: Vec<Value> = Vec::new();

    if let Some(search) = input
        .search
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        where_clauses.push("w.headword LIKE ?".to_string());
        binds.push(Value::Text(format!("{}%", search)));
    }
    if let Some(t) = input.word_type.as_ref().filter(|s| !s.is_empty()) {
        where_clauses.push("w.type = ?".to_string());
        binds.push(Value::Text(t.clone()));
    }
    if let Some(c) = input.cefr_level.as_ref().filter(|s| !s.is_empty()) {
        where_clauses.push("w.cefr_level = ?".to_string());
        binds.push(Value::Text(c.clone()));
    }
    if let Some(s) = input.review_status.as_ref().filter(|s| !s.is_empty()) {
        where_clauses.push("w.review_status = ?".to_string());
        binds.push(Value::Text(s.clone()));
    }
    if input.missing_ipa.unwrap_or(false) {
        where_clauses
            .push("(COALESCE(w.ipa_us, '') = '' AND COALESCE(w.ipa_uk, '') = '')".to_string());
    }
    if input.missing_audio.unwrap_or(false) {
        where_clauses
            .push("NOT EXISTS (SELECT 1 FROM pronunciations p WHERE p.word_id = w.id)".to_string());
    }
    if input.missing_example.unwrap_or(false) {
        where_clauses.push(
            "NOT EXISTS (SELECT 1 FROM examples e JOIN senses s ON s.id = e.sense_id \
             WHERE s.word_id = w.id)"
                .to_string(),
        );
    }
    if input.missing_meaning.unwrap_or(false) {
        where_clauses.push(
            "NOT EXISTS (SELECT 1 FROM senses s WHERE s.word_id = w.id \
             AND COALESCE(s.definition_vi, '') != '')"
                .to_string(),
        );
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };
    (where_sql, binds)
}

// ── Vocabulary listing ────────────────────────────────────────────────────────

fn list_vocabulary_impl(
    conn: &Connection,
    input: AdminVocabularyListInputDto,
) -> Result<AdminVocabularyPageDto, AppError> {
    let page = clamp_page(input.page);
    let page_size = clamp_page_size(input.page_size);
    let offset = (page - 1) * page_size;
    let (where_sql, binds) = vocabulary_query_parts(&input);

    let count_sql = format!("SELECT COUNT(*) FROM words w {where_sql}");
    let bind_refs: Vec<&dyn rusqlite::ToSql> =
        binds.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
    let total: i64 = conn
        .query_row(&count_sql, bind_refs.as_slice(), |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to count vocabulary: {e}")))?;

    let list_sql = format!(
        "SELECT
            w.id, w.headword, w.type, w.part_of_speech, w.cefr_level,
            w.review_status, w.updated_at,
            COALESCE(w.ipa_us, '') AS ipa_us,
            COALESCE(w.ipa_uk, '') AS ipa_uk,
            (SELECT s.definition_vi FROM senses s
                WHERE s.word_id = w.id ORDER BY s.sense_index, s.id LIMIT 1) AS primary_vi,
            (SELECT s.definition_en FROM senses s
                WHERE s.word_id = w.id ORDER BY s.sense_index, s.id LIMIT 1) AS primary_en,
            (SELECT COUNT(*) FROM examples e JOIN senses s ON s.id = e.sense_id
                WHERE s.word_id = w.id) AS example_count,
            (SELECT COUNT(*) FROM pronunciations p WHERE p.word_id = w.id) AS pron_count,
            (SELECT COUNT(DISTINCT dw.deck_id) FROM deck_words dw WHERE dw.word_id = w.id) AS deck_count
        FROM words w {where_sql}
        ORDER BY w.headword COLLATE NOCASE, w.id
        LIMIT ? OFFSET ?"
    );

    let mut list_binds = binds.clone();
    list_binds.push(rusqlite::types::Value::Integer(page_size));
    list_binds.push(rusqlite::types::Value::Integer(offset));
    let list_bind_refs: Vec<&dyn rusqlite::ToSql> = list_binds
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

    let mut stmt = conn
        .prepare(&list_sql)
        .map_err(|e| AppError::Internal(format!("Failed to prepare vocab list: {e}")))?;

    let items: Vec<AdminVocabularyListItemDto> = stmt
        .query_map(list_bind_refs.as_slice(), |row| {
            let primary_vi: Option<String> = row.get(9)?;
            let primary_en: Option<String> = row.get(10)?;
            let example_count: i64 = row.get(11)?;
            let pron_count: i64 = row.get(12)?;
            let ipa_us: String = row.get(7)?;
            let ipa_uk: String = row.get(8)?;
            let vi_clean = primary_vi
                .as_ref()
                .filter(|s| !s.trim().is_empty())
                .cloned();
            let en_clean = primary_en
                .as_ref()
                .filter(|s| !s.trim().is_empty())
                .cloned();
            Ok(AdminVocabularyListItemDto {
                id: row.get(0)?,
                headword: row.get(1)?,
                word_type: row.get(2)?,
                part_of_speech: row.get(3)?,
                cefr_level: row.get(4)?,
                review_status: row.get(5)?,
                updated_at: row.get(6)?,
                primary_vietnamese_meaning: vi_clean.clone(),
                primary_english_definition: en_clean.clone(),
                missing: AdminMissingFlagsDto {
                    meaning: vi_clean.is_none(),
                    definition: en_clean.is_none(),
                    example: example_count == 0,
                    ipa: ipa_us.is_empty() && ipa_uk.is_empty(),
                    audio: pron_count == 0,
                },
                deck_count: row.get(13)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query vocab list: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to collect vocab list: {e}")))?;

    let total_pages = if total == 0 {
        0
    } else {
        (total + page_size - 1) / page_size
    };

    Ok(AdminVocabularyPageDto {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn admin_list_vocabulary(
    input: Option<AdminVocabularyListInputDto>,
    db: State<'_, DbConn>,
) -> Result<AdminVocabularyPageDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_owner(&conn)?;
    list_vocabulary_impl(&conn, input.unwrap_or_default())
}

// ── Vocabulary detail ─────────────────────────────────────────────────────────

fn load_vocabulary_detail(
    conn: &Connection,
    id: i64,
) -> Result<AdminVocabularyDetailDto, AppError> {
    let (mut dto, primary_sense_id) = conn
        .query_row(
            "SELECT
                w.id, w.headword, w.type, w.part_of_speech, w.cefr_level,
                w.ipa_uk, w.ipa_us, w.review_status, w.frequency_rank,
                w.created_at, w.updated_at,
                (SELECT p.name FROM packs p WHERE p.id = w.pack_id) AS pack_name,
                (SELECT COUNT(DISTINCT dw.deck_id) FROM deck_words dw
                    WHERE dw.word_id = w.id) AS deck_count,
                (SELECT s.id FROM senses s WHERE s.word_id = w.id
                    ORDER BY s.sense_index, s.id LIMIT 1) AS primary_sense_id,
                (SELECT s.definition_en FROM senses s WHERE s.word_id = w.id
                    ORDER BY s.sense_index, s.id LIMIT 1) AS primary_def_en,
                (SELECT s.definition_vi FROM senses s WHERE s.word_id = w.id
                    ORDER BY s.sense_index, s.id LIMIT 1) AS primary_def_vi,
                (SELECT COUNT(*) FROM senses s WHERE s.word_id = w.id) AS sense_count,
                (SELECT COUNT(*) FROM examples e JOIN senses s ON s.id = e.sense_id
                    WHERE s.word_id = w.id) AS example_count,
                (SELECT COUNT(*) FROM pronunciations p WHERE p.word_id = w.id) AS pron_count,
                (SELECT p.audio_path FROM pronunciations p WHERE p.word_id = w.id
                    ORDER BY CASE WHEN p.dialect = 'us' THEN 0 ELSE 1 END, p.id LIMIT 1)
                    AS primary_audio
            FROM words w
            WHERE w.id = ?1",
            params![id],
            |row| {
                let primary_sense_id: Option<i64> = row.get(13)?;
                Ok((
                    AdminVocabularyDetailDto {
                        id: row.get(0)?,
                        headword: row.get(1)?,
                        word_type: row.get(2)?,
                        part_of_speech: row.get(3)?,
                        cefr_level: row.get(4)?,
                        ipa_uk: row.get(5)?,
                        ipa_us: row.get(6)?,
                        review_status: row.get(7)?,
                        frequency_rank: row.get(8)?,
                        created_at: row.get(9)?,
                        updated_at: row.get(10)?,
                        pack_name: row.get(11)?,
                        deck_count: row.get(12)?,
                        primary_definition_en: row.get(14)?,
                        primary_definition_vi: row.get(15)?,
                        sense_count: row.get(16)?,
                        example_count: row.get(17)?,
                        pronunciation_count: row.get(18)?,
                        primary_audio_path: row.get(19)?,
                        primary_example_en: None,
                        primary_example_vi: None,
                    },
                    primary_sense_id,
                ))
            },
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to load vocabulary item: {e}")))?
        .ok_or_else(|| AppError::NotFound(format!("Word {id} was not found")))?;

    if let Some(sense_id) = primary_sense_id {
        if let Some((en, vi)) = conn
            .query_row(
                "SELECT sentence_en, sentence_vi FROM examples
                 WHERE sense_id = ?1 ORDER BY id LIMIT 1",
                params![sense_id],
                |row| {
                    let en: String = row.get(0)?;
                    let vi: Option<String> = row.get(1)?;
                    Ok((en, vi))
                },
            )
            .optional()
            .map_err(|e| AppError::Internal(format!("Failed to load primary example: {e}")))?
        {
            dto.primary_example_en = Some(en);
            dto.primary_example_vi = vi;
        }
    }

    Ok(dto)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyIdInput {
    pub id: i64,
}

#[tauri::command]
pub fn admin_get_vocabulary_item(
    input: AdminVocabularyIdInput,
    db: State<'_, DbConn>,
) -> Result<AdminVocabularyDetailDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_owner(&conn)?;
    load_vocabulary_detail(&conn, input.id)
}

// ── Vocabulary update ─────────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyUpdateInput {
    pub id: i64,
    pub patch: AdminVocabularyPatchDto,
}

fn apply_vocabulary_patch(
    conn: &mut Connection,
    id: i64,
    patch: AdminVocabularyPatchDto,
) -> Result<(), AppError> {
    if let Some(t) = patch.word_type.as_ref() {
        validate_enum("type", t, VALID_TYPES)?;
    }
    if let Some(c) = patch.cefr_level.as_ref().filter(|c| !c.is_empty()) {
        validate_enum("cefrLevel", c, VALID_CEFR)?;
    }
    if let Some(s) = patch.review_status.as_ref() {
        validate_enum("reviewStatus", s, VALID_REVIEW_STATUS)?;
    }
    if let Some(h) = patch.headword.as_ref() {
        if h.trim().is_empty() {
            return Err(AppError::Validation("Headword cannot be empty".to_string()));
        }
    }

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to begin transaction: {e}")))?;

    // ── words table ──────────────────────────────────────────────────────
    let mut sets: Vec<&str> = Vec::new();
    let mut binds: Vec<rusqlite::types::Value> = Vec::new();
    use rusqlite::types::Value;

    if let Some(v) = patch.headword.clone().map(|s| s.trim().to_string()) {
        sets.push("headword = ?");
        binds.push(Value::Text(v));
    }
    if let Some(v) = patch.word_type.clone() {
        sets.push("type = ?");
        binds.push(Value::Text(v));
    }
    if let Some(v) = normalize_optional_text(patch.part_of_speech.clone()) {
        sets.push("part_of_speech = ?");
        binds.push(if v.is_empty() { Value::Null } else { Value::Text(v) });
    }
    if let Some(v) = normalize_optional_text(patch.cefr_level.clone()) {
        sets.push("cefr_level = ?");
        binds.push(if v.is_empty() { Value::Null } else { Value::Text(v) });
    }
    if let Some(v) = normalize_optional_text(patch.ipa_uk.clone()) {
        sets.push("ipa_uk = ?");
        binds.push(if v.is_empty() { Value::Null } else { Value::Text(v) });
    }
    if let Some(v) = normalize_optional_text(patch.ipa_us.clone()) {
        sets.push("ipa_us = ?");
        binds.push(if v.is_empty() { Value::Null } else { Value::Text(v) });
    }
    if let Some(v) = patch.review_status.clone() {
        sets.push("review_status = ?");
        binds.push(Value::Text(v));
    }

    if !sets.is_empty() {
        let mut parts: Vec<String> = sets.iter().map(|s| s.to_string()).collect();
        parts.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')".to_string());
        let sql = format!("UPDATE words SET {} WHERE id = ?", parts.join(", "));
        binds.push(Value::Integer(id));
        let bind_refs: Vec<&dyn rusqlite::ToSql> =
            binds.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
        let updated = tx
            .execute(&sql, bind_refs.as_slice())
            .map_err(|e| AppError::Internal(format!("Failed to update word: {e}")))?;
        if updated == 0 {
            return Err(AppError::NotFound(format!("Word {id} was not found")));
        }
    } else {
        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM words WHERE id = ?1",
                params![id],
                |r| r.get(0),
            )
            .map_err(|e| AppError::Internal(format!("Failed to verify word: {e}")))?;
        if exists == 0 {
            return Err(AppError::NotFound(format!("Word {id} was not found")));
        }
    }

    // ── primary sense ────────────────────────────────────────────────────
    let touches_sense =
        patch.primary_definition_en.is_some() || patch.primary_definition_vi.is_some();
    if touches_sense {
        let existing: Option<(i64, String, Option<String>)> = tx
            .query_row(
                "SELECT id, definition_en, definition_vi FROM senses
                 WHERE word_id = ?1 ORDER BY sense_index, id LIMIT 1",
                params![id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|e| AppError::Internal(format!("Failed to load primary sense: {e}")))?;

        match existing {
            Some((sense_id, current_en, current_vi)) => {
                let new_en = patch
                    .primary_definition_en
                    .clone()
                    .map(|v| v.trim().to_string())
                    .unwrap_or(current_en);
                let new_vi = match patch.primary_definition_vi.clone() {
                    Some(v) => {
                        let t = v.trim().to_string();
                        if t.is_empty() {
                            None
                        } else {
                            Some(t)
                        }
                    }
                    None => current_vi,
                };
                if new_en.trim().is_empty() {
                    return Err(AppError::Validation(
                        "Primary English definition cannot be empty".to_string(),
                    ));
                }
                tx.execute(
                    "UPDATE senses
                     SET definition_en = ?1, definition_vi = ?2,
                         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                     WHERE id = ?3",
                    params![new_en, new_vi, sense_id],
                )
                .map_err(|e| AppError::Internal(format!("Failed to update sense: {e}")))?;
            }
            None => {
                let new_en = patch
                    .primary_definition_en
                    .clone()
                    .map(|v| v.trim().to_string())
                    .unwrap_or_default();
                if new_en.is_empty() {
                    return Err(AppError::Validation(
                        "Cannot create a primary sense without an English definition".to_string(),
                    ));
                }
                let new_vi = patch
                    .primary_definition_vi
                    .clone()
                    .map(|v| v.trim().to_string())
                    .filter(|v| !v.is_empty());
                tx.execute(
                    "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
                     VALUES (?1, 0, ?2, ?3)",
                    params![id, new_en, new_vi],
                )
                .map_err(|e| AppError::Internal(format!("Failed to insert sense: {e}")))?;
            }
        }
    }

    // ── primary example ──────────────────────────────────────────────────
    let touches_example =
        patch.primary_example_en.is_some() || patch.primary_example_vi.is_some();
    if touches_example {
        let primary_sense_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM senses WHERE word_id = ?1 ORDER BY sense_index, id LIMIT 1",
                params![id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| AppError::Internal(format!("Failed to resolve sense: {e}")))?;

        let Some(sense_id) = primary_sense_id else {
            return Err(AppError::Validation(
                "Cannot edit example before a primary sense exists".to_string(),
            ));
        };

        let existing: Option<(i64, String, Option<String>)> = tx
            .query_row(
                "SELECT id, sentence_en, sentence_vi FROM examples
                 WHERE sense_id = ?1 ORDER BY id LIMIT 1",
                params![sense_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|e| AppError::Internal(format!("Failed to load example: {e}")))?;

        let new_en_input = patch
            .primary_example_en
            .clone()
            .map(|v| v.trim().to_string());
        let new_vi_input = patch
            .primary_example_vi
            .clone()
            .map(|v| v.trim().to_string());

        match existing {
            Some((example_id, current_en, current_vi)) => {
                let new_en = new_en_input.unwrap_or(current_en);
                let new_vi = match new_vi_input {
                    Some(v) if v.is_empty() => None,
                    Some(v) => Some(v),
                    None => current_vi,
                };
                if new_en.trim().is_empty() {
                    tx.execute("DELETE FROM examples WHERE id = ?1", params![example_id])
                        .map_err(|e| {
                            AppError::Internal(format!("Failed to delete example: {e}"))
                        })?;
                } else {
                    tx.execute(
                        "UPDATE examples SET sentence_en = ?1, sentence_vi = ?2 WHERE id = ?3",
                        params![new_en, new_vi, example_id],
                    )
                    .map_err(|e| AppError::Internal(format!("Failed to update example: {e}")))?;
                }
            }
            None => {
                let new_en = new_en_input.unwrap_or_default();
                if !new_en.is_empty() {
                    let new_vi = new_vi_input.filter(|v| !v.is_empty());
                    tx.execute(
                        "INSERT INTO examples (sense_id, sentence_en, sentence_vi)
                         VALUES (?1, ?2, ?3)",
                        params![sense_id, new_en, new_vi],
                    )
                    .map_err(|e| AppError::Internal(format!("Failed to insert example: {e}")))?;
                }
            }
        }
    }

    tx.commit()
        .map_err(|e| AppError::Internal(format!("Failed to commit update: {e}")))?;
    Ok(())
}

#[tauri::command]
pub fn admin_update_vocabulary_item(
    input: AdminVocabularyUpdateInput,
    db: State<'_, DbConn>,
) -> Result<AdminVocabularyDetailDto, AppError> {
    let mut conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_owner(&conn)?;

    let AdminVocabularyUpdateInput { id, patch } = input;
    apply_vocabulary_patch(&mut conn, id, patch)?;
    load_vocabulary_detail(&conn, id)
}

// ── Deck listing ──────────────────────────────────────────────────────────────

fn list_decks_impl(
    conn: &Connection,
    input: AdminDeckListInputDto,
) -> Result<AdminDeckPageDto, AppError> {
    let page = clamp_page(input.page);
    let page_size = clamp_page_size(input.page_size);
    let offset = (page - 1) * page_size;

    let search = input
        .search
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let (where_sql, search_pattern) = match search {
        Some(s) => (
            "WHERE d.name LIKE ?1 OR d.slug LIKE ?1".to_string(),
            Some(format!("%{}%", s)),
        ),
        None => (String::new(), None),
    };

    let count_sql = format!("SELECT COUNT(*) FROM decks d {where_sql}");
    let total: i64 = if let Some(p) = &search_pattern {
        conn.query_row(&count_sql, params![p], |row| row.get(0))
    } else {
        conn.query_row(&count_sql, [], |row| row.get(0))
    }
    .map_err(|e| AppError::Internal(format!("Failed to count decks: {e}")))?;

    let list_sql = format!(
        "SELECT d.id, d.slug, d.name, d.description, d.difficulty, d.word_count,
                COALESCE(d.cover_image_path, '') AS cover, d.updated_at,
                (SELECT p.name FROM packs p WHERE p.id = d.pack_id) AS pack_name,
                (SELECT COUNT(*) FROM deck_words dw WHERE dw.deck_id = d.id) AS actual_count
         FROM decks d {where_sql}
         ORDER BY d.name COLLATE NOCASE, d.id
         LIMIT ? OFFSET ?"
    );

    let mut stmt = conn
        .prepare(&list_sql)
        .map_err(|e| AppError::Internal(format!("Failed to prepare deck list: {e}")))?;

    let mapper = |row: &rusqlite::Row<'_>| {
        let cover: String = row.get(6)?;
        Ok(AdminDeckSummaryDto {
            id: row.get(0)?,
            slug: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            difficulty: row.get(4)?,
            word_count: row.get(5)?,
            has_cover: !cover.is_empty(),
            updated_at: row.get(7)?,
            pack_name: row.get(8)?,
            actual_word_count: row.get(9)?,
        })
    };

    let items: Vec<AdminDeckSummaryDto> = if let Some(p) = &search_pattern {
        stmt.query_map(params![p, page_size, offset], mapper)
    } else {
        stmt.query_map(params![page_size, offset], mapper)
    }
    .map_err(|e| AppError::Internal(format!("Failed to query decks: {e}")))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Internal(format!("Failed to collect decks: {e}")))?;

    let total_pages = if total == 0 {
        0
    } else {
        (total + page_size - 1) / page_size
    };

    Ok(AdminDeckPageDto {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn admin_list_decks(
    input: Option<AdminDeckListInputDto>,
    db: State<'_, DbConn>,
) -> Result<AdminDeckPageDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_owner(&conn)?;
    list_decks_impl(&conn, input.unwrap_or_default())
}

// ── Validation summary ────────────────────────────────────────────────────────

fn validation_summary_impl(conn: &Connection) -> Result<AdminValidationSummaryDto, AppError> {
    let mut summary = conn
        .query_row(
            "SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN NOT EXISTS (
                    SELECT 1 FROM senses s
                    WHERE s.word_id = w.id AND COALESCE(s.definition_vi, '') != ''
                ) THEN 1 ELSE 0 END) AS missing_meanings,
                SUM(CASE WHEN NOT EXISTS (
                    SELECT 1 FROM senses s WHERE s.word_id = w.id
                ) THEN 1 ELSE 0 END) AS missing_definitions,
                SUM(CASE WHEN NOT EXISTS (
                    SELECT 1 FROM examples e JOIN senses s ON s.id = e.sense_id
                    WHERE s.word_id = w.id
                ) THEN 1 ELSE 0 END) AS missing_examples,
                SUM(CASE WHEN COALESCE(w.ipa_us, '') = '' AND COALESCE(w.ipa_uk, '') = ''
                    THEN 1 ELSE 0 END) AS missing_ipa,
                SUM(CASE WHEN NOT EXISTS (
                    SELECT 1 FROM pronunciations p WHERE p.word_id = w.id
                ) THEN 1 ELSE 0 END) AS missing_audio,
                SUM(CASE WHEN w.review_status = 'unverified' THEN 1 ELSE 0 END) AS unverified,
                SUM(CASE WHEN w.review_status = 'needs_review' THEN 1 ELSE 0 END) AS needs_review,
                SUM(CASE WHEN w.review_status = 'draft' THEN 1 ELSE 0 END) AS draft,
                SUM(CASE WHEN w.review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN w.review_status = 'verified' THEN 1 ELSE 0 END) AS verified
            FROM words w",
            [],
            |row| {
                Ok(AdminValidationSummaryDto {
                    total_words: row.get(0)?,
                    missing_meanings: row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                    missing_definitions: row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    missing_examples: row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                    missing_ipa: row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                    missing_audio: row.get::<_, Option<i64>>(5)?.unwrap_or(0),
                    unverified: row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                    needs_review: row.get::<_, Option<i64>>(7)?.unwrap_or(0),
                    draft: row.get::<_, Option<i64>>(8)?.unwrap_or(0),
                    rejected: row.get::<_, Option<i64>>(9)?.unwrap_or(0),
                    verified: row.get::<_, Option<i64>>(10)?.unwrap_or(0),
                    potential_duplicates: 0,
                })
            },
        )
        .map_err(|e| AppError::Internal(format!("Failed to load validation summary: {e}")))?;

    summary.potential_duplicates = conn
        .query_row(
            "SELECT COALESCE(SUM(c), 0) FROM (
                SELECT COUNT(*) AS c
                FROM words
                GROUP BY headword COLLATE NOCASE, COALESCE(part_of_speech, '')
                HAVING COUNT(*) > 1
            )",
            [],
            |r| r.get(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to count duplicates: {e}")))?;

    Ok(summary)
}

#[tauri::command]
pub fn admin_get_validation_summary(
    db: State<'_, DbConn>,
) -> Result<AdminValidationSummaryDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_owner(&conn)?;
    validation_summary_impl(&conn)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth;

    fn seeded_conn() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::db::seeder::load_bundled(&mut conn).expect("seeder");
        auth::create_default_accounts(&conn).expect("accounts");
        conn
    }

    fn login_as(conn: &Connection, username: &str) {
        auth::logout(conn).expect("logout reset");
        auth::login(conn, username, username).expect("login");
    }

    #[test]
    fn learner_session_cannot_reach_admin_endpoints() {
        let conn = seeded_conn();
        login_as(&conn, "learner");
        let err = auth::require_owner(&conn).expect_err("learner must be unauthorized");
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn unauthenticated_cannot_reach_admin_endpoints() {
        let conn = seeded_conn();
        auth::logout(&conn).expect("logout");
        let err = auth::require_owner(&conn).expect_err("must be unauthorized");
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn owner_lists_vocabulary_with_pagination() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let page = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                page: Some(1),
                page_size: Some(5),
                ..Default::default()
            },
        )
        .expect("page");
        assert!(page.total > 0, "seed must contain words");
        assert!(page.items.len() <= 5);
        assert_eq!(page.page, 1);
        assert_eq!(page.page_size, 5);
    }

    #[test]
    fn vocabulary_pagination_offsets_correctly() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let p1 = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                page: Some(1),
                page_size: Some(2),
                ..Default::default()
            },
        )
        .expect("p1");
        if p1.total < 3 {
            return; // not enough seed data to test offset
        }
        let p2 = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                page: Some(2),
                page_size: Some(2),
                ..Default::default()
            },
        )
        .expect("p2");
        assert_ne!(p1.items[0].id, p2.items[0].id);
    }

    #[test]
    fn vocabulary_search_filter_narrows_results() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let all =
            list_vocabulary_impl(&conn, AdminVocabularyListInputDto::default()).expect("all");
        if all.total == 0 {
            return;
        }
        let prefix: String = all.items[0].headword.chars().take(1).collect();
        let filtered = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                search: Some(prefix.clone()),
                page_size: Some(200),
                ..Default::default()
            },
        )
        .expect("filtered");
        assert!(filtered.total >= 1);
        for item in &filtered.items {
            assert!(item
                .headword
                .to_lowercase()
                .starts_with(&prefix.to_lowercase()));
        }
    }

    #[test]
    fn vocabulary_status_filter_narrows_results() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let unverified = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                review_status: Some("unverified".to_string()),
                page_size: Some(200),
                ..Default::default()
            },
        )
        .expect("unverified");
        let verified = list_vocabulary_impl(
            &conn,
            AdminVocabularyListInputDto {
                review_status: Some("verified".to_string()),
                page_size: Some(200),
                ..Default::default()
            },
        )
        .expect("verified");
        assert!(unverified.total >= verified.total);
    }

    #[test]
    fn detail_returns_correct_record() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let page =
            list_vocabulary_impl(&conn, AdminVocabularyListInputDto::default()).expect("page");
        let Some(first) = page.items.first() else {
            return;
        };
        let detail = load_vocabulary_detail(&conn, first.id).expect("detail");
        assert_eq!(detail.id, first.id);
        assert_eq!(detail.headword, first.headword);
    }

    #[test]
    fn partial_update_only_changes_named_fields() {
        let mut conn = seeded_conn();
        login_as(&conn, "owner");
        let page =
            list_vocabulary_impl(&conn, AdminVocabularyListInputDto::default()).expect("page");
        let Some(first) = page.items.first() else {
            return;
        };
        let id = first.id;
        let before = load_vocabulary_detail(&conn, id).expect("before");

        apply_vocabulary_patch(
            &mut conn,
            id,
            AdminVocabularyPatchDto {
                review_status: Some("verified".to_string()),
                ..Default::default()
            },
        )
        .expect("apply patch");

        let after = load_vocabulary_detail(&conn, id).expect("after");
        assert_eq!(after.review_status, "verified");
        assert_eq!(after.headword, before.headword);
        assert_eq!(after.word_type, before.word_type);
        assert_eq!(after.part_of_speech, before.part_of_speech);
    }

    #[test]
    fn update_rejects_invalid_enum() {
        let mut conn = seeded_conn();
        login_as(&conn, "owner");
        let page =
            list_vocabulary_impl(&conn, AdminVocabularyListInputDto::default()).expect("page");
        let Some(first) = page.items.first() else {
            return;
        };
        let id = first.id;
        let err = apply_vocabulary_patch(
            &mut conn,
            id,
            AdminVocabularyPatchDto {
                review_status: Some("approved".to_string()),
                ..Default::default()
            },
        )
        .expect_err("invalid status must be rejected");
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn update_primary_definition_persists() {
        let mut conn = seeded_conn();
        login_as(&conn, "owner");
        let page =
            list_vocabulary_impl(&conn, AdminVocabularyListInputDto::default()).expect("page");
        let Some(first) = page.items.first() else {
            return;
        };
        let id = first.id;
        apply_vocabulary_patch(
            &mut conn,
            id,
            AdminVocabularyPatchDto {
                primary_definition_vi: Some("nghĩa mới".to_string()),
                ..Default::default()
            },
        )
        .expect("apply patch");
        let after = load_vocabulary_detail(&conn, id).expect("after");
        assert_eq!(
            after.primary_definition_vi.as_deref(),
            Some("nghĩa mới")
        );
    }

    #[test]
    fn deck_listing_paginates() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let page = list_decks_impl(
            &conn,
            AdminDeckListInputDto {
                page: Some(1),
                page_size: Some(3),
                ..Default::default()
            },
        )
        .expect("decks page");
        assert!(page.total > 0);
        assert!(page.items.len() <= 3);
    }

    #[test]
    fn validation_summary_totals_match() {
        let conn = seeded_conn();
        login_as(&conn, "owner");
        let summary = validation_summary_impl(&conn).expect("summary");
        assert_eq!(
            summary.total_words,
            summary.unverified
                + summary.verified
                + summary.needs_review
                + summary.draft
                + summary.rejected,
        );
    }
}
