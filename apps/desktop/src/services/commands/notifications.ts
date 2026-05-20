import { invoke } from "@/services/tauri";

export type ReminderKind = "daily_goal" | "due_review" | "streak" | "test";
export type NotificationOsStatus =
  | "sent"
  | "denied"
  | "unavailable"
  | "failed";

export interface NotificationSettings {
  userId: number;
  notificationEnabled: boolean;
  inAppRemindersEnabled: boolean;
  dueReviewNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  reminderTime: string;
  reminderDaysOfWeek: string;
  updatedAt: string;
}

export interface UpdateNotificationSettingsInput {
  notificationEnabled: boolean;
  inAppRemindersEnabled: boolean;
  dueReviewNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  reminderTime: string;
  reminderDaysOfWeek?: string;
}

export interface EvaluateRemindersInput {
  localDate?: string;
  localTime?: string;
  force?: boolean;
}

export interface InAppReminder {
  id: number;
  kind: ReminderKind;
  title: string;
  body: string;
  actionLabel?: string | null;
  route?: string | null;
  createdAt: string;
}

export interface ReminderEvaluation {
  reminders: InAppReminder[];
  newReminders: InAppReminder[];
  dueReviewCount: number;
  dailyGoalCards: number;
  todayCardsReviewed: number;
  currentStreak: number;
  settings: NotificationSettings;
  evaluatedAt: string;
}

export interface NotificationDispatchResult {
  reminder: InAppReminder;
  osStatus: NotificationOsStatus | "unavailable";
  message: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  userId: 0,
  notificationEnabled: true,
  inAppRemindersEnabled: true,
  dueReviewNotificationsEnabled: true,
  streakNotificationsEnabled: true,
  reminderTime: "08:00",
  reminderDaysOfWeek: "1111111",
  updatedAt: "",
};

export function getNotificationSettings(): Promise<NotificationSettings> {
  return invoke<NotificationSettings>("get_notification_settings");
}

export function updateNotificationSettings(
  input: UpdateNotificationSettingsInput,
): Promise<NotificationSettings> {
  return invoke<NotificationSettings>("update_notification_settings", {
    input,
  });
}

export function evaluateReminders(
  input?: EvaluateRemindersInput,
): Promise<ReminderEvaluation> {
  return invoke<ReminderEvaluation>("evaluate_reminders", {
    input: input ?? null,
  });
}

export function dismissInAppReminder(reminderId: number): Promise<void> {
  return invoke<void>("dismiss_in_app_reminder", { reminderId });
}

export function sendTestNotification(): Promise<NotificationDispatchResult> {
  return invoke<NotificationDispatchResult>("send_test_notification");
}
