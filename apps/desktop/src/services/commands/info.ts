import { invoke } from "@/services/tauri";

/** Mirrors the Rust `AppInfoDto` struct in `src-tauri/src/dto/info.rs`. */
export interface AppInfoDto {
  name: string;
  version: string;
  identifier: string;
  environment: "development" | "production";
}

/** Returns static application metadata compiled into the Rust binary. */
export function getAppInfo(): Promise<AppInfoDto> {
  return invoke<AppInfoDto>("get_app_info");
}
