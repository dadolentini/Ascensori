import { test, expect } from './browser.spec';
import type { Page } from '@playwright/test';
import manifest from '../../src/journey/sequence/manifest.json' with { type: 'json' };
import { frameAtProgress } from '../../src/journey/sequence/timeline';
import { writeFile } from 'node:fs/promises';

// Recording a screencast adds deferred GPU work to the quantity measured.
// Keep the independent source audit and JSON diagnostics, without recording.
test.use({ trace: 'off' });

type Rect = { x: number; y: number; width: number; height: number };
type Draw = { index: number; layers: number[]; args: number[]; sourceSize: number[]; referenceRect: Rect; requested: number; alpha: number; durationMs: number; time: number };
type Audit = { fetches: number[]; decoded: number[]; released: number[]; draws: Draw[]; primary?: Draw; covered(): boolean };
declare global { interface Window { __journeyAudit: Audit } }

// Observe the image that really reaches drawImage. Requested-frame attributes
// alone previously passed while an older photograph remained on the canvas.
async function auditImages(page: Page) {
  await page.addInitScript((urls) => {
    const origins = new Map(urls.map((url, index) => [new URL(url, location.origin).href, index]));
    type Trace = { index: number; layers: number[]; size: number[]; rect: { x: number; y: number; width: number; height: number } };
    const blobs = new WeakMap<Blob, number>(), sources = new WeakMap<object, Trace>();
    window.__journeyAudit = { fetches: [], decoded: [], released: [], draws: [], covered() {
      // Observe actual visible paper, independently of renderer state or its
      // requested index. A partially transparent panel never qualifies.
      const paper = document.querySelector<HTMLElement>('.journey-equation[aria-hidden="false"]');
      if (!paper) return false;
      const style = getComputedStyle(paper), bounds = paper.getBoundingClientRect();
      const color = style.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      return Number(style.opacity) === 1 && style.visibility === 'visible'
        && (color.length === 3 || color[3] === 1)
        && bounds.left <= 1 && bounds.top <= 1
        && bounds.right >= innerWidth - 1 && bounds.bottom >= innerHeight - 1;
    } };
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args), index = origins.get(response.url);
      if (index !== undefined) {
        window.__journeyAudit.fetches.push(index);
        const originalBlob = response.blob.bind(response);
        response.blob = async () => { const blob = await originalBlob(); blobs.set(blob, index); return blob; };
      }
      return response;
    };
    const originalBitmap = window.createImageBitmap;
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      const image = await Reflect.apply(originalBitmap, window, args);
      const index = blobs.get(args[0] as Blob) ?? sources.get(args[0] as object)?.index;
      if (index !== undefined) {
        sources.set(image, { index, layers: [index], size: [image.width, image.height],
          rect: { x: 0, y: 0, width: image.width, height: image.height } });
        window.__journeyAudit.decoded.push(index);
      }
      return image;
    }) as typeof createImageBitmap;
    const originalClose = ImageBitmap.prototype.close;
    ImageBitmap.prototype.close = function () {
      const index = sources.get(this)?.index;
      if (index !== undefined) window.__journeyAudit.released.push(index);
      return originalClose.call(this);
    };
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: [CanvasImageSource, ...number[]]) {
      const before = performance.now(), result = Reflect.apply(originalDraw, this, args);
      const sourceTrace = sources.get(args[0]);
      if (!sourceTrace) return result;
      const source = args[0] as ImageBitmap | HTMLCanvasElement, numeric = args.slice(1) as number[];
      const [sx, sy, sw, sh, dx, dy, dw, dh] = numeric.length === 8 ? numeric :
        [0, 0, source.width, source.height, numeric[0], numeric[1], numeric[2] ?? source.width, numeric[3] ?? source.height];
      const transform = this.getTransform(), scaleX = dw / sw, scaleY = dh / sh;
      const rect = { x: (dx + (sourceTrace.rect.x - sx) * scaleX) * transform.a + transform.e,
        y: (dy + (sourceTrace.rect.y - sy) * scaleY) * transform.d + transform.f,
        width: sourceTrace.rect.width * scaleX * transform.a, height: sourceTrace.rect.height * scaleY * transform.d };
      // Follow the real Bitmap → native scratch Canvas → viewport Canvas graph.
      // A subordinate alpha layer keeps the independently observed opaque base.
      if (this.globalAlpha === 1) sources.set(this.canvas, { ...sourceTrace, rect });
      else {
        const primary = sources.get(this.canvas);
        if (primary) primary.layers = [...new Set([...primary.layers, ...sourceTrace.layers])];
      }
      if (this.canvas.dataset.renderer === 'photographic-2d') {
        const bounds = this.canvas.getBoundingClientRect(), ratioX = bounds.width / this.canvas.width, ratioY = bounds.height / this.canvas.height;
        const draw = { index: sourceTrace.index, layers: [...sourceTrace.layers], args: numeric, sourceSize: sourceTrace.size,
          referenceRect: { x: rect.x * ratioX, y: rect.y * ratioY, width: rect.width * ratioX, height: rect.height * ratioY },
          requested: Number(this.canvas.dataset.requestedFrame), alpha: this.globalAlpha,
          durationMs: performance.now() - before, time: performance.now() };
        window.__journeyAudit.draws.push(draw);
        if (draw.alpha === 1) window.__journeyAudit.primary = draw;
        else if (window.__journeyAudit.primary)
          window.__journeyAudit.primary.layers = [...(sources.get(this.canvas)?.layers || [])];
      }
      return result;
    } as typeof originalDraw;
  }, manifest.frames.map((frame) => frame.url));
}

async function allReady(page: Page) {
  const canvas = page.locator('canvas[data-renderer="photographic-2d"]');
  await expect(canvas).toHaveAttribute('data-preload-ready', 'true', { timeout: 30_000 });
  await expect(canvas).toHaveAttribute('data-animation-ready', 'true');
  await expect(canvas).toHaveAttribute('data-painted', 'true');
  await expect(canvas).toHaveAttribute('data-preload-count', String(manifest.frames.length));
  await expect.poll(() => page.evaluate(() => new Set(window.__journeyAudit.decoded).size)).toBe(manifest.frames.length);
}

async function seek(page: Page, progress: number) {
  await page.locator('.journey').evaluate((section, p) => window.scrollTo({
    top: section.getBoundingClientRect().top + scrollY + Math.round((section.clientHeight - innerHeight) * .83) * p,
    behavior: 'instant',
  }), progress);
  const actual = await page.locator('.journey').evaluate((section) => {
    const top = section.getBoundingClientRect().top + scrollY;
    return Math.max(0, Math.min(1, (scrollY - top) / Math.round((section.clientHeight - innerHeight) * .83)));
  });
  await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-requested-frame')))
    .toBeCloseTo(frameAtProgress(actual, manifest.frames.map((frame) => frame.at)), 2);
  if (!await page.evaluate(() => window.__journeyAudit.covered())) {
    await expect.poll(() => page.evaluate(() => window.__journeyAudit.primary?.index))
      .toBe(Math.round(frameAtProgress(actual, manifest.frames.map((frame) => frame.at))));
  }
  const viewport = await page.locator('.journey-viewport').boundingBox();
  expect(Math.abs(viewport!.y), 'The architectural image stays pinned').toBeLessThan(2);
}

for (const [width, height] of [[1440, 900], [375, 812]]) {
  test(`scroll cannot advance a photograph until the LAST frame is decoded at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await auditImages(page);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    let intercepted = false;
    await page.route(`**${manifest.frames.at(-1)!.url}`, async (route) => {
      intercepted = true; await blocked; await route.continue();
    });
    try {
      await page.goto('/');
      await expect(page.locator('.sequence-poster')).toBeVisible();
      await expect.poll(() => page.locator('.sequence-poster').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect.poll(() => intercepted).toBe(true);
      await expect(page.locator('canvas')).toHaveAttribute('data-preload-ready', 'false');
      await expect(page.locator('canvas')).toHaveAttribute('data-animation-ready', 'false');
      await page.locator('.journey').evaluate((section) => window.scrollTo({
        top: section.getBoundingClientRect().top + scrollY + (section.clientHeight - innerHeight) * .65,
        behavior: 'instant',
      }));
      // Let scroll events, GSAP's ticker, and decoding callbacks all run.
      await page.evaluate(async () => {
        for (let i = 0; i < 24; i++) await new Promise(requestAnimationFrame);
      });
      const waiting = await page.evaluate(() => ({
        requested: Number(document.querySelector<HTMLCanvasElement>('canvas')!.dataset.requestedFrame || 0),
        actual: window.__journeyAudit.draws.map((draw) => draw.index),
        complete: new Set(window.__journeyAudit.decoded).size,
      }));
      expect(waiting.complete).toBeLessThan(manifest.frames.length);
      expect(waiting.requested, 'No ScrollTrigger-driven frame movement before ALL frames decode').toBe(0);
      expect(waiting.actual, 'The loading photograph remains the poster; Canvas playback has not begun').toEqual([]);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    } finally { release(); }
    await allReady(page);
    await seek(page, .65); await seek(page, .12);
  });

  test(`rapid forward/reverse draws the requested source without eviction or freezes at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await auditImages(page); await page.goto('/'); await allReady(page);
    const evidence = await page.evaluate(async () => {
      const section = document.querySelector<HTMLElement>('.journey')!, canvas = document.querySelector('canvas')!;
      const top = section.getBoundingClientRect().top + scrollY, wholeSpan = section.clientHeight - innerHeight;
      const span = Math.round(wholeSpan * .83);
      const fetchesBefore = window.__journeyAudit.fetches.length, releasesBefore = window.__journeyAudit.released.length;
      const drawsBefore = window.__journeyAudit.draws.length;
      const longTasks: number[] = [];
      const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((entry) => entry.duration)));
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) observer.observe({ type: 'longtask' });
      async function measure(stress: boolean) {
        const timings: number[] = [], snapshots: { requested: number; actual: number | undefined; ready: string | undefined; actualLayers: number[]; declaredLayers: number[]; covered: boolean }[] = [];
        let last = await new Promise<number>(requestAnimationFrame);
        for (let i = 0; i < 90; i++) {
          const band = Math.floor(i / 15), local = (i % 15) / 14;
          const progress = stress
            ? (band % 2 ? .96 - .90 * local : .06 + .90 * local)
            : (i < 45 ? .15 + .65 * i / 44 : .8 - .65 * (i - 45) / 44);
          window.scrollTo({ top: top + (stress ? span : wholeSpan) * progress, behavior: 'instant' });
          const now = await new Promise<number>(requestAnimationFrame);
          timings.push(now - last); last = now;
          snapshots.push({ requested: Number(canvas.dataset.requestedFrame), actual: window.__journeyAudit.primary?.index,
            ready: canvas.dataset.frameReady, actualLayers: window.__journeyAudit.primary?.layers || [],
            declaredLayers: (canvas.dataset.drawnFrames || '').split(',').filter(Boolean).map(Number),
            covered: window.__journeyAudit.covered() });
        }
        timings.sort((a, b) => a - b);
        return { samples: timings.length, p95: timings[85], max: timings.at(-1), snapshots };
      }
      const baseline = await measure(false), stress = await measure(true);
      observer.disconnect();
      const draws = window.__journeyAudit.draws.slice(drawsBefore), renderTimes = draws.map((draw) => draw.durationMs).sort((a, b) => a - b);
      return { samples: baseline.samples, frameP95Ms: baseline.p95, frameMaxMs: baseline.max,
        stressSamples: stress.samples, stressFrameP95Ms: stress.p95, stressFrameMaxMs: stress.max, longTasksMs: longTasks,
        drawCallP95Ms: renderTimes[Math.floor(renderTimes.length * .95)], drawCount: draws.length,
        actualSources: [...new Set(draws.map((draw) => draw.index))], snapshots: [...baseline.snapshots, ...stress.snapshots],
        fetchesAfterReady: window.__journeyAudit.fetches.length - fetchesBefore,
        releasedAfterReady: window.__journeyAudit.released.length - releasesBefore,
        decodedBytes: Number(canvas.dataset.decodedBytes || canvas.dataset.cacheBytes), viewport: [innerWidth, innerHeight],
        browser: navigator.userAgent,
        workload: '90 rAF samples matching saved baseline: whole journey .15→.8→.15, then 90 stress samples: six alternating photo progress .06→.96 sweeps; all images decoded and actual drawImage sources observed',
        measurement: 'rAF intervals include browser rendering; drawCallP95 measures synchronous Canvas submission only, not deferred raster work' };
    });
    await info.attach('ready-sequence-performance', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    await writeFile(info.outputPath('ready-sequence-performance.json'), JSON.stringify(evidence, null, 2));
    expect(evidence.samples).toBe(90);
    expect(evidence.stressSamples).toBe(90);
    expect(evidence.fetchesAfterReady, 'Retained frames must never refetch on reverse').toBe(0);
    expect(evidence.releasedAfterReady, 'Playback must never evict a decoded frame').toBe(0);
    expect(evidence.snapshots.filter((sample) => sample.ready !== 'true')).toEqual([]);
    expect(evidence.snapshots.filter((sample) => !sample.covered && sample.actual !== Math.round(sample.requested)),
      'Actual image must match the requested frame whenever any part of the photograph is visible').toEqual([]);
    expect(evidence.snapshots.filter((sample) => sample.actualLayers.join(',') !== sample.declaredLayers.join(',')), 'Both blend contributors must match the independently traced real image graph').toEqual([]);
    expect(evidence.actualSources.length, 'The performance run must render changing photographs').toBeGreaterThanOrEqual(8);
    // Retain the budget chosen from the historical 116.6ms/150ms reference.
    // Source correctness and retention are checked independently above. The
    // workload matches, but recording and cloud raster backend now differ:
    // passing this budget cannot establish a causal percentage improvement.
    // This is an absolute cloud budget, not a real-device 60fps claim.
    expect(evidence.frameP95Ms).toBeLessThanOrEqual(116.6 * .75);
    expect(evidence.frameMaxMs, 'No interval exceeds the previous 150ms cloud maximum').toBeLessThanOrEqual(150.5);
    expect(evidence.stressFrameMaxMs, 'Rapid reversal has no multi-frame freeze').toBeLessThanOrEqual(150.5);
    await seek(page, .95); await seek(page, .07);
    await expect.poll(() => page.locator('canvas').evaluate(async (canvas) => {
      const before = canvas.dataset.renderCount;
      for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame);
      return canvas.dataset.renderCount === before;
    })).toBe(true);
  });
}

test('entrance photographs keep the glazed portal and reception landmark in desktop and mobile crops', async ({ page }, info) => {
  await auditImages(page);
  for (const [width, height] of [[1440, 900], [375, 812]]) {
    await page.setViewportSize({ width, height }); await page.goto('/'); await allReady(page);
    for (const id of ['original-04', 'original-05', 'original-06']) {
      const index = manifest.frames.findIndex((frame) => frame.id === id);
      await seek(page, manifest.frames[index].at);
      const draw = await page.evaluate(() => window.__journeyAudit.primary!);
      expect(draw.index).toBe(index);
      // Source reference landmark: the central upper glazed door / reception
      // area, normalized to the supplied photograph. Intersect its real drawn
      // rectangle with the viewport; merely reporting a focal point cannot pass.
      const { x, y, width: drawnWidth, height: drawnHeight } = draw.referenceRect;
      const landmark = { x: x + drawnWidth * .30, y: y + drawnHeight * .23,
        width: drawnWidth * .40, height: drawnHeight * .41 };
      const intersectionWidth = Math.max(0, Math.min(width, landmark.x + landmark.width) - Math.max(0, landmark.x));
      const intersectionHeight = Math.max(0, Math.min(height, landmark.y + landmark.height) - Math.max(0, landmark.y));
      const fraction = intersectionWidth * intersectionHeight / (landmark.width * landmark.height);
      expect(fraction, `${id}: the upper architectural landmark must survive the actual crop`).toBeGreaterThanOrEqual(.70);
      await info.attach(`${id}-${width}-crop`, { body: JSON.stringify({ sourceLandmark: [.30, .23, .40, .41], draw, fraction }), contentType: 'application/json' });
      if (id === 'original-04') await page.screenshot({ path: info.outputPath(`entrance-${width}.png`) });
    }
  }
});

test('a corrupt late photograph keeps playback disabled and leaves the real configurator usable', async ({ page }) => {
  await page.route(`**${manifest.frames.at(-1)!.url}`, (route) => route.fulfill({
    status: 200, contentType: 'image/webp', body: 'invalid photographic bytes',
  }));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('region', { name: 'Percorso senza animazioni' })).toBeVisible();
  await page.locator('#simulazione').scrollIntoViewIfNeeded();
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('4');
  await expect(page.getByLabel('Addetti complessivi', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Avvia simulazione' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1441);
});
