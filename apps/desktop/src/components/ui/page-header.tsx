import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const PageHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("lx-page-header", className)} {...props} />
  ),
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
