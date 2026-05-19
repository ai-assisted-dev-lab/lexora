import { useCallback, useEffect, useState } from "react";

import type { DiscoverDeckDto } from "@/services/commands/decks";
import {
  installDeck,
  listDiscoverDecks,
  uninstallDeck,
} from "@/services/commands/decks";

interface UseDiscoverDecksResult {
  decks: DiscoverDeckDto[];
  isLoading: boolean;
  error: string | null;
  install: (deckId: number) => Promise<void>;
  uninstall: (deckId: number) => Promise<void>;
}

export function useDiscoverDecks(): UseDiscoverDecksResult {
  const [decks, setDecks] = useState<DiscoverDeckDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listDiscoverDecks();
      setDecks(result.decks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const install = useCallback(async (deckId: number) => {
    await installDeck(deckId);
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, installed: true } : d)),
    );
  }, []);

  const uninstall = useCallback(async (deckId: number) => {
    await uninstallDeck(deckId);
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, installed: false } : d)),
    );
  }, []);

  return { decks, isLoading, error, install, uninstall };
}
