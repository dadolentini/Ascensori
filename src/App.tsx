import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_SCENARIO, validateScenario } from './simulation/scenario';
import type { Scenario } from './simulation/types';
import type { ExperimentResult } from './simulation/results';
import Configurator from './configurator/Configurator';
import Results from './configurator/Results';
import Algorithms from './algorithms/Algorithms';
import Formula from './components/Formula';
import Icon from './components/Icon';
import JourneyFallback from './journey/JourneyFallback';
import { journeyPose } from './journey/pose';
const SceneCanvas = lazy(() => import('./components/SceneCanvas'));
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
  { from: 0.15, title: 'La soglia', n: '02' },
  { from: 0.23, title: 'L’esplorazione', n: '03' },
  { from: 0.43, title: 'Una nuova prospettiva', n: '04' },
  { from: 0.54, title: 'Quattro ascensori', n: '05' },
  { from: 0.72, title: 'La decisione', n: '06' },
  { from: 0.83, title: 'Il modello', n: '07' },
];
export default function App() {
  const [route, setRoute] = useState(window.location.pathname),
    [progress, setProgress] = useState(0),
    [light, setLight] = useState(false),
    [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [scenario, setScenario] = useState<Scenario>(() => structuredClone(DEFAULT_SCENARIO));
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
  const fallback = reduced || light || typeof WebGL2RenderingContext === 'undefined';
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
  useEffect(() => {
    if (route !== '/' || fallback) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = journey.current;
        if (el) {
          const span = el.offsetHeight - window.innerHeight;
          setProgress(
            Math.min(1, Math.max(0, (window.scrollY - el.offsetTop) / Math.max(1, span))),
          );
        }
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [route, fallback]);
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
  const pose = journeyPose(progress, window.innerWidth / window.innerHeight);
  const showHero = fallback || progress < 0.16,
    heroOpacity = fallback ? 1 : Math.max(0, 1 - progress / 0.14);
  const sceneLight = route !== '/' || fallback || progress > 0.91;
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
      <header className={`site-header ${sceneLight ? 'header-light' : ''}`}>
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
            className={`journey ${fallback ? 'journey-static' : ''}`}
            aria-label="Viaggio architettonico"
            data-progress={progress.toFixed(4)}
            data-phase={pose.phase}
          >
            <div className="journey-viewport">
              {fallback ? (
                <JourneyFallback />
              ) : (
                <SceneBoundary fallback={<JourneyFallback />} onFailure={() => setLight(true)}>
                  <Suspense fallback={null}>
                    <SceneCanvas
                      progress={progress}
                      onReady={() => setReady(true)}
                      onFailure={() => setLight(true)}
                    />
                  </Suspense>
                </SceneBoundary>
              )}
              {!fallback && !ready && (
                <div className="scene-loading">
                  <span /> Prepariamo il tuo ingresso
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
              {!fallback && progress > 0.23 && progress < 0.43 && (
                <div
                  className="scene-caption"
                  style={{ opacity: Math.min(1, (progress - 0.23) * 20, (0.43 - progress) * 20) }}
                >
                  <p className="eyebrow">OGNI GIORNO, OGNI PIANO</p>
                  <h2>
                    Il movimento
                    <br />è parte del progetto.
                  </h2>
                </div>
              )}
              {!fallback && progress > 0.54 && progress < 0.72 && (
                <div
                  className="elevator-caption"
                  style={{ opacity: Math.min(1, (progress - 0.54) * 20, (0.72 - progress) * 20) }}
                >
                  <p className="eyebrow">04 CABINE / 01 SISTEMA</p>
                  <h2>
                    Non più vicine.
                    <br />
                    <em>Più intelligenti.</em>
                  </h2>
                </div>
              )}
              {!fallback && progress >= 0.72 && progress < 0.99 && (
                <div
                  className="math-overlay"
                  style={{ opacity: Math.min(1, (progress - 0.72) * 18, (0.99 - progress) * 18) }}
                >
                  <p className="eyebrow">LA DECISIONE PRENDE FORMA</p>
                  <h2>
                    La bellezza
                    <br />
                    <em>di un buon modello.</em>
                  </h2>
                  <div className="math-step">
                    <span>01 / RISPETTARE I LIMITI</span>
                    <Formula tex={String.raw`L_e+w_r\le Q_e\quad n_e+1\le C_e`} block />
                  </div>
                  {progress > 0.78 && (
                    <div className="math-step">
                      <span>02 / SCEGLIERE L’INSERIMENTO</span>
                      <Formula
                        tex={String.raw`\underset{e,i<j}{\arg\min}\;\big[J_t(S_e\oplus_i P_r\oplus_j D_r)-J_t(S_e)\big]`}
                        block
                      />
                    </div>
                  )}
                  {progress > 0.84 && (
                    <div className="math-step">
                      <span>03 / ANTICIPARE LA DOMANDA</span>
                      <Formula
                        tex={String.raw`\widehat D_o=N_o\widehat p_o\left[\Phi\!\left(\frac{t+L+H-\widehat\mu_o}{\widehat\sigma_o}\right)-\Phi\!\left(\frac{t+L-\widehat\mu_o}{\widehat\sigma_o}\right)\right]`}
                        block
                      />
                    </div>
                  )}
                  <p className="math-source">
                    Equazioni (6), (9), (16) · inserimenti ammissibili · PDF originale
                  </p>
                </div>
              )}
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
                  {light ? 'Esperienza 3D' : 'Versione essenziale'}
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
                  '02 · Il corridoio e la svolta a destra',
                  '03 · Quattro ascensori',
                  '04 · L’apertura e il modello',
                ].map((t, i) => (
                  <article key={t}>
                    <span>{t}</span>
                    <p>
                      {
                        [
                          'Dalla facciata vetrata alla lobby in pietra chiara.',
                          'Una geometria continua porta alla parete delle cabine.',
                          'Un gruppo coordinato, non quattro decisioni isolate.',
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
                Configura i flussi del tuo edificio. Il modello confronta tre strategie sulle stesse
                richieste, rispettando portata, occupazione e tempi fisici delle cabine.
              </p>
              <div className="intro-features">
                <div>
                  <span>01</span>
                  <p>Definisci edificio e abitudini</p>
                </div>
                <div>
                  <span>02</span>
                  <p>Simula una giornata riproducibile</p>
                </div>
                <div>
                  <span>03</span>
                  <p>Confronta risultati, non promesse</p>
                </div>
              </div>
              <div className="model-note">
                <span className="model-note-mark">i</span>
                <p>
                  <strong>Un modello, non una misura.</strong>
                  <br />
                  Traffico sintetico e algoritmi documentati. Ogni risultato vale per lo scenario
                  scelto e per la baseline dello studio.
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
            />
          )}
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
