type Role = "owner" | "learner";

interface LoginResult {
  userId: number;
  username: string;
  role: Role;
}

interface InvokeArgs {
  [key: string]: unknown;
}

interface ReviewCardStateInput {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview?: string | null;
}

interface ReviewCard {
  id: number;
  userId: number;
  vocabularyItemId: number;
  deckId: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubmitReviewInput {
  sessionId: number;
  reviewCardId: number;
  vocabularyItemId: number;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: string;
  responseTimeMs?: number;
  nextState: ReviewCardStateInput;
}

const SESSION_KEY = "lexora:e2e-session";
const NOW = "2026-01-01T00:00:00Z";

const users: Record<Role, LoginResult> = {
  owner: { userId: 1, username: "owner", role: "owner" },
  learner: { userId: 2, username: "learner", role: "learner" },
};

function tauriError(
  kind: "Unauthorized" | "Validation",
  message: string,
): never {
  throw { kind, message };
}

function readSession(): LoginResult | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as LoginResult) : null;
}

function writeSession(session: LoginResult) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function currentUserId() {
  return readSession()?.userId ?? users.learner.userId;
}

function baseCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: 101,
    userId: currentUserId(),
    vocabularyItemId: 10,
    deckId: null,
    due: NOW,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReview: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function queueItem() {
  return {
    position: 1,
    category: "new",
    card: baseCard(),
    headword: "run",
    partOfSpeech: "verb",
    ipaUk: "/run/",
    ipaUs: "/run/",
    definitionEn: "To move quickly on foot.",
    definitionVi: "chay nhanh bang chan",
    exampleSentenceEn: "She runs every morning.",
    exampleSentenceVi: "Co ay chay moi sang.",
    additionalSenseCount: 0,
  };
}

function smartQueue() {
  return {
    userId: currentUserId(),
    deckId: null,
    mode: "smart_review",
    generatedAt: NOW,
    summary: {
      dueCount: 0,
      weakCount: 0,
      newCount: 1,
      requestedLength: 20,
      returnedLength: 1,
    },
    items: [queueItem()],
  };
}

function studySession() {
  return {
    sessionId: 501,
    userId: currentUserId(),
    deckId: null,
    mode: "flashcard",
    startedAt: NOW,
    endedAt: null,
    totalItems: 1,
    reviewedCount: 0,
    correctCount: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    queue: smartQueue(),
  };
}

function updatedCardFrom(input: SubmitReviewInput): ReviewCard {
  return baseCard({
    id: input.reviewCardId,
    vocabularyItemId: input.vocabularyItemId,
    due: input.nextState.due,
    stability: input.nextState.stability,
    difficulty: input.nextState.difficulty,
    elapsedDays: input.nextState.elapsedDays,
    scheduledDays: input.nextState.scheduledDays,
    learningSteps: input.nextState.learningSteps,
    reps: input.nextState.reps,
    lapses: input.nextState.lapses,
    state: input.nextState.state,
    lastReview: input.nextState.lastReview ?? null,
    updatedAt: input.reviewedAt,
  });
}

function getInput<T>(args: InvokeArgs | undefined): T {
  return args?.input as T;
}

export function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  switch (command) {
    case "get_current_session":
      return Promise.resolve(readSession() as T);

    case "login_user": {
      const username = String(args?.username ?? "");
      const password = String(args?.password ?? "");
      if (
        (username === "owner" || username === "learner") &&
        password === username
      ) {
        const session = users[username];
        writeSession(session);
        return Promise.resolve(session as T);
      }
      return Promise.reject({
        kind: "Unauthorized",
        message: "Invalid credentials",
      });
    }

    case "logout_user":
      window.localStorage.removeItem(SESSION_KEY);
      return Promise.resolve(undefined as T);

    case "get_gamification_summary":
      return Promise.resolve({
        userId: currentUserId(),
        totalXp: 1250,
        level: 4,
        currentLevelXp: 250,
        nextLevelXp: 500,
        xpToNextLevel: 250,
        currentStreak: 5,
        longestStreak: 8,
        todayDate: "2026-01-01",
        dailyGoalCards: 20,
        todayCardsReviewed: 12,
        todayCardsCorrect: 10,
        todayXpEarned: 60,
        todayGoalMet: false,
        weeklyCardsReviewed: 86,
        weeklyXpEarned: 430,
        totalSessions: 14,
        totalCardsReviewed: 240,
        totalCardsCorrect: 210,
        accuracy: 88,
        masteredWords: 64,
        weeklyActivity: [
          {
            date: "2025-12-26",
            cardsReviewed: 8,
            xpEarned: 40,
            goalMet: false,
          },
          {
            date: "2025-12-27",
            cardsReviewed: 14,
            xpEarned: 70,
            goalMet: false,
          },
          {
            date: "2025-12-28",
            cardsReviewed: 20,
            xpEarned: 100,
            goalMet: true,
          },
        ],
      } as T);

    case "evaluate_reminders":
      return Promise.resolve({
        reminders: [],
        newReminders: [],
        dueReviewCount: 0,
        dailyGoalCards: 20,
        todayCardsReviewed: 12,
        currentStreak: 5,
        settings: {
          userId: currentUserId(),
          notificationEnabled: true,
          inAppRemindersEnabled: true,
          dueReviewNotificationsEnabled: true,
          streakNotificationsEnabled: true,
          reminderTime: "08:00",
          reminderDaysOfWeek: "1111111",
          updatedAt: NOW,
        },
        evaluatedAt: NOW,
      } as T);

    case "dismiss_in_app_reminder":
      return Promise.resolve(undefined as T);

    case "list_discover_decks":
      return Promise.resolve({
        decks: [
          {
            id: 1,
            slug: "everyday-actions",
            title: "Everyday Actions",
            description: "Essential daily verbs.",
            level: "beginner",
            wordCount: 15,
            tags: ["verbs"],
            packName: "English Essentials",
            packSlug: "english-essentials-demo",
            installed: true,
          },
        ],
        total: 1,
      } as T);

    case "list_library_decks":
      return Promise.resolve({
        decks: [
          {
            id: 1,
            slug: "everyday-actions",
            title: "Everyday Actions",
            description: "Essential daily verbs.",
            level: "beginner",
            wordCount: 15,
            tags: ["verbs"],
            packName: "English Essentials",
            packSlug: "english-essentials-demo",
            installedAt: NOW,
            masteredCount: 4,
            dueCount: 1,
            accuracy: 88,
            lastStudied: NOW,
            progress: 40,
          },
        ],
        total: 1,
      } as T);

    case "search":
      return Promise.resolve({
        query: String(args?.query ?? ""),
        total: 1,
        elapsedMs: 2,
        groups: [
          {
            resultType: "word",
            label: "Words",
            results: [
              {
                resultType: "word",
                id: 10,
                title: "run",
                subtitle: "verb A1",
                snippet: "chay nhanh bang chan",
                deckTitle: "Everyday Actions",
                packTitle: "English Essentials",
                score: 98,
                route: "/word/10",
              },
            ],
          },
        ],
      } as T);

    case "start_flashcard_session":
    case "start_weak_words_drill":
      return Promise.resolve(studySession() as T);

    case "submit_flashcard_review": {
      const input = getInput<SubmitReviewInput>(args);
      const correct = input.rating === "good" || input.rating === "easy";
      return Promise.resolve({
        session: {
          sessionId: input.sessionId,
          totalItems: 1,
          reviewedCount: 1,
          correctCount: correct ? 1 : 0,
          againCount: input.rating === "again" ? 1 : 0,
          hardCount: input.rating === "hard" ? 1 : 0,
          goodCount: input.rating === "good" ? 1 : 0,
          easyCount: input.rating === "easy" ? 1 : 0,
          endedAt: null,
        },
        card: updatedCardFrom(input),
        rating: input.rating,
        reviewedAt: input.reviewedAt,
      } as T);
    }

    case "complete_study_session":
      return Promise.resolve({
        sessionId: 501,
        userId: currentUserId(),
        deckId: null,
        mode: "flashcard",
        startedAt: NOW,
        endedAt: "2026-01-01T00:02:00Z",
        totalItems: 1,
        reviewedCount: 1,
        correctCount: 1,
        againCount: 0,
        hardCount: 0,
        goodCount: 1,
        easyCount: 0,
        accuracy: 100,
        timeSpentSeconds: 120,
        xpEarned: 10,
        newlyUnlockedAchievements: [],
      } as T);

    case "get_admin_stats":
      if (readSession()?.role !== "owner") {
        tauriError("Unauthorized", "Owner access required");
      }
      return Promise.resolve({
        userCount: 2,
        wordCount: 15,
        deckCount: 3,
        packCount: 1,
      } as T);

    default:
      return Promise.resolve(undefined as T);
  }
}
