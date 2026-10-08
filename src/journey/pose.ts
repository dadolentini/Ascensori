export type Point3 = [number, number, number];
/** Direct in-building portal placement approved by the user, not surveyed coordinates. */
export const PORTAL_POSITION: Point3 = [0, 0, -16.5];
export type JourneyPhase =
  | 'exterior'
  | 'entrance'
  | 'lobby'
  | 'elevator'
  | 'approach'
  | 'doors'
  | 'cabin'
  | 'equations'
  | 'configurator';
export interface JourneyPose {
  cameraPosition: Point3;
  target: Point3;
  doorOpen: number;
  entranceOpen: number;
  phase: JourneyPhase;
}
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const segment = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const mix = (a: Point3, b: Point3, t: number): Point3 =>
  a.map((value, index) => value + (b[index] - value) * t) as Point3;

/** Portrait framing keeps the architectural entrance and single portal visible. */
export function journeyFov(progress: number, aspect = 1.78): number {
  const portrait = Math.max(0, Math.min(1, (1.1 - Math.max(0.25, aspect)) / 0.6));
  return 52 + portrait * 18 + 4 * (1 - segment(clamp(progress), 0, 0.15));
}

export function journeyPose(progress: number, aspect = 1.78): JourneyPose {
  const p = clamp(progress);
  let cameraPosition: Point3;
  let target: Point3;
  let phase: JourneyPhase;
  if (p <= 0.15) {
    const t = segment(p, 0, 0.15);
    cameraPosition = mix([-15, 1.65, 62], [0, 1.65, 2], t);
    target = mix([-8, 23, -7], [0, 1.65, -10], t);
    phase = 'exterior';
  } else if (p <= 0.23) {
    cameraPosition = mix([0, 1.65, 2], [0, 1.65, -3], segment(p, 0.15, 0.23));
    target = [0, 1.65, cameraPosition[2] - 12];
    phase = 'entrance';
  } else if (p <= 0.43) {
    const t = segment(p, 0.23, 0.43);
    cameraPosition = mix([0, 1.65, -3], [0, 1.65, -8.2], t);
    target = mix([0, 1.65, -15], [0, 1.65, PORTAL_POSITION[2]], t);
    phase = 'lobby';
  } else if (p <= 0.54) {
    cameraPosition = mix([0, 1.65, -8.2], [0, 1.65, -10.2], segment(p, 0.43, 0.54));
    target = [0, 1.65, PORTAL_POSITION[2]];
    phase = 'elevator';
  } else if (p <= 0.62) {
    cameraPosition = [0, 1.65, -10.2];
    target = [0, 1.65, PORTAL_POSITION[2]];
    phase = 'elevator';
  } else if (p <= 0.72) {
    const t = segment(p, 0.62, 0.72);
    cameraPosition = mix([0, 1.65, -10.2], [0, 1.65, -12.8], t);
    target = [0, 1.65, PORTAL_POSITION[2]];
    phase = 'approach';
  } else if (p <= 0.79) {
    cameraPosition = [0, 1.65, -12.8];
    target = [0, 1.65, PORTAL_POSITION[2]];
    phase = 'doors';
  } else {
    cameraPosition = mix([0, 1.65, -12.8], [0, 1.65, -17.75], segment(p, 0.79, 0.83));
    target = mix([0, 1.65, PORTAL_POSITION[2]], [0, 1.65, -20], segment(p, 0.79, 0.83));
    phase = p <= 0.83 ? 'cabin' : p <= 0.92 ? 'equations' : 'configurator';
  }
  return {
    cameraPosition,
    target,
    doorOpen: segment(p, 0.72, 0.79),
    entranceOpen: segment(p, 0.065, 0.135),
    phase,
  };
}
