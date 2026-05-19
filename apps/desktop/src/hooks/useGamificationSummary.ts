import { useEffect, useState } from "react";

import {
  type GamificationSummaryDto,
  getGamificationSummary,
} from "@/services/commands/progress";

export function useGamificationSummary(): GamificationSummaryDto | null {
  const [summary, setSummary] = useState<GamificationSummaryDto | null>(null);

  useEffect(() => {
    getGamificationSummary()
      .then(setSummary)
      .catch(() => {
        // Browser preview and tests run without the Tauri backend.
      });
  }, []);

  return summary;
}
