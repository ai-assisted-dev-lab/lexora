import "./profile/ProfilePage.css";

import { motion } from "framer-motion";
import { BookOpen, Flame, Sparkles, Target, Zap } from "lucide-react";

import {
  Badge,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";
import { useAuth } from "@/store/authContext";

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfilePage() {
  const gamification = useGamificationSummary();
  const { user } = useAuth();

  const displayName = user?.username ?? "—";
  const initials = user ? deriveInitials(user.username) : "?";

  const level = gamification?.level ?? 0;
  const xp = gamification?.currentLevelXp ?? 0;
  const xpNextLevel = Math.max(gamification?.nextLevelXp ?? 0, 1);
  const currentStreak = gamification?.currentStreak ?? 0;
  const longestStreak = gamification?.longestStreak ?? 0;
  const totalXP = gamification?.totalXp ?? 0;
  const masteredWords = gamification?.masteredWords ?? 0;
  const totalSessions = gamification?.totalSessions ?? 0;

  const xpPct =
    xpNextLevel > 0 ? Math.min(100, Math.round((xp / xpNextLevel) * 100)) : 0;

  const isReady = gamification !== null;

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
            <Badge>{isReady ? `Level ${level}` : "Loading"}</Badge>
            <span>{user ? `Signed in as ${user.role}` : "Not signed in"}</span>
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
          meta={isReady ? `Level ${level}` : "Loading…"}
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

      {/* Showcase + activity panels: placeholder empty states until real
          favourite-deck and session-history endpoints land. */}
      <div className="profile-columns">
        <div className="profile-main">
          <Card className="profile-deck">
            <SectionHeader title="Favourite Deck" eyebrow="Most studied" />
            <EmptyState
              icon={<Sparkles size={24} aria-hidden="true" />}
              title="No favourite deck yet"
              description="Once you've studied a deck a few times we'll feature it here with your progress."
            />
          </Card>

          <Card className="profile-showcase">
            <SectionHeader
              title="Achievement Showcase"
              eyebrow="Pinned badges"
            />
            <EmptyState
              icon={<Sparkles size={24} aria-hidden="true" />}
              title="No badges pinned yet"
              description="Unlock achievements and visit the Achievements page to pin your favourites here."
            />
          </Card>
        </div>

        <div className="profile-side">
          <Card className="profile-activity">
            <SectionHeader
              title="Recent Activity"
              description="Your latest study sessions."
            />
            <EmptyState
              icon={<Target size={24} aria-hidden="true" />}
              title="No recent sessions"
              description="Start a study session to populate your activity timeline."
            />
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
