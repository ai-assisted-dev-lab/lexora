import {
  Brain,
  ClipboardCheck,
  Keyboard,
  Layers3,
  RotateCcw,
} from "lucide-react";

import type { DeckDetailMock } from "./types";

export const deckDetailMock: DeckDetailMock = {
  achievements: [
    {
      description: "Finish the first 100 cards in this deck.",
      title: "First Sprint",
    },
    {
      description: "Reach 80% mastery across active words.",
      title: "Confident Speaker",
    },
    {
      description: "Review this deck for seven separate days.",
      title: "Steady Routine",
    },
  ],
  description:
    "A focused English-Vietnamese deck for IELTS speaking answers: opinion verbs, linking phrases, topic vocabulary, and natural collocations for longer responses.",
  level: "B2-C1",
  progress: [
    { label: "Deck progress", value: 64 },
    { label: "Mastery", value: 72 },
    { label: "Pronunciation coverage", value: 88 },
    { label: "Weak words cleared", value: 43 },
  ],
  rating: 4.7,
  reviewCount: 128,
  reviews: [
    {
      author: "Minh Anh",
      comment:
        "The topic phrases feel practical and the Vietnamese explanations make review faster.",
      rating: 4.8,
    },
    {
      author: "Quang",
      comment:
        "Good for Part 2 answers because the examples show how to extend a point clearly.",
      rating: 4.6,
    },
  ],
  studyModes: [
    {
      description:
        "Use due cards and mock FSRS states to prioritize retention.",
      estimate: "18 due",
      Icon: Brain,
      title: "Smart Review",
    },
    {
      description: "Flip through words, meanings, IPA, and example sentences.",
      estimate: "12 min",
      Icon: RotateCcw,
      title: "Flashcards",
    },
    {
      description: "Practice recognition with fast answer choices.",
      estimate: "20 questions",
      Icon: ClipboardCheck,
      title: "Multiple Choice",
    },
    {
      description: "Type the English phrase from Vietnamese prompts.",
      estimate: "15 prompts",
      Icon: Keyboard,
      title: "Type Answer",
    },
    {
      description: "Target low-mastery phrases and recent lapses.",
      estimate: "37 weak",
      Icon: Layers3,
      title: "Weak Words Drill",
    },
  ],
  tags: ["IELTS", "Speaking", "Fluency", "Collocations"],
  title: "IELTS Speaking Core",
  topic: "Exam Speaking",
  wordCount: 860,
  words: [
    {
      definitionVi: "mở rộng, trình bày chi tiết",
      dueState: "Due today",
      example: "You should elaborate on your answer with a personal example.",
      headword: "elaborate",
      level: "B2",
      partOfSpeech: "verb",
    },
    {
      definitionVi: "rất quan trọng, cần thiết",
      dueState: "Learning",
      example: "A clear structure is crucial in a long speaking response.",
      headword: "crucial",
      level: "B2",
      partOfSpeech: "adjective",
    },
    {
      definitionVi: "quan điểm, góc nhìn",
      dueState: "Mastered",
      example:
        "From my perspective, public transport should be improved first.",
      headword: "perspective",
      level: "B2",
      partOfSpeech: "noun",
    },
    {
      definitionVi: "làm rõ, giải thích rõ hơn",
      dueState: "Due today",
      example: "Let me clarify what I mean by a balanced lifestyle.",
      headword: "clarify",
      level: "B1",
      partOfSpeech: "verb",
    },
  ],
};
