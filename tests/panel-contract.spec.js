import fs from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { mockDashboardApis } from './fixtures/api.js';
import { expectNoClip } from './helpers/assertions.js';

const layouts = ['daylight', 'midnight', 'pastel', 'paper', 'neon'];
const viewports = [
  { name: 'tv-1080p', width: 1920, height: 1080 },
  { name: 'tv-768p', width: 1366, height: 768 },
  { name: 'tv-qhd', width: 2560, height: 1440 },
];

async function saveShot(page, name) {
  const output = path.join(process.cwd(), 'tests', '__screenshots__', `${name}.png`);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, fullPage: false });
}

for (const viewport of viewports) {
  for (const layout of layouts) {
    test(`${viewport.name} ${layout} respects panel contract`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockDashboardApis(page, { premarket: true });
      await page.goto('/');

      await page.evaluate((layoutName) => {
        localStorage.setItem('tv-info-layout-index', String(['daylight', 'midnight', 'pastel', 'paper', 'neon'].indexOf(layoutName)));
      }, layout);
      await page.reload();

      await expect(page.locator('#dashboard-title')).toBeVisible();
      await expect(page.locator('#layout-name')).toBeVisible();
      await expect(page.locator('#next-layout-button')).toBeVisible();

      const mustExist = [
        '#clock', '#date', '#workday-countdown', '.timezone-card',
        '.weather-temp', '.weather-summary-title', '.weather-highlight', '.detail-card',
        '.stock-symbol', '.stock-label', '.stock-price', '.stock-change',
        '.quote-card', '.bible-card', '.calendar-source-pill', '.calendar-event',
      ];
      for (const selector of mustExist) {
        await expect(page.locator(selector).first()).toBeVisible();
        await expectNoClip(page, selector);
      }

      await expect(page.locator('.detail-card')).toHaveCount(4);
      await expect(page.locator('.calendar-source-pill')).toHaveCount(5);
      await expect(page.locator('.timezone-card')).toHaveCount(3);
      await expect(page.locator('.calendar-event').first()).toBeVisible();
      await expect(page.locator('.calendar-day-group').first()).toBeVisible();

      await expect(page.locator('.stock-card')).toHaveCount(4);
      await expect(page.locator('.stock-basis')).toHaveCount(1);
      await expect(page.locator('.stock-extended')).toHaveCount(1);

      const telegramItems = page.locator('.telegram-item');
      const telegramEmpty = page.locator('.telegram-empty');
      const itemsCount = await telegramItems.count();
      if (itemsCount > 0) {
        await expect(telegramItems.first()).toBeVisible();
      } else {
        await expect(telegramEmpty).toBeVisible();
      }

      await saveShot(page, `${viewport.name}-${layout}`);
    });
  }
}
