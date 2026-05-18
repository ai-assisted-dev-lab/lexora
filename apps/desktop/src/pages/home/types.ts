export type DeckTone = "azure" | "cyan" | "mint" | "sky" | "violet";

export interface DeckCardData {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  pack: string;
  wordCount: number;
  progress: number;
  tone: DeckTone;
  sampleWords: string[];
}

export interface ProgressWidgetItem {
  label: string;
  value: number;
  max: number;
  caption: string;
}

export interface StudyActivityItem {
  day: string;
  cards: number;
}
