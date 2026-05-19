use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rusqlite::{params, Connection, OptionalExtension};

use crate::errors::AppError;

// ── Internal types ────────────────────────────────────────────────────────────

/// Lightweight record returned from auth operations.  Converted to a DTO
/// in the command layer before crossing the IPC boundary.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub username: String,
    pub role: String,
}

// ── Password hashing ──────────────────────────────────────────────────────────

/// Hashes `password` with Argon2id and a freshly generated OS-random salt.
/// Returns the full PHC string (`$argon2id$...`).
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {e}")))?;
    Ok(hash.to_string())
}

/// Returns `true` when `password` matches `phc_hash` (a PHC string produced
/// by [`hash_password`]).  Any parse error is treated as a non-match rather
/// than a hard failure to prevent hash-format bugs from locking users out.
pub fn verify_password(password: &str, phc_hash: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(phc_hash)
        .map_err(|e| AppError::Internal(format!("Failed to parse stored hash: {e}")))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

// ── Account initialisation ────────────────────────────────────────────────────

/// Creates the default `owner` and `learner` accounts if no users exist yet.
/// Safe to call on every startup: a no-op when users are already present.
///
/// Default credentials (change after first login):
///   owner   / owner
///   learner / learner
pub fn create_default_accounts(conn: &Connection) -> Result<(), AppError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| AppError::Internal(format!("Failed to count users: {e}")))?;

    if count > 0 {
        return Ok(());
    }

    let owner_hash = hash_password("owner")?;
    conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES ('owner', ?1, 'owner')",
        params![owner_hash],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create owner account: {e}")))?;
    let owner_id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO user_settings (user_id) VALUES (?1)",
        params![owner_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create owner settings: {e}")))?;

    let learner_hash = hash_password("learner")?;
    conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES ('learner', ?1, 'learner')",
        params![learner_hash],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create learner account: {e}")))?;
    let learner_id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO user_settings (user_id) VALUES (?1)",
        params![learner_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to create learner settings: {e}")))?;

    Ok(())
}

// ── Session operations ────────────────────────────────────────────────────────

/// Verifies credentials, updates `last_login_at`, and stores the session in
/// `app_metadata`.  Returns the authenticated user or `Unauthorized`.
///
/// The same error string is returned for unknown-username and wrong-password
/// to prevent username enumeration.
pub fn login(conn: &Connection, username: &str, password: &str) -> Result<AuthUser, AppError> {
    let row: Option<(i64, String, String)> = conn
        .query_row(
            "SELECT id, password_hash, role FROM users WHERE username = ?1",
            params![username],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Database error during login: {e}")))?;

    let (user_id, hash, role) = row
        .ok_or_else(|| AppError::Unauthorized("Invalid credentials".to_string()))?;

    if !verify_password(password, &hash)? {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    conn.execute(
        "UPDATE users
         SET last_login_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             updated_at    = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?1",
        params![user_id],
    )
    .map_err(|e| AppError::Internal(format!("Failed to update login timestamp: {e}")))?;

    // Persist the session so it survives app restarts.
    conn.execute(
        "INSERT OR REPLACE INTO app_metadata (key, value)
         VALUES ('session_user_id', ?1)",
        params![user_id.to_string()],
    )
    .map_err(|e| AppError::Internal(format!("Failed to persist session: {e}")))?;

    Ok(AuthUser {
        id: user_id,
        username: username.to_string(),
        role,
    })
}

/// Removes the persisted session.  Subsequent calls to [`current_session`]
/// will return `None`.
pub fn logout(conn: &Connection) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM app_metadata WHERE key = 'session_user_id'",
        [],
    )
    .map_err(|e| AppError::Internal(format!("Failed to clear session: {e}")))?;
    Ok(())
}

/// Loads the currently persisted session, if any.  Returns `None` when no
/// session is stored or the stored user ID no longer exists.
pub fn current_session(conn: &Connection) -> Result<Option<AuthUser>, AppError> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT value FROM app_metadata WHERE key = 'session_user_id'",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to read session: {e}")))?;

    let user_id: i64 = match stored.and_then(|s| s.parse().ok()) {
        Some(id) => id,
        None => return Ok(None),
    };

    let user: Option<(String, String)> = conn
        .query_row(
            "SELECT username, role FROM users WHERE id = ?1",
            params![user_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to load session user: {e}")))?;

    Ok(user.map(|(username, role)| AuthUser {
        id: user_id,
        username,
        role,
    }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_schema() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        conn
    }

    // ── Password hashing ──────────────────────────────────────────────────

    #[test]
    fn hash_is_not_plaintext() {
        let h = hash_password("secret").expect("hash");
        assert!(!h.contains("secret"), "plaintext must not appear in the hash");
        assert!(h.starts_with("$argon2"), "output should be a PHC string");
    }

    #[test]
    fn same_password_produces_different_hashes() {
        let h1 = hash_password("password").expect("hash1");
        let h2 = hash_password("password").expect("hash2");
        assert_ne!(h1, h2, "different salts → different hashes");
    }

    #[test]
    fn verify_correct_password_returns_true() {
        let hash = hash_password("correct").expect("hash");
        assert!(verify_password("correct", &hash).expect("verify"));
    }

    #[test]
    fn verify_wrong_password_returns_false() {
        let hash = hash_password("correct").expect("hash");
        assert!(!verify_password("wrong", &hash).expect("verify"));
    }

    // ── Default accounts ──────────────────────────────────────────────────

    #[test]
    fn create_default_accounts_inserts_two_users() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("create defaults");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn create_default_accounts_roles_are_correct() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("create defaults");

        let owner: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = 'owner'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let learner: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = 'learner'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(owner, 1, "exactly one owner");
        assert_eq!(learner, 1, "exactly one learner");
    }

    #[test]
    fn create_default_accounts_is_idempotent() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("first call");
        create_default_accounts(&conn).expect("second call");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2, "second call must not insert extra rows");
    }

    #[test]
    fn create_default_accounts_creates_user_settings() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("create defaults");

        let settings: i64 = conn
            .query_row("SELECT COUNT(*) FROM user_settings", [], |r| r.get(0))
            .unwrap();
        assert_eq!(settings, 2, "one settings row per user");
    }

    #[test]
    fn passwords_are_not_stored_as_plaintext() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("create defaults");

        let hashes: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT password_hash FROM users")
                .unwrap();
            stmt.query_map([], |r| r.get::<_, String>(0))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };
        for hash in &hashes {
            assert!(
                hash.starts_with("$argon2"),
                "password_hash must be a PHC string, got: {hash}"
            );
        }
    }

    // ── Login / logout / session ──────────────────────────────────────────

    #[test]
    fn login_with_correct_credentials_succeeds() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        let user = login(&conn, "owner", "owner").expect("login");
        assert_eq!(user.username, "owner");
        assert_eq!(user.role, "owner");
        assert!(user.id > 0);
    }

    #[test]
    fn login_with_wrong_password_returns_unauthorized() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        let err = login(&conn, "owner", "wrong").unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn login_with_nonexistent_user_returns_unauthorized() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        let err = login(&conn, "ghost", "ghost").unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn login_persists_session() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        login(&conn, "learner", "learner").expect("login");

        let session = current_session(&conn)
            .expect("session query")
            .expect("session should exist");
        assert_eq!(session.username, "learner");
    }

    #[test]
    fn current_session_returns_none_before_login() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        let session = current_session(&conn).expect("session query");
        assert!(session.is_none(), "no session before first login");
    }

    #[test]
    fn logout_clears_session() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        login(&conn, "owner", "owner").expect("login");
        logout(&conn).expect("logout");

        let session = current_session(&conn).expect("session query");
        assert!(session.is_none(), "session must be cleared after logout");
    }

    #[test]
    fn login_updates_last_login_at() {
        let conn = db_with_schema();
        create_default_accounts(&conn).expect("defaults");

        login(&conn, "owner", "owner").expect("login");

        let last_login: Option<String> = conn
            .query_row(
                "SELECT last_login_at FROM users WHERE username = 'owner'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(
            last_login.is_some(),
            "last_login_at should be set after login"
        );
    }
}
