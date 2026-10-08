import { describe, expect, it } from 'vitest';
import { createSimpleScenario } from '../src/configurator/helpers';
import { DEFAULT_SCENARIO, validateScenario } from '../src/simulation/scenario';
import { generateDemand } from '../src/simulation/demand';
import type { Scenario } from '../src/simulation/types';

const input = { elevators: 4, floors: 15, employees: 525, capacity: 13 };
function create(values = input): Scenario {
  return createSimpleScenario(values);
}
function floorCounts(scenario: Scenario) {
  return Array.from({ length: scenario.totalFloors - 1 }, (_, i) =>
    scenario.groups
      .filter((group) => group.floor === i + 1)
      .reduce((sum, group) => sum + group.employees, 0),
  );
}

describe('simple configuration mapped to the original model', () => {
  it('counts only upper floors in the UI and keeps ground at zero', () => {
    const scenario = create({ ...input, floors: 3 });
    expect(scenario.totalFloors).toBe(4);
    expect(scenario.groups.every((group) => group.floor >= 1 && group.floor <= 3)).toBe(true);
    expect(validateScenario(scenario)).toEqual([]);
  });
  it.each([
    [526, 15],
    [16, 15],
    [2, 5],
    [0, 15],
    [2000, 39],
    [8, 1],
  ])(
    'conserves all %i employees across %i upper floors, including small populations',
    (employees, floors) => {
      const scenario = create({ ...input, employees, floors });
      const counts = floorCounts(scenario);
      expect(counts.reduce((sum, count) => sum + count, 0)).toBe(employees);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      const quotient = Math.floor(employees / floors),
        remainder = employees % floors;
      expect(counts).toEqual(
        Array.from({ length: floors }, (_, i) => quotient + (i < remainder ? 1 : 0)),
      );
      expect(validateScenario(scenario)).toEqual([]);
    },
  );
  it('keeps the standard lunch shares globally, without giving anyone multiple lunch breaks', () => {
    const scenario = create();
    expect(
      [12, 13, 14].map((hour) =>
        scenario.groups
          .filter((group) => group.breaks[0].start === hour * 3600)
          .reduce((sum, group) => sum + group.employees, 0),
      ),
    ).toEqual([184, 226, 115]);
    expect(
      scenario.groups.every(
        (group) =>
          group.breaks.length === 1 &&
          group.breaks[0].duration === 3600 &&
          group.breaks[0].participation === 0.72 &&
          group.breaks[0].sigma === 540,
      ),
    ).toBe(true);
    const small = create({ ...input, employees: 16 });
    expect(
      [12, 13, 14].map((hour) =>
        small.groups
          .filter((group) => group.breaks[0].start === hour * 3600)
          .reduce((sum, group) => sum + group.employees, 0),
      ),
    ).toEqual([6, 7, 3]);
  });
  it('changes only exposed inputs and the requested 80 kg mean; hidden physics and criteria stay standard', () => {
    const scenario = create({ ...input, elevators: 2, capacity: 8 });
    expect(scenario.elevatorCount).toBe(2);
    expect(scenario.physics).toEqual({
      ...DEFAULT_SCENARIO.physics,
      capacityPeople: 8,
      weightMean: 80,
    });
    expect(scenario.objective).toEqual(DEFAULT_SCENARIO.objective);
    expect(scenario.forecast).toEqual(DEFAULT_SCENARIO.forecast);
    for (const key of [
      'officeStart',
      'officeEnd',
      'horizonStart',
      'horizonEnd',
      'arrivalOffset',
      'departureOffset',
      'arrivalSigma',
      'departureSigma',
      'internalProbability',
      'seed',
      'replicas',
    ] as const)
      expect(scenario[key]).toBe(DEFAULT_SCENARIO[key]);
    expect(DEFAULT_SCENARIO.physics.weightMean).toBe(76);
    expect(DEFAULT_SCENARIO.groups.find((group) => group.id === 'U12-FOCUS')!.employees).toBe(65);
  });
  it('is deterministic and feeds the existing demand generator without losing arrivals', () => {
    const values = { ...input, employees: 31, floors: 4 };
    const a = create(values),
      b = create(values);
    expect(a).toEqual(b);
    const trace = generateDemand(a, a.seed);
    expect(trace.filter((request) => request.tripType === 'arrival')).toHaveLength(31);
    expect(trace.filter((request) => request.tripType === 'departure')).toHaveLength(31);
    expect(trace).toEqual(generateDemand(b, b.seed));
    expect(
      trace.every(
        (request) =>
          request.weight >= 48 && request.weight <= 115 && request.source !== request.dest,
      ),
    ).toBe(true);
  });
  it.each([
    { ...input, floors: 0 },
    { ...input, floors: 40 },
    { ...input, floors: 2.5 },
    { ...input, employees: -1 },
    { ...input, employees: 2001 },
    { ...input, elevators: 0 },
    { ...input, capacity: 0 },
    { ...input, capacity: NaN },
  ])('rejects invalid visible values before creating a scenario', (values) => {
    expect(() => create(values)).toThrow(RangeError);
  });
});
