use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::import_export::{
    ExportDeckResultDto, ExportableDeckDto, ExportableDecksDto, ImportDeckResultDto,
    ImportExportSchemaDto,
};
use crate::errors::AppError;
use crate::filesystem::AppPaths;

const DECK_SCHEMA_NAME: &str = "lexora.deck";
const DECK_SCHEMA_VERSION: &str = "1";
const DECK_SCHEMA_ID: &str = "lexora.deck.v1";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFile {
    schema: String,
    schema_version: String,
    exported_at: Option<String>,
    pack: DeckFilePack,
    deck: DeckFileDeck,
    words: Vec<DeckFileWord>,
    #[serde(default)]
    relations: Vec<DeckFileRelation>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFilePack {
    slug: String,
    name: String,
    description: Option<String>,
    version: String,
    author: Option<String>,
    cover_image_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFileDeck {
    slug: String,
    name: String,
    description: Option<String>,
    cover_image_path: Option<String>,
    difficulty: Option<String>,
    tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFileWord {
    headword: String,
    part_of_speech: Option<String>,
    ipa_uk: Option<String>,
    ipa_us: Option<String>,
    frequency_rank: Option<i64>,
    cefr_level: Option<String>,
    #[serde(default)]
    senses: Vec<DeckFileSense>,
    #[serde(default)]
    pronunciations: Vec<DeckFilePronunciation>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFileSense {
    sense_index: i64,
    definition_en: String,
    definition_vi: Option<String>,
    register: Option<String>,
    domain: Option<String>,
    #[serde(default)]
    examples: Vec<DeckFileExample>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFileExample {
    sentence_en: String,
    sentence_vi: Option<String>,
    audio_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFilePronunciation {
    dialect: String,
    audio_path: String,
    tts_engine: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct DeckFileRelation {
    from_headword: String,
    to_headword: String,
    relation_type: String,
}

#[derive(Debug)]
struct ImportCounts {
    words: usize,
    senses: usize,
    examples: usize,
    pronunciations: usize,
}

#[tauri::command]
pub fn get_import_export_schema() -> ImportExportSchemaDto {
    ImportExportSchemaDto {
        json_schema_name: DECK_SCHEMA_NAME.to_string(),
        json_schema_version: DECK_SCHEMA_VERSION.to_string(),
        json_required_top_level_fields: vec![
            "schema".to_string(),
            "schema_version".to_string(),
            "pack".to_string(),
            "deck".to_string(),
            "words".to_string(),
        ],
        csv_format_name: "lexora.vocabulary_csv.v1".to_string(),
        csv_headers: vec![
            "headword".to_string(),
            "part_of_speech".to_string(),
            "ipa_uk".to_string(),
            "ipa_us".to_string(),
            "frequency_rank".to_string(),
            "cefr_level".to_string(),
            "definition_en".to_string(),
            "definition_vi".to_string(),
            "example_en".to_string(),
            "example_vi".to_string(),
            "tags".to_string(),
        ],
        csv_notes: vec![
            "UTF-8 with a header row is required.".to_string(),
            "One row creates one word with its first sense.".to_string(),
            "tags is a semicolon-separated list.".to_string(),
            "CSV import is schema-only in this foundation prompt.".to_string(),
        ],
    }
}

#[tauri::command]
pub fn list_exportable_decks(db: State<'_, DbConn>) -> Result<ExportableDecksDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_session(&conn)?;
    let decks = query_exportable_decks(&conn)?;
    let total = decks.len();
    Ok(ExportableDecksDto { decks, total })
}

#[tauri::command]
pub fn export_deck_to_json(
    deck_id: i64,
    file_path: Option<String>,
    overwrite: bool,
    db: State<'_, DbConn>,
    paths: State<'_, AppPaths>,
) -> Result<ExportDeckResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_session(&conn)?;
    export_deck_json(&conn, &paths, deck_id, file_path, overwrite)
}

#[tauri::command]
pub fn import_deck_from_json(
    file_path: String,
    db: State<'_, DbConn>,
) -> Result<ImportDeckResultDto, AppError> {
    let mut conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_session(&conn)?;
    import_deck_json(&mut conn, &file_path)
}

fn query_exportable_decks(conn: &Connection) -> Result<Vec<ExportableDeckDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.name, d.slug, COALESCE(p.name, 'Standalone'), d.word_count
             FROM   decks d
             LEFT JOIN packs p ON p.id = d.pack_id
             ORDER  BY p.name, d.name",
        )
        .map_err(|e| {
            AppError::Internal(format!("Failed to prepare exportable decks query: {e}"))
        })?;

    let decks = stmt
        .query_map([], |row| {
            Ok(ExportableDeckDto {
                id: row.get(0)?,
                title: row.get(1)?,
                slug: row.get(2)?,
                pack_name: row.get(3)?,
                word_count: row.get(4)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query exportable decks: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read exportable decks: {e}")))?;

    Ok(decks)
}

fn export_deck_json(
    conn: &Connection,
    paths: &AppPaths,
    deck_id: i64,
    file_path: Option<String>,
    overwrite: bool,
) -> Result<ExportDeckResultDto, AppError> {
    let deck_file = build_deck_file(conn, deck_id)?;
    validate_deck_file(&deck_file)?;

    let output_path = match file_path.filter(|p| !p.trim().is_empty()) {
        Some(path) => PathBuf::from(path),
        None => {
            let dir = paths.exports_dir();
            fs::create_dir_all(&dir).map_err(|e| {
                AppError::Internal(format!("Failed to create export directory: {e}"))
            })?;
            dir.join(format!(
                "{}.lexora-deck.json",
                sanitize_filename(&deck_file.deck.slug)
            ))
        }
    };

    if output_path.exists() && !overwrite {
        return Err(AppError::Validation(format!(
            "Export file already exists: {}. Enable overwrite to replace it.",
            output_path.display()
        )));
    }

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("Failed to create export directory: {e}")))?;
    }

    let json = serde_json::to_string_pretty(&deck_file)
        .map_err(|e| AppError::Internal(format!("Failed to serialise deck export: {e}")))?;
    fs::write(&output_path, json)
        .map_err(|e| AppError::Internal(format!("Failed to write deck export: {e}")))?;
    let bytes_written = fs::metadata(&output_path)
        .map_err(|e| AppError::Internal(format!("Failed to inspect deck export: {e}")))?
        .len();

    Ok(ExportDeckResultDto {
        deck_id,
        deck_slug: deck_file.deck.slug,
        file_path: output_path.to_string_lossy().to_string(),
        bytes_written,
        word_count: deck_file.words.len(),
    })
}

fn build_deck_file(conn: &Connection, deck_id: i64) -> Result<DeckFile, AppError> {
    type DeckRow = (
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    );

    let row: DeckRow = conn
        .query_row(
            "SELECT d.slug, d.name, d.description, d.cover_image_path, d.difficulty, d.tags,
                    p.slug, p.name, p.description, p.version, p.author, p.cover_image_path
             FROM   decks d
             LEFT JOIN packs p ON p.id = d.pack_id
             WHERE  d.id = ?1",
            params![deck_id],
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
                ))
            },
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to query deck for export: {e}")))?
        .ok_or_else(|| AppError::NotFound(format!("Deck {deck_id} was not found")))?;

    let (
        deck_slug,
        deck_name,
        deck_description,
        deck_cover,
        difficulty,
        tags_json,
        pack_slug,
        pack_name,
        pack_description,
        pack_version,
        pack_author,
        pack_cover,
    ) = row;

    let tags = tags_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<Vec<String>>(raw).ok())
        .unwrap_or_default();

    Ok(DeckFile {
        schema: DECK_SCHEMA_ID.to_string(),
        schema_version: DECK_SCHEMA_VERSION.to_string(),
        exported_at: Some(now(conn)?),
        pack: DeckFilePack {
            slug: pack_slug.unwrap_or_else(|| format!("standalone-{deck_slug}")),
            name: pack_name.unwrap_or_else(|| "Standalone Deck".to_string()),
            description: pack_description,
            version: pack_version.unwrap_or_else(|| "1.0.0".to_string()),
            author: pack_author,
            cover_image_path: pack_cover,
        },
        deck: DeckFileDeck {
            slug: deck_slug,
            name: deck_name,
            description: deck_description,
            cover_image_path: deck_cover,
            difficulty,
            tags,
        },
        words: query_export_words(conn, deck_id)?,
        relations: query_export_relations(conn, deck_id)?,
    })
}

fn query_export_words(conn: &Connection, deck_id: i64) -> Result<Vec<DeckFileWord>, AppError> {
    type WordRow = (
        i64,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<String>,
    );

    let mut stmt = conn
        .prepare(
            "SELECT w.id, w.headword, w.part_of_speech, w.ipa_uk, w.ipa_us,
                    w.frequency_rank, w.cefr_level
             FROM   deck_words dw
             JOIN   words w ON w.id = dw.word_id
             WHERE  dw.deck_id = ?1
             ORDER  BY dw.position, w.headword",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare export words query: {e}")))?;

    let rows = stmt
        .query_map(params![deck_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query export words: {e}")))?
        .collect::<Result<Vec<WordRow>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read export words: {e}")))?;

    rows.into_iter()
        .map(
            |(id, headword, part_of_speech, ipa_uk, ipa_us, frequency_rank, cefr_level)| {
                Ok(DeckFileWord {
                    headword,
                    part_of_speech,
                    ipa_uk,
                    ipa_us,
                    frequency_rank,
                    cefr_level,
                    senses: query_export_senses(conn, id)?,
                    pronunciations: query_export_pronunciations(conn, id)?,
                })
            },
        )
        .collect()
}

fn query_export_senses(conn: &Connection, word_id: i64) -> Result<Vec<DeckFileSense>, AppError> {
    type SenseRow = (
        i64,
        i64,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, sense_index, definition_en, definition_vi, register, domain
             FROM   senses
             WHERE  word_id = ?1
             ORDER  BY sense_index, id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare export senses query: {e}")))?;

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
        .map_err(|e| AppError::Internal(format!("Failed to query export senses: {e}")))?
        .collect::<Result<Vec<SenseRow>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read export senses: {e}")))?;

    rows.into_iter()
        .map(
            |(id, sense_index, definition_en, definition_vi, register, domain)| {
                Ok(DeckFileSense {
                    sense_index,
                    definition_en,
                    definition_vi,
                    register,
                    domain,
                    examples: query_export_examples(conn, id)?,
                })
            },
        )
        .collect()
}

fn query_export_examples(
    conn: &Connection,
    sense_id: i64,
) -> Result<Vec<DeckFileExample>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT sentence_en, sentence_vi, audio_path
             FROM   examples
             WHERE  sense_id = ?1
             ORDER  BY id",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare export examples query: {e}")))?;

    let rows = stmt
        .query_map(params![sense_id], |row| {
            Ok(DeckFileExample {
                sentence_en: row.get(0)?,
                sentence_vi: row.get(1)?,
                audio_path: row.get(2)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query export examples: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read export examples: {e}")))?;

    Ok(rows)
}

fn query_export_pronunciations(
    conn: &Connection,
    word_id: i64,
) -> Result<Vec<DeckFilePronunciation>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT dialect, audio_path, tts_engine
             FROM   pronunciations
             WHERE  word_id = ?1
             ORDER  BY dialect, id",
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to prepare export pronunciations query: {e}"
            ))
        })?;

    let rows = stmt
        .query_map(params![word_id], |row| {
            Ok(DeckFilePronunciation {
                dialect: row.get(0)?,
                audio_path: row.get(1)?,
                tts_engine: row.get(2)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query export pronunciations: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read export pronunciations: {e}")))?;

    Ok(rows)
}

fn query_export_relations(
    conn: &Connection,
    deck_id: i64,
) -> Result<Vec<DeckFileRelation>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT wf.headword, wt.headword, wr.relation_type
             FROM   word_relations wr
             JOIN   words wf ON wf.id = wr.from_word_id
             JOIN   words wt ON wt.id = wr.to_word_id
             JOIN   deck_words dwf ON dwf.word_id = wr.from_word_id AND dwf.deck_id = ?1
             JOIN   deck_words dwt ON dwt.word_id = wr.to_word_id AND dwt.deck_id = ?1
             ORDER  BY wf.headword, wr.relation_type, wt.headword",
        )
        .map_err(|e| {
            AppError::Internal(format!("Failed to prepare export relations query: {e}"))
        })?;

    let rows = stmt
        .query_map(params![deck_id], |row| {
            Ok(DeckFileRelation {
                from_headword: row.get(0)?,
                to_headword: row.get(1)?,
                relation_type: row.get(2)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query export relations: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read export relations: {e}")))?;

    Ok(rows)
}

fn import_deck_json(
    conn: &mut Connection,
    file_path: &str,
) -> Result<ImportDeckResultDto, AppError> {
    let source = Path::new(file_path);
    if source.extension().and_then(|e| e.to_str()) != Some("json") {
        let message = "Deck import file must be a .json file".to_string();
        record_failed_import(conn, file_path, "rejected", &message, None, None)?;
        return Err(AppError::Validation(message));
    }

    let raw = match fs::read_to_string(source) {
        Ok(raw) => raw,
        Err(e) => {
            let message = format!("Could not read import file: {e}");
            record_failed_import(conn, file_path, "failed", &message, None, None)?;
            return Err(AppError::Validation(message));
        }
    };
    let deck_file: DeckFile = match serde_json::from_str(&raw) {
        Ok(file) => file,
        Err(e) => {
            let message = format!("Import JSON is not compatible with Lexora deck v1: {e}");
            record_failed_import(conn, file_path, "rejected", &message, None, None)?;
            return Err(AppError::Validation(message));
        }
    };

    if let Err(err) = validate_deck_file(&deck_file) {
        let message = err.to_string();
        record_failed_import(
            conn,
            file_path,
            "rejected",
            &message,
            Some(&deck_file.pack.slug),
            Some(&deck_file.deck.slug),
        )?;
        return Err(err);
    }

    if slug_exists(conn, "packs", &deck_file.pack.slug)? {
        let message = format!(
            "Pack slug '{}' already exists. Import rejected to avoid overwriting local content.",
            deck_file.pack.slug
        );
        record_failed_import(
            conn,
            file_path,
            "rejected",
            &message,
            Some(&deck_file.pack.slug),
            Some(&deck_file.deck.slug),
        )?;
        return Err(AppError::Validation(message));
    }

    if slug_exists(conn, "decks", &deck_file.deck.slug)? {
        let message = format!(
            "Deck slug '{}' already exists. Import rejected to avoid overwriting local content.",
            deck_file.deck.slug
        );
        record_failed_import(
            conn,
            file_path,
            "rejected",
            &message,
            Some(&deck_file.pack.slug),
            Some(&deck_file.deck.slug),
        )?;
        return Err(AppError::Validation(message));
    }

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to start import transaction: {e}")))?;
    let (pack_id, deck_id, counts) = insert_deck_file(&tx, &deck_file, file_path)?;
    let import_id = record_success_import(&tx, file_path, &deck_file, pack_id, deck_id, &counts)?;

    tx.commit()
        .map_err(|e| AppError::Internal(format!("Failed to commit deck import: {e}")))?;

    Ok(ImportDeckResultDto {
        import_id,
        pack_id,
        deck_id,
        deck_slug: deck_file.deck.slug,
        words_imported: counts.words,
        senses_imported: counts.senses,
        examples_imported: counts.examples,
        pronunciations_imported: counts.pronunciations,
        status: "imported".to_string(),
    })
}

fn insert_deck_file(
    conn: &Connection,
    file: &DeckFile,
    source_path: &str,
) -> Result<(i64, i64, ImportCounts), AppError> {
    conn.execute(
        "INSERT INTO packs
            (slug, name, description, version, author, cover_image_path, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'imported')",
        params![
            file.pack.slug,
            file.pack.name,
            file.pack.description,
            file.pack.version,
            file.pack.author,
            file.pack.cover_image_path,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to insert imported pack: {e}")))?;
    let pack_id = conn.last_insert_rowid();
    record_provenance(conn, "packs", pack_id, pack_id, source_path)?;

    let tags_json = serde_json::to_string(&file.deck.tags)
        .map_err(|e| AppError::Internal(format!("Failed to serialise deck tags: {e}")))?;
    conn.execute(
        "INSERT INTO decks
            (pack_id, slug, name, description, cover_image_path, difficulty, tags, word_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)",
        params![
            pack_id,
            file.deck.slug,
            file.deck.name,
            file.deck.description,
            file.deck.cover_image_path,
            file.deck.difficulty,
            tags_json,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to insert imported deck: {e}")))?;
    let deck_id = conn.last_insert_rowid();
    record_provenance(conn, "decks", deck_id, pack_id, source_path)?;

    let mut word_ids = HashMap::<String, i64>::new();
    let mut counts = ImportCounts {
        words: 0,
        senses: 0,
        examples: 0,
        pronunciations: 0,
    };

    for (position, word) in file.words.iter().enumerate() {
        conn.execute(
            "INSERT INTO words
                (pack_id, headword, part_of_speech, ipa_uk, ipa_us, frequency_rank, cefr_level)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                pack_id,
                word.headword,
                word.part_of_speech,
                word.ipa_uk,
                word.ipa_us,
                word.frequency_rank,
                word.cefr_level,
            ],
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to insert imported word '{}': {e}",
                word.headword
            ))
        })?;
        let word_id = conn.last_insert_rowid();
        word_ids.insert(word.headword.clone(), word_id);
        counts.words += 1;
        record_provenance(conn, "words", word_id, pack_id, source_path)?;

        conn.execute(
            "INSERT INTO deck_words (deck_id, word_id, position) VALUES (?1, ?2, ?3)",
            params![deck_id, word_id, position as i64],
        )
        .map_err(|e| AppError::Internal(format!("Failed to link imported word to deck: {e}")))?;

        for sense in &word.senses {
            conn.execute(
                "INSERT INTO senses
                    (word_id, sense_index, definition_en, definition_vi, register, domain)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    word_id,
                    sense.sense_index,
                    sense.definition_en,
                    sense.definition_vi,
                    sense.register,
                    sense.domain,
                ],
            )
            .map_err(|e| {
                AppError::Internal(format!(
                    "Failed to insert imported sense for '{}': {e}",
                    word.headword
                ))
            })?;
            let sense_id = conn.last_insert_rowid();
            counts.senses += 1;
            record_provenance(conn, "senses", sense_id, pack_id, source_path)?;

            for example in &sense.examples {
                conn.execute(
                    "INSERT INTO examples (sense_id, sentence_en, sentence_vi, audio_path)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![
                        sense_id,
                        example.sentence_en,
                        example.sentence_vi,
                        example.audio_path,
                    ],
                )
                .map_err(|e| {
                    AppError::Internal(format!(
                        "Failed to insert imported example for '{}': {e}",
                        word.headword
                    ))
                })?;
                counts.examples += 1;
                record_provenance(
                    conn,
                    "examples",
                    conn.last_insert_rowid(),
                    pack_id,
                    source_path,
                )?;
            }
        }

        for pronunciation in &word.pronunciations {
            conn.execute(
                "INSERT INTO pronunciations (word_id, dialect, audio_path, tts_engine)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    word_id,
                    pronunciation.dialect,
                    pronunciation.audio_path,
                    pronunciation.tts_engine,
                ],
            )
            .map_err(|e| {
                AppError::Internal(format!(
                    "Failed to insert imported pronunciation for '{}': {e}",
                    word.headword
                ))
            })?;
            counts.pronunciations += 1;
            record_provenance(
                conn,
                "pronunciations",
                conn.last_insert_rowid(),
                pack_id,
                source_path,
            )?;
        }
    }

    for relation in &file.relations {
        let from_id = word_ids
            .get(&relation.from_headword)
            .copied()
            .ok_or_else(|| {
                AppError::Validation(format!(
                    "Relation references missing word '{}'",
                    relation.from_headword
                ))
            })?;
        let to_id = word_ids
            .get(&relation.to_headword)
            .copied()
            .ok_or_else(|| {
                AppError::Validation(format!(
                    "Relation references missing word '{}'",
                    relation.to_headword
                ))
            })?;

        conn.execute(
            "INSERT INTO word_relations (from_word_id, to_word_id, relation_type)
             VALUES (?1, ?2, ?3)",
            params![from_id, to_id, relation.relation_type],
        )
        .map_err(|e| AppError::Internal(format!("Failed to insert imported word relation: {e}")))?;
        record_provenance(
            conn,
            "word_relations",
            conn.last_insert_rowid(),
            pack_id,
            source_path,
        )?;
    }

    conn.execute(
        "UPDATE decks
         SET word_count = (SELECT COUNT(*) FROM deck_words WHERE deck_words.deck_id = decks.id)
         WHERE id = ?1",
        params![deck_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to refresh imported deck word count: {e}")))?;

    Ok((pack_id, deck_id, counts))
}

fn validate_deck_file(file: &DeckFile) -> Result<(), AppError> {
    if file.schema != DECK_SCHEMA_ID || file.schema_version != DECK_SCHEMA_VERSION {
        return Err(AppError::Validation(format!(
            "Unsupported deck schema '{}'. Expected {} version {}.",
            file.schema, DECK_SCHEMA_NAME, DECK_SCHEMA_VERSION
        )));
    }
    validate_slug("pack.slug", &file.pack.slug)?;
    validate_slug("deck.slug", &file.deck.slug)?;
    validate_non_empty("pack.name", &file.pack.name)?;
    validate_non_empty("deck.name", &file.deck.name)?;
    validate_non_empty("pack.version", &file.pack.version)?;

    if let Some(difficulty) = &file.deck.difficulty {
        if !matches!(
            difficulty.as_str(),
            "beginner" | "intermediate" | "advanced"
        ) {
            return Err(AppError::Validation(format!(
                "deck.difficulty must be beginner, intermediate, or advanced; got '{difficulty}'"
            )));
        }
    }

    let mut headwords = HashSet::<String>::new();
    for word in &file.words {
        validate_non_empty("word.headword", &word.headword)?;
        if !headwords.insert(word.headword.clone()) {
            return Err(AppError::Validation(format!(
                "Duplicate word headword '{}' in import file",
                word.headword
            )));
        }
        if let Some(rank) = word.frequency_rank {
            if rank < 1 {
                return Err(AppError::Validation(format!(
                    "frequency_rank for '{}' must be at least 1",
                    word.headword
                )));
            }
        }
        if let Some(level) = &word.cefr_level {
            if !matches!(level.as_str(), "A1" | "A2" | "B1" | "B2" | "C1" | "C2") {
                return Err(AppError::Validation(format!(
                    "cefr_level for '{}' must be A1-C2",
                    word.headword
                )));
            }
        }

        let mut indexes = HashSet::<i64>::new();
        for sense in &word.senses {
            if sense.sense_index < 0 {
                return Err(AppError::Validation(format!(
                    "sense_index for '{}' must be zero or greater",
                    word.headword
                )));
            }
            if !indexes.insert(sense.sense_index) {
                return Err(AppError::Validation(format!(
                    "Duplicate sense_index {} for '{}'",
                    sense.sense_index, word.headword
                )));
            }
            validate_non_empty("sense.definition_en", &sense.definition_en)?;
            for example in &sense.examples {
                validate_non_empty("example.sentence_en", &example.sentence_en)?;
            }
        }

        for pronunciation in &word.pronunciations {
            if !matches!(pronunciation.dialect.as_str(), "uk" | "us") {
                return Err(AppError::Validation(format!(
                    "pronunciation dialect for '{}' must be uk or us",
                    word.headword
                )));
            }
            validate_non_empty("pronunciation.audio_path", &pronunciation.audio_path)?;
            if let Some(engine) = &pronunciation.tts_engine {
                if !matches!(engine.as_str(), "bundled" | "edge-tts" | "gtts") {
                    return Err(AppError::Validation(format!(
                        "tts_engine for '{}' must be bundled, edge-tts, or gtts",
                        word.headword
                    )));
                }
            }
        }
    }

    for relation in &file.relations {
        if relation.from_headword == relation.to_headword {
            return Err(AppError::Validation(
                "Word relations cannot point to the same headword".to_string(),
            ));
        }
        if !headwords.contains(&relation.from_headword)
            || !headwords.contains(&relation.to_headword)
        {
            return Err(AppError::Validation(
                "Word relations must reference words included in the deck export".to_string(),
            ));
        }
        if !matches!(
            relation.relation_type.as_str(),
            "synonym" | "antonym" | "collocation" | "see_also"
        ) {
            return Err(AppError::Validation(format!(
                "Unsupported relation_type '{}'",
                relation.relation_type
            )));
        }
    }

    Ok(())
}

fn validate_slug(field: &str, value: &str) -> Result<(), AppError> {
    validate_non_empty(field, value)?;
    let valid = value
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_');
    if !valid {
        return Err(AppError::Validation(format!(
            "{field} must use lowercase letters, numbers, hyphens, or underscores"
        )));
    }
    Ok(())
}

fn validate_non_empty(field: &str, value: &str) -> Result<(), AppError> {
    if value.trim().is_empty() {
        return Err(AppError::Validation(format!("{field} cannot be empty")));
    }
    Ok(())
}

fn slug_exists(conn: &Connection, table_name: &str, slug: &str) -> Result<bool, AppError> {
    let sql = match table_name {
        "packs" => "SELECT COUNT(*) FROM packs WHERE slug = ?1",
        "decks" => "SELECT COUNT(*) FROM decks WHERE slug = ?1",
        _ => return Err(AppError::Internal("Invalid slug lookup table".to_string())),
    };
    conn.query_row(sql, params![slug], |row| row.get::<_, i64>(0))
        .map(|count| count > 0)
        .map_err(|e| AppError::Internal(format!("Failed to check slug conflict: {e}")))
}

fn record_provenance(
    conn: &Connection,
    table_name: &str,
    row_id: i64,
    pack_id: i64,
    source_path: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO data_provenance
            (table_name, row_id, source, pack_id, notes)
         VALUES (?1, ?2, 'imported', ?3, ?4)",
        params![
            table_name,
            row_id,
            pack_id,
            format!("deck_json:{source_path}")
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to record provenance: {e}")))?;
    Ok(())
}

fn record_failed_import(
    conn: &Connection,
    source_path: &str,
    status: &str,
    message: &str,
    pack_slug: Option<&str>,
    deck_slug: Option<&str>,
) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO content_imports
            (import_type, source_path, status, pack_slug, deck_slug, error_message)
         VALUES ('deck_json', ?1, ?2, ?3, ?4, ?5)",
        params![source_path, status, pack_slug, deck_slug, message],
    )
    .map_err(|e| AppError::Internal(format!("Failed to record failed import: {e}")))?;
    Ok(conn.last_insert_rowid())
}

fn record_success_import(
    conn: &Connection,
    source_path: &str,
    file: &DeckFile,
    pack_id: i64,
    deck_id: i64,
    counts: &ImportCounts,
) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO content_imports
            (import_type, source_path, status, pack_slug, deck_slug, pack_id, deck_id, words_imported)
         VALUES ('deck_json', ?1, 'imported', ?2, ?3, ?4, ?5, ?6)",
        params![
            source_path,
            file.pack.slug,
            file.deck.slug,
            pack_id,
            deck_id,
            counts.words as i64,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to record successful import: {e}")))?;
    Ok(conn.last_insert_rowid())
}

fn sanitize_filename(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect()
}

fn now(conn: &Connection) -> Result<String, AppError> {
    conn.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to read current timestamp: {e}")))
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

    fn temp_path(name: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        std::env::temp_dir().join(format!("lexora-{name}-{}-{nanos}.json", std::process::id(),))
    }

    fn path_string(path: &Path) -> String {
        path.to_string_lossy().to_string()
    }

    #[test]
    fn schema_command_defines_json_and_csv_formats() {
        let schema = get_import_export_schema();

        assert_eq!(schema.json_schema_name, "lexora.deck");
        assert!(schema
            .json_required_top_level_fields
            .contains(&"words".to_string()));
        assert!(schema.csv_headers.contains(&"headword".to_string()));
        assert!(schema.csv_headers.contains(&"definition_vi".to_string()));
    }

    #[test]
    fn export_deck_json_writes_real_deck_file() {
        let conn = db_with_data();
        let deck_id: i64 = conn
            .query_row(
                "SELECT id FROM decks WHERE slug = 'everyday-actions'",
                [],
                |row| row.get(0),
            )
            .expect("deck");
        let path = temp_path("export");
        let paths = AppPaths {
            app_data_dir: std::env::temp_dir(),
        };

        let result = export_deck_json(&conn, &paths, deck_id, Some(path_string(&path)), false)
            .expect("export");

        assert_eq!(result.deck_slug, "everyday-actions");
        assert!(result.bytes_written > 0);
        assert!(fs::read_to_string(path)
            .expect("export file")
            .contains(DECK_SCHEMA_ID));
    }

    #[test]
    fn export_deck_json_rejects_overwrite_without_confirmation() {
        let conn = db_with_data();
        let deck_id: i64 = conn
            .query_row("SELECT id FROM decks LIMIT 1", [], |row| row.get(0))
            .expect("deck");
        let path = temp_path("overwrite");
        fs::write(&path, "{}").expect("placeholder");
        let paths = AppPaths {
            app_data_dir: std::env::temp_dir(),
        };

        let result = export_deck_json(&conn, &paths, deck_id, Some(path_string(&path)), false);

        assert!(matches!(result, Err(AppError::Validation(_))));
    }

    #[test]
    fn import_deck_json_inserts_content_and_provenance() {
        let source = db_with_data();
        let deck_id: i64 = source
            .query_row(
                "SELECT id FROM decks WHERE slug = 'everyday-actions'",
                [],
                |row| row.get(0),
            )
            .expect("deck");
        let path = temp_path("import");
        let paths = AppPaths {
            app_data_dir: std::env::temp_dir(),
        };
        export_deck_json(&source, &paths, deck_id, Some(path_string(&path)), false)
            .expect("export");

        let mut clean = Connection::open_in_memory().expect("clean db");
        clean.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut clean).expect("migrations");
        crate::auth::create_default_accounts(&clean).expect("accounts");

        let import_path = path_string(&path);
        let result = import_deck_json(&mut clean, &import_path).expect("import");

        assert_eq!(result.deck_slug, "everyday-actions");
        assert_eq!(result.status, "imported");
        assert!(result.words_imported > 0);
        let provenance_count: i64 = clean
            .query_row(
                "SELECT COUNT(*) FROM data_provenance WHERE source = 'imported'",
                [],
                |row| row.get(0),
            )
            .expect("provenance");
        assert!(provenance_count > 0);
    }

    #[test]
    fn import_deck_json_rejects_existing_slugs() {
        let mut conn = db_with_data();
        let deck_id: i64 = conn
            .query_row(
                "SELECT id FROM decks WHERE slug = 'everyday-actions'",
                [],
                |row| row.get(0),
            )
            .expect("deck");
        let path = temp_path("conflict");
        let paths = AppPaths {
            app_data_dir: std::env::temp_dir(),
        };
        export_deck_json(&conn, &paths, deck_id, Some(path_string(&path)), false).expect("export");

        let import_path = path_string(&path);
        let result = import_deck_json(&mut conn, &import_path);

        assert!(matches!(result, Err(AppError::Validation(_))));
        let rejected: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM content_imports WHERE status = 'rejected'",
                [],
                |row| row.get(0),
            )
            .expect("rejected import record");
        assert_eq!(rejected, 1);
    }

    #[test]
    fn import_deck_json_rejects_unsupported_schema_version() {
        let mut conn = db_with_data();
        let path = temp_path("bad-schema");
        fs::write(
            &path,
            r#"{
              "schema": "lexora.deck.v0",
              "schema_version": "0",
              "exported_at": "2026-01-01T00:00:00Z",
              "pack": {
                "slug": "bad_schema_pack",
                "name": "Bad Schema Pack",
                "description": null,
                "version": "1.0.0",
                "author": "Lexora",
                "cover_image_path": null
              },
              "deck": {
                "slug": "bad_schema_deck",
                "name": "Bad Schema Deck",
                "description": null,
                "cover_image_path": null,
                "difficulty": "beginner",
                "tags": []
              },
              "words": [],
              "relations": []
            }"#,
        )
        .expect("write invalid import file");

        let result = import_deck_json(&mut conn, &path_string(&path));

        assert!(matches!(result, Err(AppError::Validation(_))));
        let rejected: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM content_imports
                 WHERE status = 'rejected'
                   AND pack_slug = 'bad_schema_pack'
                   AND deck_slug = 'bad_schema_deck'",
                [],
                |row| row.get(0),
            )
            .expect("rejected import record");
        assert_eq!(rejected, 1);
    }
}
