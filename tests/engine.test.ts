import { describe, expect, it } from 'vitest';
import { MinHeap } from '../src/simulation/heap';
import { travelSeconds, motionPosition } from '../src/simulation/physics';
import { DEFAULT_SCENARIO } from '../src/simulation/scenario';
import type { Request, Scenario } from '../src/simulation/types';
import {
  evaluateRoute,
  findInsertion,
  type RoutingCar,
  type RouteTask,
  type LiveRequest,
} from '../src/simulation/routing';
import { runSimulation, chooseAdaptiveParking } from '../src/simulation/engine';
import { generateDemand } from '../src/simulation/demand';

const scenario = (): Scenario => ({
  ...structuredClone(DEFAULT_SCENARIO),
  elevatorCount: 1,
  horizonStart: 0,
  horizonEnd: 100,
});
const request = (id: number, source = 0, dest = 1, born = 0, weight = 76): Request => ({
  id,
  born,
  source,
  dest,
  weight,
  groupId: 'fixture',
  tripType: 'arrival',
});
const live = (r: Request): LiveRequest => ({
  ...r,
  state: 'waiting',
  pickup: null,
  finish: null,
  assigned: null,
  retry: 0,
});
const car = (overrides: Partial<RoutingCar> = {}): RoutingCar => ({
  id: 0,
  floor: 0,
  mode: 'idle',
  loadKg: 0,
  onboard: new Set(),
  segment: null,
  dwellUntil: 0,
  plan: [],
  ...overrides,
});
const tasks = (r: Request): RouteTask[] => [
  { kind: 'pickup', floor: r.source, requestId: r.id },
  { kind: 'dropoff', floor: r.dest, requestId: r.id },
];

describe('shared route prediction', () => {
  it('uses actual remaining travel and remaining dwell, independently of call arrival time', () => {
    const s = scenario(),
      r = live(request(0, 15, 0)),
      map = new Map([[r.id, r]]);
    const c = car({
      mode: 'moving',
      segment: { from: 0, to: 15, startedAt: 0, endsAt: 22.3 },
      plan: tasks(r),
    });
    expect(evaluateRoute(c, c.plan, map, s, 1).pickups.get(0)).toBeCloseTo(22.3, 10);
    expect(evaluateRoute(c, c.plan, map, s, 21.3).pickups.get(0)).toBeCloseTo(22.3, 10);
    const waiting = live(request(1));
    expect(
      evaluateRoute(
        car({ mode: 'dwelling', dwellUntil: 50 }),
        tasks(waiting),
        new Map([[1, waiting]]),
        s,
        49,
      ).pickups.get(1),
    ).toBe(50);
  });
  it('charges exactly one dwell for multiple transfers at the same floor', () => {
    const s = scenario(),
      a = live(request(0)),
      b = live(request(1));
    const plan = [tasks(a)[0], tasks(b)[0], tasks(a)[1], tasks(b)[1]];
    const evaluated = evaluateRoute(
      car(),
      plan,
      new Map([
        [0, a],
        [1, b],
      ]),
      s,
      0,
    );
    expect(evaluated.feasible).toBe(true);
    expect(evaluated.pickups.get(0)).toBe(0);
    expect(evaluated.pickups.get(1)).toBe(0);
    const arrival = 5.5 + 0.8 * 2 + travelSeconds(0, 1, s.physics);
    expect(evaluated.drops.get(0)).toBeCloseTo(arrival, 10);
    expect(evaluated.drops.get(1)).toBeCloseTo(arrival, 10);
    expect(evaluated.endAt).toBeCloseTo(arrival + 5.5 + 0.8 * 2, 10);
  });
  it('unloads before pickup even when task order lists pickup first, including over planned fraction', () => {
    const s = scenario(),
      a = { ...live(request(0, 0, 2, 0, 990)), state: 'onboard' as const, pickup: 0 },
      b = live(request(1, 2, 3));
    const c = car({ floor: 2, loadKg: 990, onboard: new Set([0]) });
    const plan = [tasks(b)[0], tasks(a)[1], tasks(b)[1]];
    const evaluated = evaluateRoute(
      c,
      plan,
      new Map([
        [0, a],
        [1, b],
      ]),
      s,
      10,
    );
    expect(evaluated.feasible).toBe(true);
    expect(evaluated.drops.get(0)).toBe(10);
    expect(evaluated.pickups.get(1)).toBe(10);
  });
  it('uses reserved future mass instead of leaking passenger mass before boarding', () => {
    const s = scenario(),
      a = live(request(0, 0, 1, 0, 999));
    expect(evaluateRoute(car(), tasks(a), new Map([[0, a]]), s, 0).feasible).toBe(true);
    const requests = Array.from({ length: 12 }, (_, i) => live(request(i)));
    const plan = [...requests.map((r) => tasks(r)[0]), ...requests.map((r) => tasks(r)[1])];
    expect(evaluateRoute(car(), plan, new Map(requests.map((r) => [r.id, r])), s, 0).feasible).toBe(
      false,
    );
  });
});

describe('discrete-event execution', () => {
  it('serves a known trip with the same shared chronology used by routing', () => {
    const s = scenario(),
      r = request(0);
    const result = runSimulation(s, 'reactive', [r], undefined, { captureEvents: true });
    expect(result.requests[0]?.pickup).toBe(0);
    expect(result.requests[0].finish).toBeCloseTo(5.5 + 0.8 + travelSeconds(0, 1, s.physics), 10);
    expect(result.counts).toEqual({
      generated: 1,
      excluded: 0,
      waiting: 0,
      onboard: 0,
      completed: 1,
    });
    expect(result.doorStops).toBe(2);
    expect(result.distanceFloors).toBe(1);
    expect(r).not.toHaveProperty('state');
  });
  it('shares doors on simultaneous calls and preserves passengers under a one-person capacity', () => {
    const s = scenario(),
      input = [request(0), request(1)];
    const shared = runSimulation(s, 'bands', input, undefined, { captureEvents: true });
    expect(shared.requests.map((r) => r.pickup)).toEqual([0, 0]);
    expect(shared.requests.map((r) => r.finish)).toEqual([
      shared.requests[0].finish,
      shared.requests[0].finish,
    ]);
    expect(shared.doorStops).toBe(2);
    s.physics.capacityPeople = 1;
    const limited = runSimulation(s, 'reactive', input, undefined, { captureEvents: true });
    expect(limited.counts.completed).toBe(2);
    expect(limited.events.every((e) => e.occupancy <= 1 && e.loadKg <= s.physics.capacityKg)).toBe(
      true,
    );
    expect(limited.requests[1].pickup!).toBeGreaterThanOrEqual(limited.requests[0].finish!);
  });
  it('keeps a rejected boarding pending, unloads and then serves it without a zero-time retry loop', () => {
    const s = scenario();
    const result = runSimulation(
      s,
      'reactive',
      [request(0, 0, 1, 0, 700), request(1, 0, 1, 0, 700)],
      undefined,
      { captureEvents: true },
    );
    expect(result.counts.completed).toBe(2);
    expect(result.rejectedBoardings).toBeGreaterThan(0);
    expect(result.requests[1].retry).toBeGreaterThan(0);
    expect(result.events.every((e) => e.loadKg <= 1000 && e.occupancy <= 13)).toBe(true);
    expect(result.eventCount).toBeLessThan(100);
  });
  it('retains waiting and onboard statuses at the deadline and excludes outside arrivals without clamping', () => {
    const s = scenario();
    s.horizonEnd = 5;
    const result = runSimulation(s, 'reactive', [request(0, 0, 15), request(1, 0, 1, 101)]);
    expect(result.counts).toEqual({
      generated: 1,
      excluded: 1,
      waiting: 0,
      onboard: 1,
      completed: 0,
    });
    expect(result.requests[0].finish).toBeNull();
    expect(result.requests[1].state).toBe('excluded');
    expect(runSimulation(s, 'reactive', []).counts.generated).toBe(0);
  });
  it('fails explicitly at a resource guardrail instead of returning partial results', () => {
    expect(() =>
      runSimulation(scenario(), 'reactive', [request(0)], undefined, { maxEvents: 1 }),
    ).toThrow(/limite.*eventi/i);
  });
  it('keeps one of the actually idle cars out of predictive concentration', () => {
    const s = scenario();
    s.elevatorCount = 4;
    const learning = {
      components: [
        {
          groupId: 'fixture',
          breakId: 'pause',
          floor: 12,
          employees: 200,
          scheduled: 50,
          duration: 3600,
          mean: 50,
          sigma: 10,
          participation: 1,
          observations: 100,
        },
      ],
      trainDays: 12,
      holdoutDays: 4,
      scheduledMAE: 0,
      learnedMAE: 0,
    };
    s.forecast.lead = 0;
    s.forecast.horizon = 30;
    expect(chooseAdaptiveParking(s, learning, [{ id: 0, floor: 0 }], 40)).toEqual({});
    const targets = chooseAdaptiveParking(
      s,
      learning,
      [
        { id: 0, floor: 0 },
        { id: 1, floor: 5 },
      ],
      40,
    );
    expect(Object.keys(targets)).toHaveLength(1);
    expect(Object.values(targets)).toEqual([12]);
  });
  it('does not divert an already scheduled segment when a closer call arrives', () => {
    const s = scenario();
    const result = runSimulation(
      s,
      'reactive',
      [request(0, 15, 0), request(1, 1, 2, 1)],
      undefined,
      { captureEvents: true },
    );
    const first = result.events.find((e) => e.kind === 'move')!;
    expect(first.segment).toEqual({ from: 0, to: 15, startedAt: 0, endsAt: 22.3 });
    expect(result.requests[0].pickup).toBeCloseTo(22.3, 10);
    expect(result.requests[1].pickup!).toBeGreaterThanOrEqual(22.3);
  });
  it('boards after a same-floor drop without an extra door or capacity rejection', () => {
    const s = scenario();
    s.physics.capacityPeople = 1;
    const arrival = 5.5 + 0.8 + travelSeconds(0, 2, s.physics);
    const result = runSimulation(
      s,
      'reactive',
      [request(0, 0, 2, 0, 990), request(1, 2, 3, arrival)],
      undefined,
      { captureEvents: true },
    );
    expect(result.requests[1].pickup).toBeCloseTo(arrival, 10);
    expect(result.requests[0].finish).toBeCloseTo(arrival, 10);
    expect(result.rejectedBoardings).toBe(0);
    expect(result.doorStops).toBe(3);
    expect(result.events.every((e) => e.occupancy <= 1 && e.loadKg <= 1000)).toBe(true);
  });
  it('measures parking delay from that car idle start despite unrelated new calls', () => {
    const s = scenario();
    s.elevatorCount = 2;
    const result = runSimulation(s, 'bands', [request(0, 0, 15), request(1, 0, 1, 60)], undefined, {
      captureEvents: true,
    });
    const park = result.events.find((e) => e.kind === 'park' && e.carId === 0);
    const idleStart = 5.5 + 0.8 + travelSeconds(0, 15, s.physics) + 5.5 + 0.8;
    expect(park?.time).toBeCloseTo(idleStart + 35, 10);
  });
  it('is deterministic across repeated runs and preserves statuses at the same deadline', () => {
    const s = scenario(),
      input = [request(8, 0, 3), request(3, 2, 1, 5), request(20, 0, 1, 50)];
    const a = runSimulation(s, 'reactive', input, undefined, { captureEvents: true }),
      b = runSimulation(s, 'reactive', input, undefined, { captureEvents: true });
    expect(a.requests).toEqual(b.requests);
    expect(a.events).toEqual(b.events);
    expect(a.counts).toEqual(b.counts);
    expect(a.counts.generated).toBe(a.counts.waiting + a.counts.onboard + a.counts.completed);
  });
  it('completes the actual preset baseline within its declared resource budget', () => {
    const s = structuredClone(DEFAULT_SCENARIO),
      input = generateDemand(s, 101);
    const result = runSimulation(s, 'reactive', input, undefined, { maxDurationMs: 15000 });
    expect(result.counts.generated).toBe(result.counts.completed);
  }, 20000);
  it('matches an independent exhaustive score calculation for both dispatch objectives', () => {
    const s = scenario();
    const pending = [live(request(0, 0, 3)), live(request(1, 2, 1)), live(request(2, 0, 2))],
      fresh = live(request(3, 1, 3));
    const map = new Map([...pending, fresh].map((r) => [r.id, r]));
    const c = car({ plan: pending.flatMap(tasks) });
    for (const policy of ['reactive', 'bands'] as const) {
      const before = evaluateRoute(c, c.plan, map, s, 0);
      let expected = Infinity;
      for (let i = 0; i <= c.plan.length; i++)
        for (let j = i + 1; j <= c.plan.length + 1; j++) {
          const route = [
            ...c.plan.slice(0, i),
            tasks(fresh)[0],
            ...c.plan.slice(i, j - 1),
            tasks(fresh)[1],
            ...c.plan.slice(j - 1),
          ];
          const after = evaluateRoute(c, route, map, s, 0);
          if (!after.feasible) continue;
          let disruption = 0;
          for (const [id, time] of before.pickups)
            disruption += Math.max(0, after.pickups.get(id)! - time);
          const score =
            policy === 'bands'
              ? after.cost - before.cost
              : after.pickups.get(3)! +
                0.28 * (after.drops.get(3)! - after.pickups.get(3)!) +
                0.32 * disruption;
          expected = Math.min(expected, score);
        }
      expect(findInsertion(fresh, c, map, s, 0, policy)?.score).toBeCloseTo(expected, 8);
    }
  });
});

describe('event chronology and lift physics', () => {
  it('orders events by time and stable sequence, including simultaneous events', () => {
    const heap = new MinHeap<{ time: number; sequence: number }>(
      (a, b) => a.time - b.time || a.sequence - b.sequence,
    );
    heap.push({ time: 10, sequence: 3 });
    heap.push({ time: 2, sequence: 2 });
    heap.push({ time: 2, sequence: 1 });
    expect([heap.pop(), heap.pop(), heap.pop()]).toEqual([
      { time: 2, sequence: 1 },
      { time: 2, sequence: 2 },
      { time: 10, sequence: 3 },
    ]);
    expect(heap.size).toBe(0);
    expect(heap.pop()).toBeUndefined();
  });
  it('uses the PDF triangular and trapezoidal motion, including zero distance', () => {
    const p = { floorHeight: 3.3, speed: 2.5, acceleration: 1 };
    expect(travelSeconds(0, 0, p)).toBe(0);
    expect(travelSeconds(0, 1, p)).toBeCloseTo(2 * Math.sqrt(3.3), 10);
    expect(travelSeconds(0, 15, p)).toBeCloseTo(22.3, 10);
    expect(travelSeconds(15, 0, p)).toBeCloseTo(22.3, 10);
  });
  it('reconstructs position using actual segment time and acceleration, reversibly', () => {
    const p = { floorHeight: 3.3, speed: 2.5, acceleration: 1 };
    const segment = { from: 0, to: 15, startedAt: 10, endsAt: 32.3 };
    expect(motionPosition(segment, 9, p)).toBe(0);
    expect(motionPosition(segment, 11, p)).toBeCloseTo(0.5 / 3.3, 10);
    expect(motionPosition(segment, 31.3, p)).toBeCloseTo(15 - 0.5 / 3.3, 10);
    expect(motionPosition(segment, 32.3, p)).toBe(15);
    expect(motionPosition({ ...segment, from: 15, to: 0 }, 11, p)).toBeCloseTo(15 - 0.5 / 3.3, 10);
  });
});
