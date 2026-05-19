use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tauri::State;

use crate::{dto::audio::AudioCacheStatusDto, errors::AppError, filesystem::AppPaths};

/// Rejects any path that could escape the cache directory.
fn validate_relative_path(path: &str) -> Result<(), AppError> {
    if path.contains("..") || path.starts_with('/') || path.starts_with('\\') {
        return Err(AppError::Validation(
            "Audio path must be a safe relative path with no directory traversal".into(),
        ));
    }
    Ok(())
}

/// Returns the absolute path to the audio cache directory, creating it on demand.
///
/// The frontend stores this path for display purposes; it is not used for
/// playback — file data is served through `read_cached_audio`.
#[tauri::command]
pub fn get_audio_cache_path(paths: State<'_, AppPaths>) -> Result<String, AppError> {
    let cache_dir = paths.audio_cache_dir();
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| AppError::Internal(format!("Cannot create audio cache directory: {e}")))?;
    Ok(cache_dir.to_string_lossy().into_owned())
}

/// Checks whether a relative audio path is present in the local cache and
/// returns metadata about the cached file if it exists.
#[tauri::command]
pub fn check_audio_cached(
    relative_path: String,
    paths: State<'_, AppPaths>,
) -> Result<AudioCacheStatusDto, AppError> {
    validate_relative_path(&relative_path)?;
    let file_path = paths.audio_cache_dir().join(&relative_path);
    let cached = file_path.exists();
    let (absolute_path, file_size_bytes) = if cached {
        let size = std::fs::metadata(&file_path).map(|m| m.len()).ok();
        (Some(file_path.to_string_lossy().into_owned()), size)
    } else {
        (None, None)
    };
    Ok(AudioCacheStatusDto {
        relative_path,
        cached,
        absolute_path,
        file_size_bytes,
    })
}

/// Reads a locally cached audio file and returns its content as a base64-encoded
/// string so the frontend can construct a Blob URL for the Web Audio API.
///
/// Returns `NotFound` when the file does not exist in the cache.
/// Returns `Validation` for any path that attempts directory traversal.
#[tauri::command]
pub fn read_cached_audio(
    relative_path: String,
    paths: State<'_, AppPaths>,
) -> Result<String, AppError> {
    validate_relative_path(&relative_path)?;
    let file_path = paths.audio_cache_dir().join(&relative_path);
    if !file_path.exists() {
        return Err(AppError::NotFound(format!(
            "Audio file not in local cache: {relative_path}"
        )));
    }
    let bytes = std::fs::read(&file_path)
        .map_err(|e| AppError::Internal(format!("Failed to read audio file: {e}")))?;
    Ok(BASE64.encode(bytes))
}
