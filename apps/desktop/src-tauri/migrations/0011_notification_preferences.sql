-- 0011_notification_preferences
--
-- User-controlled reminder preferences and local notification events.
-- Notification delivery stays offline-first: the native layer evaluates local
-- due/progress data, while the UI may display in-app reminders or use an
-- available OS/browser notification bridge.

ALTER TABLE user_settings
ADD COLUMN due_review_notifications_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (due_review_notifications_enabled IN (0, 1));

ALTER TABLE user_settings
ADD COLUMN streak_notifications_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (streak_notifications_enabled IN (0, 1));

ALTER TABLE user_settings
ADD COLUMN in_app_reminders_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (in_app_reminders_enabled IN (0, 1));

CREATE TABLE IF NOT EXISTS notification_events (
    id            INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind          TEXT    NOT NULL
                         CHECK (kind IN ('daily_goal', 'due_review', 'streak', 'test')),
    title         TEXT    NOT NULL,
    body          TEXT    NOT NULL,
    action_label  TEXT,
    route         TEXT,
    status        TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'dismissed', 'sent', 'failed')),
    delivery      TEXT    NOT NULL DEFAULT 'in_app'
                         CHECK (delivery IN ('in_app', 'os', 'test')),
    dedupe_key    TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    dismissed_at  TEXT,
    error_message TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_dedupe
    ON notification_events (user_id, kind, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_status
    ON notification_events (user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_kind_created
    ON notification_events (user_id, kind, created_at);
