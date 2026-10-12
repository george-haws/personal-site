import { defineConfig } from "@playwright/test";
import { profiles } from "./src/lib/layout-checks";

// CI is read in exactly five places below: channel, retries, trace,
// reuseExistingServer, forbidOnly. Nothing else branches on environment.
const ci = Boolean(process.env.CI);
const baseURL = "http://localhost:8787";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL,
    // Local runs use the installed Chrome, like the resume printer. CI installs
    // Playwright's Chromium and leaves the channel unset.
    channel: ci ? undefined : "chrome",
    trace: ci ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  // browserName is explicit so no device descriptor can pull in WebKit.
  projects: profiles.map((profile) => ({
    name: profile.name,
    use: { browserName: "chromium" as const, ...profile.options },
  })),
  // The build runs before this config loads (see the test:e2e script), so the
  // server only serves. wrangler dev reads out/ from disk, which is why reusing a
  // running server is safe locally (verified in Task 5, Step 6).
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !ci,
  },
});
