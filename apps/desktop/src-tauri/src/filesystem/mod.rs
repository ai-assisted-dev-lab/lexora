use std::path::PathBuf;

/// Resolved file-system paths derived from the OS app-data directory at
/// runtime. The root (`app_data_dir`) is provided by Tauri's path resolver
/// and is platform-specific (e.g. `%APPDATA%\com.kieran.lexora` on Windows).
///
/// All database and cache files live inside this directory — never inside the
/// source or build tree.
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
}
