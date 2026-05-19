import { useCallback, useEffect, useState } from "react";

import type { DeckDetailDto } from "@/services/commands/decks";
import { getDeckDetail } from "@/services/commands/decks";

interface UseDeckDetailResult {
  deck: DeckDetailDto | null;
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => Promise<void>;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "kind" in error) {
    return (error as { kind?: unknown }).kind === "NotFound";
  }

  return String(error).toLowerCase().includes("not found");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return String(error);
}

export function useDeckDetail(deckId: number | null): UseDeckDetailResult {
  const [deck, setDeck] = useState<DeckDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(deckId !== null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (deckId === null) {
      setDeck(null);
      setError("Deck ID is invalid.");
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await getDeckDetail(deckId);
      setDeck(result);
    } catch (e) {
      setDeck(null);
      setNotFound(isNotFoundError(e));
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { deck, isLoading, error, notFound, reload };
}
