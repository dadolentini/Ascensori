import type { Break, Group } from '../simulation/types';
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
