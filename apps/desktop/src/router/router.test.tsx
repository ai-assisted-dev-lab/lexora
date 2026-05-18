import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function renderRoute(path: string) {
  const testRouter = createMemoryRouter(routeTree, { initialEntries: [path] });
  render(<RouterProvider router={testRouter} />);
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
 * Each PlaceholderPage renders an <h2> with the page title. Querying by
 * role + level avoids matching the sidebar <a> or the header <h1> which
 * also display the same label.
 */

describe("Route smoke tests", () => {
  const shellRoutes: [string, string][] = [
    ["/home", "Expand words. Expand your world."],
    ["/discover", "Discover"],
    ["/library", "My Library"],
    ["/review", "Review"],
    ["/stats", "Stats"],
    ["/achievements", "Achievements"],
    ["/settings", "Settings"],
    ["/profile", "Profile"],
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
    renderRoute("/login");
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
