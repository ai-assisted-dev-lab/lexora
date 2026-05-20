import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;
const isE2E = process.env.VITE_LEXORA_E2E === "1";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      ...(isE2E
        ? {
            "@tauri-apps/api/core": fileURLToPath(
              new URL("./src/test/e2eTauriCoreMock.ts", import.meta.url),
            ),
            "@tauri-apps/api/window": fileURLToPath(
              new URL("./src/test/e2eTauriWindowMock.ts", import.meta.url),
            ),
          }
        : {}),
    },
  },

  // Tauri: prevent vite from obscuring rust errors
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // tell vite to ignore watching src-tauri
      ignored: ["**/src-tauri/**"],
    },
  },

  // expose VITE_ and TAURI_ENV_* env vars to the frontend
  envPrefix: ["VITE_", "TAURI_ENV_*"],

  build: {
    // Tauri uses Chromium on Windows; target the supported version
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
