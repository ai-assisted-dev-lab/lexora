import type { HTMLAttributes, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  label: string;
  meta?: string;
  value: string;
}

export function StatCard({
  className,
  icon,
  label,
  meta,
  value,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn("lx-stat-card", className)}
      variant="compact"
      {...props}
    >
      {icon && <div className="lx-stat-card__icon">{icon}</div>}
      <div>
        <p className="lx-stat-card__label">{label}</p>
        <p className="lx-stat-card__value">{value}</p>
        {meta && <p className="lx-stat-card__meta">{meta}</p>}
      </div>
    </Card>
  );
}
