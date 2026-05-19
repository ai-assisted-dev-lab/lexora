import { invoke } from "@/services/tauri";

import type { DailyProgressPointDto } from "./progress";

export interface MasteryDistributionDto {
  newCount: number;
  learningCount: number;
  reviewingCount: number;
  masteredCount: number;
  total: number;
}

export interface WeakWordDto {
  word: string;
  deckName: string;
  totalReviews: number;
  accuracy: number;
}

export interface DeckBreakdownDto {
  deckName: string;
  wordsReviewed: number;
  accuracy: number;
  totalReviews: number;
}

export interface AnalyticsDto {
  mastery: MasteryDistributionDto;
  weakWords: WeakWordDto[];
  deckBreakdown: DeckBreakdownDto[];
  monthlyActivity: DailyProgressPointDto[];
}

export function getAnalytics(): Promise<AnalyticsDto> {
  return invoke<AnalyticsDto>("get_analytics");
}
