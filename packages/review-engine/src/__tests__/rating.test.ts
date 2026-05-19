import { describe, expect, it } from "vitest";
import { Rating } from "ts-fsrs";

import type { LexoraReviewRating } from "../types";
import { isLexoraReviewRating, toFsrsRating } from "../rating";

describe("Lexora review rating mapping", () => {
  it("maps each Lexora rating to the matching FSRS grade", () => {
    expect(toFsrsRating("again")).toBe(Rating.Again);
    expect(toFsrsRating("hard")).toBe(Rating.Hard);
    expect(toFsrsRating("good")).toBe(Rating.Good);
    expect(toFsrsRating("easy")).toBe(Rating.Easy);
  });

  it("identifies supported Lexora ratings", () => {
    expect(isLexoraReviewRating("again")).toBe(true);
    expect(isLexoraReviewRating("easy")).toBe(true);
    expect(isLexoraReviewRating("manual")).toBe(false);
  });

  it("rejects an invalid runtime rating", () => {
    expect(() => toFsrsRating("manual" as LexoraReviewRating)).toThrow(
      /Invalid Lexora review rating/,
    );
  });
});
