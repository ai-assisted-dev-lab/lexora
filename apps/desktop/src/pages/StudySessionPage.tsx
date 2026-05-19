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
  Keyboard,
  Layers3,
  Loader2,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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
  type ReviewCardDto,
  type SmartReviewQueueItemDto,
  startFlashcardSession,
  type StudySessionDto,
  type StudySessionSummaryDto,
  submitFlashcardReview,
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

  const [session, setSession] = useState<StudySessionDto | null>(null);
  const [summary, setSummary] = useState<StudySessionSummaryDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(isFlashcardMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardStartedAtMs, setCardStartedAtMs] = useState(() => Date.now());
  const isSubmittingRef = useRef(false);

  const currentItem = session?.queue.items[currentIndex] ?? null;
  const isComplete = summary !== null;
  const totalItems = session?.totalItems ?? 0;
  const reviewedCount = summary?.reviewedCount ?? session?.reviewedCount ?? 0;
  const scopeLabel = session?.deckId
    ? `Deck ${session.deckId}`
    : "All installed decks";
  const exitHref = session?.deckId ? `/library/${session.deckId}` : "/review";
  const progressValue = isComplete
    ? totalItems
    : reviewedCount + (isFlipped && currentItem ? 0.5 : 0);

  const startSession = useCallback(async () => {
    if (!isFlashcardMode) {
      setIsLoading(false);
      setError("Only Flashcard mode is available for real sessions right now.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);
    setSession(null);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const result = await startFlashcardSession({
        deckId,
        sessionLength,
        mode: "flashcard",
      });
      if (!result || !Array.isArray(result.queue?.items)) {
        throw new Error("Flashcard session response was invalid.");
      }
      setSession(result);
      setCardStartedAtMs(Date.now());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [deckId, isFlashcardMode, sessionLength]);

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

      if (!currentItem || isSubmitting || isComplete) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsFlipped((current) => !current);
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
    currentItem,
    exitHref,
    isComplete,
    isFlipped,
    isSubmitting,
    navigate,
    submitRating,
  ]);

  const supportStats = useMemo(
    () => [
      {
        label: "Queue",
        value: totalItems.toString(),
        meta:
          session === null
            ? "Loading"
            : `${session.queue?.summary.dueCount ?? 0} due / ${
                session.queue?.summary.weakCount ?? 0
              } weak / ${session.queue?.summary.newCount ?? 0} new`,
      },
      {
        label: "Reviewed",
        value: reviewedCount.toString(),
        meta: `${session?.againCount ?? 0} again / ${session?.goodCount ?? 0} good`,
      },
      {
        label: "Accuracy",
        value: summary
          ? `${summary.accuracy}%`
          : totalItems > 0
            ? `${Math.round(((session?.correctCount ?? 0) * 100) / totalItems)}%`
            : "0%",
        meta: "Good or Easy",
      },
    ],
    [reviewedCount, session, summary, totalItems],
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
          <h1>{isComplete ? "Session Summary" : "Flashcard Session"}</h1>
          <p>
            {isComplete
              ? "Your saved session summary is ready."
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

      {!isLoading && error && !currentItem && !summary && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="Could not start flashcards"
            description={error}
            icon={<AlertCircle size={28} aria-hidden="true" />}
            actions={
              isFlashcardMode ? (
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

      {!isLoading && !error && session && session.queue.items.length === 0 && (
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

      {!isLoading && currentItem && !summary && (
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
                  <Badge>Flashcard</Badge>
                  <Badge variant="muted">{currentItem.category}</Badge>
                </div>
                {(currentItem.ipaUk || currentItem.ipaUs) && (
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

              <FlashcardView
                flipped={isFlipped}
                item={currentItem}
                onFlip={() => setIsFlipped((current) => !current)}
              />
              {isFlipped && (
                <div className="study-card-shell__detail-row">
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/word/${currentItem.card.vocabularyItemId}`}>
                      Open Word Detail
                    </Link>
                  </Button>
                </div>
              )}
            </Card>

            <div className="study-rating-row" aria-label="Review rating buttons">
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
          </main>

          <aside className="study-session-side" aria-label="Session support">
            <Card className="study-session-widget" variant="compact">
              <Keyboard size={20} aria-hidden="true" />
              <div>
                <strong>Shortcut hints</strong>
                <p>Space flips. 1-4 rate after the answer is visible. Esc exits.</p>
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

interface SessionSummaryProps {
  exitHref: string;
  summary: StudySessionSummaryDto;
}

function SessionSummary({ exitHref, summary }: SessionSummaryProps) {
  return (
    <Card className="session-summary" variant="hero">
      <div className="session-summary__icon">
        <Sparkles size={34} aria-hidden="true" />
      </div>
      <h2>Session complete</h2>
      <p>Review updates and logs have been saved locally.</p>
      <div className="session-summary__stats">
        <StatCard
          label="Cards studied"
          value={String(summary.reviewedCount)}
          meta={`${summary.totalItems} queued`}
        />
        <StatCard
          label="Accuracy"
          value={`${summary.accuracy}%`}
          meta="Good or Easy"
        />
        <StatCard
          label="Time spent"
          value={formatDuration(summary.timeSpentSeconds)}
          meta="local session"
        />
      </div>
      <div className="session-summary__stats">
        <StatCard label="Again" value={String(summary.againCount)} />
        <StatCard label="Hard" value={String(summary.hardCount)} />
        <StatCard label="Good" value={String(summary.goodCount)} />
        <StatCard label="Easy" value={String(summary.easyCount)} />
      </div>
      <Button asChild variant="primary">
        <Link to={exitHref}>
          <CheckCircle2 size={16} aria-hidden="true" />
          Finish
        </Link>
      </Button>
      <div className="session-summary__shortcuts">
        <span>Space flip</span>
        <span>1 Again</span>
        <span>2 Hard</span>
        <span>3 Good</span>
        <span>4 Easy</span>
      </div>
    </Card>
  );
}
