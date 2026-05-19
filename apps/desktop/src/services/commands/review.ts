import { invoke } from "@tauri-apps/api/core";

export interface ReviewCardDto {
  id: number;
  userId: number;
  vocabularyItemId: number;
  deckId: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnsureReviewCardsForDeckDto {
  deckId: number;
  userId: number;
  totalVocabularyItems: number;
  createdCount: number;
  existingCount: number;
  cards: ReviewCardDto[];
}

export function ensureReviewCardsForDeck(
  deckId: number,
): Promise<EnsureReviewCardsForDeckDto> {
  return invoke<EnsureReviewCardsForDeckDto>("ensure_review_cards_for_deck", {
    deckId,
  });
}

export function getReviewCard(
  vocabularyItemId: number,
): Promise<ReviewCardDto | null> {
  return invoke<ReviewCardDto | null>("get_review_card", { vocabularyItemId });
}
