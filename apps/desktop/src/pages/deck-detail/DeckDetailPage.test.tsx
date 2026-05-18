import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { DeckDetailPage } from "../DeckDetailPage";

afterEach(cleanup);

function renderDeckDetail(path = "/library/demo-deck") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/library/:deckId" element={<DeckDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DeckDetailPage", () => {
  it("renders a platform-grade deck hero with metadata and CTAs", () => {
    renderDeckDetail();

    expect(
      screen.getByRole("heading", { level: 1, name: "IELTS Speaking Core" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Installed deck /demo-deck")).toBeInTheDocument();
    expect(screen.getAllByText("B2-C1").length).toBeGreaterThan(0);
    expect(screen.getByText("Exam Speaking")).toBeInTheDocument();
    expect(screen.getByText("860 words")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Learning" }),
    ).toBeInTheDocument();
  });

  it("renders all mock study mode cards", () => {
    renderDeckDetail();

    expect(screen.getByText("Smart Review")).toBeInTheDocument();
    expect(screen.getByText("Flashcards")).toBeInTheDocument();
    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("Type Answer")).toBeInTheDocument();
    expect(screen.getByText("Weak Words Drill")).toBeInTheDocument();
  });

  it("renders progress summary and achievements preview", () => {
    renderDeckDetail();

    expect(screen.getByText("Progress Summary")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Deck progress" }),
    ).toHaveAttribute("aria-valuenow", "64");
    expect(screen.getByText("Deck Achievements")).toBeInTheDocument();
    expect(screen.getByText("First Sprint")).toBeInTheDocument();
    expect(screen.getByText("Confident Speaker")).toBeInTheDocument();
  });

  it("renders the word preview with English-Vietnamese entries", () => {
    renderDeckDetail();

    expect(screen.getByText("Word Preview")).toBeInTheDocument();
    expect(screen.getByText("elaborate")).toBeInTheDocument();
    expect(screen.getByText("mở rộng, trình bày chi tiết")).toBeInTheDocument();
    expect(screen.getAllByText("Due today").length).toBeGreaterThan(0);
  });

  it("renders restrained mock learner notes and ratings", () => {
    renderDeckDetail();

    expect(screen.getByText("Learner Notes")).toBeInTheDocument();
    expect(screen.getByText("Mock deck rating")).toBeInTheDocument();
    expect(screen.getByText("4.7 / 5")).toBeInTheDocument();
    expect(screen.getByText("Minh Anh")).toBeInTheDocument();
    expect(screen.getByText("Quang")).toBeInTheDocument();
  });
});
