import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const PageContainer = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <main ref={ref} className={cn("lx-page-container", className)} {...props} />
  ),
);

PageContainer.displayName = "PageContainer";

export { PageContainer };
