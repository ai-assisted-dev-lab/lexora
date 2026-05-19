use serde::Serialize;

/// Status of a single relative audio path in the local cache.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioCacheStatusDto {
    /// The relative path as stored in the pronunciations table.
    pub relative_path: String,
    /// Whether the file exists on disk in the audio cache directory.
    pub cached: bool,
    /// Absolute path to the cached file (present only when `cached` is true).
    pub absolute_path: Option<String>,
    /// Size of the cached file in bytes (present only when `cached` is true).
    pub file_size_bytes: Option<u64>,
}
