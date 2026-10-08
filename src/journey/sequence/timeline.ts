export function frameAtProgress(progress: number, stops: readonly number[]) {
  const p = Math.max(0, Math.min(1, progress));
  if (p >= 1) return stops.length - 1;
  const upper = stops.findIndex((stop) => stop > p);
  if (upper <= 0) return 0;
  return upper - 1 + (p - stops[upper - 1]) / (stops[upper] - stops[upper - 1]);
}
export function progressAtFrame(frame: number, stops: readonly number[]) {
  const f = Math.max(0, Math.min(stops.length - 1, frame));
  const lower = Math.floor(f), upper = Math.ceil(f);
  return stops[lower] + (stops[upper] - stops[lower]) * (f - lower);
}
