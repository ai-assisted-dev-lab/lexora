import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "@/pages/SettingsPage";
import { AuthContext, type AuthContextValue } from "@/store/authContext";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

afterEach(cleanup);

// ── Helper ────────────────────────────────────────────────────────────────────

function renderSettings(role?: "owner" | "learner") {
  const user = role ? { userId: 1, username: role, role } : null;
  const auth: AuthContextValue = {
    user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

// ── Standard section tests ────────────────────────────────────────────────────

describe("SettingsPage", () => {
  beforeEach(() => {
    invokeMock.mockImplementation((command: string) => {
      switch (command) {
        case "get_app_info":
          return Promise.resolve({ version: "0.1.0", environment: "test" });
        case "db_health_check":
          return Promise.resolve({
            ok: true,
            dbPath: "test.db",
            sqliteVersion: "3.45.0",
          });
        case "get_schema_version":
          return Promise.resolve({ version: 4, migrationCount: 4 });
        case "get_import_export_schema":
          return Promise.resolve({
            jsonSchemaName: "lexora.deck",
            jsonSchemaVersion: "1",
            jsonRequiredTopLevelFields: [
              "schema",
              "schema_version",
              "pack",
              "deck",
              "words",
            ],
            csvFormatName: "lexora.vocabulary_csv.v1",
            csvHeaders: [
              "headword",
              "part_of_speech",
              "ipa_uk",
              "ipa_us",
              "frequency_rank",
              "cefr_level",
              "definition_en",
              "definition_vi",
              "example_en",
              "example_vi",
              "tags",
            ],
            csvNotes: ["UTF-8 with a header row is required."],
          });
        case "get_pronunciation_settings":
          return Promise.resolve({
            userId: 1,
            audioAutoplay: true,
            pronunciationAccent: "us",
            pronunciationSpeed: 1,
            audioPriority: "local_first",
            audioFallbackBehavior: "browser_tts",
            updatedAt: "2026-05-20T00:00:00Z",
          });
        case "update_pronunciation_settings":
          return Promise.resolve({
            userId: 1,
            audioAutoplay: true,
            pronunciationAccent: "uk",
            pronunciationSpeed: 1,
            audioPriority: "local_first",
            audioFallbackBehavior: "browser_tts",
            updatedAt: "2026-05-20T00:00:00Z",
          });
        case "list_exportable_decks":
          return Promise.resolve({
            decks: [
              {
                id: 1,
                title: "Everyday Actions",
                slug: "everyday-actions",
                packName: "English Essentials",
                wordCount: 5,
              },
            ],
            total: 1,
          });
        case "ensure_scheduled_backup":
          return Promise.resolve({
            created: false,
            skippedReason:
              "A scheduled backup already exists for the last 24 hours.",
            backup: null,
          });
        case "list_backups":
          return Promise.resolve({
            items: [
              {
                id: 1,
                filePath: "C:\\Backups\\lexora-manual.lexora-backup.json",
                fileSizeBytes: 2048,
                note: "Before import",
                backupKind: "manual",
                includeContent: true,
                createdAt: "2026-05-20T00:00:00Z",
                exists: true,
              },
            ],
            total: 1,
            latestBackupAt: "2026-05-20T00:00:00Z",
            latestAutoBackupAt: null,
            backupDirectory: "C:\\Backups",
          });
        case "create_backup":
          return Promise.resolve({
            backupId: 2,
            filePath: "C:\\Backups\\lexora-new.lexora-backup.json",
            bytesWritten: 4096,
            createdAt: "2026-05-20T01:00:00Z",
            backupKind: "manual",
            includeContent: true,
            tableCounts: [{ table: "user_settings", rows: 1 }],
          });
        case "validate_backup":
          return Promise.resolve({
            valid: true,
            schema: "lexora.backup.v1",
            schemaVersion: 1,
            exportedAt: "2026-05-20T00:00:00Z",
            backupKind: "manual",
            username: "learner",
            includeContent: true,
            tableCounts: [
              { table: "user_settings", rows: 1 },
              { table: "review_cards", rows: 12 },
            ],
            warnings: [],
          });
        case "restore_backup":
          return Promise.resolve({
            restoredAt: "2026-05-20T02:00:00Z",
            restoredTables: [{ table: "user_settings", rows: 1 }],
            safetyBackup: {
              id: 3,
              filePath: "C:\\Backups\\safety.lexora-backup.json",
              fileSizeBytes: 1024,
              note: "pre_restore_safety",
              backupKind: "auto",
              includeContent: true,
              createdAt: "2026-05-20T01:59:00Z",
              exists: true,
            },
          });
        case "get_notification_settings":
          return Promise.resolve({
            userId: 1,
            notificationEnabled: true,
            inAppRemindersEnabled: true,
            dueReviewNotificationsEnabled: true,
            streakNotificationsEnabled: true,
            reminderTime: "08:00",
            reminderDaysOfWeek: "1111111",
            updatedAt: "2026-05-20T00:00:00Z",
          });
        case "update_notification_settings":
          return Promise.resolve({
            userId: 1,
            notificationEnabled: false,
            inAppRemindersEnabled: true,
            dueReviewNotificationsEnabled: true,
            streakNotificationsEnabled: true,
            reminderTime: "08:00",
            reminderDaysOfWeek: "1111111",
            updatedAt: "2026-05-20T00:00:01Z",
          });
        case "send_test_notification":
          return Promise.resolve({
            reminder: {
              id: 1,
              kind: "test",
              title: "Lexora reminder test",
              body: "Notifications are connected.",
              actionLabel: "Open review",
              route: "/review",
              createdAt: "2026-05-20T00:00:00Z",
            },
            osStatus: "unavailable",
            message:
              "Native Tauri notifications are not installed in this build.",
          });
        case "check_app_update":
          return Promise.resolve({
            status: "up_to_date",
            currentVersion: "0.1.0",
            latestVersion: "0.1.0",
            updateAvailable: false,
            source: "test-mode",
            message: "Test update check completed; Lexora is up to date.",
          });
        case "check_content_updates":
          return Promise.resolve({
            status: "available",
            manifestVersion: "2026.05.20-test",
            channel: "test",
            source: "bundled-test-manifest",
            totalPackages: 3,
            requiredPackages: 1,
            optionalAudioPackages: 2,
            requiredDownloadBytes: 4096,
            optionalAudioBytes: 304087040,
            message:
              "Found 3 package(s); optional audio packages require manual install.",
            packages: [
              {
                id: "core-seed-db",
                kind: "seed_db",
                version: "0.1.0",
                title: "Core seed database",
                required: true,
                optional: false,
                sizeBytes: 4096,
                downloadPolicy: "auto",
                audio: false,
              },
              {
                id: "audio-en-us-starter",
                kind: "audio",
                version: "0.1.0",
                title: "Starter US English audio",
                required: false,
                optional: true,
                sizeBytes: 157286400,
                downloadPolicy: "manual",
                audio: true,
              },
            ],
          });
        case "export_deck_to_json":
          return Promise.resolve({
            deckId: 1,
            deckSlug: "everyday-actions",
            filePath: "C:\\Exports\\everyday-actions.lexora-deck.json",
            bytesWritten: 1024,
            wordCount: 5,
          });
        case "import_deck_from_json":
          return Promise.resolve({
            importId: 1,
            packId: 2,
            deckId: 4,
            deckSlug: "everyday-actions-import",
            wordsImported: 5,
            sensesImported: 5,
            examplesImported: 5,
            pronunciationsImported: 0,
            status: "imported",
          });
        default:
          return Promise.resolve(null);
      }
    });
  });

  it("renders all seven section nav buttons", () => {
    renderSettings();

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    for (const label of [
      "Account",
      "Learning",
      "Smart Review",
      "Pronunciation",
      "Notifications",
      "Updates",
      "Backup",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
    expect(nav).toBeInTheDocument();
  });

  it("shows Account section by default", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: /Account/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByText("English ↔ Vietnamese")).toBeInTheDocument();
  });

  it("switches to Learning section on click", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Learning/i }));

    expect(screen.getByRole("button", { name: /Learning/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Learning Preferences")).toBeInTheDocument();
    expect(screen.getByLabelText("Daily study goal")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Toggle auto-advance on correct answer"),
    ).toBeInTheDocument();
  });

  it("toggles a switch in the Learning section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Learning/i }));

    const toggle = screen.getByLabelText(
      "Toggle auto-advance on correct answer",
    );
    const checkbox = toggle.querySelector("input[type='checkbox']");
    expect(checkbox).toBeChecked();

    await user.click(toggle);
    expect(checkbox).not.toBeChecked();
  });

  it("shows the FSRS note in Smart Review section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Smart Review/i }));

    expect(screen.getByText(/FSRS-powered scheduling/i)).toBeInTheDocument();
    expect(screen.getByLabelText("New cards per day")).toBeInTheDocument();
  });

  it("shows the Notifications section with toggles", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Notifications/i }));

    expect(screen.getByLabelText("Toggle daily reminder")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle streak alerts")).toBeInTheDocument();
    expect(screen.getByText(/OS-level notifications/i)).toBeInTheDocument();
  });

  it("saves pronunciation settings changes", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Pronunciation/i }));
    await user.selectOptions(
      await screen.findByLabelText("Default pronunciation accent"),
      "uk",
    );

    expect(invokeMock).toHaveBeenCalledWith("update_pronunciation_settings", {
      input: {
        audioAutoplay: true,
        pronunciationAccent: "uk",
        pronunciationSpeed: 1,
        audioPriority: "local_first",
        audioFallbackBehavior: "browser_tts",
      },
    });
  });

  it("shows the Backup section with import/export controls", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Backup/i }));

    expect(
      await screen.findByRole("button", { name: "Export JSON" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeDisabled();
    expect(screen.getByLabelText("Deck to export")).toBeInTheDocument();
    expect(screen.getByLabelText("Export JSON path")).toBeInTheDocument();
    expect(screen.getByText("Backup & Restore")).toBeInTheDocument();
    expect(screen.getByText("Backup History")).toBeInTheDocument();
    expect(screen.getByText(/headword, part_of_speech/i)).toBeInTheDocument();
  });

  it("runs a dev/test update check from Settings", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Updates/i }));
    await user.click(screen.getByRole("button", { name: "Check Updates" }));

    expect(invokeMock).toHaveBeenCalledWith("check_app_update", {
      input: { mode: "test" },
    });
    expect(invokeMock).toHaveBeenCalledWith("check_content_updates", {
      input: { mode: "test", manifestPath: null },
    });
    expect(
      await screen.findByText(/Lexora is up to date/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Starter US English audio")).toBeInTheDocument();
    expect(screen.getAllByText("manual audio").length).toBeGreaterThan(0);
  });

  it("creates a manual backup from Backup section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Backup/i }));
    await user.click(
      await screen.findByRole("button", { name: "Create Backup" }),
    );

    expect(invokeMock).toHaveBeenCalledWith("create_backup", {
      input: {
        filePath: null,
        note: null,
        includeContent: true,
        overwrite: false,
      },
    });
    expect(
      await screen.findByText(/Created manual backup at C:\\Backups/i),
    ).toBeInTheDocument();
  });

  it("validates and restores a backup with confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Backup/i }));
    await user.type(
      await screen.findByLabelText("Restore backup path"),
      "C:\\Backups\\lexora-manual.lexora-backup.json",
    );
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(invokeMock).toHaveBeenCalledWith("validate_backup", {
      filePath: "C:\\Backups\\lexora-manual.lexora-backup.json",
    });
    expect(
      await screen.findByText(
        /Backup is compatible with this Lexora database/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Confirm restore"));
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith("restore_backup", {
      input: {
        filePath: "C:\\Backups\\lexora-manual.lexora-backup.json",
        confirmRestore: true,
        createSafetyBackup: true,
      },
    });
    expect(await screen.findByText(/Restored backup at/i)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("exports deck JSON from Backup section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Backup/i }));
    await user.click(
      await screen.findByRole("button", { name: "Export JSON" }),
    );

    expect(invokeMock).toHaveBeenCalledWith("export_deck_to_json", {
      deckId: 1,
      filePath: null,
      overwrite: false,
    });
    expect(
      await screen.findByText(/Exported 5 words to C:\\Exports/i),
    ).toBeInTheDocument();
  });

  it("imports deck JSON from Backup section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Backup/i }));
    await user.type(
      screen.getByLabelText("Import JSON path"),
      "C:\\Imports\\deck.lexora-deck.json",
    );
    await user.click(screen.getByRole("button", { name: "Import JSON" }));

    expect(invokeMock).toHaveBeenCalledWith("import_deck_from_json", {
      filePath: "C:\\Imports\\deck.lexora-deck.json",
    });
    expect(
      await screen.findByText(/Imported 5 words into everyday-actions-import/i),
    ).toBeInTheDocument();
  });

  // ── Owner-only Data Studio entry ────────────────────────────────────────────

  it("owner sees the Data Studio nav entry", () => {
    renderSettings("owner");
    expect(
      screen.getByRole("button", { name: /data studio/i }),
    ).toBeInTheDocument();
  });

  it("learner does not see the Data Studio nav entry", () => {
    renderSettings("learner");
    expect(
      screen.queryByRole("button", { name: /data studio/i }),
    ).not.toBeInTheDocument();
  });

  it("unauthenticated user does not see the Data Studio nav entry", () => {
    renderSettings();
    expect(
      screen.queryByRole("button", { name: /data studio/i }),
    ).not.toBeInTheDocument();
  });
});
