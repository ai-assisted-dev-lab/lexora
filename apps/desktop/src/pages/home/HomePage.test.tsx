import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "@/pages/HomePage";

// ── Tauri backend mock ───────────────────────────────────────────────────────

const DISCOVER_DECKS = [
  {
    id: 1,
    slug: "workplace-english",
    title: "Workplace English",
    description: "Meetings, updates, negotiation",
    level: "B2",
    wordCount: 420,
    tags: ["B2", "career"],
    packName: "Career Pack",
    packSlug: "career-pack",
    installed: true,
    sampleWords: ["briefing", "deadline", "proposal"],
  },
  {
    id: 2,
    slug: "daily-conversation",
    title: "Daily Conversation",
    description: "Natural phrases for everyday use",
    level: "B1",
    wordCount: 360,
    tags: ["B1"],
    packName: "Fluency Pack",
    packSlug: "fluency-pack",
    installed: false,
    sampleWords: ["actually", "suppose", "meanwhile"],
  },
  {
    id: 3,
    slug: "academic-reading",
    title: "Academic Reading",
    description: "Essays, reports, research verbs",
    level: "C1",
    wordCount: 510,
    tags: ["C1"],
    packName: "Scholar Pack",
    packSlug: "scholar-pack",
    installed: false,
    sampleWords: ["derive", "assumption", "notion"],
  },
];

const LIBRARY_DECKS = [
  {
    id: 10,
    slug: "ielts-core",
    title: "IELTS Core Vocabulary",
    description: "High-frequency IELTS themes",
    level: "B2",
    wordCount: 640,
    tags: ["B2"],
    packName: "Exam Pack",
    packSlug: "exam-pack",
    installedAt: "2026-05-01T08:00:00Z",
    masteredCount: 320,
    dueCount: 18,
    accuracy: 89,
    lastStudied: "2026-05-18T12:00:00Z",
    progress: 81,
    sampleWords: ["abundant", "comprise", "rigorous"],
  },
];

const GAMIFICATION = {
  level: 14,
  totalXp: 8420,
  currentLevelXp: 320,
  nextLevelXp: 900,
  xpToNextLevel: 580,
  weeklyXpEarned: 540,
  weeklyCardsReviewed: 86,
  todayCardsReviewed: 16,
  dailyGoalCards: 20,
  todayGoalMet: false,
  currentStreak: 12,
  longestStreak: 21,
  accuracy: 84,
  totalCardsReviewed: 1820,
  masteredWords: 412,
  weeklyActivity: [
    { date: "2026-05-12", cardsReviewed: 14 },
    { date: "2026-05-13", cardsReviewed: 20 },
    { date: "2026-05-14", cardsReviewed: 18 },
    { date: "2026-05-15", cardsReviewed: 22 },
    { date: "2026-05-16", cardsReviewed: 9 },
    { date: "2026-05-17", cardsReviewed: 16 },
    { date: "2026-05-18", cardsReviewed: 12 },
  ],
};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "list_discover_decks") {
      return Promise.resolve({
        decks: DISCOVER_DECKS,
        total: DISCOVER_DECKS.length,
      });
    }
    if (cmd === "list_library_decks") {
      return Promise.resolve({
        decks: LIBRARY_DECKS,
        total: LIBRARY_DECKS.length,
      });
    }
    if (cmd === "get_gamification_summary") {
      return Promise.resolve(GAMIFICATION);
    }
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

async function waitForLiveData() {
  await waitFor(() => {
    expect(screen.getByText("Workplace English")).toBeInTheDocument();
  });
}

describe("HomePage", () => {
  it("renders the mission hero and session CTA", async () => {
    renderHomePage();
    await waitForLiveData();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Expand words. Expand your world.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start today's session/i }),
    ).toHaveAttribute("href", "/study/session?mode=smart-review");
    expect(
      screen.getByText(/you reviewed 86 cards this week/i),
    ).toBeInTheDocument();
  });

  it("renders the required deck shelves from live data", async () => {
    renderHomePage();
    await waitForLiveData();

    expect(
      screen.getByRole("heading", { name: "Most Popular" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "My Library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recommended for You" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Workplace English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IELTS Core Vocabulary").length).toBeGreaterThan(
      0,
    );
  });

  it("renders right column widgets with accessible progress", async () => {
    renderHomePage();
    await waitForLiveData();

    expect(screen.getByLabelText("Home widgets")).toBeInTheDocument();
    expect(screen.getByText("Featured Deck")).toBeInTheDocument();
    expect(screen.getByText("Your Progress")).toBeInTheDocument();
    expect(screen.getByText("Study Activity")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Daily goal" }),
    ).toHaveAttribute("aria-valuenow", "16");
  });

  it("keeps sample words inside deck cards", async () => {
    renderHomePage();
    await waitForLiveData();

    const sampleWords = screen.getAllByLabelText("Sample words")[0];
    expect(within(sampleWords).getByText("briefing")).toBeInTheDocument();
    expect(within(sampleWords).getByText("deadline")).toBeInTheDocument();
  });
});
