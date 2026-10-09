import { test, expect } from './browser.spec';

const chapters = [[.26, '16'], [.535, '9'], [.91, '6']] as const;

for (const [width, height] of [[844, 390], [1280, 600]]) {
  for (const [progress, equation] of chapters) {
    test(`equation ${equation} stays locally scrollable and reachable at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.locator('canvas[data-renderer="photographic-2d"]'))
        .toHaveAttribute('data-animation-ready', 'true', { timeout: 30_000 });
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.locator('.journey').evaluate((section, p) => window.scrollTo({
        top: section.getBoundingClientRect().top + scrollY + (section.clientHeight - innerHeight) * p,
        behavior: 'instant',
      }), progress);
      await expect.poll(async () => Number(await page.locator('.journey').getAttribute('data-progress')))
        .toBeCloseTo(progress, 2);

      const stage = page.locator(`.journey-equation[data-equation="${equation}"]`);
      await expect(stage.locator('.journey-equation-content')).toBeVisible();
      const initial = await stage.evaluate(async (element) => {
        element.scrollTop = 0;
        await new Promise(requestAnimationFrame);
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        const heading = element.querySelector('h2')!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return {
          overflowY: getComputedStyle(element).overflowY,
          scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
          headingTop: heading.top, headingBottom: heading.bottom,
          top: Math.max(bounds.top, header.bottom), bottom: Math.min(bounds.bottom, innerHeight),
          documentY: scrollY,
        };
      });
      if (initial.scrollHeight > initial.clientHeight + 1) {
        expect.soft(initial.overflowY, 'A taller chapter needs its own vertical scroll container').toMatch(/auto|scroll/);
      }
      expect.soft(initial.headingTop, 'Resetting local scroll exposes the chapter heading below the header')
        .toBeGreaterThanOrEqual(initial.top - 1);
      expect.soft(initial.headingBottom).toBeLessThanOrEqual(initial.bottom + 1);

      // Scroll only this paper stage. A document scroll would leave the chapter
      // and could make clipped content appear reachable for the wrong reason.
      for (const selector of ['.journey-equation-terms > div:nth-child(1)',
        '.journey-equation-terms > div:nth-child(2)', '.journey-equation-terms > div:nth-child(3)', '.equation-source']) {
        const reached = await stage.evaluate(async (element, targetSelector) => {
          const target = element.querySelector(targetSelector)!;
          const stageBounds = element.getBoundingClientRect(), targetBounds = target.getBoundingClientRect();
          const visibleTop = Math.max(stageBounds.top, document.querySelector('.site-header')!.getBoundingClientRect().bottom);
          const visibleBottom = Math.min(stageBounds.bottom, innerHeight);
          element.scrollTop += (targetBounds.top + targetBounds.bottom - visibleTop - visibleBottom) / 2;
          await new Promise(requestAnimationFrame);
          const bounds = target.getBoundingClientRect();
          return { top: bounds.top, bottom: bounds.bottom, visibleTop, visibleBottom, documentY: scrollY };
        }, selector);
        expect.soft(reached.top, `${selector} can be reached by scrolling the paper stage`)
          .toBeGreaterThanOrEqual(reached.visibleTop - 1);
        expect.soft(reached.bottom, `${selector} fits inside the visible paper stage`)
          .toBeLessThanOrEqual(reached.visibleBottom + 1);
        expect.soft(reached.documentY, 'Reading a chapter does not advance document scrolling').toBe(initial.documentY);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'The chapter does not overflow horizontally')
        .toBeLessThanOrEqual(width + 1);
    });
  }
}
