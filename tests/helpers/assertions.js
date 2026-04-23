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

export async function expectNoClip(page, selector) {
  const tolerancePx = 6;
  const metrics = await page.locator(selector).first().evaluate((element) => {
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
        ? rect.left >= (parentRect.left - 1)
          && rect.right <= (parentRect.right + 1)
          && rect.top >= (parentRect.top - 1)
          && rect.bottom <= (parentRect.bottom + 1)
        : true,
    };
  });

  expect(metrics.width, `${selector} width`).toBeGreaterThan(0);
  expect(metrics.height, `${selector} height`).toBeGreaterThan(0);
  expect(metrics.scrollWidth, `${selector} horizontal overflow`).toBeLessThanOrEqual(metrics.clientWidth + tolerancePx);
  expect(metrics.scrollHeight, `${selector} vertical overflow`).toBeLessThanOrEqual(metrics.clientHeight + tolerancePx);
  expect(metrics.visible, `${selector} visibility`).toBeTruthy();
  expect(metrics.opacity, `${selector} opacity`).toBeGreaterThan(0);
  expect(metrics.inPanelBounds, `${selector} panel bounds`).toBeTruthy();
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
