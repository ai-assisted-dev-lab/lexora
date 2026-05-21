import "./word-detail/WordDetailPage.css";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  ChevronLeft,
  Link2,
  Loader2,
  NotebookPen,
  Square,
  Volume2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  CompactIPA,
  PronunciationPanel,
} from "@/components/pronunciation/PronunciationPanel";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePronunciationSettings } from "@/hooks/usePronunciationSettings";
import { useWordDetail } from "@/hooks/useWordDetail";
import type {
  WordDetailDto,
  WordRelationDto,
  WordReviewLogDto,
  WordReviewStateDto,
} from "@/services/commands/words";

import { SenseList } from "./word-detail/SenseList";
import type { WordDetailTab, WordSense } from "./word-detail/types";

const tabs: Array<{
  id: WordDetailTab;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "pronunciation", label: "Pronunciation" },
  { id: "usage", label: "Usage" },
  { id: "network", label: "Word Network" },
  { id: "history", label: "Review History" },
  { id: "notes", label: "Notes" },
];

function parseWordId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatReviewStatus(reviewState: WordReviewStateDto | null): string {
  if (!reviewState) {
    return "New word - no review state yet";
  }

  const lastReview = reviewState.lastReview ?? "not reviewed yet";
  return `${reviewState.state} - ${reviewState.reps} reviews - ${reviewState.lapses} lapses - last ${lastReview}`;
}

function masteryValue(reviewState: WordReviewStateDto | null): number {
  if (!reviewState) {
    return 0;
  }

  if (reviewState.state === "review") {
    return 100;
  }

  return Math.min(95, reviewState.reps * 15);
}

function toSenses(word: WordDetailDto): WordSense[] {
  return word.senses.map((sense, index) => ({
    id: sense.id,
    label: sense.domain ?? sense.register ?? `Meaning ${sense.senseIndex + 1}`,
    register: sense.register ?? sense.domain ?? "general",
    definitionEn: sense.definitionEn,
    definitionVi: sense.definitionVi ?? "No Vietnamese explanation yet",
    examples: sense.examples.map((example) => ({
      en: example.sentenceEn,
      vi: example.sentenceVi ?? "",
    })),
    common: index < 2,
  }));
}

function primaryMeaning(word: WordDetailDto): string {
  return (
    word.senses[0]?.definitionVi ??
    word.senses[0]?.definitionEn ??
    "No meanings have been added yet."
  );
}

function relationLabel(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupedRelations(relations: WordRelationDto[]) {
  return relations.reduce<Record<string, WordRelationDto[]>>((groups, item) => {
    const key = relationLabel(item.relationType);
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function reviewLabel(rating: number): string {
  switch (rating) {
    case 1:
      return "Again";
    case 2:
      return "Hard";
    case 3:
      return "Good";
    case 4:
      return "Easy";
    default:
      return `Rating ${rating}`;
  }
}

export function WordDetailPage() {
  const { wordId: wordIdParam } = useParams<{ wordId: string }>();
  const wordId = parseWordId(wordIdParam);
  const { error, isLoading, notFound, word } = useWordDetail(wordId);
  const [activeTab, setActiveTab] = useState<WordDetailTab>("overview");
  const {
    state: audioState,
    play: playAudio,
    stop: stopAudio,
  } = useAudioPlayer();
  const { settings: pronunciationSettings } = usePronunciationSettings();

  const activeTabLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? "Overview",
    [activeTab],
  );

  const handleHeroPlay = useCallback(() => {
    if (!word) return;
    const preferred = pronunciationSettings.pronunciationAccent;
    const primary =
      preferred === "neutral"
        ? word.pronunciations[0]
        : (word.pronunciations.find((item) => item.dialect === preferred) ??
          word.pronunciations[0]);
    if (audioState === "playing") {
      stopAudio();
    } else {
      void playAudio({
        audioPath: primary?.audioPath,
        fallbackText: word.headword,
        settings: pronunciationSettings,
      });
    }
  }, [audioState, playAudio, pronunciationSettings, stopAudio, word]);

  if (isLoading) {
    return (
      <div
        className="word-detail-page word-detail-page--loading"
        aria-label="Loading word detail"
      >
        <Volume2
          size={28}
          className="word-detail-page__spinner"
          aria-hidden="true"
        />
        <p>Loading word detail...</p>
      </div>
    );
  }

  if (error && !notFound) {
    return (
      <Card className="word-detail-state-card" variant="glass">
        <EmptyState
          title="Could not load word"
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

  if (notFound || !word) {
    return (
      <Card className="word-detail-state-card" variant="glass">
        <EmptyState
          title="Word not found"
          description="This local vocabulary item does not exist or is no longer available."
          icon={<AlertCircle size={28} aria-hidden="true" />}
          actions={
            <Button asChild variant="primary">
              <Link to="/library">Back to Library</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const senses = toSenses(word);
  const mastery = masteryValue(word.reviewState);
  const reviewStatus = formatReviewStatus(word.reviewState);
  const relations = groupedRelations(word.relations);
  const primaryAudio = word.pronunciations[0] ?? null;

  return (
    <motion.div
      className="word-detail-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="word-detail-page__title">Word Detail</h2>

      <Button asChild className="word-detail-back" variant="ghost">
        <Link to="/library">
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Library
        </Link>
      </Button>

      <Card className="word-detail-hero" variant="hero">
        <div className="word-detail-hero__main">
          <p className="word-detail-hero__eyebrow">
            Vocabulary entry / {word.id}
          </p>
          <div className="word-detail-hero__heading">
            <div>
              <h1>{word.headword}</h1>
              <p>
                {word.partOfSpeech ?? "word"} - {word.packName ?? "Local pack"}
                {word.frequencyRank
                  ? ` - frequency #${word.frequencyRank.toLocaleString()}`
                  : ""}
              </p>
            </div>
            <Button
              aria-label={
                audioState === "playing"
                  ? "Stop pronunciation"
                  : "Play pronunciation"
              }
              type="button"
              variant="icon"
              disabled={
                audioState === "loading" ||
                (!primaryAudio &&
                  pronunciationSettings.audioFallbackBehavior === "disabled")
              }
              onClick={handleHeroPlay}
            >
              {audioState === "loading" ? (
                <Loader2
                  size={20}
                  className="word-detail-page__spinner"
                  aria-hidden="true"
                />
              ) : audioState === "playing" ? (
                <Square size={20} aria-hidden="true" />
              ) : (
                <Volume2 size={20} aria-hidden="true" />
              )}
            </Button>
          </div>

          {(word.ipaUk || word.ipaUs) && (
            <div className="word-detail-hero__ipa" aria-label="IPA">
              <CompactIPA ipaUk={word.ipaUk} ipaUs={word.ipaUs} />
            </div>
          )}

          <p className="word-detail-hero__meaning">{primaryMeaning(word)}</p>

          <div className="word-detail-hero__tags">
            <Badge>{word.cefrLevel ?? "New"}</Badge>
            {word.partOfSpeech && (
              <Badge variant="muted">{word.partOfSpeech}</Badge>
            )}
            {word.packName && <Badge variant="muted">{word.packName}</Badge>}
          </div>
        </div>

        <aside className="word-detail-status" aria-label="Review status">
          <div>
            <Brain size={24} aria-hidden="true" />
            <span>Review state</span>
          </div>
          <strong>{mastery}%</strong>
          <ProgressBar label="Word mastery" value={mastery} />
          <p>{reviewStatus}</p>
        </aside>
      </Card>

      <div
        className="word-detail-tabs"
        role="tablist"
        aria-label="Word detail tabs"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`word-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className="word-detail-tab"
            id={`word-tab-button-${tab.id}`}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card
        className="word-detail-panel"
        id={`word-tab-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`word-tab-button-${activeTab}`}
        variant="glass"
      >
        <SectionHeader
          title={activeTabLabel}
          description="Local vocabulary content from the SQLite catalog."
        />

        {activeTab === "overview" && <SenseList senses={senses} />}

        {activeTab === "pronunciation" && (
          <PronunciationPanel
            headword={word.headword}
            ipaUk={word.ipaUk}
            ipaUs={word.ipaUs}
            pronunciations={word.pronunciations}
          />
        )}

        {activeTab === "usage" && (
          <UsagePanel
            examples={word.senses.flatMap((sense) => sense.examples)}
          />
        )}

        {activeTab === "network" && <NetworkPanel relations={relations} />}

        {activeTab === "history" && (
          <ReviewHistoryPanel events={word.reviewHistory} />
        )}

        {activeTab === "notes" && (
          <div className="word-detail-notes">
            <NotebookPen size={22} aria-hidden="true" />
            <div>
              <strong>No personal notes yet</strong>
              <p>Notes are not implemented in this prompt.</p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

interface UsagePanelProps {
  examples: Array<{
    sentenceEn: string;
    sentenceVi: string | null;
  }>;
}

function UsagePanel({ examples }: UsagePanelProps) {
  if (examples.length === 0) {
    return (
      <Card className="word-detail-list-card" variant="compact">
        <p>No usage examples are available for this word yet.</p>
      </Card>
    );
  }

  return (
    <div className="word-detail-usage-grid word-detail-usage-grid--single">
      <Card className="word-detail-list-card" variant="compact">
        <div className="word-detail-list-card__title">
          <NotebookPen size={18} aria-hidden="true" />
          <h3>Examples</h3>
        </div>
        <ul>
          {examples.map((example) => (
            <li key={example.sentenceEn}>
              <strong>{example.sentenceEn}</strong>
              {example.sentenceVi && <span>{example.sentenceVi}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

interface NetworkPanelProps {
  relations: Record<string, WordRelationDto[]>;
}

function NetworkPanel({ relations }: NetworkPanelProps) {
  const entries = Object.entries(relations);

  if (entries.length === 0) {
    return (
      <Card className="word-detail-list-card" variant="compact">
        <p>No word relations are available yet.</p>
      </Card>
    );
  }

  return (
    <div className="word-detail-network">
      {entries.map(([title, items]) => (
        <div className="word-detail-network__group" key={title}>
          <h3>
            <Link2 size={16} aria-hidden="true" />
            {title}
          </h3>
          <div>
            {items.map((item) => (
              <Badge
                key={`${item.relationType}-${item.wordId}`}
                variant="muted"
              >
                {item.headword}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReviewHistoryPanelProps {
  events: WordReviewLogDto[];
}

function ReviewHistoryPanel({ events }: ReviewHistoryPanelProps) {
  if (events.length === 0) {
    return (
      <Card className="word-detail-list-card" variant="compact">
        <p>No review history is available for this word yet.</p>
      </Card>
    );
  }

  return (
    <div className="word-detail-history">
      {events.map((event) => (
        <article className="word-detail-history__row" key={event.id}>
          <span>{event.reviewedAt}</span>
          <strong>{reviewLabel(event.rating)}</strong>
          <p>
            {event.result} - {event.mode}
          </p>
        </article>
      ))}
    </div>
  );
}
