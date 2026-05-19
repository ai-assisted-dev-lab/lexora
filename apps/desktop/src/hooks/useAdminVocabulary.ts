import { useCallback, useEffect, useState } from "react";

import {
  adminListVocabulary,
  type AdminVocabularyListInput,
  type AdminVocabularyPage,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";

export interface UseAdminVocabularyResult {
  data: AdminVocabularyPage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminVocabulary(
  input: AdminVocabularyListInput,
): UseAdminVocabularyResult {
  const [data, setData] = useState<AdminVocabularyPage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await adminListVocabulary(input);
      setData(page);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsLoading(false);
    }
    // serialise input so React only re-runs when meaningful fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return { data, isLoading, error, refetch: fetcher };
}
