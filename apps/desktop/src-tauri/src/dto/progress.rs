use serde::Serialize;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DailyProgressPointDto {
    pub date: String,
    pub cards_reviewed: i64,
    pub xp_earned: i64,
    pub goal_met: bool,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GamificationSummaryDto {
    pub user_id: i64,
    pub total_xp: i64,
    pub level: i64,
    pub current_level_xp: i64,
    pub next_level_xp: i64,
    pub xp_to_next_level: i64,
    pub current_streak: i64,
    pub longest_streak: i64,
    pub today_date: String,
    pub daily_goal_cards: i64,
    pub today_cards_reviewed: i64,
    pub today_cards_correct: i64,
    pub today_xp_earned: i64,
    pub today_goal_met: bool,
    pub weekly_cards_reviewed: i64,
    pub weekly_xp_earned: i64,
    pub total_sessions: i64,
    pub total_cards_reviewed: i64,
    pub total_cards_correct: i64,
    pub accuracy: i64,
    pub mastered_words: i64,
    pub weekly_activity: Vec<DailyProgressPointDto>,
}
