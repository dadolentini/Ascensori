import { useState } from 'react';
import Icon from '../components/Icon';
import manifest from './sequence/manifest.json';

const references = [
  { frame: 0, label: 'La torre', alt: 'Vista completa del palazzo nei frame forniti' },
  { frame: 6, label: 'L’ingresso e la lobby', alt: 'Lobby originale con colonne e sospensioni organiche' },
  { frame: 9, label: 'L’avvicinamento', alt: 'Vista del portale dell’ascensore dalla lobby' },
  { frame: manifest.frames.length - 1, label: manifest.complete ? 'L’ascensore aperto' : 'Il portale frontale',
    alt: manifest.complete ? 'Frame fornito dell’ascensore aperto' : 'Vista frontale dell’ascensore chiuso' },
];

export default function VisualReferences() {
  const [open, setOpen] = useState(false);
  return (
    <details className="visual-reference-disclosure page-width"
      onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>I riferimenti della scena <Icon name="plus" size={17} /></summary>
      {open && <div className="visual-reference-content">
        <p>Il percorso utilizza esclusivamente i fotogrammi forniti, dal palazzo all’ascensore.
          Le dissolvenze collegano le viste disponibili: non vengono generati fotogrammi intermedi.</p>
        <div className="visual-reference-grid">
          {references.map((reference) => <figure key={reference.frame}>
            <img src={manifest.frames[reference.frame].url} alt={reference.alt} loading="lazy" decoding="async" width={manifest.width} height={manifest.height} />
            <figcaption><strong>{reference.label}</strong><span>Frame fornito · {manifest.frames[reference.frame].source}</span></figcaption>
          </figure>)}
        </div>
      </div>}
    </details>
  );
}
