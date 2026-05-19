import { normalizeReviewCardState } from "./fsrsEngine";
import type {
  LexoraReviewCardState,
  LexoraReviewCardStateName,
} from "./types";

export function serializeReviewCard(card: LexoraReviewCardState): string {
  return JSON.stringify(normalizeReviewCardState(card));
}

export function deserializeReviewCard(value: string): LexoraReviewCardState {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid review card JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid review card: expected an object.");
  }

  const card: LexoraReviewCardState = {
    due: readString(parsed, "due"),
    stability: readNumber(parsed, "stability"),
    difficulty: readNumber(parsed, "difficulty"),
    elapsedDays: readNumber(parsed, "elapsedDays"),
    scheduledDays: readNumber(parsed, "scheduledDays"),
    learningSteps: readNumber(parsed, "learningSteps"),
    reps: readInteger(parsed, "reps"),
    lapses: readInteger(parsed, "lapses"),
    state: readState(parsed, "state"),
    lastReview:
      parsed.lastReview === undefined
        ? undefined
        : readString(parsed, "lastReview"),
  };

  return normalizeReviewCardState(card);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  fieldName: string,
): string {
  const value = record[fieldName];
  if (typeof value !== "string") {
    throw new Error(`Invalid review card: ${fieldName} must be a string.`);
  }

  return value;
}

function readNumber(
  record: Record<string, unknown>,
  fieldName: string,
): number {
  const value = record[fieldName];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid review card: ${fieldName} must be a finite number.`);
  }

  return value;
}

function readInteger(
  record: Record<string, unknown>,
  fieldName: string,
): number {
  const value = readNumber(record, fieldName);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid review card: ${fieldName} must be a non-negative integer.`,
    );
  }

  return value;
}

function readState(
  record: Record<string, unknown>,
  fieldName: string,
): LexoraReviewCardStateName {
  const value = record[fieldName];

  if (
    value === "new" ||
    value === "learning" ||
    value === "review" ||
    value === "relearning"
  ) {
    return value;
  }

  throw new Error(`Invalid review card: ${fieldName} is not a known state.`);
}
