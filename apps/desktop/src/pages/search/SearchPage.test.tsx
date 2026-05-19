import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchPage } from "@/pages/SearchPage";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

afterEach(cleanup);

function renderSearchPage(path = "/search?q=hello") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      query: "hello",
      total: 2,
      elapsedMs: 4,
      groups: [
        {
          resultType: "word",
          label: "Words",
          results: [
            {
              resultType: "word",
              id: 11,
              title: "hello",
              subtitle: "exclamation · A1",
              snippet: "Xin chao",
              deckTitle: "Greetings & Social",
              packTitle: "English Essentials",
              score: 98,
              route: "/word/11",
            },
          ],
        },
        {
          resultType: "deck",
          label: "Decks",
          results: [
            {
              resultType: "deck",
              id: 3,
              title: "Greetings & Social",
              subtitle: "5 words",
              snippet: "Phrases and words for greeting people",
              deckTitle: "Greetings & Social",
              packTitle: "English Essentials",
              score: 84,
              route: "/library/3",
            },
          ],
        },
      ],
    });
  });

  it("loads grouped offline search results", async () => {
    renderSearchPage();

    expect(invokeMock).toHaveBeenCalledWith("search", {
      query: "hello",
      filters: { limit: 30 },
    });
    expect(await screen.findByText("Words")).toBeInTheDocument();
    expect(screen.getByText("Decks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /hello/i })).toHaveAttribute(
      "href",
      "/word/11",
    );
    expect(
      screen
        .getAllByRole("link", { name: /Greetings & Social/i })
        .find((link) => link.getAttribute("href") === "/library/3"),
    ).toHaveAttribute("href", "/library/3");
  });

  it("shows an empty start state without a query", () => {
    renderSearchPage("/search");

    expect(screen.getByText("Start with the search bar")).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
