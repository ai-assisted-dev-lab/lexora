use serde::Serialize;

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AchievementDto {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub state: String,
    pub tier: String,
    pub xp_reward: i64,
    pub unlocked_at: Option<String>,
    pub progress: Option<i64>,
    pub progress_label: Option<String>,
    pub icon_name: String,
    pub hidden: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AchievementUnlockDto {
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub tier: String,
    pub xp_reward: i64,
    pub icon_name: String,
    pub unlocked_at: String,
    pub hidden: bool,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AchievementsPageDto {
    pub achievements: Vec<AchievementDto>,
    pub total: i64,
    pub unlocked: i64,
    pub in_progress: i64,
    pub hidden_locked: i64,
}
