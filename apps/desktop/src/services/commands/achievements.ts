import { invoke } from "@tauri-apps/api/core";

import type { Achievement } from "@/pages/achievements/types";

export interface AchievementUnlockDto {
  slug: string;
  title: string;
  description: string;
  category: Achievement["category"];
  tier: Achievement["tier"];
  xpReward: number;
  iconName: string;
  unlockedAt: string;
  hidden: boolean;
}

export interface AchievementsPageDto {
  achievements: Achievement[];
  total: number;
  unlocked: number;
  inProgress: number;
  hiddenLocked: number;
}

export function getAchievements(): Promise<AchievementsPageDto> {
  return invoke<AchievementsPageDto>("get_achievements");
}

export function recordPronunciationPractice(): Promise<AchievementUnlockDto[]> {
  return invoke<AchievementUnlockDto[]>("record_pronunciation_practice");
}
