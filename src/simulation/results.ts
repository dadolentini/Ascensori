import type {
  Scenario,
  LearningResult,
  NNLSDiagnostics,
  SummaryStatistics,
  ConfidenceInterval,
} from './types';
import type { LiveRequest, Policy } from './routing';
import type { ReplayEvent } from './engine';
import { summarize, mean, pairedConfidenceInterval } from './statistics';
export const POLICY_NAMES: Record<Policy, string> = {
  reactive: 'Reattiva',
  bands: 'Per fasce',
  adaptive: 'Adattiva',
};
export interface RequestMetrics {
  wait: SummaryStatistics;
  ride: SummaryStatistics;
  journey: SummaryStatistics;
  over120Pct: number | null;
  maximumWait: number | null;
}
export function requestMetrics(requests: LiveRequest[]): RequestMetrics {
  const waits = requests.filter((r) => r.pickup !== null).map((r) => r.pickup! - r.born);
  const completed = requests.filter((r) => r.finish !== null && r.pickup !== null);
  return {
    wait: summarize(waits),
    ride: summarize(completed.map((r) => r.finish! - r.pickup!)),
    journey: summarize(completed.map((r) => r.finish! - r.born)),
    over120Pct: waits.length ? (100 * waits.filter((w) => w > 120).length) / waits.length : null,
    maximumWait: waits.length ? Math.max(...waits) : null,
  };
}
export interface DayRun {
  seed: number;
  policy: Policy;
  metrics: RequestMetrics;
  requests: LiveRequest[];
  events: ReplayEvent[];
  counts: {
    generated: number;
    excluded: number;
    waiting: number;
    onboard: number;
    completed: number;
  };
  distanceFloors: number;
  parkingFloors: number;
  doorStops: number;
  rejectedBoardings: number;
  partialDistanceFloors: number;
  durationMs: number;
  eventCount: number;
}
export interface PolicySummary {
  policy: Policy;
  meanWait: number | null;
  p95Wait: number | null;
  meanRide: number | null;
  meanJourney: number | null;
  over120Pct: number | null;
  completed: number;
  generated: number;
  waiting: number;
  onboard: number;
  excluded: number;
  distanceFloors: number;
  parkingFloors: number;
  doorStops: number;
  rejectedBoardings: number;
  waitSamples: number;
  rideSamples: number;
  days: DayRun[];
}
export interface ExperimentResult {
  version: string;
  scenario: Scenario;
  seeds: number[];
  learning: LearningResult;
  diagnostics: NNLSDiagnostics | null;
  policies: PolicySummary[];
  durationMs: number;
  completedAt: string;
  ci: ConfidenceInterval | null;
}
export function aggregateDays(policy: Policy, days: DayRun[]): PolicySummary {
  const average = (get: (d: DayRun) => number | null) =>
    mean(days.map(get).filter((v): v is number => v !== null));
  const sum = (get: (d: DayRun) => number) => days.reduce((n, d) => n + get(d), 0);
  return {
    policy,
    days,
    meanWait: average((d) => d.metrics.wait.mean),
    p95Wait: average((d) => d.metrics.wait.p95),
    meanRide: average((d) => d.metrics.ride.mean),
    meanJourney: average((d) => d.metrics.journey.mean),
    over120Pct: average((d) => d.metrics.over120Pct),
    completed: sum((d) => d.counts.completed),
    generated: sum((d) => d.counts.generated),
    waiting: sum((d) => d.counts.waiting),
    onboard: sum((d) => d.counts.onboard),
    excluded: sum((d) => d.counts.excluded),
    distanceFloors: average((d) => d.distanceFloors) ?? 0,
    parkingFloors: average((d) => d.parkingFloors) ?? 0,
    doorStops: average((d) => d.doorStops) ?? 0,
    rejectedBoardings: sum((d) => d.rejectedBoardings),
    waitSamples: sum((d) => d.metrics.wait.count),
    rideSamples: sum((d) => d.metrics.ride.count),
  };
}
export function experimentCI(policies: PolicySummary[]): ConfidenceInterval | null {
  const base = policies[0].days.map((d) => d.metrics.wait.mean),
    adaptive = policies[2].days.map((d) => d.metrics.wait.mean);
  if (base.some((v) => v === null) || adaptive.some((v) => v === null)) return null;
  return pairedConfidenceInterval(base as number[], adaptive as number[]);
}
