use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppInfoDto {
    pub name: String,
    pub version: String,
    pub identifier: String,
    /// `"development"` in debug builds, `"production"` in release builds.
    pub environment: String,
}
