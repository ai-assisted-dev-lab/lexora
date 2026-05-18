import { motion } from "framer-motion";
import { BookOpen, Layers3 } from "lucide-react";

import { Badge, Card, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

import type { DeckCardData } from "./types";

interface DeckCardProps {
  deck: DeckCardData;
}

export function DeckCard({ deck }: DeckCardProps) {
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.16 }}>
      <Card className="home-deck-card" variant="interactive">
        <div
          className={cn(
            "home-deck-card__cover",
            `home-deck-card__cover--${deck.tone}`,
          )}
        >
          <BookOpen size={24} aria-hidden="true" />
          <Badge variant="muted">{deck.level}</Badge>
        </div>
        <div className="home-deck-card__body">
          <div>
            <p className="home-deck-card__pack">
              <Layers3 size={13} aria-hidden="true" />
              {deck.pack}
            </p>
            <h3 className="home-deck-card__title">{deck.title}</h3>
            <p className="home-deck-card__subtitle">{deck.subtitle}</p>
          </div>
          <div className="home-deck-card__words" aria-label="Sample words">
            {deck.sampleWords.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </div>
          <div className="home-deck-card__footer">
            <span>{deck.wordCount.toLocaleString()} words</span>
            <span>{deck.progress}% learned</span>
          </div>
          <ProgressBar
            label={`${deck.title} progress`}
            value={deck.progress}
            className="home-deck-card__progress"
          />
        </div>
      </Card>
    </motion.article>
  );
}
