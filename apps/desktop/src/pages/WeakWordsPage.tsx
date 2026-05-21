import "./weak-words/WeakWordsPage.css";

import { motion } from "framer-motion";
import { AlertCircle, Dumbbell, Play, RotateCcw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Badge, Button, Card, EmptyState, StatCard } from "@/components/ui";
import {
  getWeakWords,
  type SmartReviewQueueItemDto,
  type WeakWordsDto,
} from "@/services/commands/review";
import { formatTauriError } from "@/services/tauri";

const DEFAULT_DRILL_LENGTH = 20;

function WeakIndicator({
  label,
  variant,
}: {
  label: string;
  variant: "lapses" | "difficulty" | "stability";
}) {
  return (
    <span className={`weak-indicator weak-indicator--${variant}`}>{label}</span>
  );
}

function WeakWordRow({ item }: { item: SmartReviewQueueItemDto }) {
  const { card } = item;
  const definition = item.definitionVi ?? item.definitionEn;

  return (
    <Card className="weak-word-row" variant="compact">
      <div className="weak-word-row__word">
        <span className="weak-word-row__headword">{item.headword}</span>
        {item.partOfSpeech && (
          <span className="weak-word-row__pos">{item.partOfSpeech}</span>
        )}
        {definition && (
          <p className="weak-word-row__definition">{definition}</p>
        )}
      </div>
      <div className="weak-word-row__indicators">
        {card.lapses > 0 && (
          <WeakIndicator
            label={`${card.lapses} lapse${card.lapses > 1 ? "s" : ""}`}
            variant="lapses"
          />
        )}
        {card.difficulty >= 7.0 && (
          <WeakIndicator
            label={`diff ${card.difficulty.toFixed(1)}`}
            variant="difficulty"
          />
        )}
        {card.stability > 0 && card.stability < 2.0 && (
          <WeakIndicator
            label={`stab ${card.stability.toFixed(1)}`}
            variant="stability"
          />
        )}
      </div>
    </Card>
  );
}

export function WeakWordsPage() {
  const [data, setData] = useState<WeakWordsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getWeakWords(null);
      setData(result);
    } catch (e) {
      const formatted = formatTauriError(e);
      setError(
        formatted === "An unexpected error occurred" ? String(e) : formatted,
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const drillHref = `/study/session?mode=weak_drill&sessionLength=${DEFAULT_DRILL_LENGTH}`;
  const hasWords = (data?.totalCount ?? 0) > 0;

  return (
    <motion.div
      className="weak-words-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="weak-words-page__title">Weak Words</h2>

      <Card className="weak-words-hero" variant="glass">
        <div>
          <p className="weak-words-hero__eyebrow">Focus drill</p>
          <h1>Weak Words</h1>
          <p>
            Words flagged by FSRS for frequent mistakes, high difficulty, or low
            retention stability. Drill them to reinforce long-term memory.
          </p>
        </div>
        <div className="weak-words-hero__actions">
          <Button asChild variant="primary" disabled={!hasWords || isLoading}>
            <Link to={drillHref}>
              <Play size={15} aria-hidden="true" />
              Start Drill
            </Link>
          </Button>
          <Badge variant="muted">
            {isLoading
              ? "Loading…"
              : hasWords
                ? `${data!.totalCount} weak word${data!.totalCount === 1 ? "" : "s"}`
                : "No weak words"}
          </Badge>
        </div>
      </Card>

      {!isLoading && !error && data && (
        <div className="weak-words-stats">
          <StatCard
            icon={<Dumbbell size={18} aria-hidden="true" />}
            label="Total Weak"
            value={data.totalCount.toString()}
            meta="Across all installed decks"
          />
          <StatCard
            icon={<AlertCircle size={18} aria-hidden="true" />}
            label="High Lapses"
            value={data.highLapsesCount.toString()}
            meta="≥1 incorrect review"
          />
          <StatCard
            icon={<Zap size={18} aria-hidden="true" />}
            label="High Difficulty"
            value={data.highDifficultyCount.toString()}
            meta="Difficulty ≥ 7.0"
          />
          <StatCard
            icon={<RotateCcw size={18} aria-hidden="true" />}
            label="Low Stability"
            value={data.lowStabilityCount.toString()}
            meta="Stability 0 – 2 days"
          />
        </div>
      )}

      {isLoading && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="Loading weak words…"
            description="Querying your FSRS review data."
            icon={<AlertCircle size={28} aria-hidden="true" />}
          />
        </Card>
      )}

      {!isLoading && error && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="Could not load weak words"
            description={error}
            icon={<AlertCircle size={28} aria-hidden="true" />}
            actions={
              <Button
                type="button"
                variant="primary"
                onClick={() => void load()}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Try again
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && !error && !hasWords && (
        <Card className="study-session-state-card" variant="glass">
          <EmptyState
            title="All caught up"
            description="No struggling words detected. Keep studying to reveal cards that need extra attention."
            icon={<Dumbbell size={28} aria-hidden="true" />}
            actions={
              <Button asChild variant="secondary">
                <Link to="/review">Back to Review</Link>
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && !error && hasWords && data!.items.length > 0 && (
        <div className="weak-words-list">
          <div className="weak-words-list__header">
            <span className="weak-words-list__title">Flagged Words</span>
            <span className="weak-words-list__count">
              Showing {data!.items.length} of {data!.totalCount}
            </span>
          </div>
          {data!.items.map((item) => (
            <WeakWordRow key={item.card.id} item={item} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
