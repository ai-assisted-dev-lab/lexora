import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Achievement } from "@/pages/achievements/types";
import { AchievementsPage } from "@/pages/AchievementsPage";

// ── Test fixture (lives in the test, not in production code) ──────────────

function buildAchievementsFixture(): Achievement[] {
  const items: Achievement[] = [
    // Streak
    {
      id: "streak-1",
      title: "First Steps",
      description: "Study for 3 consecutive days.",
      category: "Streak",
      state: "unlocked",
      tier: "bronze",
      xpReward: 50,
      unlockedAt: "2026-04-03",
      iconName: "Flame",
    },
    {
      id: "streak-2",
      title: "Iron Discipline",
      description: "Maintain a 30-day streak.",
      category: "Streak",
      state: "unlocked",
      tier: "gold",
      xpReward: 250,
      unlockedAt: "2026-04-28",
      iconName: "Flame",
    },
    {
      id: "streak-3",
      title: "Fortnight Focus",
      description: "Hit a 14-day streak.",
      category: "Streak",
      state: "in_progress",
      tier: "silver",
      xpReward: 150,
      progress: 10,
      progressLabel: "10 / 14 days",
      iconName: "Flame",
    },
    {
      id: "streak-4",
      title: "Unbroken Chain",
      description: "Maintain a 100-day streak.",
      category: "Streak",
      state: "locked",
      tier: "platinum",
      xpReward: 500,
      iconName: "Flame",
    },
    // Accuracy (recent)
    {
      id: "acc-1",
      title: "Sharp Eye",
      description: "Hit 90% accuracy in a session.",
      category: "Accuracy",
      state: "unlocked",
      tier: "silver",
      xpReward: 120,
      unlockedAt: "2026-05-14",
      iconName: "Target",
    },
    {
      id: "acc-2",
      title: "Flawless",
      description: "Hit 100% in three consecutive sessions.",
      category: "Accuracy",
      state: "locked",
      tier: "gold",
      xpReward: 300,
      iconName: "Target",
    },
    // Words
    {
      id: "words-1",
      title: "Knowledge Seeker",
      description: "Review 1,000 words.",
      category: "Words",
      state: "locked",
      tier: "silver",
      xpReward: 200,
      iconName: "BookOpen",
    },
    {
      id: "words-2",
      title: "Scholar",
      description: "Master 500 words.",
      category: "Words",
      state: "locked",
      tier: "gold",
      xpReward: 350,
      iconName: "BookOpen",
    },
    // Comeback (most recent unlock)
    {
      id: "weak-1",
      title: "Comeback",
      description: "Lift 10 weak words back to mastered.",
      category: "Weak Words",
      state: "unlocked",
      tier: "silver",
      xpReward: 130,
      unlockedAt: "2026-05-17",
      iconName: "Award",
    },
    // XP
    {
      id: "xp-1",
      title: "First XP",
      description: "Earn your first 100 XP.",
      category: "XP",
      state: "unlocked",
      tier: "bronze",
      xpReward: 25,
      unlockedAt: "2026-04-01",
      iconName: "Zap",
    },
    // Hidden
    {
      id: "hidden-1",
      title: "Secret 1",
      description: "Unlock the first hidden achievement.",
      category: "Hidden",
      state: "hidden",
      tier: "gold",
      xpReward: 200,
      iconName: "Award",
    },
    {
      id: "hidden-2",
      title: "Secret 2",
      description: "Unlock the second hidden achievement.",
      category: "Hidden",
      state: "hidden",
      tier: "gold",
      xpReward: 200,
      iconName: "Award",
    },
    {
      id: "hidden-3",
      title: "Secret 3",
      description: "Unlock the third hidden achievement.",
      category: "Hidden",
      state: "hidden",
      tier: "platinum",
      xpReward: 500,
      iconName: "Award",
    },
  ];

  while (items.length < 27) {
    items.push({
      id: `pad-${items.length}`,
      title: `Filler ${items.length}`,
      description: "Placeholder achievement.",
      category: "Decks",
      state: "locked",
      tier: "bronze",
      xpReward: 10,
      iconName: "Award",
    });
  }
  return items;
}

vi.mock("@/services/commands/achievements", async () => {
  const items = buildAchievementsFixture();
  return {
    getAchievements: vi.fn().mockResolvedValue({
      achievements: items,
      unlocked: items.filter((a) => a.state === "unlocked").length,
      inProgress: items.filter((a) => a.state === "in_progress").length,
      total: items.length,
    }),
    recordPronunciationPractice: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(cleanup);

async function renderAndWait() {
  render(<AchievementsPage />);
  await waitFor(() =>
    expect(screen.getAllByText("First Steps").length).toBeGreaterThan(0),
  );
}

describe("AchievementsPage", () => {
  it("renders the hero with summary stats", async () => {
    await renderAndWait();

    expect(
      screen.getByRole("heading", { level: 2, name: "Achievements" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Achievement summary")).toBeInTheDocument();
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders the Recently Unlocked section with most recent first", async () => {
    await renderAndWait();

    expect(
      screen.getByRole("heading", { name: "Recently Unlocked" }),
    ).toBeInTheDocument();
    // Most recent: "Comeback" (2026-05-17)
    expect(screen.getAllByText("Comeback").length).toBeGreaterThan(0);
    // Second most recent: "Sharp Eye" (2026-05-14)
    expect(screen.getAllByText("Sharp Eye").length).toBeGreaterThan(0);
  });

  it("renders all category filter buttons", async () => {
    await renderAndWait();

    const toolbar = screen.getByRole("toolbar", {
      name: "Filter by category",
    });
    expect(toolbar).toBeInTheDocument();

    for (const label of [
      "All",
      "Streak",
      "XP",
      "Words",
      "Decks",
      "Accuracy",
      "Weak Words",
      "Pronunciation",
      "Hidden",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("filters the achievement grid to the selected category", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole("button", { name: "Streak" }));

    expect(screen.getByRole("button", { name: "Streak" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const grid = screen.getByLabelText("Achievements list");
    expect(within(grid).getByText("First Steps")).toBeInTheDocument();
    expect(within(grid).getByText("Iron Discipline")).toBeInTheDocument();
    expect(within(grid).getByText("Unbroken Chain")).toBeInTheDocument();
    expect(
      within(grid).queryByText("Knowledge Seeker"),
    ).not.toBeInTheDocument();
    expect(within(grid).queryByText("Flawless")).not.toBeInTheDocument();
    expect(within(grid).queryByText("Scholar")).not.toBeInTheDocument();
  });

  it("shows progress bar for in-progress achievements", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole("button", { name: "Streak" }));

    expect(screen.getByText("10 / 14 days")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows hidden achievements with ??? placeholders", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole("button", { name: "Hidden" }));

    const hiddenCards = screen.getAllByLabelText("Hidden achievement");
    expect(hiddenCards.length).toBe(3);

    const questionMarks = screen.getAllByText("???");
    expect(questionMarks.length).toBeGreaterThan(0);
  });

  it("restores all achievements when All filter is clicked", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole("button", { name: "XP" }));
    await user.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("27 achievements")).toBeInTheDocument();
  });
});
