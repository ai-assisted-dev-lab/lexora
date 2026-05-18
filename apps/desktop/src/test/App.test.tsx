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
