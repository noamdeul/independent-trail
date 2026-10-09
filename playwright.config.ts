import { defineConfig } from '@playwright/test'

// Runs against the production build served under /independent-trail/,
// in a 375px-wide mobile viewport. CHROMIUM_PATH lets you point at a
// preinstalled browser instead of running `npx playwright install`.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/independent-trail/',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'he-IL',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://localhost:4173/independent-trail/',
    reuseExistingServer: !process.env.CI,
  },
})
