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

            // Run pending migrations, then load bundled seed data.
            {
                let mut conn = db.conn.lock()
                    .map_err(|e| errors::AppError::Internal(format!("DB mutex poisoned: {e}")))?;
                db::migrations::run(&mut conn)?;
                db::seeder::load_bundled(&mut conn)?;
            }

            app.manage(db);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::info::get_app_info,
            commands::db::db_health_check,
            commands::db::get_schema_version,
            commands::decks::list_seeded_decks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
