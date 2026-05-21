import "./home/HomePage.css";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState, StatCard } from "@/components/ui";
import { useDiscoverDecks } from "@/hooks/useDiscoverDecks";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";
import { useLibraryDecks } from "@/hooks/useLibraryDecks";
import type {
  DiscoverDeckDto,
  LibraryDeckDto,
} from "@/services/commands/decks";
import type {
  DailyProgressPointDto,
  GamificationSummaryDto,
} from "@/services/commands/progress";

import { DeckShelf } from "./home/DeckShelf";
import {
  FeaturedDeckWidget,
  ProgressWidget,
  StudyActivityWidget,
} from "./home/ProgressWidget";
import type {
  DeckCardData,
  DeckTone,
  ProgressWidgetItem,
  StudyActivityItem,
} from "./home/types";

const statIcons = [Target, Sparkles, Flame, GraduationCap, Zap];
const deckTones: DeckTone[] = ["azure", "cyan", "mint", "sky", "violet"];
const CEFR_TAGS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

function shortWeekday(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function fallbackSampleWords(tags: string[]): string[] {
  return tags.filter((tag) => !CEFR_TAGS.has(tag)).slice(0, 3);
}

function toDeckCard(
  deck: DiscoverDeckDto | LibraryDeckDto,
  index: number,
  progress = "progress" in deck ? deck.progress : 0,
): DeckCardData {
  const samples =
    deck.sampleWords && deck.sampleWords.length > 0
      ? deck.sampleWords
      : fallbackSampleWords(deck.tags);

  return {
    id: deck.slug,
    deckId: deck.id,
    title: deck.title,
    subtitle: deck.description ?? "Curated local vocabulary deck.",
    level: deck.level ?? "New",
    pack: deck.packName,
    wordCount: deck.wordCount,
    progress,
    tone: deckTones[index % deckTones.length],
    sampleWords: samples.length > 0 ? samples : [deck.slug],
  };
}

function buildMissionStats(
  gamification: GamificationSummaryDto | null,
): { label: string; value: string; meta: string }[] {
  if (!gamification) {
    return [
      { label: "Daily goal", value: "—", meta: "Loading…" },
      { label: "Week reviews", value: "—", meta: "Loading…" },
      { label: "Streak", value: "—", meta: "Loading…" },
      { label: "Accuracy", value: "—", meta: "Loading…" },
      { label: "Level", value: "—", meta: "Loading…" },
    ];
  }
  const dailyGoal = gamification.dailyGoalCards;
  const todayCards = gamification.todayCardsReviewed;
  return [
    {
      label: "Daily goal",
      value: `${Math.min(todayCards, dailyGoal)} / ${dailyGoal}`,
      meta: gamification.todayGoalMet ? "Goal complete" : "Reviews today",
    },
    {
      label: "Week reviews",
      value: gamification.weeklyCardsReviewed.toLocaleString(),
      meta: `${gamification.weeklyXpEarned.toLocaleString()} XP this week`,
    },
    {
      label: "Streak",
      value: `${gamification.currentStreak} days`,
      meta: `Best: ${gamification.longestStreak} days`,
    },
    {
      label: "Accuracy",
      value: `${gamification.accuracy}%`,
      meta: `${gamification.totalCardsReviewed.toLocaleString()} cards reviewed`,
    },
    {
      label: "Level",
      value: gamification.level.toString(),
      meta: `${gamification.totalXp.toLocaleString()} XP earned`,
    },
  ];
}

function buildProgressItems(
  gamification: GamificationSummaryDto | null,
): ProgressWidgetItem[] {
  if (!gamification) {
    return [
      { label: "Daily goal", value: 0, max: 1, caption: "Loading…" },
      { label: "Level XP", value: 0, max: 1, caption: "Loading…" },
      { label: "Mastered words", value: 0, max: 1, caption: "Loading…" },
    ];
  }
  const dailyGoal = gamification.dailyGoalCards;
  const todayCards = gamification.todayCardsReviewed;
  return [
    {
      label: "Daily goal",
      value: todayCards,
      max: dailyGoal,
      caption: `${Math.min(todayCards, dailyGoal)} of ${dailyGoal} reviews`,
    },
    {
      label: "Level XP",
      value: gamification.currentLevelXp,
      max: Math.max(gamification.nextLevelXp, 1),
      caption: `${gamification.xpToNextLevel.toLocaleString()} XP to next`,
    },
    {
      label: "Mastered words",
      value: gamification.masteredWords,
      max: Math.max(
        gamification.masteredWords,
        gamification.totalCardsReviewed,
        1,
      ),
      caption: `${gamification.masteredWords.toLocaleString()} mastered`,
    },
  ];
}

function buildStudyActivity(
  activity: DailyProgressPointDto[] | undefined,
): StudyActivityItem[] {
  if (!activity?.length) {
    return [];
  }
  return activity.map((day) => ({
    day: shortWeekday(day.date),
    cards: day.cardsReviewed,
  }));
}

interface DeckShelfSlotProps {
  title: string;
  description: string;
  decks: DeckCardData[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; to: string };
}

function DeckShelfSlot(props: DeckShelfSlotProps) {
  const {
    decks,
    description,
    emptyAction,
    emptyDescription,
    emptyTitle,
    isLoading,
    title,
  } = props;
  if (!isLoading && decks.length === 0) {
    return (
      <section className="home-shelf" aria-label={title}>
        <EmptyState
          icon={<Compass size={28} aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            emptyAction ? (
              <Button asChild variant="primary">
                <Link to={emptyAction.to}>{emptyAction.label}</Link>
              </Button>
            ) : undefined
          }
        />
      </section>
    );
  }
  return <DeckShelf title={title} description={description} decks={decks} />;
}

export function HomePage() {
  const gamification = useGamificationSummary();
  const discover = useDiscoverDecks();
  const library = useLibraryDecks();

  const livePopularDecks = useMemo(
    () =>
      discover.decks.slice(0, 3).map((deck, index) => toDeckCard(deck, index)),
    [discover.decks],
  );

  const liveLibraryDecks = useMemo(
    () =>
      library.decks.slice(0, 3).map((deck, index) => toDeckCard(deck, index)),
    [library.decks],
  );

  const liveRecommendedDecks = useMemo(() => {
    if (discover.decks.length === 0) return [];
    const source = discover.decks.filter((deck) => !deck.installed);
    return (source.length > 0 ? source : discover.decks)
      .slice(0, 3)
      .map((deck, index) => toDeckCard(deck, index));
  }, [discover.decks]);

  const liveFeaturedDeck = liveLibraryDecks[0] ?? livePopularDecks[0] ?? null;
  const missionStats = buildMissionStats(gamification);
  const progressItems = buildProgressItems(gamification);
  const studyActivity = buildStudyActivity(gamification?.weeklyActivity);

  const weeklyCardsText = gamification
    ? `You reviewed ${gamification.weeklyCardsReviewed.toLocaleString()} cards this week. Start with your highest-impact review queue.`
    : "Start with your highest-impact review queue and build today's progress.";

  return (
    <motion.div
      className="home-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="home-page__main">
        <Card className="home-hero" variant="hero">
          <div className="home-hero__content">
            <p className="home-hero__eyebrow">Today&apos;s Mission</p>
            <h2>Expand words. Expand your world.</h2>
            <p className="home-hero__subtitle">
              Review the words due today, unlock stronger recall, and keep your
              English-Vietnamese learning streak alive.
            </p>
            <p className="home-hero__activity">{weeklyCardsText}</p>
            <Button asChild className="home-hero__cta">
              <Link to="/study/session?mode=smart-review">
                Start Today&apos;s Session
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="home-hero__scene" aria-hidden="true">
            <div className="home-hero__sun" />
            <div className="home-hero__card home-hero__card--one">
              vocabulary
            </div>
            <div className="home-hero__card home-hero__card--two">ngữ cảnh</div>
            <div className="home-hero__card home-hero__card--three">recall</div>
            <div className="home-hero__horizon" />
          </div>
        </Card>

        <section className="home-summary" aria-label="Learning summary">
          {missionStats.map((stat, index) => {
            const Icon = statIcons[index];
            return (
              <StatCard
                icon={<Icon size={18} aria-hidden="true" />}
                key={stat.label}
                label={stat.label}
                meta={stat.meta}
                value={stat.value}
              />
            );
          })}
        </section>

        <DeckShelfSlot
          title="Most Popular"
          description="Curated English decks Vietnamese learners open most often."
          decks={livePopularDecks}
          isLoading={discover.isLoading}
          emptyTitle="No decks discovered yet"
          emptyDescription="The catalog will populate as soon as deck packs are available."
          emptyAction={{ label: "Browse Discover", to: "/discover" }}
        />
        <DeckShelfSlot
          title="My Library"
          description="Installed decks with recent review progress."
          decks={liveLibraryDecks}
          isLoading={library.isLoading}
          emptyTitle="Your library is empty"
          emptyDescription="Install a deck from Discover to start collecting words and tracking progress."
          emptyAction={{ label: "Find a deck", to: "/discover" }}
        />
        <DeckShelfSlot
          title="Recommended for You"
          description="Next-step decks based on your current learning profile."
          decks={liveRecommendedDecks}
          isLoading={discover.isLoading}
          emptyTitle="No recommendations yet"
          emptyDescription="As you install more decks, Lexora will surface complementary ones here."
        />
      </div>

      <aside className="home-page__widgets" aria-label="Home widgets">
        {liveFeaturedDeck && <FeaturedDeckWidget deck={liveFeaturedDeck} />}
        <ProgressWidget items={progressItems} />
        {studyActivity.length > 0 && (
          <StudyActivityWidget activity={studyActivity} />
        )}
      </aside>
    </motion.div>
  );
}
