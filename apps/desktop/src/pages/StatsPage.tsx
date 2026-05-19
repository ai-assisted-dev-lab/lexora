import "./stats/StatsPage.css";

import { motion } from "framer-motion";
import { BookOpen, Flame, Layers, Target, Zap } from "lucide-react";

import { Badge, Card, EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";

import {
  masteryDistribution,
  masteryTotal,
  summaryStats,
  weakTopics,
  weeklyActivity,
  weeklyTotal,
} from "./stats/statsMockData";
import { WeeklyChart } from "./stats/WeeklyChart";

function accuracyVariant(acc: number): "success" | "warning" | "danger" {
  if (acc >= 85) return "success";
  if (acc >= 70) return "warning";
  return "danger";
}

const MASTERY_COLORS = {
  mastered: "#15803d",
  reviewing: "#2563eb",
  learning: "#0891b2",
  new: "#94a3b8",
};

export function StatsPage() {
  const gamification = useGamificationSummary();
  const analytics = useAnalytics();

  // ── Summary numbers ───────────────────────────────────────
  const liveSummary = gamification
    ? {
        streak: gamification.currentStreak,
        streakBest: gamification.longestStreak,
        xpToday: gamification.todayXpEarned,
        xpLevel: gamification.level,
        xpCurrent: gamification.totalXp,
        accuracy: gamification.accuracy,
        accuracySessions: gamification.totalSessions,
        mastered: gamification.masteredWords,
        masteredOf: Math.max(
          gamification.masteredWords,
          gamification.totalCardsReviewed,
        ),
      }
    : summaryStats;

  // ── Weekly activity (7 days from gamification summary) ────
  const liveWeeklyActivity = gamification
    ? gamification.weeklyActivity.map((day) => ({
        day: new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }),
        words: day.cardsReviewed,
      }))
    : weeklyActivity;
  const liveWeeklyTotal = gamification?.weeklyCardsReviewed ?? weeklyTotal;

  // ── Mastery distribution (real card states from analytics) ─
  const liveMastery = analytics
    ? [
        {
          label: "Mastered",
          count: analytics.mastery.masteredCount,
          color: MASTERY_COLORS.mastered,
        },
        {
          label: "Reviewing",
          count: analytics.mastery.reviewingCount,
          color: MASTERY_COLORS.reviewing,
        },
        {
          label: "Learning",
          count: analytics.mastery.learningCount,
          color: MASTERY_COLORS.learning,
        },
        {
          label: "New",
          count: analytics.mastery.newCount,
          color: MASTERY_COLORS.new,
        },
      ]
    : masteryDistribution;
  const liveMasteryTotal = analytics?.mastery.total ?? masteryTotal;

  // ── Weak words (real low-accuracy words from analytics) ────
  const liveWeakWords = analytics
    ? analytics.weakWords.map((w) => ({
        topic: w.word,
        deck: w.deckName,
        accuracy: w.accuracy,
        count: w.totalReviews,
      }))
    : weakTopics;

  const hasActivity = gamification
    ? gamification.totalCardsReviewed > 0
    : true;

  return (
    <motion.div
      className="stats-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Hero */}
      <Card className="stats-hero" variant="hero">
        <div>
          <p className="stats-hero__eyebrow">Your learning data</p>
          <h2>Progress &amp; Statistics</h2>
          <p>
            A factual view of your vocabulary growth, retention, and study
            patterns from your local SQLite learning history.
          </p>
        </div>
        <div className="stats-hero__xp-box" aria-label="XP summary">
          <Zap size={28} aria-hidden="true" />
          <span className="stats-hero__xp-value">
            {liveSummary.xpCurrent.toLocaleString()}
          </span>
          <span className="stats-hero__xp-sublabel">
            Level {liveSummary.xpLevel} · XP
          </span>
        </div>
      </Card>

      {/* Summary stat cards */}
      <div className="stats-summary" aria-label="Key statistics">
        <StatCard
          icon={<Flame size={18} aria-hidden="true" />}
          label="Current Streak"
          value={`${liveSummary.streak} days`}
          meta={`Best: ${liveSummary.streakBest} days`}
        />
        <StatCard
          icon={<Zap size={18} aria-hidden="true" />}
          label="XP Today"
          value={liveSummary.xpToday.toLocaleString()}
          meta={`Level ${liveSummary.xpLevel} · ${liveSummary.xpCurrent.toLocaleString()} total`}
        />
        <StatCard
          icon={<Target size={18} aria-hidden="true" />}
          label="Accuracy"
          value={`${liveSummary.accuracy}%`}
          meta={`${liveSummary.accuracySessions} completed sessions`}
        />
        <StatCard
          icon={<BookOpen size={18} aria-hidden="true" />}
          label="Mastered"
          value={liveSummary.mastered.toLocaleString()}
          meta={`of ${liveSummary.masteredOf.toLocaleString()} reviewed`}
        />
      </div>

      {/* Charts row */}
      <div className="stats-charts-row">
        {/* Weekly activity */}
        <Card className="stats-chart-card">
          <SectionHeader
            title="Weekly Activity"
            description={`${liveWeeklyTotal} cards reviewed this week`}
          />
          <WeeklyChart data={liveWeeklyActivity} />
        </Card>

        {/* Mastery distribution */}
        <Card className="stats-chart-card">
          <SectionHeader
            title="Mastery Distribution"
            description={
              liveMasteryTotal > 0
                ? `${liveMasteryTotal} words in study pool`
                : "Start studying to build your word pool"
            }
          />
          {liveMasteryTotal === 0 ? (
            <div className="stats-mastery-empty" aria-label="Mastery level breakdown">
              <p className="stats-empty-hint">
                Add a deck and complete your first session to see mastery
                levels.
              </p>
            </div>
          ) : (
            <div
              className="stats-mastery"
              aria-label="Mastery level breakdown"
            >
              {liveMastery.map((level) => {
                const pct =
                  liveMasteryTotal > 0
                    ? Math.round((level.count / liveMasteryTotal) * 100)
                    : 0;
                return (
                  <div key={level.label} className="stats-mastery__row">
                    <div className="stats-mastery__label">
                      <span
                        className="stats-mastery__dot"
                        style={{ background: level.color }}
                        aria-hidden="true"
                      />
                      {level.label}
                    </div>
                    <div className="stats-mastery__track">
                      <div
                        className="stats-mastery__fill"
                        style={{ width: `${pct}%`, background: level.color }}
                        role="progressbar"
                        aria-label={`${level.label}: ${level.count} words`}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <span className="stats-mastery__count">{level.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Weak words */}
      <section aria-labelledby="weak-topics-heading">
        <SectionHeader
          id="weak-topics-heading"
          title="Weak Topics"
          description="Words with below-average recall — reviewed at least 3 times."
        />
        {!hasActivity || liveWeakWords.length === 0 ? (
          <EmptyState
            icon={<Layers size={32} aria-hidden="true" />}
            title="No struggling words yet"
            description="Keep reviewing consistently. Words with low recall will appear here after a few sessions."
          />
        ) : (
          <Card className="stats-weak-card">
            <table
              className="stats-weak-table"
              aria-label="Weak topics list"
            >
              <thead>
                <tr>
                  <th scope="col">Topic</th>
                  <th scope="col">Deck</th>
                  <th scope="col">Reviews</th>
                  <th scope="col">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {liveWeakWords.map((topic) => (
                  <tr key={topic.topic}>
                    <td className="stats-weak-table__topic">{topic.topic}</td>
                    <td className="stats-weak-table__deck">{topic.deck}</td>
                    <td className="stats-weak-table__count">{topic.count}</td>
                    <td>
                      <Badge variant={accuracyVariant(topic.accuracy)}>
                        {topic.accuracy}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </motion.div>
  );
}
