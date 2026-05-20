import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import type { InAppReminder } from "@/services/commands/notifications";
import {
  dismissInAppReminder,
  evaluateReminders,
} from "@/services/commands/notifications";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export function NotificationCenter({
  open,
  onClose,
  onCountChange,
}: NotificationCenterProps) {
  const [reminders, setReminders] = useState<InAppReminder[]>([]);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const localDate = now.toISOString().slice(0, 10);
      const localTime = now.toTimeString().slice(0, 5);
      const result = await evaluateReminders({ localDate, localTime });
      setReminders(result.reminders);
      onCountChange(result.reminders.length);
    } catch {
      /* silently ignore — in-app reminders are best-effort */
    }
  }, [onCountChange]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  async function handleDismiss(id: number) {
    await dismissInAppReminder(id).catch(() => null);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    onCountChange(Math.max(0, reminders.length - 1));
  }

  function handleAction(reminder: InAppReminder) {
    void handleDismiss(reminder.id);
    if (reminder.route) navigate(reminder.route);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="notif-panel" ref={panelRef} role="dialog" aria-label="Notifications">
      <div className="notif-panel__header">
        <span className="notif-panel__title">Reminders</span>
        <button
          className="notif-panel__close"
          onClick={onClose}
          aria-label="Close notifications"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {reminders.length === 0 ? (
        <p className="notif-panel__empty">No active reminders.</p>
      ) : (
        <ul className="notif-panel__list" role="list">
          {reminders.map((r) => (
            <li key={r.id} className="notif-item">
              <div className="notif-item__body">
                <span className="notif-item__title">{r.title}</span>
                <span className="notif-item__text">{r.body}</span>
              </div>
              <div className="notif-item__actions">
                {r.actionLabel && (
                  <button
                    className="notif-item__action"
                    onClick={() => handleAction(r)}
                  >
                    {r.actionLabel}
                  </button>
                )}
                <button
                  className="notif-item__dismiss"
                  onClick={() => void handleDismiss(r.id)}
                  aria-label="Dismiss"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
