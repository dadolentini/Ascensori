import type { LearningResult, Request, Scenario } from './types';
import {
  findInsertion,
  routeStops,
  type LiveRequest,
  type Policy,
  type RoutingCar,
  type RouteTask,
} from './routing';
import { motionPosition, travelSeconds, type MotionSegment } from './physics';
import { MinHeap } from './heap';
import { forecastFloors } from './learning';
export type { Policy, LiveRequest } from './routing';

export interface ReplayEvent {
  time: number;
  kind: 'move' | 'stop' | 'idle' | 'reject' | 'park';
  carId: number;
  floor: number;
  occupancy: number;
  loadKg: number;
  waiting: number;
  onboard: number;
  completed: number;
  segment?: MotionSegment;
}
export interface CarState {
  id: number;
  floor: number;
  mode: 'idle' | 'moving' | 'dwelling';
  onboard: number[];
  loadKg: number;
  segment: MotionSegment | null;
  dwellUntil: number;
  distanceFloors: number;
  parkingFloors: number;
  doorStops: number;
  rejectedBoardings: number;
}
export interface SimulationResult {
  policy: Policy;
  requests: LiveRequest[];
  events: ReplayEvent[];
  cars: CarState[];
  durationMs: number;
  eventCount: number;
  counts: {
    generated: number;
    excluded: number;
    waiting: number;
    onboard: number;
    completed: number;
  };
  distanceFloors: number;
  parkingFloors: number;
  partialDistanceFloors: number;
  doorStops: number;
  rejectedBoardings: number;
}
export interface SimulationOptions {
  captureEvents?: boolean;
  maxEvents?: number;
  maxDurationMs?: number;
}
export class SimulationResourceError extends Error {
  constructor(
    public readonly code: 'event_limit' | 'time_limit',
    message: string,
  ) {
    super(message);
    this.name = 'SimulationResourceError';
  }
}
interface EngineCar extends RoutingCar {
  idleSince: number;
  parkVersion: number;
  parkPending: boolean;
  segmentParking: boolean;
  distanceFloors: number;
  parkingFloors: number;
  doorStops: number;
  rejectedBoardings: number;
}
interface Event {
  time: number;
  sequence: number;
  kind: 'new' | 'arrive' | 'door' | 'park';
  id: number;
  version?: number;
}
const priority = { new: 0, arrive: 1, door: 2, park: 3 };

/** PDF (17)–(19), greedy marginal coverage, using only actually idle vehicles. */
export function chooseAdaptiveParking(
  s: Scenario,
  learning: LearningResult,
  idle: { id: number; floor: number }[],
  now: number,
): Record<number, number> {
  const demand = forecastFloors(s, learning, now);
  const cap = Math.min(
    s.physics.capacityPeople,
    Math.floor((s.physics.capacityKg * s.physics.loadFraction) / s.physics.reserveKg),
  );
  const q = s.forecast.capacityFraction * cap;
  if (q <= 0) return {};
  const slots = Math.max(0, idle.length - s.forecast.reserveCars),
    targets: Record<number, number> = {};
  const counts: Record<number, number> = {};
  let free = idle.slice();
  for (let slot = 0; slot < slots; slot++) {
    let best: { value: number; id: number; floor: number } | null = null;
    for (const car of free)
      for (const [key, predicted] of Object.entries(demand)) {
        const floor = Number(key),
          count = counts[floor] ?? 0;
        if (predicted < (floor === 0 ? 5 : 3) || count >= s.forecast.maxGrouped) continue;
        const old = Math.max(0, predicted - q * count),
          remaining = Math.max(0, predicted - q * (count + 1));
        const gain = (30 * (old ** 1.25 - remaining ** 1.25)) / Math.max(1, predicted ** 0.25);
        const value =
          gain -
          0.1 * travelSeconds(car.floor, floor, s.physics) -
          0.1 * Math.abs(car.floor - floor);
        if (!best || value > best.value + 1e-9) best = { value, id: car.id, floor };
      }
    if (!best || best.value <= 0) break;
    targets[best.id] = best.floor;
    counts[best.floor] = (counts[best.floor] ?? 0) + 1;
    free = free.filter((car) => car.id !== best!.id);
  }
  // Unallocated vehicles keep their present coverage; none is sent to a demand concentration.
  return targets;
}

/** Original time bands shifted to the configured activity/break calendar, not an NNLS controller. */
export function bandParkingFloor(s: Scenario, id: number, now: number): number {
  const zone = Math.round((id * (s.totalFloors - 1)) / Math.max(1, s.elevatorCount - 1));
  const starts = s.groups.flatMap((g) =>
    g.breaks.filter((b) => b.participation > 0).map((b) => b.start),
  );
  const returns = s.groups.flatMap((g) =>
    g.breaks.filter((b) => b.participation > 0).map((b) => b.start + b.duration),
  );
  const ends = s.groups.map((g) => g.officeEnd ?? s.officeEnd);
  const end = ends.length ? Math.max(...ends) : s.officeEnd;
  if (
    starts.some((start) => Math.abs(now - start) < 0.27 * 3600) ||
    (now > end - 0.45 * 3600 && now < end + 0.55 * 3600)
  )
    return zone;
  if (starts.length) {
    if (
      now < Math.min(...starts) - 0.3 * 3600 ||
      (now > Math.min(...returns) - 0.4 * 3600 && now < Math.max(...returns) + 0.35 * 3600) ||
      now > end + 0.5 * 3600
    )
      return 0;
  } else if (now < s.officeStart + s.arrivalSigma || now > end + s.departureSigma) return 0;
  return zone;
}

/** Timestamp transfers at ARRIVE; one aggregate dwell precedes the following segment (PDF 5). */
export function runSimulation(
  s: Scenario,
  policy: Policy,
  input: Request[],
  learning?: LearningResult,
  options: SimulationOptions = {},
): SimulationResult {
  if (policy === 'adaptive' && !learning)
    throw new Error('La politica adattiva richiede un modello appreso sui giorni training.');
  const started = performance.now(),
    maxEvents = options.maxEvents ?? 200_000,
    maxDuration = options.maxDurationMs ?? 30_000;
  let eventCount = 0,
    sequence = 0,
    now = s.horizonStart,
    waiting = 0,
    onboard = 0,
    completed = 0;
  const checkBudget = () => {
    if (performance.now() - started > maxDuration)
      throw new SimulationResourceError(
        'time_limit',
        'Superato il limite di tempo della simulazione; nessun risultato parziale è valido.',
      );
  };
  const requests: LiveRequest[] = input.map((r) => ({
    ...r,
    state: r.born < s.horizonStart || r.born > s.horizonEnd ? 'excluded' : 'waiting',
    pickup: null,
    finish: null,
    assigned: null,
    retry: 0,
  }));
  const byId = new Map(requests.map((r) => [r.id, r]));
  if (byId.size !== requests.length) throw new Error('Identificativi richiesta duplicati.');
  if (
    requests.some(
      (r) =>
        !Number.isFinite(r.born) ||
        !Number.isFinite(r.weight) ||
        r.weight <= 0 ||
        !Number.isInteger(r.source) ||
        !Number.isInteger(r.dest) ||
        r.source < 0 ||
        r.dest < 0 ||
        r.source >= s.totalFloors ||
        r.dest >= s.totalFloors ||
        r.source === r.dest,
    )
  )
    throw new Error('Traccia richieste non valida: tempi, masse o piani fuori intervallo.');
  const excluded = requests.filter((r) => r.state === 'excluded').length,
    generated = requests.length - excluded;
  const events: ReplayEvent[] = [],
    blocked = new Set<number>();
  // A failed vehicle is retried only after its occupants change; no hidden mass information enters planning.
  const rejectedLoads = new Map<number, Map<number, string>>();
  const signature = (car: EngineCar) => [...car.onboard].sort((a, b) => a - b).join(',');
  const cars: EngineCar[] = Array.from({ length: s.elevatorCount }, (_, id) => ({
    id,
    floor: 0,
    mode: 'idle',
    loadKg: 0,
    onboard: new Set<number>(),
    segment: null,
    dwellUntil: s.horizonStart,
    plan: [],
    idleSince: s.horizonStart,
    parkVersion: 0,
    parkPending: false,
    segmentParking: false,
    distanceFloors: 0,
    parkingFloors: 0,
    doorStops: 0,
    rejectedBoardings: 0,
  }));
  const queue = new MinHeap<Event>(
    (a, b) => a.time - b.time || priority[a.kind] - priority[b.kind] || a.sequence - b.sequence,
  );
  const push = (time: number, kind: Event['kind'], id: number, version?: number) =>
    queue.push({ time, kind, id, version, sequence: sequence++ });
  for (const r of requests) if (r.state !== 'excluded') push(r.born, 'new', r.id);
  const emit = (kind: ReplayEvent['kind'], car: EngineCar) => {
    if (options.captureEvents)
      events.push({
        time: now,
        kind,
        carId: car.id,
        floor: car.floor,
        occupancy: car.onboard.size,
        loadKg: car.loadKg,
        waiting,
        onboard,
        completed,
        ...(car.segment ? { segment: { ...car.segment } } : {}),
      });
  };
  const invalidateParking = (car: EngineCar) => {
    car.parkVersion++;
    car.parkPending = false;
  };
  const schedule = (car: EngineCar) => {
    if (car.mode !== 'idle' || !car.plan.length) return;
    invalidateParking(car);
    const target = car.plan[0].floor;
    car.segment = {
      from: car.floor,
      to: target,
      startedAt: now,
      endsAt: now + travelSeconds(car.floor, target, s.physics),
    };
    car.segmentParking = car.plan[0].kind === 'park';
    car.mode = 'moving';
    push(car.segment.endsAt, 'arrive', car.id);
    emit('move', car);
  };
  const parkLater = (car: EngineCar, repeat = false) => {
    if (
      policy === 'reactive' ||
      !generated ||
      car.mode !== 'idle' ||
      car.plan.length ||
      blocked.size ||
      car.parkPending
    )
      return;
    const time = repeat
      ? now + Math.max(1, s.forecast.idleDelay)
      : Math.max(now, car.idleSince + s.forecast.idleDelay);
    if (time > s.horizonEnd) return;
    car.parkPending = true;
    push(time, 'park', car.id, car.parkVersion);
  };
  const assign = (r: LiveRequest) => {
    // After an actual weighing failure, an individual above fleet portage remains visibly unserved.
    if (r.retry && r.weight > s.physics.capacityKg) return false;
    let best: { car: EngineCar; plan: RouteTask[]; score: number } | null = null;
    for (const car of cars) {
      if (rejectedLoads.get(r.id)?.get(car.id) === signature(car)) continue;
      const candidate = findInsertion(r, car, byId, s, now, policy, checkBudget);
      if (candidate && (!best || candidate.score < best.score - 1e-9))
        best = { car, plan: candidate.plan, score: candidate.score };
    }
    if (!best) return false;
    best.car.plan = best.plan;
    r.assigned = best.car.id;
    invalidateParking(best.car);
    return true;
  };
  const retry = () => {
    for (const id of blocked) {
      const r = byId.get(id)!;
      if (r.state !== 'waiting' || assign(r)) blocked.delete(id);
    }
    for (const car of cars) {
      schedule(car);
      parkLater(car);
    }
  };
  for (const car of cars) parkLater(car);
  while (queue.size) {
    const event = queue.pop()!;
    if (event.time > s.horizonEnd) break;
    if (++eventCount > maxEvents)
      throw new SimulationResourceError(
        'event_limit',
        'Superato il limite di eventi della simulazione; nessun risultato parziale è valido.',
      );
    checkBudget();
    now = event.time;
    if (event.kind === 'new') {
      const r = byId.get(event.id)!;
      waiting++;
      if (!assign(r)) blocked.add(r.id);
      for (const car of cars) schedule(car);
    } else if (event.kind === 'arrive') {
      const car = cars[event.id],
        segment = car.segment!;
      const distance = Math.abs(segment.to - segment.from);
      car.distanceFloors += distance;
      if (car.segmentParking) car.parkingFloors += distance;
      car.floor = segment.to;
      car.segment = null;
      const stop = routeStops(car.plan)[0];
      let length = 0;
      while (length < car.plan.length && car.plan[length].floor === car.floor) length++;
      car.plan.splice(0, length);
      let transfers = 0;
      for (const id of stop.dropoffs) {
        const r = byId.get(id)!;
        if (r.state !== 'onboard') continue;
        r.state = 'done';
        r.finish = now;
        car.onboard.delete(id);
        car.loadKg -= r.weight;
        onboard--;
        completed++;
        transfers++;
      }
      for (const id of stop.pickups) {
        const r = byId.get(id)!;
        if (r.state !== 'waiting') continue;
        if (
          car.loadKg + r.weight <= s.physics.capacityKg + 1e-8 &&
          car.onboard.size < s.physics.capacityPeople
        ) {
          r.state = 'onboard';
          r.pickup = now;
          car.onboard.add(id);
          car.loadKg += r.weight;
          waiting--;
          onboard++;
          transfers++;
        } else {
          r.retry++;
          r.assigned = null;
          car.rejectedBoardings++;
          car.plan = car.plan.filter((task) => task.requestId !== id);
          blocked.add(id);
          let failures = rejectedLoads.get(id);
          if (!failures) {
            failures = new Map();
            rejectedLoads.set(id, failures);
          }
          failures.set(car.id, signature(car));
          emit('reject', car);
        }
      }
      if (Math.abs(car.loadKg) < 1e-8) car.loadKg = 0;
      if (transfers) {
        car.doorStops++;
        car.mode = 'dwelling';
        car.dwellUntil = now + s.physics.doorTime + s.physics.transferTime * transfers;
        push(car.dwellUntil, 'door', car.id);
        emit('stop', car);
      } else {
        car.mode = 'idle';
        car.idleSince = now;
        emit('idle', car);
      }
      retry();
    } else if (event.kind === 'door') {
      const car = cars[event.id];
      car.mode = 'idle';
      car.idleSince = now;
      emit('idle', car);
      retry();
    } else {
      const car = cars[event.id];
      if (event.version !== car.parkVersion || car.mode !== 'idle' || car.plan.length) continue;
      car.parkPending = false;
      if (!blocked.size) {
        const targets =
          policy === 'adaptive'
            ? chooseAdaptiveParking(
                s,
                learning!,
                cars
                  .filter((c) => c.mode === 'idle' && !c.plan.length)
                  .map((c) => ({ id: c.id, floor: c.floor })),
                now,
              )
            : { [car.id]: bandParkingFloor(s, car.id, now) };
        for (const [key, floor] of Object.entries(targets)) {
          const target = cars[Number(key)];
          if (target.mode === 'idle' && !target.plan.length && target.floor !== floor) {
            target.plan = [{ kind: 'park', floor }];
            emit('park', target);
            schedule(target);
          }
        }
      }
      parkLater(car, true);
    }
  }
  const finalCars: CarState[] = cars.map((car) => ({
    id: car.id,
    floor: car.floor,
    mode: car.mode,
    onboard: [...car.onboard],
    loadKg: car.loadKg,
    segment: car.segment ? { ...car.segment } : null,
    dwellUntil: car.dwellUntil,
    distanceFloors: car.distanceFloors,
    parkingFloors: car.parkingFloors,
    doorStops: car.doorStops,
    rejectedBoardings: car.rejectedBoardings,
  }));
  return {
    policy,
    requests,
    events,
    cars: finalCars,
    durationMs: performance.now() - started,
    eventCount,
    counts: { generated, excluded, waiting, onboard, completed },
    distanceFloors: cars.reduce((sum, c) => sum + c.distanceFloors, 0),
    parkingFloors: cars.reduce((sum, c) => sum + c.parkingFloors, 0),
    partialDistanceFloors: cars.reduce(
      (sum, c) =>
        sum +
        (c.segment
          ? Math.abs(motionPosition(c.segment, s.horizonEnd, s.physics) - c.segment.from)
          : 0),
      0,
    ),
    doorStops: cars.reduce((sum, c) => sum + c.doorStops, 0),
    rejectedBoardings: cars.reduce((sum, c) => sum + c.rejectedBoardings, 0),
  };
}
