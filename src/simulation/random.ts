import { gaussianCDF } from './statistics';
/** Mulberry32. Open-interval uniforms avoid log(0) and endpoint atoms. Not cryptographic. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return (((x ^ (x >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
}
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}
export function normal(rng: () => number, mean: number, sigma: number): number {
  if (!(sigma >= 0) || !Number.isFinite(mean) || !Number.isFinite(sigma))
    throw new RangeError('Invalid normal parameters');
  return mean + sigma * Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
}
/** Inverse-CDF conditioning: no clipping and no rejection loop for narrow intervals. */
export function truncatedNormal(
  rng: () => number,
  mean: number,
  sigma: number,
  min: number,
  max: number,
): number {
  if (!(sigma > 0) || !(max > min) || ![mean, sigma, min, max].every(Number.isFinite))
    throw new RangeError('Invalid truncated normal parameters');
  const lo = gaussianCDF((min - mean) / sigma),
    hi = gaussianCDF((max - mean) / sigma);
  if (hi - lo <= Number.EPSILON * Math.max(hi, lo))
    throw new RangeError('Truncated interval exceeds numerical tail resolution');
  const target = lo + rng() * (hi - lo);
  let a = min,
    b = max;
  for (let i = 0; i < 55; i++) {
    const mid = a + (b - a) / 2;
    if (gaussianCDF((mid - mean) / sigma) < target) a = mid;
    else b = mid;
  }
  return a + (b - a) / 2;
}
