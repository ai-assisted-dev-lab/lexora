use rusqlite::{params, Connection};
use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::settings::{PronunciationSettingsDto, UpdatePronunciationSettingsDto};
use crate::errors::AppError;

fn validate(input: &UpdatePronunciationSettingsDto) -> Result<(), AppError> {
    if !matches!(input.pronunciation_accent.as_str(), "us" | "uk" | "neutral") {
        return Err(AppError::Validation(
            "pronunciationAccent must be us, uk, or neutral".to_string(),
        ));
    }

    if !(0.5..=1.5).contains(&input.pronunciation_speed) || !input.pronunciation_speed.is_finite() {
        return Err(AppError::Validation(
            "pronunciationSpeed must be between 0.5 and 1.5".to_string(),
        ));
    }

    if !matches!(input.audio_priority.as_str(), "local_first" | "tts_first") {
        return Err(AppError::Validation(
            "audioPriority must be local_first or tts_first".to_string(),
        ));
    }

    if !matches!(
        input.audio_fallback_behavior.as_str(),
        "browser_tts" | "online_then_browser" | "disabled"
    ) {
        return Err(AppError::Validation(
            "audioFallbackBehavior must be browser_tts, online_then_browser, or disabled"
                .to_string(),
        ));
    }

    Ok(())
}

fn settings_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<PronunciationSettingsDto> {
    let audio_autoplay: i64 = row.get(1)?;
    Ok(PronunciationSettingsDto {
        user_id: row.get(0)?,
        audio_autoplay: audio_autoplay != 0,
        pronunciation_accent: row.get(2)?,
        pronunciation_speed: row.get(3)?,
        audio_priority: row.get(4)?,
        audio_fallback_behavior: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn get_pronunciation_settings_for_user(
    conn: &Connection,
    user_id: i64,
) -> Result<PronunciationSettingsDto, AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user settings: {e}")))?;

    conn.query_row(
        "SELECT user_id, audio_autoplay, pronunciation_accent, pronunciation_speed,
                audio_priority, audio_fallback_behavior, updated_at
         FROM user_settings
         WHERE user_id = ?1",
        params![user_id],
        settings_from_row,
    )
    .map_err(|e| AppError::Internal(format!("Failed to load pronunciation settings: {e}")))
}

fn update_pronunciation_settings_for_user(
    conn: &Connection,
    user_id: i64,
    input: UpdatePronunciationSettingsDto,
) -> Result<PronunciationSettingsDto, AppError> {
    validate(&input)?;

    conn.execute(
        "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to ensure user settings: {e}")))?;

    conn.execute(
        "UPDATE user_settings
         SET audio_autoplay = ?2,
             pronunciation_accent = ?3,
             pronunciation_speed = ?4,
             audio_priority = ?5,
             audio_fallback_behavior = ?6,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE user_id = ?1",
        params![
            user_id,
            if input.audio_autoplay { 1 } else { 0 },
            input.pronunciation_accent,
            input.pronunciation_speed,
            input.audio_priority,
            input.audio_fallback_behavior,
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to save pronunciation settings: {e}")))?;

    get_pronunciation_settings_for_user(conn, user_id)
}

#[tauri::command]
pub fn get_pronunciation_settings(
    db: State<'_, DbConn>,
) -> Result<PronunciationSettingsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    get_pronunciation_settings_for_user(&conn, user.id)
}

#[tauri::command]
pub fn update_pronunciation_settings(
    input: UpdatePronunciationSettingsDto,
    db: State<'_, DbConn>,
) -> Result<PronunciationSettingsDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;

    update_pronunciation_settings_for_user(&conn, user.id, input)
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

    fn valid_input() -> UpdatePronunciationSettingsDto {
        UpdatePronunciationSettingsDto {
            audio_autoplay: false,
            pronunciation_accent: "uk".to_string(),
            pronunciation_speed: 0.85,
            audio_priority: "tts_first".to_string(),
            audio_fallback_behavior: "online_then_browser".to_string(),
        }
    }

    #[test]
    fn defaults_are_available_for_existing_user() {
        let (conn, user_id) = db_with_user();

        let settings = get_pronunciation_settings_for_user(&conn, user_id).expect("settings");

        assert!(settings.audio_autoplay);
        assert_eq!(settings.pronunciation_accent, "us");
        assert_eq!(settings.pronunciation_speed, 1.0);
        assert_eq!(settings.audio_priority, "local_first");
        assert_eq!(settings.audio_fallback_behavior, "browser_tts");
    }

    #[test]
    fn update_persists_pronunciation_settings() {
        let (conn, user_id) = db_with_user();

        let saved =
            update_pronunciation_settings_for_user(&conn, user_id, valid_input()).expect("save");
        let loaded = get_pronunciation_settings_for_user(&conn, user_id).expect("load");

        assert!(!saved.audio_autoplay);
        assert_eq!(loaded.pronunciation_accent, "uk");
        assert_eq!(loaded.pronunciation_speed, 0.85);
        assert_eq!(loaded.audio_priority, "tts_first");
        assert_eq!(loaded.audio_fallback_behavior, "online_then_browser");
    }

    #[test]
    fn invalid_speed_is_rejected() {
        let (conn, user_id) = db_with_user();
        let mut input = valid_input();
        input.pronunciation_speed = 2.0;

        let result = update_pronunciation_settings_for_user(&conn, user_id, input);

        assert!(matches!(result, Err(AppError::Validation(_))));
    }
}
