import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type Toast,
  ToastContext,
  type ToastInput,
  type ToastVariant,
} from "./toast-context";

const DEFAULT_DURATION_MS = 5000;

const VARIANT_ICONS: Record<ToastVariant, ReactNode> = {
  info: <Info size={18} aria-hidden="true" />,
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  error: <AlertCircle size={18} aria-hidden="true" />,
};

const VARIANT_LIVE: Record<ToastVariant, "polite" | "assertive"> = {
  info: "polite",
  success: "polite",
  warning: "polite",
  error: "assertive",
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, number>>(new Map());
  const idCounter = useRef(0);

  const dismiss = useCallback((id: number) => {
    const handle = timers.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput): number => {
      idCounter.current += 1;
      const id = idCounter.current;
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "info",
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      };
      setToasts((prev) => [...prev, toast]);
      const duration = toast.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    timers.current.forEach((handle) => window.clearTimeout(handle));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((handle) => window.clearTimeout(handle));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toasts, push, dismiss, clear }),
    [toasts, push, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="lx-toast-viewport" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`lx-toast lx-toast--${toast.variant}`}
            role={toast.variant === "error" ? "alert" : "status"}
            aria-live={VARIANT_LIVE[toast.variant]}
          >
            <span className={`lx-toast__icon lx-toast__icon--${toast.variant}`}>
              {VARIANT_ICONS[toast.variant]}
            </span>
            <div className="lx-toast__body">
              {toast.title && (
                <strong className="lx-toast__title">{toast.title}</strong>
              )}
              <span className="lx-toast__description">{toast.description}</span>
            </div>
            <button
              type="button"
              className="lx-toast__dismiss"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
