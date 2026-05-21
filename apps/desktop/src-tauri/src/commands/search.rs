use std::collections::{HashMap, HashSet};
use std::time::Instant;

use rusqlite::{params, Connection};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::search::{
    SearchFiltersDto, SearchResponseDto, SearchResultDto, SearchResultGroupDto,
};
use crate::errors::AppError;

const DEFAULT_LIMIT: i64 = 24;
const MAX_LIMIT: i64 = 80;
const FUZZY_CANDIDATE_LIMIT: i64 = 300;

#[derive(Debug, Clone)]
struct SearchCandidate {
    result_type: String,
    id: i64,
    title: String,
    subtitle: Option<String>,
    snippet: Option<String>,
    deck_title: Option<String>,
    pack_title: Option<String>,
    score: f64,
}

fn normalize_text(text: &str) -> String {
    text.trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_alphanumeric() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn fts_query(query: &str) -> Option<String> {
    let terms = normalize_text(query)
        .split_whitespace()
        .filter(|term| !term.is_empty())
        .take(6)
        .map(|term| format!("{term}*"))
        .collect::<Vec<_>>();

    if terms.is_empty() {
        None
    } else {
        Some(terms.join(" AND "))
    }
}

fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars = a.chars().collect::<Vec<_>>();
    let b_chars = b.chars().collect::<Vec<_>>();
    let n = b_chars.len();
    if a_chars.is_empty() {
        return n;
    }
    if b_chars.is_empty() {
        return a_chars.len();
    }

    let mut prev = (0..=n).collect::<Vec<_>>();
    let mut curr = vec![0; n + 1];

    for (i, ca) in a_chars.iter().enumerate() {
        curr[0] = i + 1;
        for (j, cb) in b_chars.iter().enumerate() {
            curr[j + 1] = if ca == cb {
                prev[j]
            } else {
                1 + prev[j].min(prev[j + 1]).min(curr[j])
            };
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[n]
}

fn fuzzy_score(query: &str, title: &str) -> f64 {
    let q = normalize_text(query);
    let t = normalize_text(title);
    if q.is_empty() || t.is_empty() {
        return 0.0;
    }
    if t == q {
        return 100.0;
    }
    if t.starts_with(&q) {
        return 92.0 - (t.len().saturating_sub(q.len()) as f64 * 0.2);
    }
    if t.contains(&q) {
        return 82.0 - (t.len().saturating_sub(q.len()) as f64 * 0.1);
    }

    let distance = levenshtein(&q, &t) as f64;
    let max_len = q.chars().count().max(t.chars().count()) as f64;
    (72.0 * (1.0 - distance / max_len)).max(0.0)
}

fn fuzzy_title_prefix(query: &str) -> Option<String> {
    let normalized = normalize_text(query);
    let first_term = normalized.split_whitespace().next()?;
    let take = if first_term.chars().count() >= 4 {
        2
    } else {
        1
    };
    let prefix = first_term.chars().take(take).collect::<String>();
    if prefix.is_empty() {
        None
    } else {
        Some(format!("{prefix}%"))
    }
}

fn should_run_fuzzy(query: &str, fts_count: usize, limit: i64) -> bool {
    normalize_text(query)
        .chars()
        .filter(|ch| !ch.is_whitespace())
        .count()
        >= 3
        && fts_count < limit as usize
}

fn filter_allows(filters: &SearchFiltersDto, result_type: &str) -> bool {
    filters
        .result_types
        .as_ref()
        .map(|types| types.iter().any(|value| value == result_type))
        .unwrap_or(true)
}

fn result_route(result_type: &str, id: i64) -> String {
    match result_type {
        "deck" => format!("/library/{id}"),
        _ => format!("/word/{id}"),
    }
}

fn query_fts(
    conn: &Connection,
    query: &str,
    filters: &SearchFiltersDto,
    limit: i64,
) -> Result<Vec<SearchCandidate>, AppError> {
    let Some(match_query) = fts_query(query) else {
        return Ok(Vec::new());
    };

    let mut stmt = conn
        .prepare(
            "SELECT s.result_type, CAST(s.result_id AS INTEGER), s.title,
                    CASE
                        WHEN s.result_type = 'word' THEN (
                            SELECT COALESCE(w.part_of_speech, '') || CASE
                                WHEN w.cefr_level IS NOT NULL THEN ' · ' || w.cefr_level
                                ELSE ''
                            END
                            FROM words w WHERE w.id = CAST(s.result_id AS INTEGER)
                        )
                        WHEN s.result_type = 'deck' THEN (
                            SELECT CAST(d.word_count AS TEXT) || ' words'
                            FROM decks d WHERE d.id = CAST(s.result_id AS INTEGER)
                        )
                    END AS subtitle,
                    trim(COALESCE(NULLIF(s.vietnamese_text, ''), NULLIF(s.english_text, ''), s.deck_text)) AS snippet,
                    CASE
                        WHEN s.result_type = 'word' THEN (
                            SELECT d.name
                            FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
                            WHERE dw.word_id = CAST(s.result_id AS INTEGER)
                            ORDER BY d.name
                            LIMIT 1
                        )
                        ELSE s.title
                    END AS deck_title,
                    s.pack_text,
                    bm25(lexora_search_fts, 4.0, 3.5, 2.0, 2.0, 2.5, 1.5, 1.5) AS rank
             FROM lexora_search_fts s
             WHERE lexora_search_fts MATCH ?1
               AND (?2 IS NULL
                    OR (s.result_type = 'deck' AND CAST(s.result_id AS INTEGER) = ?2)
                    OR (s.result_type = 'word' AND EXISTS (
                        SELECT 1 FROM deck_words dw
                        WHERE dw.word_id = CAST(s.result_id AS INTEGER)
                          AND dw.deck_id = ?2
                    )))
             ORDER BY rank
             LIMIT ?3",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare search query: {e}")))?;

    let rows = stmt
        .query_map(params![match_query, filters.deck_id, limit * 3], |row| {
            let result_type: String = row.get(0)?;
            let rank: f64 = row.get(7)?;
            Ok(SearchCandidate {
                result_type,
                id: row.get(1)?,
                title: row.get(2)?,
                subtitle: row.get(3)?,
                snippet: row.get(4)?,
                deck_title: row.get(5)?,
                pack_title: row.get(6)?,
                score: 70.0 + (-rank * 10.0).min(25.0),
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to run search query: {e}")))?;

    let mut candidates = Vec::new();
    for row in rows {
        let candidate =
            row.map_err(|e| AppError::Internal(format!("Failed to read search row: {e}")))?;
        if filter_allows(filters, &candidate.result_type) {
            candidates.push(candidate);
        }
    }

    Ok(candidates)
}

fn query_fuzzy_candidates(
    conn: &Connection,
    query: &str,
    filters: &SearchFiltersDto,
) -> Result<Vec<SearchCandidate>, AppError> {
    let Some(title_prefix) = fuzzy_title_prefix(query) else {
        return Ok(Vec::new());
    };
    let mut candidates = Vec::new();

    if filter_allows(filters, "word") {
        let mut stmt = conn
            .prepare(
                "SELECT w.id, w.headword, w.part_of_speech, w.cefr_level,
                        (
                            SELECT COALESCE(s.definition_vi, s.definition_en)
                            FROM senses s
                            WHERE s.word_id = w.id
                            ORDER BY s.sense_index, s.id
                            LIMIT 1
                        ) AS snippet,
                        (
                            SELECT d.name
                            FROM deck_words dw JOIN decks d ON d.id = dw.deck_id
                            WHERE dw.word_id = w.id
                            ORDER BY d.name
                            LIMIT 1
                        ) AS deck_title,
                        COALESCE(p.name, '') AS pack_title
                 FROM words w
                 LEFT JOIN packs p ON p.id = w.pack_id
                 WHERE (?1 IS NULL OR EXISTS (
                    SELECT 1 FROM deck_words dw
                    WHERE dw.word_id = w.id AND dw.deck_id = ?1
                 ))
                   AND w.headword COLLATE NOCASE LIKE ?2
                 ORDER BY w.frequency_rank IS NULL, w.frequency_rank, w.headword
                 LIMIT ?3",
            )
            .map_err(|e| AppError::Internal(format!("Failed to prepare fuzzy word query: {e}")))?;

        let rows = stmt
            .query_map(
                params![filters.deck_id, &title_prefix, FUZZY_CANDIDATE_LIMIT],
                |row| {
                    let title: String = row.get(1)?;
                    let pos: Option<String> = row.get(2)?;
                    let cefr: Option<String> = row.get(3)?;
                    Ok(SearchCandidate {
                        result_type: "word".to_string(),
                        id: row.get(0)?,
                        title: title.clone(),
                        subtitle: Some(
                            [pos, cefr]
                                .into_iter()
                                .flatten()
                                .collect::<Vec<_>>()
                                .join(" · "),
                        )
                        .filter(|value| !value.is_empty()),
                        snippet: row.get(4)?,
                        deck_title: row.get(5)?,
                        pack_title: row.get(6)?,
                        score: fuzzy_score(query, &title),
                    })
                },
            )
            .map_err(|e| AppError::Internal(format!("Failed to query fuzzy words: {e}")))?;

        for row in rows {
            let candidate =
                row.map_err(|e| AppError::Internal(format!("Failed to read fuzzy word: {e}")))?;
            if candidate.score >= 52.0 {
                candidates.push(candidate);
            }
        }
    }

    if filter_allows(filters, "deck") {
        let mut stmt = conn
            .prepare(
                "SELECT d.id, d.name, d.description, d.word_count, COALESCE(p.name, '')
                 FROM decks d
                 LEFT JOIN packs p ON p.id = d.pack_id
                 WHERE (?1 IS NULL OR d.id = ?1)
                   AND (d.name COLLATE NOCASE LIKE ?2 OR d.slug COLLATE NOCASE LIKE ?2)
                 ORDER BY d.name
                 LIMIT ?3",
            )
            .map_err(|e| AppError::Internal(format!("Failed to prepare fuzzy deck query: {e}")))?;

        let rows = stmt
            .query_map(
                params![filters.deck_id, &title_prefix, FUZZY_CANDIDATE_LIMIT],
                |row| {
                    let title: String = row.get(1)?;
                    let word_count: i64 = row.get(3)?;
                    Ok(SearchCandidate {
                        result_type: "deck".to_string(),
                        id: row.get(0)?,
                        title: title.clone(),
                        subtitle: Some(format!("{word_count} words")),
                        snippet: row.get(2)?,
                        deck_title: Some(title.clone()),
                        pack_title: row.get(4)?,
                        score: fuzzy_score(query, &title),
                    })
                },
            )
            .map_err(|e| AppError::Internal(format!("Failed to query fuzzy decks: {e}")))?;

        for row in rows {
            let candidate =
                row.map_err(|e| AppError::Internal(format!("Failed to read fuzzy deck: {e}")))?;
            if candidate.score >= 52.0 {
                candidates.push(candidate);
            }
        }
    }

    Ok(candidates)
}

fn merge_ranked(mut candidates: Vec<SearchCandidate>, limit: i64) -> Vec<SearchResultDto> {
    candidates.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.result_type.cmp(&b.result_type))
            .then_with(|| a.title.cmp(&b.title))
    });

    let mut seen = HashSet::new();
    candidates
        .into_iter()
        .filter(|candidate| seen.insert((candidate.result_type.clone(), candidate.id)))
        .take(limit as usize)
        .map(|candidate| SearchResultDto {
            route: result_route(&candidate.result_type, candidate.id),
            result_type: candidate.result_type,
            id: candidate.id,
            title: candidate.title,
            subtitle: candidate.subtitle,
            snippet: candidate.snippet,
            deck_title: candidate.deck_title,
            pack_title: candidate.pack_title,
            score: (candidate.score * 10.0).round() / 10.0,
        })
        .collect()
}

fn group_results(results: Vec<SearchResultDto>) -> Vec<SearchResultGroupDto> {
    let mut by_type = HashMap::<String, Vec<SearchResultDto>>::new();
    for result in results {
        by_type
            .entry(result.result_type.clone())
            .or_default()
            .push(result);
    }

    ["word", "deck"]
        .into_iter()
        .filter_map(|result_type| {
            by_type
                .remove(result_type)
                .map(|results| SearchResultGroupDto {
                    result_type: result_type.to_string(),
                    label: match result_type {
                        "deck" => "Decks".to_string(),
                        _ => "Words".to_string(),
                    },
                    results,
                })
        })
        .collect()
}

pub(crate) fn search_with_conn(
    conn: &Connection,
    query: String,
    filters: Option<SearchFiltersDto>,
) -> Result<SearchResponseDto, AppError> {
    let started = Instant::now();
    let filters = filters.unwrap_or(SearchFiltersDto {
        result_types: None,
        deck_id: None,
        limit: None,
    });
    let limit = filters.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    let trimmed = query.trim().to_string();

    if trimmed.is_empty() {
        return Ok(SearchResponseDto {
            query: trimmed,
            groups: Vec::new(),
            total: 0,
            elapsed_ms: started.elapsed().as_millis(),
        });
    }

    let mut candidates = query_fts(conn, &trimmed, &filters, limit)?;
    if should_run_fuzzy(&trimmed, candidates.len(), limit) {
        candidates.extend(query_fuzzy_candidates(conn, &trimmed, &filters)?);
    }

    let results = merge_ranked(candidates, limit);
    let total = results.len();
    Ok(SearchResponseDto {
        query: trimmed,
        groups: group_results(results),
        total,
        elapsed_ms: started.elapsed().as_millis(),
    })
}

#[tauri::command]
pub fn search(
    query: String,
    filters: Option<SearchFiltersDto>,
    db: State<'_, DbConn>,
) -> Result<SearchResponseDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    auth::require_session(&conn)?;
    search_with_conn(&conn, query, filters)
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

    fn db_with_large_catalog(count: usize) -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");

        let tx = conn.transaction().expect("large fixture transaction");
        tx.execute(
            "INSERT INTO packs (slug, name, version, source)
             VALUES ('large-fixture', 'Large Fixture', '0.0.0', 'imported')",
            [],
        )
        .expect("fixture pack");
        let pack_id = tx.last_insert_rowid();

        for i in 0..count {
            tx.execute(
                "INSERT INTO words (
                    pack_id, headword, part_of_speech, cefr_level, frequency_rank
                 )
                 VALUES (?1, ?2, 'noun', 'B1', ?3)",
                params![pack_id, format!("largeword{i:05}"), i as i64 + 1],
            )
            .expect("fixture word");
        }

        tx.commit().expect("commit large fixture");
        conn
    }

    #[test]
    fn search_finds_headwords_with_fts() {
        let conn = db_with_data();
        let response = search_with_conn(&conn, "run".to_string(), None).expect("search");

        let words = response
            .groups
            .iter()
            .find(|group| group.result_type == "word")
            .expect("word group");
        assert_eq!(words.results[0].title, "run");
    }

    #[test]
    fn search_finds_vietnamese_meanings() {
        let conn = db_with_data();
        let response = search_with_conn(&conn, "chao".to_string(), None).expect("search");

        assert!(response
            .groups
            .iter()
            .flat_map(|group| &group.results)
            .any(|result| result.title == "hello"));
    }

    #[test]
    fn search_finds_decks_by_tags() {
        let conn = db_with_data();
        // Both bundled packs surface decks containing "home"-related tags,
        // so the limit is raised to keep the assertion target reachable.
        let response = search_with_conn(
            &conn,
            "home".to_string(),
            Some(SearchFiltersDto {
                result_types: Some(vec!["deck".to_string()]),
                deck_id: None,
                limit: Some(25),
            }),
        )
        .expect("search");

        let decks = response
            .groups
            .iter()
            .find(|group| group.result_type == "deck")
            .expect("deck group");
        assert!(decks
            .results
            .iter()
            .any(|result| result.title == "Around the House"));
    }

    #[test]
    fn fuzzy_search_recovers_typo() {
        let conn = db_with_data();
        let response = search_with_conn(&conn, "runn".to_string(), None).expect("search");

        assert!(response
            .groups
            .iter()
            .flat_map(|group| &group.results)
            .any(|result| result.title == "run"));
    }

    #[test]
    fn search_can_filter_to_deck_scope() {
        let conn = db_with_data();
        let deck_id: i64 = conn
            .query_row(
                "SELECT id FROM decks WHERE slug = 'around-the-house'",
                [],
                |row| row.get(0),
            )
            .expect("deck");

        let response = search_with_conn(
            &conn,
            "book".to_string(),
            Some(SearchFiltersDto {
                result_types: Some(vec!["word".to_string()]),
                deck_id: Some(deck_id),
                limit: Some(10),
            }),
        )
        .expect("search");

        assert!(response
            .groups
            .iter()
            .flat_map(|group| &group.results)
            .any(|result| result.title == "book"));
    }

    #[test]
    fn search_response_is_bounded_for_large_catalog() {
        let conn = db_with_large_catalog(1_000);
        let response = search_with_conn(
            &conn,
            "largeword".to_string(),
            Some(SearchFiltersDto {
                result_types: Some(vec!["word".to_string()]),
                deck_id: None,
                limit: Some(12),
            }),
        )
        .expect("search");

        assert!(response.total <= 12);
        assert!(response
            .groups
            .iter()
            .flat_map(|group| &group.results)
            .all(|result| result.result_type == "word"));
    }

    #[test]
    #[ignore = "manual large fixture benchmark for Prompt 59"]
    fn large_catalog_search_benchmark() {
        let conn = db_with_large_catalog(50_000);
        let started = Instant::now();
        let response = search_with_conn(
            &conn,
            "largeword49999".to_string(),
            Some(SearchFiltersDto {
                result_types: Some(vec!["word".to_string()]),
                deck_id: None,
                limit: Some(20),
            }),
        )
        .expect("large catalog search");
        let elapsed = started.elapsed();

        println!(
            "large_catalog_search_benchmark: {} results in {} ms",
            response.total,
            elapsed.as_millis()
        );
        assert!(response.total <= 20);
        assert!(response
            .groups
            .iter()
            .flat_map(|group| &group.results)
            .any(|result| result.title == "largeword49999"));
    }
}
