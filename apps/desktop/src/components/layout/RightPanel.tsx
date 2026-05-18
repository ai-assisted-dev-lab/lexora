import "./RightPanel.css";

export function RightPanel() {
  return (
    <aside className="right-panel" aria-label="Widgets">
      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Daily Goal</p>
        <div className="right-panel__goal-ring" aria-hidden="true" />
        <div className="right-panel__stat">
          <span>Progress</span>
          <span className="right-panel__stat-value">0 / 20</span>
        </div>
      </div>

      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Streak</p>
        <div className="right-panel__stat">
          <span>Current</span>
          <span className="right-panel__stat-value">0 days</span>
        </div>
        <div className="right-panel__stat">
          <span>Best</span>
          <span className="right-panel__stat-value">0 days</span>
        </div>
      </div>

      <div className="right-panel__widget">
        <p className="right-panel__widget-title">Experience</p>
        <div className="right-panel__stat">
          <span>Total XP</span>
          <span className="right-panel__stat-value">0</span>
        </div>
        <div className="right-panel__stat">
          <span>Level</span>
          <span className="right-panel__stat-value">1</span>
        </div>
      </div>
    </aside>
  );
}
