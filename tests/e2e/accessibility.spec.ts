import { test, expect, screenshot, runSmallScenario, simulationSection } from './browser.spec';

test('algorithms direct route explains all nineteen equations and serves the source PDF', async ({
  page,
}, info) => {
  await page.goto('/algoritmi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('una decisione');
  await expect(page.locator('.equation-list > article')).toHaveCount(19);
  for (let n = 1; n <= 19; n++) await expect(page.locator(`#equazione-${n}`)).toBeAttached();
  await expect(page.locator('#equazione-11')).toContainText('non implementata');
  await expect(page.locator('.katex-error')).toHaveCount(0);
  const pdf = await page.request.get('/docs/modello-ascensori.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await screenshot(page, info, 'algorithms');
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page).toHaveURL('/');
});

test('reduced motion preserves a keyboard-operable static route and real simulation', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  // The initial scroll restoration and font layout must finish before testing
  // a keyboard jump; otherwise the test races the first React animation frame.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Vai alla simulazione', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#simulazione')).toBeInViewport();
  await simulationSection(page);
  await page.getByRole('button', { name: 'Aumenta ascensori', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Ascensori', { exact: true })).toHaveValue('5');
  for (const input of await page.locator('#simulazione input, #simulazione select').all()) {
    await expect(input).toHaveAccessibleName(/.+/);
  }
  await runSmallScenario(page, 4);
  await expect(page.getByRole('region', { name: 'Risultati della simulazione' })).toBeFocused();
  await screenshot(page, info, 'reduced-motion-results');
});

test('missing WebGL leaves essential content and the Worker usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGL2RenderingContext', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  await runSmallScenario(page, 2);
  await expect(page.locator('.metric-card')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('link', { name: /Gli algoritmi/ })).toBeVisible();
});

test('essential mode changes rendering without losing form state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Versione essenziale' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('8');
  await page.getByRole('button', { name: 'Esperienza 3D', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('8');
});

for (const width of [320, 375, 768, 1440]) {
  test(`content, form and algorithms stay within ${width}px viewport`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await simulationSection(page);
    await expect(page.getByRole('heading', { name: /OTTIMIZZIAMO.*IL SISTEMA/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await expect(page.getByLabel('Piani', { exact: true })).toHaveValue('15');
    await expect(page.locator('.configuration-panel input')).toHaveCount(4);
    await expect(page.locator('.configuration-panel select')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 375) await screenshot(page, info, 'mobile-configurator');
    await page.getByRole('link', { name: /Gli algoritmi/ }).click();
    await page.locator('#equazione-16').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
}
