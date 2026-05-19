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
    pub learning_steps: i64,
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
    pub ipa_uk: Option<String>,
    pub ipa_us: Option<String>,
    pub definition_en: Option<String>,
    pub definition_vi: Option<String>,
    pub example_sentence_en: Option<String>,
    pub example_sentence_vi: Option<String>,
    pub additional_sense_count: i64,
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

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartFlashcardSessionInputDto {
    pub deck_id: Option<i64>,
    pub session_length: i64,
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartMultipleChoiceSessionInputDto {
    pub deck_id: Option<i64>,
    pub session_length: i64,
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCardStateInputDto {
    pub due: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub learning_steps: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: String,
    pub last_review: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitFlashcardReviewInputDto {
    pub session_id: i64,
    pub review_card_id: i64,
    pub vocabulary_item_id: i64,
    pub rating: String,
    pub reviewed_at: String,
    pub response_time_ms: Option<i64>,
    pub next_state: ReviewCardStateInputDto,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitMultipleChoiceReviewInputDto {
    pub session_id: i64,
    pub review_card_id: i64,
    pub vocabulary_item_id: i64,
    pub selected_vocabulary_item_id: i64,
    pub rating: String,
    pub reviewed_at: String,
    pub response_time_ms: Option<i64>,
    pub next_state: ReviewCardStateInputDto,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTypeAnswerSessionInputDto {
    pub deck_id: Option<i64>,
    pub session_length: i64,
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitTypeAnswerReviewInputDto {
    pub session_id: i64,
    pub review_card_id: i64,
    pub vocabulary_item_id: i64,
    pub rating: String,
    pub reviewed_at: String,
    pub response_time_ms: Option<i64>,
    pub next_state: ReviewCardStateInputDto,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWeakWordsDrillInputDto {
    pub deck_id: Option<i64>,
    pub session_length: i64,
    pub mode: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WeakWordsDto {
    pub user_id: i64,
    pub deck_id: Option<i64>,
    pub total_count: i64,
    pub high_lapses_count: i64,
    pub high_difficulty_count: i64,
    pub low_stability_count: i64,
    pub items: Vec<SmartReviewQueueItemDto>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteStudySessionInputDto {
    pub session_id: i64,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StudySessionDto {
    pub session_id: i64,
    pub user_id: i64,
    pub deck_id: Option<i64>,
    pub mode: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub total_items: i64,
    pub reviewed_count: i64,
    pub correct_count: i64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub queue: SmartReviewQueueDto,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MultipleChoiceOptionDto {
    pub vocabulary_item_id: i64,
    pub label: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MultipleChoiceQuestionDto {
    pub position: i64,
    pub category: String,
    pub card: ReviewCardDto,
    pub headword: String,
    pub part_of_speech: Option<String>,
    pub ipa_uk: Option<String>,
    pub ipa_us: Option<String>,
    pub definition_en: Option<String>,
    pub definition_vi: Option<String>,
    pub example_sentence_en: Option<String>,
    pub example_sentence_vi: Option<String>,
    pub additional_sense_count: i64,
    pub options: Vec<MultipleChoiceOptionDto>,
    pub correct_vocabulary_item_id: i64,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MultipleChoiceSessionDto {
    pub session_id: i64,
    pub user_id: i64,
    pub deck_id: Option<i64>,
    pub mode: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub total_items: i64,
    pub reviewed_count: i64,
    pub correct_count: i64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub queue: SmartReviewQueueDto,
    pub questions: Vec<MultipleChoiceQuestionDto>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SubmitReviewResultDto {
    pub session: StudySessionProgressDto,
    pub card: ReviewCardDto,
    pub rating: String,
    pub reviewed_at: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StudySessionProgressDto {
    pub session_id: i64,
    pub total_items: i64,
    pub reviewed_count: i64,
    pub correct_count: i64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub ended_at: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StudySessionSummaryDto {
    pub session_id: i64,
    pub user_id: i64,
    pub deck_id: Option<i64>,
    pub mode: String,
    pub started_at: String,
    pub ended_at: String,
    pub total_items: i64,
    pub reviewed_count: i64,
    pub correct_count: i64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub accuracy: i64,
    pub time_spent_seconds: i64,
    pub xp_earned: i64,
}
