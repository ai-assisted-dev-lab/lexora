import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
}

function clampProgress(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function ProgressBar({
  className,
  label,
  max = 100,
  value,
  ...props
}: ProgressBarProps) {
  const progress = clampProgress(value, max);

  return (
    <div
      className={cn("lx-progress", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      {...props}
    >
      <div className="lx-progress__track">
        <div className="lx-progress__fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
