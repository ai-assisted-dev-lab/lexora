export interface WeeklyDataPoint {
  day: string;
  words: number;
}

export interface MasteryLevel {
  label: string;
  count: number;
  color: string;
}

export interface WeakTopic {
  topic: string;
  deck: string;
  accuracy: number;
  count: number;
}

export const summaryStats = {
  streak: 10,
  streakBest: 14,
  xpToday: 240,
  xpLevel: 8,
  xpCurrent: 1860,
  xpNextLevel: 2500,
  accuracy: 87,
  accuracySessions: 7,
  mastered: 320,
  masteredOf: 650,
};

export const weeklyActivity: WeeklyDataPoint[] = [
  { day: "Mon", words: 42 },
  { day: "Tue", words: 58 },
  { day: "Wed", words: 31 },
  { day: "Thu", words: 74 },
  { day: "Fri", words: 65 },
  { day: "Sat", words: 48 },
  { day: "Sun", words: 22 },
];

export const weeklyTotal = weeklyActivity.reduce((s, d) => s + d.words, 0);

export const masteryDistribution: MasteryLevel[] = [
  { label: "Mastered", count: 320, color: "#15803d" },
  { label: "Reviewing", count: 180, color: "#2563eb" },
  { label: "Learning", count: 95, color: "#0891b2" },
  { label: "New", count: 55, color: "#94a3b8" },
];

export const masteryTotal = masteryDistribution.reduce((s, l) => s + l.count, 0);

export const weakTopics: WeakTopic[] = [
  {
    topic: "Academic Verbs",
    deck: "IELTS Band 7 Lexis",
    accuracy: 62,
    count: 45,
  },
  {
    topic: "Pronunciation: /θ/ vs /t/",
    deck: "Pronunciation Pack",
    accuracy: 68,
    count: 22,
  },
  {
    topic: "Business Negotiations",
    deck: "Business Negotiation",
    accuracy: 71,
    count: 38,
  },
  {
    topic: "Phrasal Verbs",
    deck: "Daily English Foundation",
    accuracy: 73,
    count: 61,
  },
  {
    topic: "Science Terminology",
    deck: "Science News Reader",
    accuracy: 76,
    count: 29,
  },
];
