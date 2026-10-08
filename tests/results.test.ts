import { describe, it, expect } from 'vitest';
import { requestMetrics } from '../src/simulation/results';
import type { LiveRequest } from '../src/simulation/routing';
const r = (
  id: number,
  state: LiveRequest['state'],
  pickup: number | null,
  finish: number | null,
): LiveRequest => ({
  id,
  born: 100,
  source: 0,
  dest: 1,
  weight: 70,
  groupId: 'A',
  tripType: 'arrival',
  state,
  pickup,
  finish,
  assigned: null,
  retry: 0,
});
describe('honest metric denominators', () => {
  it('includes boarded users in waiting but only completed users in travel', () => {
    const m = requestMetrics([
      r(0, 'done', 110, 140),
      r(1, 'onboard', 130, null),
      r(2, 'waiting', null, null),
    ]);
    expect(m.wait.count).toBe(2);
    expect(m.wait.mean).toBe(20);
    expect(m.ride.count).toBe(1);
    expect(m.ride.mean).toBe(30);
    expect(m.journey.mean).toBe(40);
  });
  it('does not manufacture durations for zero service', () => {
    const m = requestMetrics([r(0, 'waiting', null, null)]);
    expect(m.wait.mean).toBeNull();
    expect(m.wait.p95).toBeNull();
    expect(m.over120Pct).toBeNull();
  });
});
