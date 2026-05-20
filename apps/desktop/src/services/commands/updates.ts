import { invoke } from "@/services/tauri";

export type UpdateCheckMode = "auto" | "test";

export interface AppUpdateCheckResult {
  status: "not_configured" | "up_to_date" | "available";
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  source: string;
  message: string;
}

export interface ContentUpdatePackage {
  id: string;
  kind: "seed_db" | "data_patch" | "catalog" | "audio" | "asset";
  version: string;
  title: string;
  required: boolean;
  optional: boolean;
  sizeBytes: number;
  downloadPolicy: "auto" | "manual";
  audio: boolean;
}

export interface ContentUpdateCheckResult {
  status: "not_configured" | "available" | "empty" | "incompatible";
  manifestVersion: string | null;
  channel: string | null;
  source: string;
  totalPackages: number;
  requiredPackages: number;
  optionalAudioPackages: number;
  requiredDownloadBytes: number;
  optionalAudioBytes: number;
  packages: ContentUpdatePackage[];
  message: string;
}

export function checkAppUpdate(
  mode: UpdateCheckMode = "auto",
): Promise<AppUpdateCheckResult> {
  return invoke<AppUpdateCheckResult>("check_app_update", {
    input: { mode },
  });
}

export function checkContentUpdates(
  mode: UpdateCheckMode = "auto",
  manifestPath: string | null = null,
): Promise<ContentUpdateCheckResult> {
  return invoke<ContentUpdateCheckResult>("check_content_updates", {
    input: { mode, manifestPath },
  });
}
