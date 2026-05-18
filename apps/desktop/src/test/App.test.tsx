import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";

/* ── Mock Tauri window API (required because App renders TitleBar) ─────── */

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
  it("renders the splash wordmark", () => {
    render(<App />);
    // App renders "Lexora" in both TitleBar and the splash — target the splash
    expect(
      screen.getByText("Lexora", { selector: ".wordmark" }),
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<App />);
    expect(
      screen.getByText("Premium vocabulary learning platform"),
    ).toBeInTheDocument();
  });
});
