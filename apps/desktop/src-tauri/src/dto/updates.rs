use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckInputDto {
    pub mode: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckResultDto {
    pub status: String,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub source: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentUpdateCheckInputDto {
    pub mode: Option<String>,
    pub manifest_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentUpdatePackageDto {
    pub id: String,
    pub kind: String,
    pub version: String,
    pub title: String,
    pub required: bool,
    pub optional: bool,
    pub size_bytes: u64,
    pub download_policy: String,
    pub audio: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentUpdateCheckResultDto {
    pub status: String,
    pub manifest_version: Option<String>,
    pub channel: Option<String>,
    pub source: String,
    pub total_packages: usize,
    pub required_packages: usize,
    pub optional_audio_packages: usize,
    pub required_download_bytes: u64,
    pub optional_audio_bytes: u64,
    pub packages: Vec<ContentUpdatePackageDto>,
    pub message: String,
}
