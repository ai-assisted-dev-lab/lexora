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

const discoverDecks = [
  {
    id: 1,
    slug: "everyday-actions",
    title: "Everyday Actions",
    description: "Core verbs and routines for daily conversation.",
    level: "A1",
    wordCount: 320,
    tags: ["A1", "verbs", "daily"],
    packName: "English Essentials",
    packSlug: "english-essentials-demo",
    installed: true,
  },
  {
    id: 2,
    slug: "workplace-english",
    title: "Workplace English",
    description: "Meetings, deadlines, feedback, and office collaboration.",
    level: "B1",
    wordCount: 480,
    tags: ["B1", "work", "speaking"],
    packName: "Professional English",
    packSlug: "professional-english",
    installed: true,
  },
  {
    id: 3,
    slug: "academic-reading",
    title: "Academic Reading",
    description: "High-frequency vocabulary for essays and research papers.",
    level: "B2",
    wordCount: 560,
    tags: ["B2", "academic", "reading"],
    packName: "Exam Prep",
    packSlug: "exam-prep",
    installed: false,
  },
  {
    id: 4,
    slug: "travel-situations",
    title: "Travel Situations",
    description: "Airport, hotel, directions, and emergency phrases.",
    level: "A2",
    wordCount: 260,
    tags: ["A2", "travel", "phrases"],
    packName: "English Essentials",
    packSlug: "english-essentials-demo",
    installed: true,
  },
  {
    id: 5,
    slug: "technology-terms",
    title: "Technology Terms",
    description: "Software, devices, security, and product vocabulary.",
    level: "B1",
    wordCount: 420,
    tags: ["B1", "technology", "work"],
    packName: "Professional English",
    packSlug: "professional-english",
    installed: false,
  },
  {
    id: 6,
    slug: "ielts-topic-builder",
    title: "IELTS Topic Builder",
    description: "Topic families for speaking and writing practice.",
    level: "B2",
    wordCount: 640,
    tags: ["B2", "exam", "speaking"],
    packName: "Exam Prep",
    packSlug: "exam-prep",
    installed: false,
  },
];

const libraryDecks = discoverDecks
  .filter((deck) => deck.installed)
  .map((deck, index) => ({
    ...deck,
    installedAt: NOW,
    masteredCount: [126, 92, 74][index] ?? 20,
    dueCount: [18, 9, 6][index] ?? 3,
    accuracy: [88, 81, 72][index] ?? 70,
    lastStudied:
      index === 0
        ? "2026-01-01T07:20:00Z"
        : index === 1
          ? "2025-12-31T09:15:00Z"
          : "2025-12-28T13:00:00Z",
    progress: [58, 42, 35][index] ?? 25,
  }));

const adminVocabularyItems = [
  {
    id: 10,
    headword: "run",
    type: "word",
    partOfSpeech: "verb",
    cefrLevel: "A1",
    primaryVietnameseMeaning: "chay nhanh bang chan",
    primaryEnglishDefinition: "To move quickly on foot.",
    reviewStatus: "verified",
    missing: {
      meaning: false,
      definition: false,
      example: false,
      ipa: false,
      audio: false,
    },
    deckCount: 2,
    updatedAt: NOW,
  },
  {
    id: 11,
    headword: "deadline",
    type: "word",
    partOfSpeech: "noun",
    cefrLevel: "B1",
    primaryVietnameseMeaning: "han chot",
    primaryEnglishDefinition: "A time or date by which work must be finished.",
    reviewStatus: "verified",
    missing: {
      meaning: false,
      definition: false,
      example: false,
      ipa: false,
      audio: true,
    },
    deckCount: 1,
    updatedAt: "2025-12-30T10:20:00Z",
  },
  {
    id: 12,
    headword: "make progress",
    type: "phrase",
    partOfSpeech: "phrase",
    cefrLevel: "B1",
    primaryVietnameseMeaning: "tien bo",
    primaryEnglishDefinition: "To improve or move closer to a goal.",
    reviewStatus: "needs_review",
    missing: {
      meaning: false,
      definition: false,
      example: false,
      ipa: true,
      audio: true,
    },
    deckCount: 2,
    updatedAt: "2025-12-29T11:40:00Z",
  },
  {
    id: 13,
    headword: "boarding pass",
    type: "phrase",
    partOfSpeech: "noun phrase",
    cefrLevel: "A2",
    primaryVietnameseMeaning: "the len may bay",
    primaryEnglishDefinition: "A document that allows a passenger onto a plane.",
    reviewStatus: "unverified",
    missing: {
      meaning: false,
      definition: false,
      example: true,
      ipa: true,
      audio: true,
    },
    deckCount: 1,
    updatedAt: "2025-12-27T08:05:00Z",
  },
];

function requireOwner() {
  if (readSession()?.role !== "owner") {
    tauriError("Unauthorized", "Owner access required");
  }
}

function paginate<T>(items: T[], args: InvokeArgs | undefined) {
  const input = (args?.input ?? {}) as {
    page?: number;
    pageSize?: number;
    search?: string;
  };
  const page = Math.max(1, Number(input.page ?? 1));
  const pageSize = Math.max(1, Number(input.pageSize ?? 25));
  const search = String(input.search ?? "").trim().toLowerCase();
  const filtered = search
    ? items.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search),
      )
    : items;
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

function dataQualitySummary() {
  return {
    totalIssues: 6,
    bySeverity: { critical: 0, high: 2, medium: 3, low: 1 },
    byCategory: { missing_field: 4, duplicate: 1, broken_reference: 1 },
    byEntityType: { vocabulary_item: 5, deck: 1 },
    topIssueTypes: [
      { issueType: "missing_audio", label: "Missing audio", count: 3 },
      { issueType: "missing_ipa", label: "Missing IPA", count: 2 },
    ],
    lastScanTime: NOW,
    scannedEntityCounts: {
      vocabularyItems: 50000,
      senses: 62000,
      pronunciations: 44000,
      decks: 120,
      deckItems: 90000,
      relations: 8000,
      assets: 43000,
    },
    quickCounts: {
      critical: 0,
      high: 2,
      missingMeanings: 1,
      missingIpaAudio: 5,
      duplicates: 1,
      unverifiedEntries: 18,
    },
  };
}

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
          {
            date: "2025-12-29",
            cardsReviewed: 16,
            xpEarned: 80,
            goalMet: false,
          },
          {
            date: "2025-12-30",
            cardsReviewed: 22,
            xpEarned: 110,
            goalMet: true,
          },
          {
            date: "2025-12-31",
            cardsReviewed: 18,
            xpEarned: 90,
            goalMet: false,
          },
          {
            date: "2026-01-01",
            cardsReviewed: 12,
            xpEarned: 60,
            goalMet: false,
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
        decks: discoverDecks,
        total: discoverDecks.length,
      } as T);

    case "list_library_decks":
      return Promise.resolve({
        decks: libraryDecks,
        total: libraryDecks.length,
      } as T);

    case "get_deck_detail": {
      const deckId = Number(args?.deckId ?? 1);
      const deck =
        libraryDecks.find((item) => item.id === deckId) ?? libraryDecks[0];
      return Promise.resolve({
        id: deck.id,
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        level: deck.level,
        wordCount: deck.wordCount,
        tags: deck.tags,
        packName: deck.packName,
        packSlug: deck.packSlug,
        banner: null,
        installed: true,
        installedAt: deck.installedAt,
        progress: {
          masteredCount: deck.masteredCount,
          dueCount: deck.dueCount,
          accuracy: deck.accuracy,
          lastStudied: deck.lastStudied,
          progress: deck.progress,
        },
        words: [
          {
            id: 10,
            headword: "run",
            partOfSpeech: "verb",
            level: "A1",
            definitionEn: "To move quickly on foot.",
            definitionVi: "chay nhanh bang chan",
            example: "She runs every morning.",
            dueState: "Due today",
          },
          {
            id: 11,
            headword: "deadline",
            partOfSpeech: "noun",
            level: "B1",
            definitionEn:
              "A time or date by which work must be finished.",
            definitionVi: "han chot",
            example: "The report deadline is Friday.",
            dueState: "Learning",
          },
        ],
      } as T);
    }

    case "get_word_detail":
      return Promise.resolve({
        id: 10,
        headword: "run",
        partOfSpeech: "verb",
        ipaUk: "/run/",
        ipaUs: "/run/",
        frequencyRank: 452,
        cefrLevel: "A1",
        packName: "English Essentials",
        packSlug: "english-essentials-demo",
        senses: [
          {
            id: 1001,
            senseIndex: 0,
            definitionEn: "To move quickly on foot.",
            definitionVi: "chay nhanh bang chan",
            register: "common",
            domain: "daily actions",
            examples: [
              {
                id: 5001,
                sentenceEn: "She runs every morning before work.",
                sentenceVi: "Co ay chay moi sang truoc khi di lam.",
                audioPath: null,
              },
              {
                id: 5002,
                sentenceEn: "The children ran across the park.",
                sentenceVi: "Nhung dua tre chay qua cong vien.",
                audioPath: null,
              },
            ],
          },
          {
            id: 1002,
            senseIndex: 1,
            definitionEn: "To manage or operate something.",
            definitionVi: "quan ly hoac dieu hanh mot viec gi do",
            register: "business",
            domain: "work",
            examples: [
              {
                id: 5003,
                sentenceEn: "Mina runs a small language school.",
                sentenceVi: "Mina dieu hanh mot trung tam ngon ngu nho.",
                audioPath: null,
              },
            ],
          },
        ],
        pronunciations: [
          {
            id: 7001,
            dialect: "us",
            audioPath: "audio/run-us.mp3",
            ttsEngine: "local",
          },
          {
            id: 7002,
            dialect: "uk",
            audioPath: "audio/run-uk.mp3",
            ttsEngine: "local",
          },
        ],
        relations: [
          {
            id: 9001,
            relationType: "synonym",
            wordId: 20,
            headword: "jog",
          },
          {
            id: 9002,
            relationType: "related",
            wordId: 21,
            headword: "race",
          },
        ],
        reviewState: {
          state: "review",
          due: "2026-01-02T00:00:00Z",
          reps: 9,
          lapses: 1,
          lastReview: "2026-01-01T07:22:00Z",
        },
        reviewHistory: [
          {
            id: 3001,
            rating: 3,
            result: "correct",
            mode: "flashcard",
            reviewedAt: "2026-01-01T07:22:00Z",
          },
          {
            id: 3002,
            rating: 4,
            result: "correct",
            mode: "multiple_choice",
            reviewedAt: "2025-12-31T09:11:00Z",
          },
        ],
      } as T);

    case "get_pronunciation_settings":
      return Promise.resolve({
        userId: currentUserId(),
        audioAutoplay: true,
        pronunciationAccent: "us",
        pronunciationSpeed: 1,
        audioPriority: "local_first",
        audioFallbackBehavior: "browser_tts",
        updatedAt: NOW,
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

    case "get_achievements": {
      const achievements = [
        {
          id: "streak-1",
          title: "First Steps",
          description: "Study for 3 consecutive days.",
          category: "Streak",
          state: "unlocked",
          tier: "bronze",
          xpReward: 50,
          unlockedAt: "2026-01-01",
          iconName: "Flame",
        },
        {
          id: "xp-2",
          title: "Rising Learner",
          description: "Accumulate 1,000 total XP.",
          category: "XP",
          state: "unlocked",
          tier: "silver",
          xpReward: 150,
          unlockedAt: "2025-12-31",
          iconName: "Zap",
        },
        {
          id: "words-3",
          title: "Vocabulary Builder",
          description: "Master 500 words across all installed decks.",
          category: "Words",
          state: "in_progress",
          tier: "silver",
          xpReward: 300,
          progress: 64,
          progressLabel: "320 / 500 words",
          iconName: "BookOpen",
        },
        {
          id: "accuracy-2",
          title: "Flawless",
          description: "Achieve 100% accuracy in a complete review session.",
          category: "Accuracy",
          state: "locked",
          tier: "gold",
          xpReward: 400,
          iconName: "Target",
        },
      ];
      return Promise.resolve({
        achievements,
        total: achievements.length,
        unlocked: 2,
        inProgress: 1,
        hiddenLocked: 0,
      } as T);
    }

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
      requireOwner();
      return Promise.resolve({
        userCount: 2,
        wordCount: 50000,
        deckCount: 3,
        packCount: 3,
      } as T);

    case "admin_list_vocabulary":
      requireOwner();
      return Promise.resolve(paginate(adminVocabularyItems, args) as T);

    case "admin_get_vocabulary_item": {
      requireOwner();
      const input = (args?.input ?? {}) as { id?: number };
      const id = Number(input.id ?? 10);
      const item =
        adminVocabularyItems.find((entry) => entry.id === id) ??
        adminVocabularyItems[0];
      return Promise.resolve({
        id: item.id,
        headword: item.headword,
        type: item.type,
        partOfSpeech: item.partOfSpeech,
        cefrLevel: item.cefrLevel,
        ipaUk: item.id === 10 ? "/run/" : null,
        ipaUs: item.id === 10 ? "/run/" : null,
        reviewStatus: item.reviewStatus,
        frequencyRank: item.id === 10 ? 452 : null,
        packName: "English Essentials",
        deckCount: item.deckCount,
        primaryDefinitionEn: item.primaryEnglishDefinition,
        primaryDefinitionVi: item.primaryVietnameseMeaning,
        primaryExampleEn:
          item.id === 10 ? "She runs every morning before work." : null,
        primaryExampleVi:
          item.id === 10 ? "Co ay chay moi sang truoc khi di lam." : null,
        primaryAudioPath: item.id === 10 ? "audio/run-us.mp3" : null,
        senseCount: item.id === 10 ? 2 : 1,
        exampleCount: item.id === 10 ? 3 : 0,
        pronunciationCount: item.id === 10 ? 2 : 0,
        createdAt: "2025-12-01T00:00:00Z",
        updatedAt: item.updatedAt,
      } as T);
    }

    case "admin_update_vocabulary_item":
      requireOwner();
      return invoke<T>("admin_get_vocabulary_item", {
        input: {
          id: ((args?.input ?? {}) as { id?: number }).id,
        },
      });

    case "admin_list_decks":
      requireOwner();
      return Promise.resolve(
        paginate(
          libraryDecks.map((deck) => ({
            id: deck.id,
            slug: deck.slug,
            name: deck.title,
            description: deck.description,
            difficulty: deck.level,
            wordCount: deck.wordCount,
            actualWordCount: deck.wordCount - (deck.id === 4 ? 3 : 0),
            hasCover: true,
            packName: deck.packName,
            updatedAt: deck.lastStudied ?? NOW,
          })),
          args,
        ) as T,
      );

    case "admin_get_data_quality_summary":
      requireOwner();
      return Promise.resolve(dataQualitySummary() as T);

    case "admin_list_data_quality_issues":
      requireOwner();
      return Promise.resolve(
        paginate(
          [
            {
              id: "issue-1",
              severity: "high",
              category: "missing_field",
              entityType: "vocabulary_item",
              entityId: "12",
              entityLabel: "make progress",
              field: "ipa",
              message: "Primary phrase is missing IPA metadata.",
              recommendation: "Add IPA or mark pronunciation unavailable.",
              canAutoFix: false,
              createdAt: NOW,
              navigationTarget: {
                targetType: "vocabulary_item",
                targetId: "12",
                label: "Open word",
              },
            },
          ],
          args,
        ) as T,
      );

    case "admin_run_data_quality_scan":
      requireOwner();
      return Promise.resolve({
        issues: [],
        returnedIssues: 0,
        totalIssues: 6,
        summary: dataQualitySummary(),
        scannedAt: NOW,
      } as T);

    default:
      return Promise.resolve(undefined as T);
  }
}
