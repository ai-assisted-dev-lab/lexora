import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  actions?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({
  actions,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("lx-empty-state", className)} {...props}>
      <div>
        {icon && <div className="lx-empty-state__icon">{icon}</div>}
        <h2 className="lx-empty-state__title">{title}</h2>
        <p className="lx-empty-state__description">{description}</p>
        {actions}
      </div>
    </div>
  );
}
