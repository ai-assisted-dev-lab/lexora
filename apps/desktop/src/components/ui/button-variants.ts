import { cva } from "class-variance-authority";

export const buttonVariants = cva("lx-button", {
  variants: {
    variant: {
      primary: "lx-button--primary",
      secondary: "lx-button--secondary",
      ghost: "lx-button--ghost",
      soft: "lx-button--soft",
      danger: "lx-button--danger",
      icon: "lx-button--ghost lx-button--icon",
    },
    size: {
      sm: "lx-button--sm",
      md: "lx-button--md",
      lg: "lx-button--lg",
      icon: "lx-button--icon",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});
