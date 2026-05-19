import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryPage } from "../LibraryPage";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const libraryDecks = [
  {
    id: 1,
    slug: "ielts-speaking-core",
    title: "IELTS Speaking Core",
    description:
      "High-frequency prompts, transitions, and opinion language for B2-C1 interviews.",
    dueCount: 18,
    installedAt: "2026-05-15T08:00:00Z",
    lastStudied: "2026-05-19T08:00:00Z",
    level: "intermediate",
    masteredCount: 619,
    accuracy: 72,
    progress: 64,
    tags: ["IELTS", "Speaking", "Fluency"],
    wordCount: 860,
    packName: "Demo Pack",
    packSlug: "demo-pack",
  },
  {
    id: 2,
    slug: "toeic-workplace-actions",
    title: "TOEIC Workplace Actions",
    description:
      "Office tasks, schedules, requests, and daily business verbs for TOEIC Part 3 and 4.",
    dueCount: 31,
    installedAt: "2026-05-14T08:00:00Z",
    lastStudied: "2026-05-18T08:00:00Z",
    level: "beginner",
    masteredCount: 389,
    accuracy: 54,
    progress: 48,
    tags: ["TOEIC", "Business", "Listening"],
    wordCount: 720,
    packName: "Demo Pack",
    packSlug: "demo-pack",
  },
];

afterEach(cleanup);

function renderLibrary() {
  return render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      decks: libraryDecks,
      total: libraryDecks.length,
    });
  });

  it("renders the collection hero and summary cards", async () => {
    renderLibrary();

    expect(
      await screen.findByRole("heading", {
        name: "Your installed learning decks, ready offline.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Average mastery")).toBeInTheDocument();
    expect(screen.getByText("Browse Discover")).toBeInTheDocument();
  });

  it("renders all required library shelves", async () => {
    renderLibrary();

    expect(await screen.findAllByText("IELTS Speaking Core")).not.toHaveLength(
      0,
    );
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

  it("renders installed deck cards with progress, mastery, due count, and study action", async () => {
    renderLibrary();

    expect(await screen.findAllByText("IELTS Speaking Core")).not.toHaveLength(
      0,
    );
    expect(screen.getAllByText("619 mastered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18 due").length).toBeGreaterThan(0);
    expect(screen.getAllByText("72% accuracy").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("progressbar", {
        name: "IELTS Speaking Core progress",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Study" }).length,
    ).toBeGreaterThan(0);
  });

  it("filters to weak installed decks", async () => {
    renderLibrary();

    await screen.findAllByText("IELTS Speaking Core");
    fireEvent.click(screen.getByRole("button", { name: "Weak" }));

    expect(screen.getByText("Weak Decks")).toBeInTheDocument();
    expect(screen.getByText("TOEIC Workplace Actions")).toBeInTheDocument();
    expect(screen.getAllByText("IELTS Speaking Core").length).toBeGreaterThan(
      0,
    );
  });

  it("shows a Discover empty state for filters with no decks", async () => {
    renderLibrary();

    await screen.findAllByText("IELTS Speaking Core");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    expect(screen.getByText("No completed decks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
  });

  it("shows a Discover empty state when no decks are installed", async () => {
    invokeMock.mockResolvedValueOnce({ decks: [], total: 0 });

    renderLibrary();

    expect(
      await screen.findByText("No decks installed yet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
  });
});
