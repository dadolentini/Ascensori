import { test, expect, screenshot } from './browser.spec';
import manifest from '../../src/journey/sequence/manifest.json' with { type: 'json' };

async function seek(page: import('@playwright/test').Page, progress: number) {
  await page.locator('.journey').evaluate((el, p) => {
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.clientHeight - innerHeight) * p, behavior: 'instant' });
  }, progress);
  await expect.poll(async () => Number(await page.locator('.journey').getAttribute('data-progress'))).toBeCloseTo(progress, 2);
  await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-requested-frame'))).toBeCloseTo(Math.min(1, progress / .83) * (manifest.frames.length - 1), 3);
  await expect(page.locator('canvas')).toHaveAttribute('data-frame-ready', 'true');
}

test('photographic Canvas 2D is pinned, reversible and survives route navigation', async ({ page }, info) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'photographic-2d');
  expect(await page.locator('canvas').evaluate((el) => !!(el as HTMLCanvasElement).getContext('2d'))).toBe(true);
  await seek(page, 0); await screenshot(page, info, 'photographic-building');
  for (const progress of [.25, .45, .65, .8, .65, .25, 0]) {
    await seek(page, progress);
    const rect = await page.locator('.journey-viewport').boundingBox();
    expect(Math.abs(rect!.y)).toBeLessThan(2);
    expect(await page.locator('canvas').getAttribute('data-drawn-frames')).toMatch(/\d/);
  }
  await seek(page, .65); await screenshot(page, info, 'photographic-turn');
  await seek(page, .85); await screenshot(page, info, 'photographic-elevator');
  await expect(page.locator('.math-overlay')).toContainText('ANTICIPARE LA DOMANDA');
  await page.getByRole('link', { name: /Gli algoritmi/ }).click();
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'photographic-2d');
  await seek(page, .85);
  await seek(page, 0);
  expect(requests.some((url) => /SceneCanvas|\/visual\/|\/references\//.test(url))).toBe(false);
});

test.describe('responsive resize of the mounted renderer', () => {
  test.use({ deviceScaleFactor: 3 });
  test('tablet framing and DPR adapt after desktop-to-portrait resize', async ({ page }) => {
    await page.goto('/'); await seek(page, 0);
    await expect(page.locator('canvas')).toHaveAttribute('data-dpr', '2');
    await page.setViewportSize({ width: 640, height: 900 }); await seek(page, 0);
    await expect(page.locator('canvas')).toHaveAttribute('data-dpr', '1.5');
    const rect = JSON.parse((await page.locator('canvas').getAttribute('data-image-rect'))!);
    const heading = await page.locator('.hero-copy').boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(rect.y + rect.height - 1);
    await page.setViewportSize({ width: 375, height: 812 }); await seek(page, .8);
    expect(Number(await page.locator('canvas').getAttribute('data-cache-bytes'))).toBeLessThanOrEqual(32 * 1024 * 1024);
  });
});

test('mobile HiDPI keeps the whole initial image and bounds decoded cache', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'photographic-2d');
  await seek(page, 0);
  const values = await page.locator('canvas').evaluate((element) => {
    const el = element as HTMLCanvasElement;
    return { size: [el.width, el.height], rect: JSON.parse(el.dataset.imageRect!), dpr: Number(el.dataset.dpr) };
  });
  expect(values.rect.x).toBeGreaterThanOrEqual(0);
  expect(values.rect.y).toBeGreaterThanOrEqual(0);
  expect(values.rect.x + values.rect.width).toBeLessThanOrEqual(375.01);
  expect(values.rect.y + values.rect.height).toBeLessThanOrEqual(812.01);
  expect(values.size[0]).toBe(Math.round(375 * values.dpr));
  const hero = await page.locator('.hero-copy').boundingBox();
  expect(hero!.y).toBeGreaterThanOrEqual(values.rect.y + values.rect.height - 1);
  await screenshot(page, info, 'photographic-mobile-building');
  await seek(page, .8); await seek(page, .15);
  expect(Number(await page.locator('canvas').getAttribute('data-cache-bytes'))).toBeLessThanOrEqual(32 * 1024 * 1024);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
