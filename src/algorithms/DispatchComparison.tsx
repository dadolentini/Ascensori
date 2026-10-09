import { useMemo, useState } from 'react';
import { evaluateDispatchExample } from './dispatchExample';
import { numberFormat } from '../configurator/helpers';

export default function DispatchComparison() {
  const [available, setAvailable] = useState(false);
  const example = useMemo(() => evaluateDispatchExample(available ? 'available' : 'committed'), [available]);
  return <div className="dispatch-example">
    <div className="dispatch-toolbar">
      <span>CHIAMATA · PIANO 10 → TERRA</span>
      <button className="outline-button" aria-pressed={available} onClick={() => setAvailable(!available)}>
        {available ? 'Ripristina il viaggio di A' : 'Libera la cabina A'}
      </button>
    </div>
    <div className="dispatch-cabins">
      {example.candidates.map((candidate) => <article key={candidate.id} data-cabin={candidate.label}
        data-selected={candidate.selected} className={`dispatch-cabin ${candidate.selected ? 'is-selected' : ''}`}>
        <div className="dispatch-cabin-title"><strong>{candidate.label}</strong><span>Piano {candidate.floor}</span></div>
        <div className="dispatch-tags">
          {candidate.nearest && <span>Più vicina</span>}
          {candidate.selected && <span className="selected-tag">Scelta dal modello</span>}
        </div>
        <dl>
          <div><dt>Passeggeri a bordo</dt><dd>{candidate.passengers}</dd></div>
          <div><dt>Fermate già previste</dt><dd>{candidate.scheduledFloors.length ? candidate.scheduledFloors.map((floor) => floor === 0 ? 'Terra' : floor).join(' → ') : 'Nessuna'}</dd></div>
          <div><dt>Prelievo stimato</dt><dd>{numberFormat(candidate.etaSeconds, 2)} s</dd></div>
          <div className="dispatch-cost"><dt>Costo ponderato</dt><dd>{numberFormat(candidate.marginalCost, 2)}</dd></div>
        </dl>
        <p>{candidate.reason}</p>
      </article>)}
    </div>
    <p className="dispatch-outcome" role="status" aria-live="polite">
      Il modello sceglie la cabina <strong>{String.fromCharCode(65 + example.winnerId)}</strong>.
      {available ? ' Cambiando la disponibilità di A, cambia anche la decisione.' : ' A è più vicina, ma deve completare la tratta già iniziata.'}
    </p>
    <p className="dispatch-note">{example.note} I costi includono attesa, viaggio ponderato e ritardi aggiunti; sono confrontabili fra le cabine, non sono tutti secondi di attesa.</p>
  </div>;
}
