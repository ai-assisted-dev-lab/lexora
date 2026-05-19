import { invoke } from "@tauri-apps/api/core";

import type { AchievementUnlockDto } from "./achievements";

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

export interface StartMultipleChoiceSessionInputDto {
  deckId?: number | null;
  sessionLength: number;
  mode: "multiple_choice";
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

export interface SubmitMultipleChoiceReviewInputDto {
  sessionId: number;
  reviewCardId: number;
  vocabularyItemId: number;
  selectedVocabularyItemId: number;
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
  mode: "flashcard" | "weak_drill";
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

export interface MultipleChoiceOptionDto {
  vocabularyItemId: number;
  label: string;
}

export interface MultipleChoiceQuestionDto {
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
  options: MultipleChoiceOptionDto[];
  correctVocabularyItemId: number;
}

export interface MultipleChoiceSessionDto {
  sessionId: number;
  userId: number;
  deckId: number | null;
  mode: "multiple_choice";
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
  questions: MultipleChoiceQuestionDto[];
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
  mode: "flashcard" | "multiple_choice" | "type_answer" | "weak_drill";
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
  newlyUnlockedAchievements: AchievementUnlockDto[];
}

export interface StartTypeAnswerSessionInputDto {
  deckId?: number | null;
  sessionLength: number;
  mode: "type_answer";
}

export interface TypeAnswerSessionDto {
  sessionId: number;
  userId: number;
  deckId: number | null;
  mode: "type_answer";
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

export interface SubmitTypeAnswerReviewInputDto {
  sessionId: number;
  reviewCardId: number;
  vocabularyItemId: number;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: string;
  responseTimeMs?: number;
  nextState: ReviewCardStateInputDto;
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

export function startMultipleChoiceSession(
  input: StartMultipleChoiceSessionInputDto,
): Promise<MultipleChoiceSessionDto> {
  return invoke<MultipleChoiceSessionDto>("start_multiple_choice_session", {
    input,
  });
}

export function submitFlashcardReview(
  input: SubmitFlashcardReviewInputDto,
): Promise<SubmitReviewResultDto> {
  return invoke<SubmitReviewResultDto>("submit_flashcard_review", { input });
}

export function submitMultipleChoiceReview(
  input: SubmitMultipleChoiceReviewInputDto,
): Promise<SubmitReviewResultDto> {
  return invoke<SubmitReviewResultDto>("submit_multiple_choice_review", {
    input,
  });
}

export function startTypeAnswerSession(
  input: StartTypeAnswerSessionInputDto,
): Promise<TypeAnswerSessionDto> {
  return invoke<TypeAnswerSessionDto>("start_type_answer_session", { input });
}

export function submitTypeAnswerReview(
  input: SubmitTypeAnswerReviewInputDto,
): Promise<SubmitReviewResultDto> {
  return invoke<SubmitReviewResultDto>("submit_type_answer_review", { input });
}

export function completeStudySession(
  input: CompleteStudySessionInputDto,
): Promise<StudySessionSummaryDto> {
  return invoke<StudySessionSummaryDto>("complete_study_session", { input });
}

export interface StartWeakWordsDrillInputDto {
  deckId?: number | null;
  sessionLength: number;
  mode: "weak_drill";
}

export interface WeakWordsDto {
  userId: number;
  deckId: number | null;
  totalCount: number;
  highLapsesCount: number;
  highDifficultyCount: number;
  lowStabilityCount: number;
  items: SmartReviewQueueItemDto[];
}

export function getWeakWords(
  deckId?: number | null,
): Promise<WeakWordsDto> {
  return invoke<WeakWordsDto>("get_weak_words", { deckId });
}

export function startWeakWordsDrill(
  input: StartWeakWordsDrillInputDto,
): Promise<StudySessionDto> {
  return invoke<StudySessionDto>("start_weak_words_drill", { input });
}
