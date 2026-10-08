import { generateDemand } from './demand';
import { learnHabits } from './learning';
import { diagnosticsNNLS } from './diagnostics';
import { TRAINING_SEEDS, VALIDATION_SEEDS, validateScenario } from './scenario';
import { runSimulation } from './engine';
import {
  aggregateDays,
  experimentCI,
  requestMetrics,
  type DayRun,
  type ExperimentResult,
} from './results';
import type { Scenario } from './types';
import type { Policy } from './routing';
const VERSION = '1.0.0-pdf-corrected';
const scope = self as unknown as {
  postMessage: (data: unknown) => void;
  onmessage: ((e: MessageEvent) => void) | null;
};
scope.onmessage = (e: MessageEvent<{ runId: number; scenario: Scenario }>) => {
  const { runId, scenario } = e.data,
    start = performance.now();
  const progress = (fraction: number, label: string) =>
    scope.postMessage({ type: 'progress', runId, fraction, label });
  try {
    const errors = validateScenario(scenario);
    if (errors.length) throw new Error(errors.join('\n'));
    const population = scenario.groups.reduce((n, g) => n + g.employees, 0);
    if (population > 2000 || scenario.elevatorCount > 8 || scenario.totalFloors > 40)
      throw new Error(
        'Limite dell’esperimento browser: 2.000 addetti, 8 cabine, 40 piani. Riduci lo scenario; nessuna domanda è stata ridotta automaticamente.',
      );
    const seeds = Array.from({ length: scenario.replicas }, (_, i) => scenario.seed + i * 101);
    if (seeds.some((s) => [...TRAINING_SEEDS, ...VALIDATION_SEEDS].includes(s)))
      throw new Error(
        'Il seed scelto si sovrappone ai giorni di apprendimento. Usa un seed diverso per mantenere training e test indipendenti.',
      );
    progress(0.02, 'Generazione dello storico · 12 giornate');
    const train = TRAINING_SEEDS.map((s) => generateDemand(scenario, s));
    const validation = VALIDATION_SEEDS.map((s) => generateDemand(scenario, s));
    const learning = learnHabits(scenario, train, validation);
    progress(0.1, 'Apprendimento e validation completati');
    const traces = seeds.map((s) => generateDemand(scenario, s));
    if (traces.some((t) => t.length > 14000))
      throw new Error(
        'Lo scenario genera più di 14.000 richieste per replica. Riduci addetti o pause. Il calcolo non è stato semplificato.',
      );
    const policies: Policy[] = ['reactive', 'bands', 'adaptive'];
    let completed = 0;
    const summary = policies.map((policy) => {
      const days: DayRun[] = traces.map((trace, i) => {
        progress(
          0.12 + (0.82 * completed) / (seeds.length * 3),
          `${policy === 'reactive' ? 'Reattiva' : policy === 'bands' ? 'Per fasce' : 'Adattiva'} · replica ${i + 1}/${seeds.length}`,
        );
        const run = runSimulation(scenario, policy, trace, learning, {
          captureEvents: i === 0,
          maxEvents: 500000,
          maxDurationMs: 30000,
        });
        completed++;
        return { ...run, seed: seeds[i], metrics: requestMetrics(run.requests) };
      });
      return aggregateDays(policy, days);
    });
    progress(0.96, 'Calcolo degli indicatori e controllo dei campioni');
    const diagnostics = diagnosticsNNLS(
      scenario,
      Array.from({ length: 8 }, (_, i) => generateDemand(scenario, scenario.seed + i * 101)),
    );
    const result: ExperimentResult = {
      version: VERSION,
      scenario,
      seeds,
      learning,
      diagnostics,
      policies: summary,
      durationMs: performance.now() - start,
      completedAt: new Date().toISOString(),
      ci: experimentCI(summary),
    };
    scope.postMessage({ type: 'result', runId, result });
  } catch (error) {
    scope.postMessage({
      type: 'error',
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
