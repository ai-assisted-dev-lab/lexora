import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatsPage } from "@/pages/StatsPage";

// Recharts uses SVG layout APIs unavailable in jsdom. Mock the components so
// bar charts render their data labels as plain text we can assert against.
vi.mock("recharts", () => ({
  BarChart: ({
    children,
    data,
  }: {
    children: ReactNode;
    data?: Array<{ day?: string }>;
  }) => (
    <div>
      {data?.map((d) => d.day && <span key={d.day}>{d.day}</span>)}
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Cell: () => null,
}));

const GAMIFICATION = {
  level: 8,
  totalXp: 1860,
  currentLevelXp: 320,
  nextLevelXp: 900,
  xpToNextLevel: 580,
  weeklyXpEarned: 540,
  weeklyCardsReviewed: 340,
  todayXpEarned: 240,
  todayCardsReviewed: 16,
  dailyGoalCards: 20,
  todayGoalMet: false,
  currentStreak: 10,
  longestStreak: 14,
  accuracy: 87,
  totalCardsReviewed: 1820,
  totalSessions: 7,
  masteredWords: 320,
  weeklyActivity: [
    { date: "2026-05-12", cardsReviewed: 42 }, // Tue (UTC)
    { date: "2026-05-13", cardsReviewed: 58 }, // Wed
    { date: "2026-05-14", cardsReviewed: 31 }, // Thu
    { date: "2026-05-15", cardsReviewed: 74 }, // Fri
    { date: "2026-05-16", cardsReviewed: 65 }, // Sat
    { date: "2026-05-17", cardsReviewed: 48 }, // Sun
    { date: "2026-05-18", cardsReviewed: 22 }, // Mon
  ],
};

const ANALYTICS = {
  mastery: {
    masteredCount: 320,
    reviewingCount: 180,
    learningCount: 95,
    newCount: 55,
    total: 650,
  },
  weakWords: [
    {
      wordId: 1,
      word: "Academic Verbs",
      deckName: "IELTS Band 7 Lexis",
      accuracy: 62,
      totalReviews: 45,
    },
    {
      wordId: 2,
      word: "Phrasal Verbs",
      deckName: "Daily English Foundation",
      accuracy: 76,
      totalReviews: 61,
    },
  ],
};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "get_gamification_summary")
      return Promise.resolve(GAMIFICATION);
    if (cmd === "get_analytics") return Promise.resolve(ANALYTICS);
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

async function renderStats() {
  render(<StatsPage />);
  await waitFor(() => {
    expect(screen.getAllByText(/Mastered/i).length).toBeGreaterThan(0);
  });
}

describe("StatsPage", () => {
  it("renders the hero heading", async () => {
    await renderStats();

    expect(
      screen.getByRole("heading", { level: 2, name: /Progress.*Statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("XP summary")).toBeInTheDocument();
  });

  it("renders four summary stat cards", async () => {
    await renderStats();

    const summary = screen.getByLabelText("Key statistics");
    expect(within(summary).getByText("Current Streak")).toBeInTheDocument();
    expect(within(summary).getByText("XP Today")).toBeInTheDocument();
    expect(within(summary).getByText("Accuracy")).toBeInTheDocument();
    expect(within(summary).getByText("Mastered")).toBeInTheDocument();
  });

  it("renders the weekly activity chart with live day labels", async () => {
    await renderStats();

    expect(
      screen.getByRole("img", { name: /Weekly words reviewed/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Weekly Activity")).toBeInTheDocument();
    // Mon and Sun come from the live weeklyActivity timestamps.
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders mastery distribution bars from live analytics", async () => {
    await renderStats();

    const breakdown = screen.getByLabelText("Mastery level breakdown");
    expect(within(breakdown).getByText("Mastered")).toBeInTheDocument();
    expect(within(breakdown).getByText("Reviewing")).toBeInTheDocument();
    expect(within(breakdown).getByText("Learning")).toBeInTheDocument();
    expect(within(breakdown).getByText("New")).toBeInTheDocument();

    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(4);
  });

  it("renders the weak topics table with accuracy badges", async () => {
    await renderStats();

    expect(screen.getByText("Weak Topics")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Weak topics list" });
    expect(within(table).getByText("Academic Verbs")).toBeInTheDocument();
    expect(within(table).getByText("Phrasal Verbs")).toBeInTheDocument();
    expect(within(table).getByText("62%")).toBeInTheDocument();
    expect(within(table).getByText("76%")).toBeInTheDocument();
  });
});
