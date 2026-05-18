import { invoke } from "@/services/tauri";

/** Mirrors the Rust `DbHealthDto` in `src-tauri/src/dto/db.rs`. */
export interface DbHealthDto {
  ok: boolean;
  sqliteVersion: string;
  /** Absolute path to the open database file — useful for diagnostics. */
  dbPath: string;
  message: string;
}

/** Runs a lightweight SQL query against the managed connection and returns
 *  the SQLite version and database path. Rejects with a `TauriError` if the
 *  connection is unavailable. */
export function dbHealthCheck(): Promise<DbHealthDto> {
  return invoke<DbHealthDto>("db_health_check");
}
