/// Tauri command handlers exposed to the frontend via `invoke()`.
///
/// Each sub-module groups commands by domain. Register every public command
/// function in the `invoke_handler!` macro inside `lib.rs`.
pub mod db;
pub mod info;
