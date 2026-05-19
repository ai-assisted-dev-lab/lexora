import "./study-session/StudySessionPage.css";

import {
  type LexoraReviewCardState,
  type LexoraReviewRating,
  scheduleReview,
} from "@lexora/review-engine";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Headphones,
  Home,
  Keyboard,
  Layers3,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  gradeAnswer,
  gradeToRating,
  type MatchGrade,
} from "@/lib/fuzzy-match";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import {
  completeStudySession,
  type MultipleChoiceOptionDto,
  type MultipleChoiceQuestionDto,
  type MultipleChoiceSessionDto,
  type ReviewCardDto,
  type SmartReviewQueueItemDto,
  startFlashcardSession,
  startMultipleChoiceSession,
  startTypeAnswerSession,
  startWeakWordsDrill,
  type StudySessionDto,
  type StudySessionSummaryDto,
  submitFlashcardReview,
  submitMultipleChoiceReview,
  submitTypeAnswerReview,
  type TypeAnswerSessionDto,
} from "@/services/commands/review";
import { formatTauriError } from "@/services/tauri";

const DEFAULT_SESSION_LENGTH = 20;

const flashcardModeAliases = new Set([
  "flashcard",
  "flashcards",
  "smart-review",
  "smart_review",
  "continue",
  "learn",
]);

const multipleChoiceModeAliases = new Set(["multiple-choice", "multiple_choice"]);

const typeAnswerModeAliases = new Set(["type-answer", "type_answer"]);

const weakDrillModeAliases = new Set(["weak-drill", "weak_drill"]);

const ratingButtons: Array<{
  label: string;
  rating: LexoraReviewRating;
  hint: string;
  variant: "danger" | "secondary" | "soft" | "primary";
}> = [
  { label: "Again", rating: "again", hint: "1", variant: "danger" },
  { label: "Hard", rating: "hard", hint: "2", variant: "secondary" },
  { label: "Good", rating: "good", hint: "3", variant: "soft" },
  { label: "Easy", rating: "easy", hint: "4", variant: "primary" },
];

function parsePositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toReviewCardState(card: ReviewCardDto): LexoraReviewCardState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview ?? undefined,
  };
}

function errorMessage(error: unknown): string {
  const formatted = formatTauriError(error);
  return formatted === "An unexpected error occurred"
    ? String(error)
    : formatted;
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds === 0
    ? `${minutes}m`
    : `${minutes}m ${remainingSeconds}s`;
}

export function StudySessionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const deckId = parsePositiveInteger(searchParams.get("deckId"));
  const sessionLength =
    parsePositiveInteger(searchParams.get("sessionLength")) ??
    DEFAULT_SESSION_LENGTH;
  const mode = searchParams.get("mode") ?? "flashcard";
  const isFlashcardMode = flashcardModeAliases.has(mode);
  const isMultipleChoiceMode = multipleChoiceModeAliases.has(mode);
  const isTypeAnswerMode = typeAnswerModeAliases.has(mode);
  const isWeakDrillMode = weakDrillModeAliases.has(mode);
  const studyMode = isMultipleChoiceMode
    ? "multiple_choice"
    : isTypeAnswerMode
      ? "type_answer"
      : isWeakDrillMode
        ? "weak_drill"
        : "flashcard";
  const isSupportedMode =
    isFlashcardMode || isMultipleChoiceMode || isTypeAnswerMode || isWeakDrillMode;

  const [session, setSession] = useState<StudySessionDto | null>(null);
  const [multipleChoiceSession, setMultipleChoiceSession] =
    useState<MultipleChoiceSessionDto | null>(null);
  const [typeAnswerSession, setTypeAnswerSession] =
    useState<TypeAnswerSessionDto | null>(null);
  const [summary, setSummary] = useState<StudySessionSummaryDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] =
    useState<MultipleChoiceOptionDto | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<{
    isCorrect: boolean;
    rating: LexoraReviewRating;
  } | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typeAnswerFeedback, setTypeAnswerFeedback] = useState<{
    grade: MatchGrade;
    rating: "again" | "hard" | "good";
    correctAnswer: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(isSupportedMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardStartedAtMs, setCardStartedAtMs] = useState(() => Date.now());
  const isSubmittingRef = useRef(false);

  const currentItem = session?.queue.items[currentIndex] ?? null;
  const currentQuestion =
    multipleChoiceSession?.questions[currentIndex] ?? null;
  const typeAnswerItem =
    typeAnswerSession?.queue.items[currentIndex] ?? null;
  const currentCard = currentItem ?? currentQuestion ?? typeAnswerItem;
  const isComplete = summary !== null;
  const activeSession = multipleChoiceSession ?? typeAnswerSession ?? session;
  const totalItems = activeSession?.totalItems ?? 0;
  const reviewedCount =
    summary?.reviewedCount ?? activeSession?.reviewedCount ?? 0;
  const scopeLabel = activeSession?.deckId
    ? `Deck ${activeSession.deckId}`
    : "All installed decks";
  const exitHref = activeSession?.deckId
    ? `/library/${activeSession.deckId}`
    : "/review";
  const progressValue = isComplete
    ? totalItems
    : reviewedCount +
      ((isFlipped && currentItem) || choiceFeedback || typeAnswerFeedback
        ? 0.5
        : 0);

  const startSession = useCallback(async () => {
    if (!isSupportedMode) {
      setIsLoading(false);
      setError("This study mode is not available for real sessions right now.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);
    setSession(null);
    setMultipleChoiceSession(null);
    setTypeAnswerSession(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setChoiceFeedback(null);
    setTypedAnswer("");
    setTypeAnswerFeedback(null);

    try {
      if (studyMode === "multiple_choice") {
        const result = await startMultipleChoiceSession({
          deckId,
          sessionLength,
          mode: "multiple_choice",
        });
        if (!result || !Array.isArray(result.questions)) {
          throw new Error("Multiple choice session response was invalid.");
        }
        setMultipleChoiceSession(result);
      } else if (studyMode === "type_answer") {
        const result = await startTypeAnswerSession({
          deckId,
          sessionLength,
          mode: "type_answer",
        });
        if (!result || !Array.isArray(result.queue?.items)) {
          throw new Error("Type answer session response was invalid.");
        }
        setTypeAnswerSession(result);
      } else if (studyMode === "weak_drill") {
        const result = await startWeakWordsDrill({
          deckId,
          sessionLength,
          mode: "weak_drill",
        });
        if (!result || !Array.isArray(result.queue?.items)) {
          throw new Error("Weak drill session response was invalid.");
        }
        setSession(result);
      } else {
        const result = await startFlashcardSession({
          deckId,
          sessionLength,
          mode: "flashcard",
        });
        if (!result || !Array.isArray(result.queue?.items)) {
          throw new Error("Flashcard session response was invalid.");
        }
        setSession(result);
      }
      setCardStartedAtMs(Date.now());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [deckId, isSupportedMode, sessionLength, studyMode]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!isActive) {
        return;
      }

      await startSession();
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [startSession]);

  const submitRating = useCallback(
    async (rating: LexoraReviewRating) => {
      if (
        !session ||
        !currentItem ||
        !isFlipped ||
        isSubmittingRef.current ||
        summary
      ) {
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      try {
        const reviewedAt = new Date();
        const scheduling = scheduleReview({
          card: toReviewCardState(currentItem.card),
          rating,
          reviewedAt,
        });
        const responseTimeMs = Math.max(0, Date.now() - cardStartedAtMs);

        const result = await submitFlashcardReview({
          sessionId: session.sessionId,
          reviewCardId: currentItem.card.id,
          vocabularyItemId: currentItem.card.vocabularyItemId,
          rating,
          reviewedAt: scheduling.reviewedAt,
          responseTimeMs,
          nextState: scheduling.next,
        });

        setSession((current) =>
          current
            ? {
                ...current,
                reviewedCount: result.session.reviewedCount,
                correctCount: result.session.correctCount,
                againCount: result.session.againCount,
                hardCount: result.session.hardCount,
                goodCount: result.session.goodCount,
                easyCount: result.session.easyCount,
                endedAt: result.session.endedAt,
              }
            : current,
        );

        const isLastCard = currentIndex >= session.queue.items.length - 1;
        if (isLastCard) {
          const completed = await completeStudySession({
            sessionId: session.sessionId,
          });
          setSummary(completed);
          setIsFlipped(false);
          return;
        }

        setCurrentIndex((index) => index + 1);
        setIsFlipped(false);
        setCardStartedAtMs(Date.now());
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      cardStartedAtMs,
      currentIndex,
      currentItem,
      isFlipped,
      session,
      summary,
    ],
  );

  const submitMultipleChoiceOption = useCallback(
    async (option: MultipleChoiceOptionDto) => {
      if (
        !multipleChoiceSession ||
        !currentQuestion ||
        selectedOption ||
        isSubmittingRef.current ||
        summary
      ) {
        return;
      }

      const isCorrect =
        option.vocabularyItemId === currentQuestion.correctVocabularyItemId;
      const rating: LexoraReviewRating = isCorrect ? "good" : "again";

      setSelectedOption(option);
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      try {
        const reviewedAt = new Date();
        const scheduling = scheduleReview({
          card: toReviewCardState(currentQuestion.card),
          rating,
          reviewedAt,
        });
        const responseTimeMs = Math.max(0, Date.now() - cardStartedAtMs);

        const result = await submitMultipleChoiceReview({
          sessionId: multipleChoiceSession.sessionId,
          reviewCardId: currentQuestion.card.id,
          vocabularyItemId: currentQuestion.card.vocabularyItemId,
          selectedVocabularyItemId: option.vocabularyItemId,
          rating,
          reviewedAt: scheduling.reviewedAt,
          responseTimeMs,
          nextState: scheduling.next,
        });

        setMultipleChoiceSession((current) =>
          current
            ? {
                ...current,
                reviewedCount: result.session.reviewedCount,
                correctCount: result.session.correctCount,
                againCount: result.session.againCount,
                hardCount: result.session.hardCount,
                goodCount: result.session.goodCount,
                easyCount: result.session.easyCount,
                endedAt: result.session.endedAt,
              }
            : current,
        );
        setChoiceFeedback({ isCorrect, rating });
      } catch (e) {
        setSelectedOption(null);
        setChoiceFeedback(null);
        setError(errorMessage(e));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      cardStartedAtMs,
      currentQuestion,
      multipleChoiceSession,
      selectedOption,
      summary,
    ],
  );

  const continueMultipleChoice = useCallback(async () => {
    if (!multipleChoiceSession || !choiceFeedback || isSubmittingRef.current) {
      return;
    }

    const isLastQuestion =
      currentIndex >= multipleChoiceSession.questions.length - 1;
    if (isLastQuestion) {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        const completed = await completeStudySession({
          sessionId: multipleChoiceSession.sessionId,
        });
        setSummary(completed);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedOption(null);
    setChoiceFeedback(null);
    setCardStartedAtMs(Date.now());
  }, [choiceFeedback, currentIndex, multipleChoiceSession]);

  const submitTypeAnswer = useCallback(async () => {
    if (
      !typeAnswerSession ||
      !typeAnswerItem ||
      typeAnswerFeedback ||
      isSubmittingRef.current ||
      summary
    ) {
      return;
    }

    const expected =
      typeAnswerItem.definitionVi ??
      typeAnswerItem.definitionEn ??
      typeAnswerItem.headword;
    const grade = gradeAnswer(typedAnswer, expected);
    const rating = gradeToRating(grade);

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const reviewedAt = new Date();
      const scheduling = scheduleReview({
        card: toReviewCardState(typeAnswerItem.card),
        rating,
        reviewedAt,
      });
      const responseTimeMs = Math.max(0, Date.now() - cardStartedAtMs);

      const result = await submitTypeAnswerReview({
        sessionId: typeAnswerSession.sessionId,
        reviewCardId: typeAnswerItem.card.id,
        vocabularyItemId: typeAnswerItem.card.vocabularyItemId,
        rating,
        reviewedAt: scheduling.reviewedAt,
        responseTimeMs,
        nextState: scheduling.next,
      });

      setTypeAnswerSession((current) =>
        current
          ? {
              ...current,
              reviewedCount: result.session.reviewedCount,
              correctCount: result.session.correctCount,
              againCount: result.session.againCount,
              hardCount: result.session.hardCount,
              goodCount: result.session.goodCount,
              easyCount: result.session.easyCount,
              endedAt: result.session.endedAt,
            }
          : current,
      );
      setTypeAnswerFeedback({ grade, rating, correctAnswer: expected });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    cardStartedAtMs,
    summary,
    typeAnswerFeedback,
    typeAnswerItem,
    typeAnswerSession,
    typedAnswer,
  ]);

  const continueTypeAnswer = useCallback(async () => {
    if (!typeAnswerSession || !typeAnswerFeedback || isSubmittingRef.current) {
      return;
    }

    const isLastItem =
      currentIndex >= typeAnswerSession.queue.items.length - 1;
    if (isLastItem) {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        const completed = await completeStudySession({
          sessionId: typeAnswerSession.sessionId,
        });
        setSummary(completed);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }

    setCurrentIndex((index) => index + 1);
    setTypedAnswer("");
    setTypeAnswerFeedback(null);
    setCardStartedAtMs(Date.now());
  }, [currentIndex, typeAnswerFeedback, typeAnswerSession]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        navigate(exitHref);
        return;
      }

      if ((!currentItem && !currentQuestion) || isSubmitting || isComplete) {
        return;
      }

      if (event.code === "Space" && currentItem) {
        event.preventDefault();
        setIsFlipped((current) => !current);
        return;
      }

      if (event.code === "Space" && choiceFeedback) {
        event.preventDefault();
        void continueMultipleChoice();
        return;
      }

      if (event.code === "Space" && typeAnswerFeedback) {
        event.preventDefault();
        void continueTypeAnswer();
        return;
      }

      if (currentQuestion && !choiceFeedback) {
        const optionIndex = Number(event.key) - 1;
        const option = currentQuestion.options[optionIndex];
        if (option) {
          event.preventDefault();
          void submitMultipleChoiceOption(option);
        }
        return;
      }

      const shortcut = ratingButtons.find((rating) => rating.hint === event.key);
      if (shortcut && isFlipped) {
        event.preventDefault();
        void submitRating(shortcut.rating);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    choiceFeedback,
    continueMultipleChoice,
    continueTypeAnswer,
    currentQuestion,
    currentItem,
    exitHref,
    isComplete,
    isFlipped,
    isSubmitting,
    navigate,
    submitMultipleChoiceOption,
    submitRating,
    typeAnswerFeedback,
  ]);

  const supportStats = useMemo(
    () => [
      {
        label: "Queue",
        value: totalItems.toString(),
        meta:
          activeSession === null
            ? "Loading"
            : `${activeSession.queue?.summary.dueCount ?? 0} due / ${
                activeSession.queue?.summary.weakCount ?? 0
              } weak / ${activeSession.queue?.summary.newCount ?? 0} new`,
      },
      {
        label: "Reviewed",
        value: reviewedCount.toString(),
        meta: `${activeSession?.againCount ?? 0} again / ${
          activeSession?.goodCount ?? 0
        } good`,
      },
      {
        label: "Accuracy",
        value: summary
          ? `${summary.accuracy}%`
          : totalItems > 0
            ? `${Math.round(
                ((activeSession?.correctCount ?? 0) * 100) / totalItems,
              )}%`
            : "0%",
        meta:
          studyMode === "multiple_choice"
            ? "Correct choices"
            : studyMode === "type_answer"
              ? "Correct answers"
              : "Good or Easy",
      },
    ],
    [activeSession, reviewedCount, studyMode, summary, totalItems],
  );

  return (
    <motion.div
      className="study-session-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="study-session-page__title">Study Session</h2>

      <Card className="study-session-header" variant="glass">
        <div>
          <p className="study-session-header__eyebrow">{scopeLabel}</p>
          <h1>
            {isComplete
              ? "Session Summary"
              : studyMode === "multiple_choice"
                ? "Multiple Choice Session"
                : studyMode === "type_answer"
                  ? "Type Answer Session"
                  : studyMode === "weak_drill"
                    ? "Weak Words Drill"
                    : "Flashcard Session"}
          </h1>
          <p>
            {isComplete
              ? "Your saved session summary is ready."
              : studyMode === "multiple_choice"
                ? "Choose the Vietnamese meaning and save each result to review history."
                : studyMode === "type_answer"
                  ? "Type the Vietnamese meaning and get graded Correct, Almost, or Wrong."
                  : studyMode === "weak_drill"
                    ? "Drill your weak words to reinforce long-term memory."
                    : "Study real vocabulary cards from the Smart Review queue."}
          </p>
        </div>
        <div className="study-session-header__meta">
          <span>
            <Clock3 size={15} aria-hidden="true" />
            Focus session
          </span>
          <Badge variant="muted">
            {isComplete
              ? "Complete"
              : totalItems > 0
                ? `${Math.min(currentIndex + 1, totalItems)} / ${totalItems}`
                : "No cards"}
          </Badge>
          <Button asChild variant="ghost" size="sm">
            <Link to={exitHref}>
              <ChevronLeft size={15} aria-hidden="true" />
              Exit
            </Link>
          </Button>
        </div>
        <ProgressBar
          label="Session progress"
          max={Math.max(1, totalItems)}
          value={progressValue}
        />
      </Card>

      {isLoading && (
        <Card className="study-session-state-card" variant="glass">
          <Loader2
            size={28}
            className="study-session-page__spinner"
            aria-hidden="true"
          />
          <p role="status">Loading Smart Review queue...</p>
        </Card>
      )}

      {!isLoading && error && !currentCard && !summary && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="Could not start flashcards"
            description={error}
            icon={<AlertCircle size={28} aria-hidden="true" />}
            actions={
              isSupportedMode ? (
                <Button type="button" variant="primary" onClick={startSession}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Try again
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link to={exitHref}>Back</Link>
                </Button>
              )
            }
          />
        </Card>
      )}

      {!isLoading &&
        !error &&
        activeSession &&
        totalItems === 0 && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="No cards ready"
            description="This scope has no due, weak, or new vocabulary cards available right now."
            icon={<BookOpen size={28} aria-hidden="true" />}
            actions={
              <Button asChild variant="secondary">
                <Link to={exitHref}>Back</Link>
              </Button>
            }
          />
        </Card>
      )}

      {summary && <SessionSummary summary={summary} exitHref={exitHref} />}

      {!isLoading && currentCard && !summary && (
        <div className="study-session-layout">
          <main className="study-session-main">
            {error && (
              <Card className="study-session-inline-error" variant="compact">
                <AlertCircle size={18} aria-hidden="true" />
                <p>{error}</p>
              </Card>
            )}

            <Card className="study-card-shell" variant="hero">
              <div className="study-card-shell__topline">
                <div className="study-card-shell__badges">
                  <Badge>
                    {studyMode === "multiple_choice"
                      ? "Multiple Choice"
                      : studyMode === "type_answer"
                        ? "Type Answer"
                        : "Flashcard"}
                  </Badge>
                  <Badge variant="muted">{currentCard.category}</Badge>
                </div>
                {(currentCard.ipaUk || currentCard.ipaUs) && (
                  <button
                    className="study-card-shell__audio"
                    type="button"
                    aria-label="Audio placeholder"
                  >
                    <Volume2 size={18} aria-hidden="true" />
                    Audio placeholder
                  </button>
                )}
              </div>

              {currentItem ? (
                <FlashcardView
                  flipped={isFlipped}
                  item={currentItem}
                  onFlip={() => setIsFlipped((current) => !current)}
                />
              ) : typeAnswerItem ? (
                <TypeAnswerView
                  key={currentIndex}
                  feedback={typeAnswerFeedback}
                  isSubmitting={isSubmitting}
                  item={typeAnswerItem}
                  onCheck={submitTypeAnswer}
                  onContinue={continueTypeAnswer}
                  typed={typedAnswer}
                  onTyped={setTypedAnswer}
                />
              ) : currentQuestion ? (
                <MultipleChoiceView
                  feedback={choiceFeedback}
                  isSubmitting={isSubmitting}
                  onContinue={continueMultipleChoice}
                  onSelect={submitMultipleChoiceOption}
                  question={currentQuestion}
                  selectedOption={selectedOption}
                />
              ) : null}
              {currentItem && isFlipped && (
                <div className="study-card-shell__detail-row">
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/word/${currentItem.card.vocabularyItemId}`}>
                      Open Word Detail
                    </Link>
                  </Button>
                </div>
              )}
            </Card>

            {currentItem && (
              <div
                className="study-rating-row"
                aria-label="Review rating buttons"
              >
                {ratingButtons.map((rating) => (
                  <Button
                    key={rating.rating}
                    type="button"
                    variant={rating.variant}
                    disabled={!isFlipped || isSubmitting}
                    onClick={() => void submitRating(rating.rating)}
                  >
                    {rating.label}
                    <kbd>{rating.hint}</kbd>
                  </Button>
                ))}
              </div>
            )}
          </main>

          <aside className="study-session-side" aria-label="Session support">
            <Card className="study-session-widget" variant="compact">
              <Keyboard size={20} aria-hidden="true" />
              <div>
                <strong>Shortcut hints</strong>
                <p>
                  {studyMode === "multiple_choice"
                    ? "1-4 chooses an option. Space continues after feedback. Esc exits."
                    : studyMode === "type_answer"
                      ? "Type your answer and press Enter to check. Space continues after feedback. Esc exits."
                      : "Space flips. 1-4 rate after the answer is visible. Esc exits."}
                </p>
              </div>
            </Card>
            <Card className="study-session-widget" variant="compact">
              <Layers3 size={20} aria-hidden="true" />
              <div>
                <strong>Smart queue</strong>
                <p>
                  Due cards come first, with weak and new words filling the
                  session.
                </p>
              </div>
            </Card>
            <Card className="study-session-widget" variant="compact">
              <Headphones size={20} aria-hidden="true" />
              <div>
                <strong>Pronunciation</strong>
                <p>
                  Audio controls appear when pronunciation data is available.
                </p>
              </div>
            </Card>
            {supportStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                meta={stat.meta}
                value={stat.value}
              />
            ))}
          </aside>
        </div>
      )}
    </motion.div>
  );
}

interface FlashcardViewProps {
  flipped: boolean;
  item: SmartReviewQueueItemDto;
  onFlip: () => void;
}

function FlashcardView({ flipped, item, onFlip }: FlashcardViewProps) {
  const itemType = item.partOfSpeech ?? "word";
  const ipaValues = [
    item.ipaUk ? `UK ${item.ipaUk}` : null,
    item.ipaUs ? `US ${item.ipaUs}` : null,
  ].filter(Boolean);

  return (
    <button
      className="flashcard"
      type="button"
      aria-label={`Flip flashcard for ${item.headword}`}
      aria-pressed={flipped}
      onClick={onFlip}
    >
      <motion.div
        className="flashcard__inner"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="flashcard__face flashcard__front">
          <p>Front</p>
          <h2>{item.headword}</h2>
          <div className="flashcard__meta">
            <span>{itemType}</span>
            {ipaValues.map((ipa) => (
              <span key={ipa}>{ipa}</span>
            ))}
          </div>
          <span>Click or press Space to reveal the answer.</span>
        </div>
        <div className="flashcard__face flashcard__back">
          <p>Back</p>
          <h2>{item.definitionVi ?? "No Vietnamese meaning yet"}</h2>
          {item.definitionEn && (
            <span className="flashcard__definition">{item.definitionEn}</span>
          )}
          {(item.exampleSentenceEn || item.exampleSentenceVi) && (
            <div className="flashcard__example">
              {item.exampleSentenceEn && <strong>{item.exampleSentenceEn}</strong>}
              {item.exampleSentenceVi && <span>{item.exampleSentenceVi}</span>}
            </div>
          )}
          {item.additionalSenseCount > 0 && (
            <span className="flashcard__sense-count">
              +{item.additionalSenseCount} more sense
              {item.additionalSenseCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </motion.div>
    </button>
  );
}

interface MultipleChoiceViewProps {
  feedback: { isCorrect: boolean; rating: LexoraReviewRating } | null;
  isSubmitting: boolean;
  onContinue: () => void;
  onSelect: (option: MultipleChoiceOptionDto) => void;
  question: MultipleChoiceQuestionDto;
  selectedOption: MultipleChoiceOptionDto | null;
}

function MultipleChoiceView({
  feedback,
  isSubmitting,
  onContinue,
  onSelect,
  question,
  selectedOption,
}: MultipleChoiceViewProps) {
  const ipaValues = [
    question.ipaUk ? `UK ${question.ipaUk}` : null,
    question.ipaUs ? `US ${question.ipaUs}` : null,
  ].filter(Boolean);

  return (
    <div className="choice-card">
      <p className="study-card-label">Choose the Vietnamese meaning</p>
      <h2>{question.headword}</h2>
      <div className="flashcard__meta">
        {question.partOfSpeech && <span>{question.partOfSpeech}</span>}
        {ipaValues.map((ipa) => (
          <span key={ipa}>{ipa}</span>
        ))}
      </div>
      {question.definitionEn && (
        <p className="choice-card__definition">{question.definitionEn}</p>
      )}
      <div className="choice-card__grid" aria-label="Multiple choice options">
        {question.options.map((option, index) => {
          const isSelected =
            selectedOption?.vocabularyItemId === option.vocabularyItemId;
          const isCorrect =
            option.vocabularyItemId === question.correctVocabularyItemId;
          return (
            <button
              key={option.vocabularyItemId}
              className="choice-card__option"
              type="button"
              data-selected={isSelected}
              data-correct={feedback ? isCorrect : undefined}
              data-result={
                feedback && isSelected
                  ? feedback.isCorrect
                    ? "correct"
                    : "incorrect"
                  : undefined
              }
              data-vocabulary-item-id={option.vocabularyItemId}
              disabled={isSubmitting || Boolean(selectedOption)}
              onClick={() => onSelect(option)}
            >
              <span>{option.label}</span>
              <kbd>{index + 1}</kbd>
            </button>
          );
        })}
      </div>
      {feedback && (
        <div
          className="choice-card__feedback"
          data-result={feedback.isCorrect ? "correct" : "incorrect"}
          role="status"
        >
          <strong>{feedback.isCorrect ? "Correct" : "Not quite"}</strong>
          <span>
            Saved as {feedback.rating === "good" ? "Good" : "Again"}.
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

interface TypeAnswerViewProps {
  feedback: {
    grade: MatchGrade;
    rating: "again" | "hard" | "good";
    correctAnswer: string;
  } | null;
  isSubmitting: boolean;
  item: SmartReviewQueueItemDto;
  onCheck: () => void;
  onContinue: () => void;
  typed: string;
  onTyped: (value: string) => void;
}

function TypeAnswerView({
  feedback,
  isSubmitting,
  item,
  onCheck,
  onContinue,
  typed,
  onTyped,
}: TypeAnswerViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus();
    }
  }, [feedback]);

  const ipaValues = [
    item.ipaUk ? `UK ${item.ipaUk}` : null,
    item.ipaUs ? `US ${item.ipaUs}` : null,
  ].filter(Boolean);

  const gradeLabel =
    feedback?.grade === "correct"
      ? "Correct"
      : feedback?.grade === "almost"
        ? "Almost"
        : feedback?.grade === "wrong"
          ? "Wrong"
          : null;

  const savedAsLabel =
    feedback?.rating === "good"
      ? "Good"
      : feedback?.rating === "hard"
        ? "Hard"
        : feedback?.rating === "again"
          ? "Again"
          : null;

  return (
    <div className="type-answer-card">
      <p className="study-card-label">Type the Vietnamese meaning</p>
      <h2>{item.headword}</h2>
      <div className="flashcard__meta">
        {item.partOfSpeech && <span>{item.partOfSpeech}</span>}
        {ipaValues.map((ipa) => (
          <span key={ipa}>{ipa}</span>
        ))}
      </div>
      {item.definitionEn && (
        <p className="choice-card__definition">{item.definitionEn}</p>
      )}
      <label htmlFor="type-answer-input">
        Vietnamese meaning
        <input
          ref={inputRef}
          id="type-answer-input"
          type="text"
          value={typed}
          disabled={Boolean(feedback) || isSubmitting}
          placeholder="Type here and press Enter"
          onChange={(e) => onTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (feedback) {
                onContinue();
              } else if (typed.trim()) {
                onCheck();
              }
            }
          }}
        />
      </label>
      {feedback ? (
        <div
          className="type-answer-card__feedback"
          data-grade={feedback.grade}
          role="status"
        >
          <strong>{gradeLabel}</strong>
          <span>
            Answer: <em>{feedback.correctAnswer}</em>
          </span>
          <span>Saved as {savedAsLabel}.</span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="type-answer-card__hint">
          <span>
            Press <kbd>Enter</kbd> to check your answer.
          </span>
        </div>
      )}
    </div>
  );
}

interface SessionSummaryProps {
  exitHref: string;
  summary: StudySessionSummaryDto;
}

const summaryItemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function gradeFromAccuracy(accuracy: number): {
  label: string;
  subtitle: string;
  iconEl: ReactNode;
  grade: "excellent" | "great" | "good" | "low";
} {
  if (accuracy >= 90) {
    return {
      label: "Outstanding!",
      subtitle:
        "Top-tier retention. This vocabulary is cementing into long-term memory.",
      iconEl: <Trophy size={34} aria-hidden="true" />,
      grade: "excellent",
    };
  }
  if (accuracy >= 75) {
    return {
      label: "Great work",
      subtitle: "Strong session. Keep the momentum going.",
      iconEl: <Sparkles size={34} aria-hidden="true" />,
      grade: "great",
    };
  }
  if (accuracy >= 50) {
    return {
      label: "Good effort",
      subtitle:
        "Solid progress. The tricky words need a few more repetitions.",
      iconEl: <Sparkles size={34} aria-hidden="true" />,
      grade: "good",
    };
  }
  return {
    label: "Keep pushing",
    subtitle:
      "Challenging material. Repetition is how memory is built — come back tomorrow.",
    iconEl: <RotateCcw size={34} aria-hidden="true" />,
    grade: "low",
  };
}

interface RatingBarProps {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

function RatingBar({ again, hard, good, easy }: RatingBarProps) {
  const total = again + hard + good + easy;
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="summary-rating-bar">
      <div
        className="summary-rating-bar__track"
        role="img"
        aria-label="Rating distribution bar"
      >
        {again > 0 && (
          <div
            className="summary-rating-bar__seg summary-rating-bar__seg--again"
            style={{ width: pct(again) }}
          />
        )}
        {hard > 0 && (
          <div
            className="summary-rating-bar__seg summary-rating-bar__seg--hard"
            style={{ width: pct(hard) }}
          />
        )}
        {good > 0 && (
          <div
            className="summary-rating-bar__seg summary-rating-bar__seg--good"
            style={{ width: pct(good) }}
          />
        )}
        {easy > 0 && (
          <div
            className="summary-rating-bar__seg summary-rating-bar__seg--easy"
            style={{ width: pct(easy) }}
          />
        )}
      </div>
      <div className="summary-rating-bar__legend">
        {(
          [
            { label: "Again", count: again, mod: "again" },
            { label: "Hard", count: hard, mod: "hard" },
            { label: "Good", count: good, mod: "good" },
            { label: "Easy", count: easy, mod: "easy" },
          ] as const
        ).map(({ label, count, mod }) => (
          <span
            key={label}
            className={`summary-rating-legend__item summary-rating-legend__item--${mod}${count === 0 ? " summary-rating-legend__item--zero" : ""}`}
          >
            <strong>{count}</strong>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SessionSummary({ summary }: SessionSummaryProps) {
  const { label, subtitle, iconEl, grade } = gradeFromAccuracy(summary.accuracy);
  const masteredCount = summary.goodCount + summary.easyCount;
  const continueHref = `/study/session?mode=${encodeURIComponent(summary.mode)}&sessionLength=20${
    summary.deckId ? `&deckId=${summary.deckId}` : ""
  }`;
  const accuracyLabel =
    summary.mode === "multiple_choice"
      ? "Correct choices"
      : summary.mode === "type_answer"
        ? "Correct answers"
        : "Good or Easy";

  return (
    <motion.div
      className="session-summary"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
      }}
    >
      {/* Performance grade */}
      <motion.div
        className="session-summary__grade"
        variants={summaryItemVariants}
      >
        <div className="session-summary__icon">{iconEl}</div>
        <h2>{label}</h2>
        <p>{subtitle}</p>
      </motion.div>

      {/* Big accuracy number */}
      <motion.div
        className="session-summary__accuracy"
        variants={summaryItemVariants}
      >
        <span
          className="session-summary__accuracy-number"
          data-grade={grade}
        >
          {summary.accuracy}%
        </span>
        <span className="session-summary__accuracy-label">{accuracyLabel}</span>
      </motion.div>

      {/* Rating distribution bar */}
      <motion.div
        className="session-summary__bar-wrap"
        variants={summaryItemVariants}
      >
        <RatingBar
          again={summary.againCount}
          hard={summary.hardCount}
          good={summary.goodCount}
          easy={summary.easyCount}
        />
      </motion.div>

      {/* Stats grid */}
      <motion.div
        className="session-summary__stats"
        variants={summaryItemVariants}
      >
        <StatCard
          label="Time"
          value={formatDuration(summary.timeSpentSeconds)}
          meta="session duration"
        />
        <StatCard
          label="Cards"
          value={`${summary.reviewedCount} / ${summary.totalItems}`}
          meta="reviewed"
        />
        <StatCard
          label="Mastered"
          value={String(masteredCount)}
          meta="Good or Easy"
        />
        <StatCard
          label="Struggled"
          value={String(summary.againCount)}
          meta="marked Again"
        />
        <StatCard
          label="Almost"
          value={String(summary.hardCount)}
          meta="marked Hard"
        />
        <StatCard
          label="XP"
          value={summary.xpEarned > 0 ? `+${summary.xpEarned}` : "—"}
          meta="experience"
        />
      </motion.div>

      {/* Achievement placeholder */}
      <motion.div
        className="session-summary__achievements"
        variants={summaryItemVariants}
      >
        <Trophy size={16} aria-hidden="true" />
        <div>
          <strong>Achievements</strong>
          <p>
            Progress is being tracked. Unlock details coming in a future
            update.
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="session-summary__actions"
        variants={summaryItemVariants}
      >
        <Button asChild variant="ghost">
          <Link to="/home">
            <Home size={15} aria-hidden="true" />
            Home
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/weak-words">
            <AlertCircle size={15} aria-hidden="true" />
            Weak Words
          </Link>
        </Button>
        <Button asChild variant="primary">
          <Link to={continueHref}>
            <RotateCcw size={15} aria-hidden="true" />
            Continue
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
