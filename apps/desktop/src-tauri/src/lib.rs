mod auth;
mod commands;
mod config;
mod db;
mod dto;
mod errors;
mod filesystem;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Resolve and create the app-data directory.
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            // Open (or create) the per-user SQLite database.
            let paths = filesystem::AppPaths { app_data_dir };
            let db = db::open(&paths.user_db())?;

            // Run pending migrations, seed demo data, and initialise default accounts.
            {
                let mut conn = db
                    .conn
                    .lock()
                    .map_err(|e| errors::AppError::Internal(format!("DB mutex poisoned: {e}")))?;
                db::migrations::run(&mut conn)?;
                db::seeder::load_bundled(&mut conn)?;
                auth::create_default_accounts(&conn)?;
            }

            app.manage(db);
            app.manage(paths);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::info::get_app_info,
            commands::db::db_health_check,
            commands::db::get_schema_version,
            commands::decks::list_seeded_decks,
            commands::decks::list_discover_decks,
            commands::decks::list_library_decks,
            commands::decks::get_deck_detail,
            commands::decks::install_deck,
            commands::decks::uninstall_deck,
            commands::words::get_word_detail,
            commands::import_export::get_import_export_schema,
            commands::import_export::list_exportable_decks,
            commands::import_export::export_deck_to_json,
            commands::import_export::import_deck_from_json,
            commands::auth::login_user,
            commands::auth::logout_user,
            commands::auth::get_current_session,
            commands::auth::init_default_accounts,
            commands::admin::get_admin_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
