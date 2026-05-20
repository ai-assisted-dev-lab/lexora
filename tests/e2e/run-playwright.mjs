import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const desktopRoot = path.join(repoRoot, "apps", "desktop");
const rootRequire = createRequire(import.meta.url);
const desktopRequire = createRequire(path.join(desktopRoot, "package.json"));

process.env.VITE_LEXORA_E2E = "1";

const vitePackagePath = desktopRequire.resolve("vite/package.json");
const vitePath = path.join(
  path.dirname(vitePackagePath),
  "dist",
  "node",
  "index.js",
);
const { createServer } = await import(pathToFileURL(vitePath).href);

const server = await createServer({
  root: desktopRoot,
  configFile: path.join(desktopRoot, "vite.config.ts"),
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
});

let exitCode = 0;

try {
  await server.listen();

  const playwrightCli = rootRequire.resolve("@playwright/test/cli");
  const result = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [playwrightCli, "test", ...process.argv.slice(2)],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          VITE_LEXORA_E2E: "1",
        },
        stdio: "inherit",
      },
    );

    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`Playwright exited with signal ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });

  exitCode = Number(result);
} finally {
  await server.close();
}

process.exit(exitCode);
