use serde::Serialize;

#[derive(Debug, Serialize, PartialEq)]
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
