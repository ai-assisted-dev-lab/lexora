use std::{env, fs};

use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

use crate::{
    config::APP_VERSION,
    dto::updates::{
        AppUpdateCheckInputDto, AppUpdateCheckResultDto, ContentUpdateCheckInputDto,
        ContentUpdateCheckResultDto, ContentUpdatePackageDto,
    },
    errors::AppError,
};

const CONTENT_MANIFEST_SCHEMA: &str = "lexora.content-manifest";
const CONTENT_MANIFEST_SCHEMA_VERSION: u32 = 1;
const TEST_CONTENT_MANIFEST: &str = include_str!("../../content-updates/test-manifest.json");

#[derive(Debug, PartialEq, Eq)]
enum UpdateCheckMode {
    Auto,
    Test,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentUpdateManifest {
    schema: String,
    schema_version: u32,
    manifest_version: String,
    channel: String,
    app: ContentManifestApp,
    packages: Vec<ContentManifestPackage>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentManifestApp {
    min_app_version: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentManifestPackage {
    id: String,
    kind: String,
    version: String,
    title: String,
    required: bool,
    optional: bool,
    size_bytes: u64,
    download_policy: String,
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    input: Option<AppUpdateCheckInputDto>,
) -> Result<AppUpdateCheckResultDto, AppError> {
    let mode = normalize_mode(input.as_ref().and_then(|i| i.mode.as_deref()))?;
    if mode == UpdateCheckMode::Test {
        return Ok(test_app_update_result());
    }

    let endpoint = read_non_empty_env("LEXORA_UPDATE_ENDPOINT");
    let public_key = read_non_empty_env("LEXORA_UPDATE_PUBLIC_KEY");

    if endpoint.is_none() || public_key.is_none() {
        return Ok(AppUpdateCheckResultDto {
            status: "not_configured".to_string(),
            current_version: APP_VERSION.to_string(),
            latest_version: None,
            update_available: false,
            source: "environment".to_string(),
            message: "App update checks need LEXORA_UPDATE_ENDPOINT and LEXORA_UPDATE_PUBLIC_KEY."
                .to_string(),
        });
    }

    let endpoint = endpoint.expect("checked above");
    let endpoint = url::Url::parse(&endpoint)
        .map_err(|e| AppError::Validation(format!("Invalid updater endpoint URL: {e}")))?;
    let public_key = public_key.expect("checked above");
    let update = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![endpoint])
        .map_err(|e| AppError::Internal(format!("Invalid updater endpoint: {e}")))?
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to build updater: {e}")))?
        .check()
        .await
        .map_err(|e| AppError::Internal(format!("App update check failed: {e}")))?;

    if let Some(update) = update {
        Ok(AppUpdateCheckResultDto {
            status: "available".to_string(),
            current_version: update.current_version,
            latest_version: Some(update.version.clone()),
            update_available: true,
            source: "configured-endpoint".to_string(),
            message: format!("Lexora {} is available.", update.version),
        })
    } else {
        Ok(AppUpdateCheckResultDto {
            status: "up_to_date".to_string(),
            current_version: APP_VERSION.to_string(),
            latest_version: None,
            update_available: false,
            source: "configured-endpoint".to_string(),
            message: "Lexora is up to date.".to_string(),
        })
    }
}

#[tauri::command]
pub fn check_content_updates(
    input: Option<ContentUpdateCheckInputDto>,
) -> Result<ContentUpdateCheckResultDto, AppError> {
    let mode = normalize_mode(input.as_ref().and_then(|i| i.mode.as_deref()))?;
    let manifest_path = input
        .as_ref()
        .and_then(|i| i.manifest_path.as_deref())
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .map(str::to_string)
        .or_else(|| read_non_empty_env("LEXORA_CONTENT_UPDATE_MANIFEST"));

    let (source, manifest_json) = if let Some(path) = manifest_path {
        let contents = fs::read_to_string(&path)
            .map_err(|e| AppError::Internal(format!("Failed to read content manifest: {e}")))?;
        (path, contents)
    } else if mode == UpdateCheckMode::Test {
        (
            "bundled-test-manifest".to_string(),
            TEST_CONTENT_MANIFEST.to_string(),
        )
    } else {
        return Ok(ContentUpdateCheckResultDto {
            status: "not_configured".to_string(),
            manifest_version: None,
            channel: None,
            source: "environment".to_string(),
            total_packages: 0,
            required_packages: 0,
            optional_audio_packages: 0,
            required_download_bytes: 0,
            optional_audio_bytes: 0,
            packages: Vec::new(),
            message: "Content update checks need LEXORA_CONTENT_UPDATE_MANIFEST or test mode."
                .to_string(),
        });
    };

    summarize_content_manifest(&manifest_json, source)
}

fn normalize_mode(mode: Option<&str>) -> Result<UpdateCheckMode, AppError> {
    match mode.unwrap_or("auto") {
        "auto" => Ok(UpdateCheckMode::Auto),
        "test" => Ok(UpdateCheckMode::Test),
        other => Err(AppError::Validation(format!(
            "Unsupported update check mode: {other}"
        ))),
    }
}

fn read_non_empty_env(key: &str) -> Option<String> {
    env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn test_app_update_result() -> AppUpdateCheckResultDto {
    let latest_version = read_non_empty_env("LEXORA_TEST_APP_UPDATE_VERSION")
        .unwrap_or_else(|| APP_VERSION.to_string());
    let update_available = is_version_newer(&latest_version, APP_VERSION);
    let status = if update_available {
        "available"
    } else {
        "up_to_date"
    };
    let message = if update_available {
        format!("Test update {latest_version} is available.")
    } else {
        "Test update check completed; Lexora is up to date.".to_string()
    };

    AppUpdateCheckResultDto {
        status: status.to_string(),
        current_version: APP_VERSION.to_string(),
        latest_version: Some(latest_version),
        update_available,
        source: "test-mode".to_string(),
        message,
    }
}

fn summarize_content_manifest(
    manifest_json: &str,
    source: String,
) -> Result<ContentUpdateCheckResultDto, AppError> {
    let manifest: ContentUpdateManifest = serde_json::from_str(manifest_json)
        .map_err(|e| AppError::Validation(format!("Invalid content manifest JSON: {e}")))?;
    validate_manifest(&manifest)?;

    if is_version_newer(&manifest.app.min_app_version, APP_VERSION) {
        return Ok(ContentUpdateCheckResultDto {
            status: "incompatible".to_string(),
            manifest_version: Some(manifest.manifest_version),
            channel: Some(manifest.channel),
            source,
            total_packages: 0,
            required_packages: 0,
            optional_audio_packages: 0,
            required_download_bytes: 0,
            optional_audio_bytes: 0,
            packages: Vec::new(),
            message: format!(
                "Content manifest requires Lexora {} or newer.",
                manifest.app.min_app_version
            ),
        });
    }

    let packages = manifest
        .packages
        .iter()
        .map(|package| ContentUpdatePackageDto {
            id: package.id.clone(),
            kind: package.kind.clone(),
            version: package.version.clone(),
            title: package.title.clone(),
            required: package.required,
            optional: package.optional,
            size_bytes: package.size_bytes,
            download_policy: package.download_policy.clone(),
            audio: package.kind == "audio",
        })
        .collect::<Vec<_>>();

    let required_packages = packages.iter().filter(|p| p.required).count();
    let optional_audio_packages = packages.iter().filter(|p| p.audio && p.optional).count();
    let required_download_bytes = packages
        .iter()
        .filter(|p| p.required)
        .map(|p| p.size_bytes)
        .sum();
    let optional_audio_bytes = packages
        .iter()
        .filter(|p| p.audio && p.optional)
        .map(|p| p.size_bytes)
        .sum();
    let total_packages = packages.len();

    Ok(ContentUpdateCheckResultDto {
        status: if total_packages > 0 {
            "available".to_string()
        } else {
            "empty".to_string()
        },
        manifest_version: Some(manifest.manifest_version),
        channel: Some(manifest.channel),
        source,
        total_packages,
        required_packages,
        optional_audio_packages,
        required_download_bytes,
        optional_audio_bytes,
        packages,
        message: format!(
            "Found {total_packages} package(s); optional audio packages require manual install."
        ),
    })
}

fn validate_manifest(manifest: &ContentUpdateManifest) -> Result<(), AppError> {
    if manifest.schema != CONTENT_MANIFEST_SCHEMA {
        return Err(AppError::Validation(format!(
            "Unsupported content manifest schema: {}",
            manifest.schema
        )));
    }
    if manifest.schema_version != CONTENT_MANIFEST_SCHEMA_VERSION {
        return Err(AppError::Validation(format!(
            "Unsupported content manifest schema version: {}",
            manifest.schema_version
        )));
    }

    for package in &manifest.packages {
        let allowed = matches!(
            package.kind.as_str(),
            "seed_db" | "data_patch" | "catalog" | "audio" | "asset"
        );
        if !allowed {
            return Err(AppError::Validation(format!(
                "Unsupported content package kind: {}",
                package.kind
            )));
        }
        if package.required && package.optional {
            return Err(AppError::Validation(format!(
                "Package {} cannot be both required and optional.",
                package.id
            )));
        }
        if package.kind == "audio" && package.required {
            return Err(AppError::Validation(format!(
                "Audio package {} must be optional.",
                package.id
            )));
        }
        if package.kind == "audio" && package.download_policy != "manual" {
            return Err(AppError::Validation(format!(
                "Audio package {} must use manual download policy.",
                package.id
            )));
        }
    }

    Ok(())
}

fn is_version_newer(candidate: &str, current: &str) -> bool {
    let Some(candidate) = parse_version(candidate) else {
        return false;
    };
    let Some(current) = parse_version(current) else {
        return false;
    };
    candidate > current
}

fn parse_version(version: &str) -> Option<[u64; 3]> {
    let cleaned = version
        .trim()
        .trim_start_matches('v')
        .split(['-', '+'])
        .next()?;
    let mut parts = [0_u64; 3];

    for (index, part) in cleaned.split('.').take(3).enumerate() {
        if part.is_empty() || !part.chars().all(|c| c.is_ascii_digit()) {
            return None;
        }
        parts[index] = part.parse().ok()?;
    }

    Some(parts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_comparison_supports_v_prefix_and_prerelease_suffix() {
        assert!(is_version_newer("v0.1.1", "0.1.0"));
        assert!(is_version_newer("0.2.0-beta.1", "0.1.9"));
        assert!(!is_version_newer("0.1.0", "0.1.0"));
    }

    #[test]
    fn test_content_manifest_keeps_audio_optional() {
        let result =
            summarize_content_manifest(TEST_CONTENT_MANIFEST, "test".to_string()).expect("valid");

        assert_eq!(result.status, "available");
        assert!(result.required_packages > 0);
        assert_eq!(result.optional_audio_packages, 2);
        assert!(result.optional_audio_bytes > 0);
        assert!(result.required_download_bytes < result.optional_audio_bytes);
    }

    #[test]
    fn test_mode_content_check_uses_bundled_manifest() {
        let result = check_content_updates(Some(ContentUpdateCheckInputDto {
            mode: Some("test".to_string()),
            manifest_path: None,
        }))
        .expect("test mode content check");

        assert_eq!(result.source, "bundled-test-manifest");
        assert_eq!(result.channel.as_deref(), Some("test"));
        assert_eq!(result.optional_audio_packages, 2);
    }

    #[test]
    fn test_mode_app_update_uses_test_source() {
        let result = test_app_update_result();

        assert_eq!(result.source, "test-mode");
        assert_eq!(result.current_version, APP_VERSION);
    }

    #[test]
    fn manifest_rejects_required_audio_packages() {
        let json = r#"{
          "schema": "lexora.content-manifest",
          "schemaVersion": 1,
          "manifestVersion": "test",
          "channel": "test",
          "app": { "minAppVersion": "0.1.0" },
          "packages": [{
            "id": "audio-required",
            "kind": "audio",
            "version": "1.0.0",
            "title": "Required audio",
            "required": true,
            "optional": false,
            "sizeBytes": 1024,
            "downloadPolicy": "manual"
          }]
        }"#;

        let result = summarize_content_manifest(json, "test".to_string());

        assert!(matches!(result, Err(AppError::Validation(_))));
    }
}
