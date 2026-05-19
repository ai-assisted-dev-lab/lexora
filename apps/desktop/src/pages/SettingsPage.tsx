import "./settings/SettingsPage.css";

import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  FileJson,
  HardDrive,
  Mic,
  RotateCcw,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useDbHealth } from "@/hooks/useDbHealth";
import { usePronunciationSettings } from "@/hooks/usePronunciationSettings";
import { useSchemaVersion } from "@/hooks/useSchemaVersion";
import type {
  AudioFallbackBehavior,
  AudioPriority,
  PronunciationAccent,
} from "@/services/commands/settings";
import {
  exportDeckToJson,
  getImportExportSchema,
  importDeckFromJson,
  listExportableDecks,
} from "@/services/commands/importExport";
import type {
  ExportableDeckDto,
  ImportExportSchemaDto,
} from "@/services/commands/importExport";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

// ── Primitive helpers ────────────────────────────────────────────────────────

type SettingsSection =
  | "account"
  | "learning"
  | "review"
  | "pronunciation"
  | "notifications"
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
                audioFallbackBehavior: e.target
                  .value as AudioFallbackBehavior,
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
  const [reminder, setReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [streakAlert, setStreakAlert] = useState(true);
  const [achievementNotif, setAchievementNotif] = useState(true);

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
      <Card className="settings-group">
        <SettingsRow
          label="Daily Reminder"
          description="A push notification to start your study session."
        >
          <input
            className="settings-input"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={!reminder}
            aria-label="Reminder time"
          />
          <Toggle
            checked={reminder}
            onChange={setReminder}
            aria-label="Toggle daily reminder"
          />
        </SettingsRow>
        <SettingsRow
          label="Streak Alerts"
          description="Notifies you when your streak is at risk of breaking."
        >
          <Toggle
            checked={streakAlert}
            onChange={setStreakAlert}
            aria-label="Toggle streak alerts"
          />
        </SettingsRow>
        <SettingsRow
          label="Achievement Notifications"
          description="Celebrates newly unlocked badges."
        >
          <Toggle
            checked={achievementNotif}
            onChange={setAchievementNotif}
            aria-label="Toggle achievement notifications"
          />
        </SettingsRow>
      </Card>
    </div>
  );
}

function BackupSection() {
  const [decks, setDecks] = useState<ExportableDeckDto[]>([]);
  const [schema, setSchema] = useState<ImportExportSchemaDto | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState("");
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

    async function loadImportExportData() {
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
      } catch (err) {
        if (!cancelled) {
          setError(formatTauriError(err));
        }
      }
    }

    void loadImportExportData();

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="settings-content">
      <SectionHeader
        title="Import & Export"
        description="Move local decks through safe Lexora JSON files."
      />
      <p className="settings-note">
        Deck JSON import creates new local content only. Existing pack or deck
        slugs are rejected to avoid silent overwrites.
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
          label="Last Backup"
          description="Date and time of the most recent successful backup."
        >
          <span className="settings-backup-meta">Never</span>
        </SettingsRow>
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
        {active === "backup" && <BackupSection />}
      </main>
    </div>
  );
}
