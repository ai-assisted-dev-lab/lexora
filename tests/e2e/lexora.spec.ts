import { expect, test, type Page } from "@playwright/test";

async function resetBrowserState(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/");
}

async function loginAs(page: Page, username: "owner" | "learner" = "learner") {
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

test.beforeEach(async ({ page }) => {
  await resetBrowserState(page);
});

test("logs in with the local owner account", async ({ page }) => {
  await loginAs(page, "owner");

  await expect(page).toHaveURL(/#\/home$/);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Expand words. Expand your world.",
    }),
  ).toBeVisible();
});

test("navigates through primary learner sections", async ({ page }) => {
  await loginAs(page, "learner");

  await page.getByRole("link", { name: "Discover" }).click();
  await expect(page).toHaveURL(/#\/discover$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Discover" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Review" }),
  ).toBeVisible();
});

test("completes a flashcard study session", async ({ page }) => {
  await loginAs(page, "learner");

  await page.getByRole("link", { name: "Review" }).click();
  await page.getByRole("link", { name: /start smart review/i }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Flashcard Session" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /flip flashcard for run/i }).click();
  await expect(page.getByText("chay nhanh bang chan")).toBeVisible();
  await page.getByRole("button", { name: /good/i }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Session Summary" }),
  ).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
});

test("denies Data Studio to a normal learner", async ({ page }) => {
  await loginAs(page, "learner");

  await page.goto("/#/admin/data-studio");

  await expect(
    page.getByRole("heading", { level: 2, name: "Access Denied" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /vocabulary/i })).toHaveCount(0);
});
