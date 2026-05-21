import "./home/HomePage.css";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button, Card, StatCard } from "@/components/ui";
import { useDiscoverDecks } from "@/hooks/useDiscoverDecks";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";
import { useLibraryDecks } from "@/hooks/useLibraryDecks";
import type {
  DiscoverDeckDto,
  LibraryDeckDto,
} from "@/services/commands/decks";
import type { DailyProgressPointDto } from "@/services/commands/progress";

import { DeckShelf } from "./home/DeckShelf";
import {
  featuredDeck,
  libraryDecks,
  missionStats,
  popularDecks,
  progressItems,
  recommendedDecks,
  studyActivity,
} from "./home/homeMockData";
import {
  FeaturedDeckWidget,
  ProgressWidget,
  StudyActivityWidget,
} from "./home/ProgressWidget";
import type { DeckCardData, DeckTone } from "./home/types";

const statIcons = [Target, Sparkles, Flame, GraduationCap, Zap];
const deckTones: DeckTone[] = ["azure", "cyan", "mint", "sky", "violet"];
const CEFR_TAGS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

function shortWeekday(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function weeklyActivityFromSummary(
  activity: DailyProgressPointDto[] | undefined,
) {
  if (!activity?.length) return studyActivity;
  return activity.map((day) => ({
    day: shortWeekday(day.date),
    cards: day.cardsReviewed,
  }));
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

export function HomePage() {
  const gamification = useGamificationSummary();
  const discover = useDiscoverDecks();
  const library = useLibraryDecks();
  const dailyGoal = gamification?.dailyGoalCards ?? 20;
  const todayCards = gamification?.todayCardsReviewed ?? 16;
  const livePopularDecks = useMemo(
    () =>
      discover.decks.length > 0
        ? discover.decks.slice(0, 3).map((deck, index) => toDeckCard(deck, index))
        : popularDecks,
    [discover.decks],
  );
  const liveLibraryDecks = useMemo(
    () =>
      library.decks.length > 0
        ? library.decks.slice(0, 3).map((deck, index) => toDeckCard(deck, index))
        : libraryDecks,
    [library.decks],
  );
  const liveRecommendedDecks = useMemo(() => {
    if (discover.decks.length === 0) {
      return recommendedDecks;
    }
    const source = discover.decks.filter((deck) => !deck.installed);
    return (source.length > 0 ? source : discover.decks)
      .slice(0, 3)
      .map((deck, index) => toDeckCard(deck, index));
  }, [discover.decks]);
  const liveFeaturedDeck = livePopularDecks[0] ?? featuredDeck;
  const realMissionStats = gamification
    ? [
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
      ]
    : missionStats;
  const realProgressItems = gamification
    ? [
        {
          label: "Daily goal",
          value: todayCards,
          max: dailyGoal,
          caption: `${Math.min(todayCards, dailyGoal)} of ${dailyGoal} reviews`,
        },
        {
          label: "Level XP",
          value: gamification.currentLevelXp,
          max: gamification.nextLevelXp,
          caption: `${gamification.xpToNextLevel.toLocaleString()} XP to next`,
        },
        {
          label: "Mastered words",
          value: gamification.masteredWords,
          max: Math.max(gamification.masteredWords, gamification.totalCardsReviewed, 1),
          caption: `${gamification.masteredWords.toLocaleString()} mastered`,
        },
      ]
    : progressItems;
  const realStudyActivity = weeklyActivityFromSummary(
    gamification?.weeklyActivity,
  );

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
            <p className="home-hero__activity">
              {gamification
                ? `You reviewed ${gamification.weeklyCardsReviewed.toLocaleString()} cards this week. Start with your highest-impact review queue, then continue your strongest deck.`
                : "You studied 86 words this week. Start with your highest-impact review queue, then continue your IELTS Core deck."}
            </p>
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
          {realMissionStats.map((stat, index) => {
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

        <DeckShelf
          title="Most Popular"
          description="Curated English decks Vietnamese learners open most often."
          decks={livePopularDecks}
        />
        <DeckShelf
          title="My Library"
          description="Installed decks with recent review progress."
          decks={liveLibraryDecks}
        />
        <DeckShelf
          title="Recommended for You"
          description="Next-step decks based on your B1-B2 learning profile."
          decks={liveRecommendedDecks}
        />
      </div>

      <aside className="home-page__widgets" aria-label="Home widgets">
        <FeaturedDeckWidget deck={liveFeaturedDeck} />
        <ProgressWidget items={realProgressItems} />
        <StudyActivityWidget activity={realStudyActivity} />
      </aside>
    </motion.div>
  );
}
