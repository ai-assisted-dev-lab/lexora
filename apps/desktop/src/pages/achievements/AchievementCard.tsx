import {
  Award,
  BookOpen,
  Flame,
  Layers,
  Lock,
  Mic,
  Moon,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ProgressBar } from "@/components/ui";

import type { Achievement } from "./types";

const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Flame,
  Layers,
  Lock,
  Mic,
  Moon,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
  Zap,
};

function formatUnlockDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const {
    state,
    tier,
    title,
    description,
    category,
    xpReward,
    unlockedAt,
    progress,
    progressLabel,
    iconName,
  } = achievement;

  const isHidden = state === "hidden";
  const isUnlocked = state === "unlocked";
  const isInProgress = state === "in_progress";

  const IconComponent = isHidden ? Lock : (ICON_MAP[iconName] ?? Award);
  const displayTitle = isHidden ? "???" : title;
  const displayDescription = isHidden
    ? "Complete hidden milestones to reveal this achievement."
    : description;

  return (
    <article
      className="achievement-card"
      data-state={state}
      data-tier={tier}
      aria-label={isHidden ? "Hidden achievement" : title}
    >
      <div className="achievement-badge" aria-hidden="true">
        <IconComponent size={22} />
      </div>

      <div className="achievement-card__content">
        <h3 className="achievement-card__title">{displayTitle}</h3>
        <div className="achievement-card__meta">
          {!isHidden && (
            <span className="achievement-card__category">{category}</span>
          )}
          <span className="achievement-card__tier">
            {isHidden ? "???" : tier}
          </span>
        </div>
        <p className="achievement-card__description">{displayDescription}</p>
      </div>

      {isInProgress && progress !== undefined && (
        <div className="achievement-card__progress">
          <ProgressBar value={progress} label={progressLabel} />
          {progressLabel && (
            <span className="achievement-card__progress-label">
              {progressLabel}
            </span>
          )}
        </div>
      )}

      <div className="achievement-card__footer">
        <span className="achievement-card__xp">
          {isHidden ? "???" : `+${xpReward} XP`}
        </span>
        {isUnlocked && unlockedAt ? (
          <span className="achievement-card__status achievement-card__status--unlocked">
            {formatUnlockDate(unlockedAt)}
          </span>
        ) : isInProgress ? (
          <span className="achievement-card__status">In progress</span>
        ) : isHidden ? (
          <span className="achievement-card__status">???</span>
        ) : (
          <span className="achievement-card__status">Locked</span>
        )}
      </div>
    </article>
  );
}
