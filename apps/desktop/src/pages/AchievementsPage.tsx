import "./achievements/AchievementsPage.css";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { Button, Card, SectionHeader } from "@/components/ui";
import { useAchievements } from "@/hooks/useAchievements";

import { AchievementCard } from "./achievements/AchievementCard";
import {
  achievements,
  categoryFilters,
} from "./achievements/achievementsMockData";
import type { AchievementCategory } from "./achievements/types";

export function AchievementsPage() {
  const [category, setCategory] = useState<AchievementCategory>("All");
  const { data } = useAchievements();
  const activeAchievements = data?.achievements ?? achievements;

  const filteredAchievements = useMemo(
    () =>
      category === "All"
        ? activeAchievements
        : activeAchievements.filter((a) => a.category === category),
    [activeAchievements, category],
  );

  const recentlyUnlocked = useMemo(
    () =>
      activeAchievements
        .filter((a) => a.state === "unlocked" && a.unlockedAt)
        .sort((a, b) => (b.unlockedAt! > a.unlockedAt! ? 1 : -1))
        .slice(0, 5),
    [activeAchievements],
  );

  const totalUnlocked =
    data?.unlocked ??
    activeAchievements.filter((a) => a.state === "unlocked").length;
  const totalInProgress =
    data?.inProgress ??
    activeAchievements.filter((a) => a.state === "in_progress").length;
  const totalCount = data?.total ?? activeAchievements.length;

  return (
    <motion.div
      className="achievements-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="achievements-hero" variant="hero">
        <div>
          <p className="achievements-hero__eyebrow">Your milestones</p>
          <h2>Achievements</h2>
          <p>
            Every badge marks a moment your discipline paid off. Keep pushing
            your boundaries.
          </p>
        </div>
        <div
          className="achievements-hero__stats"
          aria-label="Achievement summary"
        >
          <div className="achievements-hero__stat">
            <span className="achievements-hero__stat-value">
              {totalUnlocked}
            </span>
            <span className="achievements-hero__stat-label">Unlocked</span>
          </div>
          <div className="achievements-hero__divider" aria-hidden="true" />
          <div className="achievements-hero__stat">
            <span className="achievements-hero__stat-value">
              {totalInProgress}
            </span>
            <span className="achievements-hero__stat-label">In Progress</span>
          </div>
          <div className="achievements-hero__divider" aria-hidden="true" />
          <div className="achievements-hero__stat">
            <span className="achievements-hero__stat-value">{totalCount}</span>
            <span className="achievements-hero__stat-label">Total</span>
          </div>
        </div>
      </Card>

      {recentlyUnlocked.length > 0 && (
        <section aria-labelledby="recently-unlocked-heading">
          <SectionHeader
            id="recently-unlocked-heading"
            title="Recently Unlocked"
            description="Your latest achievements."
          />
          <div className="achievements-recent" role="list">
            {recentlyUnlocked.map((achievement) => (
              <div key={achievement.id} role="listitem">
                <AchievementCard achievement={achievement} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Achievement gallery">
        <div
          className="achievements-filter"
          role="toolbar"
          aria-label="Filter by category"
        >
          {categoryFilters.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "primary" : "soft"}
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <p
          className="achievements-count"
          aria-live="polite"
          style={{ marginTop: "var(--space-4)" }}
        >
          {filteredAchievements.length}{" "}
          {filteredAchievements.length === 1 ? "achievement" : "achievements"}
          {category !== "All" && ` in ${category}`}
        </p>

        <div
          className="achievements-grid"
          style={{ marginTop: "var(--space-4)" }}
          aria-label="Achievements list"
        >
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </section>
    </motion.div>
  );
}
