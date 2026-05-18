import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { LibraryPage } from "../LibraryPage";

afterEach(cleanup);

function renderLibrary() {
  return render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  it("renders the collection hero and summary cards", () => {
    renderLibrary();

    expect(
      screen.getByRole("heading", {
        name: "Your installed learning decks, ready offline.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Average mastery")).toBeInTheDocument();
    expect(screen.getByText("Browse Discover")).toBeInTheDocument();
  });

  it("renders all required library shelves", () => {
    renderLibrary();

    expect(
      screen.getByRole("heading", { name: "Continue Learning" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recently Studied" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Favorites" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Weak Decks" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "All Decks" }),
    ).toBeInTheDocument();
  });

  it("renders installed deck cards with progress, mastery, due count, and study action", () => {
    renderLibrary();

    expect(screen.getAllByText("IELTS Speaking Core").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("72% mastery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18 due").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("progressbar", {
        name: "IELTS Speaking Core progress",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Study" }).length,
    ).toBeGreaterThan(0);
  });

  it("filters to weak installed decks", () => {
    renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Weak" }));

    expect(screen.getByText("Weak Decks")).toBeInTheDocument();
    expect(screen.getByText("TOEIC Workplace Actions")).toBeInTheDocument();
    expect(screen.getByText("Tech Product Vocabulary")).toBeInTheDocument();
    expect(screen.queryByText("Daily Life Survival")).not.toBeInTheDocument();
  });

  it("shows a Discover empty state for filters with no decks", () => {
    renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    expect(screen.getByText("No completed decks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
  });
});
