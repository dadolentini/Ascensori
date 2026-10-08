import { test, expect, screenshot } from './browser.spec';

test('visual reference disclosure shows the supplied photographic frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const fallback = page.locator('.journey-fallback img');
  await expect(fallback).toHaveAttribute('src', /sequence/);
  await expect.poll(() => fallback.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const disclosure = page.locator('.visual-reference-disclosure');
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText('fotogrammi forniti');
  await expect(disclosure.locator('figure')).toHaveCount(4);
  for (const image of await disclosure.locator('img').all()) {
    await expect(image).toHaveAttribute('alt', /.+/);
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('an unavailable Canvas 2D selects the photographic fallback without losing building inputs', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === '2d') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('31');
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('31');
  const image = page.locator('.journey-fallback img');
  await expect(image).toHaveAttribute('src', /sequence/);
  await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await screenshot(page, info, 'unavailable-canvas-photographic-fallback');
});
