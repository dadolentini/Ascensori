import { test, expect } from './browser.spec';
import type { Page } from '@playwright/test';
import manifest from '../../src/journey/sequence/manifest.json' with { type: 'json' };
import { frameAtProgress } from '../../src/journey/sequence/timeline';

type CoveredRenderAudit = { draws: number; primary?: { index: number; layers: number[] } };
declare global { interface Window { __coveredRenderAudit: CoveredRenderAudit } }

async function observePhotographDraws(page: Page) {
  await page.addInitScript((urls) => {
    const indices = new Map(urls.map((url, index) => [new URL(url, location.origin).href, index]));
    const blobs = new WeakMap<Blob, number>();
    const sources = new WeakMap<object, { index: number; layers: number[] }>();
    window.__coveredRenderAudit = { draws: 0 };
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args), index = indices.get(response.url);
      if (index !== undefined) {
        const originalBlob = response.blob.bind(response);
        response.blob = async () => { const blob = await originalBlob(); blobs.set(blob, index); return blob; };
      }
      return response;
    };
    const originalBitmap = window.createImageBitmap;
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      const image = await Reflect.apply(originalBitmap, window, args), index = blobs.get(args[0] as Blob);
      if (index !== undefined) sources.set(image, { index, layers: [index] });
      return image;
    }) as typeof createImageBitmap;
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: [CanvasImageSource, ...number[]]) {
      const result = Reflect.apply(originalDraw, this, args), source = sources.get(args[0]);
      if (source) {
        if (this.globalAlpha === 1) sources.set(this.canvas, { index: source.index, layers: [...source.layers] });
        else {
          const base = sources.get(this.canvas);
          if (base) base.layers = [...new Set([...base.layers, ...source.layers])];
        }
      }
      if (this.canvas.dataset.renderer === 'photographic-2d') {
        window.__coveredRenderAudit.draws++;
        window.__coveredRenderAudit.primary = source ? { index: source.index, layers: [...source.layers] } : undefined;
      }
      return result;
    } as typeof originalDraw;
  }, manifest.frames.map((frame) => frame.url));
}

async function seekWholeJourney(page: Page, progress: number) {
  await page.locator('.journey').evaluate((section, p) => window.scrollTo({
    top: section.getBoundingClientRect().top + scrollY + (section.clientHeight - innerHeight) * p,
    behavior: 'instant',
  }), progress);
  await expect.poll(async () => Number(await page.locator('.journey').getAttribute('data-progress')))
    .toBeCloseTo(progress, 2);
  await page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
}

async function expectCurrentPhotograph(page: Page) {
  const photoProgress = await page.locator('.journey').evaluate((section) => {
    const top = section.getBoundingClientRect().top + scrollY;
    return Math.max(0, Math.min(1, (scrollY - top) / Math.round((section.clientHeight - innerHeight) * .83)));
  });
  const expected = Math.round(frameAtProgress(photoProgress, manifest.frames.map((frame) => frame.at)));
  await expect.poll(() => page.evaluate(() => window.__coveredRenderAudit.primary?.index)).toBe(expected);
  const canvas = page.locator('canvas[data-renderer="photographic-2d"]');
  await expect(canvas).toBeVisible();
  const pixels = await canvas.evaluate((element) => {
    const surface = element as HTMLCanvasElement, context = surface.getContext('2d')!;
    const samples = [.2, .5, .8].flatMap((x) => [.2, .5, .8].map((y) =>
      [...context.getImageData(Math.floor(surface.width * x), Math.floor(surface.height * y), 1, 1).data]));
    return samples.filter(([r, g, b, a]) => a === 255 && Math.max(r, g, b) > 10
      && Math.max(Math.abs(r - 16), Math.abs(g - 35), Math.abs(b - 56)) > 10).length;
  });
  expect(pixels, 'The restored canvas contains photographic pixels instead of an empty background').toBeGreaterThanOrEqual(2);
}

for (const [width, height] of [[1440, 900], [375, 812]]) {
  test(`opaque equation paper suppresses viewport draws and restores the current photograph at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await observePhotographDraws(page);
    await page.goto('/');
    const canvas = page.locator('canvas[data-renderer="photographic-2d"]');
    await expect(canvas).toHaveAttribute('data-preload-ready', 'true', { timeout: 30_000 });
    await expect(canvas).toHaveAttribute('data-animation-ready', 'true');
    await expect(canvas).toHaveAttribute('data-preload-count', String(manifest.frames.length));
    await seekWholeJourney(page, .23);
    const stage = page.locator('.journey-equation[data-equation="16"]');
    await expect.poll(() => stage.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');

    const evidence = await page.evaluate(async () => {
      const section = document.querySelector<HTMLElement>('.journey')!;
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-renderer="photographic-2d"]')!;
      const paper = document.querySelector<HTMLElement>('.journey-equation[data-equation="16"]')!;
      const top = section.getBoundingClientRect().top + scrollY, span = section.clientHeight - innerHeight;
      const initial = { draws: window.__coveredRenderAudit.draws, renders: Number(canvas.dataset.renderCount) };
      const samples: { opacity: number; backgroundAlpha: number; visibility: string; covers: boolean; requested: number; draws: number; renders: number }[] = [];
      function sample() {
        const style = getComputedStyle(paper), bounds = paper.getBoundingClientRect(), viewport = canvas.getBoundingClientRect();
        const color = style.backgroundColor.match(/[\d.]+/g)!.map(Number);
        samples.push({ opacity: Number(style.opacity), backgroundAlpha: color.length === 4 ? color[3] : 1,
          visibility: style.visibility, covers: bounds.left <= viewport.left + 1 && bounds.top <= viewport.top + 1
            && bounds.right >= viewport.right - 1 && bounds.bottom >= viewport.bottom - 1,
          requested: Number(canvas.dataset.requestedFrame), draws: window.__coveredRenderAudit.draws,
          renders: Number(canvas.dataset.renderCount) });
      }
      sample();
      for (let i = 0; i < 20; i++) {
        window.scrollTo({ top: top + span * (.235 + (.29 - .235) * i / 19), behavior: 'instant' });
        await new Promise(requestAnimationFrame);
        sample();
      }
      for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
      sample();
      return { initial, samples };
    });
    await info.attach('covered-render-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    expect(evidence.samples.filter((sample) => sample.opacity !== 1 || sample.backgroundAlpha !== 1
      || sample.visibility !== 'visible' || !sample.covers), 'Actual paper styles and bounds cover the viewport throughout the sweep').toEqual([]);
    expect(new Set(evidence.samples.map((sample) => sample.requested)).size, 'Scroll still advances the photographic proxy request').toBeGreaterThan(5);
    expect.soft(evidence.samples.filter((sample) => sample.draws !== evidence.initial.draws),
      'A fully opaque chapter needs no photograph drawImage calls on the viewport canvas').toEqual([]);
    expect.soft(evidence.samples.filter((sample) => sample.renders !== evidence.initial.renders),
      'A fully opaque chapter keeps the viewport render count fixed').toEqual([]);

    await seekWholeJourney(page, .18);
    await expect(stage).toBeHidden();
    await expectCurrentPhotograph(page);
    await seekWholeJourney(page, .33);
    await expect(stage).toBeHidden();
    await expectCurrentPhotograph(page);
    // Both ResizeObserver and ScrollTrigger's resize refresh must preserve the
    // actual source and repaint an opaque photograph after the covered seek.
    const beforeResize = await page.evaluate(() => window.__coveredRenderAudit.draws);
    await page.setViewportSize({ width: width - 1, height });
    await expect.poll(() => canvas.evaluate((element) => element.getBoundingClientRect().width)).toBe(width - 1);
    await expect.poll(() => page.evaluate(() => window.__coveredRenderAudit.draws)).toBeGreaterThan(beforeResize);
    await expectCurrentPhotograph(page);
    await page.setViewportSize({ width, height });
    await seekWholeJourney(page, .33);
    await expectCurrentPhotograph(page);
  });
}
