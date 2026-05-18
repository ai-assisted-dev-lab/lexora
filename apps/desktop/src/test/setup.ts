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
