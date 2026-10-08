import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

// These tests exercise the real browser and Worker. The auto fixture prevents
// an apparently green UI assertion from hiding a JavaScript or console error.
export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [async ({ page }, use, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()} (${message.location().url})`);
    });
    await use();
    await info.attach('browser-errors', {
      body: JSON.stringify(errors, null, 2), contentType: 'application/json',
    });
    expect(errors, 'No hidden browser errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: false });
  await info.attach(name, { path, contentType: 'image/png' });
}

export async function simulationSection(page: Page) {
  await page.locator('#simulazione').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Avvia simulazione' })).toBeVisible();
}

export async function runSmallScenario(page: Page, employees = 6) {
  await simulationSection(page);
  await page.getByLabel('Addetti complessivi', { exact: true }).fill(String(employees));
  await page.getByRole('combobox', { name: 'Repliche', exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#results')).toBeFocused();
}
