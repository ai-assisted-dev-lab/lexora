import "./deck-detail/DeckDetailPage.css";

import { motion } from "framer-motion";
import {
  BookOpenCheck,
  ChevronLeft,
  MessageSquareText,
  Play,
  Star,
  Trophy,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";

import { deckDetailMock } from "./deck-detail/deckDetailMockData";
import { StudyModeCard } from "./deck-detail/StudyModeCard";
import { WordPreview } from "./deck-detail/WordPreview";

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const deck = deckDetailMock;

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
            <span>{deck.level}</span>
          </div>
        </div>

        <div className="deck-detail-hero__content">
          <p className="deck-detail-hero__eyebrow">
            Installed deck {deckId ? `/${deckId}` : ""}
          </p>
          <h1>{deck.title}</h1>
          <p className="deck-detail-hero__description">{deck.description}</p>

          <div className="deck-detail-hero__tags" aria-label="Deck metadata">
            <Badge>{deck.level}</Badge>
            <Badge variant="muted">{deck.topic}</Badge>
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
            <Button type="button" variant="primary">
              <Play size={16} aria-hidden="true" />
              Continue
            </Button>
            <Button type="button" variant="secondary">
              Start Learning
            </Button>
          </div>
        </div>
      </Card>

      <div className="deck-detail-layout">
        <main className="deck-detail-main">
          <section className="deck-detail-section" aria-label="Study modes">
            <SectionHeader
              title="Choose a Study Mode"
              description="Mock launch cards for future local study flows."
            />
            <div className="deck-detail-mode-grid">
              {deck.studyModes.map((mode) => (
                <StudyModeCard mode={mode} key={mode.title} />
              ))}
            </div>
          </section>

          <WordPreview words={deck.words} />

          <section className="deck-detail-section" aria-label="Learner notes">
            <SectionHeader
              title="Learner Notes"
              description="Restrained local mock comments for platform texture."
            />
            <div className="deck-detail-review-list">
              {deck.reviews.map((review) => (
                <Card
                  className="deck-detail-review"
                  key={review.author}
                  variant="compact"
                >
                  <div
                    className="deck-detail-review__avatar"
                    aria-hidden="true"
                  >
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <div className="deck-detail-review__header">
                      <strong>{review.author}</strong>
                      <span>
                        <Star size={13} aria-hidden="true" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p>{review.comment}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </main>

        <aside className="deck-detail-side" aria-label="Deck progress">
          <Card className="deck-detail-panel" variant="glass">
            <SectionHeader
              title="Progress Summary"
              description="Local mock learning state."
            />
            <div className="deck-detail-progress-list">
              {deck.progress.map((item) => (
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

          <Card className="deck-detail-panel" variant="glass">
            <SectionHeader
              title="Deck Achievements"
              description="Preview badges tied to this deck."
            />
            <div className="deck-detail-achievements">
              {deck.achievements.map((achievement) => (
                <div
                  className="deck-detail-achievement"
                  key={achievement.title}
                >
                  <Trophy size={18} aria-hidden="true" />
                  <div>
                    <strong>{achievement.title}</strong>
                    <span>{achievement.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className="deck-detail-panel deck-detail-rating"
            variant="compact"
          >
            <div>
              <MessageSquareText size={20} aria-hidden="true" />
              <span>Mock deck rating</span>
            </div>
            <strong>{deck.rating.toFixed(1)} / 5</strong>
            <p>{deck.reviewCount} local learner notes</p>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}
