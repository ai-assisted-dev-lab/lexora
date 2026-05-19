import { useCallback, useEffect, useState } from "react";

import type { LibraryDeckDto } from "@/services/commands/decks";
import { listLibraryDecks } from "@/services/commands/decks";

interface UseLibraryDecksResult {
  decks: LibraryDeckDto[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useLibraryDecks(): UseLibraryDecksResult {
  const [decks, setDecks] = useState<LibraryDeckDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listLibraryDecks();
      setDecks(result.decks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { decks, isLoading, error, reload };
}
