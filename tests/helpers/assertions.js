import { expect } from '@playwright/test';

function parseRgbString(value) {
  if (!value) return null;
  const numbers = value.match(/[\d.]+/g);
  if (!numbers || numbers.length < 3) return null;
  return [Number(numbers[0]), Number(numbers[1]), Number(numbers[2])];
}

function linearize(channel) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(linearize);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(foreground, background) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveLocator(target, selector) {
  if (typeof selector === 'string') return target.locator(selector).first();
  return target;
}

function resolveLabel(selector, fallback = 'locator') {
  return typeof selector === 'string' ? selector : fallback;
}

export async function expectNoClip(target, selector, label = resolveLabel(selector)) {
  const tolerancePx = 10;
  const locator = resolveLocator(target, selector);
  const metrics = await locator.evaluate((element, boundsTolerancePx) => {
    const parent = element.closest('.panel');
    const style = window.getComputedStyle(element);
    const parentRect = parent?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      visible: style.visibility === 'visible',
      opacity: Number(style.opacity || 1),
      inPanelBounds: parentRect
        ? rect.left >= (parentRect.left - boundsTolerancePx)
          && rect.right <= (parentRect.right + boundsTolerancePx)
          && rect.top >= (parentRect.top - boundsTolerancePx)
          && rect.bottom <= (parentRect.bottom + boundsTolerancePx)
        : true,
    };
  }, tolerancePx);

  expect(metrics.width, `${label} width`).toBeGreaterThan(0);
  expect(metrics.height, `${label} height`).toBeGreaterThan(0);
  expect(metrics.scrollWidth, `${label} horizontal overflow`).toBeLessThanOrEqual(metrics.clientWidth + tolerancePx);
  expect(metrics.scrollHeight, `${label} vertical overflow`).toBeLessThanOrEqual(metrics.clientHeight + tolerancePx);
  expect(metrics.visible, `${label} visibility`).toBeTruthy();
  expect(metrics.opacity, `${label} opacity`).toBeGreaterThan(0);
  expect(metrics.inPanelBounds, `${label} panel bounds`).toBeTruthy();
}

export async function expectAllNoClip(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    await expectNoClip(locator.nth(index), undefined, `${selector}[${index}]`);
  }
}

export async function expectContrast(page, selector, minimum = 3) {
  const values = await page.locator(selector).first().evaluate((element) => {
    const style = window.getComputedStyle(element);
    const panel = element.closest('.panel');
    const panelStyle = panel ? window.getComputedStyle(panel) : window.getComputedStyle(element.parentElement || element);
    return {
      color: style.color,
      backgroundColor: panelStyle.backgroundColor,
    };
  });

  const fg = parseRgbString(values.color);
  const bg = parseRgbString(values.backgroundColor);
  if (!fg || !bg) return;
  expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimum);
}
