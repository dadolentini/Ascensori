export function frameLayers(frame: number, frames: readonly { scene: string }[]) {
  const f = Math.max(0, Math.min(frames.length - 1, frame));
  const lower = Math.floor(f), upper = Math.ceil(f), nearest = Math.round(f);
  if (lower === upper || frames[lower].scene !== frames[upper].scene)
    return [{ index: nearest, alpha: 1 }];
  const inset = frames[lower].scene === 'elevator' ? .35 : .2;
  const t = Math.max(0, Math.min(1, (f - lower - inset) / (1 - inset * 2)));
  const blend = t * t * (3 - 2 * t);
  if (blend === 0 || blend === 1) return [{ index: blend === 0 ? lower : upper, alpha: 1 }];
  return [{ index: nearest, alpha: 1 },
    { index: nearest === lower ? upper : lower, alpha: nearest === lower ? blend : 1 - blend }];
}
