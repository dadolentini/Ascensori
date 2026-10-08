import { readFile } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';
import type { ExperimentResult } from '../../src/simulation/results';
import { test, expect, runSmallScenario, simulationSection, screenshot } from './browser.spec';

test.use({ reducedMotion: 'reduce' });

async function exportResult(page: Page, info: TestInfo, name = 'experiment'): Promise<ExperimentResult> {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /Scenario \+ JSON/ }).click();
  const download = await pending;
  const path = info.outputPath(`${name}.json`);
  await download.saveAs(path);
  await info.attach(name, { path, contentType: 'application/json' });
  return JSON.parse(await readFile(path, 'utf8')) as ExperimentResult;
}

test('default form starts an actual three-policy Worker run and preserves it across routes', async ({ page }, info) => {
  await page.goto('/');
  await simulationSection(page);
  await expect(page.getByLabel(/^Piani, incluso terra/)).toHaveValue('16');
  await expect(page.getByLabel('Ascensori', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('525');
  await expect(page.locator('#results')).toHaveCount(0);
  await runSmallScenario(page);
  const table = page.locator('.result-table').first();
  for (const policy of ['Reattiva', 'Per fasce', 'Adattiva']) {
    await expect(table.getByRole('columnheader', { name: policy, exact: true })).toBeVisible();
  }
  const result = await exportResult(page, info);
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(6);
  expect(result.scenario.totalFloors).toBe(16);
  expect(result.scenario.elevatorCount).toBe(4);
  expect(result.policies.map(policy => policy.policy)).toEqual(['reactive', 'bands', 'adaptive']);
  expect(result.version.length).toBeGreaterThan(0);
  expect(result.seeds).toEqual([101]);
  expect(result.durationMs).toBeGreaterThan(0);
  expect(result.ci).toBeNull();
  const immutableDemand = (policy: typeof result.policies[number]) => policy.days[0].requests
    .map(({ id, born, source, dest, weight, groupId, tripType }) => ({ id, born, source, dest, weight, groupId, tripType }));
  for (const policy of result.policies) {
    expect(policy.generated).toBeGreaterThan(0);
    expect(policy.generated).toBe(policy.completed + policy.waiting + policy.onboard);
    expect(policy.days[0].events.length).toBeGreaterThan(0);
    expect(immutableDemand(policy)).toEqual(immutableDemand(result.policies[0]));
  }
  await expect(page.locator('#results')).not.toContainText(/NaN|Infinity|undefined/);
  await screenshot(page, info, 'computed-results');

  const slider = page.getByRole('slider', { name: /^Ora del replay/ });
  await slider.focus();
  await slider.press('End');
  await slider.press('Home');
  const afterReplay = await exportResult(page, info, 'after-replay');
  expect(afterReplay).toEqual(result);
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('7');
  await expect(page.locator('#results .result-warning')).toContainText('scenario precedente');
  await page.getByRole('link', { name: /Gli algoritmi/ }).click();
  await expect(page).toHaveURL('/algoritmi');
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('7');
  await expect(page.locator('#results .result-warning')).toContainText('scenario precedente');
  expect(await exportResult(page, info, 'persisted-result')).toEqual(result);
});

test('cancellation leaves no partial result and a new run owns the output', async ({ page }, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByRole('combobox', { name: 'Repliche', exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await page.getByRole('button', { name: 'Annulla simulazione' }).click();
  await expect(page.getByRole('button', { name: 'Avvia simulazione' })).toBeEnabled({ timeout: 500 });
  await expect(page.getByRole('status').filter({ hasText: 'Simulazione annullata' })).toContainText('Nessun risultato parziale');
  await expect(page.locator('#results')).toHaveCount(0);
  await page.getByLabel('Seed', { exact: true }).fill('202');
  await runSmallScenario(page, 4);
  const result = await exportResult(page, info, 'after-cancellation');
  expect(result.scenario.seed).toBe(202);
  expect(result.seeds).toEqual([202]);
  expect(result.scenario.replicas).toBe(1);
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(4);
  await expect(page.locator('.result-warning')).toHaveCount(0);
});

test('floor pause templates reach the scenario and overlaps prevent a run', async ({ page }, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.locator('summary').filter({ hasText: 'Orari e pause' }).click();
  await page.getByLabel('Dal piano', { exact: true }).fill('12');
  await page.getByLabel('Al piano', { exact: true }).fill('12');
  await page.getByLabel('Inizio pausa', { exact: true }).fill('11:00');
  await page.getByRole('spinbutton', { name: /^Durata pausa(?: min)?$/ }).fill('30');
  await page.getByRole('button', { name: 'Sostituisci le pause' }).click();
  await expect(page.getByLabel('Inizio pausa 1', { exact: true })).toHaveValue('11:00');
  await expect(page.getByRole('spinbutton', { name: /^Durata pausa 1(?: min)?$/ })).toHaveValue('30');
  await page.getByRole('button', { name: 'Aggiungi pausa al gruppo' }).click();
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.getByRole('alert')).toContainText('pause sovrapposte');
  await expect(page.locator('#results')).toHaveCount(0);
  await page.getByRole('button', { name: 'Elimina pausa 2' }).click();
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible({ timeout: 30_000 });
  const result = await exportResult(page, info, 'applied-floor-pause');
  const focus = result.scenario.groups.find(group => group.id === 'U12-FOCUS')!;
  expect(focus.breaks).toHaveLength(1);
  expect(focus.breaks[0].start).toBe(11 * 3600);
  expect(focus.breaks[0].duration).toBe(30 * 60);
  const untouched = result.scenario.groups.find(group => group.floor !== 12)!;
  expect(untouched.breaks[0].duration).toBe(3600);
});

test('zero demand is calculated and has unavailable duration metrics', async ({ page }, info) => {
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

test('the documented 525-employee seed101 preset completes its actual demand in all policies', async ({ page }, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible({ timeout: 45_000 });
  const result = await exportResult(page, info, 'preset-525-seed101');
  expect(result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)).toBe(525);
  expect(result.seeds).toEqual([101]);
  for (const policy of result.policies) {
    expect(policy.generated).toBe(1861);
    expect(policy.completed).toBe(1861);
    expect(policy.waiting).toBe(0);
    expect(policy.onboard).toBe(0);
  }
  await screenshot(page, info, 'preset-results');
});

test('eight small-population replicas expose their real paired confidence interval', async ({ page }, info) => {
  await page.goto('/');
  await simulationSection(page);
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('6');
  await page.getByRole('combobox', { name: 'Repliche', exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Avvia simulazione' }).click();
  await expect(page.locator('#results')).toBeVisible({ timeout: 45_000 });
  const result = await exportResult(page, info, 'eight-replicas');
  expect(result.seeds).toEqual([101, 202, 303, 404, 505, 606, 707, 808]);
  expect(result.ci?.count).toBe(8);
  expect(result.ci?.confidence).toBe(.95);
  expect(Number.isFinite(result.ci?.lower)).toBe(true);
  expect(Number.isFinite(result.ci?.upper)).toBe(true);
  for (const policy of result.policies) expect(policy.days).toHaveLength(8);
  await expect(page.locator('.improvement-line')).toContainText('IC esplorativo 95%');
});
