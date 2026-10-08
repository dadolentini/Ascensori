import type { Break, Group, Scenario } from '../simulation/types';
import { DEFAULT_SCENARIO } from '../simulation/scenario';

export interface SimpleConfiguration {
  elevators: number;
  /** Served upper floors; the mathematical model also includes ground. */
  floors: number;
  employees: number;
  capacity: number;
}
export const DEFAULT_SIMPLE_CONFIGURATION: SimpleConfiguration = {
  elevators: DEFAULT_SCENARIO.elevatorCount,
  floors: DEFAULT_SCENARIO.totalFloors - 1,
  employees: DEFAULT_SCENARIO.groups.reduce((total, group) => total + group.employees, 0),
  capacity: DEFAULT_SCENARIO.physics.capacityPeople,
};

export function validateSimpleConfiguration(input: SimpleConfiguration) {
  const errors: Partial<Record<keyof SimpleConfiguration, string>> = {};
  if (!Number.isSafeInteger(input.elevators) || input.elevators < 1 || input.elevators > 8)
    errors.elevators = 'Scegli da 1 a 8 ascensori.';
  if (!Number.isSafeInteger(input.floors) || input.floors < 1 || input.floors > 39)
    errors.floors = 'Scegli da 1 a 39 piani, oltre al piano terra.';
  if (!Number.isSafeInteger(input.employees) || input.employees < 0 || input.employees > 2000)
    errors.employees = 'Inserisci un numero intero da 0 a 2.000 addetti.';
  if (!Number.isSafeInteger(input.capacity) || input.capacity < 1)
    errors.capacity = 'Inserisci un numero intero di almeno 1 persona per cabina.';
  return errors;
}

/** UI adapter only: equations, algorithms and the original preset stay untouched. */
export function createSimpleScenario(input: SimpleConfiguration): Scenario {
  const errors = Object.values(validateSimpleConfiguration(input));
  if (errors.length) throw new RangeError(errors.join(' '));
  const scenario = structuredClone(DEFAULT_SCENARIO);
  scenario.elevatorCount = input.elevators;
  scenario.totalFloors = input.floors + 1;
  scenario.physics.capacityPeople = input.capacity;
  scenario.physics.weightMean = 80;

  const floorPopulation = Array.from(
    { length: input.floors },
    (_, i) =>
      Math.floor(input.employees / input.floors) + (i < input.employees % input.floors ? 1 : 0),
  );
  // parametri_ascensori.json traffic.lunch_start_probabilities: Hamilton on TOTAL
  // population preserves the global profile even when there is <1 person/floor.
  const shares = [0.35, 0.43, 0.22];
  const exact = shares.map((share) => share * input.employees);
  const cohorts = exact.map(Math.floor);
  const priority = [0, 1, 2].sort(
    (a, b) => exact[b] - cohorts[b] - (exact[a] - cohorts[a]) || a - b,
  );
  const remainder = input.employees - cohorts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remainder; i++) cohorts[priority[i]]++;

  const perFloor = floorPopulation.map(() => [0, 0, 0]);
  const remaining = [...floorPopulation];
  let cursor = 0;
  cohorts.forEach((total, cohort) => {
    for (let allocated = 0; allocated < total; ) {
      if (remaining[cursor] > 0) {
        perFloor[cursor][cohort]++;
        remaining[cursor]--;
        allocated++;
      }
      cursor = (cursor + 1) % input.floors;
    }
  });
  const lunchHours = [12, 13, 14];
  scenario.groups = perFloor.flatMap((populations, floor) =>
    populations.map((employees, cohort) => ({
      id: `floor-${floor + 1}-lunch-${lunchHours[cohort]}`,
      name: `Piano ${floor + 1}`,
      floor: floor + 1,
      employees,
      breaks: [{ ...DEFAULT_SCENARIO.groups[0].breaks[0], start: lunchHours[cohort] * 3600 }],
    })),
  );
  return scenario;
}

export function parseClock(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]),
    min = Number(m[2]);
  return h < 24 && min < 60 ? h * 3600 + min * 60 : null;
}
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')}`;
}
export function applyBreakToFloors(
  groups: Group[],
  from: number,
  to: number,
  pause: Break,
  append: boolean,
): Group[] {
  return groups.map((g) =>
    g.floor < from || g.floor > to
      ? g
      : { ...g, breaks: append ? [...g.breaks, { ...pause }] : [{ ...pause }] },
  );
}
export function redistributeEmployees(groups: Group[], total: number): Group[] {
  return groups.map((g, i) => ({
    ...g,
    employees: Math.floor(total / groups.length) + (i < total % groups.length ? 1 : 0),
  }));
}
export const numberFormat = (v: number | null, decimals = 1) =>
  v === null || !Number.isFinite(v)
    ? '—'
    : new Intl.NumberFormat('it-IT', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(v);
