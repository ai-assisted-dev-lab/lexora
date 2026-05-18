import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function SectionHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn("lx-section-header", className)} {...props}>
      <div>
        {eyebrow && <p className="lx-section-header__eyebrow">{eyebrow}</p>}
        <h2 className="lx-section-header__title">{title}</h2>
        {description && (
          <p className="lx-section-header__description">{description}</p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
