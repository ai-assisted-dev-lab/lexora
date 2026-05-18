import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsPage } from "@/pages/SettingsPage";

afterEach(cleanup);

describe("SettingsPage", () => {
  it("renders all six section nav buttons", () => {
    render(<SettingsPage />);

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    for (const label of [
      "Account",
      "Learning",
      "Smart Review",
      "Pronunciation",
      "Notifications",
      "Backup",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
    expect(nav).toBeInTheDocument();
  });

  it("shows Account section by default", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("button", { name: /Account/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByText("English ↔ Vietnamese")).toBeInTheDocument();
  });

  it("switches to Learning section on click", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Learning/i }));

    expect(
      screen.getByRole("button", { name: /Learning/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Learning Preferences")).toBeInTheDocument();
    expect(screen.getByLabelText("Daily study goal")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Toggle auto-advance on correct answer"),
    ).toBeInTheDocument();
  });

  it("toggles a switch in the Learning section", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Learning/i }));

    const toggle = screen.getByLabelText(
      "Toggle auto-advance on correct answer",
    );
    const checkbox = toggle.querySelector("input[type='checkbox']");
    expect(checkbox).toBeChecked();

    await user.click(toggle);
    expect(checkbox).not.toBeChecked();
  });

  it("shows the FSRS note in Smart Review section", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Smart Review/i }));

    expect(screen.getByText(/FSRS-powered scheduling/i)).toBeInTheDocument();
    expect(screen.getByLabelText("New cards per day")).toBeInTheDocument();
  });

  it("shows the Notifications section with toggles", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Notifications/i }));

    expect(
      screen.getByLabelText("Toggle daily reminder"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Toggle streak alerts"),
    ).toBeInTheDocument();
    expect(screen.getByText(/OS-level notifications/i)).toBeInTheDocument();
  });

  it("shows the Backup section with disabled action buttons", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /Backup/i }));

    expect(
      screen.getByRole("button", { name: "Back Up Now" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Export Data" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Export format")).toBeInTheDocument();
  });
});
