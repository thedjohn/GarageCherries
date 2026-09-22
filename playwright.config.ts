import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Loads the Supabase branch used for E2E testing. These values are set in
// process.env before `next dev` starts, so Next.js's own .env.local loading
// won't override them (Next never overrides vars already present in process.env).
dotenv.config({ path: '.env.test.local' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // CI has shown occasional single-test flakiness with no reproducible local
  // cause (clean 194/194 local runs against the same test DB, twice) -- one
  // retry in CI absorbs that without masking a real failure locally, where
  // retries stay at 0 so a genuine bug fails immediately.
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  timeout: 30000,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
