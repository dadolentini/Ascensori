import type { Scenario } from './types';
export const TRAINING_SEEDS = Array.from({ length: 12 }, (_, i) => 1101 + i);
export const VALIDATION_SEEDS = [2201, 2202, 2203, 2204];
export const EXPERIMENT_SEEDS = [101, 202, 303, 404, 505, 606, 707, 808];
const h = (hours: number) => hours * 3600;
const groups: Scenario['groups'] = [
  {
    id: 'U12-FOCUS',
    name: 'Ufficio focus',
    floor: 12,
    employees: 65,
    breaks: [{ id: 'pranzo', start: h(13), duration: 3600, participation: 0.72, sigma: 540 }],
  },
];
// Source resolve_offices: 460 remaining people across 29 groups (25 × 16, 4 × 15).
for (let i = 0; i < 29; i++) {
  const floor = (i % 15) + 1;
  groups.push({
    id: `U${String(i + 1).padStart(2, '0')}`,
    name: `Ufficio ${i + 1}`,
    floor,
    employees: 15 + (i < 25 ? 1 : 0),
    breaks: [
      {
        id: 'pranzo',
        start: h([12, 13, 14][(i * 7 + floor) % 3]),
        duration: 3600,
        participation: 0.72,
        sigma: 540,
      },
    ],
  });
}
export const DEFAULT_SCENARIO: Scenario = {
  elevatorCount: 4,
  totalFloors: 16,
  groups,
  officeStart: h(8),
  officeEnd: h(19),
  horizonStart: h(7),
  horizonEnd: h(21),
  arrivalOffset: -0.12 * 3600,
  departureOffset: 0.06 * 3600,
  arrivalSigma: 960,
  departureSigma: 1020,
  internalProbability: 0.09,
  physics: {
    capacityKg: 1000,
    capacityPeople: 13,
    speed: 2.5,
    acceleration: 1,
    floorHeight: 3.3,
    doorTime: 5.5,
    transferTime: 0.8,
    weightMean: 76,
    weightSigma: 14,
    weightMin: 48,
    weightMax: 115,
    reserveKg: 87,
    loadFraction: 0.96,
  },
  objective: { rideFactor: 0.33, lateFactor: 0.035, lateThreshold: 120 },
  forecast: {
    horizon: 720,
    lead: 180,
    idleDelay: 35,
    reserveCars: 1,
    maxGrouped: 3,
    capacityFraction: 0.82,
    priorEvents: 22,
    priorExposure: 12,
    habitSigma: 540,
    dailyJitter: 150,
  },
  seed: 101,
  replicas: 1,
};

export function validateScenario(s: Scenario): string[] {
  const errors: string[] = [];
  const finite = (name: string, value: number, min: number, max = Infinity, integer = false) => {
    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      errors.push(`${name}: valore non valido (${min}–${max === Infinity ? '∞' : max}).`);
  };
  const positive = (name: string, value: number) => {
    if (!Number.isFinite(value) || value <= 0) errors.push(`${name}: deve essere positivo.`);
  };
  finite('elevatorCount', s.elevatorCount, 1, Infinity, true);
  finite('totalFloors', s.totalFloors, 2, Infinity, true);
  finite('seed', s.seed, 0, 4294967295, true);
  finite('replicas', s.replicas, 1, 8, true);
  for (const key of ['officeStart', 'officeEnd', 'horizonStart', 'horizonEnd'] as const)
    finite(key, s[key], 0, 86400);
  if (s.officeEnd <= s.officeStart)
    errors.push('officeEnd: deve seguire officeStart; turni oltre mezzanotte non supportati.');
  if (s.horizonEnd <= s.horizonStart) errors.push('horizonEnd: deve seguire horizonStart.');
  for (const key of ['arrivalOffset', 'departureOffset'] as const)
    finite(key, s[key], -86400, 86400);
  for (const key of ['arrivalSigma', 'departureSigma'] as const) positive(key, s[key]);
  finite('internalProbability', s.internalProbability, 0, 1);
  const p = s.physics;
  for (const key of [
    'capacityKg',
    'speed',
    'acceleration',
    'floorHeight',
    'weightMean',
    'weightSigma',
    'weightMin',
    'weightMax',
    'reserveKg',
  ] as const)
    positive(`physics.${key}`, p[key]);
  finite('physics.capacityPeople', p.capacityPeople, 1, Infinity, true);
  for (const key of ['doorTime', 'transferTime'] as const) finite(`physics.${key}`, p[key], 0);
  if (p.weightMax <= p.weightMin) errors.push('physics.weightMax: deve superare weightMin.');
  positive('physics.loadFraction', p.loadFraction);
  finite('physics.loadFraction', p.loadFraction, 0, 1);
  for (const key of ['rideFactor', 'lateFactor', 'lateThreshold'] as const)
    finite(`objective.${key}`, s.objective[key], 0);
  const f = s.forecast;
  positive('forecast.horizon', f.horizon);
  for (const key of [
    'lead',
    'idleDelay',
    'priorEvents',
    'priorExposure',
    'habitSigma',
    'dailyJitter',
  ] as const)
    finite(`forecast.${key}`, f[key], 0);
  finite('forecast.reserveCars', f.reserveCars, 0, Infinity, true);
  finite('forecast.maxGrouped', f.maxGrouped, 1, Infinity, true);
  finite('forecast.capacityFraction', f.capacityFraction, 0, 1);
  if (!Array.isArray(s.groups)) {
    errors.push('groups: elenco richiesto.');
    return errors;
  }
  const ids = new Set<string>();
  for (const g of s.groups) {
    const path = `groups.${g.id}`;
    if (!g.id || ids.has(g.id)) errors.push(`${path}: ID richiesto e univoco.`);
    ids.add(g.id);
    finite(`${path}.floor`, g.floor, 1, s.totalFloors - 1, true);
    finite(`${path}.employees`, g.employees, 0, Infinity, true);
    const start = g.officeStart ?? s.officeStart,
      end = g.officeEnd ?? s.officeEnd;
    finite(`${path}.officeStart`, start, 0, 86400);
    finite(`${path}.officeEnd`, end, 0, 86400);
    if (end <= start) errors.push(`${path}.officeEnd: deve seguire officeStart.`);
    if (
      start + s.arrivalOffset < 0 ||
      start + s.arrivalOffset > 86400 ||
      end + s.departureOffset < 0 ||
      end + s.departureOffset > 86400
    )
      errors.push(`${path}: medie di ingresso/uscita fuori dalla giornata.`);
    const breakIds = new Set<string>();
    const sorted = [...g.breaks].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i],
        bp = `${path}.breaks.${b.id}`;
      if (!b.id || breakIds.has(b.id)) errors.push(`${bp}: ID richiesto e univoco.`);
      breakIds.add(b.id);
      finite(`${bp}.start`, b.start, start, end);
      positive(`${bp}.duration`, b.duration);
      positive(`${bp}.sigma`, b.sigma);
      finite(`${bp}.participation`, b.participation, 0, 1);
      if (b.start + b.duration > end) errors.push(`${bp}: pausa oltre officeEnd.`);
      if (i > 0 && sorted[i - 1].start + sorted[i - 1].duration > b.start)
        errors.push(`${path}: pause sovrapposte.`);
    }
  }
  return errors;
}
