use tauri::State;

use crate::auth;
use crate::db::DbConn;
use crate::dto::auth::LoginResultDto;
use crate::errors::AppError;

/// Verifies `username` + `password` against the stored Argon2 hash.
/// On success, persists the session in `app_metadata` and returns a safe
/// user DTO.  Returns `Unauthorized` for any credential failure (wrong
/// password or unknown username) to prevent username enumeration.
#[tauri::command]
pub fn login_user(
    username: String,
    password: String,
    db: State<'_, DbConn>,
) -> Result<LoginResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    auth::login(&conn, &username, &password).map(LoginResultDto::from)
}

/// Clears the persisted session.  The frontend should redirect to `/login`
/// after calling this command.
#[tauri::command]
pub fn logout_user(db: State<'_, DbConn>) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    auth::logout(&conn)
}

/// Returns the currently persisted session, if any.  Called on app startup
/// by the frontend to restore the last active user without re-entering
/// credentials.
#[tauri::command]
pub fn get_current_session(db: State<'_, DbConn>) -> Result<Option<LoginResultDto>, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    auth::current_session(&conn).map(|opt| opt.map(LoginResultDto::from))
}

/// Ensures the default `owner` and `learner` accounts exist.  A no-op when
/// any user accounts are already present.  Also called automatically from
/// app startup so the app is usable on first launch without this command.
#[tauri::command]
pub fn init_default_accounts(db: State<'_, DbConn>) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    auth::create_default_accounts(&conn)
}

/// Changes the password of the currently authenticated user. Verifies
/// `current_password` against the stored hash before writing the new one.
/// Returns `Unauthorized` for credential mismatches and `Validation` for
/// password policy failures.
#[tauri::command]
pub fn change_password(
    current_password: String,
    new_password: String,
    db: State<'_, DbConn>,
) -> Result<(), AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    let user = auth::require_session(&conn)?;
    auth::change_password(&conn, user.id, &current_password, &new_password)
}

/// Reports whether the currently authenticated account still uses its
/// seeded default password. Drives the first-run security banner shown in
/// the UI until owners rotate the placeholder credentials.
#[tauri::command]
pub fn account_uses_default_password(db: State<'_, DbConn>) -> Result<bool, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;

    let user = auth::require_session(&conn)?;
    auth::uses_default_password(&conn, user.id)
}
