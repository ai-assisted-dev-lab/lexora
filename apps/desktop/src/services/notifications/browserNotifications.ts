import type { NotificationOsStatus } from "@/services/commands/notifications";

export interface BrowserNotificationResult {
  status: NotificationOsStatus;
  message: string;
}

export async function showBrowserNotification(
  title: string,
  body: string,
): Promise<BrowserNotificationResult> {
  if (!("Notification" in window)) {
    return {
      status: "unavailable",
      message: "OS notifications are unavailable in this runtime.",
    };
  }

  try {
    let permission = window.Notification.permission;
    if (permission === "default") {
      permission = await window.Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        status: "denied",
        message: "OS notification permission was not granted.",
      };
    }

    new window.Notification(title, {
      body,
      silent: false,
    });

    return {
      status: "sent",
      message: "OS notification sent.",
    };
  } catch (err) {
    return {
      status: "failed",
      message:
        err instanceof Error ? err.message : "OS notification dispatch failed.",
    };
  }
}
