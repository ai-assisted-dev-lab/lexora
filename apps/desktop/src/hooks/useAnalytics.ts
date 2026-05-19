import { useEffect, useState } from "react";

import { type AnalyticsDto, getAnalytics } from "@/services/commands/analytics";

export function useAnalytics(): AnalyticsDto | null {
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch(() => {
        // Browser preview and tests run without the Tauri backend.
      });
  }, []);

  return analytics;
}
