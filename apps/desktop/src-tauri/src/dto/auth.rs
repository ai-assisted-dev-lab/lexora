use serde::Serialize;

use crate::auth::AuthUser;

/// Safe user representation returned over the IPC bridge.
/// Never contains the password hash or any internal DB IDs beyond user_id.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResultDto {
    pub user_id: i64,
    pub username: String,
    /// `"owner"` or `"learner"`
    pub role: String,
}

impl From<AuthUser> for LoginResultDto {
    fn from(u: AuthUser) -> Self {
        Self {
            user_id: u.id,
            username: u.username,
            role: u.role,
        }
    }
}
