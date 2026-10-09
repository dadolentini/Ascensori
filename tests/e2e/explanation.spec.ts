import { test, expect, runSmallScenario } from './browser.spec';
import originals from '../../src/journey/sequence/originals.json' with { type: 'json' };

test('the photographic explanation is present after the simulation and navigates to the algorithm introduction', async ({ page }, info) => {
  await page.goto('/');
  const section = page.locator('#intelligenza');
  await expect(section.getByRole('heading', { level: 2 })).toHaveAccessibleName('Non più veloci. Più intelligenti.');
  await expect(section).toContainText('Un sistema intelligente che coordina gli ascensori, anticipa il traffico e riduce i tempi di attesa.');
  const image = section.locator('img');
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute('src', originals[6].url);
  await expect(image).toHaveAttribute('alt', /.+/);
  await section.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const composition = await section.evaluate((element) => {
    const bounds = element.getBoundingClientRect(), background = element.querySelector('img')!.getBoundingClientRect();
    return { section: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      image: { x: background.x, y: background.y, width: background.width, height: background.height },
      followsSimulation: !!(document.querySelector('#simulazione')!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  expect(composition.followsSimulation).toBe(true);
  expect(composition.image.width).toBeGreaterThanOrEqual(composition.section.width - 1);
  expect(composition.image.height).toBeGreaterThanOrEqual(composition.section.height - 1);
  await expect(section.locator('article')).toHaveCount(3);
  for (const label of ['Assegnazione intelligente', 'Previsione della domanda', 'Gestione della capacità'])
    await expect(section.getByRole('heading', { name: label })).toBeVisible();
  for (const card of await section.locator('article').all()) {
    const box = await card.boundingBox();
    expect(box!.x, 'Desktop explanatory cards are composed on the right').toBeGreaterThan(1440 * .5);
    expect(await card.evaluate((element) => {
      const color = getComputedStyle(element.querySelector('p')!).color.match(/\d+/g)!.slice(0, 3).map(Number);
      return Math.max(...color);
    }), 'Explanatory text is dark enough on a light panel').toBeLessThan(110);
  }
  await page.screenshot({ path: info.outputPath('photographic-explanation.png') });
  await section.getByRole('link', { name: /Esplora gli algoritmi/ }).click();
  await expect(page).toHaveURL('/algoritmi');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
});

test('the progressive algorithm narrative explains a genuine four-cabin decision and all source equations', async ({ page }) => {
  await page.goto('/algoritmi');
  const ids = await page.locator('.algorithms-layout .editorial-section').evaluateAll((sections) => sections.map((section) => section.id));
  expect(ids).toEqual(['esempio', 'decisione', 'previsione', 'capacita', 'equazioni', 'metodologia']);
  await expect(page.locator('#esempio')).toContainText(/decimo piano|10° piano|piano 10/);
  await expect(page.locator('#esempio [data-cabin]')).toHaveCount(4);
  await expect(page.locator('#esempio [data-cabin="B"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#esempio [data-cabin="A"]')).toHaveAttribute('data-selected', 'false');
  await page.getByRole('button', { name: 'Libera la cabina A' }).click();
  await expect(page.locator('#esempio [data-cabin="A"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#equazioni .equation-list > article')).toHaveCount(19);
  await expect(page.locator('#equazione-11')).toContainText('non implementata');
  await expect(page.locator('#metodologia')).toContainText(/sintetic|simulat/);
  await expect(page.locator('.katex-error')).toHaveCount(0);
});

for (const width of [320, 375]) {
  test(`large equations remain readable and keyboard-scroll inside their own panels at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/algoritmi');
    await page.locator('#equazioni').scrollIntoViewIfNeeded();
    await expect(page.locator('.equation-list > article')).toHaveCount(19);
    const layout = await page.locator('.equation-list .formula-block').evaluateAll((formulas) => formulas.map((formula) => ({
      fontSize: Number.parseFloat(getComputedStyle(formula).fontSize),
      katexFontSize: Number.parseFloat(getComputedStyle(formula.querySelector('.katex')!).fontSize),
      overflowX: getComputedStyle(formula).overflowX,
      left: formula.getBoundingClientRect().left, right: formula.getBoundingClientRect().right,
      clientWidth: formula.clientWidth, scrollWidth: formula.scrollWidth, tabIndex: (formula as HTMLElement).tabIndex,
    })));
    for (const formula of layout) {
      expect(formula.fontSize).toBeGreaterThanOrEqual(20);
      expect(formula.katexFontSize).toBeGreaterThanOrEqual(20);
      expect(formula.left).toBeGreaterThanOrEqual(-1);
      expect(formula.right).toBeLessThanOrEqual(width + 1);
      expect(formula.overflowX).toMatch(/auto|scroll/);
      expect(formula.tabIndex).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const overflowing = page.locator('.equation-list .formula-block').filter({ has: page.locator('.katex') });
    let panel: typeof overflowing | undefined;
    for (const candidate of await overflowing.all()) {
      if (await candidate.evaluate((element) => element.scrollWidth > element.clientWidth + 1)) { panel = candidate; break; }
    }
    expect(panel, 'At least one authentic equation is wider than this narrow viewport').toBeDefined();
    await expect(panel!).toHaveAccessibleName(/.+/);
    await panel!.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => panel!.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath(`scrollable-equation-${width}.png`) });
    await page.getByRole('button', { name: /Torna all’esperienza/ }).click();
    await page.locator('#intelligenza').scrollIntoViewIfNeeded();
    await expect(page.locator('#intelligenza article')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    for (const card of await page.locator('#intelligenza article').all()) {
      const box = await card.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
}

test('the three equation chapters use an opaque light stage and the configuration stays stable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-animation-ready', 'true', { timeout: 30_000 });
  // Scrubbed transitions can remain paused at any progress. Text appears only
  // on the solid paper surface; edge fades show the photograph without ghosts.
  for (const [progress, equation] of [[.206, '16'], [.26, '16'], [.316, '16'], [.535, '9'], [.91, '6']] as const) {
    await page.locator('.journey').evaluate((section, p) => window.scrollTo({
      top: section.getBoundingClientRect().top + scrollY + (section.clientHeight - innerHeight) * p, behavior: 'instant',
    }), progress);
    const stage = page.locator(`.journey-equation[data-equation="${equation}"]`);
    await expect(stage).toBeVisible();
    await expect(stage.locator('.formula-block')).toHaveCount(1);
    const presentation = await stage.evaluate((element) => {
      const style = getComputedStyle(element), rgba = style.backgroundColor.match(/[\d.]+/g)!.map(Number);
      const bounds = element.getBoundingClientRect();
      return { opaque: Number(style.opacity) === 1 && (rgba.length === 3 || rgba[3] === 1), width: bounds.width, height: bounds.height };
    });
    expect([presentation.width, presentation.height], 'Each formula chapter covers the full viewport').toEqual([1440, 900]);
    if (presentation.opaque) {
      await expect(stage.locator('.journey-equation-content')).toBeVisible();
      await expect(stage.locator('.journey-equation-terms')).toBeVisible();
    } else {
      await expect(stage.locator('.journey-equation-content'), 'Paused edge fades must never put formula text on the busy photograph').toBeHidden();
    }
  }
  await page.locator('#simulazione').scrollIntoViewIfNeeded();
  await page.getByLabel('Addetti complessivi', { exact: true }).fill('4');
  const stable = await page.locator('.configuration-panel').evaluate(async (panel) => {
    await document.fonts.ready;
    const initial = panel.getBoundingClientRect(), samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame);
      const bounds = panel.getBoundingClientRect();
      samples.push(Math.max(Math.abs(bounds.x - initial.x), Math.abs(bounds.y - initial.y)));
    }
    const animated = [...panel.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element);
      return style.animationName !== 'none' && style.animationIterationCount === 'infinite';
    }).length;
    return { maxMovement: Math.max(...samples), animated };
  });
  expect(stable.maxMovement).toBeLessThanOrEqual(1);
  expect(stable.animated).toBe(0);
  await runSmallScenario(page, 4);
  await expect(page.locator('#results')).toBeVisible();
  expect(await page.locator('#results').evaluate((results) => !!(results.compareDocumentPosition(document.querySelector('#intelligenza')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});
