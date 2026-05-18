import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TitleBar } from "./TitleBar";

/* ── Mock Tauri window API ───────────────────────────────────────────── */

const mockWindow = {
  minimize: vi.fn().mockResolvedValue(undefined),
  maximize: vi.fn().mockResolvedValue(undefined),
  unmaximize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  isMaximized: vi.fn().mockResolvedValue(false),
  onResized: vi.fn().mockResolvedValue(() => undefined),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => mockWindow,
}));

/* ── Tests ───────────────────────────────────────────────────────────── */

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockWindow.isMaximized.mockResolvedValue(false);
});

describe("TitleBar", () => {
  it("renders the Lexora wordmark", () => {
    render(<TitleBar />);
    expect(screen.getByText("Lexora")).toBeInTheDocument();
  });

  it("renders all three window control buttons", () => {
    render(<TitleBar />);
    expect(
      screen.getByRole("button", { name: "Minimize" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Maximize" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls minimize when Minimize is clicked", async () => {
    const user = userEvent.setup();
    render(<TitleBar />);
    await user.click(screen.getByRole("button", { name: "Minimize" }));
    expect(mockWindow.minimize).toHaveBeenCalledOnce();
  });

  it("calls maximize when Maximize is clicked and not maximized", async () => {
    const user = userEvent.setup();
    render(<TitleBar />);
    await user.click(screen.getByRole("button", { name: "Maximize" }));
    expect(mockWindow.maximize).toHaveBeenCalledOnce();
    expect(mockWindow.unmaximize).not.toHaveBeenCalled();
  });

  it("calls unmaximize when Restore is clicked while maximized", async () => {
    mockWindow.isMaximized.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<TitleBar />);
    // Wait for isMaximized to resolve and update state
    const restoreBtn = await screen.findByRole("button", { name: "Restore" });
    await user.click(restoreBtn);
    expect(mockWindow.unmaximize).toHaveBeenCalledOnce();
    expect(mockWindow.maximize).not.toHaveBeenCalled();
  });

  it("calls close when Close is clicked", async () => {
    const user = userEvent.setup();
    render(<TitleBar />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(mockWindow.close).toHaveBeenCalledOnce();
  });

  it("has a drag region element", () => {
    render(<TitleBar />);
    const drag = document.querySelector("[data-tauri-drag-region]");
    expect(drag).toBeInTheDocument();
  });
});
