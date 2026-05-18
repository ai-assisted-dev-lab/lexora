export type StudyMode = "Flashcard" | "Multiple Choice" | "Type Answer";

export type RatingLabel = "Again" | "Hard" | "Good" | "Easy";

export interface MockStudyItem {
  id: string;
  mode: StudyMode;
  prompt: string;
  answer: string;
  example: string;
  choices: string[];
}
