pub mod achievements;
/// Tauri command handlers exposed to the frontend via `invoke()`.
///
/// Each sub-module groups commands by domain. Register every public command
/// function in the `invoke_handler!` macro inside `lib.rs`.
pub mod admin;
pub mod analytics;
pub mod audio;
pub mod auth;
pub mod backup;
pub mod db;
pub mod decks;
pub mod import_export;
pub mod info;
pub mod notifications;
pub mod progress;
pub mod review;
pub mod search;
pub mod settings;
pub mod updates;
pub mod words;
