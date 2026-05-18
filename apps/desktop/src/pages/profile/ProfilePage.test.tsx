import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProfilePage } from "@/pages/ProfilePage";

afterEach(cleanup);

describe("ProfilePage", () => {
  it("renders the user name and level badge", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Minh Quân" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Level 8").length).toBeGreaterThan(0);
    expect(screen.getByText(/Member since March 2026/i)).toBeInTheDocument();
  });

  it("renders the XP progress bar", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("progressbar", { name: /to Level/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1,860 / 2,500")).toBeInTheDocument();
  });

  it("renders quick stats in the hero", () => {
    render(<ProfilePage />);

    const quick = screen.getByLabelText("Quick stats");
    expect(within(quick).getByText("10")).toBeInTheDocument();
    expect(within(quick).getByText("9,840")).toBeInTheDocument();
    expect(within(quick).getByText("320")).toBeInTheDocument();
  });

  it("renders the four summary stat cards", () => {
    render(<ProfilePage />);

    const stats = screen.getByLabelText("Profile statistics");
    expect(within(stats).getByText("Current Streak")).toBeInTheDocument();
    expect(within(stats).getByText("Total XP")).toBeInTheDocument();
    expect(within(stats).getByText("Mastered Words")).toBeInTheDocument();
    expect(within(stats).getByText("Sessions")).toBeInTheDocument();
  });

  it("renders the favourite deck with progress", () => {
    render(<ProfilePage />);

    expect(screen.getAllByText("IELTS Band 7 Lexis").length).toBeGreaterThan(0);
    expect(screen.getByText("435 / 680 words")).toBeInTheDocument();
  });

  it("renders the achievement showcase", () => {
    render(<ProfilePage />);

    expect(screen.getByText("Achievement Showcase")).toBeInTheDocument();
    expect(screen.getByText("Week Warrior")).toBeInTheDocument();
    expect(screen.getByText("Sharp Eye")).toBeInTheDocument();
    expect(screen.getByText("Century")).toBeInTheDocument();
  });

  it("renders the recent activity feed", () => {
    render(<ProfilePage />);

    const feed = screen.getByLabelText("Recent sessions");
    expect(
      within(feed).getAllByText("IELTS Band 7 Lexis").length,
    ).toBeGreaterThan(0);
    expect(within(feed).getByText("+110 XP")).toBeInTheDocument();
    expect(within(feed).getByText("+145 XP")).toBeInTheDocument();
  });
});
