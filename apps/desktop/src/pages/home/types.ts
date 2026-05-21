export type DeckTone = "azure" | "cyan" | "mint" | "sky" | "violet";

export interface DeckCardData {
  /** Stable React key — uses the deck slug so the same deck can appear
   * in multiple shelves without colliding. */
  id: string;
  /** Numeric deck id used for navigation to /library/{deckId}. Optional
   * for placeholder data; clicks degrade gracefully when missing. */
  deckId?: number;
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
