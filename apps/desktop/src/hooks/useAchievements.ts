import { useEffect, useState } from "react";

import type { AchievementsPageDto } from "@/services/commands/achievements";
import { getAchievements } from "@/services/commands/achievements";

interface UseAchievementsResult {
  data: AchievementsPageDto | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAchievements(): UseAchievementsResult {
  const [data, setData] = useState<AchievementsPageDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    getAchievements()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
