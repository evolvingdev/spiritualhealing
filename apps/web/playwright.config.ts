import { defineConfig } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const API_READY_URL = 'http://127.0.0.1:3001/api/health/ready';
const SERVER_START_TIMEOUT_MS = 180_000;

/**
 * End-to-end tests against the real local stack: Supabase (`pnpm supabase:start`, then
 * `pnpm db:setup:local`), the built API and the web app. Emails are read from Mailpit.
 * Serial on purpose: the flows share one Supabase and its per-IP rate limits.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    // The installed Chrome, so the suite needs no separate browser download.
    channel: 'chrome',
    locale: 'en-IN',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node --env-file=.env dist/main.js',
      cwd: '../api',
      url: API_READY_URL,
      reuseExistingServer: true,
      timeout: SERVER_START_TIMEOUT_MS,
    },
    {
      // The dev server: a production build refuses plain-http URLs, as it should.
      command: 'pnpm exec next dev --port 3000',
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: SERVER_START_TIMEOUT_MS,
    },
  ],
});
