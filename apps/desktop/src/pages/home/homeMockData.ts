import type {
  DeckCardData,
  ProgressWidgetItem,
  StudyActivityItem,
} from "./types";

export const missionStats = [
  { label: "Due today", value: "24", meta: "FSRS cards waiting" },
  { label: "Weak words", value: "8", meta: "Need another pass" },
  { label: "Streak", value: "12 days", meta: "Best: 21 days" },
  { label: "Mastery", value: "68%", meta: "B1-B2 active decks" },
  { label: "Level", value: "14", meta: "8,420 XP earned" },
];

export const popularDecks: DeckCardData[] = [
  {
    id: "workplace-english",
    title: "Workplace English",
    subtitle: "Meetings, updates, negotiation",
    level: "B2",
    pack: "Career Pack",
    wordCount: 420,
    progress: 72,
    tone: "azure",
    sampleWords: ["briefing", "deadline", "proposal"],
  },
  {
    id: "daily-conversation",
    title: "Daily Conversation",
    subtitle: "Natural phrases for everyday use",
    level: "B1",
    pack: "Fluency Pack",
    wordCount: 360,
    progress: 54,
    tone: "cyan",
    sampleWords: ["actually", "suppose", "meanwhile"],
  },
  {
    id: "academic-reading",
    title: "Academic Reading",
    subtitle: "Essays, reports, research verbs",
    level: "C1",
    pack: "Scholar Pack",
    wordCount: 510,
    progress: 31,
    tone: "sky",
    sampleWords: ["derive", "assumption", "notion"],
  },
];

export const libraryDecks: DeckCardData[] = [
  {
    id: "ielts-core",
    title: "IELTS Core Vocabulary",
    subtitle: "High-frequency IELTS themes",
    level: "B2",
    pack: "Exam Pack",
    wordCount: 640,
    progress: 81,
    tone: "azure",
    sampleWords: ["substantial", "policy", "trend"],
  },
  {
    id: "phrasal-verbs",
    title: "Phrasal Verbs in Context",
    subtitle: "Meaning through examples",
    level: "B1",
    pack: "Grammar Pack",
    wordCount: 280,
    progress: 47,
    tone: "mint",
    sampleWords: ["carry out", "bring up", "look into"],
  },
  {
    id: "business-email",
    title: "Business Email Toolkit",
    subtitle: "Professional tone and clarity",
    level: "B2",
    pack: "Career Pack",
    wordCount: 220,
    progress: 63,
    tone: "violet",
    sampleWords: ["regarding", "confirm", "attach"],
  },
];

export const recommendedDecks: DeckCardData[] = [
  {
    id: "news-english",
    title: "News English Essentials",
    subtitle: "Politics, economy, climate",
    level: "C1",
    pack: "Reading Pack",
    wordCount: 390,
    progress: 18,
    tone: "sky",
    sampleWords: ["summit", "inflation", "forecast"],
  },
  {
    id: "travel-vietnamese",
    title: "English for Travel Hosts",
    subtitle: "Hospitality and local guidance",
    level: "B1",
    pack: "Travel Pack",
    wordCount: 260,
    progress: 26,
    tone: "cyan",
    sampleWords: ["itinerary", "reservation", "landmark"],
  },
  {
    id: "pronunciation-minimal-pairs",
    title: "Pronunciation Minimal Pairs",
    subtitle: "Sounds Vietnamese learners mix up",
    level: "B1",
    pack: "Speaking Pack",
    wordCount: 180,
    progress: 39,
    tone: "mint",
    sampleWords: ["ship", "sheep", "cheap"],
  },
];

export const progressItems: ProgressWidgetItem[] = [
  { label: "Daily goal", value: 16, max: 20, caption: "16 of 20 reviews" },
  { label: "Weekly XP", value: 1840, max: 2500, caption: "660 XP to target" },
  {
    label: "Mastered words",
    value: 812,
    max: 1200,
    caption: "812 / 1,200 words",
  },
];

export const studyActivity: StudyActivityItem[] = [
  { day: "Mon", cards: 18 },
  { day: "Tue", cards: 24 },
  { day: "Wed", cards: 21 },
  { day: "Thu", cards: 30 },
  { day: "Fri", cards: 16 },
  { day: "Sat", cards: 28 },
  { day: "Sun", cards: 12 },
];

export const featuredDeck = popularDecks[0];
