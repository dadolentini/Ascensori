import { type Page } from '@playwright/test';
import { test, expect, screenshot } from './browser.spec';
import { journeyPose } from '../../src/journey/pose';

async function seek(page: Page, fraction: number, phase: string) {
  await page.locator('.journey').evaluate((element, progress) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (element.clientHeight - window.innerHeight) * progress, behavior: 'instant' });
  }, fraction);
  await expect(page.locator('.journey')).toHaveAttribute('data-phase', phase);
  await expect(page.locator('canvas')).toHaveAttribute('data-journey-phase', phase);
  await expect.poll(async () => Number(await page.locator('.journey').getAttribute('data-progress')))
    .toBeCloseTo(fraction, 3);
  // React can publish scroll progress before R3F applies its requested frame,
  // particularly when two seeks have the same phase name. Await the real pose.
  const expected = journeyPose(fraction).cameraPosition;
  await expect.poll(async () => {
    const actual = (await page.locator('canvas').getAttribute('data-camera-position'))?.split(',').map(Number);
    return actual ? Math.max(...actual.map((value, axis) => Math.abs(value - expected[axis]))) : Infinity;
  }).toBeLessThan(0.02);
}

test('scroll enters the palace directly and reconstructs the single steel elevator opening', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '1');
  await seek(page, 0, 'exterior');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Il tempo');
  await screenshot(page, info, 'desktop-hero');

  await seek(page, .20, 'entrance');
  await screenshot(page, info, 'desktop-entrance');
  await seek(page, .35, 'lobby');
  const lobby = (await page.locator('canvas').getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(lobby[0]).toBeCloseTo(0, 2);
  expect(lobby[2]).toBeLessThan(-3);
  expect(lobby[2]).toBeGreaterThan(-8.3);
  await screenshot(page, info, 'desktop-lobby');
  await seek(page, .50, 'elevator');
  const approach = (await page.locator('canvas').getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(approach[0]).toBe(0);
  expect(approach[2]).toBeLessThan(lobby[2]);

  await seek(page, .58, 'elevator');
  const revealCamera = await page.locator('canvas').getAttribute('data-camera-position');
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '0.000');
  await screenshot(page, info, 'desktop-steel-portal');
  await seek(page, .76, 'doors');
  const opening = Number(await page.locator('canvas').getAttribute('data-door-open'));
  expect(opening).toBeGreaterThan(0);
  expect(opening).toBeLessThan(1);
  await screenshot(page, info, 'desktop-opening');
  await seek(page, .85, 'equations');
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '1.000');
  await expect(page.locator('.math-overlay')).toContainText('ANTICIPARE LA DOMANDA');
  await seek(page, .58, 'elevator');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-position', revealCamera!);
  await expect(page.locator('canvas')).toHaveAttribute('data-door-open', '0.000');

  await page.setViewportSize({ width: 1024, height: 768 });
  await seek(page, .58, 'elevator');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '1');
  await page.getByRole('link', { name: /Gli algoritmi/ }).click();
  await expect(page).toHaveURL('/algoritmi');
  await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-journey-phase', 'elevator');
  await page.locator('#simulazione').scrollIntoViewIfNeeded();
  await screenshot(page, info, 'desktop-configurator');
});

test('portrait presents the complete direct-entry elevator', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '1');
  await seek(page, .58, 'elevator');
  await screenshot(page, info, 'mobile-steel-portal');
  await seek(page, .76, 'doors');
  await screenshot(page, info, 'mobile-opening');
  const card = await page.locator('.math-overlay').boundingBox();
  expect(card!.y).toBeGreaterThan(812 * .55);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('records frame timing during a declared scroll workload', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-elevators', '1');
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
