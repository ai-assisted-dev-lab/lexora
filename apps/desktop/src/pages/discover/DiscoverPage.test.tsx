import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DiscoverPage } from "@/pages/DiscoverPage";

// ── Tauri mock ────────────────────────────────────────────────────────────────

const MOCK_DECKS = [
  {
    id: 1,
    slug: "everyday-actions",
    title: "Everyday Actions",
    description: "Core verbs for daily routines.",
    level: "A1",
    wordCount: 120,
    tags: ["A1", "beginner", "verbs"],
    packName: "Starter Pack",
    packSlug: "starter-pack",
    installed: false,
  },
  {
    id: 2,
    slug: "around-the-house",
    title: "Around the House",
    description: "Household vocabulary with Vietnamese glosses.",
    level: "A1",
    wordCount: 95,
    tags: ["A1", "beginner", "home"],
    packName: "Starter Pack",
    packSlug: "starter-pack",
    installed: false,
  },
  {
    id: 3,
    slug: "greetings-and-social",
    title: "Greetings and Social",
    description: "Phrases for introductions and small talk.",
    level: "A1",
    wordCount: 80,
    tags: ["A1", "beginner", "social"],
    packName: "Starter Pack",
    packSlug: "starter-pack",
    installed: true,
  },
];

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "list_discover_decks") {
      return Promise.resolve({ decks: MOCK_DECKS, total: MOCK_DECKS.length });
    }
    if (cmd === "install_deck" || cmd === "uninstall_deck") {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderAndWait() {
  render(<DiscoverPage />);
  // Wait for the async hook to resolve and decks to render
  await waitFor(() =>
    expect(screen.getAllByText("Everyday Actions").length).toBeGreaterThan(0),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DiscoverPage", () => {
  it("shows loading state initially", () => {
    render(<DiscoverPage />);
    expect(screen.getByLabelText("Loading catalog")).toBeInTheDocument();
  });

  it("renders the hero and deck names after load", async () => {
    await renderAndWait();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Discover focused English-Vietnamese decks.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Everyday Actions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Around the House").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Greetings and Social").length).toBeGreaterThan(0);
  });

  it("renders CEFR and tag filter groups", async () => {
    await renderAndWait();

    expect(screen.getByRole("button", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "beginner" })).toBeInTheDocument();
  });

  it("filters decks by tag", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole("button", { name: "verbs" }));

    expect(screen.getAllByText("Everyday Actions").length).toBeGreaterThan(0);
    expect(screen.queryByText("Around the House")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "verbs" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("tag filter narrows deck list, resetting restores all decks", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // Filter to a single-deck tag
    await user.click(screen.getByRole("button", { name: "verbs" }));
    expect(screen.queryByText("Around the House")).not.toBeInTheDocument();

    // Reset via the Tag group's "All" button (scoped to avoid the CEFR "All")
    const tagGroup = screen.getByText("Tag").closest(".discover-filter-group");
    await user.click(
      within(tagGroup as HTMLElement).getByRole("button", { name: "All" }),
    );
    expect(screen.getAllByText("Around the House").length).toBeGreaterThan(0);
  });

  it("shows 'Installed' button for installed decks", async () => {
    await renderAndWait();

    // deck id=3 (Greetings and Social) is installed; it's not featured so
    // appears only once (in Popular section at index 2 → section="popular")
    const cards = screen
      .getAllByText("Greetings and Social")
      .map((el) => el.closest(".catalog-card"))
      .filter(Boolean) as HTMLElement[];
    expect(cards.length).toBeGreaterThan(0);
    expect(
      within(cards[0]).getByRole("button", { name: /installed/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Add to Library' button for uninstalled decks", async () => {
    await renderAndWait();

    const cards = screen
      .getAllByText("Everyday Actions")
      .map((el) => el.closest(".catalog-card"))
      .filter(Boolean) as HTMLElement[];
    expect(cards.length).toBeGreaterThan(0);
    expect(
      within(cards[0]).getByRole("button", { name: /add to library/i }),
    ).toBeInTheDocument();
  });

  it("clicking 'Add to Library' switches button to 'Installed'", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const cards = screen
      .getAllByText("Everyday Actions")
      .map((el) => el.closest(".catalog-card"))
      .filter(Boolean) as HTMLElement[];
    const card = cards[0];
    const addBtn = within(card).getByRole("button", { name: /add to library/i });

    await user.click(addBtn);

    await waitFor(() =>
      expect(
        within(card).getByRole("button", { name: /installed/i }),
      ).toBeInTheDocument(),
    );
  });

  it("clicking 'Installed' switches button back to 'Add to Library'", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const cards = screen
      .getAllByText("Greetings and Social")
      .map((el) => el.closest(".catalog-card"))
      .filter(Boolean) as HTMLElement[];
    const card = cards[0];
    const installedBtn = within(card).getByRole("button", { name: /installed/i });

    await user.click(installedBtn);

    await waitFor(() =>
      expect(
        within(card).getByRole("button", { name: /add to library/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renders deck word counts", async () => {
    await renderAndWait();

    const cards = screen
      .getAllByText("Everyday Actions")
      .map((el) => el.closest(".catalog-card"))
      .filter(Boolean) as HTMLElement[];
    expect(within(cards[0]).getByText("120 words")).toBeInTheDocument();
  });
});
