use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCardDto {
    pub id: i64,
    pub user_id: i64,
    pub vocabulary_item_id: i64,
    pub deck_id: Option<i64>,
    pub due: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: String,
    pub last_review: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnsureReviewCardsForDeckDto {
    pub deck_id: i64,
    pub user_id: i64,
    pub total_vocabulary_items: i64,
    pub created_count: i64,
    pub existing_count: i64,
    pub cards: Vec<ReviewCardDto>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartReviewQueueRequestDto {
    pub deck_id: Option<i64>,
    pub session_length: i64,
    pub due_ratio: f64,
    pub weak_ratio: f64,
    pub new_ratio: f64,
    pub mode: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SmartReviewQueueItemDto {
    pub position: i64,
    pub category: String,
    pub card: ReviewCardDto,
    pub headword: String,
    pub part_of_speech: Option<String>,
    pub definition_en: Option<String>,
    pub definition_vi: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SmartReviewQueueSummaryDto {
    pub due_count: i64,
    pub weak_count: i64,
    pub new_count: i64,
    pub requested_length: i64,
    pub returned_length: i64,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SmartReviewQueueDto {
    pub user_id: i64,
    pub deck_id: Option<i64>,
    pub mode: String,
    pub generated_at: String,
    pub summary: SmartReviewQueueSummaryDto,
    pub items: Vec<SmartReviewQueueItemDto>,
}
