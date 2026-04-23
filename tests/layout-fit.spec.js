import { test, expect } from '@playwright/test';

import { mockDashboardApis } from './fixtures/api.js';
import { expectNoClip } from './helpers/assertions.js';

const layouts = ['daylight', 'midnight', 'pastel', 'paper', 'neon'];
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
];

for (const viewport of viewports) {
  for (const layout of layouts) {
    test(`layout-fit ${viewport.width}x${viewport.height} ${layout}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockDashboardApis(page, { premarket: true });
      await page.goto('/');

      await page.evaluate((layoutName) => {
        const layoutsInOrder = ['daylight', 'midnight', 'pastel', 'paper', 'neon'];
        localStorage.setItem('tv-info-layout-index', String(layoutsInOrder.indexOf(layoutName)));
      }, layout);
      await page.reload();

      const candidates = [
        '#clock',
        '#date',
        '#workday-countdown',
        '.timezone-label',
        '.timezone-time',
        '.timezone-name',
        '.weather-temp',
        '.weather-summary-title',
        '.weather-highlight-title',
        '.detail-label',
        '.detail-value',
        '.stock-symbol',
        '.stock-label',
        '.stock-price',
        '.stock-change',
        '.stock-extended',
        '.quote-kicker',
        '.quote-author',
        '.telegram-item-text',
        '.telegram-empty',
        '.calendar-source-pill',
        '#layout-name',
      ];

      for (const selector of candidates) {
        const count = await page.locator(selector).count();
        if (count === 0) continue;
        await expect(page.locator(selector).first()).toBeVisible();
        await expectNoClip(page, selector);
      }
    });
  }
}
