import "./study-session/StudySessionPage.css";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Keyboard,
  Layers3,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, Button, Card, ProgressBar, StatCard } from "@/components/ui";

import { mockSessionItems } from "./study-session/studySessionMockData";
import type { RatingLabel } from "./study-session/types";

const ratingButtons: Array<{
  label: RatingLabel;
  hint: string;
  variant: "danger" | "secondary" | "soft" | "primary";
}> = [
  { label: "Again", hint: "1", variant: "danger" },
  { label: "Hard", hint: "2", variant: "secondary" },
  { label: "Good", hint: "3", variant: "soft" },
  { label: "Easy", hint: "4", variant: "primary" },
];

export function StudySessionPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [ratings, setRatings] = useState<RatingLabel[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentItem = mockSessionItems[currentIndex];
  const progressValue = isComplete
    ? mockSessionItems.length
    : currentIndex + (isFlipped ? 0.5 : 0);

  const summary = useMemo(
    () => ({
      cards: ratings.length,
      correct: ratings.filter(
        (rating) => rating === "Good" || rating === "Easy",
      ).length,
      xp: 48 + ratings.length * 6,
    }),
    [ratings],
  );

  function goNext(rating?: RatingLabel) {
    if (rating) {
      setRatings((current) => [...current, rating]);
    }

    if (currentIndex >= mockSessionItems.length - 1) {
      setIsComplete(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setIsFlipped(false);
    setTypedAnswer("");
  }

  function restartSession() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setTypedAnswer("");
    setRatings([]);
    setIsComplete(false);
  }

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
          <p className="study-session-header__eyebrow">IELTS Speaking Core</p>
          <h1>{isComplete ? "Session Summary" : "Focused Study Session"}</h1>
          <p>
            {isComplete
              ? "Mock results are ready. No progress has been saved."
              : "Practice mixed modes with mock prompts before the real engine is wired."}
          </p>
        </div>
        <div className="study-session-header__meta">
          <span>
            <Clock3 size={15} aria-hidden="true" />
            12 min focus
          </span>
          <Badge variant="muted">
            {isComplete
              ? "Complete"
              : `${currentIndex + 1} / ${mockSessionItems.length}`}
          </Badge>
        </div>
        <ProgressBar
          label="Session progress"
          max={mockSessionItems.length}
          value={progressValue}
        />
      </Card>

      {isComplete ? (
        <SessionSummary
          cards={summary.cards}
          correct={summary.correct}
          xp={summary.xp}
          onRestart={restartSession}
        />
      ) : (
        <div className="study-session-layout">
          <main className="study-session-main">
            <Card className="study-card-shell" variant="hero">
              <div className="study-card-shell__topline">
                <Badge>{currentItem.mode}</Badge>
                <button
                  className="study-card-shell__audio"
                  type="button"
                  aria-label="Audio placeholder"
                >
                  <Volume2 size={18} aria-hidden="true" />
                  Audio placeholder
                </button>
              </div>

              {currentItem.mode === "Flashcard" && (
                <FlashcardView
                  answer={currentItem.answer}
                  prompt={currentItem.prompt}
                  example={currentItem.example}
                  flipped={isFlipped}
                  onFlip={() => setIsFlipped((current) => !current)}
                />
              )}

              {currentItem.mode === "Multiple Choice" && (
                <MultipleChoiceView
                  answer={currentItem.answer}
                  choices={currentItem.choices}
                  prompt={currentItem.prompt}
                />
              )}

              {currentItem.mode === "Type Answer" && (
                <TypeAnswerView
                  answer={currentItem.answer}
                  prompt={currentItem.prompt}
                  typedAnswer={typedAnswer}
                  onTypedAnswerChange={setTypedAnswer}
                />
              )}
            </Card>

            <div className="study-rating-row" aria-label="Mock rating buttons">
              {ratingButtons.map((rating) => (
                <Button
                  key={rating.label}
                  type="button"
                  variant={rating.variant}
                  onClick={() => goNext(rating.label)}
                >
                  {rating.label}
                  <kbd>{rating.hint}</kbd>
                </Button>
              ))}
            </div>
          </main>

          <aside className="study-session-side" aria-label="Session support">
            <Card className="study-session-widget" variant="compact">
              <Sparkles size={20} aria-hidden="true" />
              <div>
                <strong>Shortcut hints</strong>
                <p>Space flips flashcards. 1-4 choose mock ratings.</p>
              </div>
            </Card>
            <Card className="study-session-widget" variant="compact">
              <Layers3 size={20} aria-hidden="true" />
              <div>
                <strong>Mixed modes</strong>
                <p>
                  Flashcard, choice, and typed answer layouts are mocked here.
                </p>
              </div>
            </Card>
            <Card className="study-session-widget" variant="compact">
              <Headphones size={20} aria-hidden="true" />
              <div>
                <strong>Listening-ready</strong>
                <p>
                  Audio controls are placeholders for bundled playback later.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </motion.div>
  );
}

interface FlashcardViewProps {
  answer: string;
  example: string;
  flipped: boolean;
  onFlip: () => void;
  prompt: string;
}

function FlashcardView({
  answer,
  example,
  flipped,
  onFlip,
  prompt,
}: FlashcardViewProps) {
  return (
    <button
      className="flashcard"
      type="button"
      aria-pressed={flipped}
      onClick={onFlip}
    >
      <motion.div
        className="flashcard__inner"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="flashcard__face flashcard__front">
          <p>Prompt</p>
          <h2>{prompt}</h2>
          <span>Click to reveal meaning</span>
        </div>
        <div className="flashcard__face flashcard__back">
          <p>Answer</p>
          <h2>{answer}</h2>
          <span>{example}</span>
        </div>
      </motion.div>
    </button>
  );
}

interface MultipleChoiceViewProps {
  answer: string;
  choices: string[];
  prompt: string;
}

function MultipleChoiceView({
  answer,
  choices,
  prompt,
}: MultipleChoiceViewProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  return (
    <div className="choice-card">
      <p className="study-card-label">Choose the best meaning</p>
      <h2>{prompt}</h2>
      <div className="choice-card__grid">
        {choices.map((choice) => (
          <button
            className="choice-card__option"
            data-selected={selectedChoice === choice}
            key={choice}
            type="button"
            onClick={() => setSelectedChoice(choice)}
          >
            {choice}
            {selectedChoice === choice &&
              (choice === answer ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <XCircle size={16} aria-hidden="true" />
              ))}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TypeAnswerViewProps {
  answer: string;
  onTypedAnswerChange: (value: string) => void;
  prompt: string;
  typedAnswer: string;
}

function TypeAnswerView({
  answer,
  onTypedAnswerChange,
  prompt,
  typedAnswer,
}: TypeAnswerViewProps) {
  return (
    <div className="type-answer-card">
      <p className="study-card-label">Type answer mock</p>
      <h2>{prompt}</h2>
      <label>
        Your answer
        <input
          placeholder="Type the English phrase..."
          type="text"
          value={typedAnswer}
          onChange={(event) => onTypedAnswerChange(event.target.value)}
        />
      </label>
      <div className="type-answer-card__hint">
        <Keyboard size={16} aria-hidden="true" />
        Expected answer placeholder: <strong>{answer}</strong>
      </div>
    </div>
  );
}

interface SessionSummaryProps {
  cards: number;
  correct: number;
  onRestart: () => void;
  xp: number;
}

function SessionSummary({
  cards,
  correct,
  onRestart,
  xp,
}: SessionSummaryProps) {
  return (
    <Card className="session-summary" variant="hero">
      <div className="session-summary__icon">
        <Sparkles size={34} aria-hidden="true" />
      </div>
      <h2>Session complete</h2>
      <p>
        This summary is mock-only and ready for future FSRS session results.
      </p>
      <div className="session-summary__stats">
        <StatCard
          label="Cards studied"
          value={String(cards)}
          meta="mock items"
        />
        <StatCard
          label="Strong ratings"
          value={String(correct)}
          meta="Good or Easy"
        />
        <StatCard label="XP preview" value={`+${xp}`} meta="not saved" />
      </div>
      <Button type="button" variant="primary" onClick={onRestart}>
        <RotateCcw size={16} aria-hidden="true" />
        Restart mock session
      </Button>
      <div className="session-summary__shortcuts">
        <span>Space flip</span>
        <span>1 Again</span>
        <span>2 Hard</span>
        <span>3 Good</span>
        <span>4 Easy</span>
        <span>
          Next <ChevronRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
