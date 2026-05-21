use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;

use crate::errors::AppError;

const DEMO_PACK_JSON: &str = include_str!("../../../../../data/seed/demo_pack.json");

#[derive(Debug, Deserialize)]
struct SeedFile {
    pack: SeedPackMeta,
    decks: Vec<SeedDeck>,
    words: Vec<SeedWord>,
    #[serde(default)]
    relations: Vec<SeedRelation>,
}

#[derive(Debug, Deserialize)]
struct SeedPackMeta {
    slug: String,
    name: String,
    description: Option<String>,
    version: String,
    author: Option<String>,
    source: String,
}

#[derive(Debug, Deserialize)]
struct SeedDeck {
    slug: String,
    name: String,
    description: Option<String>,
    difficulty: Option<String>,
    tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SeedWord {
    headword: String,
    #[serde(rename = "type")]
    entry_type: Option<String>,
    review_status: Option<String>,
    part_of_speech: Option<String>,
    ipa_uk: Option<String>,
    ipa_us: Option<String>,
    frequency_rank: Option<i64>,
    cefr_level: Option<String>,
    deck_slugs: Vec<String>,
    senses: Vec<SeedSense>,
}

#[derive(Debug, Deserialize)]
struct SeedSense {
    sense_index: i64,
    definition_en: String,
    definition_vi: Option<String>,
    register: Option<String>,
    domain: Option<String>,
    examples: Vec<SeedExample>,
}

#[derive(Debug, Deserialize)]
struct SeedExample {
    sentence_en: String,
    sentence_vi: Option<String>,
    audio_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SeedRelation {
    from: String,
    to: String,
    relation_type: String,
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct SeedReport {
    pub packs_loaded: u32,
    pub decks_loaded: u32,
    pub words_loaded: u32,
    pub skipped: bool,
}

pub fn load_bundled(conn: &mut Connection) -> Result<SeedReport, AppError> {
    let seed: SeedFile = serde_json::from_str(DEMO_PACK_JSON)
        .map_err(|e| AppError::Internal(format!("Failed to parse bundled seed data: {e}")))?;

    let existing_pack: Option<(i64, String)> = conn
        .query_row(
            "SELECT id, version FROM packs WHERE slug = ?1",
            params![seed.pack.slug],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Seed idempotency check failed: {e}")))?;

    if let Some((_, version)) = &existing_pack {
        if version == &seed.pack.version {
            return Ok(SeedReport {
                packs_loaded: 0,
                decks_loaded: 0,
                words_loaded: 0,
                skipped: true,
            });
        }
    }

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to start seed transaction: {e}")))?;

    let report = upsert_seed_data(&tx, &seed, existing_pack.map(|(id, _)| id))?;

    tx.commit()
        .map_err(|e| AppError::Internal(format!("Failed to commit seed transaction: {e}")))?;

    Ok(report)
}

fn upsert_seed_data(
    conn: &Connection,
    seed: &SeedFile,
    existing_pack_id: Option<i64>,
) -> Result<SeedReport, AppError> {
    let pack_id = upsert_pack(conn, &seed.pack, existing_pack_id)?;
    let deck_id_by_slug = upsert_decks(conn, pack_id, &seed.decks)?;

    for deck_id in deck_id_by_slug.values() {
        conn.execute(
            "DELETE FROM deck_words WHERE deck_id = ?1",
            params![deck_id],
        )
        .map_err(|e| AppError::Internal(format!("Failed to refresh deck words: {e}")))?;
    }

    let word_id_by_headword = upsert_words(conn, pack_id, &deck_id_by_slug, &seed.words)?;
    upsert_relations(conn, &word_id_by_headword, &seed.relations)?;
    refresh_deck_counts(conn, pack_id)?;
    update_seed_metadata(conn, &seed.pack.version)?;

    Ok(SeedReport {
        packs_loaded: if existing_pack_id.is_some() { 0 } else { 1 },
        decks_loaded: seed.decks.len() as u32,
        words_loaded: seed.words.len() as u32,
        skipped: false,
    })
}

fn upsert_pack(
    conn: &Connection,
    pack: &SeedPackMeta,
    existing_pack_id: Option<i64>,
) -> Result<i64, AppError> {
    if let Some(pack_id) = existing_pack_id {
        conn.execute(
            "UPDATE packs
             SET name = ?2,
                 description = ?3,
                 version = ?4,
                 author = ?5,
                 source = ?6,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![
                pack_id,
                pack.name,
                pack.description,
                pack.version,
                pack.author,
                pack.source,
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to update seed pack: {e}")))?;
        return Ok(pack_id);
    }

    conn.execute(
        "INSERT INTO packs (slug, name, description, version, author, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            pack.slug,
            pack.name,
            pack.description,
            pack.version,
            pack.author,
            pack.source,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to insert seed pack: {e}")))?;

    Ok(conn.last_insert_rowid())
}

fn upsert_decks(
    conn: &Connection,
    pack_id: i64,
    decks: &[SeedDeck],
) -> Result<HashMap<String, i64>, AppError> {
    let mut deck_id_by_slug = HashMap::<String, i64>::new();

    for deck in decks {
        let tags_json = serde_json::to_string(&deck.tags)
            .map_err(|e| AppError::Internal(format!("Failed to serialise deck tags: {e}")))?;

        let existing_deck_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM decks WHERE slug = ?1",
                params![deck.slug],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| {
                AppError::Internal(format!("Failed to query deck '{}': {e}", deck.slug))
            })?;

        let deck_id = match existing_deck_id {
            Some(deck_id) => {
                conn.execute(
                    "UPDATE decks
                     SET pack_id = ?2,
                         name = ?3,
                         description = ?4,
                         difficulty = ?5,
                         tags = ?6,
                         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                     WHERE id = ?1",
                    params![
                        deck_id,
                        pack_id,
                        deck.name,
                        deck.description,
                        deck.difficulty,
                        tags_json,
                    ],
                )
                .map_err(|e| {
                    AppError::Internal(format!("Failed to update deck '{}': {e}", deck.slug))
                })?;
                deck_id
            }
            None => {
                conn.execute(
                    "INSERT INTO decks (pack_id, slug, name, description, difficulty, tags, word_count)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
                    params![
                        pack_id,
                        deck.slug,
                        deck.name,
                        deck.description,
                        deck.difficulty,
                        tags_json,
                    ],
                )
                .map_err(|e| {
                    AppError::Internal(format!("Failed to insert deck '{}': {e}", deck.slug))
                })?;
                conn.last_insert_rowid()
            }
        };

        deck_id_by_slug.insert(deck.slug.clone(), deck_id);
    }

    Ok(deck_id_by_slug)
}

fn upsert_words(
    conn: &Connection,
    pack_id: i64,
    deck_id_by_slug: &HashMap<String, i64>,
    words: &[SeedWord],
) -> Result<HashMap<String, i64>, AppError> {
    let mut word_id_by_headword = HashMap::<String, i64>::new();
    let mut deck_positions = HashMap::<i64, i64>::new();

    for word in words {
        let entry_type = word.entry_type.as_deref().unwrap_or("word");
        let review_status = word.review_status.as_deref().unwrap_or("verified");
        let word_id = upsert_word(conn, pack_id, word, entry_type, review_status)?;

        word_id_by_headword.insert(word.headword.clone(), word_id);
        replace_senses(conn, word_id, word)?;
        link_word_to_decks(conn, word_id, word, deck_id_by_slug, &mut deck_positions)?;
    }

    Ok(word_id_by_headword)
}

fn upsert_word(
    conn: &Connection,
    pack_id: i64,
    word: &SeedWord,
    entry_type: &str,
    review_status: &str,
) -> Result<i64, AppError> {
    let existing_word_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM words WHERE pack_id = ?1 AND headword = ?2 ORDER BY id LIMIT 1",
            params![pack_id, word.headword],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| {
            AppError::Internal(format!("Failed to query word '{}': {e}", word.headword))
        })?;

    if let Some(word_id) = existing_word_id {
        conn.execute(
            "UPDATE words
             SET part_of_speech = ?2,
                 ipa_uk = ?3,
                 ipa_us = ?4,
                 frequency_rank = ?5,
                 cefr_level = ?6,
                 type = ?7,
                 review_status = ?8,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![
                word_id,
                word.part_of_speech,
                word.ipa_uk,
                word.ipa_us,
                word.frequency_rank,
                word.cefr_level,
                entry_type,
                review_status,
            ],
        )
        .map_err(|e| {
            AppError::Internal(format!("Failed to update word '{}': {e}", word.headword))
        })?;
        return Ok(word_id);
    }

    conn.execute(
        "INSERT INTO words
            (pack_id, headword, part_of_speech, ipa_uk, ipa_us,
             frequency_rank, cefr_level, type, review_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            pack_id,
            word.headword,
            word.part_of_speech,
            word.ipa_uk,
            word.ipa_us,
            word.frequency_rank,
            word.cefr_level,
            entry_type,
            review_status,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to insert word '{}': {e}", word.headword)))?;

    Ok(conn.last_insert_rowid())
}

fn replace_senses(conn: &Connection, word_id: i64, word: &SeedWord) -> Result<(), AppError> {
    conn.execute("DELETE FROM senses WHERE word_id = ?1", params![word_id])
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to refresh senses for '{}': {e}",
                word.headword
            ))
        })?;

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
                "Failed to insert sense for '{}': {e}",
                word.headword
            ))
        })?;

        let sense_id = conn.last_insert_rowid();

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
                    "Failed to insert example for '{}': {e}",
                    word.headword
                ))
            })?;
        }
    }

    Ok(())
}

fn link_word_to_decks(
    conn: &Connection,
    word_id: i64,
    word: &SeedWord,
    deck_id_by_slug: &HashMap<String, i64>,
    deck_positions: &mut HashMap<i64, i64>,
) -> Result<(), AppError> {
    for deck_slug in &word.deck_slugs {
        if let Some(&deck_id) = deck_id_by_slug.get(deck_slug) {
            let position = deck_positions.entry(deck_id).or_insert(0);
            conn.execute(
                "INSERT OR IGNORE INTO deck_words (deck_id, word_id, position)
                 VALUES (?1, ?2, ?3)",
                params![deck_id, word_id, *position],
            )
            .map_err(|e| {
                AppError::Internal(format!(
                    "Failed to link '{}' to deck '{}': {e}",
                    word.headword, deck_slug
                ))
            })?;
            *position += 1;
        }
    }
    Ok(())
}

fn upsert_relations(
    conn: &Connection,
    word_id_by_headword: &HashMap<String, i64>,
    relations: &[SeedRelation],
) -> Result<(), AppError> {
    for relation in relations {
        let Some(&from_word_id) = word_id_by_headword.get(&relation.from) else {
            continue;
        };
        let Some(&to_word_id) = word_id_by_headword.get(&relation.to) else {
            continue;
        };

        let exists = conn
            .query_row(
                "SELECT COUNT(*) FROM word_relations
                 WHERE from_word_id = ?1 AND to_word_id = ?2 AND relation_type = ?3",
                params![from_word_id, to_word_id, relation.relation_type],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .map_err(|e| {
                AppError::Internal(format!(
                    "Failed to query relation '{} -> {}': {e}",
                    relation.from, relation.to
                ))
            })?;

        if exists {
            continue;
        }

        conn.execute(
            "INSERT INTO word_relations (from_word_id, to_word_id, relation_type)
             VALUES (?1, ?2, ?3)",
            params![from_word_id, to_word_id, relation.relation_type],
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to insert relation '{} -> {}': {e}",
                relation.from, relation.to
            ))
        })?;
    }

    Ok(())
}

fn refresh_deck_counts(conn: &Connection, pack_id: i64) -> Result<(), AppError> {
    conn.execute(
        "UPDATE decks
         SET word_count = (
             SELECT COUNT(*) FROM deck_words WHERE deck_words.deck_id = decks.id
         )
         WHERE pack_id = ?1",
        params![pack_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to refresh deck word_count: {e}")))?;
    Ok(())
}

fn update_seed_metadata(conn: &Connection, version: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO app_metadata (key, value, updated_at)
         VALUES ('bundled_seed_version', ?1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at",
        params![version],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update seed metadata: {e}")))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    const EXPECTED_DECKS: i64 = 9;
    const EXPECTED_WORDS: i64 = 72;
    const EXPECTED_RELATIONS: i64 = 8;

    fn db_with_schema() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        conn
    }

    #[test]
    fn load_bundled_demo_json_parses_without_error() {
        let seed: SeedFile =
            serde_json::from_str(DEMO_PACK_JSON).expect("demo_pack.json should be valid JSON");
        assert!(!seed.pack.slug.is_empty());
        assert_eq!(seed.pack.version, "2.0.0");
        assert_eq!(seed.decks.len() as i64, EXPECTED_DECKS);
        assert_eq!(seed.words.len() as i64, EXPECTED_WORDS);
        assert_eq!(seed.relations.len() as i64, EXPECTED_RELATIONS);
    }

    #[test]
    fn load_bundled_inserts_expected_counts() {
        let mut conn = db_with_schema();
        let report = load_bundled(&mut conn).expect("seed should succeed");

        assert!(!report.skipped);
        assert_eq!(report.packs_loaded, 1);
        assert_eq!(report.decks_loaded, EXPECTED_DECKS as u32);
        assert_eq!(report.words_loaded, EXPECTED_WORDS as u32);

        let packs: i64 = conn
            .query_row("SELECT COUNT(*) FROM packs", [], |r| r.get(0))
            .unwrap();
        assert_eq!(packs, 1);

        let decks: i64 = conn
            .query_row("SELECT COUNT(*) FROM decks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(decks, EXPECTED_DECKS);

        let words: i64 = conn
            .query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))
            .unwrap();
        assert_eq!(words, EXPECTED_WORDS);
    }

    #[test]
    fn load_bundled_is_idempotent() {
        let mut conn = db_with_schema();

        let first = load_bundled(&mut conn).expect("first seed");
        assert!(!first.skipped);

        let second = load_bundled(&mut conn).expect("second seed should be a no-op");
        assert!(second.skipped, "second call should be skipped");

        let words: i64 = conn
            .query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            words, EXPECTED_WORDS,
            "word count must not double after second seed"
        );
    }

    #[test]
    fn load_bundled_links_words_to_decks() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let linked: i64 = conn
            .query_row("SELECT COUNT(*) FROM deck_words", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            linked, EXPECTED_WORDS,
            "every word should be linked to exactly one deck"
        );
    }

    #[test]
    fn load_bundled_word_count_is_denormalised_on_decks() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let total: i64 = conn
            .query_row("SELECT SUM(word_count) FROM decks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            total, EXPECTED_WORDS,
            "sum of deck word_counts should equal total words"
        );

        let zeros: i64 = conn
            .query_row("SELECT COUNT(*) FROM decks WHERE word_count = 0", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(zeros, 0, "no deck should have word_count = 0 after seeding");
    }

    #[test]
    fn load_bundled_senses_examples_and_relations_inserted() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let senses: i64 = conn
            .query_row("SELECT COUNT(*) FROM senses", [], |r| r.get(0))
            .unwrap();
        assert!(
            senses >= EXPECTED_WORDS,
            "each word should have at least one sense"
        );

        let examples: i64 = conn
            .query_row("SELECT COUNT(*) FROM examples", [], |r| r.get(0))
            .unwrap();
        assert!(
            examples >= EXPECTED_WORDS,
            "each word should have at least one example"
        );

        let relations: i64 = conn
            .query_row("SELECT COUNT(*) FROM word_relations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(relations, EXPECTED_RELATIONS);
    }

    #[test]
    fn load_bundled_updates_older_pack_version_in_place() {
        let mut conn = db_with_schema();
        conn.execute(
            "INSERT INTO packs (slug, name, version, source)
             VALUES ('english-essentials-demo', 'Old Demo', '1.0.0', 'bundled')",
            [],
        )
        .unwrap();

        let report = load_bundled(&mut conn).expect("seed should update old pack");
        assert!(!report.skipped);
        assert_eq!(report.packs_loaded, 0);

        let (name, version): (String, String) = conn
            .query_row(
                "SELECT name, version FROM packs WHERE slug = 'english-essentials-demo'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(name, "English-Vietnamese Core");
        assert_eq!(version, "2.0.0");
    }

    #[test]
    fn load_bundled_pack_has_correct_slug_source_and_metadata() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let (slug, source, version): (String, String, String) = conn
            .query_row("SELECT slug, source, version FROM packs LIMIT 1", [], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?))
            })
            .unwrap();
        assert_eq!(slug, "english-essentials-demo");
        assert_eq!(source, "bundled");
        assert_eq!(version, "2.0.0");

        let seed_version: String = conn
            .query_row(
                "SELECT value FROM app_metadata WHERE key = 'bundled_seed_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(seed_version, "2.0.0");
    }
}
