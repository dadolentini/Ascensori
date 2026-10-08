import { type Page } from '@playwright/test';
import { test, expect, screenshot } from './browser.spec';

async function seek(page: Page, fraction: number, phase: string) {
  await page.locator('.journey').evaluate((element, progress) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (element.clientHeight - window.innerHeight) * progress, behavior: 'instant' });
  }, fraction);
  await expect(page.locator('.journey')).toHaveAttribute('data-phase', phase);
  await expect(page.locator('canvas')).toHaveAttribute('data-journey-phase', phase);
  await expect.poll(async () => Number(await page.locator('.journey').getAttribute('data-progress')))
    .toBeCloseTo(fraction, 3);
}

test('scroll reconstructs corridor, right turn, four portals and reversible doors', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  await seek(page, 0, 'exterior');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Il tempo');
  await screenshot(page, info, 'desktop-hero');

  await seek(page, .40, 'corridor');
  const corridor = (await page.locator('canvas').getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(corridor[0]).toBeCloseTo(0, 2);
  expect(corridor[2]).toBeLessThan(-16);
  await seek(page, .50, 'turn');
  const turn = (await page.locator('canvas').getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(turn[0]).toBeGreaterThan(corridor[0]);
  expect(turn[2]).toBeLessThan(corridor[2]);

  await seek(page, .58, 'elevators');
  const revealCamera = await page.locator('canvas').getAttribute('data-camera-position');
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '0.000');
  await screenshot(page, info, 'desktop-four-portals');
  await seek(page, .76, 'doors');
  const opening = Number(await page.locator('canvas').getAttribute('data-door-open'));
  expect(opening).toBeGreaterThan(0);
  expect(opening).toBeLessThan(1);
  await seek(page, .85, 'equations');
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '1.000');
  await expect(page.locator('.math-overlay')).toContainText('ANTICIPARE LA DOMANDA');
  await seek(page, .58, 'elevators');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-position', revealCamera!);
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '0.000');

  await page.setViewportSize({ width: 1024, height: 768 });
  await seek(page, .58, 'elevators');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  await page.getByRole('link', { name: /Gli algoritmi/ }).click();
  await expect(page).toHaveURL('/algoritmi');
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-journey-phase', 'elevators');
  await page.locator('#simulazione').scrollIntoViewIfNeeded();
  await screenshot(page, info, 'desktop-configurator');
});

test('portrait still presents the complete elevator bank', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  await seek(page, .58, 'elevators');
  await screenshot(page, info, 'mobile-four-portals');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('records frame timing during a declared scroll workload', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '4');
  const evidence = await page.evaluate(async () => {
    const element = document.querySelector<HTMLElement>('.journey')!;
    const span = element.clientHeight - innerHeight;
    const top = element.getBoundingClientRect().top + scrollY;
    const frames: number[] = [];
    const longTasks: number[] = [];
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl ? String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'unknown';
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration)));
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) observer.observe({ type: 'longtask' });
    let last = await new Promise<number>(resolve => requestAnimationFrame(resolve));
    for (let frame = 0; frame < 90; frame++) {
      window.scrollTo({ top: top + span * (.23 + .39 * frame / 89), behavior: 'instant' });
      const now = await new Promise<number>(resolve => requestAnimationFrame(resolve));
      frames.push(now - last); last = now;
    }
    observer.disconnect();
    const sorted = [...frames].sort((a, b) => a - b);
    return { browser: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      renderer, hardwareConcurrency: navigator.hardwareConcurrency, frames: frames.length,
      frameP95Ms: sorted[Math.ceil(.95 * sorted.length) - 1], frameMaximumMs: sorted.at(-1),
      mainThreadLongTasksMs: longTasks, objectiveFrameP95Ms: 33.3,
      workload: '90 rAF samples scrolling progress 0.23–0.62; no simulation active' };
  });
  await info.attach('scroll-performance-measurement', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  expect(evidence.frames).toBe(90);
  expect(Number.isFinite(evidence.frameP95Ms)).toBe(true);
  // Report the measurement against the objective; do not assert universal GPU performance.
});
