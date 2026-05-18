import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";

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

describe("AppShell", () => {
  it("renders the title bar banner landmark", () => {
    render(<AppShell />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the sidebar navigation", () => {
    render(<AppShell />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("renders all primary nav items", () => {
    render(<AppShell />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toHaveTextContent("Discover");
    expect(nav).toHaveTextContent("My Library");
    expect(nav).toHaveTextContent("Review");
    expect(nav).toHaveTextContent("Stats");
    expect(nav).toHaveTextContent("Achievements");
    expect(nav).toHaveTextContent("Settings");
  });

  it("renders the main content region", () => {
    render(<AppShell />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders children inside the main content area", () => {
    render(
      <AppShell>
        <p>Test child content</p>
      </AppShell>,
    );
    expect(screen.getByText("Test child content")).toBeInTheDocument();
  });

  it("renders the right panel by default", () => {
    render(<AppShell />);
    expect(
      screen.getByRole("complementary", { name: "Widgets" }),
    ).toBeInTheDocument();
  });

  it("hides the right panel when showRightPanel is false", () => {
    render(<AppShell showRightPanel={false} />);
    expect(
      screen.queryByRole("complementary", { name: "Widgets" }),
    ).not.toBeInTheDocument();
  });

  it("renders the search input in the header", () => {
    render(<AppShell />);
    expect(
      screen.getByRole("searchbox", { name: "Search decks and words" }),
    ).toBeInTheDocument();
  });
});
