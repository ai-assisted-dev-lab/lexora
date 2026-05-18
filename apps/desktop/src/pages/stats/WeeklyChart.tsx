import type { WeeklyDataPoint } from "./statsMockData";

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const max = Math.max(...data.map((d) => d.words), 1);
  const todayIdx = data.length - 1;

  return (
    <div
      className="weekly-chart"
      role="img"
      aria-label="Weekly words reviewed bar chart"
    >
      <div className="weekly-chart__bars">
        {data.map((d, i) => {
          const pct = (d.words / max) * 100;
          const isToday = i === todayIdx;
          return (
            <div key={d.day} className="weekly-chart__col">
              <span className="weekly-chart__val" aria-hidden="true">
                {d.words}
              </span>
              <div className="weekly-chart__track" aria-hidden="true">
                <div
                  className={`weekly-chart__bar${isToday ? " weekly-chart__bar--today" : ""}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span
                className={`weekly-chart__label${isToday ? " weekly-chart__label--today" : ""}`}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
