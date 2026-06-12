import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Auth-aware smoke: the app is gated, so every protected route now redirects to
 * /login unless a session cookie is present. We register a fresh user, then
 * assert the primary routes render the shell with no runtime errors. Still
 * data-agnostic — no seeded data assumptions.
 */

const ROUTES = ["/", "/files", "/artifact-types", "/templates", "/skills"];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });
  return errors;
}

function freshEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
}

/** Register a brand-new account; resolves once the app shell is visible. */
async function registerFreshUser(page: Page): Promise<string> {
  const email = freshEmail();
  await page.goto("/register", { waitUntil: "load" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("secret12345");
  await page.getByRole("button", { name: /create account|crea account/i }).click();
  await expect(page.getByRole("link", { name: "AI Planner" })).toBeVisible({ timeout: 15000 });
  return email;
}

test("unauthenticated visitor is redirected to login", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("register, land in the app, then sign out", async ({ page }) => {
  const email = await registerFreshUser(page);
  // Session persists across a reload.
  await page.reload({ waitUntil: "load" });
  await expect(page.getByRole("link", { name: "AI Planner" })).toBeVisible();

  // The profile trigger's accessible name is the user's email. Open it and sign out.
  await page.getByRole("button", { name: email }).first().click();
  await page.getByRole("menuitem", { name: /sign out|esci/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("primary routes render without errors once authenticated", async ({ page }) => {
  const errors = collectErrors(page);
  await registerFreshUser(page);

  for (const route of ROUTES) {
    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status() ?? 0).toBeLessThan(400);
    await expect(page.getByRole("link", { name: "AI Planner" })).toBeVisible();
    await page.waitForTimeout(800);
  }

  expect(errors, errors.join("\n")).toEqual([]);
});
