import { motion } from "framer-motion";
import { CalendarClock, Flame, Play } from "lucide-react";

import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

import type { InstalledDeck } from "./types";

interface InstalledDeckCardProps {
  deck: InstalledDeck;
  compact?: boolean;
}

export function InstalledDeckCard({
  compact = false,
  deck,
}: InstalledDeckCardProps) {
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.16 }}>
      <Card
        className={cn(
          "installed-deck-card",
          compact && "installed-deck-card--compact",
        )}
        variant="interactive"
      >
        <div
          className={cn(
            "installed-deck-card__cover",
            `installed-deck-card__cover--${deck.tone}`,
          )}
        >
          <div>
            <p>{deck.level}</p>
            <h3>{deck.title}</h3>
          </div>
          {deck.favorite && <Badge variant="muted">Favorite</Badge>}
        </div>

        <div className="installed-deck-card__body">
          <p className="installed-deck-card__description">{deck.description}</p>

          <div
            className="installed-deck-card__tags"
            aria-label={`${deck.title} tags`}
          >
            {deck.tags.map((tag) => (
              <Badge
                key={tag}
                variant={deck.weak && tag === "Business" ? "warning" : "muted"}
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="installed-deck-card__progress">
            <div className="installed-deck-card__progress-row">
              <span>Progress</span>
              <strong>{deck.progress}%</strong>
            </div>
            <ProgressBar
              label={`${deck.title} progress`}
              value={deck.progress}
            />
          </div>

          <div className="installed-deck-card__stats">
            <span>
              <Flame size={14} aria-hidden="true" />
              {deck.masteredCount} mastered
            </span>
            <span>
              <CalendarClock size={14} aria-hidden="true" />
              {deck.dueCount} due
            </span>
            <span>{deck.accuracy}% accuracy</span>
          </div>

          <div className="installed-deck-card__footer">
            <span>{deck.lastStudied}</span>
            <span>{deck.wordCount.toLocaleString()} words</span>
          </div>

          <Button
            className="installed-deck-card__study"
            type="button"
            variant="primary"
          >
            <Play size={15} aria-hidden="true" />
            Study
          </Button>
        </div>
      </Card>
    </motion.article>
  );
}
