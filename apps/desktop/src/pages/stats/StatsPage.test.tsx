import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StatsPage } from "@/pages/StatsPage";

afterEach(cleanup);

describe("StatsPage", () => {
  it("renders the hero heading", () => {
    render(<StatsPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Progress.*Statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("XP summary")).toBeInTheDocument();
  });

  it("renders four summary stat cards", () => {
    render(<StatsPage />);

    const summary = screen.getByLabelText("Key statistics");
    expect(within(summary).getByText("Current Streak")).toBeInTheDocument();
    expect(within(summary).getByText("XP Today")).toBeInTheDocument();
    expect(within(summary).getByText("Accuracy")).toBeInTheDocument();
    expect(within(summary).getByText("Mastered")).toBeInTheDocument();
  });

  it("renders the weekly activity chart", () => {
    render(<StatsPage />);

    expect(
      screen.getByRole("img", { name: /Weekly words reviewed/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Weekly Activity")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders mastery distribution bars", () => {
    render(<StatsPage />);

    const breakdown = screen.getByLabelText("Mastery level breakdown");
    expect(within(breakdown).getByText("Mastered")).toBeInTheDocument();
    expect(within(breakdown).getByText("Reviewing")).toBeInTheDocument();
    expect(within(breakdown).getByText("Learning")).toBeInTheDocument();
    expect(within(breakdown).getByText("New")).toBeInTheDocument();

    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(4);
  });

  it("renders the weak topics table with accuracy badges", () => {
    render(<StatsPage />);

    expect(screen.getByText("Weak Topics")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Weak topics list" });
    expect(within(table).getByText("Academic Verbs")).toBeInTheDocument();
    expect(within(table).getByText("Phrasal Verbs")).toBeInTheDocument();
    expect(within(table).getByText("62%")).toBeInTheDocument();
    expect(within(table).getByText("76%")).toBeInTheDocument();
  });
});
