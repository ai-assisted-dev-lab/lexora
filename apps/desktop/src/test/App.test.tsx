import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";

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

/* ── Mock Tauri IPC (get_current_session returns an authenticated owner) */

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "get_current_session") {
      return Promise.resolve({ userId: 1, username: "owner", role: "owner" });
    }
    return Promise.resolve(undefined);
  }),
}));

afterEach(cleanup);

describe("App", () => {
  it("renders the main navigation sidebar", async () => {
    render(<App />);
    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("renders the title bar", async () => {
    render(<App />);
    expect(await screen.findByRole("banner")).toBeInTheDocument();
  });
});
