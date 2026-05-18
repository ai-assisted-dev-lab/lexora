export type AchievementCategory =
  | "All"
  | "Streak"
  | "XP"
  | "Words"
  | "Decks"
  | "Accuracy"
  | "Weak Words"
  | "Pronunciation"
  | "Hidden";

export type AchievementState = "unlocked" | "locked" | "in_progress" | "hidden";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: Exclude<AchievementCategory, "All">;
  state: AchievementState;
  tier: AchievementTier;
  xpReward: number;
  unlockedAt?: string;
  progress?: number;
  progressLabel?: string;
  iconName: string;
}
