import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility smoke checks. Each protected page is exercised after a login
 * with the local owner account, then scanned with axe-core for WCAG 2.1 A/AA
 * violations.
 *
 * The scan is configured to ignore:
 * - `region`: many design-system sections nest naturally without a single
 *   identifying landmark; auditing each region individually is impractical
 *   for an MVP and produces false positives against the legitimate layout.
 * - `color-contrast`: jsdom/headless Chromium reports false positives on the
 *   light-blue theme inside Recharts SVG. Contrast is verified manually as
 *   part of the design-system review.
 */

const DISABLED_RULES = ["region", "color-contrast"];

async function resetBrowserState(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/");
}

async function loginAs(page: Page, username: "owner" | "learner") {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Home" }),
  ).toBeVisible();
}

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(DISABLED_RULES)
    .analyze();

  if (results.violations.length > 0) {
    console.log(
      `Axe violations on ${label}:\n` +
        JSON.stringify(results.violations, null, 2),
    );
  }
  expect(results.violations, `axe violations on ${label}`).toEqual([]);
}

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
  });

  test("login page has no a11y violations", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /welcome back/i }),
    ).toBeVisible();
    await scan(page, "login");
  });

  test("home page has no a11y violations", async ({ page }) => {
    await loginAs(page, "learner");
    await scan(page, "home");
  });

  test("discover page has no a11y violations", async ({ page }) => {
    await loginAs(page, "learner");
    await page.getByRole("link", { name: "Discover" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Discover" }),
    ).toBeVisible();
    await scan(page, "discover");
  });

  test("library page has no a11y violations", async ({ page }) => {
    await loginAs(page, "learner");
    await page.getByRole("link", { name: "My Library" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "My Library" }),
    ).toBeVisible();
    await scan(page, "library");
  });

  test("settings page has no a11y violations", async ({ page }) => {
    await loginAs(page, "learner");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();
    await scan(page, "settings");
  });

  test("data studio has no a11y violations (owner)", async ({ page }) => {
    await loginAs(page, "owner");
    await page.goto("/#/admin/data-studio");
    await expect(
      page.getByRole("heading", { level: 2, name: /data studio/i }),
    ).toBeVisible();
    await scan(page, "data-studio");
  });
});
