import type { LucideIcon } from "lucide-react";

export interface StudyMode {
  title: string;
  description: string;
  estimate: string;
  Icon: LucideIcon;
}

export interface PreviewWord {
  headword: string;
  partOfSpeech: string;
  level: string;
  definitionVi: string;
  example: string;
  dueState: "Due today" | "Learning" | "Mastered";
}

export interface DeckProgressItem {
  label: string;
  value: number;
}

export interface DeckAchievement {
  title: string;
  description: string;
}

export interface DeckReview {
  author: string;
  rating: number;
  comment: string;
}

export interface DeckDetailMock {
  title: string;
  description: string;
  level: string;
  topic: string;
  wordCount: number;
  tags: string[];
  rating: number;
  reviewCount: number;
  studyModes: StudyMode[];
  words: PreviewWord[];
  progress: DeckProgressItem[];
  achievements: DeckAchievement[];
  reviews: DeckReview[];
}
