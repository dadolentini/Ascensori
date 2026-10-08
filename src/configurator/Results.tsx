import { useMemo, useState } from 'react';
import type { ExperimentResult, PolicySummary } from '../simulation/results';
import type { Policy } from '../simulation/routing';
import { motionPosition } from '../simulation/physics';
import { numberFormat, formatClock } from './helpers';
import Icon from '../components/Icon';
const COLORS = ['#9aa5a6', '#b59661', '#3c776e'];
const STRATEGY_NAMES: Record<Policy, string> = {
  reactive: 'Senza anticipo',
  bands: 'Orari standard',
  adaptive: 'Previsione intelligente',
};
function exportData(result: ExperimentResult, csv: boolean) {
  let content: string;
  if (csv) {
    const header =
      'policy,seed,generated,completed,waiting,onboard,wait_samples,mean_wait_s,p95_wait_s,ride_samples,mean_ride_s,mean_journey_s,excluded,distance_floors,parking_floors';
    content =
      header +
      '\n' +
      result.policies
        .flatMap((p) =>
          p.days.map((d) =>
            [
              p.policy,
              d.seed,
              d.counts.generated,
              d.counts.completed,
              d.counts.waiting,
              d.counts.onboard,
              d.metrics.wait.count,
              d.metrics.wait.mean,
              d.metrics.wait.p95,
              d.metrics.ride.count,
              d.metrics.ride.mean,
              d.metrics.journey.mean,
              d.counts.excluded,
              d.distanceFloors,
              d.parkingFloors,
            ].join(','),
          ),
        )
        .join('\n');
  } else content = JSON.stringify(result, (_, v) => (v instanceof Set ? [...v] : v), 2);
  const url = URL.createObjectURL(
      new Blob([content], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }),
    ),
    a = document.createElement('a');
  a.href = url;
  a.download = `verticale-seed-${result.scenario.seed}.${csv ? 'csv' : 'json'}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function WaitDistribution({ policies }: { policies: PolicySummary[] }) {
  const [seconds, setSeconds] = useState(30);
  const data = useMemo(
    () =>
      policies.map((policy) =>
        policy.days
          .flatMap((day) =>
            day.requests
              .filter((request) => request.pickup !== null)
              .map((request) => request.pickup! - request.born),
          )
          .sort((a, b) => a - b),
      ),
    [policies],
  );
  const maximum = Math.max(1, ...data.map((values) => Math.ceil(values.at(-1) ?? 0)));
  const time = Math.min(seconds, maximum);
  const boardedWithin = (values: number[], threshold: number) => {
    let lo = 0,
      hi = values.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[mid] <= threshold) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  if (data.every((values) => !values.length))
    return (
      <p className="empty-result">
        Non ci sono attese da confrontare. Il grafico sarà disponibile quando ci saranno viaggi
        effettuati.
      </p>
    );
  return (
    <div className="chart-container simple-wait-chart">
      <svg
        viewBox="0 0 650 260"
        role="img"
        aria-label="Percentuale di viaggi iniziati entro ogni tempo di attesa"
      >
        <text x="42" y="17" className="chart-label">
          PERSONE SALITE (%)
        </text>
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1="45"
              x2="625"
              y1={220 - value * 1.8}
              y2={220 - value * 1.8}
              className="chart-grid"
            />
            <text x="34" y={224 - value * 1.8} textAnchor="end" className="chart-label">
              {value}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <text
            key={value}
            x={45 + value * 580}
            y="240"
            textAnchor="middle"
            className="chart-label"
          >
            {numberFormat(value * maximum, 0)} s
          </text>
        ))}
        {data.map((values, i) => {
          if (!values.length) return null;
          const stride = Math.max(1, Math.floor(values.length / 300));
          const points = values
            .filter((_, j) => j % stride === 0 || j === values.length - 1)
            .map(
              (value) =>
                45 +
                (580 * value) / maximum +
                ',' +
                (220 - (180 * boardedWithin(values, value)) / values.length),
            );
          return (
            <polyline
              key={policies[i].policy}
              points={points.join(' ')}
              fill="none"
              stroke={COLORS[i]}
              strokeWidth="2.3"
            />
          );
        })}
        <line
          x1={45 + (580 * time) / maximum}
          x2={45 + (580 * time) / maximum}
          y1="32"
          y2="220"
          stroke="#53674c"
          strokeDasharray="4 5"
          opacity=".6"
        />
      </svg>
      <div className="chart-legend">
        {policies.map((policy, i) => (
          <span key={policy.policy}>
            <i style={{ background: COLORS[i] }} />
            {STRATEGY_NAMES[policy.policy]}
          </span>
        ))}
      </div>
      <div className="wait-explorer">
        <label htmlFor="wait-threshold">
          Chi sale entro <strong>{numberFormat(time, 0)} secondi</strong>?
        </label>
        <input
          id="wait-threshold"
          type="range"
          min="0"
          max={maximum}
          step="1"
          value={time}
          onChange={(event) => setSeconds(Number(event.target.value))}
        />
        <div className="wait-threshold-values" aria-live="polite">
          {data.map((values, i) => (
            <div key={policies[i].policy}>
              <span>{STRATEGY_NAMES[policies[i].policy]}</span>
              <strong>
                {values.length
                  ? numberFormat((100 * boardedWithin(values, time)) / values.length, 0) + '%'
                  : '—'}
              </strong>
              <small>
                {boardedWithin(values, time)} su {values.length} viaggi iniziati
              </small>
            </div>
          ))}
        </div>
      </div>
      <p className="small-note">
        Una curva più vicina all’angolo in alto a sinistra indica attese più brevi. Il grafico
        include chi è salito; gli eventuali viaggi non iniziati sono indicati qui sotto.
      </p>
    </div>
  );
}
function FleetReplay({ result }: { result: ExperimentResult }) {
  const [policy, setPolicy] = useState<Policy>('adaptive'),
    [time, setTime] = useState(result.scenario.officeStart);
  const day = result.policies.find((p) => p.policy === policy)!.days[0];
  const cars = Array.from({ length: result.scenario.elevatorCount }, (_, id) => {
    const event = day.events.filter((e) => e.carId === id && e.time <= time).at(-1);
    const floor =
      event?.segment && time < event.segment.endsAt
        ? motionPosition(event.segment, time, result.scenario.physics)
        : (event?.floor ?? 0);
    return { id, floor, occupancy: event?.occupancy ?? 0, load: event?.loadKg ?? 0 };
  });
  const latest = day.events.filter((e) => e.time <= time).at(-1);
  return (
    <div className="replay-panel">
      <div className="replay-header">
        <div>
          <p className="eyebrow">GLI ASCENSORI DURANTE LA GIORNATA</p>
          <h3>Un giorno, piano per piano.</h3>
        </div>
        <label className="sr-only" htmlFor="replay-policy">
          Strategia visualizzata
        </label>
        <select
          id="replay-policy"
          value={policy}
          onChange={(e) => setPolicy(e.target.value as Policy)}
        >
          {result.policies.map((p) => (
            <option key={p.policy} value={p.policy}>
              {STRATEGY_NAMES[p.policy]}
            </option>
          ))}
        </select>
      </div>
      <div className="fleet-diagram">
        <div className="floor-scale">
          <span>P{result.scenario.totalFloors - 1}</span>
          <span>0 / TERRA</span>
        </div>
        {cars.map((c) => (
          <div className="replay-shaft" key={c.id}>
            <span className="shaft-label">{String(c.id + 1).padStart(2, '0')}</span>
            <div
              className="replay-car"
              style={{ bottom: `${5 + (75 * c.floor) / (result.scenario.totalFloors - 1)}%` }}
            >
              <span>P{Math.round(c.floor)}</span>
              <small>{c.occupancy} persone</small>
            </div>
          </div>
        ))}
        <div className="replay-counters">
          <strong>{formatClock(time)}</strong>
          <span>{latest?.waiting ?? 0} in attesa</span>
          <span>{latest?.onboard ?? 0} a bordo</span>
          <span>{latest?.completed ?? 0} completate</span>
        </div>
      </div>
      <label className="replay-slider">
        <span className="sr-only">Ora del replay</span>
        <input
          type="range"
          min={result.scenario.horizonStart}
          max={result.scenario.horizonEnd}
          step="10"
          value={time}
          onChange={(e) => setTime(+e.target.value)}
        />
        <div>
          <span>{formatClock(result.scenario.horizonStart)}</span>
          <span>ESPLORA LA GIORNATA</span>
          <span>{formatClock(result.scenario.horizonEnd)}</span>
        </div>
      </label>
      <p className="small-note">
        Sposta il cursore per vedere dove si trovano le cabine e quante persone stanno viaggiando.
      </p>
    </div>
  );
}
export default function Results({
  result,
  stale,
  onAlgorithms,
}: {
  result: ExperimentResult;
  stale: boolean;
  onAlgorithms: () => void;
}) {
  const base = result.policies.find((policy) => policy.policy === 'reactive')!;
  const adaptive = result.policies.find((policy) => policy.policy === 'adaptive')!;
  const complete = result.policies.every((policy) => policy.completed === policy.generated);
  const improvement =
    base.meanWait !== null && base.meanWait > 0 && adaptive.meanWait !== null
      ? 100 * (1 - adaptive.meanWait / base.meanWait)
      : null;
  const hasRequests = result.policies.some((policy) => policy.generated > 0);
  return (
    <section
      className="results-section page-width simple-results"
      id="results"
      tabIndex={-1}
      aria-label="Risultati della simulazione"
    >
      <div className="results-heading">
        <div>
          <p className="eyebrow">LA GIORNATA DEL TUO EDIFICIO</p>
          <h2>
            Quanto tempo <em>si aspetta?</em>
          </h2>
        </div>
      </div>
      {stale && (
        <p className="result-warning" role="status">
          Hai cambiato i dati dell’edificio. Avvia una nuova simulazione per aggiornare questi
          risultati.
        </p>
      )}
      {!complete && (
        <p className="result-warning">
          Alcuni viaggi non sono stati completati. Le attese qui sotto riguardano chi è salito:
          confronta anche i viaggi rimasti in attesa.
        </p>
      )}
      <div className="result-meta">
        <span>{result.scenario.elevatorCount} ASCENSORI</span>
        <span>{result.scenario.totalFloors - 1} PIANI + TERRA</span>
        <span>
          {result.scenario.groups.reduce((sum, group) => sum + group.employees, 0)} ADDETTI
        </span>
        <span>UNA GIORNATA SIMULATA</span>
      </div>
      <div className="metric-cards">
        {result.policies.map((policy, i) => (
          <article
            className={'metric-card ' + (policy.policy === 'adaptive' ? 'metric-featured' : '')}
            key={policy.policy}
          >
            <p className="eyebrow">
              <i style={{ background: COLORS[i] }} />
              {STRATEGY_NAMES[policy.policy]}
            </p>
            <strong>
              {numberFormat(policy.meanWait)}
              {policy.meanWait !== null && <small>s</small>}
            </strong>
            <p>{policy.meanWait === null ? 'Attesa non disponibile' : 'Attesa media'}</p>
            <div>
              <span>Attese oltre 2 minuti</span>
              <b>{policy.over120Pct === null ? '—' : numberFormat(policy.over120Pct) + '%'}</b>
            </div>
            <div>
              <span>Viaggi completati</span>
              <b>
                {policy.completed} / {policy.generated}
              </b>
            </div>
          </article>
        ))}
      </div>
      <div className="improvement-line">
        <span>Previsione intelligente rispetto a senza anticipo</span>
        <strong>
          {improvement === null || !complete
            ? 'Non disponibile'
            : (improvement >= 0 ? '−' : '+') + numberFormat(Math.abs(improvement)) + '% di attesa'}
        </strong>
        <p>
          {!hasRequests
            ? 'Non ci sono persone da trasportare con i dati inseriti.'
            : !complete
              ? 'Il confronto resta incompleto finché tutti i viaggi non sono conclusi.'
              : improvement === null
                ? 'Non ci sono abbastanza attese per calcolare una differenza.'
                : improvement >= 0
                  ? 'L’attesa media si riduce in questa giornata simulata.'
                  : 'In questa giornata simulata, la previsione intelligente produce attese più lunghe.'}
        </p>
      </div>
      <p className="small-note">
        Ogni strategia riceve gli stessi viaggi. Le attese sono calcolate su chi è salito, anche se
        non ha ancora raggiunto il piano richiesto.
      </p>
      <div className="simple-result-chart">
        <p className="eyebrow">VEDI COME CAMBIANO LE ATTESE</p>
        <h3>Più in fretta, piano per piano.</h3>
        <WaitDistribution policies={result.policies} />
      </div>
      <div className="result-table-wrap">
        <table className="result-table">
          <caption>Tutti i viaggi della giornata</caption>
          <thead>
            <tr>
              <th scope="col">Viaggi</th>
              {result.policies.map((policy) => (
                <th scope="col" key={policy.policy}>
                  {STRATEGY_NAMES[policy.policy]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Richiesti', (policy: PolicySummary) => policy.generated],
                ['Completati', (policy: PolicySummary) => policy.completed],
                ['Ancora in attesa', (policy: PolicySummary) => policy.waiting],
                ['Persone ancora in cabina', (policy: PolicySummary) => policy.onboard],
                ['Fuori dall’orario simulato', (policy: PolicySummary) => policy.excluded],
              ] as [string, (policy: PolicySummary) => number][]
            ).map(([label, get]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {result.policies.map((policy) => (
                  <td key={policy.policy}>{get(policy)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="simulation-extra">
        <summary>
          Guarda gli ascensori durante la giornata <Icon name="plus" size={17} />
        </summary>
        <FleetReplay key={result.completedAt} result={result} />
      </details>
      <details className="simulation-extra result-downloads">
        <summary>
          Scarica i risultati <Icon name="download" size={17} />
        </summary>
        <div className="result-actions">
          <button
            className="outline-button compact"
            type="button"
            onClick={() => exportData(result, true)}
          >
            Tabella CSV <Icon name="download" size={17} />
          </button>
          <button
            className="outline-button compact"
            type="button"
            onClick={() => exportData(result, false)}
          >
            Dati completi JSON <Icon name="download" size={17} />
          </button>
        </div>
      </details>
      <p className="small-note">
        I risultati valgono per questa simulazione.{' '}
        <a
          href="/algoritmi"
          onClick={(event) => {
            if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
              event.preventDefault();
              onAlgorithms();
            }
          }}
        >
          Gli algoritmi
        </a>{' '}
        spiega il metodo e i suoi limiti.
      </p>
    </section>
  );
}
