import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeckDetailPage } from "../DeckDetailPage";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const deckDetail = {
  id: 1,
  slug: "everyday-actions",
  title: "Everyday Actions",
  description: "Essential English verbs used in daily life",
  level: "beginner",
  wordCount: 5,
  tags: ["verbs", "beginner", "A1"],
  packName: "English Essentials",
  packSlug: "english-essentials-demo",
  banner: null,
  installed: true,
  installedAt: "2026-05-19T08:00:00Z",
  progress: {
    masteredCount: 0,
    dueCount: 0,
    accuracy: 0,
    lastStudied: null,
    progress: 0,
  },
  words: [
    {
      id: 1,
      headword: "run",
      partOfSpeech: "verb",
      level: "A1",
      definitionEn: "To move quickly on foot",
      definitionVi: "Chạy nhanh bằng chân",
      example: "She runs five kilometres every morning.",
      dueState: "New",
    },
  ],
};

afterEach(cleanup);

function renderDeckDetail(path = "/library/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/library/:deckId" element={<DeckDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DeckDetailPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(deckDetail);
  });

  it("loads real deck metadata and vocabulary preview", async () => {
    renderDeckDetail();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Everyday Actions",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Installed deck / everyday-actions"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Beginner").length).toBeGreaterThan(0);
    expect(screen.getByText("English Essentials")).toBeInTheDocument();
    expect(screen.getByText("5 words")).toBeInTheDocument();
    expect(screen.getByText("run")).toBeInTheDocument();
    expect(screen.getByText("Chạy nhanh bằng chân")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders progress placeholders honestly from the command payload", async () => {
    renderDeckDetail();

    expect(await screen.findByText("Progress Summary")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Deck progress" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Due now")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("New deck")).toBeInTheDocument();
  });

  it("routes study actions to study-session placeholders", async () => {
    renderDeckDetail();

    expect(await screen.findByText("Choose a Study Mode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      "/study/session?deckId=1&mode=continue",
    );
    expect(
      screen.getByRole("link", { name: "Start Learning" }),
    ).toHaveAttribute("href", "/study/session?deckId=1&mode=learn");
    expect(screen.getByLabelText("Smart Review placeholder")).toHaveAttribute(
      "href",
      "/study/session?deckId=1&mode=smart-review",
    );
  });

  it("shows a not-found state for invalid route IDs", async () => {
    renderDeckDetail("/library/not-a-number");

    expect(await screen.findByText("Deck not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows a not-found state for missing local decks", async () => {
    invokeMock.mockRejectedValueOnce({
      kind: "NotFound",
      message: "Deck 999 was not found",
    });

    renderDeckDetail("/library/999");

    expect(await screen.findByText("Deck not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
  });
});
