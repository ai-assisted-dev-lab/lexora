use serde::Serialize;

use crate::dto::progress::DailyProgressPointDto;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MasteryDistributionDto {
    pub new_count: i64,
    pub learning_count: i64,
    pub reviewing_count: i64,
    pub mastered_count: i64,
    pub total: i64,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WeakWordDto {
    pub word: String,
    pub deck_name: String,
    pub total_reviews: i64,
    pub accuracy: i64,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeckBreakdownDto {
    pub deck_name: String,
    pub words_reviewed: i64,
    pub accuracy: i64,
    pub total_reviews: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsDto {
    pub mastery: MasteryDistributionDto,
    pub weak_words: Vec<WeakWordDto>,
    pub deck_breakdown: Vec<DeckBreakdownDto>,
    pub monthly_activity: Vec<DailyProgressPointDto>,
}
