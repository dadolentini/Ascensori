import { describe, expect, it } from 'vitest';
import { evaluateDispatchExample } from '../src/algorithms/dispatchExample';
import { travelSeconds } from '../src/simulation/physics';
import { DEFAULT_SCENARIO } from '../src/simulation/scenario';

describe('illustrative four-cabin dispatch', () => {
  it('selects the feasible lowest marginal cost rather than the closest committed cabin', () => {
    const example = evaluateDispatchExample();
    expect(example.candidates).toHaveLength(4);
    expect(example.origin).toBe(10);
    expect(example.destination).toBe(0);
    expect(example.nearestId).toBe(0);
    expect(example.winnerId).toBe(1);
    const nearest = example.candidates[0];
    expect(nearest.scheduledFloors[0]).toBe(15);
    expect(nearest.plannedFloors[0]).toBe(15);
    expect(nearest.etaSeconds).toBeGreaterThan(example.candidates[1].etaSeconds!);
    const costs = example.candidates.map((candidate) => candidate.marginalCost!);
    expect(example.candidates[1].marginalCost).toBe(Math.min(...costs));
  });

  it('matches the physical ETA and weighted cost for the empty selected cabin', () => {
    const { physics, objective } = DEFAULT_SCENARIO;
    const candidate = evaluateDispatchExample().candidates[1];
    const wait = travelSeconds(7, 10, physics);
    const ride = physics.doorTime + physics.transferTime + travelSeconds(10, 0, physics);
    expect(candidate.etaSeconds).toBeCloseTo(wait, 10);
    expect(candidate.rideSeconds).toBeCloseTo(ride, 10);
    expect(candidate.marginalCost).toBeCloseTo(wait + objective.rideFactor * ride, 10);
    expect(candidate.addedWaitSeconds).toBe(0);
    expect(candidate.addedRideSeconds).toBe(0);
  });

  it('accounts independently for every onboard passenger delayed by an added stop', () => {
    const { physics, objective } = DEFAULT_SCENARIO;
    const candidate = evaluateDispatchExample().candidates[2];
    const addedRidePerPassenger =
      travelSeconds(12, 10, physics) +
      physics.doorTime + physics.transferTime +
      travelSeconds(10, 0, physics) - travelSeconds(12, 0, physics);
    expect(candidate.passengers).toBe(8);
    expect(candidate.addedRideSeconds).toBeCloseTo(8 * addedRidePerPassenger, 10);
    expect(candidate.costBreakdown.othersRideCost).toBeCloseTo(
      objective.rideFactor * 8 * addedRidePerPassenger, 10,
    );
    for (const option of evaluateDispatchExample().candidates) {
      const components = Object.values(option.costBreakdown);
      expect(components.reduce((total, value) => total + value, 0)).toBeCloseTo(
        option.marginalCost!, 9,
      );
    }
  });

  it('selects A when its illustrative state is changed to empty and available', () => {
    const available = evaluateDispatchExample('available');
    expect(available.winnerId).toBe(0);
    expect(available.candidates[0].mode).toBe('idle');
    expect(available.candidates[0].passengers).toBe(0);
    expect(available.candidates[0].scheduledFloors).toEqual([]);
    expect(available.candidates[0].plannedFloors).toEqual([10, 0]);
    expect(evaluateDispatchExample().winnerId).toBe(1);
    expect(evaluateDispatchExample()).toEqual(evaluateDispatchExample());
  });
});
