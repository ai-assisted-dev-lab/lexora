import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ when }: { when: boolean }): JSX.Element {
  if (when) throw new Error("kaboom");
  return <p>safe</p>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom when={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("renders default fallback when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom when={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it("invokes onError when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom when={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    errorSpy.mockRestore();
  });

  it("renders custom fallback and resets to the latest children on retry", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <div>
          <button onClick={() => setExplode(false)}>fix</button>
          <ErrorBoundary
            fallback={(error, reset) => (
              <div>
                <span>caught: {error.message}</span>
                <button onClick={reset}>retry</button>
              </div>
            )}
          >
            <Boom when={explode} />
          </ErrorBoundary>
        </div>
      );
    }

    render(<Harness />);
    expect(screen.getByText(/caught: kaboom/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("fix"));
    fireEvent.click(screen.getByText("retry"));
    expect(screen.getByText("safe")).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
