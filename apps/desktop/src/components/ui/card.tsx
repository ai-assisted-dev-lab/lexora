import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "interactive" | "hero" | "compact";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariantClass: Record<CardVariant, string> = {
  compact: "lx-card--compact",
  default: "",
  glass: "lx-card--glass",
  hero: "lx-card--hero",
  interactive: "lx-card--interactive",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("lx-card", cardVariantClass[variant], className)}
      {...props}
    />
  ),
);

Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("lx-card__header", className)} {...props} />
  ),
);

CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("lx-card__content", className)} {...props} />
  ),
);

CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("lx-card__footer", className)} {...props} />
  ),
);

CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardFooter, CardHeader };
