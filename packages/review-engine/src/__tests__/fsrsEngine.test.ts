import { describe, expect, it } from "vitest";

import {
  createInitialReviewCard,
  deserializeReviewCard,
  getDueStatus,
  isDue,
  scheduleReview,
  serializeReviewCard,
} from "../index";
import type { LexoraReviewRating } from "../types";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("FSRS review engine", () => {
  it("creates a valid new card", () => {
    const card = createInitialReviewCard({ now: NOW });

    expect(card).toMatchObject({
      due: NOW.toISOString(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: "new",
    });
    expect(card.lastReview).toBeUndefined();
  });

  it("sets the initial due date at the supplied time", () => {
    const card = createInitialReviewCard({ now: NOW });

    expect(new Date(card.due).getTime()).toBe(NOW.getTime());
  });

  it("schedules again from a review card and increments reps and lapses", () => {
    const initial = createInitialReviewCard({ now: NOW });
    const promoted = scheduleReview({
      card: initial,
      rating: "easy",
      reviewedAt: NOW,
    }).next;
    const result = scheduleReview({
      card: promoted,
      rating: "again",
      reviewedAt: new Date(promoted.due),
    });

    expect(result.previous.state).toBe("review");
    expect(result.next.reps).toBe(result.previous.reps + 1);
    expect(result.next.lapses).toBe(result.previous.lapses + 1);
    expect(result.next.state).toBe("relearning");
    expect(new Date(result.next.due).getTime()).toBeGreaterThan(
      new Date(result.reviewedAt).getTime(),
    );
  });

  it("moves a new card into learning after an initial again rating", () => {
    const result = scheduleReview({
      card: createInitialReviewCard({ now: NOW }),
      rating: "again",
      reviewedAt: NOW,
    });

    expect(result.previous.state).toBe("new");
    expect(result.next.state).toBe("learning");
    expect(result.next.reps).toBe(1);
    expect(result.next.lapses).toBe(0);
    expect(result.next.lastReview).toBe(NOW.toISOString());
    expect(new Date(result.next.due).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("keeps successful review transitions in review with monotonic counters", () => {
    const first = scheduleReview({
      card: createInitialReviewCard({ now: NOW }),
      rating: "easy",
      reviewedAt: NOW,
    }).next;
    const secondReviewedAt = new Date(first.due);
    const second = scheduleReview({
      card: first,
      rating: "good",
      reviewedAt: secondReviewedAt,
    });

    expect(second.previous.state).toBe("review");
    expect(second.next.state).toBe("review");
    expect(second.next.reps).toBe(second.previous.reps + 1);
    expect(second.next.lapses).toBe(second.previous.lapses);
    expect(second.next.scheduledDays).toBeGreaterThanOrEqual(
      second.previous.scheduledDays,
    );
    expect(second.next.lastReview).toBe(secondReviewedAt.toISOString());
  });

  it("schedules hard, good, and easy into valid future states", () => {
    const ratings: LexoraReviewRating[] = ["hard", "good", "easy"];

    for (const rating of ratings) {
      const card = createInitialReviewCard({ now: NOW });
      const result = scheduleReview({ card, rating, reviewedAt: NOW });

      expect(result.rating).toBe(rating);
      expect(result.reviewedAt).toBe(NOW.toISOString());
      expect(result.scheduledAt).toBe(result.next.due);
      expect(typeof result.next.due).toBe("string");
      expect(typeof result.next.lastReview).toBe("string");
      expect(new Date(result.next.due).getTime()).toBeGreaterThan(
        NOW.getTime(),
      );
      expect(result.next.reps).toBe(1);
    }
  });

  it("generally schedules easy later than good, and good later than hard", () => {
    const hardDue = dueAfterRating("hard");
    const goodDue = dueAfterRating("good");
    const easyDue = dueAfterRating("easy");

    expect(easyDue).toBeGreaterThan(goodDue);
    expect(goodDue).toBeGreaterThan(hardDue);
  });

  it("returns true when a card is due", () => {
    const card = createInitialReviewCard({ now: NOW });

    expect(isDue({ card, now: NOW })).toBe(true);
  });

  it("returns false before a card is due", () => {
    const card = createInitialReviewCard({ now: NOW });
    const scheduled = scheduleReview({
      card,
      rating: "good",
      reviewedAt: NOW,
    }).next;

    expect(
      isDue({
        card: scheduled,
        now: new Date(NOW.getTime() + 5 * 60 * 1000),
      }),
    ).toBe(false);
  });

  it("returns due status with normalized ISO date and overdue days", () => {
    const card = createInitialReviewCard({ now: NOW });
    const status = getDueStatus({
      card,
      now: new Date("2026-01-03T12:00:00.000Z"),
    });

    expect(status).toEqual({
      isDue: true,
      dueAt: NOW.toISOString(),
      overdueDays: 2,
    });
  });

  it("serializes and deserializes review cards safely", () => {
    const card = scheduleReview({
      card: createInitialReviewCard({ now: NOW }),
      rating: "good",
      reviewedAt: NOW,
    }).next;
    const serialized = serializeReviewCard(card);

    expect(deserializeReviewCard(serialized)).toEqual(card);
  });

  it("rejects invalid serialized data", () => {
    expect(() => deserializeReviewCard("{not-json")).toThrow(
      /Invalid review card JSON/,
    );
    expect(() =>
      deserializeReviewCard(JSON.stringify({ due: NOW.toISOString() })),
    ).toThrow(/Invalid review card/);
  });

  it("returns ISO strings instead of Date objects", () => {
    const result = scheduleReview({
      card: createInitialReviewCard({ now: NOW }),
      rating: "easy",
      reviewedAt: NOW,
    });

    assertIsoString(result.previous.due);
    assertIsoString(result.next.due);
    assertIsoString(result.next.lastReview);
    assertIsoString(result.reviewedAt);
    assertIsoString(result.scheduledAt);
  });
});

function dueAfterRating(rating: LexoraReviewRating): number {
  const card = createInitialReviewCard({ now: NOW });
  const result = scheduleReview({ card, rating, reviewedAt: NOW });

  return new Date(result.next.due).getTime();
}

function assertIsoString(value: string | undefined): void {
  expect(typeof value).toBe("string");

  const isoValue = value as string;
  expect(new Date(isoValue).toISOString()).toBe(isoValue);
}
