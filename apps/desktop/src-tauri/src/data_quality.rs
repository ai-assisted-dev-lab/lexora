use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::dto::admin::{
    AdminListDataQualityIssuesInputDto, AdminRunDataQualityScanInputDto, DataQualityIssueDto,
    DataQualityIssuePageDto, DataQualityNavigationTargetDto, DataQualityQuickCountsDto,
    DataQualityScanResultDto, DataQualityScannedEntityCountsDto, DataQualitySummaryDto,
    DataQualityTopIssueTypeDto,
};
use crate::errors::AppError;
use crate::filesystem::AppPaths;

const DEFAULT_SCAN_LIMIT: usize = 200;
const MAX_SCAN_LIMIT: usize = 500;
const DEFAULT_PAGE_SIZE: i64 = 25;
const MAX_PAGE_SIZE: i64 = 200;

#[derive(Debug, Default)]
struct IssueFilter {
    categories: HashSet<String>,
    severities: HashSet<String>,
    entity_type: Option<String>,
    search: Option<String>,
}

impl IssueFilter {
    fn from_scan(input: &AdminRunDataQualityScanInputDto) -> Self {
        Self {
            categories: normalized_set(input.categories.as_ref()),
            severities: normalized_set(input.severity.as_ref()),
            entity_type: None,
            search: None,
        }
    }

    fn from_list(input: &AdminListDataQualityIssuesInputDto) -> Self {
        Self {
            categories: input
                .category
                .as_ref()
                .map(|v| single_set(v))
                .unwrap_or_default(),
            severities: input
                .severity
                .as_ref()
                .map(|v| single_set(v))
                .unwrap_or_default(),
            entity_type: input
                .entity_type
                .as_ref()
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            search: input
                .search
                .as_ref()
                .map(|v| v.trim().to_lowercase())
                .filter(|v| !v.is_empty()),
        }
    }

    fn matches(&self, issue: &DataQualityIssueDto) -> bool {
        if !self.categories.is_empty() && !self.categories.contains(&issue.category) {
            return false;
        }
        if !self.severities.is_empty() && !self.severities.contains(&issue.severity) {
            return false;
        }
        if let Some(entity_type) = &self.entity_type {
            if entity_type != &issue.entity_type {
                return false;
            }
        }
        if let Some(search) = &self.search {
            let haystack = format!(
                "{} {} {} {} {} {}",
                issue.entity_label.as_deref().unwrap_or_default(),
                issue.entity_id,
                issue.field.as_deref().unwrap_or_default(),
                issue.message,
                issue.recommendation.as_deref().unwrap_or_default(),
                issue.category,
            )
            .to_lowercase();
            if !haystack.contains(search) {
                return false;
            }
        }
        true
    }
}

fn normalized_set(values: Option<&Vec<String>>) -> HashSet<String> {
    values
        .into_iter()
        .flat_map(|v| v.iter())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect()
}

fn single_set(value: &str) -> HashSet<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        HashSet::new()
    } else {
        HashSet::from([trimmed.to_string()])
    }
}

fn clamp_page(value: Option<i64>) -> i64 {
    value.unwrap_or(1).max(1)
}

fn clamp_page_size(value: Option<i64>) -> i64 {
    value.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE)
}

fn current_timestamp(conn: &Connection) -> Result<String, AppError> {
    conn.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to resolve scan timestamp: {e}")))
}

fn scanned_entity_counts(conn: &Connection) -> Result<DataQualityScannedEntityCountsDto, AppError> {
    let vocabulary_items = count_table(conn, "words")?;
    let senses = count_table(conn, "senses")?;
    let pronunciations = count_table(conn, "pronunciations")?;
    let decks = count_table(conn, "decks")?;
    let deck_items = count_table(conn, "deck_words")?;
    let relations = count_table(conn, "word_relations")?;
    let assets = conn
        .query_row(
            "SELECT
                (SELECT COUNT(*) FROM pronunciations WHERE TRIM(COALESCE(audio_path, '')) != '') +
                (SELECT COUNT(*) FROM examples WHERE TRIM(COALESCE(audio_path, '')) != '') +
                (SELECT COUNT(*) FROM decks WHERE TRIM(COALESCE(cover_image_path, '')) != '') +
                (SELECT COUNT(*) FROM packs WHERE TRIM(COALESCE(cover_image_path, '')) != '')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to count validation assets: {e}")))?;

    Ok(DataQualityScannedEntityCountsDto {
        vocabulary_items,
        senses,
        pronunciations,
        decks,
        deck_items,
        relations,
        assets,
    })
}

fn count_table(conn: &Connection, table: &str) -> Result<i64, AppError> {
    let sql = format!("SELECT COUNT(*) FROM {table}");
    conn.query_row(&sql, [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to count {table}: {e}")))
}

fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, AppError> {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| AppError::Internal(format!("Failed to inspect {table}: {e}")))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| AppError::Internal(format!("Failed to inspect {table}: {e}")))?;
    for name in names {
        if name.map_err(|e| AppError::Internal(format!("Failed to read {table} column: {e}")))?
            == column
        {
            return Ok(true);
        }
    }
    Ok(false)
}

fn add_issue(
    issues: &mut Vec<DataQualityIssueDto>,
    filter: &IssueFilter,
    issue: DataQualityIssueDto,
) {
    if filter.matches(&issue) {
        issues.push(issue);
    }
}

fn vocabulary_target(word_id: i64) -> DataQualityNavigationTargetDto {
    DataQualityNavigationTargetDto {
        target_type: "vocabulary_item".to_string(),
        target_id: word_id.to_string(),
        label: "Open item".to_string(),
    }
}

fn deck_target(deck_id: i64) -> DataQualityNavigationTargetDto {
    DataQualityNavigationTargetDto {
        target_type: "deck".to_string(),
        target_id: deck_id.to_string(),
        label: "Open deck".to_string(),
    }
}

#[allow(clippy::too_many_arguments)]
fn issue(
    id: String,
    severity: &str,
    category: &str,
    entity_type: &str,
    entity_id: String,
    entity_label: Option<String>,
    field: Option<&str>,
    message: String,
    recommendation: Option<&str>,
    created_at: &str,
    navigation_target: Option<DataQualityNavigationTargetDto>,
) -> DataQualityIssueDto {
    DataQualityIssueDto {
        id,
        severity: severity.to_string(),
        category: category.to_string(),
        entity_type: entity_type.to_string(),
        entity_id,
        entity_label,
        field: field.map(|v| v.to_string()),
        message,
        recommendation: recommendation.map(|v| v.to_string()),
        can_auto_fix: false,
        created_at: Some(created_at.to_string()),
        navigation_target,
    }
}

pub fn run_data_quality_scan(
    conn: &Connection,
    paths: &AppPaths,
    input: AdminRunDataQualityScanInputDto,
) -> Result<DataQualityScanResultDto, AppError> {
    let scanned_at = current_timestamp(conn)?;
    let filter = IssueFilter::from_scan(&input);
    let all_issues = collect_issues(conn, paths, &filter, &scanned_at)?;
    let counts = scanned_entity_counts(conn)?;
    let summary = summarize_issues(&all_issues, counts, Some(scanned_at.clone()));
    let limit = input
        .limit
        .unwrap_or(DEFAULT_SCAN_LIMIT as i64)
        .clamp(1, MAX_SCAN_LIMIT as i64) as usize;
    let issues: Vec<DataQualityIssueDto> = all_issues.iter().take(limit).cloned().collect();

    Ok(DataQualityScanResultDto {
        returned_issues: issues.len() as i64,
        total_issues: all_issues.len() as i64,
        issues,
        summary,
        scanned_at,
    })
}

pub fn list_data_quality_issues(
    conn: &Connection,
    paths: &AppPaths,
    input: AdminListDataQualityIssuesInputDto,
) -> Result<DataQualityIssuePageDto, AppError> {
    let created_at = current_timestamp(conn)?;
    let filter = IssueFilter::from_list(&input);
    let issues = collect_issues(conn, paths, &filter, &created_at)?;
    let total = issues.len() as i64;
    let page = clamp_page(input.page);
    let page_size = clamp_page_size(input.page_size);
    let offset = ((page - 1) * page_size) as usize;
    let items = issues
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();
    let total_pages = if total == 0 {
        0
    } else {
        (total + page_size - 1) / page_size
    };

    Ok(DataQualityIssuePageDto {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

pub fn get_data_quality_summary(
    conn: &Connection,
    paths: &AppPaths,
) -> Result<DataQualitySummaryDto, AppError> {
    let created_at = current_timestamp(conn)?;
    let filter = IssueFilter::default();
    let issues = collect_issues(conn, paths, &filter, &created_at)?;
    let counts = scanned_entity_counts(conn)?;
    Ok(summarize_issues(&issues, counts, Some(created_at)))
}

fn collect_issues(
    conn: &Connection,
    paths: &AppPaths,
    filter: &IssueFilter,
    created_at: &str,
) -> Result<Vec<DataQualityIssueDto>, AppError> {
    let mut issues = Vec::new();

    collect_missing_field_issues(conn, filter, created_at, &mut issues)?;
    collect_duplicate_issues(conn, filter, created_at, &mut issues)?;
    collect_broken_reference_issues(conn, paths, filter, created_at, &mut issues)?;
    collect_provenance_issues(conn, filter, created_at, &mut issues)?;
    collect_suspicious_content_issues(conn, filter, created_at, &mut issues)?;

    issues.sort_by(|a, b| {
        severity_rank(&a.severity)
            .cmp(&severity_rank(&b.severity))
            .then_with(|| a.category.cmp(&b.category))
            .then_with(|| {
                a.entity_label
                    .as_deref()
                    .unwrap_or_default()
                    .cmp(b.entity_label.as_deref().unwrap_or_default())
            })
            .then_with(|| a.id.cmp(&b.id))
    });

    Ok(issues)
}

fn collect_missing_field_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE NOT EXISTS (
             SELECT 1 FROM senses s
             WHERE s.word_id = w.id AND TRIM(COALESCE(s.definition_vi, '')) != ''
         )",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:vietnamese_meaning"),
                "high",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("vietnamese_meaning"),
                "Missing Vietnamese meaning.".to_string(),
                Some("Add a Vietnamese meaning to at least one sense before publishing."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE NOT EXISTS (
             SELECT 1 FROM senses s
             WHERE s.word_id = w.id AND TRIM(COALESCE(s.definition_en, '')) != ''
         )",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:english_definition"),
                "high",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("english_definition"),
                "Missing English definition.".to_string(),
                Some("Add a clear English definition to the primary sense."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE NOT EXISTS (
             SELECT 1 FROM examples e
             JOIN senses s ON s.id = e.sense_id
             WHERE s.word_id = w.id AND TRIM(COALESCE(e.sentence_en, '')) != ''
         )",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:example_sentence"),
                "high",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("example_sentence"),
                "Missing example sentence.".to_string(),
                Some("Add at least one learner-safe English example sentence."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE TRIM(COALESCE(w.ipa_us, '')) = ''
           AND TRIM(COALESCE(w.ipa_uk, '')) = ''",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:ipa"),
                "medium",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("ipa"),
                "Missing IPA pronunciation.".to_string(),
                Some("Add US or UK IPA so pronunciation practice can display guidance."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE NOT EXISTS (
             SELECT 1 FROM pronunciations p
             WHERE p.word_id = w.id AND TRIM(COALESCE(p.audio_path, '')) != ''
         )",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:audio_path"),
                "medium",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("audio_path"),
                "Missing audio URL/path.".to_string(),
                Some("Attach a pronunciation audio file or mark the item for audio production."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE TRIM(COALESCE(w.part_of_speech, '')) = ''",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:part_of_speech"),
                "medium",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("part_of_speech"),
                "Missing part of speech.".to_string(),
                Some("Set the part of speech to help filtering and duplicate detection."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE TRIM(COALESCE(w.cefr_level, '')) = ''",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:cefr_level"),
                "medium",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("cefr_level"),
                "Missing CEFR level.".to_string(),
                Some("Assign A1-C2 so decks and review queues can level content correctly."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE TRIM(COALESCE(w.type, '')) = ''",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:item_type"),
                "critical",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("item_type"),
                "Missing item type.".to_string(),
                Some("Set the item type to word, phrase, idiom, phrasal verb, or collocation."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE NOT EXISTS (
             SELECT 1 FROM deck_words dw WHERE dw.word_id = w.id
         )",
        |word_id, headword| {
            issue(
                format!("missing-field:word:{word_id}:deck_association"),
                "high",
                "missing_field",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("deck_association"),
                "Missing deck association.".to_string(),
                Some("Add the item to at least one deck so learners can discover it."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    collect_missing_example_translations(conn, filter, created_at, issues)?;
    collect_partial_sense_definition_gaps(conn, filter, created_at, issues)?;
    collect_optional_word_column_gaps(conn, filter, created_at, issues)?;

    Ok(())
}

fn query_word_missing<F>(
    conn: &Connection,
    sql: &str,
    builder: F,
    filter: &IssueFilter,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError>
where
    F: Fn(i64, String) -> DataQualityIssueDto,
{
    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| AppError::Internal(format!("Failed to prepare missing-field query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query missing fields: {e}")))?;
    for row in rows {
        let (word_id, headword) =
            row.map_err(|e| AppError::Internal(format!("Failed to read missing field: {e}")))?;
        add_issue(issues, filter, builder(word_id, headword));
    }
    Ok(())
}

fn collect_missing_example_translations(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT e.id, s.id, w.id, w.headword
             FROM examples e
             JOIN senses s ON s.id = e.sense_id
             JOIN words w ON w.id = s.word_id
             WHERE TRIM(COALESCE(e.sentence_vi, '')) = ''",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare example query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query examples: {e}")))?;
    for row in rows {
        let (example_id, sense_id, word_id, headword) =
            row.map_err(|e| AppError::Internal(format!("Failed to read example: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("missing-field:example:{example_id}:vietnamese_example_translation"),
                "medium",
                "missing_field",
                "vocabulary_sense",
                sense_id.to_string(),
                Some(headword),
                Some("vietnamese_example_translation"),
                "Missing Vietnamese example translation.".to_string(),
                Some("Translate the example sentence for English-Vietnamese study mode."),
                created_at,
                Some(vocabulary_target(word_id)),
            ),
        );
    }
    Ok(())
}

fn collect_partial_sense_definition_gaps(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT s.id, w.id, w.headword
             FROM senses s
             JOIN words w ON w.id = s.word_id
             WHERE TRIM(COALESCE(s.definition_vi, '')) = ''
               AND EXISTS (
                   SELECT 1 FROM senses sx
                   WHERE sx.word_id = w.id AND TRIM(COALESCE(sx.definition_vi, '')) != ''
               )",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare sense query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query senses: {e}")))?;
    for row in rows {
        let (sense_id, word_id, headword) =
            row.map_err(|e| AppError::Internal(format!("Failed to read sense: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("missing-field:sense:{sense_id}:vietnamese_explanation"),
                "medium",
                "missing_field",
                "vocabulary_sense",
                sense_id.to_string(),
                Some(headword),
                Some("vietnamese_explanation"),
                "A sense is missing its Vietnamese explanation.".to_string(),
                Some("Fill definition_vi for this sense or merge it with a covered sense."),
                created_at,
                Some(vocabulary_target(word_id)),
            ),
        );
    }
    Ok(())
}

fn collect_optional_word_column_gaps(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    if has_column(conn, "words", "syllables")? {
        query_word_missing(
            conn,
            "SELECT w.id, w.headword
             FROM words w
             WHERE TRIM(COALESCE(w.syllables, '')) = ''",
            |word_id, headword| {
                issue(
                    format!("missing-field:word:{word_id}:syllables"),
                    "medium",
                    "missing_field",
                    "vocabulary_item",
                    word_id.to_string(),
                    Some(headword),
                    Some("syllables"),
                    "Missing syllables.".to_string(),
                    Some("Add syllable segmentation when the column is available."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                )
            },
            filter,
            issues,
        )?;
    }

    if has_column(conn, "words", "stress_pattern")? {
        query_word_missing(
            conn,
            "SELECT w.id, w.headword
             FROM words w
             WHERE TRIM(COALESCE(w.stress_pattern, '')) = ''",
            |word_id, headword| {
                issue(
                    format!("missing-field:word:{word_id}:stress_pattern"),
                    "medium",
                    "missing_field",
                    "vocabulary_item",
                    word_id.to_string(),
                    Some(headword),
                    Some("stress_pattern"),
                    "Missing stress pattern.".to_string(),
                    Some("Add the stress pattern when pronunciation metadata supports it."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                )
            },
            filter,
            issues,
        )?;
    }

    Ok(())
}

fn collect_duplicate_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT
                LOWER(TRIM(headword)) AS normalized_headword,
                COALESCE(type, '') AS item_type,
                COALESCE(part_of_speech, '') AS pos,
                COUNT(*) AS c,
                GROUP_CONCAT(id) AS ids,
                MIN(headword) AS label,
                MIN(id) AS first_id
             FROM words
             GROUP BY normalized_headword, item_type, pos
             HAVING COUNT(*) > 1",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare duplicate query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query duplicates: {e}")))?;
    for row in rows {
        let (normalized, item_type, pos, count, _ids, label, first_id) =
            row.map_err(|e| AppError::Internal(format!("Failed to read duplicate: {e}")))?;
        let pos_label = if pos.is_empty() { "missing POS" } else { &pos };
        add_issue(
            issues,
            filter,
            issue(
                format!("duplicate:headword:{normalized}:{item_type}:{pos}"),
                "high",
                "duplicate",
                "vocabulary_item",
                first_id.to_string(),
                Some(format!("{label} ({count} items)")),
                Some("headword"),
                format!(
                    "Duplicate headword with same type '{item_type}' and part of speech '{pos_label}'."
                ),
                Some("Review the duplicate records and merge or disambiguate them manually."),
                created_at,
                Some(vocabulary_target(first_id)),
            ),
        );
    }

    collect_conflicting_duplicate_sense_issues(conn, filter, created_at, issues)?;
    collect_near_duplicate_issues(conn, filter, created_at, issues)?;
    collect_duplicate_deck_membership_issues(conn, filter, created_at, issues)?;

    Ok(())
}

fn collect_conflicting_duplicate_sense_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT
                LOWER(TRIM(w.headword)) AS normalized_headword,
                COALESCE(w.type, '') AS item_type,
                COALESCE(w.part_of_speech, '') AS pos,
                COUNT(DISTINCT w.id) AS word_count,
                COUNT(DISTINCT LOWER(TRIM(COALESCE(s.definition_en, '')))) AS definition_count,
                GROUP_CONCAT(DISTINCT w.id) AS ids,
                MIN(w.headword) AS label,
                MIN(w.id) AS first_id
             FROM words w
             LEFT JOIN senses s ON s.word_id = w.id
             GROUP BY normalized_headword, item_type, pos
             HAVING COUNT(DISTINCT w.id) > 1
                AND COUNT(DISTINCT LOWER(TRIM(COALESCE(s.definition_en, '')))) > 1",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare conflict query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i64>(7)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query conflicts: {e}")))?;
    for row in rows {
        let (normalized, item_type, pos, word_count, definition_count, ids, label, first_id) =
            row.map_err(|e| AppError::Internal(format!("Failed to read conflict: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("conflict:duplicate-senses:{normalized}:{item_type}:{pos}"),
                "medium",
                "conflict",
                "vocabulary_item",
                first_id.to_string(),
                Some(format!("{label} ({word_count} items)")),
                Some("senses"),
                format!(
                    "Duplicate headword group has {definition_count} distinct English definitions across word IDs {ids}."
                ),
                Some("Compare definitions and examples before deciding whether to merge."),
                created_at,
                Some(vocabulary_target(first_id)),
            ),
        );
    }
    Ok(())
}

fn collect_near_duplicate_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT
                LOWER(REPLACE(REPLACE(REPLACE(TRIM(headword), '-', ''), ' ', ''), '''', '')) AS normalized,
                COUNT(*) AS c,
                COUNT(DISTINCT LOWER(TRIM(headword))) AS variants,
                GROUP_CONCAT(id) AS ids,
                MIN(headword) AS label,
                MIN(id) AS first_id
             FROM words
             GROUP BY normalized
             HAVING COUNT(*) > 1 AND COUNT(DISTINCT LOWER(TRIM(headword))) > 1",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare near-duplicate query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query near duplicates: {e}")))?;
    for row in rows {
        let (normalized, count, variants, ids, label, first_id) =
            row.map_err(|e| AppError::Internal(format!("Failed to read near duplicate: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("duplicate:near-headword:{normalized}"),
                "low",
                "duplicate",
                "vocabulary_item",
                first_id.to_string(),
                Some(format!("{label} ({variants} variants)")),
                Some("headword"),
                format!(
                    "Possible near-duplicate headwords after simple normalization across {count} records: {ids}."
                ),
                Some("Check whether spacing, hyphenation, or apostrophe variants should be unified."),
                created_at,
                Some(vocabulary_target(first_id)),
            ),
        );
    }
    Ok(())
}

fn collect_duplicate_deck_membership_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT dw.deck_id, dw.word_id, COUNT(*) AS c,
                    COALESCE(d.name, 'Missing deck') AS deck_name,
                    COALESCE(w.headword, 'Missing word') AS headword
             FROM deck_words dw
             LEFT JOIN decks d ON d.id = dw.deck_id
             LEFT JOIN words w ON w.id = dw.word_id
             GROUP BY dw.deck_id, dw.word_id
             HAVING COUNT(*) > 1",
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to prepare duplicate deck membership query: {e}"
            ))
        })?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query deck membership: {e}")))?;
    for row in rows {
        let (deck_id, word_id, count, deck_name, headword) =
            row.map_err(|e| AppError::Internal(format!("Failed to read deck membership: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("duplicate:deck-item:{deck_id}:{word_id}"),
                "high",
                "duplicate",
                "deck_item",
                format!("{deck_id}:{word_id}"),
                Some(format!("{deck_name} / {headword}")),
                Some("deck_membership"),
                format!("Same vocabulary item appears {count} times inside one deck."),
                Some("Remove duplicate deck membership rows after confirming the intended order."),
                created_at,
                Some(deck_target(deck_id)),
            ),
        );
    }
    Ok(())
}

fn collect_broken_reference_issues(
    conn: &Connection,
    paths: &AppPaths,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    collect_broken_deck_word_refs(conn, filter, created_at, issues)?;
    collect_broken_relation_refs(conn, filter, created_at, issues)?;
    collect_broken_child_refs(conn, filter, created_at, issues)?;
    collect_audio_path_issues(conn, paths, filter, created_at, issues)?;
    collect_cover_path_issues(conn, paths, filter, created_at, issues)?;
    Ok(())
}

fn collect_broken_deck_word_refs(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT dw.deck_id, dw.word_id, d.name, w.headword
             FROM deck_words dw
             LEFT JOIN decks d ON d.id = dw.deck_id
             LEFT JOIN words w ON w.id = dw.word_id
             WHERE d.id IS NULL OR w.id IS NULL",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare deck reference query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query deck references: {e}")))?;
    for row in rows {
        let (deck_id, word_id, deck_name, headword) =
            row.map_err(|e| AppError::Internal(format!("Failed to read deck reference: {e}")))?;
        let missing_word = headword.is_none();
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:deck-word:{deck_id}:{word_id}"),
                "critical",
                "broken_reference",
                "deck_item",
                format!("{deck_id}:{word_id}"),
                Some(format!(
                    "{} / {}",
                    deck_name.unwrap_or_else(|| format!("Missing deck {deck_id}")),
                    headword.unwrap_or_else(|| format!("Missing word {word_id}"))
                )),
                Some(if missing_word { "word_id" } else { "deck_id" }),
                "Deck item references a missing record.".to_string(),
                Some("Repair or remove the orphaned deck item after checking import history."),
                created_at,
                if missing_word {
                    Some(deck_target(deck_id))
                } else {
                    None
                },
            ),
        );
    }
    Ok(())
}

fn collect_broken_relation_refs(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.from_word_id, r.to_word_id, r.relation_type,
                    wf.headword, wt.headword
             FROM word_relations r
             LEFT JOIN words wf ON wf.id = r.from_word_id
             LEFT JOIN words wt ON wt.id = r.to_word_id
             WHERE wf.id IS NULL OR wt.id IS NULL",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare relation query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query relations: {e}")))?;
    for row in rows {
        let (relation_id, from_word_id, to_word_id, relation_type, from_label, to_label) =
            row.map_err(|e| AppError::Internal(format!("Failed to read relation: {e}")))?;
        let target = from_label
            .as_ref()
            .map(|_| vocabulary_target(from_word_id))
            .or_else(|| to_label.as_ref().map(|_| vocabulary_target(to_word_id)));
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:relation:{relation_id}"),
                "critical",
                "broken_reference",
                "relation",
                relation_id.to_string(),
                Some(format!(
                    "{} -> {}",
                    from_label.unwrap_or_else(|| format!("Missing word {from_word_id}")),
                    to_label.unwrap_or_else(|| format!("Missing word {to_word_id}"))
                )),
                Some("word_relation"),
                format!("Vocabulary relation '{relation_type}' points to a missing item."),
                Some("Repair the relation target or remove the orphaned relation."),
                created_at,
                target,
            ),
        );
    }
    Ok(())
}

fn collect_broken_child_refs(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.word_id
             FROM senses s
             LEFT JOIN words w ON w.id = s.word_id
             WHERE w.id IS NULL",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare sense reference query: {e}")))?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)))
        .map_err(|e| AppError::Internal(format!("Failed to query sense references: {e}")))?;
    for row in rows {
        let (sense_id, word_id) =
            row.map_err(|e| AppError::Internal(format!("Failed to read sense reference: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:sense:{sense_id}:word:{word_id}"),
                "critical",
                "broken_reference",
                "vocabulary_sense",
                sense_id.to_string(),
                Some(format!("Missing word {word_id}")),
                Some("word_id"),
                "Sense references a missing vocabulary item.".to_string(),
                Some("Repair the parent word reference or remove the orphaned sense."),
                created_at,
                None,
            ),
        );
    }

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.word_id
             FROM pronunciations p
             LEFT JOIN words w ON w.id = p.word_id
             WHERE w.id IS NULL",
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to prepare pronunciation reference query: {e}"
            ))
        })?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)))
        .map_err(|e| {
            AppError::Internal(format!("Failed to query pronunciation references: {e}"))
        })?;
    for row in rows {
        let (pron_id, word_id) =
            row.map_err(|e| AppError::Internal(format!("Failed to read pronunciation ref: {e}")))?;
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:pronunciation:{pron_id}:word:{word_id}"),
                "critical",
                "broken_reference",
                "pronunciation",
                pron_id.to_string(),
                Some(format!("Missing word {word_id}")),
                Some("word_id"),
                "Pronunciation references a missing vocabulary item.".to_string(),
                Some("Repair the pronunciation row or remove the orphaned audio record."),
                created_at,
                None,
            ),
        );
    }

    Ok(())
}

fn collect_audio_path_issues(
    conn: &Connection,
    paths: &AppPaths,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.word_id, w.headword, p.audio_path
             FROM pronunciations p
             LEFT JOIN words w ON w.id = p.word_id
             WHERE TRIM(COALESCE(p.audio_path, '')) != ''",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare audio path query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query audio paths: {e}")))?;
    for row in rows {
        let (pron_id, word_id, headword, audio_path) =
            row.map_err(|e| AppError::Internal(format!("Failed to read audio path: {e}")))?;
        let label = headword.unwrap_or_else(|| format!("Word {word_id}"));
        if is_url(&audio_path) {
            if !is_valid_url(&audio_path) {
                add_issue(
                    issues,
                    filter,
                    issue(
                        format!("broken-reference:pronunciation:{pron_id}:malformed-url"),
                        "high",
                        "broken_reference",
                        "pronunciation",
                        pron_id.to_string(),
                        Some(label),
                        Some("audio_path"),
                        "Audio URL is malformed.".to_string(),
                        Some("Use a valid http(s) URL or replace it with a safe local cache path."),
                        created_at,
                        Some(vocabulary_target(word_id)),
                    ),
                );
            }
            continue;
        }

        if !is_safe_relative_path(&audio_path) {
            add_issue(
                issues,
                filter,
                issue(
                    format!("broken-reference:pronunciation:{pron_id}:malformed-path"),
                    "high",
                    "broken_reference",
                    "pronunciation",
                    pron_id.to_string(),
                    Some(label),
                    Some("audio_path"),
                    "Audio local path is malformed or unsafe.".to_string(),
                    Some("Use a relative path inside the audio cache with no traversal segments."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
            continue;
        }

        let resolved = paths.audio_cache_dir().join(&audio_path);
        if !resolved.exists() {
            add_issue(
                issues,
                filter,
                issue(
                    format!("broken-reference:pronunciation:{pron_id}:missing-file"),
                    "high",
                    "broken_reference",
                    "pronunciation",
                    pron_id.to_string(),
                    Some(label),
                    Some("audio_file"),
                    format!("Audio local path points to a missing file: {audio_path}."),
                    Some("Place the file in the audio cache or update the pronunciation path."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
        }
    }

    collect_example_audio_path_issues(conn, paths, filter, created_at, issues)?;
    Ok(())
}

fn collect_example_audio_path_issues(
    conn: &Connection,
    paths: &AppPaths,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT e.id, s.id, w.id, w.headword, e.audio_path
             FROM examples e
             JOIN senses s ON s.id = e.sense_id
             JOIN words w ON w.id = s.word_id
             WHERE TRIM(COALESCE(e.audio_path, '')) != ''",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare example audio query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query example audio: {e}")))?;
    for row in rows {
        let (example_id, sense_id, word_id, headword, audio_path) =
            row.map_err(|e| AppError::Internal(format!("Failed to read example audio: {e}")))?;
        if is_url(&audio_path) {
            if !is_valid_url(&audio_path) {
                add_issue(
                    issues,
                    filter,
                    issue(
                        format!("broken-reference:example:{example_id}:malformed-url"),
                        "medium",
                        "broken_reference",
                        "asset",
                        example_id.to_string(),
                        Some(headword),
                        Some("audio_path"),
                        "Example audio URL is malformed.".to_string(),
                        Some("Use a valid http(s) URL or replace it with a safe local cache path."),
                        created_at,
                        Some(vocabulary_target(word_id)),
                    ),
                );
            }
            continue;
        }

        if !is_safe_relative_path(&audio_path) {
            add_issue(
                issues,
                filter,
                issue(
                    format!("broken-reference:example:{example_id}:malformed-path"),
                    "medium",
                    "broken_reference",
                    "asset",
                    example_id.to_string(),
                    Some(headword),
                    Some("audio_path"),
                    "Example audio local path is malformed or unsafe.".to_string(),
                    Some("Use a relative path inside the audio cache with no traversal segments."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
            continue;
        }

        if !paths.audio_cache_dir().join(&audio_path).exists() {
            add_issue(
                issues,
                filter,
                issue(
                    format!("broken-reference:example:{example_id}:missing-file"),
                    "medium",
                    "broken_reference",
                    "asset",
                    sense_id.to_string(),
                    Some(headword),
                    Some("audio_file"),
                    format!("Example audio path points to a missing file: {audio_path}."),
                    Some("Place the file in the audio cache or update the example audio path."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
        }
    }
    Ok(())
}

fn collect_cover_path_issues(
    conn: &Connection,
    paths: &AppPaths,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, cover_image_path
             FROM decks
             WHERE TRIM(COALESCE(cover_image_path, '')) != ''",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare deck cover query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query deck covers: {e}")))?;
    for row in rows {
        let (deck_id, name, cover_path) =
            row.map_err(|e| AppError::Internal(format!("Failed to read deck cover: {e}")))?;
        collect_asset_path_issue(
            "deck-cover",
            deck_id,
            "deck",
            deck_id.to_string(),
            name,
            "cover_image_path",
            &cover_path,
            paths.app_data_dir.clone(),
            Some(deck_target(deck_id)),
            filter,
            created_at,
            issues,
        );
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, name, cover_image_path
             FROM packs
             WHERE TRIM(COALESCE(cover_image_path, '')) != ''",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare pack cover query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query pack covers: {e}")))?;
    for row in rows {
        let (pack_id, name, cover_path) =
            row.map_err(|e| AppError::Internal(format!("Failed to read pack cover: {e}")))?;
        collect_asset_path_issue(
            "pack-cover",
            pack_id,
            "asset",
            pack_id.to_string(),
            name,
            "cover_image_path",
            &cover_path,
            paths.app_data_dir.clone(),
            None,
            filter,
            created_at,
            issues,
        );
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn collect_asset_path_issue(
    id_prefix: &str,
    row_id: i64,
    entity_type: &str,
    entity_id: String,
    label: String,
    field: &str,
    asset_path: &str,
    base_dir: PathBuf,
    target: Option<DataQualityNavigationTargetDto>,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) {
    if is_url(asset_path) || !is_safe_asset_path(asset_path) {
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:{id_prefix}:{row_id}:malformed-path"),
                "medium",
                "broken_reference",
                entity_type,
                entity_id,
                Some(label),
                Some(field),
                "Asset path is malformed or unsafe.".to_string(),
                Some("Use a safe local path available offline."),
                created_at,
                target,
            ),
        );
        return;
    }

    let resolved = resolve_asset_path(&base_dir, asset_path);
    if !resolved.exists() {
        add_issue(
            issues,
            filter,
            issue(
                format!("broken-reference:{id_prefix}:{row_id}:missing-file"),
                "medium",
                "broken_reference",
                entity_type,
                entity_id,
                Some(label),
                Some(field),
                format!("Asset path points to a missing file: {asset_path}."),
                Some("Add the asset file or update the path."),
                created_at,
                target,
            ),
        );
    }
}

fn collect_provenance_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         LEFT JOIN data_provenance dp
           ON dp.table_name = 'words' AND dp.row_id = w.id
         WHERE dp.id IS NULL",
        |word_id, headword| {
            issue(
                format!("provenance:word:{word_id}:missing"),
                "medium",
                "provenance",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("provenance"),
                "Missing provenance record.".to_string(),
                Some("Attach source metadata before treating the entry as reviewed."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         LEFT JOIN data_provenance dp
           ON dp.table_name = 'words' AND dp.row_id = w.id
         WHERE w.pack_id IS NULL
           AND (dp.id IS NULL OR TRIM(COALESCE(dp.source, '')) = '')",
        |word_id, headword| {
            issue(
                format!("provenance:word:{word_id}:missing-source-dataset"),
                "medium",
                "provenance",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("source_dataset"),
                "Missing source dataset.".to_string(),
                Some("Record the source dataset, import batch, or manual origin."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE w.review_status = 'unverified'",
        |word_id, headword| {
            issue(
                format!("provenance:word:{word_id}:unverified"),
                "low",
                "provenance",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("review_status"),
                "Entry is unverified.".to_string(),
                Some("Review the entry and set its status to verified or needs_review."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    query_word_missing(
        conn,
        "SELECT w.id, w.headword
         FROM words w
         WHERE w.review_status = 'needs_review'",
        |word_id, headword| {
            issue(
                format!("provenance:word:{word_id}:needs-review"),
                "low",
                "provenance",
                "vocabulary_item",
                word_id.to_string(),
                Some(headword),
                Some("review_status"),
                "Entry is marked needs_review.".to_string(),
                Some("Resolve the editorial note and either verify or reject the entry."),
                created_at,
                Some(vocabulary_target(word_id)),
            )
        },
        filter,
        issues,
    )?;

    collect_ai_model_provenance_issues(conn, filter, created_at, issues)?;
    Ok(())
}

fn collect_ai_model_provenance_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT w.id, w.headword, dp.id, COALESCE(dp.notes, '')
             FROM words w
             JOIN data_provenance dp
               ON dp.table_name = 'words' AND dp.row_id = w.id
             WHERE LOWER(COALESCE(dp.notes, '')) LIKE '%ai%'",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare AI provenance query: {e}")))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query AI provenance: {e}")))?;
    for row in rows {
        let (word_id, headword, provenance_id, notes) =
            row.map_err(|e| AppError::Internal(format!("Failed to read AI provenance: {e}")))?;
        let lower = notes.to_lowercase();
        let has_model = lower.contains("model")
            || lower.contains("gpt")
            || lower.contains("claude")
            || lower.contains("llama")
            || lower.contains("version");
        if !has_model {
            add_issue(
                issues,
                filter,
                issue(
                    format!("provenance:word:{word_id}:ai-model-version:{provenance_id}"),
                    "medium",
                    "provenance",
                    "vocabulary_item",
                    word_id.to_string(),
                    Some(headword),
                    Some("ai_model_version"),
                    "AI-enriched provenance is missing model/version details.".to_string(),
                    Some("Record the AI model and enrichment version in provenance notes."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
        }
    }
    Ok(())
}

fn collect_suspicious_content_issues(
    conn: &Connection,
    filter: &IssueFilter,
    created_at: &str,
    issues: &mut Vec<DataQualityIssueDto>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT s.id, w.id, w.headword, s.definition_en
             FROM senses s
             JOIN words w ON w.id = s.word_id
             WHERE TRIM(COALESCE(s.definition_en, '')) != ''",
        )
        .map_err(|e| {
            AppError::Internal(format!(
                "Failed to prepare suspicious definition query: {e}"
            ))
        })?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::Internal(format!("Failed to query suspicious definitions: {e}")))?;
    for row in rows {
        let (sense_id, word_id, headword, definition) = row.map_err(|e| {
            AppError::Internal(format!("Failed to read suspicious definition: {e}"))
        })?;
        if suspicious_definition(&definition) {
            add_issue(
                issues,
                filter,
                issue(
                    format!("suspicious-content:sense:{sense_id}:definition"),
                    "low",
                    "suspicious_content",
                    "vocabulary_sense",
                    sense_id.to_string(),
                    Some(headword),
                    Some("english_definition"),
                    "English definition looks overly generic or AI-artifact-like.".to_string(),
                    Some("Review the definition manually for specificity and correctness."),
                    created_at,
                    Some(vocabulary_target(word_id)),
                ),
            );
        }
    }
    Ok(())
}

fn suspicious_definition(value: &str) -> bool {
    let normalized = value.trim().to_lowercase();
    if normalized.len() < 8 {
        return true;
    }
    matches!(
        normalized.as_str(),
        "thing" | "something" | "a thing" | "a person" | "good" | "bad" | "nice" | "stuff"
    ) || normalized.contains("as an ai")
        || normalized.contains("i cannot")
        || normalized.contains("lorem ipsum")
        || normalized.contains("todo")
        || normalized == "definition"
}

fn is_url(value: &str) -> bool {
    value.starts_with("http://") || value.starts_with("https://")
}

fn is_valid_url(value: &str) -> bool {
    if value.chars().any(char::is_whitespace) {
        return false;
    }
    let rest = value
        .strip_prefix("http://")
        .or_else(|| value.strip_prefix("https://"));
    let Some(rest) = rest else {
        return false;
    };
    let host = rest.split('/').next().unwrap_or_default();
    !host.is_empty() && !host.starts_with('.') && !host.ends_with('.')
}

fn is_safe_relative_path(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.contains('\0')
        || trimmed.contains("..")
        || trimmed.starts_with('/')
        || trimmed.starts_with('\\')
    {
        return false;
    }
    !Path::new(trimmed).is_absolute()
}

fn is_safe_asset_path(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.contains('\0') || trimmed.contains("..") {
        return false;
    }
    true
}

fn resolve_asset_path(base_dir: &Path, value: &str) -> PathBuf {
    let path = Path::new(value);
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        base_dir.join(path)
    }
}

fn summarize_issues(
    issues: &[DataQualityIssueDto],
    scanned_entity_counts: DataQualityScannedEntityCountsDto,
    last_scan_time: Option<String>,
) -> DataQualitySummaryDto {
    let mut by_severity = BTreeMap::new();
    let mut by_category = BTreeMap::new();
    let mut by_entity_type = BTreeMap::new();
    let mut by_issue_type: BTreeMap<String, i64> = BTreeMap::new();

    for issue in issues {
        *by_severity.entry(issue.severity.clone()).or_insert(0) += 1;
        *by_category.entry(issue.category.clone()).or_insert(0) += 1;
        *by_entity_type.entry(issue.entity_type.clone()).or_insert(0) += 1;
        *by_issue_type.entry(issue_type_key(issue)).or_insert(0) += 1;
    }

    let mut top_issue_types: Vec<DataQualityTopIssueTypeDto> = by_issue_type
        .into_iter()
        .map(|(issue_type, count)| DataQualityTopIssueTypeDto {
            label: issue_type_label(&issue_type),
            issue_type,
            count,
        })
        .collect();
    top_issue_types.sort_by(|a, b| {
        b.count
            .cmp(&a.count)
            .then_with(|| a.issue_type.cmp(&b.issue_type))
    });
    top_issue_types.truncate(6);

    let quick_counts = DataQualityQuickCountsDto {
        critical: *by_severity.get("critical").unwrap_or(&0),
        high: *by_severity.get("high").unwrap_or(&0),
        missing_meanings: issues
            .iter()
            .filter(|i| i.field.as_deref() == Some("vietnamese_meaning"))
            .count() as i64,
        missing_ipa_audio: issues
            .iter()
            .filter(|i| {
                matches!(
                    i.field.as_deref(),
                    Some("ipa") | Some("audio_path") | Some("audio_file")
                )
            })
            .count() as i64,
        duplicates: *by_category.get("duplicate").unwrap_or(&0),
        unverified_entries: issues
            .iter()
            .filter(|i| i.id.ends_with(":unverified"))
            .count() as i64,
    };

    DataQualitySummaryDto {
        total_issues: issues.len() as i64,
        by_severity,
        by_category,
        by_entity_type,
        top_issue_types,
        last_scan_time,
        scanned_entity_counts,
        quick_counts,
    }
}

fn issue_type_key(issue: &DataQualityIssueDto) -> String {
    format!(
        "{}:{}",
        issue.category,
        issue.field.as_deref().unwrap_or(&issue.entity_type)
    )
}

fn issue_type_label(issue_type: &str) -> String {
    issue_type
        .replace(':', " / ")
        .replace('_', " ")
        .split_whitespace()
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn severity_rank(value: &str) -> i32 {
    match value {
        "critical" => 0,
        "high" => 1,
        "medium" => 2,
        "low" => 3,
        _ => 4,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth;
    use rusqlite::params;

    fn fixture_paths() -> AppPaths {
        AppPaths {
            app_data_dir: std::env::temp_dir()
                .join(format!("lexora-data-quality-test-{}", std::process::id())),
        }
    }

    fn fixture_conn() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        auth::create_default_accounts(&conn).expect("accounts");

        conn.execute(
            "INSERT INTO packs (slug, name, version, source)
             VALUES ('fixture-pack', 'Fixture Pack', '0.1.0', 'imported')",
            [],
        )
        .unwrap();
        let pack_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO decks (pack_id, slug, name, word_count)
             VALUES (?1, 'fixture', 'Fixture Deck', 2)",
            params![pack_id],
        )
        .unwrap();
        let deck_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO words
                (pack_id, headword, type, part_of_speech, cefr_level, review_status)
             VALUES (?1, 'quality', 'word', 'noun', NULL, 'unverified')",
            params![pack_id],
        )
        .unwrap();
        let broken_word_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
             VALUES (?1, 0, '', NULL)",
            params![broken_word_id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO deck_words (deck_id, word_id, position)
             VALUES (?1, ?2, 0)",
            params![deck_id, broken_word_id],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO words
                (pack_id, headword, type, part_of_speech, ipa_us, cefr_level, review_status)
             VALUES (?1, 'quality', 'word', 'noun', '/kwAA.luh.tee/', 'B1', 'needs_review')",
            params![pack_id],
        )
        .unwrap();
        let duplicate_word_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO senses (word_id, sense_index, definition_en, definition_vi)
             VALUES (?1, 0, 'degree of excellence', 'chat luong')",
            params![duplicate_word_id],
        )
        .unwrap();
        let sense_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO examples (sense_id, sentence_en, sentence_vi)
             VALUES (?1, 'The quality improved.', NULL)",
            params![sense_id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO pronunciations (word_id, dialect, audio_path, tts_engine)
             VALUES (?1, 'us', 'missing/quality.mp3', 'bundled')",
            params![duplicate_word_id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO deck_words (deck_id, word_id, position)
             VALUES (?1, ?2, 1)",
            params![deck_id, duplicate_word_id],
        )
        .unwrap();

        conn.execute_batch("PRAGMA foreign_keys = OFF;").unwrap();
        conn.execute(
            "INSERT INTO deck_words (deck_id, word_id, position)
             VALUES (?1, 999999, 2)",
            params![deck_id],
        )
        .unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

        conn
    }

    fn scan(conn: &Connection) -> Vec<DataQualityIssueDto> {
        let paths = fixture_paths();
        let created_at = current_timestamp(conn).expect("timestamp");
        collect_issues(conn, &paths, &IssueFilter::default(), &created_at).expect("scan")
    }

    fn has_issue(issues: &[DataQualityIssueDto], category: &str, field: &str) -> bool {
        issues
            .iter()
            .any(|issue| issue.category == category && issue.field.as_deref() == Some(field))
    }

    #[test]
    fn learner_cannot_run_owner_validation_commands() {
        let conn = fixture_conn();
        auth::login(&conn, "learner", "learner").expect("login");
        let err = auth::require_owner(&conn).expect_err("learner must be denied");
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn owner_can_run_validation_scan() {
        let conn = fixture_conn();
        auth::login(&conn, "owner", "owner").expect("login");
        auth::require_owner(&conn).expect("owner guard");
        let result = run_data_quality_scan(
            &conn,
            &fixture_paths(),
            AdminRunDataQualityScanInputDto {
                limit: Some(10),
                ..Default::default()
            },
        )
        .expect("scan");
        assert!(result.total_issues > 0);
        assert!(result.returned_issues <= 10);
    }

    #[test]
    fn detects_missing_vietnamese_meaning() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(has_issue(&issues, "missing_field", "vietnamese_meaning"));
    }

    #[test]
    fn detects_missing_english_definition() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(has_issue(&issues, "missing_field", "english_definition"));
    }

    #[test]
    fn detects_missing_ipa_and_audio() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(has_issue(&issues, "missing_field", "ipa"));
        assert!(has_issue(&issues, "missing_field", "audio_path"));
    }

    #[test]
    fn detects_duplicate_headword() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(issues.iter().any(|issue| {
            issue.category == "duplicate" && issue.field.as_deref() == Some("headword")
        }));
    }

    #[test]
    fn detects_broken_deck_item_reference() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(issues.iter().any(|issue| {
            issue.category == "broken_reference"
                && issue.entity_type == "deck_item"
                && issue.field.as_deref() == Some("word_id")
        }));
    }

    #[test]
    fn detects_unverified_and_missing_provenance() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        assert!(has_issue(&issues, "provenance", "review_status"));
        assert!(has_issue(&issues, "provenance", "provenance"));
    }

    #[test]
    fn summary_counts_match_issue_list() {
        let conn = fixture_conn();
        let issues = scan(&conn);
        let summary = summarize_issues(
            &issues,
            scanned_entity_counts(&conn).expect("counts"),
            Some("2026-05-20T00:00:00Z".to_string()),
        );
        assert_eq!(summary.total_issues, issues.len() as i64);
        assert_eq!(
            summary.by_severity.values().sum::<i64>(),
            summary.total_issues
        );
        assert_eq!(
            summary.by_category.values().sum::<i64>(),
            summary.total_issues
        );
    }

    #[test]
    fn issue_pagination_works() {
        let conn = fixture_conn();
        let page = list_data_quality_issues(
            &conn,
            &fixture_paths(),
            AdminListDataQualityIssuesInputDto {
                page: Some(1),
                page_size: Some(2),
                ..Default::default()
            },
        )
        .expect("page");
        assert_eq!(page.page, 1);
        assert_eq!(page.page_size, 2);
        assert!(page.total >= 2);
        assert_eq!(page.items.len(), 2);
    }
}
