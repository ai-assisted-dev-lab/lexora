import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";

function Harness() {
  const toast = useToast();
  return (
    <div>
      <button
        onClick={() =>
          toast.push({
            title: "Saved",
            description: "Profile updated",
            variant: "success",
          })
        }
      >
        push success
      </button>
      <button
        onClick={() =>
          toast.push({
            description: "Something failed",
            variant: "error",
          })
        }
      >
        push error
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders pushed toasts with proper role and aria-live", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("push success"));
    fireEvent.click(screen.getByText("push error"));

    const viewport = screen.getByLabelText("Notifications");
    expect(within(viewport).getByText("Saved")).toBeInTheDocument();
    expect(within(viewport).getByText("Profile updated")).toBeInTheDocument();

    const errorToast = within(viewport).getByRole("alert");
    expect(errorToast).toHaveAttribute("aria-live", "assertive");
    expect(
      within(errorToast).getByText("Something failed"),
    ).toBeInTheDocument();
  });

  it("auto-dismisses toasts after the configured duration", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("push success"));
    const viewport = screen.getByLabelText("Notifications");
    expect(within(viewport).getByText("Saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByLabelText("Notifications")).not.toBeInTheDocument();
  });

  it("dismisses a toast on user action", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("push error"));
    const viewport = screen.getByLabelText("Notifications");
    expect(within(viewport).getByText("Something failed")).toBeInTheDocument();
    fireEvent.click(within(viewport).getByLabelText("Dismiss notification"));
    expect(screen.queryByLabelText("Notifications")).not.toBeInTheDocument();
  });
});
