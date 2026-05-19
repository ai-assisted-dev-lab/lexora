use rusqlite::{params, Connection};
use serde::Deserialize;

use crate::errors::AppError;

// Embedded at compile time; zero runtime I/O for the bundled demo pack.
// For future large packs (20k–50k items) the caller can load JSON from a
// Tauri resource path and pass it to `import_pack` directly.
const DEMO_PACK_JSON: &str =
    include_str!("../../../../../data/seed/demo_pack.json");

// ── Deserialisation types ─────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct SeedFile {
    pack: SeedPackMeta,
    decks: Vec<SeedDeck>,
    words: Vec<SeedWord>,
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
    examples: Vec<SeedExample>,
}

#[derive(Debug, Deserialize)]
struct SeedExample {
    sentence_en: String,
    sentence_vi: Option<String>,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Summary returned after a seed run.
#[derive(Debug)]
#[allow(dead_code)]
pub struct SeedReport {
    pub packs_loaded: u32,
    pub decks_loaded: u32,
    pub words_loaded: u32,
    /// `true` when the seed pack was already present and no inserts were made.
    pub skipped: bool,
}

/// Loads the bundled demo pack into `conn`.
///
/// Idempotent: if the pack's slug already exists in the `packs` table the
/// function returns immediately with `skipped = true`.  Safe to call on every
/// app launch; the check is a single indexed equality scan.
pub fn load_bundled(conn: &mut Connection) -> Result<SeedReport, AppError> {
    let seed: SeedFile = serde_json::from_str(DEMO_PACK_JSON)
        .map_err(|e| AppError::Internal(format!("Failed to parse bundled seed data: {e}")))?;

    // Fast idempotency check before starting a transaction.
    let already_present: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM packs WHERE slug = ?1",
            params![seed.pack.slug],
            |row| row.get::<_, i64>(0),
        )
        .map(|n| n > 0)
        .map_err(|e| AppError::Internal(format!("Seed idempotency check failed: {e}")))?;

    if already_present {
        return Ok(SeedReport {
            packs_loaded: 0,
            decks_loaded: 0,
            words_loaded: 0,
            skipped: true,
        });
    }

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to start seed transaction: {e}")))?;

    let report = insert_seed_data(&tx, &seed)?;

    tx.commit()
        .map_err(|e| AppError::Internal(format!("Failed to commit seed transaction: {e}")))?;

    Ok(report)
}

// ── Private helpers ───────────────────────────────────────────────────────────

fn insert_seed_data(
    conn: &Connection,
    seed: &SeedFile,
) -> Result<SeedReport, AppError> {
    // ── Pack ─────────────────────────────────────────────────────────────────
    conn.execute(
        "INSERT INTO packs (slug, name, description, version, author, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            seed.pack.slug,
            seed.pack.name,
            seed.pack.description,
            seed.pack.version,
            seed.pack.author,
            seed.pack.source,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to insert seed pack: {e}")))?;

    let pack_id = conn.last_insert_rowid();

    // ── Decks ─────────────────────────────────────────────────────────────────
    let mut deck_id_by_slug = std::collections::HashMap::<String, i64>::new();

    for deck in &seed.decks {
        let tags_json = serde_json::to_string(&deck.tags)
            .map_err(|e| AppError::Internal(format!("Failed to serialise deck tags: {e}")))?;

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
        .map_err(|e| AppError::Internal(format!("Failed to insert deck '{}': {e}", deck.slug)))?;

        deck_id_by_slug.insert(deck.slug.clone(), conn.last_insert_rowid());
    }

    // ── Words, senses, examples, and deck links ───────────────────────────────
    let mut words_loaded: u32 = 0;

    for (position, word) in seed.words.iter().enumerate() {
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
            AppError::Internal(format!("Failed to insert word '{}': {e}", word.headword))
        })?;

        let word_id = conn.last_insert_rowid();
        words_loaded += 1;

        for sense in &word.senses {
            conn.execute(
                "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
                 VALUES (?1, ?2, ?3, ?4)",
                params![word_id, sense.sense_index, sense.definition_en, sense.definition_vi],
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
                    "INSERT INTO examples (sense_id, sentence_en, sentence_vi)
                     VALUES (?1, ?2, ?3)",
                    params![sense_id, example.sentence_en, example.sentence_vi],
                )
                .map_err(|e| {
                    AppError::Internal(format!(
                        "Failed to insert example for '{}': {e}",
                        word.headword
                    ))
                })?;
            }
        }

        for deck_slug in &word.deck_slugs {
            if let Some(&deck_id) = deck_id_by_slug.get(deck_slug) {
                conn.execute(
                    "INSERT OR IGNORE INTO deck_words (deck_id, word_id, position)
                     VALUES (?1, ?2, ?3)",
                    params![deck_id, word_id, position as i64],
                )
                .map_err(|e| {
                    AppError::Internal(format!(
                        "Failed to link '{}' to deck '{}': {e}",
                        word.headword, deck_slug
                    ))
                })?;
            }
        }
    }

    // ── Refresh denormalised word_count on decks ───────────────────────────────
    conn.execute_batch(
        "UPDATE decks
         SET word_count = (
             SELECT COUNT(*) FROM deck_words WHERE deck_words.deck_id = decks.id
         )
         WHERE pack_id = (SELECT id FROM packs WHERE source = 'bundled');",
    )
    .map_err(|e| AppError::Internal(format!("Failed to refresh deck word_count: {e}")))?;

    Ok(SeedReport {
        packs_loaded: 1,
        decks_loaded: seed.decks.len() as u32,
        words_loaded,
        skipped: false,
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

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
        assert!(!seed.decks.is_empty());
        assert!(!seed.words.is_empty());
    }

    #[test]
    fn load_bundled_inserts_expected_counts() {
        let mut conn = db_with_schema();
        let report = load_bundled(&mut conn).expect("seed should succeed");

        assert!(!report.skipped);
        assert_eq!(report.packs_loaded, 1);
        assert_eq!(report.decks_loaded, 3);
        assert_eq!(report.words_loaded, 15);

        let packs: i64 = conn
            .query_row("SELECT COUNT(*) FROM packs", [], |r| r.get(0))
            .unwrap();
        assert_eq!(packs, 1);

        let decks: i64 = conn
            .query_row("SELECT COUNT(*) FROM decks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(decks, 3);

        let words: i64 = conn
            .query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))
            .unwrap();
        assert_eq!(words, 15);
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
        assert_eq!(words, 15, "word count must not double after second seed");
    }

    #[test]
    fn load_bundled_links_words_to_decks() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let linked: i64 = conn
            .query_row("SELECT COUNT(*) FROM deck_words", [], |r| r.get(0))
            .unwrap();
        assert_eq!(linked, 15, "every word should be linked to exactly one deck");
    }

    #[test]
    fn load_bundled_word_count_is_denormalised_on_decks() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let total: i64 = conn
            .query_row("SELECT SUM(word_count) FROM decks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(total, 15, "sum of deck word_counts should equal total words");

        let zeros: i64 = conn
            .query_row("SELECT COUNT(*) FROM decks WHERE word_count = 0", [], |r| r.get(0))
            .unwrap();
        assert_eq!(zeros, 0, "no deck should have word_count = 0 after seeding");
    }

    #[test]
    fn load_bundled_senses_and_examples_inserted() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let senses: i64 = conn
            .query_row("SELECT COUNT(*) FROM senses", [], |r| r.get(0))
            .unwrap();
        assert_eq!(senses, 15, "one sense per word");

        let examples: i64 = conn
            .query_row("SELECT COUNT(*) FROM examples", [], |r| r.get(0))
            .unwrap();
        assert_eq!(examples, 15, "one example per sense");
    }

    #[test]
    fn load_bundled_pack_has_correct_slug_and_source() {
        let mut conn = db_with_schema();
        load_bundled(&mut conn).expect("seed");

        let (slug, source): (String, String) = conn
            .query_row(
                "SELECT slug, source FROM packs LIMIT 1",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(slug, "english-essentials-demo");
        assert_eq!(source, "bundled");
    }
}
