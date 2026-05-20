use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettingsDto {
    pub user_id: i64,
    pub notification_enabled: bool,
    pub in_app_reminders_enabled: bool,
    pub due_review_notifications_enabled: bool,
    pub streak_notifications_enabled: bool,
    pub reminder_time: String,
    pub reminder_days_of_week: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotificationSettingsDto {
    pub notification_enabled: bool,
    pub in_app_reminders_enabled: bool,
    pub due_review_notifications_enabled: bool,
    pub streak_notifications_enabled: bool,
    pub reminder_time: String,
    pub reminder_days_of_week: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EvaluateRemindersInputDto {
    pub local_date: Option<String>,
    pub local_time: Option<String>,
    pub force: Option<bool>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InAppReminderDto {
    pub id: i64,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub action_label: Option<String>,
    pub route: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReminderEvaluationDto {
    pub reminders: Vec<InAppReminderDto>,
    pub new_reminders: Vec<InAppReminderDto>,
    pub due_review_count: i64,
    pub daily_goal_cards: i64,
    pub today_cards_reviewed: i64,
    pub current_streak: i64,
    pub settings: NotificationSettingsDto,
    pub evaluated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationDispatchResultDto {
    pub reminder: InAppReminderDto,
    pub os_status: String,
    pub message: String,
}
