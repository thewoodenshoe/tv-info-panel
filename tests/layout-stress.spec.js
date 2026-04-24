import { test, expect } from '@playwright/test';

import { mockDashboardApis } from './fixtures/api.js';

const layouts = ['daylight', 'midnight', 'pastel', 'paper', 'neon'];
const visibleSelectors = [
  '#dashboard-title',
  '#layout-name',
  '#clock',
  '#workday-countdown',
  '.weather-temp',
  '.weather-summary-title',
  '.stock-price',
  '.stock-extended-label',
  '.quote-kicker',
  '.quote-author',
  '.telegram-bullet',
  '.telegram-item-text',
  '.calendar-source-pill',
];

for (const layout of layouts) {
  test(`stress layout 1366x768 ${layout}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await mockDashboardApis(page, { stress: true, afterHours: true });
    await page.goto('/');

    await page.evaluate((layoutName) => {
      const layoutsInOrder = ['daylight', 'midnight', 'pastel', 'paper', 'neon'];
      localStorage.setItem('tv-info-layout-index', String(layoutsInOrder.indexOf(layoutName)));
    }, layout);
    await page.reload();

    for (const selector of visibleSelectors) {
      await expect(page.locator(selector).first()).toBeVisible();
    }

    await expect(page.locator('.telegram-item')).toHaveCount(6);
    await expect(page.locator('.telegram-item').first()).toBeVisible();
    await expect(page.locator('.telegram-overflow-notice')).toBeHidden();
    await expect(page.locator('.stock-extended-label').first()).toHaveText('After hours');
    await expect(page.locator('#panel-telegram')).not.toContainText('Bot token');
    await expect(page.locator('#panel-telegram')).not.toContainText('/add');
    await expect(page.locator('#panel-telegram')).not.toContainText('/remove');
    await expect(page.locator('#panel-telegram')).not.toContainText('Telegram Board');

    const telegramHtml = await page.locator('.telegram-item-text').first().innerHTML();
    expect(telegramHtml).toContain('&lt;strong&gt;');
    expect(telegramHtml).not.toContain('<strong>');

    const geometry = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('.panel'));
      return {
        fitsViewport: document.documentElement.scrollWidth <= (window.innerWidth + 2)
          && document.documentElement.scrollHeight <= (window.innerHeight + 2),
        panelsInBounds: panels.every((panel) => {
          const rect = panel.getBoundingClientRect();
          return rect.left >= -1
            && rect.top >= -1
            && rect.right <= (window.innerWidth + 1)
            && rect.bottom <= (window.innerHeight + 1);
        }),
      };
    });

    expect(geometry.fitsViewport).toBeTruthy();
    expect(geometry.panelsInBounds).toBeTruthy();
  });
}
