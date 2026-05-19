export type LibraryFilter =
  | "All"
  | "In Progress"
  | "Completed"
  | "Weak"
  | "Favorites";

export type InstalledDeckStatus = "completed" | "in-progress";

export type LibraryDeckTone = "azure" | "cyan" | "mint" | "sky" | "violet";

export interface InstalledDeck {
  id: number;
  slug: string;
  title: string;
  description: string;
  level: string;
  wordCount: number;
  progress: number;
  mastery: number;
  masteredCount: number;
  dueCount: number;
  accuracy: number;
  lastStudied: string;
  lastStudiedRank: number;
  status: InstalledDeckStatus;
  favorite: boolean;
  weak: boolean;
  tags: string[];
  tone: LibraryDeckTone;
}
