import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfilePage } from "@/pages/ProfilePage";
import { AuthContext, type AuthContextValue } from "@/store/authContext";

const GAMIFICATION = {
  level: 8,
  totalXp: 9840,
  currentLevelXp: 1860,
  nextLevelXp: 2500,
  xpToNextLevel: 640,
  weeklyXpEarned: 540,
  weeklyCardsReviewed: 86,
  todayXpEarned: 50,
  todayCardsReviewed: 12,
  dailyGoalCards: 20,
  todayGoalMet: false,
  currentStreak: 10,
  longestStreak: 14,
  accuracy: 84,
  totalCardsReviewed: 1820,
  totalSessions: 47,
  masteredWords: 320,
  weeklyActivity: [],
};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "get_gamification_summary") {
      return Promise.resolve(GAMIFICATION);
    }
    return Promise.resolve(undefined);
  }),
}));

const authValue: AuthContextValue = {
  user: { userId: 1, username: "Minh Quân", role: "learner" },
  isLoading: false,
  login: () => {},
  logout: async () => {},
};

function renderProfilePage() {
  return render(
    <AuthContext.Provider value={authValue}>
      <ProfilePage />
    </AuthContext.Provider>,
  );
}

async function waitForLiveStats() {
  await waitFor(() => {
    expect(screen.getAllByText(/Level 8/i).length).toBeGreaterThan(0);
  });
}

afterEach(cleanup);

describe("ProfilePage", () => {
  it("renders the user name from the auth context", async () => {
    renderProfilePage();
    await waitForLiveStats();

    expect(
      screen.getByRole("heading", { level: 2, name: "Minh Quân" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/signed in as learner/i)).toBeInTheDocument();
  });

  it("renders the XP progress bar with live values", async () => {
    renderProfilePage();
    await waitForLiveStats();

    expect(
      screen.getByRole("progressbar", { name: /to Level/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1,860 / 2,500")).toBeInTheDocument();
  });

  it("renders quick stats in the hero", async () => {
    renderProfilePage();
    await waitForLiveStats();

    const quick = screen.getByLabelText("Quick stats");
    expect(within(quick).getByText("10")).toBeInTheDocument(); // streak
    expect(within(quick).getByText("9,840")).toBeInTheDocument(); // total XP
    expect(within(quick).getByText("320")).toBeInTheDocument(); // mastered
  });

  it("renders the four summary stat cards", async () => {
    renderProfilePage();
    await waitForLiveStats();

    const stats = screen.getByLabelText("Profile statistics");
    expect(within(stats).getByText("Current Streak")).toBeInTheDocument();
    expect(within(stats).getByText("Total XP")).toBeInTheDocument();
    expect(within(stats).getByText("Mastered Words")).toBeInTheDocument();
    expect(within(stats).getByText("Sessions")).toBeInTheDocument();
  });

  it("shows empty-state copy for showcase + activity panels", async () => {
    renderProfilePage();
    await waitForLiveStats();

    expect(screen.getByText(/No favourite deck yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No badges pinned yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No recent sessions/i)).toBeInTheDocument();
  });
});
