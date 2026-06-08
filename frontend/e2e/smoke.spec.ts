import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Data-agnostic smoke: every primary route loads, renders the app shell, and
 * throws no uncaught/console errors. Intentionally avoids asserting seeded data
 * so it passes against any backend state.
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

for (const route of ROUTES) {
  test(`route ${route} renders without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status() ?? 0).toBeLessThan(400);

    // App shell is present on every page.
    await expect(page.getByRole("link", { name: "AI Planner" })).toBeVisible();
    // Let client data fetching settle, then assert no runtime errors surfaced.
    await page.waitForTimeout(1500);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
