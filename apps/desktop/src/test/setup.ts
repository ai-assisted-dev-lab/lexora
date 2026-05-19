import "@testing-library/jest-dom/vitest";

// React Router v7 uses the Fetch API internally for client-side navigation.
// jsdom's AbortSignal is incompatible with Node's undici implementation,
// producing unhandled rejections that do not affect test correctness.
process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason instanceof TypeError &&
    typeof reason.message === "string" &&
    reason.message.includes("AbortSignal")
  ) {
    return;
  }
  throw reason;
});

// Recharts uses ResizeObserver to determine container dimensions.
// Provide a minimal mock that synchronously reports 800×300 to the callback
// so charts render in jsdom without errors.
class MockResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 300,
            top: 0,
            left: 0,
            right: 800,
            bottom: 300,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
(global as unknown as Record<string, unknown>).ResizeObserver =
  MockResizeObserver;
