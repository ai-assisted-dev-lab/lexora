use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::notifications::{
    EvaluateRemindersInputDto, InAppReminderDto, NotificationDispatchResultDto,
    NotificationSettingsDto, ReminderEvaluationDto, UpdateNotificationSettingsDto,
};
use crate::errors::AppError;

const DEFAULT_DAYS_OF_WEEK: &str = "1111111";

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn validate_time(value: &str) -> Result<(), AppError> {
    let parts: Vec<&str> = value.split(':').collect();
    if parts.len() != 2 || parts[0].len() != 2 || parts[1].len() != 2 {
        return Err(AppError::Validation(
            "reminderTime must use HH:MM format".to_string(),
        ));
    }
    let hour = parts[0].parse::<u32>().map_err(|_| {
        AppError::Validation("reminderTime must use HH:MM format".to_string())
    })?;
    let minute = parts[1].parse::<u32>().map_err(|_| {
        AppError::Validation("reminderTime must use HH:MM format".to_string())
    })?;
    if hour > 23 || minute > 59 {
        return Err(AppError::Validation(
            "reminderTime must be a valid local time".to_string(),
        ));
    }
    Ok(())
}

fn validate_local_date(value: &str) -> Result<(), AppError> {
    if value.len() == 10
        && value.chars().enumerate().all(|(index, ch)| {
            matches!(index, 4 | 7) && ch == '-' || !matches!(index, 4 | 7) && ch.is_ascii_digit()
        })
    {
        Ok(())
    } else {
        Err(AppError::Validation(
            "localDate must use YYYY-MM-DD format".to_string(),
        ))
    }
}

fn validate_days_of_week(value: &str) -> Result<(), AppError> {
    if value.len() == 7 && value.chars().all(|ch| matches!(ch, '0' | '1')) {
        Ok(())
    } else {
        Err(AppError::Validation(
            "reminderDaysOfWeek must be seven 0/1 characters from Monday to Sunday".to_string(),
        ))
    }
}

fn ensure_user_settings(conn: &Connection, user_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user settings: {e}")))?;

    conn.execute(
        "INSERT INTO reminders (user_id, remind_at, enabled, days_of_week)
         SELECT ?1,
                COALESCE((SELECT notification_time FROM user_settings WHERE user_id = ?1), '08:00'),
                COALESCE((SELECT notification_enabled FROM user_settings WHERE user_id = ?1), 1),
                ?2
         WHERE NOT EXISTS (SELECT 1 FROM reminders WHERE user_id = ?1)",
        params![user_id, DEFAULT_DAYS_OF_WEEK],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure reminder row: {e}")))?;

    Ok(())
}

fn settings_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<NotificationSettingsDto> {
    let notification_enabled: i64 = row.get(1)?;
    let in_app_reminders_enabled: i64 = row.get(2)?;
    let due_review_notifications_enabled: i64 = row.get(3)?;
    let streak_notifications_enabled: i64 = row.get(4)?;

    Ok(NotificationSettingsDto {
        user_id: row.get(0)?,
        notification_enabled: notification_enabled != 0,
        in_app_reminders_enabled: in_app_reminders_enabled != 0,
        due_review_notifications_enabled: due_review_notifications_enabled != 0,
        streak_notifications_enabled: streak_notifications_enabled != 0,
        reminder_time: row.get(5)?,
        reminder_days_of_week: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn get_notification_settings_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<NotificationSettingsDto, AppError> {
    ensure_user_settings(conn, user_id)?;

    conn.query_row(
        "SELECT us.user_id,
                us.notification_enabled,
                us.in_app_reminders_enabled,
                us.due_review_notifications_enabled,
                us.streak_notifications_enabled,
                COALESCE(r.remind_at, us.notification_time, '08:00') AS reminder_time,
                COALESCE(r.days_of_week, ?2) AS reminder_days_of_week,
                us.updated_at
         FROM user_settings us
         LEFT JOIN reminders r ON r.user_id = us.user_id
         WHERE us.user_id = ?1
         ORDER BY r.id ASC
         LIMIT 1",
        params![user_id, DEFAULT_DAYS_OF_WEEK],
        settings_from_row,
    )
    .map_err(|e| AppError::Internal(format!("Failed to load notification settings: {e}")))
}

fn update_notification_settings_for_user(
    conn: &Connection,
    user_id: i64,
    input: UpdateNotificationSettingsDto,
) -> Result<NotificationSettingsDto, AppError> {
    validate_time(&input.reminder_time)?;
    let days = input
        .reminder_days_of_week
        .unwrap_or_else(|| DEFAULT_DAYS_OF_WEEK.to_string());
    validate_days_of_week(&days)?;
    ensure_user_settings(conn, user_id)?;

    conn.execute(
        "UPDATE user_settings
         SET notification_enabled = ?2,
             in_app_reminders_enabled = ?3,
             due_review_notifications_enabled = ?4,
             streak_notifications_enabled = ?5,
             notification_time = ?6,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE user_id = ?1",
        params![
            user_id,
            bool_to_i64(input.notification_enabled),
            bool_to_i64(input.in_app_reminders_enabled),
            bool_to_i64(input.due_review_notifications_enabled),
            bool_to_i64(input.streak_notifications_enabled),
            input.reminder_time,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to save notification settings: {e}")))?;

    conn.execute(
        "UPDATE reminders
         SET remind_at = ?2,
             enabled = ?3,
             days_of_week = ?4,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE user_id = ?1",
        params![
            user_id,
            input.reminder_time,
            bool_to_i64(input.notification_enabled),
            days,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to save reminder row: {e}")))?;

    get_notification_settings_for_user(conn, user_id)
}

fn local_date(conn: &Connection, input: Option<&str>) -> Result<String, AppError> {
    if let Some(value) = input {
        validate_local_date(value)?;
        return Ok(value.to_string());
    }
    conn.query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to resolve local date: {e}")))
}

fn local_time(conn: &Connection, input: Option<&str>) -> Result<String, AppError> {
    if let Some(value) = input {
        validate_time(value)?;
        return Ok(value.to_string());
    }
    conn.query_row("SELECT substr(time('now', 'localtime'), 1, 5)", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to resolve local time: {e}")))
}

fn evaluated_at(conn: &Connection) -> Result<String, AppError> {
    conn.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to resolve current timestamp: {e}")))
}

fn day_enabled(conn: &Connection, local_date: &str, days_of_week: &str) -> Result<bool, AppError> {
    let weekday: Option<String> = conn
        .query_row(
            "SELECT strftime('%w', ?1)",
            params![local_date],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to resolve weekday: {e}")))?;
    let weekday = weekday
        .and_then(|value| value.parse::<usize>().ok())
        .ok_or_else(|| AppError::Validation("localDate must be a valid date".to_string()))?;
    let index = if weekday == 0 { 6 } else { weekday - 1 };
    Ok(days_of_week
        .as_bytes()
        .get(index)
        .is_some_and(|value| *value == b'1'))
}

fn due_review_count(conn: &Connection, user_id: i64) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COUNT(*)
         FROM review_cards
         WHERE user_id = ?1
           AND state != 'new'
           AND due <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![user_id],
        |row| row.get(0),
    )
    .map_err(|e| AppError::Internal(format!("Failed to count due reviews: {e}")))
}

fn daily_goal_cards(conn: &Connection, user_id: i64) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT daily_goal_cards FROM user_settings WHERE user_id = ?1",
        params![user_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|goal| goal.max(1))
    .map_err(|e| AppError::Internal(format!("Failed to load daily goal: {e}")))
}

fn today_cards_reviewed(
    conn: &Connection,
    user_id: i64,
    local_date: &str,
) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COALESCE(cards_reviewed, 0)
         FROM user_progress
         WHERE user_id = ?1 AND date = ?2",
        params![user_id, local_date],
        |row| row.get(0),
    )
    .optional()
    .map(|value| value.unwrap_or(0))
    .map_err(|e| AppError::Internal(format!("Failed to load today's progress: {e}")))
}

fn current_streak(conn: &Connection, user_id: i64) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COALESCE(current_streak, 0) FROM user_xp WHERE user_id = ?1",
        params![user_id],
        |row| row.get(0),
    )
    .optional()
    .map(|value| value.unwrap_or(0))
    .map_err(|e| AppError::Internal(format!("Failed to load current streak: {e}")))
}

fn reminder_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<InAppReminderDto> {
    Ok(InAppReminderDto {
        id: row.get(0)?,
        kind: row.get(1)?,
        title: row.get(2)?,
        body: row.get(3)?,
        action_label: row.get(4)?,
        route: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn active_reminders(conn: &Connection, user_id: i64) -> Result<Vec<InAppReminderDto>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, kind, title, body, action_label, route, created_at
             FROM notification_events
             WHERE user_id = ?1 AND status = 'active'
             ORDER BY created_at DESC, id DESC
             LIMIT 20",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare reminders query: {e}")))?;

    stmt.query_map(params![user_id], reminder_from_row)
        .map_err(|e| AppError::Internal(format!("Failed to query reminders: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read reminders: {e}")))
}

struct ReminderDraft<'a> {
    kind: &'a str,
    title: String,
    body: String,
    action_label: &'a str,
    route: &'a str,
    dedupe_key: String,
    delivery: &'a str,
}

fn insert_reminder(
    conn: &Connection,
    user_id: i64,
    draft: ReminderDraft<'_>,
) -> Result<Option<InAppReminderDto>, AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO notification_events (
             user_id, kind, title, body, action_label, route, delivery, dedupe_key
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            user_id,
            draft.kind,
            draft.title,
            draft.body,
            draft.action_label,
            draft.route,
            draft.delivery,
            draft.dedupe_key,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create reminder: {e}")))?;

    if conn.changes() == 0 {
        return Ok(None);
    }

    conn.query_row(
        "SELECT id, kind, title, body, action_label, route, created_at
         FROM notification_events
         WHERE user_id = ?1 AND kind = ?2 AND dedupe_key = ?3",
        params![user_id, draft.kind, draft.dedupe_key],
        reminder_from_row,
    )
    .optional()
    .map_err(|e| AppError::Internal(format!("Failed to load created reminder: {e}")))
}

fn evaluate_reminders_for_user(
    conn: &Connection,
    user_id: i64,
    input: EvaluateRemindersInputDto,
) -> Result<ReminderEvaluationDto, AppError> {
    let settings = get_notification_settings_for_user(conn, user_id)?;
    let date = local_date(conn, input.local_date.as_deref())?;
    let time = local_time(conn, input.local_time.as_deref())?;
    let force = input.force.unwrap_or(false);
    let evaluated_at = evaluated_at(conn)?;
    let due_count = due_review_count(conn, user_id)?;
    let daily_goal = daily_goal_cards(conn, user_id)?;
    let reviewed_today = today_cards_reviewed(conn, user_id, &date)?;
    let streak = current_streak(conn, user_id)?;

    let enabled_today = day_enabled(conn, &date, &settings.reminder_days_of_week)?;
    let time_reached = force || time >= settings.reminder_time;
    let can_create = settings.notification_enabled
        && settings.in_app_reminders_enabled
        && enabled_today
        && time_reached;

    let mut new_reminders = Vec::new();
    if can_create && reviewed_today < daily_goal {
        if let Some(reminder) = insert_reminder(
            conn,
            user_id,
            ReminderDraft {
                kind: "daily_goal",
                title: "Daily goal waiting".to_string(),
                body: format!(
                    "You have reviewed {reviewed_today} of {daily_goal} cards today."
                ),
                action_label: "Start review",
                route: "/review",
                dedupe_key: format!("daily_goal:{date}"),
                delivery: "in_app",
            },
        )? {
            new_reminders.push(reminder);
        }
    }

    if can_create && settings.due_review_notifications_enabled && due_count > 0 {
        if let Some(reminder) = insert_reminder(
            conn,
            user_id,
            ReminderDraft {
                kind: "due_review",
                title: "Reviews are due".to_string(),
                body: format!("{due_count} review card{} ready now.", if due_count == 1 { " is" } else { "s are" }),
                action_label: "Review now",
                route: "/review",
                dedupe_key: format!("due_review:{date}"),
                delivery: "in_app",
            },
        )? {
            new_reminders.push(reminder);
        }
    }

    if can_create && settings.streak_notifications_enabled && streak > 0 && reviewed_today < daily_goal {
        if let Some(reminder) = insert_reminder(
            conn,
            user_id,
            ReminderDraft {
                kind: "streak",
                title: "Keep your streak".to_string(),
                body: format!("Your {streak}-day streak needs today's goal to stay active."),
                action_label: "Study today",
                route: "/review",
                dedupe_key: format!("streak:{date}"),
                delivery: "in_app",
            },
        )? {
            new_reminders.push(reminder);
        }
    }

    Ok(ReminderEvaluationDto {
        reminders: active_reminders(conn, user_id)?,
        new_reminders,
        due_review_count: due_count,
        daily_goal_cards: daily_goal,
        today_cards_reviewed: reviewed_today,
        current_streak: streak,
        settings,
        evaluated_at,
    })
}

fn dismiss_in_app_reminder_for_user(
    conn: &Connection,
    user_id: i64,
    reminder_id: i64,
) -> Result<(), AppError> {
    let changed = conn
        .execute(
            "UPDATE notification_events
             SET status = 'dismissed',
                 dismissed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1 AND user_id = ?2",
            params![reminder_id, user_id],
        )
        .map_err(|e| AppError::Internal(format!("Failed to dismiss reminder: {e}")))?;
    if changed == 0 {
        return Err(AppError::NotFound(format!(
            "Reminder {reminder_id} was not found"
        )));
    }
    Ok(())
}

fn send_test_notification_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<NotificationDispatchResultDto, AppError> {
    ensure_user_settings(conn, user_id)?;
    let timestamp = evaluated_at(conn)?;
    let reminder = insert_reminder(
        conn,
        user_id,
        ReminderDraft {
            kind: "test",
            title: "Lexora reminder test".to_string(),
            body: "Notifications are connected. In-app reminders will still work if OS notifications are unavailable.".to_string(),
            action_label: "Open review",
            route: "/review",
            dedupe_key: format!("test:{timestamp}:{user_id}"),
            delivery: "test",
        },
    )?
    .ok_or_else(|| AppError::Internal("Failed to create test reminder".to_string()))?;

    Ok(NotificationDispatchResultDto {
        reminder,
        os_status: "unavailable".to_string(),
        message: "Native Tauri notifications are not installed in this build. The desktop UI will try the local Web Notification API and keep the in-app reminder visible."
            .to_string(),
    })
}

#[tauri::command]
pub fn get_notification_settings(
    db: State<'_, DbConn>,
) -> Result<NotificationSettingsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    get_notification_settings_for_user(&conn, user.id)
}

#[tauri::command]
pub fn update_notification_settings(
    input: UpdateNotificationSettingsDto,
    db: State<'_, DbConn>,
) -> Result<NotificationSettingsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    update_notification_settings_for_user(&conn, user.id, input)
}

#[tauri::command]
pub fn evaluate_reminders(
    input: Option<EvaluateRemindersInputDto>,
    db: State<'_, DbConn>,
) -> Result<ReminderEvaluationDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    evaluate_reminders_for_user(&conn, user.id, input.unwrap_or_default())
}

#[tauri::command]
pub fn dismiss_in_app_reminder(reminder_id: i64, db: State<'_, DbConn>) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    dismiss_in_app_reminder_for_user(&conn, user.id, reminder_id)
}

#[tauri::command]
pub fn send_test_notification(
    db: State<'_, DbConn>,
) -> Result<NotificationDispatchResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    send_test_notification_for_user(&conn, user.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_user() -> (Connection, i64) {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::auth::create_default_accounts(&conn).expect("defaults");
        let user = crate::auth::login(&conn, "learner", "learner").expect("login");
        (conn, user.id)
    }

    fn update_input() -> UpdateNotificationSettingsDto {
        UpdateNotificationSettingsDto {
            notification_enabled: true,
            in_app_reminders_enabled: true,
            due_review_notifications_enabled: true,
            streak_notifications_enabled: true,
            reminder_time: "20:30".to_string(),
            reminder_days_of_week: Some("1111100".to_string()),
        }
    }

    fn insert_due_review(conn: &Connection, user_id: i64) {
        conn.execute("INSERT INTO words (headword) VALUES ('remind')", [])
            .expect("word");
        let word_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO review_cards (user_id, word_id, state, due)
             VALUES (?1, ?2, 'review', '2020-01-01T00:00:00Z')",
            params![user_id, word_id],
        )
        .expect("review card");
    }

    #[test]
    fn defaults_are_available_for_existing_user() {
        let (conn, user_id) = db_with_user();

        let settings = get_notification_settings_for_user(&conn, user_id).expect("settings");

        assert!(settings.notification_enabled);
        assert!(settings.in_app_reminders_enabled);
        assert!(settings.due_review_notifications_enabled);
        assert!(settings.streak_notifications_enabled);
        assert_eq!(settings.reminder_time, "08:00");
        assert_eq!(settings.reminder_days_of_week, DEFAULT_DAYS_OF_WEEK);
    }

    #[test]
    fn update_persists_notification_settings() {
        let (conn, user_id) = db_with_user();

        let saved =
            update_notification_settings_for_user(&conn, user_id, update_input()).expect("save");
        let loaded = get_notification_settings_for_user(&conn, user_id).expect("load");

        assert_eq!(saved.reminder_time, "20:30");
        assert_eq!(loaded.reminder_days_of_week, "1111100");
    }

    #[test]
    fn invalid_time_is_rejected() {
        let (conn, user_id) = db_with_user();
        let mut input = update_input();
        input.reminder_time = "25:00".to_string();

        let result = update_notification_settings_for_user(&conn, user_id, input);

        assert!(matches!(result, Err(AppError::Validation(_))));
    }

    #[test]
    fn due_review_reminder_is_created_from_local_due_data() {
        let (conn, user_id) = db_with_user();
        insert_due_review(&conn, user_id);

        let result = evaluate_reminders_for_user(
            &conn,
            user_id,
            EvaluateRemindersInputDto {
                local_date: Some("2026-05-20".to_string()),
                local_time: Some("21:00".to_string()),
                force: Some(true),
            },
        )
        .expect("evaluate");

        assert_eq!(result.due_review_count, 1);
        assert!(
            result
                .new_reminders
                .iter()
                .any(|reminder| reminder.kind == "due_review")
        );
    }

    #[test]
    fn disabled_notifications_suppress_new_reminders() {
        let (conn, user_id) = db_with_user();
        insert_due_review(&conn, user_id);
        let mut input = update_input();
        input.notification_enabled = false;
        update_notification_settings_for_user(&conn, user_id, input).expect("save");

        let result = evaluate_reminders_for_user(
            &conn,
            user_id,
            EvaluateRemindersInputDto {
                local_date: Some("2026-05-20".to_string()),
                local_time: Some("21:00".to_string()),
                force: Some(true),
            },
        )
        .expect("evaluate");

        assert!(result.new_reminders.is_empty());
        assert!(result.reminders.is_empty());
    }

    #[test]
    fn daily_goal_reminder_is_deduped_per_day() {
        let (conn, user_id) = db_with_user();

        let input = EvaluateRemindersInputDto {
            local_date: Some("2026-05-20".to_string()),
            local_time: Some("21:00".to_string()),
            force: Some(true),
        };
        let first = evaluate_reminders_for_user(&conn, user_id, input.clone()).expect("first");
        let second = evaluate_reminders_for_user(&conn, user_id, input).expect("second");

        assert!(
            first
                .new_reminders
                .iter()
                .any(|reminder| reminder.kind == "daily_goal")
        );
        assert!(
            !second
                .new_reminders
                .iter()
                .any(|reminder| reminder.kind == "daily_goal")
        );
    }

    #[test]
    fn dismiss_hides_active_reminder() {
        let (conn, user_id) = db_with_user();
        let result = evaluate_reminders_for_user(
            &conn,
            user_id,
            EvaluateRemindersInputDto {
                local_date: Some("2026-05-20".to_string()),
                local_time: Some("21:00".to_string()),
                force: Some(true),
            },
        )
        .expect("evaluate");
        let id = result.reminders[0].id;

        dismiss_in_app_reminder_for_user(&conn, user_id, id).expect("dismiss");

        assert!(active_reminders(&conn, user_id).expect("active").is_empty());
    }

    #[test]
    fn test_notification_creates_in_app_fallback() {
        let (conn, user_id) = db_with_user();

        let result = send_test_notification_for_user(&conn, user_id).expect("test notification");

        assert_eq!(result.reminder.kind, "test");
        assert_eq!(result.os_status, "unavailable");
        assert_eq!(active_reminders(&conn, user_id).expect("active").len(), 1);
    }
}
