import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "de-CH",
    extraHTTPHeaders: { "accept-language": "de-CH,de;q=0.9,en;q=0.5" },
  },
  timeout: 60_000,
  projects: [{ name: "iphone-14", use: { ...devices["iPhone 14"] } }],
  webServer: {
    command: `NEXT_DIST_DIR=.next-e2e npm run dev -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
