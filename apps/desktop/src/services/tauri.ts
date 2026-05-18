/**
 * Core IPC utilities for communicating with the Rust backend.
 *
 * TauriError mirrors the Rust AppError serialisation shape:
 *   { kind: "NotFound" | "Unauthorized" | "Internal" | "Validation", message: string }
 *
 * All command wrappers live in ./commands/* and import `invoke` from here.
 */

export { invoke } from "@tauri-apps/api/core";

export type AppErrorKind =
  | "NotFound"
  | "Unauthorized"
  | "Internal"
  | "Validation";

export interface TauriError {
  kind: AppErrorKind;
  message: string;
}

export function isTauriError(err: unknown): err is TauriError {
  return (
    typeof err === "object" &&
    err !== null &&
    "kind" in err &&
    "message" in err &&
    typeof (err as TauriError).kind === "string" &&
    typeof (err as TauriError).message === "string"
  );
}

export function formatTauriError(err: unknown): string {
  if (isTauriError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
