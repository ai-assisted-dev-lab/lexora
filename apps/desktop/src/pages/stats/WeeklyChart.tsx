import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeeklyDataPoint } from "./statsMockData";

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const hasData = data.some((d) => d.words > 0);
  const todayIdx = data.length - 1;

  if (!hasData) {
    return (
      <div
        className="weekly-chart weekly-chart--empty"
        role="img"
        aria-label="Weekly words reviewed bar chart"
      >
        <p className="weekly-chart__empty-text">
          Complete a study session to see your weekly activity.
        </p>
      </div>
    );
  }

  return (
    <div
      className="weekly-chart"
      role="img"
      aria-label="Weekly words reviewed bar chart"
    >
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value: number) => [value, "Cards reviewed"]}
          />
          <Bar dataKey="words" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === todayIdx ? "#2563eb" : "#93c5fd"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
