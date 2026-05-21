import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AchievementsPage } from "@/pages/AchievementsPage";

vi.mock("@/services/commands/achievements", () => ({
  getAchievements: vi.fn().mockRejectedValue(new Error("Tauri unavailable")),
}));

afterEach(cleanup);

describe("AchievementsPage", () => {
  it("renders the hero with summary stats", () => {
    render(<AchievementsPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Achievements" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Achievement summary")).toBeInTheDocument();
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders the Recently Unlocked section with most recent first", () => {
    render(<AchievementsPage />);

    expect(
      screen.getByRole("heading", { name: "Recently Unlocked" }),
    ).toBeInTheDocument();
    // Most recent: "Comeback" (2026-05-17)
    expect(screen.getAllByText("Comeback").length).toBeGreaterThan(0);
    // Second most recent: "Sharp Eye" (2026-05-14)
    expect(screen.getAllByText("Sharp Eye").length).toBeGreaterThan(0);
  });

  it("renders all category filter buttons", () => {
    render(<AchievementsPage />);

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
    render(<AchievementsPage />);

    await user.click(screen.getByRole("button", { name: "Streak" }));

    expect(screen.getByRole("button", { name: "Streak" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Streak-only achievements should appear in the grid
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    expect(screen.getByText("Iron Discipline")).toBeInTheDocument();
    expect(screen.getByText("Unbroken Chain")).toBeInTheDocument();
    // Locked non-Streak achievements are absent from both grid and Recently Unlocked
    expect(screen.queryByText("Knowledge Seeker")).not.toBeInTheDocument();
    expect(screen.queryByText("Flawless")).not.toBeInTheDocument();
    expect(screen.queryByText("Scholar")).not.toBeInTheDocument();
  });

  it("shows progress bar for in-progress achievements", async () => {
    const user = userEvent.setup();
    render(<AchievementsPage />);

    await user.click(screen.getByRole("button", { name: "Streak" }));

    // "Fortnight Focus" is in_progress — progressLabel and bar should be visible
    expect(screen.getByText("10 / 14 days")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows hidden achievements with ??? placeholders", async () => {
    const user = userEvent.setup();
    render(<AchievementsPage />);

    await user.click(screen.getByRole("button", { name: "Hidden" }));

    const hiddenCards = screen.getAllByLabelText("Hidden achievement");
    expect(hiddenCards.length).toBe(3);

    const questionMarks = screen.getAllByText("???");
    expect(questionMarks.length).toBeGreaterThan(0);
  });

  it("restores all achievements when All filter is clicked", async () => {
    const user = userEvent.setup();
    render(<AchievementsPage />);

    await user.click(screen.getByRole("button", { name: "XP" }));
    await user.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("27 achievements")).toBeInTheDocument();
  });
});
