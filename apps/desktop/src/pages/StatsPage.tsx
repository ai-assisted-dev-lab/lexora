import "./stats/StatsPage.css";

import { motion } from "framer-motion";
import { BookOpen, Flame, Target, Zap } from "lucide-react";

import { Badge, Card, SectionHeader, StatCard } from "@/components/ui";
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

export function StatsPage() {
  const gamification = useGamificationSummary();
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

  return (
    <motion.div
      className="stats-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
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

      <div className="stats-charts-row">
        <Card className="stats-chart-card">
          <SectionHeader
            title="Weekly Activity"
            description={`${liveWeeklyTotal} cards reviewed this week`}
          />
          <WeeklyChart data={liveWeeklyActivity} />
        </Card>

        <Card className="stats-chart-card">
          <SectionHeader
            title="Mastery Distribution"
            description={`${masteryTotal} words in study pool`}
          />
          <div className="stats-mastery" aria-label="Mastery level breakdown">
            {masteryDistribution.map((level) => {
              const pct = Math.round((level.count / masteryTotal) * 100);
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
        </Card>
      </div>

      <section aria-labelledby="weak-topics-heading">
        <SectionHeader
          id="weak-topics-heading"
          title="Weak Topics"
          description="Areas with below-average recall — prioritised by the FSRS engine."
        />
        <Card className="stats-weak-card">
          <table className="stats-weak-table" aria-label="Weak topics list">
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">Deck</th>
                <th scope="col">Cards</th>
                <th scope="col">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {weakTopics.map((topic) => (
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
      </section>
    </motion.div>
  );
}
