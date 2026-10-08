/** Canonical units: seconds since midnight, kilograms, metres. Floor zero is ground. */
export interface Break {
  id: string;
  start: number;
  duration: number;
  participation: number;
  sigma: number;
}
export interface Group {
  id: string;
  name: string;
  floor: number;
  employees: number;
  breaks: Break[];
  /** Optional activity-window overrides; otherwise scenario officeStart/officeEnd. */
  officeStart?: number;
  officeEnd?: number;
}
export interface Scenario {
  elevatorCount: number;
  totalFloors: number;
  groups: Group[];
  officeStart: number;
  officeEnd: number;
  horizonStart: number;
  horizonEnd: number;
  arrivalOffset: number;
  departureOffset: number;
  arrivalSigma: number;
  departureSigma: number;
  internalProbability: number;
  physics: {
    capacityKg: number;
    capacityPeople: number;
    speed: number;
    acceleration: number;
    floorHeight: number;
    doorTime: number;
    transferTime: number;
    weightMean: number;
    weightSigma: number;
    weightMin: number;
    weightMax: number;
    reserveKg: number;
    loadFraction: number;
  };
  objective: { rideFactor: number; lateFactor: number; lateThreshold: number };
  forecast: {
    horizon: number;
    lead: number;
    idleDelay: number;
    reserveCars: number;
    maxGrouped: number;
    capacityFraction: number;
    priorEvents: number;
    priorExposure: number;
    habitSigma: number;
    dailyJitter: number;
  };
  seed: number;
  replicas: number;
}
export type TripType = 'arrival' | 'departure' | 'break_exit' | 'break_return' | 'internal';
/** Immutable demand input. Engine attaches its own mutable state. Includes outside-horizon requests. */
export interface Request {
  id: number;
  born: number;
  source: number;
  dest: number;
  weight: number;
  groupId: string;
  breakId?: string;
  tripType: TripType;
}
export interface LearnedBreak {
  groupId: string;
  breakId: string;
  floor: number;
  employees: number;
  scheduled: number;
  duration: number;
  mean: number;
  sigma: number;
  participation: number;
  observations: number;
}
export interface LearningResult {
  components: LearnedBreak[];
  trainDays: number;
  holdoutDays: number;
  scheduledMAE: number | null;
  learnedMAE: number | null;
}
export interface SummaryStatistics {
  count: number;
  mean: number | null;
  median: number | null;
  p90: number | null;
  p95: number | null;
}
export interface ConfidenceInterval {
  count: number;
  mean: number;
  lower: number;
  upper: number;
  confidence: 0.95;
}
export interface NNLSDiagnostics {
  /** Filter by direction to align with coefficients; beta0/intercept is always first. */
  components: (
    | { direction: 'up' | 'down'; kind: 'intercept' }
    | { direction: 'up' | 'down'; kind: 'gaussian'; mean: number; sigma: number }
  )[];
  /** Nonnegative beta0 then Gaussian peak rates, all in passengers/minute. */
  coefficients: { up: number[]; down: number[] };
  trainingDays: number;
  holdoutDays: number;
  /** RMSE against mean directional bin rates, in passengers/minute. */
  trainingRMSE: number | null;
  holdoutRMSE: number | null;
  rateUnit: 'passengers/minute';
  /** Seconds since midnight; bin midpoint is the evaluation time of X. */
  binEdges: number[];
}
