import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { WordDetailPage } from "../WordDetailPage";

afterEach(cleanup);

function renderWordDetail(path = "/word/demo-word") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/word/:wordId" element={<WordDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WordDetailPage", () => {
  it("renders the word header with pronunciation and review status", () => {
    renderWordDetail();

    expect(
      screen.getByRole("heading", { level: 1, name: "elaborate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vocabulary entry /demo-word")).toBeInTheDocument();
    expect(
      screen.getByText("verb / adjective · 4 syllables · stress on LAB"),
    ).toBeInTheDocument();
    expect(screen.getByText("UK /ɪˈlæb.ər.ət/")).toBeInTheDocument();
    expect(
      screen.getByText("trình bày chi tiết; tỉ mỉ, công phu"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Word mastery" }),
    ).toHaveAttribute("aria-valuenow", "68");
  });

  it("shows common senses first and expands additional senses", () => {
    renderWordDetail();

    expect(screen.getByText("Explain in detail")).toBeInTheDocument();
    expect(screen.getByText("Detailed or carefully made")).toBeInTheDocument();
    expect(screen.queryByText("Develop more fully")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show 2 more senses" }));

    expect(screen.getByText("Develop more fully")).toBeInTheDocument();
    expect(screen.getByText("Complex in structure")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show common meanings only" }),
    );

    expect(screen.queryByText("Develop more fully")).not.toBeInTheDocument();
  });

  it("switches to the pronunciation tab", () => {
    renderWordDetail();

    fireEvent.click(screen.getByRole("tab", { name: "Pronunciation" }));

    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "word-tab-button-pronunciation",
    );
    expect(screen.getByText("Audio placeholder")).toBeInTheDocument();
    expect(
      screen.getByText("Bundled UK/US audio will connect here later."),
    ).toBeInTheDocument();
  });

  it("switches to usage and network tabs", () => {
    renderWordDetail();

    fireEvent.click(screen.getByRole("tab", { name: "Usage" }));
    expect(screen.getByText("Collocations")).toBeInTheDocument();
    expect(screen.getByText("elaborate on an idea")).toBeInTheDocument();
    expect(screen.getByText("Common Mistakes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Word Network" }));
    expect(screen.getByText("Synonyms")).toBeInTheDocument();
    expect(screen.getByText("clarify")).toBeInTheDocument();
    expect(screen.getByText("Antonyms")).toBeInTheDocument();
    expect(screen.getByText("summarize")).toBeInTheDocument();
  });

  it("switches to review history and notes tabs", () => {
    renderWordDetail();

    fireEvent.click(screen.getByRole("tab", { name: "Review History" }));
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(
      screen.getByText("Recognized in an IELTS Part 2 prompt."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByText("Personal notes placeholder")).toBeInTheDocument();
    expect(
      screen.getByText(/connect this word with speaking answers/i),
    ).toBeInTheDocument();
  });
});
