import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Icon from '../components/Icon';
import originals from './sequence/originals.json';

gsap.registerPlugin(ScrollTrigger);
const cards = [
  ['01', 'Assegnazione intelligente', 'Il sistema cerca la cabina che può servire la richiesta con il minor impatto sui tempi complessivi, considerando le fermate già previste.'],
  ['02', 'Previsione della domanda', 'Orari e abitudini apprese aiutano ad anticipare i picchi e a posizionare le cabine disponibili.'],
  ['03', 'Gestione della capacità', 'Passeggeri e limiti di carico vengono verificati lungo il percorso: una cabina piena può essere disponibile dopo uno sbarco.'],
];

export default function IntelligenceSection({ onAlgorithms }: { onAlgorithms(): void }) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo('.intelligence-title', { y: 26 }, { y: 0, ease: 'none',
          scrollTrigger: { trigger: section.current, start: 'top 90%', end: 'top 35%', scrub: true } });
        gsap.fromTo('.intelligence-card', { y: 36, opacity: .35 }, { y: 0, opacity: 1, stagger: .12, ease: 'none',
          scrollTrigger: { trigger: section.current, start: 'top 85%', end: 'top 15%', scrub: true } });
      }, section);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <section ref={section} className="intelligence-section" id="intelligenza" aria-labelledby="intelligence-title">
    <img className="intelligence-photo" src={originals[6].url}
      alt="Fotografia originale della hall, con reception, colonne chiare e lampade organiche" width="1122" height="1402"
      loading="lazy" decoding="async" />
    <div className="intelligence-layout page-width">
      <div className="intelligence-title">
        <p className="eyebrow">IL VALORE DEL COORDINAMENTO</p>
        <h2 id="intelligence-title">Non più veloci. <br /><em>Più intelligenti.</em></h2>
        <p>Un sistema intelligente che coordina gli ascensori, anticipa il traffico e riduce i tempi di attesa.</p>
        <small>Il vantaggio dipende dallo scenario: è il confronto calcolato a mostrarlo.</small>
      </div>
      <div className="intelligence-cards">
        {cards.map(([number, title, text]) => <article className="intelligence-card" key={number}>
          <span>{number}</span><div><h3>{title}</h3><p>{text}</p></div>
        </article>)}
        <a className="intelligence-cta" href="/algoritmi" onClick={(event) => {
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            event.preventDefault(); onAlgorithms();
          }
        }}>Esplora gli algoritmi <Icon name="arrow" size={22} /></a>
      </div>
    </div>
  </section>;
}
