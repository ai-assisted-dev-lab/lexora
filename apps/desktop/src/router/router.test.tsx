import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/store/authContext";

import { routeTree } from "./index";
import { getPageLabel, ROUTE_CONFIGS } from "./routes";

/* ── Mock Tauri APIs ─────────────────────────────────────────────────── */

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => undefined),
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "list_discover_decks") {
      return Promise.resolve({ decks: [], total: 0 });
    }
    if (cmd === "list_library_decks") {
      return Promise.resolve({
        decks: [
          {
            id: 1,
            slug: "everyday-actions",
            title: "Everyday Actions",
            description: "Essential daily verbs",
            level: "beginner",
            wordCount: 5,
            tags: ["verbs"],
            packName: "English Essentials",
            packSlug: "english-essentials",
            installedAt: "2026-01-01T00:00:00Z",
            masteredCount: 0,
            dueCount: 0,
            accuracy: 0,
            lastStudied: null,
            progress: 0,
          },
        ],
        total: 1,
      });
    }
    if (cmd === "get_deck_detail") {
      return Promise.resolve({
        id: 1,
        slug: "everyday-actions",
        title: "Everyday Actions",
        description: "Essential daily verbs",
        level: "beginner",
        wordCount: 5,
        tags: ["verbs"],
        packName: "English Essentials",
        packSlug: "english-essentials",
        banner: null,
        installed: true,
        installedAt: "2026-01-01T00:00:00Z",
        progress: {
          masteredCount: 0,
          dueCount: 0,
          accuracy: 0,
          lastStudied: null,
          progress: 0,
        },
        words: [],
      });
    }
    if (cmd === "get_word_detail") {
      return Promise.resolve({
        id: 1,
        headword: "hello",
        partOfSpeech: "interjection",
        ipaUk: null,
        ipaUs: null,
        frequencyRank: null,
        cefrLevel: "A1",
        packName: "English Essentials",
        packSlug: "english-essentials",
        senses: [
          {
            id: 1,
            senseIndex: 0,
            definitionEn: "A greeting.",
            definitionVi: "Xin chao.",
            register: null,
            domain: null,
            examples: [],
          },
        ],
        pronunciations: [],
        relations: [],
        reviewState: null,
        reviewHistory: [],
      });
    }
    if (cmd === "get_pronunciation_settings") {
      return Promise.resolve({
        userId: 1,
        audioAutoplay: true,
        pronunciationAccent: "us",
        pronunciationSpeed: 1,
        audioPriority: "local_first",
        audioFallbackBehavior: "browser_tts",
        updatedAt: "2026-01-01T00:00:00Z",
      });
    }
    if (cmd === "start_flashcard_session") {
      return Promise.resolve({
        sessionId: 1,
        userId: 1,
        deckId: null,
        mode: "flashcard",
        startedAt: "2026-01-01T00:00:00Z",
        endedAt: null,
        totalItems: 0,
        reviewedCount: 0,
        correctCount: 0,
        againCount: 0,
        hardCount: 0,
        goodCount: 0,
        easyCount: 0,
        queue: {
          userId: 1,
          deckId: null,
          mode: "smart_review",
          generatedAt: "2026-01-01T00:00:00Z",
          summary: {
            dueCount: 0,
            weakCount: 0,
            newCount: 0,
            requestedLength: 20,
            returnedLength: 0,
          },
          items: [],
        },
      });
    }
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

const ownerAuth: AuthContextValue = {
  user: { userId: 1, username: "owner", role: "owner" },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
};

function renderRoute(path: string, auth: AuthContextValue = ownerAuth) {
  const testRouter = createMemoryRouter(routeTree, { initialEntries: [path] });
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={testRouter} />
    </AuthContext.Provider>,
  );
}

/* ── Route metadata ──────────────────────────────────────────────────── */

describe("Route metadata", () => {
  it("admin/data-studio requires owner role", () => {
    const route = ROUTE_CONFIGS.find((r) => r.path === "/admin/data-studio");
    expect(route?.requiresOwner).toBe(true);
  });

  it("admin/data-studio is not shown in the sidebar", () => {
    const route = ROUTE_CONFIGS.find((r) => r.path === "/admin/data-studio");
    expect(route?.showInSidebar).toBe(false);
  });

  it("no owner-only route is visible in the sidebar", () => {
    const exposed = ROUTE_CONFIGS.filter(
      (r) => r.requiresOwner && r.showInSidebar,
    );
    expect(exposed).toHaveLength(0);
  });

  it("getPageLabel returns the correct label for static paths", () => {
    expect(getPageLabel("/home")).toBe("Home");
    expect(getPageLabel("/discover")).toBe("Discover");
    expect(getPageLabel("/library")).toBe("My Library");
    expect(getPageLabel("/review")).toBe("Review");
    expect(getPageLabel("/settings")).toBe("Settings");
    expect(getPageLabel("/admin/data-studio")).toBe("Data Studio");
  });

  it("getPageLabel resolves dynamic segments", () => {
    expect(getPageLabel("/library/abc123")).toBe("Deck Detail");
    expect(getPageLabel("/word/xyz")).toBe("Word Detail");
  });

  it("getPageLabel returns Lexora for unknown paths", () => {
    expect(getPageLabel("/does-not-exist")).toBe("Lexora");
  });
});

/* ── Route smoke tests ───────────────────────────────────────────────── */
/*
 * Each route must render at least one <h2>. Placeholder pages use the page
 * title; real pages use their own first h2 content. Querying by role + level
 * avoids matching the sidebar <a> or the header <h1>.
 */

describe("Route smoke tests", () => {
  const shellRoutes: [string, string][] = [
    ["/home", "Expand words. Expand your world."],
    ["/discover", "Discover"],
    ["/library", "My Library"],
    ["/review", "Review"],
    ["/stats", "Statistics"],
    ["/achievements", "^Achievements$"],
    ["/settings", "Account"],
    ["/profile", "owner"],
    ["/weak-words", "Weak Words"],
    ["/study/session", "Study Session"],
    ["/library/1", "Deck Detail"],
    ["/word/1", "Word Detail"],
    ["/admin/data-studio", "Data Studio"],
  ];

  for (const [path, expectedHeading] of shellRoutes) {
    it(`renders ${path}`, async () => {
      renderRoute(path);
      // PlaceholderPage renders an <h2> — unique among sidebar/header elements
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: new RegExp(expectedHeading, "i"),
        }),
      ).toBeInTheDocument();
    });
  }

  it("renders /login", async () => {
    renderRoute("/login", { ...ownerAuth, user: null });
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /welcome back/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the app shell for the root path /", async () => {
    renderRoute("/");
    // Navigate fires async in jsdom; verify the shell loads without error
    expect(await screen.findByRole("banner")).toBeInTheDocument();
  });

  it("renders Not Found for unknown routes", async () => {
    renderRoute("/this-does-not-exist");
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /page not found/i,
      }),
    ).toBeInTheDocument();
  });
});

/* ── RBAC verification ───────────────────────────────────────────────── */

describe("RBAC route guards", () => {
  const learnerAuth: AuthContextValue = {
    ...ownerAuth,
    user: { userId: 2, username: "learner", role: "learner" },
  };

  it("owner can access /admin/data-studio", async () => {
    renderRoute("/admin/data-studio");
    expect(
      await screen.findByRole("heading", { level: 2, name: /data studio/i }),
    ).toBeInTheDocument();
  });

  it("learner sees Access Denied for /admin/data-studio", async () => {
    renderRoute("/admin/data-studio", learnerAuth);
    expect(
      await screen.findByRole("heading", { level: 2, name: /access denied/i }),
    ).toBeInTheDocument();
  });

  it("unauthenticated user sees the login form", async () => {
    // /login is the destination after ProtectedRoute redirects an unauthenticated user
    renderRoute("/login", { ...ownerAuth, user: null });
    expect(
      await screen.findByRole("heading", { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it("learner can still access normal protected routes", async () => {
    renderRoute("/home", learnerAuth);
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /expand words/i,
      }),
    ).toBeInTheDocument();
  });
});
