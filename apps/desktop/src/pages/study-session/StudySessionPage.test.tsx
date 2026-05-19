import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudySessionPage } from "../StudySessionPage";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const baseCard = {
  id: 10,
  userId: 1,
  vocabularyItemId: 101,
  deckId: 1,
  due: "2026-01-01T00:00:00.000Z",
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: "new",
  lastReview: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const firstQueueItem = {
  position: 1,
  category: "new",
  card: baseCard,
  headword: "elaborate",
  partOfSpeech: "verb",
  ipaUk: "/iˈlæbəreɪt/",
  ipaUs: "/iˈlæbəreɪt/",
  definitionEn: "To explain something in more detail.",
  definitionVi: "trình bày chi tiết",
  exampleSentenceEn: "Could you elaborate on your answer?",
  exampleSentenceVi: "Bạn có thể trình bày chi tiết hơn câu trả lời không?",
  additionalSenseCount: 1,
};

const secondQueueItem = {
  ...firstQueueItem,
  position: 2,
  card: {
    ...baseCard,
    id: 11,
    vocabularyItemId: 102,
  },
  headword: "crucial",
  definitionEn: "Extremely important.",
  definitionVi: "quan trọng, thiết yếu",
  exampleSentenceEn: "A clear structure is crucial in speaking responses.",
  exampleSentenceVi: "Cấu trúc rõ ràng rất quan trọng trong câu trả lời nói.",
  additionalSenseCount: 0,
};

function sessionFixture(items = [firstQueueItem, secondQueueItem]) {
  return {
    sessionId: 77,
    userId: 1,
    deckId: 1,
    mode: "flashcard",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: null,
    totalItems: items.length,
    reviewedCount: 0,
    correctCount: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    queue: {
      userId: 1,
      deckId: 1,
      mode: "smart_review",
      generatedAt: "2026-01-01T00:00:00.000Z",
      summary: {
        dueCount: 0,
        weakCount: 0,
        newCount: items.length,
        requestedLength: 20,
        returnedLength: items.length,
      },
      items,
    },
  };
}

const multipleChoiceQuestion = {
  position: 0,
  category: "new",
  card: baseCard,
  headword: "elaborate",
  partOfSpeech: "verb",
  ipaUk: "/iËˆlÃ¦bÉ™reÉªt/",
  ipaUs: "/iËˆlÃ¦bÉ™reÉªt/",
  definitionEn: "To explain something in more detail.",
  definitionVi: "trÃ¬nh bÃ y chi tiáº¿t",
  exampleSentenceEn: "Could you elaborate on your answer?",
  exampleSentenceVi: "Báº¡n cÃ³ thá»ƒ trÃ¬nh bÃ y chi tiáº¿t hÆ¡n cÃ¢u tráº£ lá»i khÃ´ng?",
  additionalSenseCount: 1,
  options: [
    { vocabularyItemId: 103, label: "pháº£n Ä‘á»‘i máº¡nh máº½" },
    { vocabularyItemId: 101, label: "trÃ¬nh bÃ y chi tiáº¿t" },
    { vocabularyItemId: 104, label: "ráº¥t nhanh" },
    { vocabularyItemId: 105, label: "yÃªn láº·ng" },
  ],
  correctVocabularyItemId: 101,
};

function multipleChoiceSessionFixture(questions = [multipleChoiceQuestion]) {
  return {
    sessionId: 88,
    userId: 1,
    deckId: 1,
    mode: "multiple_choice",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: null,
    totalItems: questions.length,
    reviewedCount: 0,
    correctCount: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    queue: sessionFixture([firstQueueItem]).queue,
    questions,
  };
}

function progress(reviewedCount: number, rating: string) {
  return {
    sessionId: 77,
    totalItems: 2,
    reviewedCount,
    correctCount: rating === "hard" ? 0 : 1,
    againCount: rating === "again" ? 1 : 0,
    hardCount: rating === "hard" ? 1 : 0,
    goodCount: rating === "good" ? 1 : 0,
    easyCount: rating === "easy" ? 1 : 0,
    endedAt: null,
  };
}

function multipleChoiceProgress(reviewedCount: number, rating: string, correct: boolean) {
  return {
    sessionId: 88,
    totalItems: 1,
    reviewedCount,
    correctCount: correct ? 1 : 0,
    againCount: rating === "again" ? 1 : 0,
    hardCount: rating === "hard" ? 1 : 0,
    goodCount: rating === "good" ? 1 : 0,
    easyCount: rating === "easy" ? 1 : 0,
    endedAt: null,
  };
}

function summaryFixture(reviewedCount = 2) {
  return {
    sessionId: 77,
    userId: 1,
    deckId: 1,
    mode: "flashcard",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:05:00.000Z",
    totalItems: reviewedCount,
    reviewedCount,
    correctCount: 1,
    againCount: 0,
    hardCount: 1,
    goodCount: 0,
    easyCount: 1,
    accuracy: 50,
    timeSpentSeconds: 300,
    xpEarned: 0,
  };
}

function setupDefaultCommands(items = [firstQueueItem, secondQueueItem]) {
  let reviewedCount = 0;

  invokeMock.mockImplementation((command: string, args: unknown) => {
    if (command === "start_flashcard_session") {
      return Promise.resolve(clone(sessionFixture(items)));
    }

    if (command === "submit_flashcard_review") {
      reviewedCount += 1;
      const input = (args as { input: { rating: string; nextState: unknown } })
        .input;

      return Promise.resolve({
        session: {
          ...progress(reviewedCount, input.rating),
          totalItems: items.length,
        },
        card: {
          ...items[reviewedCount - 1].card,
          ...(input.nextState as Record<string, unknown>),
        },
        rating: input.rating,
        reviewedAt: "2026-01-01T00:00:00.000Z",
      });
    }

    if (command === "complete_study_session") {
      return Promise.resolve(clone(summaryFixture(items.length)));
    }

    return Promise.reject(new Error(`Unexpected command ${command}`));
  });
}

function setupMultipleChoiceCommands() {
  invokeMock.mockImplementation((command: string, args: unknown) => {
    if (command === "start_multiple_choice_session") {
      return Promise.resolve(clone(multipleChoiceSessionFixture()));
    }

    if (command === "submit_multiple_choice_review") {
      const input = (
        args as {
          input: {
            rating: string;
            selectedVocabularyItemId: number;
            nextState: unknown;
          };
        }
      ).input;
      const correct = input.selectedVocabularyItemId === 101;

      return Promise.resolve({
        session: multipleChoiceProgress(1, input.rating, correct),
        card: {
          ...baseCard,
          ...(input.nextState as Record<string, unknown>),
        },
        rating: input.rating,
        reviewedAt: "2026-01-01T00:00:00.000Z",
      });
    }

    if (command === "complete_study_session") {
      return Promise.resolve({
        ...clone(summaryFixture(1)),
        sessionId: 88,
        mode: "multiple_choice",
        reviewedCount: 1,
        correctCount: 1,
        goodCount: 1,
        hardCount: 0,
        accuracy: 100,
      });
    }

    return Promise.reject(new Error(`Unexpected command ${command}`));
  });
}

function renderSession(path = "/study/session?deckId=1&mode=flashcard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/study/session" element={<StudySessionPage />} />
        <Route path="/word/:wordId" element={<div>Word Detail</div>} />
        <Route path="/library/:deckId" element={<div>Deck Detail</div>} />
        <Route path="/review" element={<div>Review</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function clickMultipleChoiceOptionById(vocabularyItemId: number) {
  const buttons = await screen.findAllByRole("button");
  const option = buttons.find(
    (button) =>
      button.classList.contains("choice-card__option") &&
      button.dataset.vocabularyItemId === String(vocabularyItemId),
  );
  if (!option) {
    throw new Error(`Option ${vocabularyItemId} was not found`);
  }
  fireEvent.click(option);
}

afterEach(cleanup);

describe("StudySessionPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    setupDefaultCommands();
  });

  it("starts a flashcard session and renders real queue content", async () => {
    renderSession();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Flashcard Session",
      }),
    ).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("start_flashcard_session", {
      input: { deckId: 1, sessionLength: 20, mode: "flashcard" },
    });
    expect(screen.getByText("Deck 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Session progress" }))
      .toHaveAttribute("aria-valuemax", "2");
    expect(screen.getByText("elaborate")).toBeInTheDocument();
    expect(screen.getByText("verb")).toBeInTheDocument();
    expect(screen.getByLabelText("Audio placeholder")).toBeInTheDocument();
  });

  it("flips the flashcard and renders answer-side vocabulary details", async () => {
    renderSession();

    const flashcard = await screen.findByRole("button", {
      name: /Flip flashcard for elaborate/i,
    });

    fireEvent.click(flashcard);

    expect(flashcard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("trình bày chi tiết")).toBeInTheDocument();
    expect(
      screen.getByText("To explain something in more detail."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Could you elaborate on your answer?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Word Detail" }),
    ).toHaveAttribute("href", "/word/101");
  });

  it("submits a rating with FSRS next state and advances the queue", async () => {
    renderSession();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Flip flashcard for elaborate/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Good/i }));

    await screen.findByText("crucial");

    const submitCall = invokeMock.mock.calls.find(
      ([command]) => command === "submit_flashcard_review",
    );
    expect(submitCall).toBeDefined();
    expect(submitCall?.[1]).toMatchObject({
      input: {
        sessionId: 77,
        reviewCardId: 10,
        vocabularyItemId: 101,
        rating: "good",
        nextState: {
          reps: 1,
          state: "learning",
        },
      },
    });
  });

  it("disables rating buttons while a review submission is pending", async () => {
    let resolveSubmit:
      | ((value: {
          session: ReturnType<typeof progress>;
          card: typeof baseCard;
          rating: string;
          reviewedAt: string;
        }) => void)
      | null = null;

    invokeMock.mockImplementation((command: string) => {
      if (command === "start_flashcard_session") {
        return Promise.resolve(clone(sessionFixture([firstQueueItem])));
      }

      if (command === "submit_flashcard_review") {
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      }

      if (command === "complete_study_session") {
        return Promise.resolve(clone(summaryFixture(1)));
      }

      return Promise.reject(new Error(`Unexpected command ${command}`));
    });

    renderSession();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Flip flashcard for elaborate/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Good/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Good/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Again/i })).toBeDisabled();
    });

    resolveSubmit?.({
      session: progress(1, "good"),
      card: baseCard,
      rating: "good",
      reviewedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("shows an empty queue state when no review cards are available", async () => {
    setupDefaultCommands([]);

    renderSession();

    expect(await screen.findByText("No cards ready")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This scope has no due, weak, or new vocabulary cards available right now.",
      ),
    ).toBeInTheDocument();
  });

  it("starts a multiple choice session and renders four unique options", async () => {
    setupMultipleChoiceCommands();

    renderSession("/study/session?deckId=1&mode=multiple-choice");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Multiple Choice Session",
      }),
    ).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("start_multiple_choice_session", {
      input: { deckId: 1, sessionLength: 20, mode: "multiple_choice" },
    });
    expect(screen.getByText("Choose the Vietnamese meaning")).toBeInTheDocument();
    const options = screen.getAllByRole("button").filter((button) =>
      button.classList.contains("choice-card__option"),
    );
    expect(options).toHaveLength(4);
    expect(new Set(options.map((option) => option.textContent))).toHaveProperty(
      "size",
      4,
    );
  });

  it("maps a correct multiple choice answer to Good and persists the review", async () => {
    setupMultipleChoiceCommands();

    renderSession("/study/session?deckId=1&mode=multiple-choice");

    await clickMultipleChoiceOptionById(101);

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Saved as Good.")).toBeInTheDocument();

    const submitCall = invokeMock.mock.calls.find(
      ([command]) => command === "submit_multiple_choice_review",
    );
    expect(submitCall).toBeDefined();
    expect(submitCall?.[1]).toMatchObject({
      input: {
        sessionId: 88,
        reviewCardId: 10,
        vocabularyItemId: 101,
        selectedVocabularyItemId: 101,
        rating: "good",
        nextState: {
          reps: 1,
        },
      },
    });
  });

  it("maps an incorrect multiple choice answer to Again", async () => {
    setupMultipleChoiceCommands();

    renderSession("/study/session?deckId=1&mode=multiple-choice");

    await clickMultipleChoiceOptionById(104);

    expect(await screen.findByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText("Saved as Again.")).toBeInTheDocument();

    const submitCall = invokeMock.mock.calls.find(
      ([command]) => command === "submit_multiple_choice_review",
    );
    expect(submitCall?.[1]).toMatchObject({
      input: {
        selectedVocabularyItemId: 104,
        rating: "again",
      },
    });
  });

  it("completes a multiple choice session after feedback continues", async () => {
    setupMultipleChoiceCommands();

    renderSession("/study/session?deckId=1&mode=multiple-choice");

    await clickMultipleChoiceOptionById(101);
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // 100% accuracy → "Outstanding!" grade label
    expect(await screen.findByText("Outstanding!")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("complete_study_session", {
      input: { sessionId: 88 },
    });
  });

  it("submitting multiple ratings completes with a real session summary", async () => {
    renderSession();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Flip flashcard for elaborate/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Hard/i }));

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Flip flashcard for crucial/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Easy/i }));

    // 50% accuracy → "Good effort" grade label
    expect(await screen.findByText("Good effort")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("complete_study_session", {
      input: { sessionId: 77 },
    });
  });
});
