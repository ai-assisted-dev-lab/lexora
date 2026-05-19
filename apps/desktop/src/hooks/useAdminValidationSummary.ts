import { useEffect, useState } from "react";

import {
  adminGetValidationSummary,
  type AdminValidationSummary,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";

export interface UseAdminValidationSummaryResult {
  data: AdminValidationSummary | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminValidationSummary(): UseAdminValidationSummaryResult {
  const [data, setData] = useState<AdminValidationSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminGetValidationSummary()
      .then((summary) => {
        if (!cancelled) setData(summary);
      })
      .catch((err) => {
        if (!cancelled) setError(formatTauriError(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
