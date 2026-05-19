export type LexoraReviewRating = "again" | "hard" | "good" | "easy";

export type LexoraReviewCardStateName =
  | "new"
  | "learning"
  | "review"
  | "relearning";

export type LexoraReviewCardState = {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: LexoraReviewCardStateName;
  lastReview?: string;
};

export type LexoraSchedulingResult = {
  previous: LexoraReviewCardState;
  next: LexoraReviewCardState;
  rating: LexoraReviewRating;
  reviewedAt: string;
  scheduledAt: string;
};

export type LexoraDueStatus = {
  isDue: boolean;
  dueAt: string;
  overdueDays: number;
};
