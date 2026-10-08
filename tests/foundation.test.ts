import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCENARIO,
  EXPERIMENT_SEEDS,
  TRAINING_SEEDS,
  VALIDATION_SEEDS,
  validateScenario,
} from '../src/simulation/scenario';
import { generateDemand } from '../src/simulation/demand';
import { seededRandom, truncatedNormal } from '../src/simulation/random';
import {
  gaussianCDF,
  pairedConfidenceInterval,
  percentile,
  summarize,
} from '../src/simulation/statistics';
import type { Request, Scenario } from '../src/simulation/types';
import { learnHabits, forecastFloors } from '../src/simulation/learning';
import { diagnosticsNNLS, solveNNLS } from '../src/simulation/diagnostics';

function smallScenario(): Scenario {
  const s = structuredClone(DEFAULT_SCENARIO);
  s.totalFloors = 3;
  s.forecast.habitSigma = 0;
  s.forecast.dailyJitter = 0;
  s.groups = [
    {
      id: 'g',
      name: 'Group',
      floor: 1,
      employees: 10,
      breaks: [
        { id: 'morning', start: 36000, duration: 900, participation: 1, sigma: 30 },
        { id: 'lunch', start: 46800, duration: 3600, participation: 1, sigma: 30 },
      ],
    },
  ];
  return s;
}

describe('numerical primitives', () => {
  it('matches scipy norm.cdf fixtures including extreme negative tails', () => {
    const fixtures = [
      [-8, 6.22096057427174e-16],
      [-5, 2.866515718791933e-7],
      [-2, 0.022750131948179195],
      [-1, 0.15865525393145707],
      [0, 0.5],
      [1, 0.8413447460685429],
      [2, 0.9772498680518208],
      [5, 0.9999997133484281],
    ];
    for (const [x, expected] of fixtures)
      expect(Math.abs(gaussianCDF(x) - expected)).toBeLessThanOrEqual(
        Math.max(expected * 2e-13, 1e-30),
      );
    expect(gaussianCDF(-Infinity)).toBe(0);
    expect(gaussianCDF(Infinity)).toBe(1);
  });
  it('reports null with no samples and uses linear interpolation for quantiles', () => {
    expect(summarize([])).toEqual({ count: 0, mean: null, median: null, p90: null, p95: null });
    expect(summarize([0, 10, 20, 30])).toMatchObject({ count: 4, mean: 15, median: 15, p90: 27 });
    expect(summarize([0, 10, 20, 30]).p95).toBeCloseTo(28.5, 12);
    expect(percentile([5], 0.95)).toBe(5);
  });
  it('uses paired daily differences with Student t and preserves worsening signs', () => {
    expect(pairedConfidenceInterval([10], [9])).toBeNull();
    const ci = pairedConfidenceInterval(Array(8).fill(10), [9, 8, 7, 6, 5, 4, 3, 2]);
    expect(ci?.mean).toBe(4.5);
    expect(ci?.lower).toBeCloseTo(4.5 - 2.364624251592784 * Math.sqrt(0.75), 10);
    expect(ci?.upper).toBeCloseTo(4.5 + 2.364624251592784 * Math.sqrt(0.75), 10);
    expect(pairedConfidenceInterval([1, 2], [2, 3])?.mean).toBe(-1);
  });
  it('produces reproducible non-degenerate draws and conditions rather than clipping weights', () => {
    const a = seededRandom(42),
      b = seededRandom(42),
      c = seededRandom(43);
    const xs = Array.from({ length: 40 }, () => a()),
      ys = Array.from({ length: 40 }, () => b());
    expect(xs).toEqual(ys);
    expect(new Set(xs).size).toBe(40);
    expect(c()).not.toBe(xs[0]);
    const rng = seededRandom(9);
    const weights = Array.from({ length: 2000 }, () => truncatedNormal(rng, 0, 1, -0.2, 0.2));
    expect(weights.every((w) => w > -0.2 && w < 0.2)).toBe(true);
    expect(summarize(weights).mean).toBeCloseTo(0, 2);
    expect(weights.filter((w) => w < 0).length).toBeGreaterThan(800);
  });
});

describe('synthetic OD demand', () => {
  it('is repeatable and creates separate exit/return components for every break', () => {
    const s = smallScenario(),
      trace = generateDemand(s, 101);
    expect(trace).toEqual(generateDemand(s, 101));
    expect(trace).not.toEqual(generateDemand(s, 202));
    expect(trace.filter((r) => r.tripType === 'arrival')).toHaveLength(10);
    expect(trace.filter((r) => r.tripType === 'departure')).toHaveLength(10);
    for (const id of ['morning', 'lunch']) {
      expect(trace.filter((r) => r.breakId === id && r.tripType === 'break_exit')).toHaveLength(10);
      expect(trace.filter((r) => r.breakId === id && r.tripType === 'break_return')).toHaveLength(
        10,
      );
    }
    expect(trace.every((r) => r.source !== r.dest && r.born > 0 && Number.isFinite(r.weight))).toBe(
      true,
    );
    expect(trace.map((r) => r.born)).toEqual([...trace.map((r) => r.born)].sort((a, b) => a - b));
  });
  it('keeps outside-horizon demand with genuine timestamps and respects per-group schedules', () => {
    const s = smallScenario();
    s.groups[0].employees = 300;
    const original = generateDemand(s, 101);
    s.groups[0].officeStart = 32400;
    s.groups[0].officeEnd = 64800;
    s.horizonStart = 40000;
    s.horizonEnd = 60000;
    const trace = generateDemand(s, 101);
    expect(trace.some((r) => r.born < s.horizonStart)).toBe(true);
    expect(trace.some((r) => r.born > s.horizonEnd)).toBe(true);
    expect(trace.some((r) => r.born === s.horizonStart || r.born === s.horizonEnd)).toBe(false);
    const arrivals = (xs: typeof trace) =>
      summarize(xs.filter((r) => r.tripType === 'arrival').map((r) => r.born)).mean!;
    expect(arrivals(trace) - arrivals(original)).toBeCloseTo(3600, 8);
    s.internalProbability = 1;
    expect(
      generateDemand(s, 101)
        .filter((r) => r.tripType === 'internal')
        .every((r) => r.born >= 32400 && r.born <= 64800),
    ).toBe(true);
  });
  it('honours zero participation and suppresses invalid internal trips with one upper floor', () => {
    const s = smallScenario();
    s.totalFloors = 2;
    s.internalProbability = 1;
    s.groups[0].breaks.forEach((b) => (b.participation = 0));
    const trace = generateDemand(s, 101);
    expect(trace).toHaveLength(20);
    expect(trace.some((r) => r.tripType === 'internal')).toBe(false);
    s.groups[0].employees = 0;
    expect(generateDemand(s, 101)).toEqual([]);
  });
});

describe('office learning and integrated forecast', () => {
  const observation = (id: number, breakId: string, born: number): Request => ({
    id,
    born,
    source: 1,
    dest: 0,
    weight: 76,
    groupId: 'g',
    breakId,
    tripType: 'break_exit',
  });
  it('shrinks each pause independently using only training observations', () => {
    const s = smallScenario();
    const train = [
      [
        observation(0, 'morning', 36600),
        observation(1, 'morning', 36600),
        observation(2, 'lunch', 46200),
      ],
    ];
    const learned = learnHabits(s, train, []);
    expect(learned.components).toHaveLength(2);
    expect(learned.components[0].mean).toBeCloseTo(36000 + 1200 / 24, 12);
    expect(learned.components[1].mean).toBeCloseTo(46800 - 600 / 23, 12);
    expect(learned.components[0].participation).toBeCloseTo(14 / 22, 12);
    const holdout = [[observation(3, 'morning', 38000)]];
    expect(learnHabits(s, train, holdout).components).toEqual(learned.components);
    s.forecast.habitSigma = 10000;
    expect(learnHabits(s, train, holdout).components).toEqual(learned.components);
    expect(learnHabits(s, train, holdout).holdoutDays).toBe(1);
  });
  it('uses declared priors without historical data, including exact zero and one participation', () => {
    const s = smallScenario();
    s.groups[0].breaks[0].participation = 0;
    const learned = learnHabits(s, [], []);
    expect(learned.components[0]).toMatchObject({
      mean: 36000,
      sigma: 30,
      participation: 0,
      observations: 0,
    });
    expect(learned.components[1]).toMatchObject({ mean: 46800, sigma: 30, participation: 1 });
    expect(learned.learnedMAE).toBeNull();
  });
  it('integrates each break and its own duration before aggregating by origin floor', () => {
    const s = smallScenario(),
      model = learnHabits(s, [], []);
    const at = 36000 - s.forecast.lead - s.forecast.horizon / 2;
    const first = forecastFloors(s, model, at);
    expect(first[1]).toBeCloseTo(10, 10);
    expect(first[0] ?? 0).toBeCloseTo(0, 10);
    const returned = forecastFloors(s, model, at + 900);
    expect(returned[0]).toBeCloseTo(10, 10);
    const lunchReturn = forecastFloors(
      s,
      model,
      46800 + 3600 - s.forecast.lead - s.forecast.horizon / 2,
    );
    expect(lunchReturn[0]).toBeCloseTo(10, 10);
    expect(forecastFloors(s, model, at + 300)[1]).toBeLessThan(first[1]);
  });
});

describe('NNLS diagnostics', () => {
  it('uses pointwise Gaussian basis values at bin midpoints as in equation three', () => {
    const s = smallScenario();
    s.arrivalOffset = 0;
    s.arrivalSigma = 600;
    s.groups[0].breaks = [];
    s.horizonStart = s.officeStart - 900;
    s.horizonEnd = s.officeStart + 900;
    const trace: Request[] = [];
    for (let bin = 0; bin < 3; bin++)
      for (let n = 0; n < [1, 2, 1][bin]; n++)
        trace.push({
          id: trace.length,
          born: s.horizonStart + bin * 600 + 300,
          source: 0,
          dest: 1,
          weight: 76,
          groupId: 'g',
          tripType: 'arrival',
        });
    const fit = diagnosticsNNLS(s, [trace], 1),
      r = Math.exp(-0.5);
    // The constrained optimum has beta0=0, and beta1=(X'y)/(X'X).
    expect(fit.coefficients.up[0]).toBeCloseTo(0, 10);
    expect(fit.coefficients.up[1]).toBeCloseTo((0.2 + 0.2 * r) / (1 + 2 * r * r), 10);
  });
  it('fits a constant internal flow with beta0 and passenger-per-minute rates in both directions', () => {
    const s = smallScenario();
    s.horizonStart = 32400;
    s.horizonEnd = 33600;
    const trace: Request[] = [];
    for (let bin = 0; bin < 2; bin++) {
      const born = s.horizonStart + bin * 600 + 300;
      trace.push({
        id: trace.length,
        born,
        source: 1,
        dest: 2,
        weight: 76,
        groupId: 'g',
        tripType: 'internal',
      });
      for (let i = 0; i < 2; i++)
        trace.push({
          id: trace.length,
          born,
          source: 2,
          dest: 1,
          weight: 76,
          groupId: 'g',
          tripType: 'internal',
        });
    }
    const fit = diagnosticsNNLS(s, [trace, trace], 1);
    expect(fit.components.filter((c) => c.direction === 'up')[0]).toMatchObject({
      kind: 'intercept',
    });
    expect(fit.components.filter((c) => c.direction === 'down')[0]).toMatchObject({
      kind: 'intercept',
    });
    expect(fit.coefficients.up[0]).toBeCloseTo(0.1, 12);
    expect(fit.coefficients.down[0]).toBeCloseTo(0.2, 12);
    expect(fit.trainingRMSE).toBeCloseTo(0, 12);
    expect(fit.holdoutRMSE).toBeCloseTo(0, 12);
  });
  it('solves a known constrained least-squares optimum without negative coefficients', () => {
    expect(
      solveNNLS(
        [
          [1, 0],
          [0, 1],
          [1, 1],
        ],
        [2, -1, 1],
      ),
    ).toEqual([1.5, 0]);
    const coefficients = solveNNLS(
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [2, 3, 5],
    );
    expect(coefficients[0]).toBeCloseTo(2, 10);
    expect(coefficients[1]).toBeCloseTo(3, 10);
  });
  it('does not use held-out calls to fit coefficients and keeps all custom pause components', () => {
    const s = smallScenario();
    const train = generateDemand(s, 101);
    const a = diagnosticsNNLS(s, [train, train], 1);
    const b = diagnosticsNNLS(s, [train, []], 1);
    expect(a.trainingDays).toBe(1);
    expect(a.holdoutDays).toBe(1);
    expect(a.coefficients).toEqual(b.coefficients);
    expect(a.components.filter((c) => c.direction === 'down')).toHaveLength(4);
    expect(a.components.filter((c) => c.direction === 'up')).toHaveLength(4);
    expect(a.holdoutRMSE).not.toBe(b.holdoutRMSE);
    expect(a.coefficients.up.every((v) => v >= 0)).toBe(true);
  });
});

describe('canonical scenario', () => {
  it('matches the source population and counts ground within sixteen floors', () => {
    expect(DEFAULT_SCENARIO.totalFloors).toBe(16);
    expect(DEFAULT_SCENARIO.elevatorCount).toBe(4);
    expect(DEFAULT_SCENARIO.groups).toHaveLength(30);
    expect(DEFAULT_SCENARIO.groups.reduce((n, g) => n + g.employees, 0)).toBe(525);
    expect(DEFAULT_SCENARIO.groups.find((g) => g.id === 'U12-FOCUS')).toMatchObject({
      floor: 12,
      employees: 65,
    });
    expect(validateScenario(DEFAULT_SCENARIO)).toEqual([]);
  });
  it('keeps learning and experiment days disjoint', () => {
    expect(new Set([...EXPERIMENT_SEEDS, ...TRAINING_SEEDS, ...VALIDATION_SEEDS]).size).toBe(24);
  });
  it('rejects zero sigma, overlapping breaks, out-of-range floors and an overnight activity window', () => {
    const s = structuredClone(DEFAULT_SCENARIO);
    // This fixture deliberately starts with a valid documented scenario.
    expect(validateScenario(s)).toEqual([]);
    s.arrivalSigma = 0;
    s.officeEnd = s.officeStart - 1;
    s.groups[0].floor = s.totalFloors;
    s.groups[0].breaks.push({ ...s.groups[0].breaks[0], id: 'overlap' });
    const errors = validateScenario(s).join(' ');
    expect(errors).toMatch(/arrivalSigma/);
    expect(errors).toMatch(/officeEnd/);
    expect(errors).toMatch(/floor/);
    expect(errors).toMatch(/sovrapposte/);
  });
  it('accepts no employees, one upper floor and exact zero/one participation', () => {
    const s = structuredClone(DEFAULT_SCENARIO);
    s.elevatorCount = 1;
    s.totalFloors = 2;
    s.groups = [
      {
        id: 'empty',
        name: 'Empty',
        floor: 1,
        employees: 0,
        breaks: [{ id: 'b', start: 43200, duration: 3600, participation: 0, sigma: 540 }],
      },
    ];
    expect(validateScenario(s)).toEqual([]);
    s.groups[0].breaks[0].participation = 1;
    expect(validateScenario(s)).toEqual([]);
  });
});
