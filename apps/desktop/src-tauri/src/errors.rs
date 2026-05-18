use serde::Serialize;
use thiserror::Error;

/// Structured error type shared across all Tauri commands.
///
/// Serialises as `{"kind": "<variant>", "message": "<text>"}` so the
/// TypeScript layer can discriminate on `kind` and surface `message` in UI.
// Variants are defined now but constructed in later milestones.
#[allow(dead_code)]
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Unauthorized(String),

    #[error("{0}")]
    Internal(String),

    #[error("{0}")]
    Validation(String),
}
