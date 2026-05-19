/// Data-transfer objects (DTOs) serialised over the Tauri IPC bridge.
///
/// Each sub-module mirrors a domain area and is consumed by the TypeScript
/// layer. Keep DTOs flat and free of Rust-only types.
pub mod auth;
pub mod db;
pub mod decks;
pub mod import_export;
pub mod info;
pub mod words;
