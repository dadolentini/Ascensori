import type { CSSProperties } from 'react';
import Formula from '../components/Formula';
import { equations } from '../algorithms/equations';

const chapters = [
  { n: 16, start: .245 * .83, end: .385 * .83, title: 'Anticipare il movimento.',
    subtitle: 'La giornata ha un ritmo. Il modello impara a riconoscerlo.',
    description: 'La domanda prevista orienta il parcheggio delle cabine inattive prima dei picchi.',
    terms: [['Organico', 'Quante persone possono muoversi.'], ['Abitudini apprese', 'Quando e con quale dispersione arriva il traffico.'], ['Finestra futura', 'Si guarda da 3 a 15 minuti in avanti.']] },
  { n: 9, start: .56 * .83, end: .735 * .83, title: 'Scegliere con criterio.',
    subtitle: 'La distanza è solo una parte della decisione.',
    description: 'Si confrontano gli inserimenti ammissibili di prelievo e sbarco, considerando anche chi aspetta e chi è già a bordo.',
    terms: [['La nuova chiamata', 'Origine e destinazione dichiarate.'], ['Il percorso esistente', 'Fermate e passeggeri già assegnati.'], ['Il costo aggiunto', 'L’inserimento con il minor impatto complessivo.']] },
  { n: 6, start: .835, end: 1, title: 'Ogni posto conta.',
    subtitle: 'Una decisione migliore rispetta i limiti reali.',
    description: 'Posti disponibili e massa trasportata sono vincoli distinti, verificati lungo il percorso.',
    terms: [['Carico', 'La massa resta entro la portata.'], ['Passeggeri', 'Il numero resta entro i posti disponibili.'], ['Fattibilità', 'Chi non può salire resta in attesa.']] },
] as const;

export function journeyEquationState(progress: number) {
  const chapter = chapters.find((item) => progress > item.start && progress < item.end);
  if (!chapter) return null;
  const local = (progress - chapter.start) / (chapter.end - chapter.start);
  return { chapter, local, opacity: Math.min(1, local / .12, (1 - local) / .12) };
}

export default function JourneyEquations({ progress }: { progress: number }) {
  const state = journeyEquationState(progress);
  // Keep the three formulas mounted so their layout and fonts are prepared
  // while the photographs preload, rather than at the first scroll transition.
  return <>{chapters.map((chapter) => {
    const active = state?.chapter.n === chapter.n;
    const local = active ? state.local : 0;
    const opacity = active ? state.opacity : 0;
    const equation = equations.find((item) => item.n === chapter.n)!;
    return <section key={chapter.n} className="journey-equation" aria-label={`Il modello: ${chapter.title}`}
      aria-hidden={!active || opacity < 1} data-equation={chapter.n}
      style={{ opacity, visibility: active ? 'visible' : 'hidden' }}>
    <div className="journey-equation-content"
      style={{ visibility: opacity < 1 ? 'hidden' : 'visible',
        transform: `translateY(${(1 - Math.min(1, local * 4)) * 24}px)` }}>
      <p className="eyebrow">IL MOVIMENTO, SPIEGATO / EQUAZIONE {chapter.n}</p>
      <h2>{chapter.title}</h2>
      <p className="equation-subtitle">{chapter.subtitle}</p>
      <div className="journey-formula" style={{ '--formula-reveal': `${Math.max(0, 100 - local * 450)}%` } as CSSProperties}>
        <Formula tex={equation.tex} block label={`Equazione ${chapter.n}: ${equation.title}`} />
      </div>
      <p className="equation-description">{chapter.description}</p>
      <div className="journey-equation-terms">
        {chapter.terms.map(([title, description], index) => <div key={title}
          style={{ opacity: Math.min(1, Math.max(0, (local - .08 * index) * 7)),
            transform: `translateY(${Math.max(0, 1 - (local - .08 * index) * 7) * 12}px)` }}>
          <span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><p>{description}</p>
        </div>)}
      </div>
      <a className="equation-source" href={`/docs/modello-ascensori.pdf#page=${equation.page}`} target="_blank" rel="noreferrer">
        Equazione ({chapter.n}) · PDF originale, pagina {equation.page} ↗
      </a>
    </div>
    </section>;
  })}</>;
}
