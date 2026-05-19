import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/store/authContext";

import { routeTree } from "./index";
import { getPageLabel, ROUTE_CONFIGS } from "./routes";

/* ── Mock Tauri window API ───────────────────────────────────────────── */

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
    ["/achievements", "Achievements"],
    ["/settings", "Account"],
    ["/profile", "Minh"],
    ["/weak-words", "Weak Words"],
    ["/study/session", "Study Session"],
    ["/library/deck-123", "Deck Detail"],
    ["/word/hello", "Word Detail"],
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
