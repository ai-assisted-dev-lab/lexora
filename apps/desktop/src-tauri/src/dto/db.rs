use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbHealthDto {
    pub ok: bool,
    pub sqlite_version: String,
    /// Absolute path to the open database file, for diagnostics.
    pub db_path: String,
    pub message: String,
}
