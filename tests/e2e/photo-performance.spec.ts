import { test, expect } from './browser.spec';
import manifest from '../../src/journey/sequence/manifest.json' with { type: 'json' };
import { writeFile } from 'node:fs/promises';

for (const [width, height] of [[1440, 900], [375, 812]]) {
  test(`measures 90 photographic scroll samples at ${width}px and stops redrawing when idle`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveAttribute('data-frame-ready', 'true');
    const evidence = await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>('.journey')!, canvas = document.querySelector('canvas')!;
      const top = el.getBoundingClientRect().top + scrollY, span = el.clientHeight - innerHeight;
      const timings: number[] = [], longTasks: number[] = [];
      const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((e) => e.duration)));
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) observer.observe({ type: 'longtask' });
      let last = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      for (let i = 0; i < 90; i++) {
        const p = i < 45 ? .15 + .65 * i / 44 : .8 - .65 * (i - 45) / 44;
        window.scrollTo({ top: top + span * p, behavior: 'instant' });
        const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        timings.push(now - last); last = now;
      }
      observer.disconnect(); timings.sort((a, b) => a - b);
      return { renderer: 'HTML5 Canvas 2D', viewport: [innerWidth, innerHeight], dpr: canvas.dataset.dpr,
        samples: timings.length, frameP95Ms: timings[85], frameMaxMs: timings.at(-1), longTasksMs: longTasks,
        decodedCacheBytes: canvas.dataset.cacheBytes, browser: navigator.userAgent,
        workload: '90 rAF samples: forward progress .15→.8 then reverse .8→.15; real image decoding, no simulation' };
    });
    await info.attach('photographic-scroll-performance', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    await writeFile(info.outputPath('photographic-scroll-performance.json'), JSON.stringify(evidence, null, 2));
    expect(evidence.samples).toBe(90); expect(Number.isFinite(evidence.frameP95Ms)).toBe(true);
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-requested-frame')))
      .toBeCloseTo(.15 / .83 * (manifest.frames.length - 1), 2);
    await expect(page.locator('canvas')).toHaveAttribute('data-frame-ready', 'true');
    // Once scrub and decoding settle, redraw count must remain unchanged for 30 paints.
    await expect.poll(async () => page.locator('canvas').evaluate(async (canvas) => {
      const before = canvas.dataset.renderCount;
      for (let i = 0; i < 30; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
      return before === canvas.dataset.renderCount;
    })).toBe(true);
  });
}
