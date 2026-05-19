import { createEmptyCard, fsrs, State, type Card } from "ts-fsrs";

import { toFsrsRating } from "./rating";
import type {
  LexoraDueStatus,
  LexoraReviewCardState,
  LexoraReviewCardStateName,
  LexoraReviewRating,
  LexoraSchedulingResult,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createInitialReviewCard(options?: {
  now?: Date;
}): LexoraReviewCardState {
  const now = getDateOrNow(options?.now, "now");

  return fromFsrsCard(createEmptyCard(now));
}

export function scheduleReview(input: {
  card: LexoraReviewCardState;
  rating: LexoraReviewRating;
  reviewedAt?: Date;
}): LexoraSchedulingResult {
  const reviewedAt = getDateOrNow(input.reviewedAt, "reviewedAt");
  const previous = normalizeReviewCardState(input.card);
  const result = fsrs({ enable_fuzz: false }).next(
    toFsrsCard(previous),
    reviewedAt,
    toFsrsRating(input.rating),
  );
  const next = fromFsrsCard(result.card);

  return {
    previous,
    next,
    rating: input.rating,
    reviewedAt: toIsoString(reviewedAt, "reviewedAt"),
    scheduledAt: next.due,
  };
}

export function isDue(input: {
  card: LexoraReviewCardState;
  now?: Date;
}): boolean {
  return getDueStatus(input).isDue;
}

export function getDueStatus(input: {
  card: LexoraReviewCardState;
  now?: Date;
}): LexoraDueStatus {
  const due = parseDateString(input.card.due, "card.due");
  const now = getDateOrNow(input.now, "now");
  const overdueMs = now.getTime() - due.getTime();

  return {
    isDue: overdueMs >= 0,
    dueAt: toIsoString(due, "card.due"),
    overdueDays: overdueMs >= 0 ? Math.floor(overdueMs / MS_PER_DAY) : 0,
  };
}

export function normalizeReviewCardState(
  card: LexoraReviewCardState,
): LexoraReviewCardState {
  return fromFsrsCard(toFsrsCard(card));
}

function fromFsrsCard(card: Card): LexoraReviewCardState {
  return {
    due: toIsoString(card.due, "card.due"),
    stability: assertFiniteNumber(card.stability, "card.stability"),
    difficulty: assertFiniteNumber(card.difficulty, "card.difficulty"),
    elapsedDays: assertFiniteNumber(card.elapsed_days, "card.elapsedDays"),
    scheduledDays: assertFiniteNumber(
      card.scheduled_days,
      "card.scheduledDays",
    ),
    learningSteps: assertFiniteNumber(card.learning_steps, "card.learningSteps"),
    reps: assertNonNegativeInteger(card.reps, "card.reps"),
    lapses: assertNonNegativeInteger(card.lapses, "card.lapses"),
    state: fromFsrsState(card.state),
    lastReview:
      card.last_review === undefined
        ? undefined
        : toIsoString(card.last_review, "card.lastReview"),
  };
}

function toFsrsCard(card: LexoraReviewCardState): Card {
  return {
    due: parseDateString(card.due, "card.due"),
    stability: assertFiniteNumber(card.stability, "card.stability"),
    difficulty: assertFiniteNumber(card.difficulty, "card.difficulty"),
    elapsed_days: assertFiniteNumber(card.elapsedDays, "card.elapsedDays"),
    scheduled_days: assertFiniteNumber(
      card.scheduledDays,
      "card.scheduledDays",
    ),
    learning_steps: assertFiniteNumber(card.learningSteps, "card.learningSteps"),
    reps: assertNonNegativeInteger(card.reps, "card.reps"),
    lapses: assertNonNegativeInteger(card.lapses, "card.lapses"),
    state: toFsrsState(card.state),
    last_review:
      card.lastReview === undefined
        ? undefined
        : parseDateString(card.lastReview, "card.lastReview"),
  };
}

function fromFsrsState(state: State): LexoraReviewCardStateName {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
  }
}

function toFsrsState(state: LexoraReviewCardStateName): State {
  switch (state) {
    case "new":
      return State.New;
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
  }
}

function getDateOrNow(value: Date | undefined, fieldName: string): Date {
  const date = value ?? new Date();
  assertValidDate(date, fieldName);

  return date;
}

function parseDateString(value: string, fieldName: string): Date {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be an ISO timestamp string.`);
  }

  const date = new Date(value);
  assertValidDate(date, fieldName);

  return date;
}

function toIsoString(value: Date, fieldName: string): string {
  assertValidDate(value, fieldName);

  return value.toISOString();
}

function assertValidDate(value: Date, fieldName: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${fieldName} must be a valid Date.`);
  }
}

function assertFiniteNumber(value: number, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  return value;
}

function assertNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }

  return value;
}
