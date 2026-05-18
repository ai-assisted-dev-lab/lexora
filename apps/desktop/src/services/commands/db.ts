import { invoke } from "@/services/tauri";

/** Mirrors the Rust `DbHealthDto` in `src-tauri/src/dto/db.rs`. */
export interface DbHealthDto {
  ok: boolean;
  sqliteVersion: string;
  /** Absolute path to the open database file — useful for diagnostics. */
  dbPath: string;
  message: string;
}

/** Mirrors the Rust `SchemaVersionDto` in `src-tauri/src/dto/db.rs`. */
export interface SchemaVersionDto {
  version: number;
  migrationCount: number;
}

/** Runs a lightweight SQL query against the managed connection and returns
 *  the SQLite version and database path. Rejects with a `TauriError` if the
 *  connection is unavailable. */
export function dbHealthCheck(): Promise<DbHealthDto> {
  return invoke<DbHealthDto>("db_health_check");
}

/** Returns the current schema version and total number of applied migrations. */
export function getSchemaVersion(): Promise<SchemaVersionDto> {
  return invoke<SchemaVersionDto>("get_schema_version");
}
