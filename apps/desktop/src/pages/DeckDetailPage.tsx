import "./deck-detail/DeckDetailPage.css";

import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpenCheck,
  Brain,
  ChevronLeft,
  ClipboardCheck,
  Keyboard,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { useDeckDetail } from "@/hooks/useDeckDetail";
import type { DeckDetailDto } from "@/services/commands/decks";

import { StudyModeCard } from "./deck-detail/StudyModeCard";
import type {
  DeckProgressItem,
  PreviewWord,
  StudyMode,
} from "./deck-detail/types";
import { WordPreview } from "./deck-detail/WordPreview";

function parseDeckId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatLevel(level: string | null): string {
  if (!level) {
    return "New";
  }

  return level.charAt(0).toUpperCase() + level.slice(1);
}

function studyHref(deckId: number, mode: string): string {
  return `/study/session?deckId=${deckId}&mode=${mode}`;
}

function buildStudyModes(deck: DeckDetailDto): StudyMode[] {
  return [
    {
      description:
        "Start a real flashcard session from due, weak, and new cards.",
      estimate: `${deck.progress.dueCount} due`,
      href: studyHref(deck.id, "smart-review"),
      Icon: Brain,
      title: "Smart Review",
    },
    {
      description: "Study this deck with the FSRS-powered flashcard flow.",
      estimate: `${Math.min(deck.wordCount, 20)} cards`,
      href: studyHref(deck.id, "flashcard"),
      Icon: RotateCcw,
      title: "Flashcards",
    },
    {
      description:
        "Choose the right Vietnamese meaning from plausible options.",
      estimate: `${Math.min(deck.wordCount, 20)} questions`,
      href: studyHref(deck.id, "multiple-choice"),
      Icon: ClipboardCheck,
      title: "Multiple Choice",
    },
    {
      description:
        "Type the Vietnamese meaning and grade recall with fuzzy matching.",
      estimate: `${Math.min(deck.wordCount, 20)} prompts`,
      href: studyHref(deck.id, "type-answer"),
      Icon: Keyboard,
      title: "Type Answer",
    },
    {
      description:
        "Focus on cards with lapses, high difficulty, or low stability.",
      estimate: `${deck.progress.dueCount} due`,
      href: studyHref(deck.id, "weak_drill"),
      Icon: Layers3,
      title: "Weak Words Drill",
    },
  ];
}

function toPreviewWords(deck: DeckDetailDto): PreviewWord[] {
  return deck.words.map((word) => ({
    headword: word.headword,
    partOfSpeech: word.partOfSpeech ?? "word",
    level: word.level ?? deck.level ?? "New",
    definitionVi: word.definitionVi ?? word.definitionEn ?? "No definition yet",
    example: word.example ?? "No example sentence yet.",
    dueState: word.dueState,
  }));
}

function progressItems(deck: DeckDetailDto): DeckProgressItem[] {
  return [
    { label: "Deck progress", value: deck.progress.progress },
    { label: "Accuracy", value: deck.progress.accuracy },
    {
      label: "Mastered words",
      value:
        deck.wordCount > 0
          ? Math.round((deck.progress.masteredCount * 100) / deck.wordCount)
          : 0,
    },
  ];
}

export function DeckDetailPage() {
  const { deckId: deckIdParam } = useParams<{ deckId: string }>();
  const deckId = parseDeckId(deckIdParam);
  const { deck, error, isLoading, notFound } = useDeckDetail(deckId);

  if (isLoading) {
    return (
      <div
        className="deck-detail-page deck-detail-page--loading"
        aria-label="Loading deck detail"
      >
        <Loader2
          size={28}
          className="deck-detail-page__spinner"
          aria-hidden="true"
        />
        <p>Loading deck detail...</p>
      </div>
    );
  }

  if (error && !notFound) {
    return (
      <Card className="deck-detail-state-card" variant="glass">
        <EmptyState
          title="Could not load deck"
          description={error}
          icon={<AlertCircle size={28} aria-hidden="true" />}
          actions={
            <Button asChild variant="secondary">
              <Link to="/library">Back to Library</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  if (notFound || !deck) {
    return (
      <Card className="deck-detail-state-card" variant="glass">
        <EmptyState
          title="Deck not found"
          description="This local deck does not exist or is no longer available."
          icon={<AlertCircle size={28} aria-hidden="true" />}
          actions={
            <Button asChild variant="primary">
              <Link to="/discover">Open Discover</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const level = formatLevel(deck.level);
  const studyModes = buildStudyModes(deck);
  const words = toPreviewWords(deck);
  const progress = progressItems(deck);

  return (
    <motion.div
      className="deck-detail-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="deck-detail-page__title">Deck Detail</h2>

      <Button asChild className="deck-detail-back" variant="ghost">
        <Link to="/library">
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Library
        </Link>
      </Button>

      <Card className="deck-detail-hero" variant="hero">
        <div className="deck-detail-hero__cover" aria-hidden="true">
          <div className="deck-detail-hero__cover-panel">
            <BookOpenCheck size={64} />
            <span>{level}</span>
          </div>
        </div>

        <div className="deck-detail-hero__content">
          <p className="deck-detail-hero__eyebrow">
            {deck.installed ? "Installed deck" : "Discover deck"} / {deck.slug}
          </p>
          <h1>{deck.title}</h1>
          <p className="deck-detail-hero__description">
            {deck.description ?? "No description has been added for this deck."}
          </p>

          <div className="deck-detail-hero__tags" aria-label="Deck metadata">
            <Badge>{level}</Badge>
            <Badge variant="muted">{deck.packName}</Badge>
            <Badge variant="muted">
              {deck.wordCount.toLocaleString()} words
            </Badge>
            {deck.tags.map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="deck-detail-hero__actions">
            <Button asChild variant="primary">
              <Link to={studyHref(deck.id, "continue")}>
                <Play size={16} aria-hidden="true" />
                Continue
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={studyHref(deck.id, "learn")}>Start Learning</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="deck-detail-layout">
        <main className="deck-detail-main">
          <section className="deck-detail-section" aria-label="Study modes">
            <SectionHeader
              title="Choose a Study Mode"
              description="Flashcards and Multiple Choice use the local Smart Review queue."
            />
            <div className="deck-detail-mode-grid">
              {studyModes.map((mode) => (
                <StudyModeCard mode={mode} key={mode.title} />
              ))}
            </div>
          </section>

          <WordPreview words={words} />
        </main>

        <aside className="deck-detail-side" aria-label="Deck progress">
          <Card className="deck-detail-panel" variant="glass">
            <SectionHeader
              title="Progress Summary"
              description="Local progress fields, reported honestly from available data."
            />
            <div className="deck-detail-progress-list">
              {progress.map((item) => (
                <div className="deck-detail-progress-item" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <ProgressBar label={item.label} value={item.value} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="deck-detail-panel deck-detail-facts" variant="glass">
            <SectionHeader
              title="Deck Facts"
              description="Local metadata from the installed SQLite catalog."
            />
            <dl>
              <div>
                <dt>Installed</dt>
                <dd>{deck.installed ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Due now</dt>
                <dd>{deck.progress.dueCount}</dd>
              </div>
              <div>
                <dt>Mastered</dt>
                <dd>{deck.progress.masteredCount}</dd>
              </div>
              <div>
                <dt>Last studied</dt>
                <dd>{deck.progress.lastStudied ?? "New deck"}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}
