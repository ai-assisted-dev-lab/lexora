import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "muted" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariantClass: Record<BadgeVariant, string> = {
  danger: "lx-badge--danger",
  default: "lx-badge--default",
  muted: "lx-badge--muted",
  success: "lx-badge--success",
  warning: "lx-badge--warning",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn("lx-badge", badgeVariantClass[variant], className)}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";

export { Badge };
