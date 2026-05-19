import { useCallback, useEffect, useState } from "react";

import type { WordDetailDto } from "@/services/commands/words";
import { getWordDetail } from "@/services/commands/words";

interface UseWordDetailResult {
  word: WordDetailDto | null;
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

export function useWordDetail(wordId: number | null): UseWordDetailResult {
  const [word, setWord] = useState<WordDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(wordId !== null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (wordId === null) {
      setWord(null);
      setError("Word ID is invalid.");
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await getWordDetail(wordId);
      setWord(result);
    } catch (e) {
      setWord(null);
      setNotFound(isNotFoundError(e));
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [wordId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { word, isLoading, error, notFound, reload };
}
