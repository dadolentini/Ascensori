import { readFile } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';
import type { ExperimentResult } from '../../src/simulation/results';
import { test, expect, runSmallScenario, simulationSection, screenshot } from './browser.spec';

test.use({ reducedMotion: 'reduce' });

async function exportResult(
  page: Page,
  info: TestInfo,
  name = 'experiment',
): Promise<ExperimentResult> {
  const details = page.locator('.result-downloads');
  if (!((await details.getAttribute('open')) !== null)) await details.locator('summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Dati completi JSON' }).click();
  const download = await pending,
    path = info.outputPath(name + '.json');
  await download.saveAs(path);
  await info.attach(name, { path, contentType: 'application/json' });
  return JSON.parse(await readFile(path, 'utf8')) as ExperimentResult;
}

test('four simple inputs, steppers and an automatic average replace technical configuration', async ({
  page,
}, info) => {
  await page.goto('/');
  await simulationSection(page);
  const panel = page.locator('.configuration-panel');
  await expect(panel.locator('input')).toHaveCount(4);
  await expect(panel.locator('select, input[type=time], details')).toHaveCount(0);
  await expect(panel).not.toContainText(/gruppi|uffici|avanzat|DCS|repliche|seed|kg/i);
  await expect(page.getByLabel('Piani', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('Ascensori', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('525');
  await expect(page.getByLabel('Capacità per cabina', { exact: true })).toHaveValue('13');
  await expect(panel.locator('output')).toHaveText('35,0');
  await page.getByRole('button', { name: 'Aumenta addetti complessivi', exact: true }).click();
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('526');
  await expect(panel).toContainText('1 piano con 36 addetti, i restanti con 35');
  await page.getByRole('button', { name: 'Diminuisci piani', exact: true }).click();
  await expect(page.getByLabel('Piani', { exact: true })).toHaveValue('14');
  await page.getByRole('button', { name: 'Ripristina i valori iniziali' }).click();
  await expect(panel.locator('output')).toHaveText('35,0');
  await screenshot(page, info, 'simple-configurator');
});

test('simplified inputs run the real Worker, preserve every employee and keep results across routes', async ({
  page,
}, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByLabel('Piani', { exact: true }).fill('4');
  await page.getByLabel('Capacità per cabina', { exact: true }).fill('8');
  await runSmallScenario(page, 31);
  const result = await exportResult(page, info);
  expect(result.scenario.totalFloors).toBe(5);
  expect(result.scenario.physics.capacityPeople).toBe(8);
  expect(result.scenario.physics.weightMean).toBe(80);
  expect(result.scenario.physics.capacityKg).toBe(1000);
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(31);
  expect(
    [1, 2, 3, 4].map((floor) =>
      result.scenario.groups
        .filter((group) => group.floor === floor)
        .reduce((sum, group) => sum + group.employees, 0),
    ),
  ).toEqual([8, 8, 8, 7]);
  expect(result.seeds).toEqual([101]);
  expect(result.scenario.replicas).toBe(1);
  expect(result.ci).toBeNull();
  const demand = (policy: (typeof result.policies)[number]) =>
    policy.days[0].requests.map(({ id, born, source, dest, weight, groupId, tripType }) => ({
      id,
      born,
      source,
      dest,
      weight,
      groupId,
      tripType,
    }));
  for (const policy of result.policies) {
    expect(policy.generated).toBeGreaterThan(0);
    expect(policy.generated).toBe(policy.completed + policy.waiting + policy.onboard);
    expect(demand(policy)).toEqual(demand(result.policies[0]));
    expect(
      policy.days[0].requests.filter((request) => request.tripType === 'arrival'),
    ).toHaveLength(31);
  }
  await expect(page.locator('.metric-card')).toHaveCount(3);
  await expect(page.locator('#results')).not.toContainText(
    /NaN|Infinity|undefined|NNLS|RMSE|uffici|gruppi|kg/,
  );
  const threshold = page.getByRole('slider', { name: /Chi sale entro/ });
  await threshold.focus();
  await threshold.press('Home');
  for (let i = 0; i < 10; i++) await threshold.press('ArrowRight');
  await screenshot(page, info, 'simple-results');
  await page
    .locator('summary')
    .filter({ hasText: 'Guarda gli ascensori durante la giornata' })
    .click();
  const slider = page.getByRole('slider', { name: 'Ora del replay' });
  await slider.focus();
  await slider.press('End');
  await slider.press('Home');
  expect(await exportResult(page, info, 'after-replay')).toEqual(result);
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('32');
  await expect(page.locator('#results .result-warning')).toContainText('Hai cambiato');
  await page
    .getByRole('link', { name: /Gli algoritmi/ })
    .first()
    .click();
  await expect(page).toHaveURL('/algoritmi');
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('32');
  expect(await exportResult(page, info, 'persisted-result')).toEqual(result);
});

test('invalid or empty input never starts a calculation using an older valid scenario', async ({
  page,
}) => {
  await page.goto('/');
  await simulationSection(page);
  const floors = page.getByLabel('Piani', { exact: true });
  await floors.fill('');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(floors).toBeFocused();
  await expect(floors).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.configuration-panel')).toContainText('Scegli da 1 a 39 piani');
  await expect(page.getByRole('button', { name: 'Annulla simulazione' })).toHaveCount(0);
  await expect(page.locator('#results')).toHaveCount(0);
  await floors.fill('2.5');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(floors).toHaveAttribute('aria-invalid', 'true');
  await floors.fill('1');
  await expect(page.getByRole('button', { name: 'Diminuisci piani', exact: true })).toBeDisabled();
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible();
});

test('cancellation publishes no partial results and a later run owns the output', async ({
  page,
}, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await page.getByRole('button', { name: 'Annulla simulazione' }).click();
  await expect(page.getByRole('button', { name: 'Avvia simulazione' })).toBeEnabled({
    timeout: 500,
  });
  await expect(page.getByRole('status').filter({ hasText: 'Simulazione annullata' })).toContainText(
    'Nessun risultato parziale',
  );
  await expect(page.locator('#results')).toHaveCount(0);
  await runSmallScenario(page, 4);
  const result = await exportResult(page, info, 'after-cancellation');
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(4);
  await expect(page.locator('.result-warning')).toHaveCount(0);
});

test('zero demand has no fabricated waits or improvement', async ({ page }, info) => {
  await page.goto('/');
  await runSmallScenario(page, 0);
  await expect(page.locator('#results')).toContainText('Non disponibile');
  await expect(page.locator('#results')).not.toContainText(/NaN|Infinity/);
  const result = await exportResult(page, info, 'zero-demand');
  for (const policy of result.policies) {
    expect(policy.generated).toBe(0);
    expect(policy.meanWait).toBeNull();
    expect(policy.p95Wait).toBeNull();
    expect(policy.waitSamples).toBe(0);
  }
});

test('the simplified default completes its calculated demand for all three strategies', async ({
  page,
}, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible({ timeout: 45000 });
  const result = await exportResult(page, info, 'simple-default');
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(525);
  expect(result.scenario.totalFloors).toBe(16);
  for (const policy of result.policies) {
    expect(policy.generated).toBe(1887);
    expect(policy.completed).toBe(1887);
    expect(policy.waiting).toBe(0);
    expect(policy.onboard).toBe(0);
  }
  await screenshot(page, info, 'simple-default-results');
});
