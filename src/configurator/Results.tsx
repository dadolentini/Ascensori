import { useMemo, useState } from 'react';
import type { ExperimentResult, PolicySummary } from '../simulation/results';
import { POLICY_NAMES, requestMetrics } from '../simulation/results';
import { mean } from '../simulation/statistics';
import type { Policy } from '../simulation/routing';
import { motionPosition } from '../simulation/physics';
import { numberFormat, formatClock } from './helpers';
import Icon from '../components/Icon';
const COLORS = ['#9aa5a6', '#b59661', '#3c776e'];
function dailyAverage(
  policy: PolicySummary,
  get: (day: PolicySummary['days'][number]) => number | null,
) {
  return mean(policy.days.map(get).filter((value): value is number => value !== null));
}
function GroupDiagnostics({ result }: { result: ExperimentResult }) {
  const rows = useMemo(
    () =>
      result.scenario.groups.map((group) => ({
        group,
        cells: result.policies.map((policy) => {
          const requests = policy.days.flatMap((day) =>
            day.requests.filter((request) => request.groupId === group.id),
          );
          const metrics = requestMetrics(requests);
          return {
            metrics,
            waiting: requests.filter((request) => request.state === 'waiting').length,
            onboard: requests.filter((request) => request.state === 'onboard').length,
          };
        }),
      })),
    [result],
  );
  return (
    <details className="learned-components">
      <summary>Esamina attesa ed equità per gruppo ({rows.length} gruppi)</summary>
      <p className="small-note">
        Campioni aggregati sulle repliche: attesa media / massima in secondi sugli imbarcati; coda e
        utenti a bordo alla fine. Nessuna garanzia di attesa massima.
      </p>
      <div className="result-table-wrap">
        <table className="result-table">
          <caption>
            Diagnostica per gruppo e piano · media / massimo / campioni / coda / a bordo
          </caption>
          <thead>
            <tr>
              <th scope="col">Gruppo / piano</th>
              {result.policies.map((policy) => (
                <th scope="col" key={policy.policy}>
                  {POLICY_NAMES[policy.policy]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, cells }) => (
              <tr key={group.id}>
                <th scope="row">
                  {group.name} · P{group.floor}
                </th>
                {cells.map((cell, i) => (
                  <td key={result.policies[i].policy}>
                    {numberFormat(cell.metrics.wait.mean)} /{' '}
                    {numberFormat(cell.metrics.maximumWait)} s<br />
                    {cell.metrics.wait.count} campioni · {cell.waiting} in coda · {cell.onboard} a
                    bordo
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
function FitDiagnostics({ result }: { result: ExperimentResult }) {
  const fit = result.diagnostics;
  if (!fit) return null;
  return (
    <details className="learned-components">
      <summary>Esamina il fit NNLS dei flussi aggregati</summary>
      <p className="small-note">
        Equazioni (3)–(4): intercetta β₀ e basi gaussiane ai centri dei bin di dieci minuti.{' '}
        {fit.trainingDays} giorni training / {fit.holdoutDays} holdout. RMSE training{' '}
        {numberFormat(fit.trainingRMSE, 4)}, holdout {numberFormat(fit.holdoutRMSE, 4)}{' '}
        passeggeri/minuto. Questa diagnostica non decide il parcheggio.
      </p>
      <div className="result-table-wrap">
        <table className="result-table">
          <caption>Coefficienti non negativi · passeggeri/minuto</caption>
          <thead>
            <tr>
              <th scope="col">Direzione</th>
              <th scope="col">Componente</th>
              <th scope="col">β</th>
            </tr>
          </thead>
          <tbody>
            {(['up', 'down'] as const).flatMap((direction) =>
              fit.components
                .filter((component) => component.direction === direction)
                .map((component, i) => (
                  <tr key={`${direction}/${i}`}>
                    <th scope="row">{direction === 'up' ? 'Salita' : 'Discesa'}</th>
                    <td>
                      {component.kind === 'intercept'
                        ? 'Intercetta β₀'
                        : `μ ${formatClock(component.mean)} · σ ${numberFormat(component.sigma / 60)} min`}
                    </td>
                    <td>{numberFormat(fit.coefficients[direction][i], 4)}</td>
                  </tr>
                )),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}
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
function CumulativeChart({ policies }: { policies: PolicySummary[] }) {
  const data = useMemo(
    () =>
      policies.map((p) =>
        p.days
          .flatMap((d) =>
            d.requests.filter((r) => r.pickup !== null).map((r) => r.pickup! - r.born),
          )
          .sort((a, b) => a - b),
      ),
    [policies],
  );
  const maximum = Math.max(1, ...data.map((a) => a.at(-1) ?? 0));
  return (
    <div className="chart-container">
      <svg
        viewBox="0 0 650 260"
        role="img"
        aria-label="Distribuzione cumulata: percentuale degli utenti imbarcati entro ogni tempo di attesa"
      >
        <text x="42" y="17" className="chart-label">
          UTENTI IMBARCATI (%)
        </text>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1="45" x2="625" y1={220 - v * 1.8} y2={220 - v * 1.8} className="chart-grid" />
            <text x="34" y={224 - v * 1.8} textAnchor="end" className="chart-label">
              {v}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <text key={v} x={45 + v * 580} y="240" textAnchor="middle" className="chart-label">
            {numberFormat(v * maximum, 0)} s
          </text>
        ))}
        {data.map((values, i) => {
          if (!values.length) return null;
          const stride = Math.max(1, Math.floor(values.length / 300)),
            points = values
              .filter((_, j) => j % stride === 0 || j === values.length - 1)
              .map((v) => {
                let hi = values.length,
                  lo = 0;
                while (lo < hi) {
                  const mid = (lo + hi) >> 1;
                  if (values[mid] <= v) lo = mid + 1;
                  else hi = mid;
                }
                return `${45 + (580 * v) / maximum},${220 - (180 * lo) / values.length}`;
              });
          return (
            <polyline
              key={i}
              points={points.join(' ')}
              fill="none"
              stroke={COLORS[i]}
              strokeWidth="2.3"
            />
          );
        })}
      </svg>
      <div className="chart-legend">
        {policies.map((p, i) => (
          <span key={p.policy}>
            <i style={{ background: COLORS[i] }} />
            {POLICY_NAMES[p.policy]}
          </span>
        ))}
      </div>
      <p className="small-note">
        CDF aggregata sulle repliche. La coda completa è visibile; campioni:{' '}
        {policies.map((p) => `${POLICY_NAMES[p.policy]} ${p.waitSamples}`).join(' · ')}. I non
        imbarcati sono esclusi dalla distribuzione, ma riportati nei contatori.
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
          <p className="eyebrow">LA TRACCIA REALE DEL MOTORE</p>
          <h3>Un giorno, piano per piano.</h3>
        </div>
        <label className="sr-only" htmlFor="replay-policy">
          Politica del replay
        </label>
        <select
          id="replay-policy"
          value={policy}
          onChange={(e) => setPolicy(e.target.value as Policy)}
        >
          {result.policies.map((p) => (
            <option key={p.policy} value={p.policy}>
              {POLICY_NAMES[p.policy]}
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
        Replica 1 · seed {day.seed}. Posizioni interpolate dal profilo fisico; occupazione e
        contatori dagli eventi. Il replay non modifica il calcolo. Il carico massimo è{' '}
        {result.scenario.physics.capacityKg} kg / {result.scenario.physics.capacityPeople} persone.
      </p>
    </div>
  );
}
export default function Results({ result, stale }: { result: ExperimentResult; stale: boolean }) {
  const base = result.policies[0],
    best = result.policies[2],
    complete = result.policies.every((p) => p.completed === p.generated);
  const improvement =
    base.meanWait !== null && base.meanWait > 0 && best.meanWait !== null
      ? 100 * (1 - best.meanWait / base.meanWait)
      : null;
  return (
    <section
      className="results-section page-width"
      id="results"
      tabIndex={-1}
      aria-label="Risultati della simulazione"
    >
      <div className="results-heading">
        <div>
          <p className="eyebrow">IL RISULTATO DEL TUO ESPERIMENTO</p>
          <h2>
            Adesso, <em>i numeri.</em>
          </h2>
        </div>
        <div className="result-actions">
          <button className="outline-button compact" onClick={() => exportData(result, true)}>
            CSV <Icon name="download" size={17} />
          </button>
          <button className="outline-button compact" onClick={() => exportData(result, false)}>
            Scenario + JSON <Icon name="download" size={17} />
          </button>
        </div>
      </div>
      {stale && (
        <p className="result-warning" role="status">
          La configurazione è cambiata. Questi risultati appartengono allo scenario precedente;
          avvia una nuova simulazione per aggiornarli.
        </p>
      )}
      {!complete && (
        <p className="result-warning">
          Servizio incompleto: confrontare solo le medie può favorire chi serve meno richieste.
          Esamina prima i contatori e la coda residua.
        </p>
      )}
      <div className="result-meta">
        <span>{result.scenario.elevatorCount} CABINE</span>
        <span>{result.scenario.totalFloors} PIANI INCLUSO TERRA</span>
        <span>
          {result.seeds.length} {result.seeds.length === 1 ? 'REPLICA' : 'REPLICHE'}
        </span>
        <span>SEED {result.seeds.join(' / ')}</span>
        <span>{numberFormat(result.durationMs / 1000, 2)} s DI CALCOLO</span>
      </div>
      <div className="metric-cards">
        {result.policies.map((p, i) => (
          <article className={`metric-card ${i === 2 ? 'metric-featured' : ''}`} key={p.policy}>
            <p className="eyebrow">
              <i style={{ background: COLORS[i] }} />
              {POLICY_NAMES[p.policy]}
            </p>
            <strong>
              {numberFormat(p.meanWait)}
              <small>s</small>
            </strong>
            <p>Attesa media simulata</p>
            <div>
              <span>P95 giornaliero</span>
              <b>{numberFormat(p.p95Wait)} s</b>
            </div>
            <div>
              <span>Attesa oltre 120 s</span>
              <b>{numberFormat(p.over120Pct)}%</b>
            </div>
          </article>
        ))}
      </div>
      <div className="improvement-line">
        <span>
          {complete
            ? 'Adattiva rispetto alla baseline'
            : 'Differenza descrittiva sui soli imbarcati'}
        </span>
        <strong>
          {improvement === null
            ? 'Non disponibile'
            : `${improvement >= 0 ? '−' : '+'}${numberFormat(Math.abs(improvement))}% ${improvement >= 0 ? 'attesa' : 'attesa (peggioramento)'}`}
        </strong>
        <p>
          {result.ci
            ? `${complete ? 'Riduzione appaiata' : 'Differenza appaiata sui soli imbarcati'} ${numberFormat(result.ci.mean)} s · IC esplorativo 95% [${numberFormat(result.ci.lower)}, ${numberFormat(result.ci.upper)}] s.`
            : result.seeds.length === 1
              ? 'Una replica: nessun intervallo di confidenza. Scegli otto repliche per il confronto statistico.'
              : 'Intervallo di confidenza non disponibile: almeno una replica non ha campioni di attesa.'}
        </p>
      </div>
      <div className="result-table-wrap">
        <table className="result-table">
          <caption>
            Indicatori verificabili · medie giornaliere delle durate; contatori sommati sulle
            repliche
          </caption>
          <thead>
            <tr>
              <th scope="col">Indicatore</th>
              {result.policies.map((p) => (
                <th scope="col" key={p.policy}>
                  {POLICY_NAMES[p.policy]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Richieste nell’orizzonte', (p: PolicySummary) => p.generated],
                ['Completate', (p: PolicySummary) => p.completed],
                ['In coda alla fine', (p: PolicySummary) => p.waiting],
                ['A bordo alla fine', (p: PolicySummary) => p.onboard],
                ['Fuori orizzonte (escluse)', (p: PolicySummary) => p.excluded],
                ['Campioni attesa · imbarcati', (p: PolicySummary) => p.waitSamples],
                ['Campioni viaggio · completati', (p: PolicySummary) => p.rideSamples],
                [
                  'Attesa mediana giornaliera · s',
                  (p: PolicySummary) => dailyAverage(p, (d) => d.metrics.wait.median),
                ],
                [
                  'Attesa massima aggregata · s',
                  (p: PolicySummary) => {
                    const values = p.days
                      .map((d) => d.metrics.maximumWait)
                      .filter((v): v is number => v !== null);
                    return values.length ? Math.max(...values) : null;
                  },
                ],
                [
                  'Attesa media sui soli completati · s',
                  (p: PolicySummary) =>
                    dailyAverage(
                      p,
                      (d) => requestMetrics(d.requests.filter((r) => r.finish !== null)).wait.mean,
                    ),
                ],
                ['Viaggio medio · s', (p: PolicySummary) => p.meanRide],
                ['Tempo totale medio · s', (p: PolicySummary) => p.meanJourney],
                ['Fermate con apertura · media/giorno', (p: PolicySummary) => p.doorStops],
                ['Piani percorsi · media/giorno', (p: PolicySummary) => p.distanceFloors],
                ['Piani di parcheggio · media/giorno', (p: PolicySummary) => p.parkingFloors],
                ['Imbarchi respinti', (p: PolicySummary) => p.rejectedBoardings],
              ] as [string, (p: PolicySummary) => number | null][]
            ).map(([label, get]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {result.policies.map((p) => (
                  <td key={p.policy}>
                    {numberFormat(
                      get(p),
                      label.endsWith('· s') || label.includes('media/') ? 1 : 0,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small-note">
        Attese sugli imbarcati; viaggio e totale sui completati. Percentili con interpolazione
        lineare; P95 mostrato come media dei p95 giornalieri. Piani percorsi: segmenti conclusi;
        residui dei segmenti in corso esportati separatamente. Nessun dato di energia dedotto.
      </p>
      <div className="result-visuals">
        <div>
          <p className="eyebrow">LA CODA, NON SOLO LA MEDIA</p>
          <h3>Quanto tempo aspetta ciascuno?</h3>
          <CumulativeChart policies={result.policies} />
        </div>
        <div>
          <p className="eyebrow">L’APPRENDIMENTO, FUORI CAMPIONE</p>
          <h3>Programma e abitudini.</h3>
          <div className="learning-stat">
            <span>MAE sulle giornate di validation</span>
            <div>
              <strong>
                {numberFormat(result.learning.scheduledMAE, 4)}
                <small>programma</small>
              </strong>
              <span>→</span>
              <strong>
                {numberFormat(result.learning.learnedMAE, 4)}
                <small>appreso</small>
              </strong>
            </div>
            <p>
              {result.learning.trainDays} giorni training / {result.learning.holdoutDays} validation
              · richieste per blocco di 5 min, per componente pausa, su tutte le 24 ore. Il
              denominatore differisce dal grafico del PDF, limitato alla fascia pranzo.
            </p>
          </div>
          <p className="small-note">
            Apprendimento da storico sintetico, senza dati del futuro. La riduzione dell’errore del
            forecast è distinta dal miglioramento dell’attesa.
          </p>
          <details className="learned-components">
            <summary>
              Esamina i parametri appresi ({result.learning.components.length} pause)
            </summary>
            <div className="result-table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Gruppo / pausa</th>
                    <th>Dichiarata</th>
                    <th>Appresa</th>
                    <th>Eventi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.learning.components.map((c) => (
                    <tr key={`${c.groupId}/${c.breakId}`}>
                      <th>
                        {c.groupId} / {c.breakId}
                      </th>
                      <td>{formatClock(c.scheduled)}</td>
                      <td>{formatClock(c.mean)}</td>
                      <td>{c.observations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
      <GroupDiagnostics result={result} />
      <FitDiagnostics result={result} />
      <FleetReplay result={result} />
      <p className="result-provenance">
        MOTORE {result.version} · DATI SINTETICI · GREEDY, NON OTTIMO GLOBALE · SCENARIO E TRACCE
        ESPORTABILI
      </p>
    </section>
  );
}
