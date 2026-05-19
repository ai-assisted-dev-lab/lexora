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
  learningSteps: number;
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
  ipaUk: string | null;
  ipaUs: string | null;
  definitionEn: string | null;
  definitionVi: string | null;
  exampleSentenceEn: string | null;
  exampleSentenceVi: string | null;
  additionalSenseCount: number;
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

export interface StartFlashcardSessionInputDto {
  deckId?: number | null;
  sessionLength: number;
  mode: "flashcard";
}

export interface ReviewCardStateInputDto {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview?: string | null;
}

export interface SubmitFlashcardReviewInputDto {
  sessionId: number;
  reviewCardId: number;
  vocabularyItemId: number;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: string;
  responseTimeMs?: number;
  nextState: ReviewCardStateInputDto;
}

export interface StudySessionProgressDto {
  sessionId: number;
  totalItems: number;
  reviewedCount: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  endedAt: string | null;
}

export interface StudySessionDto {
  sessionId: number;
  userId: number;
  deckId: number | null;
  mode: "flashcard";
  startedAt: string;
  endedAt: string | null;
  totalItems: number;
  reviewedCount: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  queue: SmartReviewQueueDto;
}

export interface SubmitReviewResultDto {
  session: StudySessionProgressDto;
  card: ReviewCardDto;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: string;
}

export interface CompleteStudySessionInputDto {
  sessionId: number;
}

export interface StudySessionSummaryDto {
  sessionId: number;
  userId: number;
  deckId: number | null;
  mode: "flashcard";
  startedAt: string;
  endedAt: string;
  totalItems: number;
  reviewedCount: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  accuracy: number;
  timeSpentSeconds: number;
  xpEarned: number;
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

export function startFlashcardSession(
  input: StartFlashcardSessionInputDto,
): Promise<StudySessionDto> {
  return invoke<StudySessionDto>("start_flashcard_session", { input });
}

export function submitFlashcardReview(
  input: SubmitFlashcardReviewInputDto,
): Promise<SubmitReviewResultDto> {
  return invoke<SubmitReviewResultDto>("submit_flashcard_review", { input });
}

export function completeStudySession(
  input: CompleteStudySessionInputDto,
): Promise<StudySessionSummaryDto> {
  return invoke<StudySessionSummaryDto>("complete_study_session", { input });
}
