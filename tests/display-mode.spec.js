import { test, expect } from '@playwright/test';

import { mockDashboardApis } from './fixtures/api.js';
import { expectAllNoClip } from './helpers/assertions.js';

test('display route enables tv mode and preserves panel fit', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockDashboardApis(page, { stress: true, premarket: true });
  await page.goto('/display');

  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('#next-layout-button')).toBeFocused();
  await expect(page.locator('#panel-calendar')).toBeVisible();
  await expect(page.locator('.calendar-event').first()).toBeVisible();

  const displayMode = await page.evaluate(() => ({
    display: document.body.dataset.display,
    density: document.body.dataset.density,
  }));

  expect(displayMode.display).toBe('tv');
  expect(displayMode.density).toBe('compact');

  await expect(page.locator('body')).toHaveAttribute('data-layout', 'midnight');
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    }));
  });
  await expect(page.locator('body')).toHaveAttribute('data-layout', 'pastel');

  await expectAllNoClip(page, '.calendar-event-title');
  await expectAllNoClip(page, '.stock-price');
});

test('display route fits Fire TV CSS viewport', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('tv-info-layout-index', '0');
  });
  await page.setViewportSize({ width: 960, height: 540 });
  await mockDashboardApis(page, { stress: true, premarket: true });
  await page.goto('/display');

  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('#panel-calendar')).toBeVisible();
  await expect(page.locator('#panel-time')).toBeVisible();
  await expect(page.locator('#panel-weather')).toBeVisible();

  const layouts = ['midnight', 'pastel', 'neon', 'retro'];
  for (const layout of layouts) {
    await expect(page.locator('body')).toHaveAttribute('data-layout', layout);
    await expectAllNoClip(page, '.calendar-event-title:visible');
    await expectAllNoClip(page, '.stock-symbol:visible');
    await expectAllNoClip(page, '.stock-price:visible');
    await expectAllNoClip(page, '.metric-value:visible');

    const geometry = await page.evaluate(() => ({
      fitsViewport: document.documentElement.scrollWidth <= window.innerWidth + 2
        && document.documentElement.scrollHeight <= window.innerHeight + 2,
    }));

    expect(geometry.fitsViewport, `${layout} fits viewport`).toBeTruthy();
    await page.locator('#next-layout-button').click();
  }
});
