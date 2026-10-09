import { useState } from 'react';
import Formula from '../components/Formula';
import Icon from '../components/Icon';
import { equations } from './equations';
import { numberFormat } from '../configurator/helpers';
import DispatchComparison from './DispatchComparison';
export default function Algorithms({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState(1000),
    [cars, setCars] = useState(4),
    [distance, setDistance] = useState(5);
  const d = distance * 3.3,
    v = 2.5,
    a = 1,
    travel = d <= (v * v) / a ? 2 * Math.sqrt(d / a) : d / v + v / a;
  const safe = Math.min(13, Math.floor((0.96 * q) / 87));
  return (
    <main className="algorithms-page">
      <section className="algorithms-hero page-width" id="introduzione">
        <button className="text-link" onClick={onBack}>
          ← Torna all’esperienza
        </button>
        <p className="eyebrow">IL MODELLO / LA TRASPARENZA</p>
        <h1>
          Dietro ogni viaggio,
          <br />
          <em>una decisione.</em>
        </h1>
        <p className="lead">
          Non una promessa. Un modello verificabile: domanda, vincoli fisici e tre politiche
          confrontate sugli stessi passeggeri sintetici.
        </p>
        <a
          className="outline-button"
          href="/docs/modello-ascensori.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Leggi il PDF originale <Icon name="arrow" />
        </a>
        <div className="document-meta">
          <span>19 EQUAZIONI</span>
          <span>15 PAGINE</span>
          <span>CASO 0–15 · 4 CABINE</span>
        </div>
      </section>
      <div className="algorithms-layout page-width">
        <aside className="algorithms-index">
          <p className="eyebrow">IN QUESTA PAGINA</p>
          {[
            ['esempio', '01 Come funziona'],
            ['decisione', '02 La decisione'],
            ['previsione', '03 Anticipare il traffico'],
            ['capacita', '04 Cabine e capacità'],
            ['equazioni', '05 Il modello matematico'],
            ['metodologia', '06 Risultati e limiti'],
          ].map(([id, t]) => (
            <a key={id} href={`#${id}`}>
              {t}
            </a>
          ))}
        </aside>
        <div>
          <section id="esempio" className="editorial-section">
            <p className="eyebrow">01 / COME FUNZIONA CONCRETAMENTE</p>
            <h2>Al decimo piano.<br /><em>Quattro possibilità.</em></h2>
            <p>Un dipendente al decimo piano chiama l’ascensore per scendere a terra. Le quattro cabine hanno posizioni,
              fermate e passeggeri diversi: il motore confronta gli inserimenti fattibili e sceglie quello con il minor costo aggiunto.</p>
            <p>Prova a liberare la cabina più vicina: i numeri e la scelta vengono ricalcolati dal codice di instradamento del simulatore.</p>
            <DispatchComparison />
            <p className="small-note">La destinazione è dichiarata alla chiamata, come previsto dal modello DCS.</p>
          </section>
          <section id="decisione" className="editorial-section">
            <p className="eyebrow">02 / COME VIENE PRESA LA DECISIONE</p>
            <h2>
              Il viaggio più breve
              <br />
              non è sempre <em>la scelta migliore.</em>
            </h2>
            <p>
              Assegnare la cabina più vicina può ritardare chi è già in attesa o a bordo. Il modello
              valuta tutti gli inserimenti ammissibili del nuovo prelievo e dello sbarco,
              considerando il costo aggiunto all’itinerario.
            </p>
            <p>
              Una richiesta <i>r</i> compare in <i>aᵣ</i>, entra in <i>pᵣ</i>, esce in <i>dᵣ</i>.
              Origine e destinazione sono note alla chiamata: tutte le politiche presuppongono un
              sistema DCS, con destinazione dichiarata.
            </p>
            <div className="decision-factors">
              <div><strong>Posizione e moto</strong><p>Una tratta già iniziata mantiene la destinazione. Il tempo stimato include il moto residuo.</p></div>
              <div><strong>Fermate programmate</strong><p>Prelievo e sbarco vengono provati in tutti gli inserimenti ammissibili.</p></div>
              <div><strong>Passeggeri e ritardi</strong><p>Il costo aggiunto considera la nuova chiamata e l’impatto sulle richieste esistenti.</p></div>
            </div>
            <Formula tex={equations.find((equation) => equation.n === 9)!.tex} block label="Equazione 9: scelta dell’inserimento con il minor costo marginale" />
            <div className="definition-grid">
              <div>
                <span>ATTESA</span>
                <Formula tex="W_r=p_r-a_r" block />
              </div>
              <div>
                <span>VIAGGIO</span>
                <Formula tex="R_r=d_r-p_r" block />
              </div>
              <div>
                <span>TOTALE</span>
                <Formula tex="T_r=W_r+R_r" block />
              </div>
            </div>
            <p className="small-note">
              I trasferimenti sono eventi aggregati all’arrivo: prima gli sbarchi, poi gli imbarchi.
              Segue un’unica sosta porta + trasferimenti. Il modello non distingue tempi individuali
              di apertura e chiusura.
            </p>
          </section>
          <section id="previsione" className="editorial-section">
            <p className="eyebrow">03 / COME ANTICIPA IL TRAFFICO</p>
            <h2>Essere pronti.<br /><em>Prima della chiamata.</em></h2>
            <p>Ingresso, pause e uscita dagli uffici danno una struttura al traffico. La strategia adattiva apprende
              partecipazione, orario medio e dispersione dai conteggi delle giornate di training, separati da quelli della verifica.</p>
            <p>La domanda attesa in una finestra futura orienta il posizionamento delle sole cabine inattive.
              Nel preset standard la finestra va da tre a quindici minuti in avanti. Le cabine impegnate continuano a servire le richieste.</p>
            <Formula tex={equations.find((equation) => equation.n === 16)!.tex} block label="Equazione 16: domanda attesa nella finestra futura" />
            <h2>
              Stessa domanda.
              <br />
              <em>Tre modi di rispondere.</em>
            </h2>
            <div className="policy-explanations">
              <article>
                <span>01</span>
                <h3>Reattiva</h3>
                <p>
                  La baseline dello studio cerca l’inserimento con ETA nuovo + 0,28 viaggio nuovo +
                  0,32 ritardi aggiunti agli altri prelievi. Nessun parcheggio anticipato.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>Per fasce</h3>
                <p>
                  Minimizza il costo marginale delle equazioni 9–10, penalizza le attese lunghe e
                  riposiziona le cabine inattive secondo gli orari configurati.
                </p>
              </article>
              <article>
                <span>03</span>
                <h3>Adattiva</h3>
                <p>
                  Stesso instradamento della seconda; cambia il parcheggio, usando le abitudini
                  apprese e la domanda prevista per ufficio nelle equazioni 14–19.
                </p>
              </article>
            </div>
            <p>
              Le politiche ricevono lo stesso campione di richieste e masse. L’adattiva non conosce
              gli offset nascosti del generatore. La baseline è un benchmark di ricerca, non il
              controllo di un costruttore commerciale.
            </p>
          </section>
          <section id="capacita" className="editorial-section">
            <p className="eyebrow">04 / COME GESTISCE LE CABINE PIENE</p>
            <h2>Un posto disponibile.<br /><em>Al momento giusto.</em></h2>
            <p>La pianificazione verifica posti e carico previsto lungo tutte le fermate candidate. Una cabina oggi piena
              può essere utilizzabile dopo uno sbarco. All’imbarco si controlla il peso effettivo: se l’ingresso viene respinto,
              la richiesta resta in attesa e viene riassegnata per ETA fra le cabine ammissibili.</p>
            <Formula tex={equations.find((equation) => equation.n === 6)!.tex} block label="Equazione 6: vincoli distinti di carico e persone" />
            <p>Per le chiamate future il modello riserva prudenzialmente 87 kg per passeggero e usa il 96% della portata,
              come nell’equazione (7). Per chi è già a bordo usa la massa reale. Le chiamate già assegnate non vengono continuamente riassegnate.</p>
            <h2>
              Dalla formula
              <br />
              <em>all’intuizione.</em>
            </h2>
            <div className="model-explorer">
              <div>
                <label htmlFor="distance">Distanza: {distance} piani</label>
                <input
                  id="distance"
                  type="range"
                  min="1"
                  max="15"
                  value={distance}
                  onChange={(e) => setDistance(+e.target.value)}
                />
                <strong>
                  {numberFormat(travel, 2)} <small>secondi</small>
                </strong>
                <p>
                  Tempo di moto dalla (5), con h=3,3 m, v=2,5 m/s, a=1 m/s². Porte e fermate
                  escluse.
                </p>
              </div>
              <div>
                <label htmlFor="screening-load">Portata: {q} kg</label>
                <input
                  id="screening-load"
                  type="range"
                  min="500"
                  max="1500"
                  step="50"
                  value={q}
                  onChange={(e) => setQ(+e.target.value)}
                />
                <label htmlFor="screening-cars">Cabine: {cars}</label>
                <input
                  id="screening-cars"
                  type="range"
                  min="1"
                  max="8"
                  value={cars}
                  onChange={(e) => setCars(+e.target.value)}
                />
                <strong>
                  {numberFormat((300 * cars * safe) / 145)} <small>persone / 5 min</small>
                </strong>
                <p>
                  Screening (8), (12): {safe} posti prudenziali, RTT ipotizzato di 145 s. Non è una
                  misura né un risultato della simulazione dinamica.
                </p>
              </div>
            </div>
          </section>
          <section id="equazioni" className="editorial-section">
            <p className="eyebrow">05 / IL MODELLO MATEMATICO</p>
            <h2>
              Le equazioni,
              <br />
              <em>senza scorciatoie.</em>
            </h2>
            <p>
              Numerazione e pagine del PDF originale. Tempi interni in secondi; formule di flusso in
              ore quando indicato. Le estensioni a più pause sono dichiarate, non confuse con il
              caso illustrativo.
            </p>
            <div className="equation-list">
              {equations.map((eq) => (
                <article key={eq.n} id={`equazione-${eq.n}`}>
                  <div className="equation-heading">
                    <span>({eq.n.toString().padStart(2, '0')})</span>
                    <h3>{eq.title}</h3>
                    <a
                      href={`/docs/modello-ascensori.pdf#page=${eq.page}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF · p. {eq.page} ↗
                    </a>
                  </div>
                  {eq.kind && (
                    <span className="tag">
                      {eq.kind} ·{' '}
                      {eq.kind === 'Ricerca' ? 'non implementata' : 'non simulazione dinamica'}
                    </span>
                  )}
                  <Formula tex={eq.tex} block label={`Equazione ${eq.n}: ${eq.title}`} />
                  <p>{eq.explanation}</p>
                </article>
              ))}
            </div>
          </section>
          <section id="metodologia" className="editorial-section">
            <p className="eyebrow">06 / RISULTATI E LIMITI</p>
            <h2>
              Misurabile.
              <br />
              <em>Non infallibile.</em>
            </h2>
            <p>Il configuratore misura attesa media, P95 e richieste completate su una domanda sintetica identica per le tre strategie.
              Un miglioramento compare solo se è calcolato nella simulazione: non è una misura delle prestazioni dell’edificio reale.</p>
            <h3>Esperimenti riproducibili</h3>
            <p>
              Il seed, lo scenario e la versione del motore sono esportati con i risultati. Una
              replica è utile per esplorare; otto repliche consentono un confronto statistico
              appaiato. L’intervallo al 95% è t di Student sulle differenze delle medie giornaliere,
              non una garanzia sul palazzo.
            </p>
            <p>
              Apprendimento: 12 giornate di training e 4 di validation separate. Diagnostica NNLS: 6
              training e 2 holdout. R² e MAE su una famiglia generativa sintetica dimostrano
              coerenza del modello, non validazione sul campo.
            </p>
            <h3>Code e denominatori visibili</h3>
            <p>
              Attesa sugli utenti imbarcati; viaggio e totale sui completati. A fine orizzonte sono
              mostrati separatamente gli utenti in attesa e a bordo. Non servire una richiesta non
              equivale a un’attesa pari a zero. La media dei p95 giornalieri è distinta dal p95
              della popolazione aggregata.
            </p>
            <h3>Correzioni rispetto al codice allegato</h3>
            <p>
              ETA sul residuo reale del segmento, porta condivisa per fermata, sbarco prioritario,
              riserva basata sulle cabine effettivamente inattive, timer dall’inizio dell’inattività
              e riassegnazione per ETA dopo imbarco respinto. Pesi realmente troncati, orari
              applicati e nessun ammassamento artificiale agli estremi dell’orizzonte. Il motore
              corretto ricalcola i valori: i numeri pubblicati nel PDF non sono risultati
              precaricati.
            </p>
            <h3>Estensioni e confini</h3>
            <p>
              Più pause per gruppo significano componenti e fit separati, sommati al piano. Gli
              orari oltre mezzanotte non sono supportati. La previsione per ufficio presume conteggi
              aggregati autorizzati; senza attribuzione si deve aggregare al piano. Il modello usa
              domanda OD sintetica, non segue persone individuali.
            </p>
            <p>
              Greedy non significa ottimo globale; la penale anti-abbandono non garantisce un tempo
              massimo. Mancano taratura sul campo, jerk, livellamento, mobilità ridotta, guasti e
              sicurezza impiantistica. Nessun collegamento a PLC o controllo reale; nessuna stima
              arbitraria del risparmio energetico.
            </p>
            <div className="method-callout">
              Una simulazione serve a confrontare ipotesi. Un impianto reale richiede dati, taratura
              e verifiche tecniche indipendenti.
            </div>
            <button className="primary-button" onClick={onBack}>
              Esplora il tuo scenario <Icon name="arrow" />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
