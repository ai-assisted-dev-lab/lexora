import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const desktopRoot = path.join(repoRoot, "apps", "desktop");
const outDir = path.join(repoRoot, "docs", "screenshots");
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
const { chromium, expect } = rootRequire("@playwright/test");

async function listenOnAvailablePort() {
  const ports = [1420, 1421, 1422];
  let lastError;

  for (const port of ports) {
    const server = await createServer({
      root: desktopRoot,
      configFile: path.join(desktopRoot, "vite.config.ts"),
      server: {
        host: "127.0.0.1",
        port,
        strictPort: true,
      },
    });

    try {
      await server.listen();
      // Allow Vite to finish dependency optimisation before serving requests.
      await new Promise((r) => setTimeout(r, 4000));
      return { server, port };
    } catch (error) {
      lastError = error;
      await server.close();
    }
  }

  throw lastError;
}

async function loginAs(page, baseUrl, username) {
  await page.goto(baseUrl, { timeout: 60000 });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(baseUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: /welcome back/i }),
  ).toBeVisible();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Home" }),
  ).toBeVisible();
}

async function screenshot(page, name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

const { server, port } = await listenOnAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
let browser;

try {
  await fs.mkdir(outDir, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  await loginAs(page, baseUrl, "learner");
  await screenshot(page, "01_home");

  await page.goto(`${baseUrl}/#/discover`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Discover" }),
  ).toBeVisible();
  await screenshot(page, "02_discover");

  await page.goto(`${baseUrl}/#/library`);
  await expect(
    page.getByText("Your installed learning decks, ready offline."),
  ).toBeVisible();
  await screenshot(page, "03_library");

  await page.goto(`${baseUrl}/#/review`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Review" }),
  ).toBeVisible();
  await screenshot(page, "04_review");

  await page.goto(`${baseUrl}/#/stats`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Stats" }),
  ).toBeVisible();
  await screenshot(page, "05_stats");

  await page.goto(`${baseUrl}/#/achievements`);
  await expect(page.getByText("Your milestones")).toBeVisible();
  await screenshot(page, "06_achievements");

  await page.goto(`${baseUrl}/#/settings`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await screenshot(page, "07_settings");

  console.log(`Screenshots written to ${path.relative(repoRoot, outDir)}`);
} finally {
  if (browser) {
    await browser.close();
  }
  await server.close();
}
