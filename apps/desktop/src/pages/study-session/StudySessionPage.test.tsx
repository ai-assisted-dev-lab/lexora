import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StudySessionPage } from "../StudySessionPage";

afterEach(cleanup);

function renderSession() {
  return render(<StudySessionPage />);
}

describe("StudySessionPage", () => {
  it("renders the session header, progress bar, and flashcard prompt", () => {
    renderSession();

    expect(
      screen.getByRole("heading", { level: 1, name: "Focused Study Session" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Session progress" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Flashcard")).toBeInTheDocument();
    expect(screen.getByText("elaborate")).toBeInTheDocument();
    expect(screen.getByLabelText("Audio placeholder")).toBeInTheDocument();
  });

  it("flips the mock flashcard", () => {
    renderSession();

    const flashcard = screen.getByRole("button", { name: /Prompt elaborate/i });
    expect(flashcard).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(flashcard);

    expect(flashcard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("trình bày chi tiết")).toBeInTheDocument();
  });

  it("advances to multiple choice and selects an option", () => {
    renderSession();

    fireEvent.click(screen.getByRole("button", { name: /Good/i }));

    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("crucial")).toBeInTheDocument();

    const choice = screen.getByRole("button", {
      name: "quan trọng, thiết yếu",
    });
    fireEvent.click(choice);

    expect(choice).toHaveAttribute("data-selected", "true");
  });

  it("advances to type answer and captures typed text", () => {
    renderSession();

    fireEvent.click(screen.getByRole("button", { name: /Good/i }));
    fireEvent.click(screen.getByRole("button", { name: /Hard/i }));

    expect(screen.getByText("Type Answer")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Type the English phrase...");
    fireEvent.change(input, { target: { value: "from my perspective" } });

    expect(input).toHaveValue("from my perspective");
    expect(
      screen.getByText("Expected answer placeholder:"),
    ).toBeInTheDocument();
  });

  it("renders mock summary and can restart", () => {
    renderSession();

    fireEvent.click(screen.getByRole("button", { name: /Good/i }));
    fireEvent.click(screen.getByRole("button", { name: /Easy/i }));
    fireEvent.click(screen.getByRole("button", { name: /Again/i }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Session Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Session complete")).toBeInTheDocument();
    expect(screen.getByText("Cards studied")).toBeInTheDocument();
    expect(screen.getByText("Space flip")).toBeInTheDocument();
    expect(screen.getByText("4 Easy")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Restart mock session" }),
    );

    expect(screen.getByText("Flashcard")).toBeInTheDocument();
  });
});
