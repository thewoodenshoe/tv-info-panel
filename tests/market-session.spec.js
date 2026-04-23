import { test, expect } from '@playwright/test';

import { mockDashboardApis } from './fixtures/api.js';

test('shows a visible pre-market stock state', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockDashboardApis(page, { premarket: true });
  await page.goto('/');

  await expect(page.locator('.stock-session-badge').first()).toHaveText('PRE');
  await expect(page.locator('.stock-extended-label').first()).toHaveText('Pre-market');
  await expect(page.locator('.stock-extended-price').first()).toContainText('$');
});

test('shows a visible after-hours stock state', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockDashboardApis(page, { afterHours: true });
  await page.goto('/');

  await expect(page.locator('.stock-session-badge').first()).toHaveText('AH');
  await expect(page.locator('.stock-extended-label').first()).toHaveText('After hours');
  await expect(page.locator('.stock-extended-price').first()).toContainText('$');
});
