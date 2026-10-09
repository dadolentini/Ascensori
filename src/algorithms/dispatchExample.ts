import { travelSeconds } from '../simulation/physics';
import {
  evaluateRoute,
  findInsertion,
  routeStops,
  type LiveRequest,
  type RoutingCar,
} from '../simulation/routing';
import { DEFAULT_SCENARIO } from '../simulation/scenario';

export type DispatchExampleVariant = 'committed' | 'available';
export interface DispatchCandidate {
  id: number;
  label: string;
  floor: number;
  mode: RoutingCar['mode'];
  passengers: number;
  loadKg: number;
  scheduledFloors: number[];
  plannedFloors: number[];
  etaSeconds: number;
  rideSeconds: number;
  marginalCost: number;
  addedWaitSeconds: number;
  addedRideSeconds: number;
  costBreakdown: {
    callerWait: number;
    callerRideCost: number;
    othersWaitCost: number;
    othersRideCost: number;
    latePenalty: number;
  };
  reason: string;
  selected: boolean;
  nearest: boolean;
}

/**
 * An explicitly configured snapshot, not a generated simulation or field result.
 * The two variants change only A's illustrative state. Both use the unmodified
 * simulator's physical parameters and adaptive marginal routing objective.
 */
export function evaluateDispatchExample(variant: DispatchExampleVariant = 'committed') {
  const scenario = DEFAULT_SCENARIO;
  const p = scenario.physics;
  const now = 0;
  const origin = 10;
  const destination = 0;
  const requests = new Map<number, LiveRequest>();
  const live = (id: number, source: number, dest: number, onboard = false): LiveRequest => {
    const request: LiveRequest = {
      id, source, dest,
      born: now,
      weight: p.weightMean,
      groupId: 'illustrative-snapshot',
      tripType: 'internal',
      state: onboard ? 'onboard' : 'waiting',
      pickup: onboard ? now : null,
      finish: null,
      assigned: null,
      retry: 0,
    };
    requests.set(id, request);
    return request;
  };
  const caller = live(1000, origin, destination);
  const car = (id: number, floor: number): RoutingCar => ({
    id, floor, mode: 'idle', loadKg: 0, onboard: new Set(),
    segment: null, dwellUntil: now, plan: [],
  });
  const cars = [car(0, 9), car(1, 7), car(2, 12), car(3, 0)];
  const board = (cabin: RoutingCar, count: number, source: number, dest: number, firstId: number) => {
    for (let index = 0; index < count; index++) {
      const passenger = live(firstId + index, source, dest, true);
      passenger.assigned = cabin.id;
      cabin.onboard.add(passenger.id);
      cabin.loadKg += passenger.weight;
      cabin.plan.push({ kind: 'dropoff', floor: dest, requestId: passenger.id });
    }
  };
  if (variant === 'committed') {
    board(cars[0], 2, 0, 15, 0);
    cars[0].mode = 'moving';
    cars[0].segment = {
      from: 9, to: 15, startedAt: now,
      endsAt: now + travelSeconds(9, 15, p),
    };
  }
  board(cars[2], 8, 12, 0, 10);
  cars[2].mode = 'dwelling';
  cars[2].dwellUntil = now + p.doorTime + p.transferTime * cars[2].onboard.size;

  const nearestId = cars.reduce((nearest, cabin) =>
    Math.abs(cabin.floor - origin) < Math.abs(nearest.floor - origin) ? cabin : nearest,
  ).id;
  const reasons = [
    variant === 'committed'
      ? 'È la più vicina, ma la tratta verso il piano 15 è già iniziata: deve completarla prima del nuovo prelievo.'
      : 'È vuota e disponibile al piano 9: ora può servire direttamente il nuovo prelievo.',
    'È vuota e disponibile al piano 7: il prelievo non ritarda altri passeggeri.',
    'Sta completando la sosta al piano 12. Una fermata al decimo prolunga il viaggio degli otto passeggeri diretti a terra.',
    'È vuota al piano terra, ma deve percorrere dieci piani prima del prelievo.',
  ];
  const candidates: DispatchCandidate[] = cars.map((cabin) => {
    const before = evaluateRoute(cabin, cabin.plan, requests, scenario, now);
    const insertion = findInsertion(caller, cabin, requests, scenario, now, 'adaptive');
    if (!before.feasible || !insertion?.evaluation.feasible)
      throw new Error('Lo stato illustrativo deve avere un itinerario fattibile per ogni cabina.');
    const after = insertion.evaluation;
    const pickup = after.pickups.get(caller.id)!;
    const drop = after.drops.get(caller.id)!;
    let addedWaitSeconds = 0;
    let addedRideSeconds = 0;
    let latePenalty = 0;
    const penalty = (id: number, at: number) =>
      (scenario.objective.lateFactor / 100) *
      Math.max(0, at - requests.get(id)!.born - scenario.objective.lateThreshold) ** 2;
    for (const [id, at] of after.pickups) latePenalty += penalty(id, at);
    for (const [id, at] of before.pickups) {
      addedWaitSeconds += Math.max(0, after.pickups.get(id)! - now) - Math.max(0, at - now);
      latePenalty -= penalty(id, at);
    }
    for (const [id, at] of before.drops) {
      const beforeStart = before.pickups.get(id) ?? now;
      const afterStart = after.pickups.get(id) ?? now;
      addedRideSeconds +=
        Math.max(0, after.drops.get(id)! - afterStart) - Math.max(0, at - beforeStart);
    }
    return {
      id: cabin.id,
      label: String.fromCharCode(65 + cabin.id),
      floor: cabin.floor,
      mode: cabin.mode,
      passengers: cabin.onboard.size,
      loadKg: cabin.loadKg,
      scheduledFloors: routeStops(cabin.plan).map((stop) => stop.floor),
      plannedFloors: routeStops(insertion.plan).map((stop) => stop.floor),
      etaSeconds: pickup - now,
      rideSeconds: drop - pickup,
      marginalCost: insertion.score,
      addedWaitSeconds,
      addedRideSeconds,
      costBreakdown: {
        callerWait: Math.max(0, pickup - now),
        callerRideCost: scenario.objective.rideFactor * Math.max(0, drop - pickup),
        othersWaitCost: addedWaitSeconds,
        othersRideCost: scenario.objective.rideFactor * addedRideSeconds,
        latePenalty,
      },
      reason: reasons[cabin.id],
      selected: false,
      nearest: cabin.id === nearestId,
    };
  });
  // Same strict comparison and stable car order as engine.ts assign().
  const winnerId = candidates.reduce((best, candidate) =>
    candidate.marginalCost < best.marginalCost - 1e-9 ? candidate : best,
  ).id;
  for (const candidate of candidates) candidate.selected = candidate.id === winnerId;
  return {
    variant, origin, destination, nearestId, winnerId, candidates,
    physics: { ...p },
    objective: { ...scenario.objective },
    note: 'Stato configurato a scopo illustrativo. Tempi e costi calcolati dal motore; non misure dell’edificio.',
  };
}
