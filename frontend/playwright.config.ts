import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E config. Uses the system Google Chrome (`channel: "chrome"`) because
 * Playwright's bundled Chromium has no build for this OS. Reuses an already
 * running dev server if present, else starts one. The backend must be reachable
 * at NEXT_PUBLIC_API_URL for data-driven flows.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
