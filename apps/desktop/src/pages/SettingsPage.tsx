import "./settings/SettingsPage.css";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  FileJson,
  HardDrive,
  Mic,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useDbHealth } from "@/hooks/useDbHealth";
import { usePronunciationSettings } from "@/hooks/usePronunciationSettings";
import { useSchemaVersion } from "@/hooks/useSchemaVersion";
import type {
  BackupHistoryItemDto,
  BackupValidationDto,
} from "@/services/commands/backup";
import {
  createBackup,
  ensureScheduledBackup,
  listBackups,
  restoreBackup,
  validateBackup,
} from "@/services/commands/backup";
import type {
  ExportableDeckDto,
  ImportExportSchemaDto,
} from "@/services/commands/importExport";
import {
  exportDeckToJson,
  getImportExportSchema,
  importDeckFromJson,
  listExportableDecks,
} from "@/services/commands/importExport";
import type { NotificationSettings } from "@/services/commands/notifications";
import {
  defaultNotificationSettings,
  getNotificationSettings,
  sendTestNotification,
  updateNotificationSettings,
} from "@/services/commands/notifications";
import type {
  AudioFallbackBehavior,
  AudioPriority,
  PronunciationAccent,
} from "@/services/commands/settings";
import type {
  AppUpdateCheckResult,
  ContentUpdateCheckResult,
  UpdateCheckMode,
} from "@/services/commands/updates";
import {
  checkAppUpdate,
  checkContentUpdates,
} from "@/services/commands/updates";
import { showBrowserNotification } from "@/services/notifications/browserNotifications";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

// ── Primitive helpers ────────────────────────────────────────────────────────

type SettingsSection =
  | "account"
  | "learning"
  | "review"
  | "pronunciation"
  | "notifications"
  | "updates"
  | "backup";

interface SettingsRowProps {
  label: string;
  description?: string;
  children?: ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        {description && (
          <span className="settings-row__desc">{description}</span>
        )}
      </div>
      {children && <div className="settings-row__control">{children}</div>}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  "aria-label": string;
}

function Toggle({ checked, onChange, "aria-label": ariaLabel }: ToggleProps) {
  return (
    <label className="settings-toggle" aria-label={ariaLabel}>
      <input
        type="checkbox"
        className="settings-toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-toggle__track" aria-hidden="true" />
    </label>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function AccountSection() {
  const [displayName, setDisplayName] = useState("Minh Quân");
  const appInfo = useAppInfo();

  return (
    <div className="settings-content">
      <SectionHeader
        title="Account"
        description="Display name, language pair, and data reset."
      />
      <Card className="settings-group">
        <SettingsRow
          label="Display Name"
          description="Shown in the profile and leaderboard."
        >
          <input
            className="settings-input settings-input--wide"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-label="Display name"
          />
        </SettingsRow>
        <SettingsRow
          label="Language Pair"
          description="The source and target language for all decks."
        >
          <span className="settings-locked">English ↔ Vietnamese</span>
          <Badge variant="muted">Locked</Badge>
        </SettingsRow>
        <SettingsRow
          label="Interface Language"
          description="Language used for menus and labels."
        >
          <select className="settings-select" aria-label="Interface language">
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Reset Learning Data"
          description="Permanently clears all FSRS progress and review history."
        >
          <Button variant="danger" size="sm" disabled>
            Reset Data
          </Button>
        </SettingsRow>
        <SettingsRow
          label="App Version"
          description="Currently installed build of Lexora."
        >
          <span className="settings-locked" aria-label="App version">
            {appInfo ? `v${appInfo.version} (${appInfo.environment})` : "—"}
          </span>
        </SettingsRow>
      </Card>
    </div>
  );
}

function LearningSection() {
  const [dailyGoal, setDailyGoal] = useState("30");
  const [sessionLimit, setSessionLimit] = useState("25");
  const [cefrTarget, setCefrTarget] = useState("B2");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showHints, setShowHints] = useState(true);

  return (
    <div className="settings-content">
      <SectionHeader
        title="Learning Preferences"
        description="Daily targets, session length, and study behaviour."
      />
      <Card className="settings-group">
        <SettingsRow
          label="Daily Study Goal"
          description="Target minutes of active study per day."
        >
          <select
            className="settings-select"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
            aria-label="Daily study goal"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Session Card Limit"
          description="Maximum cards reviewed in a single session."
        >
          <select
            className="settings-select"
            value={sessionLimit}
            onChange={(e) => setSessionLimit(e.target.value)}
            aria-label="Session card limit"
          >
            <option value="10">10 cards</option>
            <option value="25">25 cards</option>
            <option value="50">50 cards</option>
            <option value="100">100 cards</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="CEFR Target Level"
          description="Guides deck recommendations and difficulty calibration."
        >
          <select
            className="settings-select"
            value={cefrTarget}
            onChange={(e) => setCefrTarget(e.target.value)}
            aria-label="CEFR target level"
          >
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow
          label="Auto-advance on Correct"
          description="Skip the confirmation step when your answer is correct."
        >
          <Toggle
            checked={autoAdvance}
            onChange={setAutoAdvance}
            aria-label="Toggle auto-advance on correct answer"
          />
        </SettingsRow>
        <SettingsRow
          label="Show Vietnamese Hints"
          description="Display a brief Vietnamese gloss below the English prompt."
        >
          <Toggle
            checked={showHints}
            onChange={setShowHints}
            aria-label="Toggle Vietnamese hints"
          />
        </SettingsRow>
      </Card>
    </div>
  );
}

function ReviewSection() {
  const [newPerDay, setNewPerDay] = useState("10");
  const [reviewCap, setReviewCap] = useState("50");
  const [prioritiseWeak, setPrioritiseWeak] = useState(true);

  return (
    <div className="settings-content">
      <SectionHeader
        title="Smart Review Mix"
        description="FSRS scheduling parameters for your daily review queue."
      />
      <p className="settings-note">
        FSRS-powered scheduling activates in Milestone 2. These settings are
        saved but not yet applied to the review engine.
      </p>
      <Card className="settings-group">
        <SettingsRow
          label="New Cards per Day"
          description="How many fresh vocabulary items to introduce daily."
        >
          <input
            className="settings-input"
            type="number"
            min={1}
            max={100}
            value={newPerDay}
            onChange={(e) => setNewPerDay(e.target.value)}
            aria-label="New cards per day"
          />
        </SettingsRow>
        <SettingsRow
          label="Review Cap per Session"
          description="Upper limit on FSRS-scheduled reviews in one sitting."
        >
          <input
            className="settings-input"
            type="number"
            min={10}
            max={500}
            value={reviewCap}
            onChange={(e) => setReviewCap(e.target.value)}
            aria-label="Review cap per session"
          />
        </SettingsRow>
        <SettingsRow
          label="Prioritise Weak Words"
          description="Bump low-retention words to the front of the queue."
        >
          <Toggle
            checked={prioritiseWeak}
            onChange={setPrioritiseWeak}
            aria-label="Toggle prioritise weak words"
          />
        </SettingsRow>
      </Card>
    </div>
  );
}

function PronunciationSection() {
  const { error, isLoading, save, settings } = usePronunciationSettings();

  function updateSettings(
    patch: Partial<{
      audioAutoplay: boolean;
      pronunciationAccent: PronunciationAccent;
      pronunciationSpeed: number;
      audioPriority: AudioPriority;
      audioFallbackBehavior: AudioFallbackBehavior;
    }>,
  ) {
    void save({
      audioAutoplay: settings.audioAutoplay,
      pronunciationAccent: settings.pronunciationAccent,
      pronunciationSpeed: settings.pronunciationSpeed,
      audioPriority: settings.audioPriority,
      audioFallbackBehavior: settings.audioFallbackBehavior,
      ...patch,
    }).catch(() => {});
  }

  return (
    <div className="settings-content">
      <SectionHeader
        title="Pronunciation"
        description="Accent, speed, and fallback rules for word audio."
      />
      {error && <p className="settings-note">{error}</p>}
      <Card className="settings-group">
        <SettingsRow
          label="Auto-play Audio on Reveal"
          description="Plays the word's audio automatically when a card flips."
        >
          <Toggle
            checked={settings.audioAutoplay}
            onChange={(audioAutoplay) => updateSettings({ audioAutoplay })}
            aria-label="Toggle auto-play audio"
          />
        </SettingsRow>
        <SettingsRow
          label="Default Accent"
          description="Used to pick local pronunciation records and browser voices."
        >
          <select
            className="settings-select"
            value={settings.pronunciationAccent}
            onChange={(e) =>
              updateSettings({
                pronunciationAccent: e.target.value as PronunciationAccent,
              })
            }
            aria-label="Default pronunciation accent"
            disabled={isLoading}
          >
            <option value="us">American English</option>
            <option value="uk">British English</option>
            <option value="neutral">Neutral English</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Playback Speed"
          description="Applies to browser/OS TTS voices where supported."
        >
          <select
            className="settings-select"
            value={settings.pronunciationSpeed.toString()}
            onChange={(e) =>
              updateSettings({ pronunciationSpeed: Number(e.target.value) })
            }
            aria-label="Pronunciation playback speed"
            disabled={isLoading}
          >
            <option value="0.75">0.75x</option>
            <option value="0.9">0.9x</option>
            <option value="1">1.0x</option>
            <option value="1.15">1.15x</option>
            <option value="1.3">1.3x</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Audio Priority"
          description="Choose whether local bundled audio or TTS is tried first."
        >
          <select
            className="settings-select"
            value={settings.audioPriority}
            onChange={(e) =>
              updateSettings({ audioPriority: e.target.value as AudioPriority })
            }
            aria-label="Audio priority"
            disabled={isLoading}
          >
            <option value="local_first">Local audio first</option>
            <option value="tts_first">TTS first</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Fallback Behavior"
          description="Used when local audio is missing or TTS is preferred."
        >
          <select
            className="settings-select"
            value={settings.audioFallbackBehavior}
            onChange={(e) =>
              updateSettings({
                audioFallbackBehavior: e.target.value as AudioFallbackBehavior,
              })
            }
            aria-label="Audio fallback behavior"
            disabled={isLoading}
          >
            <option value="browser_tts">Browser / OS TTS</option>
            <option value="online_then_browser">
              Online provider, then browser
            </option>
            <option value="disabled">No fallback</option>
          </select>
        </SettingsRow>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [settings, setSettings] = useState<NotificationSettings>(
    defaultNotificationSettings,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getNotificationSettings()
      .then((result) => {
        if (!cancelled && result) {
          setSettings(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatTauriError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings(patch: Partial<NotificationSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await updateNotificationSettings({
        notificationEnabled: next.notificationEnabled,
        inAppRemindersEnabled: next.inAppRemindersEnabled,
        dueReviewNotificationsEnabled: next.dueReviewNotificationsEnabled,
        streakNotificationsEnabled: next.streakNotificationsEnabled,
        reminderTime: next.reminderTime,
        reminderDaysOfWeek: next.reminderDaysOfWeek,
      });
      setSettings(saved);
      setMessage("Notification settings saved.");
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestNotification() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendTestNotification();
      const osResult = await showBrowserNotification(
        result.reminder.title,
        result.reminder.body,
      );
      setMessage(
        osResult.status === "sent"
          ? "Test notification sent. A matching in-app reminder was also created."
          : `${result.message} ${osResult.message}`,
      );
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-content">
      <SectionHeader
        title="Notifications"
        description="Control when and how Lexora gets your attention."
      />
      <p className="settings-note">
        OS-level notifications require platform permission — this will be wired
        up in Milestone 2.
      </p>
      {(message || error) && (
        <div
          className={`settings-status ${error ? "settings-status--error" : "settings-status--success"}`}
          role="status"
        >
          {error ? (
            <AlertCircle size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          <span>{error ?? message}</span>
        </div>
      )}
      <Card className="settings-group">
        <SettingsRow
          label="Daily Reminder"
          description="Master switch for local due review and goal reminders."
        >
          <Toggle
            checked={settings.notificationEnabled}
            onChange={(notificationEnabled) =>
              void saveSettings({ notificationEnabled })
            }
            aria-label="Toggle daily reminder"
          />
        </SettingsRow>
        <SettingsRow
          label="Reminder Time"
          description="Local time when Lexora starts checking for due work."
        >
          <input
            className="settings-input"
            type="time"
            value={settings.reminderTime}
            onChange={(e) => {
              setSettings((current) => ({
                ...current,
                reminderTime: e.target.value,
              }));
              if (e.target.value) {
                void saveSettings({ reminderTime: e.target.value });
              }
            }}
            disabled={!settings.notificationEnabled || isLoading || isSaving}
            aria-label="Reminder time"
          />
        </SettingsRow>
        <SettingsRow
          label="In-app Reminders"
          description="Show active reminders in the header notification center."
        >
          <Toggle
            checked={settings.inAppRemindersEnabled}
            onChange={(inAppRemindersEnabled) =>
              void saveSettings({ inAppRemindersEnabled })
            }
            aria-label="Toggle in-app reminders"
          />
        </SettingsRow>
        <SettingsRow
          label="Due Review Alerts"
          description="Notify when locally scheduled review cards are due."
        >
          <Toggle
            checked={settings.dueReviewNotificationsEnabled}
            onChange={(dueReviewNotificationsEnabled) =>
              void saveSettings({ dueReviewNotificationsEnabled })
            }
            aria-label="Toggle due review alerts"
          />
        </SettingsRow>
        <SettingsRow
          label="Streak Alerts"
          description="Notifies you when your streak is at risk of breaking."
        >
          <Toggle
            checked={settings.streakNotificationsEnabled}
            onChange={(streakNotificationsEnabled) =>
              void saveSettings({ streakNotificationsEnabled })
            }
            aria-label="Toggle streak alerts"
          />
        </SettingsRow>
      </Card>
      <div className="settings-group-footer">
        <Button
          variant="secondary"
          onClick={() => void handleTestNotification()}
          disabled={isLoading || isSaving}
        >
          Send Test Notification
        </Button>
      </div>
    </div>
  );
}

function updateStatusVariant(
  status: AppUpdateCheckResult["status"] | ContentUpdateCheckResult["status"],
) {
  if (status === "available") return "warning";
  if (status === "up_to_date" || status === "empty") return "success";
  if (status === "incompatible") return "danger";
  return "muted";
}

function updateStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function UpdatesSection() {
  const appInfo = useAppInfo();
  const [appUpdate, setAppUpdate] = useState<AppUpdateCheckResult | null>(null);
  const [contentUpdate, setContentUpdate] =
    useState<ContentUpdateCheckResult | null>(null);
  const [manifestPath, setManifestPath] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkMode: UpdateCheckMode =
    appInfo?.environment === "production" ? "auto" : "test";

  async function handleCheckUpdates() {
    setIsChecking(true);
    setError(null);
    try {
      const [appResult, contentResult] = await Promise.all([
        checkAppUpdate(checkMode),
        checkContentUpdates(
          checkMode,
          manifestPath.trim() ? manifestPath.trim() : null,
        ),
      ]);
      setAppUpdate(appResult);
      setContentUpdate(contentResult);
      setLastCheckedAt(new Date().toISOString());
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="settings-content">
      <SectionHeader
        title="Updates"
        description="App version checks and modular content package status."
      />
      {error && (
        <div className="settings-status settings-status--error" role="status">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <Card className="settings-group">
        <SettingsRow
          label="Update Check Mode"
          description={
            checkMode === "test"
              ? "Uses local test data in development."
              : "Uses configured release endpoint environment."
          }
        >
          <Badge variant="muted">{checkMode}</Badge>
        </SettingsRow>
        <SettingsRow
          label="App Updates"
          description={appUpdate?.message ?? "No update check has run yet."}
        >
          <Badge
            variant={
              appUpdate ? updateStatusVariant(appUpdate.status) : "muted"
            }
          >
            {appUpdate ? updateStatusLabel(appUpdate.status) : "not checked"}
          </Badge>
        </SettingsRow>
        <SettingsRow
          label="Installed Version"
          description="Current Lexora build reported by the native layer."
        >
          <span className="settings-locked">
            {appUpdate?.currentVersion ?? appInfo?.version ?? "-"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Latest Version"
          description="Newest version returned by the configured updater source."
        >
          <span className="settings-locked">
            {appUpdate?.latestVersion ?? "-"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Content Manifest"
          description={
            contentUpdate?.message ?? "No content check has run yet."
          }
        >
          <Badge
            variant={
              contentUpdate
                ? updateStatusVariant(contentUpdate.status)
                : "muted"
            }
          >
            {contentUpdate
              ? updateStatusLabel(contentUpdate.status)
              : "not checked"}
          </Badge>
        </SettingsRow>
        <SettingsRow
          label="Manifest Path"
          description="Optional local manifest path. Empty uses env configuration or bundled test data."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={manifestPath}
            onChange={(e) => setManifestPath(e.target.value)}
            placeholder="Use configured manifest"
            aria-label="Content manifest path"
            disabled={isChecking}
          />
        </SettingsRow>
        <SettingsRow
          label="Required Content"
          description="Seed data, data patches, catalog updates, and assets eligible for automatic fetch."
        >
          <span className="settings-locked">
            {contentUpdate
              ? `${contentUpdate.requiredPackages} package(s), ${formatBackupBytes(contentUpdate.requiredDownloadBytes)}`
              : "-"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Optional Audio"
          description="Audio packages stay modular and require explicit selection."
        >
          <span className="settings-locked">
            {contentUpdate
              ? `${contentUpdate.optionalAudioPackages} package(s), ${formatBackupBytes(contentUpdate.optionalAudioBytes)}`
              : "-"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Last Checked"
          description="Timestamp for the latest local update status refresh."
        >
          <span className="settings-locked">
            {formatBackupDate(lastCheckedAt)}
          </span>
        </SettingsRow>
      </Card>

      {contentUpdate?.packages.length ? (
        <Card className="settings-group">
          <SettingsRow
            label="Available Packages"
            description={`${contentUpdate.totalPackages} package(s) from ${contentUpdate.source}.`}
          >
            <Package size={18} aria-hidden="true" />
          </SettingsRow>
          <div className="settings-update-list" aria-label="Content packages">
            {contentUpdate.packages.map((item) => (
              <div className="settings-update-list__item" key={item.id}>
                <div className="settings-update-list__main">
                  <span className="settings-update-list__title">
                    {item.title}
                  </span>
                  <span className="settings-update-list__meta">
                    {item.kind} - v{item.version} -{" "}
                    {formatBackupBytes(item.sizeBytes)}
                  </span>
                </div>
                <Badge variant={item.audio ? "warning" : "muted"}>
                  {item.audio ? "manual audio" : item.downloadPolicy}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="settings-group-footer">
        <Button
          variant="secondary"
          onClick={() => void handleCheckUpdates()}
          disabled={isChecking}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {isChecking ? "Checking" : "Check Updates"}
        </Button>
      </div>
    </div>
  );
}

function formatBackupDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function formatBackupBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function describeBackupCounts(validation: BackupValidationDto | null) {
  if (!validation) return null;
  const rows = validation.tableCounts
    .filter((count) => count.rows > 0)
    .slice(0, 5)
    .map((count) => `${count.table}: ${count.rows}`);
  return rows.length > 0 ? rows.join(", ") : "No rows in backup.";
}

function BackupSection() {
  const [decks, setDecks] = useState<ExportableDeckDto[]>([]);
  const [schema, setSchema] = useState<ImportExportSchemaDto | null>(null);
  const [history, setHistory] = useState<BackupHistoryItemDto[]>([]);
  const [backupDirectory, setBackupDirectory] = useState("");
  const [latestBackupAt, setLatestBackupAt] = useState<string | null>(null);
  const [latestAutoBackupAt, setLatestAutoBackupAt] = useState<string | null>(
    null,
  );
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [backupPath, setBackupPath] = useState("");
  const [backupNote, setBackupNote] = useState("");
  const [includeContent, setIncludeContent] = useState(true);
  const [overwriteBackup, setOverwriteBackup] = useState(false);
  const [restorePath, setRestorePath] = useState("");
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoreValidation, setRestoreValidation] =
    useState<BackupValidationDto | null>(null);
  const [exportPath, setExportPath] = useState("");
  const [importPath, setImportPath] = useState("");
  const [overwriteExport, setOverwriteExport] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dbHealth = useDbHealth();
  const schemaVersion = useSchemaVersion();

  useEffect(() => {
    let cancelled = false;

    async function loadBackupData() {
      try {
        const [schemaResult, deckResult] = await Promise.all([
          getImportExportSchema(),
          listExportableDecks(),
        ]);
        if (cancelled) return;
        setSchema(schemaResult);
        setDecks(deckResult.decks);
        setSelectedDeckId((current) => {
          if (current) return current;
          return deckResult.decks[0]?.id.toString() ?? "";
        });

        await ensureScheduledBackup();
        if (cancelled) return;
        await refreshBackupHistory(cancelled);
      } catch (err) {
        if (!cancelled) {
          setError(formatTauriError(err));
        }
      }
    }

    void loadBackupData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBackupHistory(cancelled = false) {
    const result = await listBackups();
    if (cancelled) return;
    setHistory(result.items);
    setBackupDirectory(result.backupDirectory);
    setLatestBackupAt(result.latestBackupAt);
    setLatestAutoBackupAt(result.latestAutoBackupAt);
  }

  async function handleRefreshBackups() {
    setIsBusy(true);
    setError(null);
    try {
      await refreshBackupHistory();
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateBackup() {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    setRestoreValidation(null);
    try {
      const result = await createBackup({
        filePath: backupPath.trim() ? backupPath.trim() : null,
        note: backupNote.trim() ? backupNote.trim() : null,
        includeContent,
        overwrite: overwriteBackup,
      });
      setMessage(`Created ${result.backupKind} backup at ${result.filePath}.`);
      await refreshBackupHistory();
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleValidateRestore() {
    if (!restorePath.trim()) {
      setError("Enter a local .lexora-backup.json file path to validate.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const validation = await validateBackup(restorePath.trim());
      setRestoreValidation(validation);
      setMessage(
        validation.valid
          ? "Backup is compatible with this Lexora database."
          : "Backup validation found problems.",
      );
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestoreBackup() {
    if (!restorePath.trim()) {
      setError("Enter a local .lexora-backup.json file path to restore.");
      return;
    }
    if (!restoreConfirmed) {
      setError("Confirm restore before replacing local progress and settings.");
      return;
    }

    const confirmed = window.confirm(
      "Restore this backup? Current local progress and settings for this user will be replaced after a safety backup is created.",
    );
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await restoreBackup({
        filePath: restorePath.trim(),
        confirmRestore: true,
        createSafetyBackup: true,
      });
      setMessage(
        `Restored backup at ${formatBackupDate(result.restoredAt)}. A safety backup was ${result.safetyBackup ? "created" : "not created"}.`,
      );
      setRestoreConfirmed(false);
      await refreshBackupHistory();
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExportDeck() {
    const deckId = Number(selectedDeckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      setError("Choose a deck to export.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await exportDeckToJson(
        deckId,
        exportPath.trim() ? exportPath.trim() : null,
        overwriteExport,
      );
      setMessage(`Exported ${result.wordCount} words to ${result.filePath}.`);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportDeck() {
    if (!importPath.trim()) {
      setError("Enter a local .json file path to import.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await importDeckFromJson(importPath.trim());
      setMessage(
        `Imported ${result.wordsImported} words into ${result.deckSlug}.`,
      );
      const deckResult = await listExportableDecks();
      setDecks(deckResult.decks);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  const validationCounts = describeBackupCounts(restoreValidation);

  return (
    <div className="settings-content">
      <SectionHeader
        title="Backup & Restore"
        description="Protect local progress, settings, and optional content metadata."
      />
      <p className="settings-note">
        Backups are local JSON archives. Password hashes, app metadata, and
        encryption keys are never exported. Restore always requires explicit
        confirmation.
      </p>
      {(message || error) && (
        <div
          className={`settings-status ${error ? "settings-status--error" : "settings-status--success"}`}
          role="status"
        >
          {error ? (
            <AlertCircle size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          <span>{error ?? message}</span>
        </div>
      )}
      <Card className="settings-group">
        <SettingsRow
          label="Database"
          description={
            dbHealth
              ? dbHealth.dbPath
              : "Local SQLite database — path available in the running app."
          }
        >
          <span className="settings-locked" aria-label="Database status">
            {dbHealth ? `SQLite ${dbHealth.sqliteVersion}` : "—"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Schema Version"
          description="Current database schema version applied by the migration runner."
        >
          <span className="settings-locked" aria-label="Schema version">
            {schemaVersion
              ? `v${schemaVersion.version} (${schemaVersion.migrationCount} migration${schemaVersion.migrationCount === 1 ? "" : "s"})`
              : "—"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Backup Folder"
          description={backupDirectory || "Local app-data backup folder."}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshBackups}
            disabled={isBusy}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Refresh
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Last Backup"
          description="Most recent manual or scheduled local backup."
        >
          <span className="settings-backup-meta">
            {formatBackupDate(latestBackupAt)}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Last Auto Backup"
          description="Scheduled local backups are created at most once per day."
        >
          <span className="settings-backup-meta">
            {formatBackupDate(latestAutoBackupAt)}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Backup Path"
          description="Optional full .lexora-backup.json path. Empty uses the local backup folder."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={backupPath}
            onChange={(e) => setBackupPath(e.target.value)}
            placeholder="Use default backup folder"
            aria-label="Backup file path"
            disabled={isBusy}
          />
        </SettingsRow>
        <SettingsRow
          label="Backup Note"
          description="Optional label shown in backup history."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={backupNote}
            onChange={(e) => setBackupNote(e.target.value)}
            placeholder="Before importing new decks"
            aria-label="Backup note"
            disabled={isBusy}
          />
        </SettingsRow>
        <SettingsRow
          label="Include Content Metadata"
          description="Includes decks, vocabulary metadata, examples, pronunciations, and provenance."
        >
          <Toggle
            checked={includeContent}
            onChange={setIncludeContent}
            aria-label="Toggle content metadata in backup"
          />
        </SettingsRow>
        <SettingsRow
          label="Overwrite Backup File"
          description="Required before replacing an existing backup path."
        >
          <Toggle
            checked={overwriteBackup}
            onChange={setOverwriteBackup}
            aria-label="Toggle overwrite backup file"
          />
        </SettingsRow>
        <SettingsRow
          label="Create Manual Backup"
          description="Exports local user data and selected metadata to a backup archive."
        >
          <Button
            variant="soft"
            size="sm"
            onClick={handleCreateBackup}
            disabled={isBusy}
          >
            <Download size={15} aria-hidden="true" />
            Create Backup
          </Button>
        </SettingsRow>
      </Card>

      <Card className="settings-group">
        <SettingsRow
          label="Restore Path"
          description="Full path to a compatible Lexora backup archive."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={restorePath}
            onChange={(e) => {
              setRestorePath(e.target.value);
              setRestoreValidation(null);
            }}
            placeholder="C:\\path\\lexora.lexora-backup.json"
            aria-label="Restore backup path"
            disabled={isBusy}
          />
        </SettingsRow>
        <SettingsRow
          label="Validate Backup"
          description={
            restoreValidation
              ? `${restoreValidation.valid ? "Valid" : "Invalid"}; ${validationCounts ?? "no table counts"}`
              : "Checks schema compatibility and local references before restore."
          }
        >
          <Button
            variant="soft"
            size="sm"
            onClick={handleValidateRestore}
            disabled={isBusy || !restorePath.trim()}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Validate
          </Button>
        </SettingsRow>
        {restoreValidation?.warnings.length ? (
          <div className="settings-validation-list" role="status">
            {restoreValidation.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        ) : null}
        <SettingsRow
          label="Restore Confirmation"
          description="Required before replacing current local progress and settings."
        >
          <Toggle
            checked={restoreConfirmed}
            onChange={setRestoreConfirmed}
            aria-label="Confirm restore"
          />
        </SettingsRow>
        <SettingsRow
          label="Restore Backup"
          description="Creates a safety backup first, then restores the selected archive."
        >
          <Button
            variant="danger"
            size="sm"
            onClick={handleRestoreBackup}
            disabled={isBusy || !restorePath.trim() || !restoreConfirmed}
          >
            <Upload size={15} aria-hidden="true" />
            Restore
          </Button>
        </SettingsRow>
      </Card>

      <Card className="settings-group">
        <SettingsRow
          label="Backup History"
          description={
            history.length
              ? `${history.length} local backup${history.length === 1 ? "" : "s"} recorded.`
              : "Manual and scheduled backups will appear here."
          }
        >
          <Badge variant="muted">{history.length}</Badge>
        </SettingsRow>
        <div className="settings-history" aria-label="Backup history">
          {history.length === 0 ? (
            <div className="settings-history__empty">No backups yet.</div>
          ) : (
            history.slice(0, 8).map((item) => (
              <div className="settings-history__item" key={item.id}>
                <div className="settings-history__main">
                  <span className="settings-history__title">
                    {item.backupKind === "auto" ? "Auto" : "Manual"} backup
                  </span>
                  <span className="settings-history__meta">
                    {formatBackupDate(item.createdAt)} -{" "}
                    {formatBackupBytes(item.fileSizeBytes)} -{" "}
                    {item.includeContent ? "with content" : "user data only"}
                  </span>
                  <span className="settings-history__path">
                    {item.filePath}
                  </span>
                  {item.note && (
                    <span className="settings-history__note">{item.note}</span>
                  )}
                </div>
                <Badge variant={item.exists ? "muted" : "danger"}>
                  {item.exists ? "File OK" : "Missing"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      <SectionHeader
        title="Deck JSON"
        description="Move individual decks through safe Lexora JSON files."
      />
      <p className="settings-note">
        Deck JSON import creates new local content only. Existing pack or deck
        slugs are rejected to avoid silent overwrites.
      </p>
      <Card className="settings-group">
        <SettingsRow
          label="Deck JSON Schema"
          description={
            schema
              ? `${schema.jsonSchemaName} v${schema.jsonSchemaVersion}; required: ${schema.jsonRequiredTopLevelFields.join(", ")}`
              : "Lexora deck JSON schema details load from the native layer."
          }
        >
          <Badge variant="muted">JSON</Badge>
        </SettingsRow>
        <SettingsRow
          label="CSV Vocabulary Format"
          description={
            schema
              ? schema.csvHeaders.join(", ")
              : "Vocabulary CSV headers load from the native layer."
          }
        >
          <Badge variant="muted">Defined</Badge>
        </SettingsRow>
        <SettingsRow
          label="Deck to Export"
          description="Choose a local deck; leaving the path empty writes to Lexora's app-data exports folder."
        >
          <select
            className="settings-select settings-select--wide"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            aria-label="Deck to export"
            disabled={decks.length === 0 || isBusy}
          >
            {decks.length === 0 ? (
              <option value="">No local decks</option>
            ) : (
              decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.title} ({deck.wordCount})
                </option>
              ))
            )}
          </select>
        </SettingsRow>
        <SettingsRow
          label="Export Path"
          description="Optional full .json path. Existing files require explicit overwrite."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={exportPath}
            onChange={(e) => setExportPath(e.target.value)}
            placeholder="Use default export folder"
            aria-label="Export JSON path"
            disabled={isBusy}
          />
        </SettingsRow>
        <SettingsRow
          label="Overwrite Export File"
          description="Required before replacing an existing export file."
        >
          <Toggle
            checked={overwriteExport}
            onChange={setOverwriteExport}
            aria-label="Toggle overwrite export file"
          />
        </SettingsRow>
        <SettingsRow
          label="Export Deck JSON"
          description="Write a compatible Lexora deck JSON file."
        >
          <Button
            variant="soft"
            size="sm"
            onClick={handleExportDeck}
            disabled={isBusy || !selectedDeckId}
          >
            <Download size={15} aria-hidden="true" />
            Export JSON
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Import JSON Path"
          description="Full path to a compatible Lexora deck JSON file."
        >
          <input
            className="settings-input settings-input--path"
            type="text"
            value={importPath}
            onChange={(e) => setImportPath(e.target.value)}
            placeholder="C:\\path\\deck.lexora-deck.json"
            aria-label="Import JSON path"
            disabled={isBusy}
          />
        </SettingsRow>
        <SettingsRow
          label="Import Deck JSON"
          description="Validate and import without overwriting existing slugs."
        >
          <Button
            variant="soft"
            size="sm"
            onClick={handleImportDeck}
            disabled={isBusy || !importPath.trim()}
          >
            <Upload size={15} aria-hidden="true" />
            Import JSON
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Format Notes"
          description={
            schema
              ? schema.csvNotes.join(" ")
              : "Schema notes load from the native layer."
          }
        >
          <FileJson size={18} aria-hidden="true" />
        </SettingsRow>
      </Card>
    </div>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

interface NavItem {
  id: SettingsSection;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", Icon: User },
  { id: "learning", label: "Learning", Icon: BookOpen },
  { id: "review", label: "Smart Review", Icon: RotateCcw },
  { id: "pronunciation", label: "Pronunciation", Icon: Mic },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "updates", label: "Updates", Icon: RefreshCw },
  { id: "backup", label: "Backup", Icon: HardDrive },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>("account");
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <nav className="settings-nav" aria-label="Settings sections">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`settings-nav__item${active === id ? " settings-nav__item--active" : ""}`}
            aria-pressed={active === id}
            onClick={() => setActive(id)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}

        {user?.role === "owner" && (
          <>
            <div className="settings-nav__divider" role="separator" />
            <button
              className="settings-nav__item settings-nav__item--admin"
              onClick={() => navigate("/admin/data-studio")}
              aria-label="Open Data Studio (owner only)"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              Data Studio
            </button>
          </>
        )}
      </nav>

      <main aria-label="Settings content">
        {active === "account" && <AccountSection />}
        {active === "learning" && <LearningSection />}
        {active === "review" && <ReviewSection />}
        {active === "pronunciation" && <PronunciationSection />}
        {active === "notifications" && <NotificationsSection />}
        {active === "updates" && <UpdatesSection />}
        {active === "backup" && <BackupSection />}
      </main>
    </div>
  );
}
