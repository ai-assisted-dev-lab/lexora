import "./profile/ProfilePage.css";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Flame,
  Layers,
  Target,
  Zap,
} from "lucide-react";

import { Badge, Card, ProgressBar, SectionHeader, StatCard } from "@/components/ui";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";

import {
  favoriteDeck,
  recentActivity,
  showcaseAchievements,
  userProfile,
} from "./profile/profileMockData";

const SHOWCASE_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Flame,
  Layers,
  Target,
  Zap,
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProfilePage() {
  const gamification = useGamificationSummary();
  const {
    displayName,
    initials,
    joinedDate,
  } = userProfile;
  const level = gamification?.level ?? userProfile.level;
  const xp = gamification?.currentLevelXp ?? userProfile.xp;
  const xpNextLevel = gamification?.nextLevelXp ?? userProfile.xpNextLevel;
  const currentStreak = gamification?.currentStreak ?? userProfile.currentStreak;
  const longestStreak = gamification?.longestStreak ?? userProfile.longestStreak;
  const totalXP = gamification?.totalXp ?? userProfile.totalXP;
  const masteredWords = gamification?.masteredWords ?? userProfile.masteredWords;
  const totalSessions = gamification?.totalSessions ?? userProfile.totalSessions;

  const xpPct = Math.round((xp / xpNextLevel) * 100);

  return (
    <motion.div
      className="profile-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Profile hero */}
      <Card className="profile-hero" variant="hero">
        <div className="profile-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="profile-hero__body">
          <h2 className="profile-hero__name">{displayName}</h2>
          <div className="profile-hero__meta">
            <Badge>Level {level}</Badge>
            <span>Member since {joinedDate}</span>
          </div>
          <div className="profile-hero__xp-wrap">
            <div className="profile-hero__xp-label">
              <span>XP Progress</span>
              <span>
                {xp.toLocaleString()} / {xpNextLevel.toLocaleString()}
              </span>
            </div>
            <ProgressBar
              value={xp}
              max={xpNextLevel}
              label={`${xpPct}% to Level ${level + 1}`}
            />
          </div>
          <div className="profile-hero__quick" aria-label="Quick stats">
            <div className="profile-quick-stat">
              <Flame size={15} aria-hidden="true" />
              <strong>{currentStreak}</strong> day streak
            </div>
            <div className="profile-quick-stat">
              <Zap size={15} aria-hidden="true" />
              <strong>{totalXP.toLocaleString()}</strong> total XP
            </div>
            <div className="profile-quick-stat">
              <BookOpen size={15} aria-hidden="true" />
              <strong>{masteredWords}</strong> mastered
            </div>
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="profile-stats" aria-label="Profile statistics">
        <StatCard
          icon={<Flame size={18} aria-hidden="true" />}
          label="Current Streak"
          value={`${currentStreak} days`}
          meta={`Best: ${longestStreak} days`}
        />
        <StatCard
          icon={<Zap size={18} aria-hidden="true" />}
          label="Total XP"
          value={totalXP.toLocaleString()}
          meta={`Level ${level}`}
        />
        <StatCard
          icon={<BookOpen size={18} aria-hidden="true" />}
          label="Mastered Words"
          value={masteredWords.toLocaleString()}
        />
        <StatCard
          icon={<Target size={18} aria-hidden="true" />}
          label="Sessions"
          value={totalSessions.toLocaleString()}
          meta="total completed"
        />
      </div>

      {/* Two-column body */}
      <div className="profile-columns">
        <div className="profile-main">
          {/* Favorite Deck */}
          <Card className="profile-deck">
            <SectionHeader
              title="Favourite Deck"
              eyebrow="Most studied"
            />
            <div className="profile-deck__top">
              <div>
                <p className="profile-deck__title">{favoriteDeck.title}</p>
                <div className="profile-deck__meta">
                  <Badge variant="muted">{favoriteDeck.level}</Badge>
                  <span>{favoriteDeck.sessionsCount} sessions</span>
                </div>
              </div>
              <Badge variant="default">
                {favoriteDeck.progressPct}% complete
              </Badge>
            </div>
            <div>
              <div className="profile-deck__progress-labels">
                <span>
                  {favoriteDeck.wordsStudied} / {favoriteDeck.totalWords} words
                </span>
                <span>{favoriteDeck.progressPct}%</span>
              </div>
              <ProgressBar
                value={favoriteDeck.progressPct}
                label={`${favoriteDeck.progressPct}% complete`}
              />
            </div>
          </Card>

          {/* Achievement showcase */}
          <Card className="profile-showcase">
            <SectionHeader
              title="Achievement Showcase"
              eyebrow="Pinned badges"
            />
            <div className="profile-showcase__grid">
              {showcaseAchievements.map((achievement) => {
                const IconComp =
                  SHOWCASE_ICON_MAP[achievement.iconName] ?? Award;
                return (
                  <div
                    key={achievement.title}
                    className="profile-showcase__item"
                  >
                    <div
                      className="profile-showcase__badge"
                      aria-hidden="true"
                    >
                      <IconComp size={18} />
                    </div>
                    <p className="profile-showcase__title">
                      {achievement.title}
                    </p>
                    <p className="profile-showcase__cat">
                      {achievement.category}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="profile-side">
          <Card className="profile-activity">
            <SectionHeader
              title="Recent Activity"
              description="Last 5 study sessions."
            />
            <div
              className="profile-activity__list"
              aria-label="Recent sessions"
            >
              {recentActivity.map((entry) => (
                <div key={entry.date} className="profile-activity__row">
                  <div>
                    <p className="profile-activity__deck">{entry.deck}</p>
                    <p className="profile-activity__date">
                      {formatDate(entry.date)} · {entry.wordsReviewed} words
                    </p>
                  </div>
                  <div className="profile-activity__right">
                    <span className="profile-activity__xp">
                      +{entry.xpEarned} XP
                    </span>
                    <span className="profile-activity__acc">
                      {entry.accuracy}% acc
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
