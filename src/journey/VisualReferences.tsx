import { useState } from 'react';
import Icon from '../components/Icon';
import manifest from './sequence/manifest.json';
import originals from './sequence/originals.json';

const references = [
  { frame: 0, label: 'La torre', alt: 'Vista completa del palazzo nei frame forniti' },
  { frame: 6, label: 'L’ingresso e la lobby', alt: 'Lobby originale con colonne e sospensioni organiche' },
  { frame: 9, label: 'L’avvicinamento', alt: 'Vista del portale dell’ascensore dalla lobby' },
  { frame: originals.length - 1, label: manifest.complete ? 'L’ascensore aperto' : 'Il portale frontale',
    alt: manifest.complete ? 'Frame fornito dell’ascensore aperto' : 'Vista frontale dell’ascensore chiuso' },
];

export default function VisualReferences() {
  const [open, setOpen] = useState(false);
  return (
    <details className="visual-reference-disclosure page-width"
      onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>I riferimenti della scena <Icon name="plus" size={17} /></summary>
      {open && <div className="visual-reference-content">
        <p>I fotogrammi forniti sono i riferimenti dell’edificio, conservati senza modifiche.
          Il percorso include anche le nuove viste selezionate dagli archivi e raccordi assistiti
          dalla generazione d’immagini. Alcuni dettagli dei raccordi possono differire dagli originali.</p>
        <div className="visual-reference-grid">
          {references.map((reference) => <figure key={reference.frame}>
            <img src={originals[reference.frame].url} alt={reference.alt} loading="lazy" decoding="async" width={manifest.width} height={manifest.height} />
            <figcaption><strong>{reference.label}</strong><span>Frame fornito · {originals[reference.frame].source}</span></figcaption>
          </figure>)}
        </div>
      </div>}
    </details>
  );
}
