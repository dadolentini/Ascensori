import type { NNLSDiagnostics, Request, Scenario } from './types';

/** Convex NNLS by exact nonnegative coordinate minimization, with an explicit convergence guard. */
export function solveNNLS(matrix: number[][], target: number[]): number[] {
  if (matrix.length !== target.length) throw new RangeError('Matrix and target row counts differ');
  const columns = matrix[0]?.length ?? 0;
  if (
    matrix.some((row) => row.length !== columns || row.some((v) => !Number.isFinite(v))) ||
    target.some((v) => !Number.isFinite(v))
  )
    throw new RangeError('NNLS requires a rectangular finite matrix and finite target');
  const x = Array(columns).fill(0) as number[],
    residual = [...target];
  const norms = Array.from({ length: columns }, (_, j) =>
    matrix.reduce((sum, row) => sum + row[j] ** 2, 0),
  );
  const scale = Math.max(1, Math.hypot(...target));
  for (let iteration = 0; iteration < 20000; iteration++) {
    for (let j = 0; j < columns; j++) {
      if (norms[j] === 0) continue;
      let gradient = 0;
      for (let i = 0; i < matrix.length; i++) gradient += matrix[i][j] * residual[i];
      const next = Math.max(0, x[j] + gradient / norms[j]),
        delta = next - x[j];
      x[j] = next;
      for (let i = 0; i < matrix.length; i++) residual[i] -= matrix[i][j] * delta;
    }
    let converged = true;
    for (let j = 0; j < columns; j++) {
      let gradient = 0;
      for (let i = 0; i < matrix.length; i++) gradient += matrix[i][j] * residual[i];
      if (
        (x[j] > 0 ? Math.abs(gradient) : Math.max(0, gradient)) >
        1e-12 * scale * Math.max(1, Math.sqrt(norms[j]))
      )
        converged = false;
    }
    if (converged) return x;
  }
  throw new RangeError('NNLS diagnostic did not converge; no approximate result reported');
}

/** PDF (3)–(4): X=[1, exp(-.5*((t_mid-mu)/sigma)^2), ...], y in passengers/minute. */
export function diagnosticsNNLS(
  s: Scenario,
  traces: Request[][],
  trainingDays = 6,
): NNLSDiagnostics {
  if (!Number.isInteger(trainingDays) || trainingDays < 1)
    throw new RangeError('NNLS training days must be positive');
  const components: NNLSDiagnostics['components'] = [
    { direction: 'up', kind: 'intercept' },
    { direction: 'down', kind: 'intercept' },
  ];
  const add = (direction: 'up' | 'down', mean: number, sigma: number) => {
    if (
      !components.some(
        (c) =>
          c.direction === direction &&
          c.kind === 'gaussian' &&
          c.mean === mean &&
          c.sigma === sigma,
      )
    )
      components.push({ direction, kind: 'gaussian', mean, sigma });
  };
  for (const g of s.groups) {
    if (g.employees === 0) continue;
    add('up', (g.officeStart ?? s.officeStart) + s.arrivalOffset, s.arrivalSigma);
    add('down', (g.officeEnd ?? s.officeEnd) + s.departureOffset, s.departureSigma);
    for (const b of g.breaks)
      if (b.participation > 0) {
        add('down', b.start, b.sigma);
        add('up', b.start + b.duration, b.sigma);
      }
  }
  const edges = [s.horizonStart];
  while (edges[edges.length - 1] < s.horizonEnd)
    edges.push(Math.min(s.horizonEnd, edges[edges.length - 1] + 600));
  const bins = edges.length - 1,
    train = traces.slice(0, trainingDays),
    heldout = traces.slice(trainingDays);
  const coefficients: NNLSDiagnostics['coefficients'] = { up: [], down: [] };
  const trainErrors: number[] = [],
    holdErrors: number[] = [];
  for (const direction of ['up', 'down'] as const) {
    const basis = components.filter((c) => c.direction === direction);
    const matrix = Array.from({ length: bins }, (_, i) =>
      basis.map((c) =>
        c.kind === 'intercept'
          ? 1
          : Math.exp(-0.5 * (((edges[i] + edges[i + 1]) / 2 - c.mean) / c.sigma) ** 2),
      ),
    );
    const histogram = (days: Request[][]) => {
      const counts = Array(bins).fill(0) as number[];
      for (const trace of days)
        for (const r of trace) {
          const matches = direction === 'up' ? r.dest > r.source : r.dest < r.source;
          if (matches && r.born >= s.horizonStart && r.born < s.horizonEnd)
            counts[Math.floor((r.born - s.horizonStart) / 600)]++;
        }
      return counts.map((v, i) =>
        days.length ? v / ((days.length * (edges[i + 1] - edges[i])) / 60) : 0,
      );
    };
    const y = histogram(train),
      beta = train.length ? solveNNLS(matrix, y) : basis.map(() => 0);
    coefficients[direction] = beta;
    const prediction = matrix.map((row) => row.reduce((sum, v, i) => sum + v * beta[i], 0));
    if (train.length) trainErrors.push(...prediction.map((v, i) => (v - y[i]) ** 2));
    if (heldout.length) {
      const actual = histogram(heldout);
      holdErrors.push(...prediction.map((v, i) => (v - actual[i]) ** 2));
    }
  }
  const rmse = (xs: number[]) =>
    xs.length ? Math.sqrt(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  return {
    components,
    coefficients,
    trainingDays: train.length,
    holdoutDays: heldout.length,
    trainingRMSE: rmse(trainErrors),
    holdoutRMSE: rmse(holdErrors),
    rateUnit: 'passengers/minute',
    binEdges: edges,
  };
}
