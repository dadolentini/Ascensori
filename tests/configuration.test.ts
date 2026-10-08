import { describe, it, expect } from 'vitest';
import {
  parseClock,
  formatClock,
  applyBreakToFloors,
  redistributeEmployees,
} from '../src/configurator/helpers';
import type { Group } from '../src/simulation/types';
const groups: Group[] = [
  {
    id: 'a',
    name: 'A',
    floor: 1,
    employees: 10,
    breaks: [{ id: 'lunch', start: 43200, duration: 3600, participation: 0.7, sigma: 540 }],
  },
  {
    id: 'b',
    name: 'B',
    floor: 2,
    employees: 20,
    breaks: [{ id: 'lunch', start: 46800, duration: 3600, participation: 0.7, sigma: 540 }],
  },
];
describe('configuration user intent', () => {
  it('converts explicit clock times and rejects impossible clocks', () => {
    expect(parseClock('08:30')).toBe(30600);
    expect(formatClock(30600)).toBe('08:30');
    expect(parseClock('25:10')).toBeNull();
    expect(parseClock('wrong')).toBeNull();
  });
  it('applies a break only to selected floors without duplicating people', () => {
    const next = applyBreakToFloors(
      groups,
      1,
      1,
      { id: 'tea', start: 54000, duration: 900, participation: 0.4, sigma: 300 },
      true,
    );
    expect(next[0].breaks).toHaveLength(2);
    expect(next[1].breaks).toHaveLength(1);
    expect(next.reduce((n, g) => n + g.employees, 0)).toBe(30);
    expect(groups[0].breaks).toHaveLength(1);
  });
  it('distributes exactly the requested population even with remainders', () => {
    const next = redistributeEmployees(groups, 31);
    expect(next.map((g) => g.employees)).toEqual([16, 15]);
    expect(groups.map((g) => g.employees)).toEqual([10, 20]);
  });
});
