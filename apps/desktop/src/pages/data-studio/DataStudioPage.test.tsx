import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDataStudioPage } from "@/pages/AdminDataStudioPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "get_admin_stats") {
      return Promise.resolve({
        userCount: 2,
        wordCount: 12345,
        deckCount: 8,
        packCount: 1,
      });
    }
    if (cmd === "admin_list_vocabulary") {
      return Promise.resolve({
        items: [
          {
            id: 1,
            headword: "apple",
            type: "word",
            partOfSpeech: "noun",
            cefrLevel: "A1",
            primaryVietnameseMeaning: "quả táo",
            primaryEnglishDefinition: "a round fruit",
            reviewStatus: "unverified",
            missing: {
              meaning: false,
              definition: false,
              example: true,
              ipa: false,
              audio: true,
            },
            deckCount: 2,
            updatedAt: "2026-05-19T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });
    }
    if (cmd === "admin_list_decks") {
      return Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });
    }
    if (cmd === "admin_get_validation_summary") {
      return Promise.resolve({
        totalWords: 12345,
        missingMeanings: 100,
        missingDefinitions: 0,
        missingExamples: 9000,
        missingIpa: 50,
        missingAudio: 3000,
        unverified: 12000,
        needsReview: 50,
        draft: 5,
        rejected: 0,
        verified: 290,
        potentialDuplicates: 7,
      });
    }
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

describe("AdminDataStudioPage", () => {
  it("renders the Data Studio heading and owner badge", async () => {
    render(<AdminDataStudioPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /data studio/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/owner only/i)).toBeInTheDocument();
  });

  it("renders all six module tabs as enabled", () => {
    render(<AdminDataStudioPage />);
    const tablist = screen.getByRole("tablist", {
      name: /data studio modules/i,
    });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    const labels = tabs.map((t) => t.textContent ?? "");
    expect(labels.some((l) => /vocabulary/i.test(l))).toBe(true);
    expect(labels.some((l) => /decks/i.test(l))).toBe(true);
    expect(labels.some((l) => /validation/i.test(l))).toBe(true);
    expect(labels.some((l) => /provenance/i.test(l))).toBe(true);
    expect(labels.some((l) => /audio/i.test(l))).toBe(true);
    expect(labels.some((l) => /import/i.test(l))).toBe(true);

    // All six tabs should now be enabled — no "coming soon" placeholders.
    for (const tab of tabs) {
      expect(tab).not.toBeDisabled();
    }
  });

  it("activates the Vocabulary tab by default and renders the filter bar", () => {
    render(<AdminDataStudioPage />);
    const tablist = screen.getByRole("tablist");
    const vocab = within(tablist).getByRole("tab", { name: /vocabulary/i });
    expect(vocab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("search", { name: /vocabulary filters/i }),
    ).toBeInTheDocument();
  });

  it("renders the vocabulary records returned by the backend", async () => {
    render(<AdminDataStudioPage />);
    expect(await screen.findByText("apple")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: /vocabulary records/i });
    expect(within(table).getByText(/quả táo/i)).toBeInTheDocument();
    // Status badge is rendered for the row.
    expect(within(table).getByText(/unverified/i)).toBeInTheDocument();
  });
});
