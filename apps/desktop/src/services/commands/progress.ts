import { invoke } from "@/services/tauri";

export interface DailyProgressPointDto {
  date: string;
  cardsReviewed: number;
  xpEarned: number;
  goalMet: boolean;
}

export interface GamificationSummaryDto {
  userId: number;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  todayDate: string;
  dailyGoalCards: number;
  todayCardsReviewed: number;
  todayCardsCorrect: number;
  todayXpEarned: number;
  todayGoalMet: boolean;
  weeklyCardsReviewed: number;
  weeklyXpEarned: number;
  totalSessions: number;
  totalCardsReviewed: number;
  totalCardsCorrect: number;
  accuracy: number;
  masteredWords: number;
  weeklyActivity: DailyProgressPointDto[];
}

export function getGamificationSummary(): Promise<GamificationSummaryDto> {
  return invoke<GamificationSummaryDto>("get_gamification_summary");
}
