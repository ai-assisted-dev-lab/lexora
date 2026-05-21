import type { AchievementCategory } from "./types";

/**
 * Static UI filter list. The set of categories is part of the product
 * spec, not data — adding a new category requires UI + i18n changes.
 */
export const categoryFilters: AchievementCategory[] = [
  "All",
  "Streak",
  "XP",
  "Words",
  "Decks",
  "Accuracy",
  "Weak Words",
  "Pronunciation",
  "Hidden",
];
