use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

// ── Vocabulary listing ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyListInputDto {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    #[serde(rename = "type")]
    pub word_type: Option<String>,
    pub cefr_level: Option<String>,
    pub review_status: Option<String>,
    pub missing_ipa: Option<bool>,
    pub missing_audio: Option<bool>,
    pub missing_example: Option<bool>,
    pub missing_meaning: Option<bool>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminMissingFlagsDto {
    pub meaning: bool,
    pub definition: bool,
    pub example: bool,
    pub ipa: bool,
    pub audio: bool,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyListItemDto {
    pub id: i64,
    pub headword: String,
    #[serde(rename = "type")]
    pub word_type: String,
    pub part_of_speech: Option<String>,
    pub cefr_level: Option<String>,
    pub primary_vietnamese_meaning: Option<String>,
    pub primary_english_definition: Option<String>,
    pub review_status: String,
    pub missing: AdminMissingFlagsDto,
    pub deck_count: i64,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyPageDto {
    pub items: Vec<AdminVocabularyListItemDto>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

// ── Vocabulary detail ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyDetailDto {
    pub id: i64,
    pub headword: String,
    #[serde(rename = "type")]
    pub word_type: String,
    pub part_of_speech: Option<String>,
    pub cefr_level: Option<String>,
    pub ipa_uk: Option<String>,
    pub ipa_us: Option<String>,
    pub review_status: String,
    pub frequency_rank: Option<i64>,
    pub pack_name: Option<String>,
    pub deck_count: i64,
    pub primary_definition_en: Option<String>,
    pub primary_definition_vi: Option<String>,
    pub primary_example_en: Option<String>,
    pub primary_example_vi: Option<String>,
    pub primary_audio_path: Option<String>,
    pub sense_count: i64,
    pub example_count: i64,
    pub pronunciation_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

// ── Patch (partial update) ────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminVocabularyPatchDto {
    pub headword: Option<String>,
    #[serde(rename = "type")]
    pub word_type: Option<String>,
    pub part_of_speech: Option<String>,
    pub cefr_level: Option<String>,
    pub ipa_uk: Option<String>,
    pub ipa_us: Option<String>,
    pub review_status: Option<String>,
    pub primary_definition_en: Option<String>,
    pub primary_definition_vi: Option<String>,
    pub primary_example_en: Option<String>,
    pub primary_example_vi: Option<String>,
}

// ── Deck listing ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminDeckListInputDto {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminDeckSummaryDto {
    pub id: i64,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub difficulty: Option<String>,
    pub word_count: i64,
    pub actual_word_count: i64,
    pub has_cover: bool,
    pub pack_name: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminDeckPageDto {
    pub items: Vec<AdminDeckSummaryDto>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

// ── Validation summary ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminValidationSummaryDto {
    pub total_words: i64,
    pub missing_meanings: i64,
    pub missing_definitions: i64,
    pub missing_examples: i64,
    pub missing_ipa: i64,
    pub missing_audio: i64,
    pub unverified: i64,
    pub needs_review: i64,
    pub draft: i64,
    pub rejected: i64,
    pub verified: i64,
    pub potential_duplicates: i64,
}

// Data Quality Checker

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminRunDataQualityScanInputDto {
    pub categories: Option<Vec<String>>,
    pub severity: Option<Vec<String>>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminListDataQualityIssuesInputDto {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category: Option<String>,
    pub severity: Option<String>,
    pub entity_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityNavigationTargetDto {
    pub target_type: String,
    pub target_id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityIssueDto {
    pub id: String,
    pub severity: String,
    pub category: String,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_label: Option<String>,
    pub field: Option<String>,
    pub message: String,
    pub recommendation: Option<String>,
    pub can_auto_fix: bool,
    pub created_at: Option<String>,
    pub navigation_target: Option<DataQualityNavigationTargetDto>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityScannedEntityCountsDto {
    pub vocabulary_items: i64,
    pub senses: i64,
    pub pronunciations: i64,
    pub decks: i64,
    pub deck_items: i64,
    pub relations: i64,
    pub assets: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityQuickCountsDto {
    pub critical: i64,
    pub high: i64,
    pub missing_meanings: i64,
    pub missing_ipa_audio: i64,
    pub duplicates: i64,
    pub unverified_entries: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityTopIssueTypeDto {
    pub issue_type: String,
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualitySummaryDto {
    pub total_issues: i64,
    pub by_severity: BTreeMap<String, i64>,
    pub by_category: BTreeMap<String, i64>,
    pub by_entity_type: BTreeMap<String, i64>,
    pub top_issue_types: Vec<DataQualityTopIssueTypeDto>,
    pub last_scan_time: Option<String>,
    pub scanned_entity_counts: DataQualityScannedEntityCountsDto,
    pub quick_counts: DataQualityQuickCountsDto,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityScanResultDto {
    pub issues: Vec<DataQualityIssueDto>,
    pub returned_issues: i64,
    pub total_issues: i64,
    pub summary: DataQualitySummaryDto,
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DataQualityIssuePageDto {
    pub items: Vec<DataQualityIssueDto>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}
