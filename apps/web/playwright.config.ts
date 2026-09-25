import { defineConfig } from "@playwright/test";

const PORT = process.env.E2E_WEB_PORT ?? "3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node e2e/support/launch-next.mjs",
    // 401 (unauth) confirms the in-process Hono API validated its env and is
    // serving /api routes; a bad env answers 503 and lf-health only probes an
    // optional standalone API on :8787, so neither is a suitable ready gate.
    url: `http://localhost:${PORT}/api/budgets/current`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});