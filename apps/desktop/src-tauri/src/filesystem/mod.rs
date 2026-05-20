use std::path::PathBuf;

/// Resolved file-system paths derived from the OS app-data directory at
/// runtime. The root (`app_data_dir`) is provided by Tauri's path resolver
/// and is platform-specific (e.g. `%APPDATA%\com.kieran.lexora` on Windows).
///
/// All database and cache files live inside this directory — never inside the
/// source or build tree.
#[derive(Clone, Debug)]
pub struct AppPaths {
    pub app_data_dir: PathBuf,
}

impl AppPaths {
    /// Path to the per-user SQLite database.
    pub fn user_db(&self) -> PathBuf {
        self.app_data_dir.join("user.db")
    }

    /// Path to the optional read-only content pack database.
    /// Created/updated by content import; absent on a fresh install.
    #[allow(dead_code)]
    pub fn content_db(&self) -> PathBuf {
        self.app_data_dir.join("content.db")
    }

    /// Default directory for user-created deck JSON exports.
    pub fn exports_dir(&self) -> PathBuf {
        self.app_data_dir.join("exports")
    }

    /// Default directory for user-created and scheduled local backups.
    pub fn backups_dir(&self) -> PathBuf {
        self.app_data_dir.join("backups")
    }

    /// Root directory for locally cached pronunciation audio files.
    /// Relative audio paths from the pronunciations table are resolved
    /// against this directory.
    pub fn audio_cache_dir(&self) -> PathBuf {
        self.app_data_dir.join("audio_cache")
    }
}
