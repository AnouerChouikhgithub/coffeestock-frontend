import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end configuration: the real Vite dev server in front of the real
 * Symfony API, backed by a disposable PostgreSQL database.
 *
 * Nothing here is mocked. The database is reset and migrated by global-setup, and
 * both servers are started (and stopped) by Playwright.
 *
 * Prerequisites:
 *   docker compose up -d database          # in ../coffeestock-backend
 *   npx playwright install chromium
 *
 * Run with: npm run test:e2e
 */
const APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? 'http://localhost:5173'
const API_ORIGIN = process.env.E2E_API_ORIGIN ?? 'http://127.0.0.1:8000'
const PHP_BIN = process.env.PHP_BIN ?? 'C:/xampp/php/php.exe'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // The suite shares one database and seeds data through the UI, so it runs in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: APP_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // e2e-server.php boots the 'e2e' environment deterministically (see its
      // header): public/index.php goes through symfony/runtime, which resolves
      // APP_ENV from the generated .env.local.php and would silently run against
      // the test or dev database.
      command: `"${PHP_BIN}" -S 127.0.0.1:8000 e2e-server.php`,
      cwd: '../coffeestock-backend',
      url: `${API_ORIGIN}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      // APP_ENV=e2e reads ../coffeestock-backend/.env.e2e (dedicated database and
      // its own container cache), so the run never touches the dev environment.
      env: {
        APP_ENV: 'e2e',
      },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: APP_ORIGIN,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        VITE_API_BASE_URL: `${API_ORIGIN}/api`,
      },
    },
  ],
})
