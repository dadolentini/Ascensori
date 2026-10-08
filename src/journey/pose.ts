export type Point3 = [number, number, number];
export const ELEVATOR_CENTERS = [-24.1, -21.7, -19.3, -16.9] as const;
export type JourneyPhase =
  | 'exterior'
  | 'entrance'
  | 'corridor'
  | 'turn'
  | 'elevators'
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

/** Portrait framing keeps the complete bank visible. No camera history is used. */
export function journeyFov(progress: number, aspect = 1.78): number {
  const portrait = Math.max(0, Math.min(1, (1.1 - Math.max(0.25, aspect)) / 0.6));
  return 52 + portrait * 18 + 4 * (1 - segment(clamp(progress), 0, 0.15));
}

export function journeyPose(progress: number, aspect = 1.78): JourneyPose {
  const p = clamp(progress);
  const revealX = 3 + 11 * clamp((aspect - 0.5) / 1.28);
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
    cameraPosition = mix([0, 1.65, -3], [0, 1.65, -17.5], segment(p, 0.23, 0.43));
    target = [0, 1.65, cameraPosition[2] - 12];
    phase = 'corridor';
  } else if (p <= 0.54) {
    const angle = (segment(p, 0.43, 0.54) * Math.PI) / 2;
    cameraPosition = [3 - 3 * Math.cos(angle), 1.65, -17.5 - 3 * Math.sin(angle)];
    const distance = 12 + segment(p, 0.43, 0.54) * 7;
    target = [
      cameraPosition[0] + Math.sin(angle) * distance,
      1.65,
      cameraPosition[2] - Math.cos(angle) * distance,
    ];
    // Exact endpoint is useful to callers seeking directly to the reveal.
    if (p === 0.54) {
      cameraPosition = [3, 1.65, -20.5];
      target = [22, 1.65, -20.5];
    }
    phase = 'turn';
  } else if (p <= 0.62) {
    cameraPosition = [3 + (revealX - 3) * segment(p, 0.54, 0.58), 1.65, -20.5];
    target = [22, 1.65, -20.5];
    phase = 'elevators';
  } else if (p <= 0.72) {
    const t = segment(p, 0.62, 0.72);
    cameraPosition = mix([revealX, 1.65, -20.5], [18.3, 1.65, -21.7], t);
    target = mix([22, 1.65, -20.5], [22, 1.65, -21.7], t);
    phase = 'approach';
  } else if (p <= 0.79) {
    cameraPosition = [18.3, 1.65, -21.7];
    target = [22, 1.65, -21.7];
    phase = 'doors';
  } else {
    cameraPosition = mix([18.3, 1.65, -21.7], [23.25, 1.65, -21.7], segment(p, 0.79, 0.83));
    target = [25, 1.65, -21.7];
    // Keep the same sightline length at the transition, eliminating a target jump.
    target[0] = 22 + segment(p, 0.79, 0.83) * 3;
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
