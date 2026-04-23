import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 5000 },
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:3031',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command: 'PORT=3031 npm run dev',
    url: 'http://127.0.0.1:3031',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
