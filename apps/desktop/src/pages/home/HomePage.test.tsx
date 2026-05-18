import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomePage } from "@/pages/HomePage";

afterEach(cleanup);

describe("HomePage", () => {
  it("renders the mission hero and session CTA", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Expand words. Expand your world.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start today's session/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you studied 86 words this week/i),
    ).toBeInTheDocument();
  });

  it("renders the required deck shelves from mock data", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Most Popular" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "My Library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recommended for You" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Workplace English")).toHaveLength(2);
    expect(screen.getByText("IELTS Core Vocabulary")).toBeInTheDocument();
  });

  it("renders right column widgets with accessible progress", () => {
    render(<HomePage />);

    expect(screen.getByLabelText("Home widgets")).toBeInTheDocument();
    expect(screen.getByText("Featured Deck")).toBeInTheDocument();
    expect(screen.getByText("Your Progress")).toBeInTheDocument();
    expect(screen.getByText("Study Activity")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Daily goal" }),
    ).toHaveAttribute("aria-valuenow", "16");
  });

  it("keeps sample words inside deck cards", () => {
    render(<HomePage />);

    const sampleWords = screen.getAllByLabelText("Sample words")[0];
    expect(within(sampleWords).getByText("briefing")).toBeInTheDocument();
    expect(within(sampleWords).getByText("deadline")).toBeInTheDocument();
  });
});
