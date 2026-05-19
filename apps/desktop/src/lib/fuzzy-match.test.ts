import { describe, expect, it } from "vitest";

import { gradeAnswer, gradeToRating, type MatchGrade } from "./fuzzy-match";

describe("gradeAnswer", () => {
  it("grades an exact match as correct", () => {
    expect(gradeAnswer("học", "học")).toBe("correct");
  });

  it("grades a case-insensitive match as correct", () => {
    expect(gradeAnswer("Trình Bày", "trình bày")).toBe("correct");
  });

  it("grades a leading/trailing whitespace match as correct", () => {
    expect(gradeAnswer("  quan trọng  ", "quan trọng")).toBe("correct");
  });

  it("grades extra internal whitespace as correct after normalization", () => {
    expect(gradeAnswer("quan  trọng", "quan trọng")).toBe("correct");
  });

  it("grades a diacritics-stripped exact match as almost", () => {
    expect(gradeAnswer("hoc", "học")).toBe("almost");
  });

  it("grades stripped Vietnamese tones as almost", () => {
    expect(gradeAnswer("trinh bay chi tiet", "trình bày chi tiết")).toBe(
      "almost",
    );
  });

  it("grades a one-character typo in a medium word as almost", () => {
    expect(gradeAnswer("quan tronh", "quan trọng")).toBe("almost");
  });

  it("grades a two-character typo in a long answer as almost", () => {
    expect(gradeAnswer("trinh bay chi teit", "trình bày chi tiết")).toBe(
      "almost",
    );
  });

  it("grades a one-character typo in a short answer (≤4 chars) as wrong", () => {
    expect(gradeAnswer("vua", "vui")).toBe("wrong");
  });

  it("grades an empty input as wrong", () => {
    expect(gradeAnswer("", "học")).toBe("wrong");
  });

  it("grades a whitespace-only input as wrong", () => {
    expect(gradeAnswer("   ", "học")).toBe("wrong");
  });

  it("grades a completely different answer as wrong", () => {
    expect(gradeAnswer("completely different", "trình bày chi tiết")).toBe(
      "wrong",
    );
  });

  it("grades a two-character typo in a short word as wrong", () => {
    expect(gradeAnswer("hkc", "học")).toBe("wrong");
  });

  it("grades a stripped-plus-single-typo in a medium word as almost", () => {
    // "quan tronh" stripped = "quan tronh", expected stripped = "quan trong"
    // dist = 1 → threshold(9) = 1 → almost
    expect(gradeAnswer("quan tronh", "quan trọng")).toBe("almost");
  });
});

describe("gradeToRating", () => {
  const cases: Array<[MatchGrade, "again" | "hard" | "good"]> = [
    ["correct", "good"],
    ["almost", "hard"],
    ["wrong", "again"],
  ];

  it.each(cases)("maps %s to %s", (grade, rating) => {
    expect(gradeToRating(grade)).toBe(rating);
  });
});
