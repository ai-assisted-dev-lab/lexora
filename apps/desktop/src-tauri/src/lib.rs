mod auth;
mod commands;
mod config;
mod data_quality;
mod db;
mod dto;
mod errors;
mod filesystem;

#[cfg(test)]
mod integration_tests;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            commands::review::ensure_review_cards_for_deck,
            commands::review::get_review_card,
            commands::review::generate_smart_review_queue,
            commands::review::start_flashcard_session,
            commands::review::start_multiple_choice_session,
            commands::review::submit_flashcard_review,
            commands::review::submit_multiple_choice_review,
            commands::review::start_type_answer_session,
            commands::review::submit_type_answer_review,
            commands::review::complete_study_session,
            commands::review::get_weak_words,
            commands::review::start_weak_words_drill,
            commands::progress::get_gamification_summary,
            commands::analytics::get_analytics,
            commands::achievements::get_achievements,
            commands::achievements::record_pronunciation_practice,
            commands::search::search,
            commands::import_export::get_import_export_schema,
            commands::import_export::list_exportable_decks,
            commands::import_export::export_deck_to_json,
            commands::import_export::import_deck_from_json,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::validate_backup,
            commands::backup::restore_backup,
            commands::backup::ensure_scheduled_backup,
            commands::updates::check_app_update,
            commands::updates::check_content_updates,
            commands::auth::login_user,
            commands::auth::logout_user,
            commands::auth::get_current_session,
            commands::auth::init_default_accounts,
            commands::auth::change_password,
            commands::auth::account_uses_default_password,
            commands::settings::get_pronunciation_settings,
            commands::settings::update_pronunciation_settings,
            commands::notifications::get_notification_settings,
            commands::notifications::update_notification_settings,
            commands::notifications::evaluate_reminders,
            commands::notifications::dismiss_in_app_reminder,
            commands::notifications::send_test_notification,
            commands::admin::get_admin_stats,
            commands::admin::admin_list_vocabulary,
            commands::admin::admin_get_vocabulary_item,
            commands::admin::admin_update_vocabulary_item,
            commands::admin::admin_list_decks,
            commands::admin::admin_get_validation_summary,
            commands::admin::admin_run_data_quality_scan,
            commands::admin::admin_list_data_quality_issues,
            commands::admin::admin_get_data_quality_summary,
            commands::audio::get_audio_cache_path,
            commands::audio::check_audio_cached,
            commands::audio::read_cached_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
