import type { ConfidenceInterval, SummaryStatistics } from './types';
/** Regularized gamma at a=1/2: convergent series near zero and continued fraction in tails. */
export function gaussianCDF(x: number): number {
  if (Number.isNaN(x)) throw new RangeError('Gaussian argument must be a number');
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  if (x === 0) return 0.5;
  const z = (x * x) / 2;
  if (!Number.isFinite(z)) return x > 0 ? 1 : 0;
  const factor = Math.exp(-z + 0.5 * Math.log(z) - 0.5 * Math.log(Math.PI));
  let q: number;
  if (z < 1.5) {
    let sum = 2,
      term = 2;
    for (let n = 1; n < 1000; n++) {
      term *= z / (0.5 + n);
      sum += term;
      if (Math.abs(term) <= Math.abs(sum) * 2e-16) break;
    }
    q = 1 - sum * factor;
  } else {
    const tiny = 1e-300;
    let b = z + 0.5,
      c = 1 / tiny,
      d = 1 / b,
      fraction = d;
    for (let n = 1; n < 1000; n++) {
      const a = -n * (n - 0.5);
      b += 2;
      d = a * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + a / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const delta = d * c;
      fraction *= delta;
      if (Math.abs(delta - 1) < 3e-16) break;
    }
    q = factor * fraction;
  }
  return x < 0 ? 0.5 * q : 1 - 0.5 * q;
}

function assertFinite(values: number[]): void {
  if (values.some((v) => !Number.isFinite(v))) throw new RangeError('Samples must be finite');
}
export function mean(values: number[]): number | null {
  assertFinite(values);
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}
export function percentile(values: number[], p: number): number | null {
  assertFinite(values);
  if (!(p >= 0 && p <= 1)) throw new RangeError('Percentile probability must be in [0,1]');
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b),
    at = p * (xs.length - 1),
    lo = Math.floor(at);
  return xs[lo] + (xs[Math.ceil(at)] - xs[lo]) * (at - lo);
}
export function summarize(values: number[]): SummaryStatistics {
  return {
    count: values.length,
    mean: mean(values),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p95: percentile(values, 0.95),
  };
}

// Exact 97.5% Student-t quantiles for the supported 2–8 independent daily replicas.
const T95 = [
  0, 12.706204736432095, 4.302652729696142, 3.182446305284263, 2.7764451051977987,
  2.570581835636314, 2.44691184879168, 2.364624251592784,
];
/** Positive = baseline minus candidate (improvement); never clips a deterioration. */
export function pairedConfidenceInterval(
  baseline: number[],
  candidate: number[],
): ConfidenceInterval | null {
  if (baseline.length !== candidate.length)
    throw new RangeError('Paired samples must have equal length');
  assertFinite(baseline);
  assertFinite(candidate);
  if (baseline.length < 2) return null;
  if (baseline.length > 8) throw new RangeError('Supported independent daily replicas: 2–8');
  const diffs = baseline.map((v, i) => v - candidate[i]),
    n = diffs.length,
    average = mean(diffs)!;
  const variance = diffs.reduce((s, v) => s + (v - average) ** 2, 0) / (n - 1);
  const half = T95[n - 1] * Math.sqrt(variance / n);
  return {
    count: n,
    mean: average,
    lower: average - half,
    upper: average + half,
    confidence: 0.95,
  };
}
