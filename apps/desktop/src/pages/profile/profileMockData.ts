export interface ActivityEntry {
  date: string;
  deck: string;
  wordsReviewed: number;
  accuracy: number;
  xpEarned: number;
}

export interface ShowcaseAchievement {
  title: string;
  category: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  iconName: string;
}

export const userProfile = {
  displayName: "Minh Quân",
  initials: "MQ",
  joinedDate: "March 2026",
  level: 8,
  xp: 1860,
  xpNextLevel: 2500,
  currentStreak: 10,
  longestStreak: 14,
  totalXP: 9840,
  masteredWords: 320,
  totalSessions: 47,
};

export const favoriteDeck = {
  title: "IELTS Band 7 Lexis",
  level: "B2",
  progressPct: 64,
  wordsStudied: 435,
  totalWords: 680,
  sessionsCount: 23,
};

export const showcaseAchievements: ShowcaseAchievement[] = [
  { title: "Week Warrior", category: "Streak", tier: "silver", iconName: "Flame" },
  { title: "Sharp Eye", category: "Accuracy", tier: "silver", iconName: "Target" },
  { title: "Century", category: "Words", tier: "bronze", iconName: "BookOpen" },
];

export const recentActivity: ActivityEntry[] = [
  {
    date: "2026-05-19",
    deck: "IELTS Band 7 Lexis",
    wordsReviewed: 22,
    accuracy: 91,
    xpEarned: 110,
  },
  {
    date: "2026-05-18",
    deck: "Daily English Foundation",
    wordsReviewed: 18,
    accuracy: 83,
    xpEarned: 85,
  },
  {
    date: "2026-05-17",
    deck: "IELTS Band 7 Lexis",
    wordsReviewed: 31,
    accuracy: 88,
    xpEarned: 130,
  },
  {
    date: "2026-05-15",
    deck: "Pronunciation Minimal Pairs",
    wordsReviewed: 14,
    accuracy: 72,
    xpEarned: 60,
  },
  {
    date: "2026-05-14",
    deck: "IELTS Band 7 Lexis",
    wordsReviewed: 25,
    accuracy: 94,
    xpEarned: 145,
  },
];
