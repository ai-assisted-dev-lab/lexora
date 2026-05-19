import { useCallback, useEffect, useState } from "react";

import {
  type AdminDeckListInput,
  type AdminDeckPage,
  adminListDecks,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";

export interface UseAdminDecksResult {
  data: AdminDeckPage | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminDecks(input: AdminDeckListInput): UseAdminDecksResult {
  const [data, setData] = useState<AdminDeckPage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await adminListDecks(input);
      setData(page);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return { data, isLoading, error };
}
