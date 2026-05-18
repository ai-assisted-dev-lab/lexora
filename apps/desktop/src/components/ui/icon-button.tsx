import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  label: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={label}
      className={cn("lx-icon-button", className)}
      size="icon"
      variant="icon"
      {...props}
    >
      {children}
    </Button>
  ),
);

IconButton.displayName = "IconButton";

export { IconButton };
