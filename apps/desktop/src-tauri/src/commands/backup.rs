use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose, Engine as _};
use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Number, Value};
use tauri::State;

use crate::auth::{self, AuthUser};
use crate::db::{migrations, DbConn};
use crate::dto::backup::{
    BackupExportResultDto, BackupHistoryDto, BackupHistoryItemDto, BackupRestoreResultDto,
    BackupTableCountDto, BackupValidationDto, CreateBackupInputDto, RestoreBackupInputDto,
    ScheduledBackupResultDto,
};
use crate::errors::AppError;
use crate::filesystem::AppPaths;

const BACKUP_SCHEMA_ID: &str = "lexora.backup.v1";
const BACKUP_SCHEMA_VERSION: u32 = 1;
const AUTO_BACKUP_INTERVAL_SECONDS: i64 = 24 * 60 * 60;

type JsonRow = Map<String, Value>;

#[derive(Clone, Copy)]
struct TableSpec {
    name: &'static str,
    order_by: &'static str,
}

const USER_TABLES: &[TableSpec] = &[
    TableSpec {
        name: "user_settings",
        order_by: "user_id",
    },
    TableSpec {
        name: "deck_subscriptions",
        order_by: "deck_id",
    },
    TableSpec {
        name: "user_xp",
        order_by: "user_id",
    },
    TableSpec {
        name: "user_progress",
        order_by: "date, id",
    },
    TableSpec {
        name: "study_sessions",
        order_by: "started_at, id",
    },
    TableSpec {
        name: "review_cards",
        order_by: "word_id, id",
    },
    TableSpec {
        name: "review_logs",
        order_by: "reviewed_at, id",
    },
    TableSpec {
        name: "user_achievements",
        order_by: "achievement_id",
    },
    TableSpec {
        name: "achievement_events",
        order_by: "event_type",
    },
];

const CONTENT_TABLES: &[TableSpec] = &[
    TableSpec {
        name: "packs",
        order_by: "id",
    },
    TableSpec {
        name: "decks",
        order_by: "id",
    },
    TableSpec {
        name: "words",
        order_by: "id",
    },
    TableSpec {
        name: "senses",
        order_by: "id",
    },
    TableSpec {
        name: "examples",
        order_by: "id",
    },
    TableSpec {
        name: "pronunciations",
        order_by: "id",
    },
    TableSpec {
        name: "word_relations",
        order_by: "id",
    },
    TableSpec {
        name: "deck_words",
        order_by: "deck_id, position, word_id",
    },
    TableSpec {
        name: "data_provenance",
        order_by: "id",
    },
    TableSpec {
        name: "achievements",
        order_by: "id",
    },
];

const DELETE_USER_TABLE_ORDER: &[&str] = &[
    "review_logs",
    "review_cards",
    "study_sessions",
    "user_progress",
    "user_xp",
    "user_achievements",
    "achievement_events",
    "deck_subscriptions",
    "user_settings",
];

const RESTORE_USER_TABLE_ORDER: &[&str] = &[
    "user_settings",
    "deck_subscriptions",
    "user_xp",
    "user_progress",
    "study_sessions",
    "review_cards",
    "review_logs",
    "user_achievements",
    "achievement_events",
];

const RESTORE_CONTENT_TABLE_ORDER: &[&str] = &[
    "packs",
    "decks",
    "words",
    "senses",
    "examples",
    "pronunciations",
    "word_relations",
    "deck_words",
    "data_provenance",
    "achievements",
];

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct BackupFile {
    schema: String,
    schema_version: u32,
    exported_at: String,
    app_schema_version: u32,
    backup_kind: String,
    include_content: bool,
    source_user: BackupSourceUser,
    tables: BTreeMap<String, Vec<JsonRow>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct BackupSourceUser {
    id: i64,
    username: String,
    role: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupNoteMeta {
    kind: String,
    note: Option<String>,
    include_content: bool,
    reason: Option<String>,
}

#[tauri::command]
pub fn create_backup(
    input: Option<CreateBackupInputDto>,
    db: State<'_, DbConn>,
    paths: State<'_, AppPaths>,
) -> Result<BackupExportResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    let input = input.unwrap_or(CreateBackupInputDto {
        file_path: None,
        note: None,
        include_content: None,
        overwrite: None,
    });

    create_backup_internal(
        &conn,
        &paths,
        &user,
        "manual",
        input.include_content.unwrap_or(true),
        input.note,
        input.file_path,
        input.overwrite.unwrap_or(false),
        None,
    )
}

#[tauri::command]
pub fn list_backups(
    db: State<'_, DbConn>,
    paths: State<'_, AppPaths>,
) -> Result<BackupHistoryDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    list_user_backups(&conn, &paths, user.id)
}

#[tauri::command]
pub fn validate_backup(
    file_path: String,
    db: State<'_, DbConn>,
) -> Result<BackupValidationDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    Ok(validate_backup_path(&conn, &file_path, Some(user.id)))
}

#[tauri::command]
pub fn restore_backup(
    input: RestoreBackupInputDto,
    db: State<'_, DbConn>,
    paths: State<'_, AppPaths>,
) -> Result<BackupRestoreResultDto, AppError> {
    let mut conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    restore_backup_file(&mut conn, &paths, &user, input)
}

#[tauri::command]
pub fn ensure_scheduled_backup(
    db: State<'_, DbConn>,
    paths: State<'_, AppPaths>,
) -> Result<ScheduledBackupResultDto, AppError> {
    let conn = db
        .conn
        .lock()
        .map_err(|_| AppError::Internal("Database connection lock poisoned".to_string()))?;
    let user = auth::require_session(&conn)?;
    ensure_scheduled_backup_for_user(&conn, &paths, &user)
}

#[allow(clippy::too_many_arguments)]
fn create_backup_internal(
    conn: &Connection,
    paths: &AppPaths,
    user: &AuthUser,
    kind: &str,
    include_content: bool,
    note: Option<String>,
    file_path: Option<String>,
    overwrite: bool,
    reason: Option<String>,
) -> Result<BackupExportResultDto, AppError> {
    let backup_file = build_backup_file(conn, user, kind, include_content)?;
    let output_path = resolve_backup_path(paths, &backup_file, file_path)?;

    if output_path.exists() && !overwrite {
        return Err(AppError::Validation(format!(
            "Backup file already exists: {}. Enable overwrite to replace it.",
            output_path.display()
        )));
    }

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("Failed to create backup directory: {e}")))?;
    }

    let json = serde_json::to_string_pretty(&backup_file)
        .map_err(|e| AppError::Internal(format!("Failed to serialise backup: {e}")))?;
    fs::write(&output_path, json)
        .map_err(|e| AppError::Internal(format!("Failed to write backup file: {e}")))?;
    let bytes_written = fs::metadata(&output_path)
        .map_err(|e| AppError::Internal(format!("Failed to inspect backup file: {e}")))?
        .len();

    let meta = BackupNoteMeta {
        kind: kind.to_string(),
        note,
        include_content,
        reason,
    };
    let meta_json = serde_json::to_string(&meta)
        .map_err(|e| AppError::Internal(format!("Failed to encode backup metadata: {e}")))?;

    conn.execute(
        "INSERT INTO backups (user_id, file_path, file_size_bytes, note)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            user.id,
            output_path.to_string_lossy().to_string(),
            bytes_written as i64,
            meta_json
        ],
    )
    .map_err(|e| AppError::Internal(format!("Failed to record backup history: {e}")))?;
    let backup_id = conn.last_insert_rowid();
    let created_at = conn
        .query_row(
            "SELECT created_at FROM backups WHERE id = ?1",
            params![backup_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| AppError::Internal(format!("Failed to read backup timestamp: {e}")))?;

    Ok(BackupExportResultDto {
        backup_id,
        file_path: output_path.to_string_lossy().to_string(),
        bytes_written,
        created_at,
        backup_kind: kind.to_string(),
        include_content,
        table_counts: table_counts(&backup_file),
    })
}

fn ensure_scheduled_backup_for_user(
    conn: &Connection,
    paths: &AppPaths,
    user: &AuthUser,
) -> Result<ScheduledBackupResultDto, AppError> {
    let age_seconds: Option<i64> = conn
        .query_row(
            "SELECT CAST(strftime('%s', 'now') - strftime('%s', created_at) AS INTEGER)
             FROM backups
             WHERE user_id = ?1
               AND note LIKE '%\"kind\":\"auto\"%'
             ORDER BY created_at DESC, id DESC
             LIMIT 1",
            params![user.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AppError::Internal(format!("Failed to read latest auto backup: {e}")))?;

    if let Some(age_seconds) = age_seconds {
        if age_seconds < AUTO_BACKUP_INTERVAL_SECONDS {
            return Ok(ScheduledBackupResultDto {
                created: false,
                skipped_reason: Some(
                    "A scheduled backup already exists for the last 24 hours.".to_string(),
                ),
                backup: None,
            });
        }
    }

    let backup = create_backup_internal(
        conn,
        paths,
        user,
        "auto",
        true,
        None,
        None,
        false,
        Some("scheduled".to_string()),
    )?;

    Ok(ScheduledBackupResultDto {
        created: true,
        skipped_reason: None,
        backup: Some(backup),
    })
}

fn restore_backup_file(
    conn: &mut Connection,
    paths: &AppPaths,
    user: &AuthUser,
    input: RestoreBackupInputDto,
) -> Result<BackupRestoreResultDto, AppError> {
    if !input.confirm_restore {
        return Err(AppError::Validation(
            "Restore requires explicit confirmation before local data is overwritten.".to_string(),
        ));
    }

    let backup = read_backup_file_strict(&input.file_path)?;
    let validation = validate_backup_data(conn, &backup, Some(user.id));
    if !validation.valid {
        return Err(AppError::Validation(format!(
            "Backup validation failed: {}",
            validation.warnings.join(" ")
        )));
    }

    let safety_backup = if input.create_safety_backup.unwrap_or(true) {
        let export = create_backup_internal(
            conn,
            paths,
            user,
            "auto",
            true,
            None,
            None,
            false,
            Some("pre_restore_safety".to_string()),
        )?;
        Some(get_backup_history_item(conn, export.backup_id)?)
    } else {
        None
    };

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Internal(format!("Failed to start restore transaction: {e}")))?;
    tx.execute_batch("PRAGMA defer_foreign_keys = ON;")
        .map_err(|e| AppError::Internal(format!("Failed to defer restore foreign keys: {e}")))?;

    let mut restored = Vec::new();
    if backup.include_content {
        for table in RESTORE_CONTENT_TABLE_ORDER {
            if let Some(rows) = backup.tables.get(*table) {
                let count = insert_rows(&tx, table, rows, None, "IGNORE")?;
                restored.push(BackupTableCountDto {
                    table: (*table).to_string(),
                    rows: count,
                });
            }
        }
    }

    for table in DELETE_USER_TABLE_ORDER {
        tx.execute(
            &format!("DELETE FROM {table} WHERE user_id = ?1"),
            params![user.id],
        )
        .map_err(|e| AppError::Internal(format!("Failed to clear {table} before restore: {e}")))?;
    }

    for table in RESTORE_USER_TABLE_ORDER {
        if let Some(rows) = backup.tables.get(*table) {
            let count = insert_rows(&tx, table, rows, Some(user.id), "REPLACE")?;
            restored.push(BackupTableCountDto {
                table: (*table).to_string(),
                rows: count,
            });
        }
    }

    tx.commit()
        .map_err(|e| AppError::Internal(format!("Failed to commit restore: {e}")))?;

    Ok(BackupRestoreResultDto {
        restored_at: current_timestamp(conn)?,
        restored_tables: restored,
        safety_backup,
    })
}

fn build_backup_file(
    conn: &Connection,
    user: &AuthUser,
    kind: &str,
    include_content: bool,
) -> Result<BackupFile, AppError> {
    let mut tables = BTreeMap::new();

    for spec in USER_TABLES {
        let rows = query_user_table(conn, spec, user.id)?;
        tables.insert(spec.name.to_string(), rows);
    }

    if include_content {
        for spec in CONTENT_TABLES {
            let rows = query_content_table(conn, spec)?;
            tables.insert(spec.name.to_string(), rows);
        }
    }

    Ok(BackupFile {
        schema: BACKUP_SCHEMA_ID.to_string(),
        schema_version: BACKUP_SCHEMA_VERSION,
        exported_at: current_timestamp(conn)?,
        app_schema_version: migrations::current_version(conn)?,
        backup_kind: kind.to_string(),
        include_content,
        source_user: BackupSourceUser {
            id: user.id,
            username: user.username.clone(),
            role: user.role.clone(),
        },
        tables,
    })
}

fn query_user_table(
    conn: &Connection,
    spec: &TableSpec,
    user_id: i64,
) -> Result<Vec<JsonRow>, AppError> {
    let sql = format!(
        "SELECT * FROM {} WHERE user_id = ?1 ORDER BY {}",
        spec.name, spec.order_by
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| {
        AppError::Internal(format!("Failed to prepare {} backup query: {e}", spec.name))
    })?;
    let rows = stmt
        .query_map(params![user_id], row_to_json)
        .map_err(|e| AppError::Internal(format!("Failed to query {} for backup: {e}", spec.name)))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| {
            AppError::Internal(format!("Failed to read {} backup rows: {e}", spec.name))
        })?;
    Ok(rows)
}

fn query_content_table(conn: &Connection, spec: &TableSpec) -> Result<Vec<JsonRow>, AppError> {
    let sql = format!("SELECT * FROM {} ORDER BY {}", spec.name, spec.order_by);
    let mut stmt = conn.prepare(&sql).map_err(|e| {
        AppError::Internal(format!("Failed to prepare {} backup query: {e}", spec.name))
    })?;
    let rows = stmt
        .query_map([], row_to_json)
        .map_err(|e| AppError::Internal(format!("Failed to query {} for backup: {e}", spec.name)))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| {
            AppError::Internal(format!("Failed to read {} backup rows: {e}", spec.name))
        })?;
    Ok(rows)
}

fn row_to_json(row: &Row<'_>) -> rusqlite::Result<JsonRow> {
    let mut object = Map::new();
    let row_ref = row.as_ref();
    for idx in 0..row_ref.column_count() {
        let name = row_ref.column_name(idx)?.to_string();
        let value = match row.get_ref(idx)? {
            ValueRef::Null => Value::Null,
            ValueRef::Integer(value) => Value::Number(value.into()),
            ValueRef::Real(value) => Number::from_f64(value)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            ValueRef::Text(value) => Value::String(String::from_utf8_lossy(value).to_string()),
            ValueRef::Blob(value) => Value::String(general_purpose::STANDARD.encode(value)),
        };
        object.insert(name, value);
    }
    Ok(object)
}

fn resolve_backup_path(
    paths: &AppPaths,
    file: &BackupFile,
    file_path: Option<String>,
) -> Result<PathBuf, AppError> {
    if let Some(path) = file_path.filter(|p| !p.trim().is_empty()) {
        return Ok(PathBuf::from(path));
    }

    let dir = paths.backups_dir().join(&file.backup_kind);
    fs::create_dir_all(&dir)
        .map_err(|e| AppError::Internal(format!("Failed to create backup directory: {e}")))?;
    let timestamp = file.exported_at.replace(':', "-").replace(['.', ' '], "-");
    let username = sanitize_filename(&file.source_user.username);
    Ok(dir.join(format!("lexora-{username}-{timestamp}.lexora-backup.json")))
}

fn list_user_backups(
    conn: &Connection,
    paths: &AppPaths,
    user_id: i64,
) -> Result<BackupHistoryDto, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, file_path, file_size_bytes, note, created_at
             FROM backups
             WHERE user_id = ?1
             ORDER BY created_at DESC, id DESC",
        )
        .map_err(|e| AppError::Internal(format!("Failed to prepare backup history query: {e}")))?;

    let items = stmt
        .query_map(params![user_id], |row| {
            let id = row.get::<_, i64>(0)?;
            let file_path = row.get::<_, String>(1)?;
            let file_size_bytes = row.get::<_, Option<i64>>(2)?;
            let raw_note = row.get::<_, Option<String>>(3)?;
            let created_at = row.get::<_, String>(4)?;
            let (backup_kind, note, include_content) = parse_backup_note(raw_note);
            Ok(BackupHistoryItemDto {
                id,
                exists: Path::new(&file_path).exists(),
                file_path,
                file_size_bytes,
                note,
                backup_kind,
                include_content,
                created_at,
            })
        })
        .map_err(|e| AppError::Internal(format!("Failed to query backup history: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(format!("Failed to read backup history: {e}")))?;

    let latest_backup_at = items.first().map(|item| item.created_at.clone());
    let latest_auto_backup_at = items
        .iter()
        .find(|item| item.backup_kind == "auto")
        .map(|item| item.created_at.clone());

    Ok(BackupHistoryDto {
        total: items.len(),
        items,
        latest_backup_at,
        latest_auto_backup_at,
        backup_directory: paths.backups_dir().to_string_lossy().to_string(),
    })
}

fn get_backup_history_item(
    conn: &Connection,
    backup_id: i64,
) -> Result<BackupHistoryItemDto, AppError> {
    conn.query_row(
        "SELECT id, file_path, file_size_bytes, note, created_at
         FROM backups
         WHERE id = ?1",
        params![backup_id],
        |row| {
            let id = row.get::<_, i64>(0)?;
            let file_path = row.get::<_, String>(1)?;
            let file_size_bytes = row.get::<_, Option<i64>>(2)?;
            let raw_note = row.get::<_, Option<String>>(3)?;
            let created_at = row.get::<_, String>(4)?;
            let (backup_kind, note, include_content) = parse_backup_note(raw_note);
            Ok(BackupHistoryItemDto {
                id,
                exists: Path::new(&file_path).exists(),
                file_path,
                file_size_bytes,
                note,
                backup_kind,
                include_content,
                created_at,
            })
        },
    )
    .map_err(|e| AppError::Internal(format!("Failed to read backup history item: {e}")))
}

fn parse_backup_note(raw: Option<String>) -> (String, Option<String>, bool) {
    let Some(raw) = raw else {
        return ("manual".to_string(), None, false);
    };
    match serde_json::from_str::<BackupNoteMeta>(&raw) {
        Ok(meta) => (meta.kind, meta.note.or(meta.reason), meta.include_content),
        Err(_) => ("manual".to_string(), Some(raw), false),
    }
}

fn validate_backup_path(
    conn: &Connection,
    file_path: &str,
    current_user_id: Option<i64>,
) -> BackupValidationDto {
    match read_backup_file_strict(file_path) {
        Ok(file) => validate_backup_data(conn, &file, current_user_id),
        Err(err) => BackupValidationDto {
            valid: false,
            schema: None,
            schema_version: None,
            exported_at: None,
            backup_kind: None,
            username: None,
            include_content: false,
            table_counts: Vec::new(),
            warnings: vec![err.to_string()],
        },
    }
}

fn validate_backup_data(
    conn: &Connection,
    file: &BackupFile,
    current_user_id: Option<i64>,
) -> BackupValidationDto {
    let mut valid = true;
    let mut warnings = Vec::new();

    if file.schema != BACKUP_SCHEMA_ID || file.schema_version != BACKUP_SCHEMA_VERSION {
        valid = false;
        warnings.push(format!(
            "Unsupported backup schema '{}', version {}.",
            file.schema, file.schema_version
        ));
    }

    match migrations::current_version(conn) {
        Ok(current) if file.app_schema_version > current => {
            valid = false;
            warnings.push(format!(
                "Backup was created with schema version {}, but this app has schema version {}.",
                file.app_schema_version, current
            ));
        }
        Ok(_) => {}
        Err(err) => {
            valid = false;
            warnings.push(err.to_string());
        }
    }

    if !file.tables.contains_key("user_settings") {
        warnings
            .push("Backup does not contain user settings; restore will be partial.".to_string());
    }

    if let Err(err) = validate_id_conflicts(conn, file, current_user_id) {
        valid = false;
        warnings.push(err.to_string());
    }

    if !file.include_content {
        match validate_external_references(conn, file) {
            Ok(missing) if !missing.is_empty() => {
                valid = false;
                warnings.extend(missing);
            }
            Ok(_) => {}
            Err(err) => {
                valid = false;
                warnings.push(err.to_string());
            }
        }
    }

    BackupValidationDto {
        valid,
        schema: Some(file.schema.clone()),
        schema_version: Some(file.schema_version),
        exported_at: Some(file.exported_at.clone()),
        backup_kind: Some(file.backup_kind.clone()),
        username: Some(file.source_user.username.clone()),
        include_content: file.include_content,
        table_counts: table_counts(file),
        warnings,
    }
}

fn validate_id_conflicts(
    conn: &Connection,
    file: &BackupFile,
    current_user_id: Option<i64>,
) -> Result<(), AppError> {
    for table in [
        "study_sessions",
        "review_cards",
        "review_logs",
        "user_progress",
    ] {
        let Some(rows) = file.tables.get(table) else {
            continue;
        };
        let mut stmt = conn
            .prepare(&format!("SELECT user_id FROM {table} WHERE id = ?1"))
            .map_err(|e| {
                AppError::Internal(format!("Failed to prepare {table} conflict check: {e}"))
            })?;
        for row in rows {
            let Some(id) = json_i64(row.get("id")) else {
                continue;
            };
            let existing_user: Option<i64> = stmt
                .query_row(params![id], |row| row.get(0))
                .optional()
                .map_err(|e| {
                    AppError::Internal(format!("Failed to check {table} conflict: {e}"))
                })?;
            if let Some(existing_user) = existing_user {
                let allowed_user = current_user_id.unwrap_or(file.source_user.id);
                if existing_user != allowed_user {
                    return Err(AppError::Validation(format!(
                        "Backup row {table}.{id} conflicts with another local user's data."
                    )));
                }
            }
        }
    }
    Ok(())
}

fn validate_external_references(
    conn: &Connection,
    file: &BackupFile,
) -> Result<Vec<String>, AppError> {
    let mut missing = Vec::new();
    let word_ids = collect_refs(file, &["review_cards", "review_logs"], "word_id");
    let deck_ids = collect_refs(
        file,
        &[
            "deck_subscriptions",
            "review_cards",
            "review_logs",
            "study_sessions",
        ],
        "deck_id",
    );
    let achievement_ids = collect_refs(file, &["user_achievements"], "achievement_id");

    for id in missing_ids(conn, "words", &word_ids)? {
        missing.push(format!(
            "Backup references vocabulary item {id}, but content metadata is not included and the item is missing locally."
        ));
    }
    for id in missing_ids(conn, "decks", &deck_ids)? {
        missing.push(format!(
            "Backup references deck {id}, but content metadata is not included and the deck is missing locally."
        ));
    }
    for id in missing_ids(conn, "achievements", &achievement_ids)? {
        missing.push(format!(
            "Backup references achievement {id}, but achievement definitions are missing locally."
        ));
    }

    Ok(missing)
}

fn collect_refs(file: &BackupFile, table_names: &[&str], field: &str) -> HashSet<i64> {
    let mut ids = HashSet::new();
    for table in table_names {
        if let Some(rows) = file.tables.get(*table) {
            for row in rows {
                if let Some(id) = json_i64(row.get(field)) {
                    ids.insert(id);
                }
            }
        }
    }
    ids
}

fn missing_ids(conn: &Connection, table: &str, ids: &HashSet<i64>) -> Result<Vec<i64>, AppError> {
    let mut missing = Vec::new();
    let mut stmt = conn
        .prepare(&format!("SELECT COUNT(*) FROM {table} WHERE id = ?1"))
        .map_err(|e| {
            AppError::Internal(format!("Failed to prepare {table} existence check: {e}"))
        })?;
    for id in ids {
        let count: i64 = stmt
            .query_row(params![id], |row| row.get(0))
            .map_err(|e| AppError::Internal(format!("Failed to check {table} {id}: {e}")))?;
        if count == 0 {
            missing.push(*id);
        }
    }
    Ok(missing)
}

fn read_backup_file_strict(file_path: &str) -> Result<BackupFile, AppError> {
    let canonical = canonicalize_existing_file(file_path)?;
    let raw = fs::read_to_string(&canonical)
        .map_err(|e| AppError::Validation(format!("Could not read backup file: {e}")))?;
    serde_json::from_str::<BackupFile>(&raw).map_err(|e| {
        AppError::Validation(format!(
            "Backup JSON is not compatible with Lexora backup v1: {e}"
        ))
    })
}

/// Canonicalises a user-supplied file path so symlinks and `..` components
/// are resolved to their concrete target. The resulting path is verified to
/// (a) exist, (b) be a regular file rather than a directory or special
/// device, and (c) carry the expected `.json` extension so that obviously
/// wrong inputs are rejected before any I/O happens. Returns the resolved
/// path on success.
fn canonicalize_existing_file(file_path: &str) -> Result<PathBuf, AppError> {
    let trimmed = file_path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation(
            "Backup path must not be empty.".to_string(),
        ));
    }
    let source = Path::new(trimmed);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Backup file does not exist: {}",
            source.display()
        )));
    }
    let canonical = fs::canonicalize(source).map_err(|e| {
        AppError::Validation(format!(
            "Backup path could not be resolved (possible broken symlink): {e}"
        ))
    })?;
    let metadata = fs::symlink_metadata(&canonical).map_err(|e| {
        AppError::Validation(format!("Backup path could not be inspected: {e}"))
    })?;
    if !metadata.file_type().is_file() {
        return Err(AppError::Validation(format!(
            "Backup path is not a regular file: {}",
            canonical.display()
        )));
    }
    let has_json_extension = canonical
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("json"))
        .unwrap_or(false);
    if !has_json_extension {
        return Err(AppError::Validation(format!(
            "Backup file must have a .json extension: {}",
            canonical.display()
        )));
    }
    Ok(canonical)
}

fn insert_rows(
    tx: &Transaction<'_>,
    table: &str,
    rows: &[JsonRow],
    user_id: Option<i64>,
    conflict: &str,
) -> Result<usize, AppError> {
    let mut inserted = 0;
    for source_row in rows {
        let mut row = source_row.clone();
        if let Some(user_id) = user_id {
            if row.contains_key("user_id") {
                row.insert("user_id".to_string(), json!(user_id));
            }
        }
        let columns = row.keys().cloned().collect::<Vec<_>>();
        if columns.is_empty() {
            continue;
        }
        let placeholders = (1..=columns.len())
            .map(|idx| format!("?{idx}"))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "INSERT OR {conflict} INTO {table} ({}) VALUES ({placeholders})",
            columns.join(", ")
        );
        let values = columns
            .iter()
            .map(|column| json_to_sql_value(row.get(column).unwrap_or(&Value::Null)))
            .collect::<Vec<_>>();
        tx.execute(&sql, params_from_iter(values.iter()))
            .map_err(|e| AppError::Internal(format!("Failed to restore {table}: {e}")))?;
        inserted += 1;
    }
    Ok(inserted)
}

fn json_to_sql_value(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(value) => SqlValue::Integer(i64::from(*value)),
        Value::Number(value) => {
            if let Some(value) = value.as_i64() {
                SqlValue::Integer(value)
            } else if let Some(value) = value.as_u64() {
                match i64::try_from(value) {
                    Ok(value) => SqlValue::Integer(value),
                    Err(_) => SqlValue::Real(value as f64),
                }
            } else {
                SqlValue::Real(value.as_f64().unwrap_or(0.0))
            }
        }
        Value::String(value) => SqlValue::Text(value.clone()),
        Value::Array(_) | Value::Object(_) => SqlValue::Text(value.to_string()),
    }
}

fn json_i64(value: Option<&Value>) -> Option<i64> {
    match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.parse::<i64>().ok(),
        _ => None,
    }
}

fn table_counts(file: &BackupFile) -> Vec<BackupTableCountDto> {
    file.tables
        .iter()
        .map(|(table, rows)| BackupTableCountDto {
            table: table.clone(),
            rows: rows.len(),
        })
        .collect()
}

fn current_timestamp(conn: &Connection) -> Result<String, AppError> {
    conn.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
        row.get(0)
    })
    .map_err(|e| AppError::Internal(format!("Failed to read current timestamp: {e}")))
}

fn sanitize_filename(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db_with_data() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run(&mut conn).expect("migrations");
        crate::db::seeder::load_bundled(&mut conn).expect("seeder");
        crate::auth::create_default_accounts(&conn).expect("accounts");
        conn
    }

    fn login_learner(conn: &Connection) -> AuthUser {
        crate::auth::login(conn, "learner", "learner").expect("login learner")
    }

    fn temp_paths(name: &str) -> AppPaths {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "lexora-backup-{name}-{}-{nanos}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).expect("temp backup dir");
        AppPaths { app_data_dir: dir }
    }

    #[test]
    fn manual_backup_writes_file_and_history_without_secrets() {
        let conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("manual");

        let result = create_backup_internal(
            &conn,
            &paths,
            &user,
            "manual",
            true,
            Some("test backup".to_string()),
            None,
            false,
            None,
        )
        .expect("backup");

        assert!(Path::new(&result.file_path).exists());
        assert!(result.bytes_written > 0);
        let history = list_user_backups(&conn, &paths, user.id).expect("history");
        assert_eq!(history.total, 1);

        let raw = fs::read_to_string(&result.file_path).expect("backup file");
        assert!(!raw.contains("password_hash"));
        assert!(!raw.contains("app_metadata"));
        assert!(!raw.contains("$argon2"));
    }

    #[test]
    fn restore_requires_confirmation() {
        let mut conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("confirm");
        let backup = create_backup_internal(
            &conn, &paths, &user, "manual", false, None, None, false, None,
        )
        .expect("backup");

        let result = restore_backup_file(
            &mut conn,
            &paths,
            &user,
            RestoreBackupInputDto {
                file_path: backup.file_path,
                confirm_restore: false,
                create_safety_backup: Some(false),
            },
        );

        assert!(matches!(result, Err(AppError::Validation(_))));
    }

    #[test]
    fn backup_rejects_overwrite_without_confirmation() {
        let conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("overwrite");
        let path = paths.backups_dir().join("fixed.lexora-backup.json");
        let path_string = path.to_string_lossy().to_string();

        create_backup_internal(
            &conn,
            &paths,
            &user,
            "manual",
            false,
            None,
            Some(path_string.clone()),
            false,
            None,
        )
        .expect("first backup");

        let second = create_backup_internal(
            &conn,
            &paths,
            &user,
            "manual",
            false,
            None,
            Some(path_string),
            false,
            None,
        );

        assert!(matches!(second, Err(AppError::Validation(_))));
    }

    #[test]
    fn restore_recovers_user_settings() {
        let mut conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("restore");
        conn.execute(
            "UPDATE user_settings SET daily_goal_cards = 33 WHERE user_id = ?1",
            params![user.id],
        )
        .expect("set original");
        let backup = create_backup_internal(
            &conn, &paths, &user, "manual", false, None, None, false, None,
        )
        .expect("backup");

        conn.execute(
            "UPDATE user_settings SET daily_goal_cards = 77 WHERE user_id = ?1",
            params![user.id],
        )
        .expect("modify");

        restore_backup_file(
            &mut conn,
            &paths,
            &user,
            RestoreBackupInputDto {
                file_path: backup.file_path,
                confirm_restore: true,
                create_safety_backup: Some(false),
            },
        )
        .expect("restore");

        let daily_goal: i64 = conn
            .query_row(
                "SELECT daily_goal_cards FROM user_settings WHERE user_id = ?1",
                params![user.id],
                |row| row.get(0),
            )
            .expect("daily goal");
        assert_eq!(daily_goal, 33);
    }

    #[test]
    fn scheduled_backup_creates_once_and_then_throttles() {
        let conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("auto");

        let first = ensure_scheduled_backup_for_user(&conn, &paths, &user).expect("first auto");
        assert!(first.created);
        let second = ensure_scheduled_backup_for_user(&conn, &paths, &user).expect("second auto");
        assert!(!second.created);

        let history = list_user_backups(&conn, &paths, user.id).expect("history");
        assert_eq!(history.total, 1);
        assert_eq!(history.items[0].backup_kind, "auto");
    }

    #[test]
    fn validate_backup_reports_schema_and_counts() {
        let conn = db_with_data();
        let user = login_learner(&conn);
        let paths = temp_paths("validate");
        let backup = create_backup_internal(
            &conn, &paths, &user, "manual", false, None, None, false, None,
        )
        .expect("backup");

        let validation = validate_backup_path(&conn, &backup.file_path, Some(user.id));

        assert!(validation.valid);
        assert_eq!(validation.schema.as_deref(), Some(BACKUP_SCHEMA_ID));
        assert!(validation
            .table_counts
            .iter()
            .any(|count| count.table == "user_settings" && count.rows == 1));
    }
}
