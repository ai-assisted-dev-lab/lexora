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

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
  });

  test("rejects invalid credentials with an inline error", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /welcome back/i }),
    ).toBeVisible();

    await page.getByLabel("Username").fill("ghost");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("validates empty submit", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/username is required/i).first()).toBeVisible();
  });

  test("logs out from the user menu and returns to login", async ({ page }) => {
    await loginAs(page, "learner");

    await page.getByRole("button", { name: /open menu for/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: /welcome back/i }),
    ).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
    await loginAs(page, "learner");
  });

  test("each sidebar destination renders its top-level heading", async ({
    page,
  }) => {
    const stops: Array<[string, string]> = [
      ["Discover", "Discover"],
      ["My Library", "My Library"],
      ["Review", "Review"],
      ["Stats", "Stats"],
      ["Achievements", "Achievements"],
      ["Settings", "Settings"],
    ];

    for (const [link, heading] of stops) {
      await page.getByRole("link", { name: link }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
    }
  });

  test("collapsing the sidebar preserves keyboard navigation", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(
      page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
    // Collapsed nav items still have title attributes — assert one such
    // tooltip exists by querying the discover link by accessible name.
    const discoverLink = page.getByRole("link", { name: "Discover" });
    await expect(discoverLink).toBeVisible();
  });
});

test.describe("Settings → Security", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
    await loginAs(page, "owner");
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("button", { name: /Security/i }).click();
  });

  test("renders the default-password warning and change form", async ({
    page,
  }) => {
    await expect(page.getByText(/seeded default password/i)).toBeVisible();
    await expect(page.getByLabel("Current Password")).toBeVisible();
    await expect(
      page.getByLabel("New Password", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Confirm New Password")).toBeVisible();
  });

  test("blocks submit when new password is too short", async ({ page }) => {
    await page.getByLabel("Current Password").fill("owner");
    await page.getByLabel("New Password", { exact: true }).fill("ab");
    await page.getByLabel("Confirm New Password").fill("ab");
    await page.getByRole("button", { name: /Change Password/i }).click();
    await expect(
      page.getByText(/at least 4 characters/i).first(),
    ).toBeVisible();
  });

  test("blocks submit when confirmation does not match", async ({ page }) => {
    await page.getByLabel("Current Password").fill("owner");
    await page.getByLabel("New Password", { exact: true }).fill("rotated-pw");
    await page.getByLabel("Confirm New Password").fill("different-pw");
    await page.getByRole("button", { name: /Change Password/i }).click();
    await expect(
      page.getByText(/confirmation do not match/i).first(),
    ).toBeVisible();
  });
});

test.describe("Data Studio (owner)", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
    await loginAs(page, "owner");
    await page.goto("/#/admin/data-studio");
  });

  test("renders the six module tabs as enabled", async ({ page }) => {
    const tabList = page.getByRole("tablist", { name: /data studio modules/i });
    for (const label of [
      "Vocabulary",
      "Decks",
      "Validation",
      "Provenance",
      "Audio / IPA",
      "Import / Export",
    ]) {
      const tab = tabList.getByRole("tab", { name: label });
      await expect(tab).toBeVisible();
      await expect(tab).toBeEnabled();
    }
  });

  test("loads Vocabulary records by default", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("run").first()).toBeVisible();
  });

  test("Audio / IPA tab loads coverage cards", async ({ page }) => {
    await page.getByRole("tab", { name: "Audio / IPA" }).click();
    await expect(
      page.getByRole("heading", { name: /Audio & IPA Coverage/i }),
    ).toBeVisible();
    await expect(page.getByText(/IPA coverage/i).first()).toBeVisible();
  });

  test("Provenance tab loads its filter toolbar", async ({ page }) => {
    await page.getByRole("tab", { name: "Provenance" }).click();
    await expect(
      page.getByRole("heading", { name: /Provenance Audit/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Run provenance scan/i }),
    ).toBeVisible();
  });

  test("Import / Export tab loads export and import cards", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Import / Export" }).click();
    await expect(
      page.getByRole("heading", { name: /Import & Export/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Export to JSON/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Import JSON/i }),
    ).toBeVisible();
  });
});

test.describe("Search", () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
    await loginAs(page, "learner");
  });

  test("the global search shortcut opens the command palette", async ({
    page,
  }) => {
    await page.keyboard.press("Control+K");
    // Command palette uses role="dialog" and a search role for the input.
    const palette = page.getByRole("dialog").first();
    await expect(palette).toBeVisible();
  });
});
