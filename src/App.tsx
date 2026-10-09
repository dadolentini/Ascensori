import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { validateScenario } from './simulation/scenario';
import type { Scenario } from './simulation/types';
import type { ExperimentResult } from './simulation/results';
import Configurator from './configurator/Configurator';
import { createSimpleScenario, DEFAULT_SIMPLE_CONFIGURATION } from './configurator/helpers';
import Results from './configurator/Results';
import Algorithms from './algorithms/Algorithms';
import Formula from './components/Formula';
import Icon from './components/Icon';
import JourneyFallback from './journey/JourneyFallback';
import VisualReferences from './journey/VisualReferences';
import JourneyEquations, { journeyEquationState } from './journey/JourneyEquations';
import IntelligenceSection from './journey/IntelligenceSection';
import useEditorialMotion from './journey/useEditorialMotion';
import photoManifest from './journey/sequence/manifest.json';
import photoOriginals from './journey/sequence/originals.json';
const PhotoSequence = lazy(() => import('./journey/sequence/PhotoSequence'));
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const phaseCopy = [
  { from: 0, title: 'L’edificio', n: '01' },
  { from: .203, title: 'Anticipare', n: '02' },
  { from: .32, title: 'La hall', n: '03' },
  { from: .465, title: 'La decisione', n: '04' },
  { from: .61, title: 'L’ascensore', n: '05' },
  { from: .835, title: 'La capacità', n: '06' },
];
export default function App() {
  const [route, setRoute] = useState(window.location.pathname),
    [progress, setProgress] = useState(0),
    [light, setLight] = useState(false),
    [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEditorialMotion(route, reduced);
  const [loading, setLoading] = useState({ loaded: 0, total: photoManifest.frames.length });
  const [scenario, setScenario] = useState<Scenario>(() =>
    createSimpleScenario(DEFAULT_SIMPLE_CONFIGURATION),
  );
  const [result, setResult] = useState<ExperimentResult | null>(null),
    [running, setRunning] = useState(false),
    [fraction, setFraction] = useState(0),
    [runLabel, setRunLabel] = useState(''),
    [errors, setErrors] = useState<string[]>([]),
    [status, setStatus] = useState('');
  const journey = useRef<HTMLElement>(null),
    worker = useRef<Worker | null>(null),
    runId = useRef(0),
    homeScroll = useRef(0),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallback = reduced || light;
  const navigate = useCallback(
    (next: string) => {
      if (route === '/') homeScroll.current = window.scrollY;
      window.history.pushState({}, '', next);
      setRoute(next);
    },
    [route],
  );
  useEffect(() => {
    const f = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, route === '/' ? homeScroll.current : 0),
    );
    return () => cancelAnimationFrame(frame);
  }, [route]);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)'),
      f = () => setReduced(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  const dispose = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const cancel = () => {
    runId.current++;
    dispose();
    setRunning(false);
    setStatus('Simulazione annullata. Nessun risultato parziale è stato pubblicato.');
  };
  const start = () => {
    const invalid = validateScenario(scenario);
    setErrors(invalid);
    if (invalid.length) {
      setStatus('Lo scenario contiene errori: controlla i campi indicati.');
      return;
    }
    dispose();
    const id = ++runId.current,
      w = new Worker(new URL('./simulation/worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    setRunning(true);
    setFraction(0);
    setRunLabel('Preparazione dello scenario');
    setStatus('Simulazione avviata.');
    timeout.current = setTimeout(() => {
      if (id === runId.current) {
        dispose();
        setRunning(false);
        setErrors([
          'Il limite totale di calcolo (180 secondi) è stato raggiunto. Riduci addetti o repliche; nessun risultato parziale è presentato come completo.',
        ]);
      }
    }, 180000);
    w.onmessage = (e: MessageEvent) => {
      if (e.data.runId !== runId.current) return;
      if (e.data.type === 'progress') {
        setFraction(e.data.fraction);
        setRunLabel(e.data.label);
      } else if (e.data.type === 'error') {
        dispose();
        setRunning(false);
        setErrors([e.data.message]);
        setStatus('Simulazione interrotta: controlla il messaggio.');
      } else if (e.data.type === 'result') {
        setResult(e.data.result);
        setRunning(false);
        dispose();
        setStatus('Simulazione completata. Indicatori disponibili nella sezione risultati.');
        setTimeout(() => document.getElementById('results')?.focus({ preventScroll: false }), 80);
      }
    };
    w.onerror = (e) => {
      if (id === runId.current) {
        dispose();
        setRunning(false);
        setErrors([`Errore del motore: ${e.message}`]);
      }
    };
    w.postMessage({ runId: id, scenario: structuredClone(scenario) });
  };
  const goToSimulation = () => {
    if (route !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById('simulazione')?.scrollIntoView(), 80);
    } else
      document
        .getElementById('simulazione')
        ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  };
  const phase = phaseCopy.filter((p) => progress >= p.from).at(-1)!;
  const showHero = fallback || progress < 0.16,
    heroOpacity = fallback ? 1 : Math.max(0, 1 - progress / 0.14);
  const sceneLight = route !== '/' || fallback || progress > 0.18;
  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, next: string) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(next);
    }
  };
  return (
    <>
      <a className="skip-link" href="#simulazione">
        Vai alla simulazione
      </a>
      <header className={`site-header ${route === '/' ? 'photographic-header' : ''} ${sceneLight ? 'header-light' : ''}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => handleLink(e, '/')}
          aria-label="Verticale, pagina iniziale"
        >
          <svg viewBox="0 0 32 36" aria-hidden="true">
            <path
              d="M2 2v23l5 6V2m5 0v29l5 3V2m5 0v29l5-6V2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <span>
            VERTICALE<small>INTELLIGENT MOVEMENT</small>
          </span>
        </a>
        <nav aria-label="Navigazione principale">
          <a
            className="algorithm-link"
            href="/algoritmi"
            onClick={(e) => handleLink(e, '/algoritmi')}
          >
            Gli algoritmi <Icon name="arrow" size={16} />
          </a>
          <button className="header-cta" onClick={goToSimulation}>
            Simula il tuo edificio <Icon name="arrow" size={17} />
          </button>
        </nav>
      </header>
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      {route === '/algoritmi' ? (
        <Algorithms onBack={() => navigate('/')} />
      ) : (
        <main>
          <section
            ref={journey}
            className={`journey journey-photographic ${fallback ? 'journey-static' : ''}`}
            aria-label="Viaggio architettonico"
            data-progress={progress.toFixed(4)}
            data-phase={phase.title}
            data-photo-stage={progress >= .61 && progress < .835 ? 'opening' : 'journey'}
            data-equation-active={!!journeyEquationState(progress)}
            data-ready={ready || fallback}
            style={{ '--journey-shade': Math.max(0, 1 - progress / .16) * .65 } as CSSProperties}
          >
            <div className="journey-viewport">
              {fallback ? (
                <JourneyFallback />
              ) : (
                <SceneBoundary fallback={<JourneyFallback />} onFailure={() => setLight(true)}>
                  <Suspense fallback={<JourneyFallback />}>
                    <PhotoSequence
                      initialProgress={progress}
                      onProgress={setProgress}
                      onReady={() => setReady(true)}
                      onLoadProgress={(loaded, total) => {
                        setLoading({ loaded, total });
                        if (loaded === 0) setReady(false);
                      }}
                      onFailure={() => setLight(true)}
                    />
                  </Suspense>
                </SceneBoundary>
              )}
              {!fallback && !ready && (
                <div className="scene-loading" role="status">
                  <span /> Prepariamo il percorso · {loading.loaded}/{loading.total}
                </div>
              )}
              {showHero && (
                <div className="hero-copy" style={{ opacity: heroOpacity }}>
                  <p className="eyebrow">
                    <span className="tiny-line" /> RIPENSARE LA MOBILITÀ VERTICALE
                  </p>
                  <h1>
                    Il tempo,
                    <br />
                    <em>progettato</em>
                    <br />
                    meglio.
                  </h1>
                  <p>
                    Quattro ascensori. Migliaia di decisioni.
                    <br />
                    Un sistema che impara ad anticiparle.
                  </p>
                  <button
                    className="hero-journey-link"
                    disabled={!fallback && !ready}
                    onClick={() => {
                      if (fallback) goToSimulation();
                      else window.scrollTo({ top: window.innerHeight * 1.7, behavior: 'smooth' });
                    }}
                  >
                    Entra nell’esperienza{' '}
                    <span>
                      <Icon name="down" size={19} />
                    </span>
                  </button>
                </div>
              )}
              {!fallback && progress > .335 && progress < .455 && (
                <div
                  className="elevator-caption"
                  style={{ opacity: Math.min(1, (progress - .335) * 30, (.455 - progress) * 30) }}
                >
                  <p className="eyebrow">DENTRO IL PALAZZO</p>
                  <h2>
                    Ogni viaggio.
                    <br />
                    <em>Una scelta migliore.</em>
                  </h2>
                </div>
              )}
              {!fallback && <JourneyEquations progress={progress} />}
              {!fallback && (
                <div
                  className="scene-wash"
                  style={{ opacity: Math.max(0, (progress - 0.92) / 0.08) }}
                />
              )}
              <div className="journey-bottom">
                <div className="journey-location">
                  <span>{phase.n}</span>
                  <div>
                    <small>IL PERCORSO</small>
                    <strong>{fallback ? 'Il tuo edificio' : phase.title}</strong>
                  </div>
                </div>
                <div className="journey-scroll">
                  <span>{fallback ? 'ESPLORA IL MODELLO' : 'SCORRI PER ESPLORARE'}</span>
                  <Icon name="down" size={16} />
                </div>
                <button
                  className="quality-toggle"
                  onClick={() => {
                    setLight(!light);
                    setReady(false);
                  }}
                >
                  {light ? 'Esperienza fotografica' : 'Versione essenziale'}
                </button>
              </div>
              {!fallback && (
                <div className="journey-track" aria-hidden="true">
                  <span style={{ height: `${Math.max(3, progress * 100)}%` }} />
                </div>
              )}
            </div>
          </section>
          {fallback && (
            <section className="static-story page-width" aria-label="Percorso senza animazioni">
              <p className="eyebrow">IL PERCORSO, AL TUO RITMO</p>
              <div>
                {[
                  '01 · L’ingresso',
                  '02 · La lobby',
                  '03 · L’ascensore all’interno',
                  photoManifest.complete ? '04 · L’apertura e il modello' : '04 · L’ascensore e il modello',
                ].map((t, i) => (
                  <article key={t}>
                    <img
                      src={photoOriginals[[0, 6, 9, photoOriginals.length - 1][i]].url}
                      alt={[
                        'La torre e il suo ingresso illuminato',
                        'La lobby con colonne chiare e lampade organiche',
                        'L’ascensore inox interno con le ante chiuse',
                        photoManifest.complete ? 'Lo stesso ascensore con le ante aperte' : 'Vista frontale dell’ascensore chiuso',
                      ][i]}
                      width="1440" height="900" loading="lazy" decoding="async"
                    />
                    <span>{t}</span>
                    <p>
                      {
                        [
                          'Dalla facciata vetrata alla lobby in pietra chiara.',
                          'Colonne chiare, luce calda e un ingresso diretto.',
                          photoManifest.complete ? 'L’ascensore inox passa da chiuso ad aperto.' : 'L’avvicinamento al portale inox originale.',
                          'Capacità, costo marginale e previsione: le equazioni autentiche.',
                        ][i]
                      }
                    </p>
                  </article>
                ))}
              </div>
              <Formula
                tex={String.raw`(e^*,i^*,j^*)=\arg\min_{\mathrm{ammissibile}}\Delta J_t`}
                block
              />
            </section>
          )}
          <VisualReferences />
          <section className="configuration-section page-width" id="simulazione">
            <div className="configuration-intro">
              <p className="eyebrow">
                <span className="tiny-line" /> DAL MODELLO AL TUO EDIFICIO
              </p>
              <h2>
                OTTIMIZZIAMO
                <br />
                IL SISTEMA<span>?</span>
              </h2>
              <p className="lead">
                Meno attesa inizia
                <br />
                da una decisione migliore.
              </p>
              <p>
                Indica quanti piani, persone e ascensori ci sono nel tuo edificio. Confrontiamo tre
                modi di gestire la giornata per capire quanto si aspetta.
              </p>
              <div className="intro-features">
                <div>
                  <span>01</span>
                  <p>Inserisci i dati dell’edificio</p>
                </div>
                <div>
                  <span>02</span>
                  <p>Avvia la simulazione</p>
                </div>
                <div>
                  <span>03</span>
                  <p>Confronta i tempi di attesa</p>
                </div>
              </div>
              <div className="model-note">
                <span className="model-note-mark">i</span>
                <p>
                  <strong>Un modello, non una misura.</strong>
                  <br />I risultati sono calcolati sui dati che inserisci. Le abitudini sono
                  simulate: le prestazioni del tuo edificio possono essere diverse.
                </p>
              </div>
              <a
                className="text-link"
                href="/algoritmi"
                onClick={(e) => handleLink(e, '/algoritmi')}
              >
                Capisci come funziona <Icon name="arrow" size={18} />
              </a>
            </div>
            <Configurator
              scenario={scenario}
              onChange={(s) => {
                setScenario(s);
                setErrors([]);
              }}
              onRun={start}
              onCancel={cancel}
              running={running}
              progress={fraction}
              progressLabel={runLabel}
              errors={errors}
            />
          </section>
          {result && (
            <Results
              result={result}
              stale={JSON.stringify(result.scenario) !== JSON.stringify(scenario)}
              onAlgorithms={() => navigate('/algoritmi')}
            />
          )}
          <IntelligenceSection onAlgorithms={() => navigate('/algoritmi')} />
          <section className="closing-section page-width">
            <p className="eyebrow">DALL’IPOTESI ALLA CONOSCENZA</p>
            <h2>
              Progettare il movimento.
              <br />
              <em>Restituire tempo.</em>
            </h2>
            <a
              href="/algoritmi"
              onClick={(e) => handleLink(e, '/algoritmi')}
              className="outline-button"
            >
              Esplora gli algoritmi <Icon name="arrow" />
            </a>
          </section>
        </main>
      )}
      <footer className="site-footer page-width">
        <span>
          VERTICALE <small>Ricerca operativa / Mobilità verticale</small>
        </span>
        <span>Modello sintetico. Nessun controllo di impianti reali.</span>
        <a href="/docs/modello-ascensori.pdf" target="_blank" rel="noreferrer">
          La fonte tecnica ↗
        </a>
      </footer>
    </>
  );
}
