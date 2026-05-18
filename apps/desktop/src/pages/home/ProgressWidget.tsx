import { BarChart3, Clock3, Star } from "lucide-react";

import { Card, ProgressBar } from "@/components/ui";

import type {
  DeckCardData,
  ProgressWidgetItem,
  StudyActivityItem,
} from "./types";

interface FeaturedDeckWidgetProps {
  deck: DeckCardData;
}

interface ProgressWidgetProps {
  items: ProgressWidgetItem[];
}

interface StudyActivityWidgetProps {
  activity: StudyActivityItem[];
}

export function FeaturedDeckWidget({ deck }: FeaturedDeckWidgetProps) {
  return (
    <Card className="home-widget" variant="glass">
      <div className="home-widget__label">
        <Star size={15} aria-hidden="true" />
        Featured Deck
      </div>
      <h3 className="home-widget__title">{deck.title}</h3>
      <p className="home-widget__copy">{deck.subtitle}</p>
      <div className="home-widget__meta">
        <span>{deck.level}</span>
        <span>{deck.wordCount.toLocaleString()} words</span>
      </div>
      <ProgressBar
        label={`${deck.title} featured progress`}
        value={deck.progress}
      />
    </Card>
  );
}

export function ProgressWidget({ items }: ProgressWidgetProps) {
  return (
    <Card className="home-widget" variant="glass">
      <div className="home-widget__label">
        <BarChart3 size={15} aria-hidden="true" />
        Your Progress
      </div>
      <div className="home-progress-list">
        {items.map((item) => (
          <div className="home-progress-list__item" key={item.label}>
            <div className="home-progress-list__row">
              <span>{item.label}</span>
              <strong>{item.caption}</strong>
            </div>
            <ProgressBar label={item.label} max={item.max} value={item.value} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StudyActivityWidget({ activity }: StudyActivityWidgetProps) {
  const maxCards = Math.max(...activity.map((item) => item.cards));

  return (
    <Card className="home-widget" variant="glass">
      <div className="home-widget__label">
        <Clock3 size={15} aria-hidden="true" />
        Study Activity
      </div>
      <div className="home-activity" aria-label="Study activity by day">
        {activity.map((item) => (
          <div className="home-activity__bar-wrap" key={item.day}>
            <div
              className="home-activity__bar"
              style={{
                height: `${Math.max(18, (item.cards / maxCards) * 100)}%`,
              }}
              title={`${item.day}: ${item.cards} cards`}
            />
            <span>{item.day}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
