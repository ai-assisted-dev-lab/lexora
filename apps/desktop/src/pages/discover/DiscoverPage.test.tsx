import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DiscoverPage } from "@/pages/DiscoverPage";

afterEach(cleanup);

describe("DiscoverPage", () => {
  it("renders the local-first catalog hero and featured decks", () => {
    render(<DiscoverPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Discover focused English-Vietnamese decks.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Featured Decks" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("IELTS Band 7 Lexis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TOEIC Workplace Core").length).toBeGreaterThan(
      0,
    );
  });

  it("renders goal, CEFR, and topic filters", () => {
    render(<DiscoverPage />);

    expect(screen.getByRole("button", { name: "IELTS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "C1" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Software" }),
    ).toBeInTheDocument();
  });

  it("filters catalog cards by category and CEFR", async () => {
    const user = userEvent.setup();
    render(<DiscoverPage />);

    await user.click(screen.getByRole("button", { name: "Tech" }));
    await user.click(screen.getByRole("button", { name: "B2" }));

    expect(screen.getAllByText("Tech Product English").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("IELTS Band 7 Lexis")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tech" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows an empty state and reset action when filters do not match", async () => {
    const user = userEvent.setup();
    render(<DiscoverPage />);

    await user.click(screen.getByRole("button", { name: "TOEIC" }));
    await user.click(screen.getByRole("button", { name: "C2" }));

    expect(
      screen.getByText("No decks match these filters"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getAllByText("IELTS Band 7 Lexis").length).toBeGreaterThan(0);
  });

  it("renders catalog card metadata and placeholder install actions", () => {
    render(<DiscoverPage />);

    const card = screen
      .getByText("Academic Research Verbs")
      .closest(".catalog-card");
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByText("360 words"),
    ).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: /add to library/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders loading, empty, and error visual states", () => {
    render(<DiscoverPage />);

    expect(screen.getByText("Loading state")).toBeInTheDocument();
    expect(screen.getByText("Empty state")).toBeInTheDocument();
    expect(screen.getByText("Error state")).toBeInTheDocument();
    expect(screen.getByText("Offline ready")).toBeInTheDocument();
  });
});
