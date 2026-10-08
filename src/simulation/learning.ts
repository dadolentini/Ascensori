import type { LearnedBreak, LearningResult, Request, Scenario } from './types';
import { gaussianCDF, mean } from './statistics';

function componentKey(groupId: string, breakId: string): string {
  return JSON.stringify([groupId, breakId]);
}
function windowProbability(from: number, to: number, center: number, sigma: number): number {
  // A zero empirical dispersion with zero prior is a point mass, never an invented clipped sigma.
  if (sigma === 0) return from <= center && center < to ? 1 : 0;
  return gaussianCDF((to - center) / sigma) - gaussianCDF((from - center) / sigma);
}
function validationMAE(components: LearnedBreak[], traces: Request[][]): number | null {
  if (!traces.length || !components.length) return null;
  let sum = 0,
    count = 0;
  // Full declared calendar day, in five-minute bins; not a hardcoded lunchtime interval.
  for (const trace of traces) {
    const counts = new Map<string, number[]>();
    for (const r of trace)
      if (r.tripType === 'break_exit' && r.breakId !== undefined && r.born >= 0 && r.born < 86400) {
        const key = componentKey(r.groupId, r.breakId);
        if (!counts.has(key)) counts.set(key, Array(288).fill(0));
        counts.get(key)![Math.floor(r.born / 300)]++;
      }
    for (const m of components)
      for (let bin = 0; bin < 288; bin++) {
        const observed = counts.get(componentKey(m.groupId, m.breakId))?.[bin] ?? 0;
        const expected =
          m.employees *
          m.participation *
          windowProbability(bin * 300, (bin + 1) * 300, m.mean, m.sigma);
        sum += Math.abs(observed - expected);
        count++;
      }
  }
  return count ? sum / count : null;
}

export function learnHabits(
  s: Scenario,
  trainTraces: Request[][],
  holdoutTraces: Request[][],
): LearningResult {
  const observations = new Map<string, number[]>();
  for (const trace of trainTraces)
    for (const r of trace)
      if (r.tripType === 'break_exit' && r.breakId !== undefined) {
        const key = componentKey(r.groupId, r.breakId);
        if (!observations.has(key)) observations.set(key, []);
        observations.get(key)!.push(r.born);
      }
  const components: LearnedBreak[] = [],
    declared: LearnedBreak[] = [];
  for (const g of s.groups)
    for (const b of g.breaks) {
      const times = observations.get(componentKey(g.id, b.id)) ?? [],
        n = times.length;
      const prior = s.forecast.priorEvents,
        exposure = g.employees * trainTraces.length;
      if (n > exposure) throw new RangeError(`More observations than exposure: ${g.id}/${b.id}`);
      const sampleMean = mean(times);
      const center = n ? (n * sampleMean! + prior * b.start) / (n + prior) : b.start;
      const sampleVariance =
        n > 2 ? times.reduce((sum, t) => sum + (t - sampleMean!) ** 2, 0) / (n - 1) : b.sigma ** 2;
      const sigma =
        n > 2 ? Math.sqrt((n * sampleVariance + prior * b.sigma ** 2) / (n + prior)) : b.sigma;
      const denominator = exposure + s.forecast.priorExposure;
      const participation =
        denominator > 0 && trainTraces.length > 0
          ? (n + s.forecast.priorExposure * b.participation) / denominator
          : b.participation;
      const model: LearnedBreak = {
        groupId: g.id,
        breakId: b.id,
        floor: g.floor,
        employees: g.employees,
        scheduled: b.start,
        duration: b.duration,
        mean: center,
        sigma,
        participation,
        observations: n,
      };
      components.push(model);
      declared.push({ ...model, mean: b.start, sigma: b.sigma, participation: b.participation });
    }
  return {
    components,
    trainDays: trainTraces.length,
    holdoutDays: holdoutTraces.length,
    scheduledMAE: validationMAE(declared, holdoutTraces),
    learnedMAE: validationMAE(components, holdoutTraces),
  };
}

export function forecastFloors(
  s: Scenario,
  learning: LearningResult,
  now: number,
): Record<number, number> {
  if (!Number.isFinite(now)) throw new RangeError('Forecast time must be finite');
  const from = now + s.forecast.lead,
    to = from + s.forecast.horizon,
    demand: Record<number, number> = {};
  for (const m of learning.components) {
    const count = m.employees * m.participation;
    demand[m.floor] = (demand[m.floor] ?? 0) + count * windowProbability(from, to, m.mean, m.sigma);
    demand[0] =
      (demand[0] ?? 0) + count * windowProbability(from, to, m.mean + m.duration, m.sigma);
  }
  return demand;
}
