import { useEffect, useState } from "react";

import { type AppInfoDto, getAppInfo } from "@/services/commands/info";

/**
 * Fetches static app metadata from the Rust backend on first mount.
 * Returns null in non-Tauri environments (tests, browser dev preview).
 */
export function useAppInfo(): AppInfoDto | null {
  const [info, setInfo] = useState<AppInfoDto | null>(null);

  useEffect(() => {
    getAppInfo()
      .then(setInfo)
      .catch(() => {
        // Not in a Tauri runtime — leave info as null.
      });
  }, []);

  return info;
}
