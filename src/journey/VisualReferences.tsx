import { useState } from 'react';
import Icon from '../components/Icon';

const references = [
  { src: '/references/IMG_3928.jpg', label: 'La torre', source: 'Fotografia originale · IMG_3928',
    alt: 'Riferimento originale della torre vetrata con balconi laterali e illuminazione verticale' },
  { src: '/references/lobby-03.05s.jpg', label: 'L’ingresso e la lobby', source: 'Fotogramma originale · 3,05 s',
    alt: 'Lobby nel video originale con colonne cilindriche, sospensioni organiche e reception' },
  { src: '/references/portal-closed.webp', label: 'L’ascensore chiuso', source: 'Fotografia originale · IMG_3916',
    alt: 'Ascensore inox originale chiuso, con due ante centrali e display sul lato sinistro' },
  { src: '/references/portal-open.webp', label: 'L’ascensore aperto', source: 'Fotografia originale · IMG_3920',
    alt: 'Ascensore inox originale aperto, con due pannelli scuri posteriori e pavimento rigato' },
];

export default function VisualReferences() {
  const [open, setOpen] = useState(false);
  return (
    <details className="visual-reference-disclosure page-width"
      onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>I riferimenti della scena <Icon name="plus" size={17} /></summary>
      {open && <div className="visual-reference-content">
        <p>Forme e materiali seguono le fotografie e i fotogrammi originali. La posizione dell’ascensore
          dentro la lobby è un adattamento progettuale: il video non documenta quel collegamento.</p>
        <div className="visual-reference-grid">
          {references.map((reference) => <figure key={reference.src}>
            <img src={reference.src} alt={reference.alt} loading="lazy" decoding="async" width="420" height="320" />
            <figcaption><strong>{reference.label}</strong><span>{reference.source}</span></figcaption>
          </figure>)}
        </div>
      </div>}
    </details>
  );
}
