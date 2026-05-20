use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupInputDto {
    pub file_path: Option<String>,
    pub note: Option<String>,
    pub include_content: Option<bool>,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupInputDto {
    pub file_path: String,
    pub confirm_restore: bool,
    pub create_safety_backup: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupTableCountDto {
    pub table: String,
    pub rows: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupExportResultDto {
    pub backup_id: i64,
    pub file_path: String,
    pub bytes_written: u64,
    pub created_at: String,
    pub backup_kind: String,
    pub include_content: bool,
    pub table_counts: Vec<BackupTableCountDto>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupHistoryItemDto {
    pub id: i64,
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub note: Option<String>,
    pub backup_kind: String,
    pub include_content: bool,
    pub created_at: String,
    pub exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupHistoryDto {
    pub items: Vec<BackupHistoryItemDto>,
    pub total: usize,
    pub latest_backup_at: Option<String>,
    pub latest_auto_backup_at: Option<String>,
    pub backup_directory: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupValidationDto {
    pub valid: bool,
    pub schema: Option<String>,
    pub schema_version: Option<u32>,
    pub exported_at: Option<String>,
    pub backup_kind: Option<String>,
    pub username: Option<String>,
    pub include_content: bool,
    pub table_counts: Vec<BackupTableCountDto>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRestoreResultDto {
    pub restored_at: String,
    pub restored_tables: Vec<BackupTableCountDto>,
    pub safety_backup: Option<BackupHistoryItemDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledBackupResultDto {
    pub created: bool,
    pub skipped_reason: Option<String>,
    pub backup: Option<BackupExportResultDto>,
}
