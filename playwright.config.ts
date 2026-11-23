import { defineConfig } from '@playwright/test'

// End-to-end checks run against the production build served by `vite preview`.
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173/imperial-kotlin-prep/',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/imperial-kotlin-prep/',
    reuseExistingServer: !process.env.CI,
  },
})
