pub mod achievements;
pub mod admin;
pub mod analytics;
/// Data-transfer objects (DTOs) serialised over the Tauri IPC bridge.
///
/// Each sub-module mirrors a domain area and is consumed by the TypeScript
/// layer. Keep DTOs flat and free of Rust-only types.
pub mod audio;
pub mod auth;
pub mod db;
pub mod decks;
pub mod import_export;
pub mod info;
pub mod progress;
pub mod review;
pub mod search;
pub mod settings;
pub mod words;
