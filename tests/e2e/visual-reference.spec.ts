import { test, expect, screenshot } from './browser.spec';

test('visual reference disclosure distinguishes original materials and approved placement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const fallback = page.locator('.journey-fallback img');
  await expect(fallback).toHaveAttribute('src', '/visual/scene-exterior.jpg');
  await expect.poll(() => fallback.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const disclosure = page.locator('.visual-reference-disclosure');
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText('posizione dell’ascensore');
  await expect(disclosure.locator('figure')).toHaveCount(4);
  for (const image of await disclosure.locator('img').all()) {
    await expect(image).toHaveAttribute('alt', /.+/);
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('real context loss selects the accessible fallback without losing building inputs', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '1');
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('31');
  const supported = await page.locator('canvas').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(supported, 'The declared browser supports forced context loss').toBe(true);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('31');
  await screenshot(page, info, 'actual-context-loss-fallback');
});
