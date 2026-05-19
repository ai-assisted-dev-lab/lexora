import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WordDetailPage } from "../WordDetailPage";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const wordDetail = {
  id: 1,
  headword: "run",
  partOfSpeech: "verb",
  ipaUk: "/rʌn/",
  ipaUs: "/rʌn/",
  frequencyRank: 82,
  cefrLevel: "A1",
  packName: "English Essentials",
  packSlug: "english-essentials-demo",
  senses: [
    {
      id: 1,
      senseIndex: 0,
      definitionEn: "To move quickly on foot",
      definitionVi: "Chạy nhanh bằng chân",
      register: "common",
      domain: null,
      examples: [
        {
          id: 1,
          sentenceEn: "She runs five kilometres every morning.",
          sentenceVi: "Cô ấy chạy năm kilômét mỗi buổi sáng.",
          audioPath: null,
        },
      ],
    },
    {
      id: 2,
      senseIndex: 1,
      definitionEn: "To manage or operate something",
      definitionVi: "quản lý hoặc vận hành",
      register: "common",
      domain: "business",
      examples: [],
    },
    {
      id: 3,
      senseIndex: 2,
      definitionEn: "To continue for a period of time",
      definitionVi: "kéo dài trong một khoảng thời gian",
      register: "general",
      domain: null,
      examples: [],
    },
  ],
  pronunciations: [
    {
      id: 1,
      dialect: "uk",
      audioPath: "audio/run-uk.mp3",
      ttsEngine: "bundled",
    },
  ],
  relations: [
    {
      id: 1,
      relationType: "see_also",
      wordId: 2,
      headword: "eat",
    },
  ],
  reviewState: {
    state: "learning",
    due: "2026-05-20T00:00:00Z",
    reps: 3,
    lapses: 1,
    lastReview: "2026-05-19T00:00:00Z",
  },
  reviewHistory: [
    {
      id: 1,
      rating: 3,
      result: "pass",
      mode: "review",
      reviewedAt: "2026-05-19T00:00:00Z",
    },
  ],
};

afterEach(cleanup);

function renderWordDetail(path = "/word/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/word/:wordId" element={<WordDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WordDetailPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(wordDetail);
  });

  it("loads real word core fields, IPA, and review state", async () => {
    renderWordDetail();

    expect(
      await screen.findByRole("heading", { level: 1, name: "run" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vocabulary entry / 1")).toBeInTheDocument();
    expect(screen.getByText(/verb - English Essentials/)).toBeInTheDocument();
    expect(screen.getByText("UK /rʌn/")).toBeInTheDocument();
    expect(screen.getAllByText("Chạy nhanh bằng chân").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole("progressbar", { name: "Word mastery" }),
    ).toHaveAttribute("aria-valuenow", "45");
  });

  it("shows common senses first and expands additional meanings", async () => {
    renderWordDetail();

    expect((await screen.findAllByText("common")).length).toBeGreaterThan(0);
    expect(screen.getByText("business")).toBeInTheDocument();
    expect(
      screen.queryByText("kéo dài trong một khoảng thời gian"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show 1 more senses" }));

    expect(
      screen.getByText("kéo dài trong một khoảng thời gian"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show common meanings only" }),
    );

    expect(
      screen.queryByText("kéo dài trong một khoảng thời gian"),
    ).not.toBeInTheDocument();
  });

  it("switches to pronunciation metadata without audio playback", async () => {
    renderWordDetail();

    await screen.findByText("run");
    fireEvent.click(screen.getByRole("tab", { name: "Pronunciation" }));

    expect(screen.getByText("Audio metadata only")).toBeInTheDocument();
    expect(
      screen.getByText("No audio playback is implemented yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("UK audio")).toBeInTheDocument();
    expect(screen.getByText("audio/run-uk.mp3")).toBeInTheDocument();
  });

  it("renders usage examples, relations, and review history", async () => {
    renderWordDetail();

    await screen.findByText("run");
    fireEvent.click(screen.getByRole("tab", { name: "Usage" }));
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(
      screen.getByText("She runs five kilometres every morning."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Word Network" }));
    expect(screen.getByText("See Also")).toBeInTheDocument();
    expect(screen.getByText("eat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Review History" }));
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("pass - review")).toBeInTheDocument();
  });

  it("shows a not-found state for invalid route IDs", async () => {
    renderWordDetail("/word/not-a-number");

    expect(await screen.findByText("Word not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Library" }),
    ).toHaveAttribute("href", "/library");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows a not-found state for missing local words", async () => {
    invokeMock.mockRejectedValueOnce({
      kind: "NotFound",
      message: "Word 999 was not found",
    });

    renderWordDetail("/word/999");

    expect(await screen.findByText("Word not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Library" }),
    ).toHaveAttribute("href", "/library");
  });
});
