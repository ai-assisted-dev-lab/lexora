use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PronunciationSettingsDto {
    pub user_id: i64,
    pub audio_autoplay: bool,
    pub pronunciation_accent: String,
    pub pronunciation_speed: f64,
    pub audio_priority: String,
    pub audio_fallback_behavior: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePronunciationSettingsDto {
    pub audio_autoplay: bool,
    pub pronunciation_accent: String,
    pub pronunciation_speed: f64,
    pub audio_priority: String,
    pub audio_fallback_behavior: String,
}
