import "./RightPanel.css";

import type { CSSProperties } from "react";

import { useGamificationSummary } from "@/hooks/useGamificationSummary";

export function RightPanel() {
  const summary = useGamificationSummary();
  const dailyGoal = summary?.dailyGoalCards ?? 20;
  const todayCards = summary?.todayCardsReviewed ?? 0;
  const goalPct = Math.min(100, Math.round((todayCards / dailyGoal) * 100));
  const levelXp = summary?.currentLevelXp ?? 0;
  const nextLevelXp = summary?.nextLevelXp ?? 100;
  const xpPct = Math.min(100, Math.round((levelXp / nextLevelXp) * 100));

  return (
    <aside className="right-panel" aria-label="Widgets">
      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Daily Goal</p>
        <div
          className="right-panel__goal-ring"
          style={{ "--goal-pct": `${goalPct}%` } as CSSProperties}
          aria-label={`Daily goal progress ${todayCards} of ${dailyGoal}`}
          role="img"
        />
        <div className="right-panel__stat">
          <span>Progress</span>
          <span className="right-panel__stat-value">
            {todayCards} / {dailyGoal}
          </span>
        </div>
        <div className="right-panel__stat">
          <span>Today XP</span>
          <span className="right-panel__stat-value">
            {(summary?.todayXpEarned ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Streak</p>
        <div className="right-panel__stat">
          <span>Current</span>
          <span className="right-panel__stat-value">
            {summary?.currentStreak ?? 0} days
          </span>
        </div>
        <div className="right-panel__stat">
          <span>Best</span>
          <span className="right-panel__stat-value">
            {summary?.longestStreak ?? 0} days
          </span>
        </div>
      </div>

      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Experience</p>
        <div className="right-panel__stat">
          <span>Total XP</span>
          <span className="right-panel__stat-value">
            {(summary?.totalXp ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="right-panel__stat">
          <span>Level</span>
          <span className="right-panel__stat-value">
            {summary?.level ?? 1}
          </span>
        </div>
        <div className="right-panel__meter" aria-hidden="true">
          <span style={{ width: `${xpPct}%` }} />
        </div>
      </div>
    </aside>
  );
}
