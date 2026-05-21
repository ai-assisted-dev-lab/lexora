import { useEffect, useState } from "react";

import { dbHealthCheck,type DbHealthDto } from "@/services/commands/db";

/**
 * Calls `db_health_check` once on mount and returns the result.
 * Returns null in non-Tauri environments (tests, browser dev preview).
 */
export function useDbHealth(): DbHealthDto | null {
  const [health, setHealth] = useState<DbHealthDto | null>(null);

  useEffect(() => {
    dbHealthCheck()
      .then(setHealth)
      .catch(() => {
        // Not in a Tauri runtime — leave health as null.
      });
  }, []);

  return health;
}
