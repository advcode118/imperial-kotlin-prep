import { defineConfig } from '@playwright/test'

// End-to-end checks run against the production build served by `vite preview`.
// Set BASE_URL to run the same suite against a deployed copy instead.
const LOCAL = 'http://localhost:4173/imperial-kotlin-prep/'
const remote = process.env.BASE_URL
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: remote ?? LOCAL,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: remote
    ? undefined
    : {
        command: 'npx vite preview --port 4173 --strictPort',
        url: LOCAL,
        reuseExistingServer: !process.env.CI,
      },
})
