import type { Request, Scenario } from './types';
import type { MotionSegment } from './physics';
import { travelSeconds } from './physics';
export type Policy = 'reactive' | 'bands' | 'adaptive';
export interface LiveRequest extends Request {
  state: 'waiting' | 'onboard' | 'done' | 'excluded';
  pickup: number | null;
  finish: number | null;
  assigned: number | null;
  retry: number;
}
export interface RouteTask {
  kind: 'pickup' | 'dropoff' | 'park';
  floor: number;
  requestId?: number;
}
export interface RoutingCar {
  id: number;
  floor: number;
  mode: 'idle' | 'moving' | 'dwelling';
  loadKg: number;
  onboard: Set<number>;
  segment: MotionSegment | null;
  dwellUntil: number;
  plan: RouteTask[];
}
export interface RouteEvaluation {
  feasible: boolean;
  pickups: Map<number, number>;
  drops: Map<number, number>;
  cost: number;
  endAt: number;
}
export interface RouteStop {
  floor: number;
  dropoffs: number[];
  pickups: number[];
}
/** Contiguous tasks share one physical stop. Unloading always precedes boarding. */
export function routeStops(plan: RouteTask[]): RouteStop[] {
  const stops: RouteStop[] = [];
  for (const task of plan) {
    let stop = stops[stops.length - 1];
    if (!stop || stop.floor !== task.floor) {
      stop = { floor: task.floor, dropoffs: [], pickups: [] };
      stops.push(stop);
    }
    if (task.kind === 'dropoff') stop.dropoffs.push(task.requestId!);
    else if (task.kind === 'pickup') stop.pickups.push(task.requestId!);
  }
  return stops;
}
/** PDF (5)–(10). Future users reserve mass; measured onboard mass may unload above rhoQ. */
export function evaluateRoute(
  car: RoutingCar,
  plan: RouteTask[],
  requests: Map<number, LiveRequest>,
  scenario: Scenario,
  now: number,
): RouteEvaluation {
  const p = scenario.physics,
    pickups = new Map<number, number>(),
    drops = new Map<number, number>();
  let time =
    car.mode === 'moving'
      ? Math.max(now, car.segment!.endsAt)
      : car.mode === 'dwelling'
        ? Math.max(now, car.dwellUntil)
        : now;
  let floor = car.mode === 'moving' ? car.segment!.to : car.floor,
    load = car.loadKg,
    feasible = true;
  const aboard = new Set(car.onboard),
    stops = routeStops(plan);
  if (car.mode === 'moving' && (!stops.length || stops[0].floor !== car.segment!.to))
    feasible = false;
  for (const stop of stops) {
    time += travelSeconds(floor, stop.floor, p);
    floor = stop.floor;
    let transfers = 0;
    for (const id of stop.dropoffs) {
      const r = requests.get(id);
      if (!r || r.dest !== stop.floor || !aboard.has(id) || drops.has(id)) {
        feasible = false;
        continue;
      }
      aboard.delete(id);
      load -= car.onboard.has(id) ? r.weight : p.reserveKg;
      drops.set(id, time);
      transfers++;
    }
    for (const id of stop.pickups) {
      const r = requests.get(id);
      if (
        !r ||
        r.source !== stop.floor ||
        r.state !== 'waiting' ||
        aboard.has(id) ||
        pickups.has(id)
      ) {
        feasible = false;
        continue;
      }
      aboard.add(id);
      load += p.reserveKg;
      pickups.set(id, time);
      transfers++;
      if (load > p.capacityKg * p.loadFraction + 1e-8 || aboard.size > p.capacityPeople)
        feasible = false;
    }
    if (transfers) time += p.doorTime + p.transferTime * transfers;
  }
  if (aboard.size) feasible = false;
  let cost = 0;
  for (const [id, pickup] of pickups) {
    const r = requests.get(id)!;
    cost +=
      Math.max(0, pickup - now) +
      (scenario.objective.lateFactor / 100) *
        Math.max(0, pickup - r.born - scenario.objective.lateThreshold) ** 2;
  }
  for (const [id, drop] of drops) {
    const r = requests.get(id)!;
    const pickup = pickups.get(id);
    if (r.state === 'onboard') cost += scenario.objective.rideFactor * Math.max(0, drop - now);
    else if (pickup !== undefined)
      cost += scenario.objective.rideFactor * Math.max(0, drop - pickup);
  }
  return { feasible, pickups, drops, cost, endAt: time };
}

export interface Insertion {
  plan: RouteTask[];
  evaluation: RouteEvaluation;
  score: number;
}
/** Exhaustive insertion pairs, with an irrevocable first target while moving. */
export function findInsertion(
  request: LiveRequest,
  car: RoutingCar,
  requests: Map<number, LiveRequest>,
  scenario: Scenario,
  now: number,
  policy: Policy,
  checkBudget?: () => void,
): Insertion | null {
  const before = evaluateRoute(car, car.plan, requests, scenario, now);
  const pickup: RouteTask = { kind: 'pickup', floor: request.source, requestId: request.id },
    drop: RouteTask = { kind: 'dropoff', floor: request.dest, requestId: request.id };
  // All insertion pairs are still evaluated. Virtual task access avoids allocating
  // plans, grouped-stop objects, Maps and Sets for every rejected candidate.
  const indexed = new Map<number, number>();
  for (const task of [...car.plan, pickup])
    if (task.requestId !== undefined && !indexed.has(task.requestId))
      indexed.set(task.requestId, indexed.size);
  interface Prepared {
    task: RouteTask;
    r: LiveRequest | undefined;
    index: number;
    oldPickup: number | undefined;
  }
  const prepare = (task: RouteTask): Prepared => ({
    task,
    r: task.requestId === undefined ? undefined : requests.get(task.requestId),
    index: task.requestId === undefined ? -1 : indexed.get(task.requestId)!,
    oldPickup: task.requestId === undefined ? undefined : before.pickups.get(task.requestId),
  });
  const original = car.plan.map(prepare),
    addedPickup = prepare(pickup),
    addedDrop = prepare(drop);
  const pickupTimes = new Float64Array(indexed.size);
  const distances = Array.from({ length: scenario.totalFloors }, (_, distance) =>
    travelSeconds(0, distance, scenario.physics),
  );
  const p = scenario.physics,
    n = original.length;
  const objective = policy !== 'reactive' && request.retry === 0;
  const candidateScore = (i: number, j: number): number | null => {
    const at = (index: number): Prepared =>
      index < i
        ? original[index]
        : index === i
          ? addedPickup
          : index < j
            ? original[index - 1]
            : index === j
              ? addedDrop
              : original[index - 2];
    let time =
      car.mode === 'moving'
        ? Math.max(now, car.segment!.endsAt)
        : car.mode === 'dwelling'
          ? Math.max(now, car.dwellUntil)
          : now;
    let floor = car.mode === 'moving' ? car.segment!.to : car.floor,
      load = car.loadKg,
      count = car.onboard.size;
    let eta = 0,
      ride = 0,
      disruption = 0,
      waitCost = 0,
      rideCost = 0;
    if (car.mode === 'moving' && at(0).task.floor !== car.segment!.to) return null;
    for (let a = 0; a < n + 2; ) {
      const target = at(a).task.floor;
      let b = a + 1;
      while (b < n + 2 && at(b).task.floor === target) b++;
      time += distances[Math.abs(floor - target)];
      floor = target;
      let transfers = 0;
      for (let index = a; index < b; index++) {
        const task = at(index);
        if (task.task.kind !== 'dropoff') continue;
        load -= task.r!.state === 'onboard' ? task.r!.weight : p.reserveKg;
        count--;
        transfers++;
        if (task.task.requestId === request.id) ride = time - pickupTimes[task.index];
        if (objective)
          rideCost +=
            scenario.objective.rideFactor *
            Math.max(0, time - (task.r!.state === 'onboard' ? now : pickupTimes[task.index]));
      }
      for (let index = a; index < b; index++) {
        const task = at(index);
        if (task.task.kind !== 'pickup') continue;
        load += p.reserveKg;
        count++;
        transfers++;
        if (load > p.capacityKg * p.loadFraction + 1e-8 || count > p.capacityPeople) return null;
        pickupTimes[task.index] = time;
        if (task.task.requestId === request.id) eta = time - now;
        else if (task.oldPickup !== undefined) disruption += Math.max(0, time - task.oldPickup);
        if (objective) {
          const late = Math.max(0, time - task.r!.born - scenario.objective.lateThreshold);
          waitCost += Math.max(0, time - now) + (scenario.objective.lateFactor / 100) * late * late;
        }
      }
      if (transfers) time += p.doorTime + p.transferTime * transfers;
      a = b;
    }
    if (count !== 0) return null;
    return request.retry > 0
      ? eta
      : objective
        ? waitCost + rideCost - before.cost
        : eta + 0.28 * ride + 0.32 * disruption;
  };
  let bestScore = Infinity,
    bestI = -1,
    bestJ = -1,
    iterations = 0;
  const start = car.mode === 'moving' && car.plan.length ? 1 : 0;
  for (let i = start; i <= car.plan.length; i++)
    for (let j = i + 1; j <= car.plan.length + 1; j++) {
      if ((++iterations & 127) === 0) checkBudget?.();
      const score = candidateScore(i, j);
      if (score !== null && score < bestScore - 1e-9) {
        bestScore = score;
        bestI = i;
        bestJ = j;
      }
    }
  if (bestI < 0) return null;
  const plan = [
    ...car.plan.slice(0, bestI),
    pickup,
    ...car.plan.slice(bestI, bestJ - 1),
    drop,
    ...car.plan.slice(bestJ - 1),
  ];
  return { plan, evaluation: evaluateRoute(car, plan, requests, scenario, now), score: bestScore };
}
export const predictRoute = evaluateRoute;
