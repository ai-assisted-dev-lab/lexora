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

export interface SmartReviewQueueRequestDto {
  deckId?: number | null;
  sessionLength: number;
  dueRatio: number;
  weakRatio: number;
  newRatio: number;
  mode: "smart_review";
}

export interface SmartReviewQueueItemDto {
  position: number;
  category: "due" | "weak" | "new";
  card: ReviewCardDto;
  headword: string;
  partOfSpeech: string | null;
  definitionEn: string | null;
  definitionVi: string | null;
}

export interface SmartReviewQueueSummaryDto {
  dueCount: number;
  weakCount: number;
  newCount: number;
  requestedLength: number;
  returnedLength: number;
}

export interface SmartReviewQueueDto {
  userId: number;
  deckId: number | null;
  mode: "smart_review";
  generatedAt: string;
  summary: SmartReviewQueueSummaryDto;
  items: SmartReviewQueueItemDto[];
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

export function generateSmartReviewQueue(
  input: SmartReviewQueueRequestDto,
): Promise<SmartReviewQueueDto> {
  return invoke<SmartReviewQueueDto>("generate_smart_review_queue", { input });
}
