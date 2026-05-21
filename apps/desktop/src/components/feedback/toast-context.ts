import { createContext } from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastInput {
  title?: string;
  description: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface Toast extends ToastInput {
  id: number;
  variant: ToastVariant;
}

export interface ToastContextValue {
  toasts: Toast[];
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
