export type MatchGrade = "correct" | "almost" | "wrong";

export interface MatchResult {
  grade: MatchGrade;
  normalizedTyped: string;
  normalizedExpected: string;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{Mn}/gu, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function editThreshold(expectedLen: number): number {
  if (expectedLen <= 4) return 0;
  if (expectedLen <= 10) return 1;
  return 2;
}

export function gradeAnswer(typed: string, expected: string): MatchGrade {
  const normalizedTyped = normalize(typed);
  const normalizedExpected = normalize(expected);

  if (!normalizedTyped || !normalizedExpected) return "wrong";

  if (normalizedTyped === normalizedExpected) return "correct";

  const strippedTyped = stripDiacritics(normalizedTyped);
  const strippedExpected = stripDiacritics(normalizedExpected);

  if (strippedTyped === strippedExpected) return "almost";

  const threshold = editThreshold(normalizedExpected.length);

  if (threshold > 0) {
    const dist = levenshtein(normalizedTyped, normalizedExpected);
    if (dist <= threshold) return "almost";

    const strippedDist = levenshtein(strippedTyped, strippedExpected);
    if (strippedDist <= threshold) return "almost";
  }

  return "wrong";
}

export function gradeToRating(grade: MatchGrade): "again" | "hard" | "good" {
  switch (grade) {
    case "correct":
      return "good";
    case "almost":
      return "hard";
    case "wrong":
      return "again";
  }
}
