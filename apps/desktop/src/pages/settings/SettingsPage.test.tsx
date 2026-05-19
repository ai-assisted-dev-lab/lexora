import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AuthContext, type AuthContextValue } from "@/store/authContext";
import { SettingsPage } from "@/pages/SettingsPage";

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

  it("renders all six section nav buttons", () => {
    renderSettings();

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    for (const label of [
      "Account",
      "Learning",
      "Smart Review",
      "Pronunciation",
      "Notifications",
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
    expect(screen.getByText(/headword, part_of_speech/i)).toBeInTheDocument();
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
