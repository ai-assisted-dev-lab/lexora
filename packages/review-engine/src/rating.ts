import { Rating, type Grade } from "ts-fsrs";

import type { LexoraReviewRating } from "./types";

const LEXORA_TO_FSRS_RATING = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const satisfies Record<LexoraReviewRating, Grade>;

export function isLexoraReviewRating(
  value: unknown,
): value is LexoraReviewRating {
  return (
    value === "again" ||
    value === "hard" ||
    value === "good" ||
    value === "easy"
  );
}

export function toFsrsRating(rating: LexoraReviewRating): Grade {
  if (!isLexoraReviewRating(rating)) {
    throw new Error(`Invalid Lexora review rating: ${String(rating)}`);
  }

  return LEXORA_TO_FSRS_RATING[rating];
}
