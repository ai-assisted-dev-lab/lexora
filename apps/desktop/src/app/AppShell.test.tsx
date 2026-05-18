import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

function renderShell(ui: React.ReactNode = null, path = "/discover") {
  return render(
    <MemoryRouter initialEntries={[path]}>{ui ?? <AppShell />}</MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("renders the title bar banner landmark", () => {
    renderShell();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the sidebar navigation", () => {
    renderShell();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("renders all primary nav items", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toHaveTextContent("Discover");
    expect(nav).toHaveTextContent("My Library");
    expect(nav).toHaveTextContent("Review");
    expect(nav).toHaveTextContent("Stats");
    expect(nav).toHaveTextContent("Achievements");
    expect(nav).toHaveTextContent("Settings");
  });

  it("renders the main content region", () => {
    renderShell();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders children inside the main content area", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <AppShell>
          <p>Test child content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Test child content")).toBeInTheDocument();
  });

  it("renders the right panel by default", () => {
    renderShell();
    expect(
      screen.getByRole("complementary", { name: "Widgets" }),
    ).toBeInTheDocument();
  });

  it("hides the right panel when showRightPanel is false", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <AppShell showRightPanel={false} />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("complementary", { name: "Widgets" }),
    ).not.toBeInTheDocument();
  });

  it("renders the search input in the header", () => {
    renderShell();
    expect(
      screen.getByRole("searchbox", { name: "Search words, decks, topics" }),
    ).toBeInTheDocument();
  });
});
