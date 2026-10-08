# VERTICALE — mobilità verticale intelligente

Esperienza architettonica 3D e simulatore di un gruppo di ascensori, realizzati a partire dai materiali forniti. Interfaccia italiana; percorso iniziale a quattro cabine, simulazione configurabile indipendentemente dalla scena.

## Avvio

Richiede Node.js 22.12+ (verificato con Node 24.19.0 e npm 11.9.0).

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

```bash
npm test
npm run typecheck
npm run build
npm run preview -- --port 4173
```

La build è una SPA statica nella cartella `dist/`. Un eventuale hosting deve riscrivere le richieste a `/algoritmi` verso `index.html`. Il deployment pubblico non è stato effettuato.

Per i test browser nell'ambiente cloud, Chromium è disponibile in `/usr/bin/chromium`:

```bash
PLAYWRIGHT_PREVIEW=1 npm run test:e2e
```

Eseguire prima `npm run build`. Playwright avvia la preview; screenshot, esportazioni JSON, trace e rapporto HTML vengono salvati in `test-results/`, esclusa da Git. Per altri ambienti, impostare il percorso del browser in `playwright.config.ts` oppure utilizzare il Chromium gestito da Playwright.

## Esperienza

- Scroll nativo continuo e reversibile: torre al tramonto, ingresso, corridoio, svolta destra, quattro ascensori, apertura della seconda cabina, equazioni e configuratore.
- Rendering originale con React Three Fiber, geometrie condivise/istanziate, illuminazione e materiali generati localmente. Font e PDF serviti dal progetto; nessuna richiesta a servizi 3D esterni.
- DPR limitato e qualità ridotta su mobile; caricamento differito del Canvas e arresto del rendering al termine del percorso. Versione essenziale, preferenza di movimento ridotto e fallback alla perdita/assenza di WebGL mantengono contenuti e simulatore utilizzabili.
- Configuratore semplificato: quattro input per ascensori, piani **escluso terra**, addetti complessivi e capacità in persone. Controlli +/− e media automatica per piano; orari e pause standard gestiti internamente.
- Calcolo in Web Worker, annullamento, confronto di tre politiche, contatori di censura, CDF completa, apprendimento fuori campione, replay degli eventi e download CSV/JSON.
- Pagina `/algoritmi` con tutte le 19 equazioni, unità, spiegazioni, esplorazioni di moto/capacità e collegamenti al PDF originale.

## Organizzazione

| Cartella | Responsabilità |
| --- | --- |
| `src/journey` | Ambiente 3D, camera deterministica, animazioni e fallback SVG |
| `src/configurator` | Form, risultati, grafico, replay ed esportazioni |
| `src/simulation` | Domanda seeded, apprendimento, NNLS, fisica, eventi, instradamento e statistiche |
| `src/algorithms` | Equazioni autentiche e spiegazione del modello |
| `tests` | Fixture numeriche, invarianti e accettazione browser |
| `public/docs` | PDF tecnico autorevole fornito dall'utente |

La scena riceve soltanto il progresso normalizzato dello scroll. Non legge o modifica lo stato del motore. Il Worker riceve uno scenario serializzabile e restituisce risultati, scenario, seed e versione del modello.

## Metodo matematico

Il configuratore converte i piani superiori in `totalFloors = piani + 1`, preservando il terra come piano 0. Gli addetti vengono distribuiti equamente, assegnando il resto ai primi piani. Le fasce pranzo 12/13/14 rispettano le quote originali 35%/43%/22% con arrotondamento al resto maggiore sul totale e ripartizione deterministica fra i piani; ciascun addetto appartiene a una sola componente. Il parametro medio dei pesi è fissato a 80 kg come richiesto per l'interfaccia semplificata, invece dei 76 kg del preset originale; dispersione e troncamento rimangono invariati, quindi i pesi simulati sono variabili. La portata standard resta 1.000 kg, distinta dal limite di persone: non viene ricavata moltiplicando la capacità per 80. `DEFAULT_SCENARIO`, equazioni e motore rimangono invariati.

Fonte: `Ottimizzazione_4_Ascensori_15_Piani_V2_Uffici_Adattivi.pdf`, 15 pagine, conservato come `public/docs/modello-ascensori.pdf`. Il secondo PDF allegato contiene lo stesso testo. Il codice Python/JSON fornito è stato analizzato e riprodotto prima della trasposizione; non viene eseguito nel browser.

Le tre politiche usano identiche richieste OD e masse per replica:

1. **Reattiva:** baseline del codice di studio; minimizza ETA nuovo + 0,28 viaggio nuovo + 0,32 ritardo aggiunto ai prelievi già assegnati, senza parcheggio preventivo.
2. **Per fasce:** costo marginale delle equazioni (9)–(10), penale oltre 120 s e parcheggio delle cabine inattive relativo agli orari configurati.
3. **Adattiva:** stesso instradamento; apprendimento e parcheggio secondo (14)–(19), senza accesso agli offset latenti della domanda.

La ricerca enumera tutti gli inserimenti ammissibili pickup/dropoff. Non impone il limite nascosto di 28 task del riferimento Python. Valutazione ed esecuzione condividono il profilo fisico, le fermate e i vincoli. Sono corretti residuo del viaggio, sbarco prioritario, porta condivisa, massa prudenziale, mantenimento delle chiamate respinte, timer di inattività e riserva delle sole cabine realmente disponibili. Le masse sono campionate da una normale troncata, senza clipping agli estremi.

Queste correzioni sono state approvate nella Fase A e cambiano i risultati. I numeri pubblicati nel PDF non sono risultati precaricati né valori obiettivo. I generatori JavaScript e Python non hanno RNG identici: un seed uguale non implica la stessa traccia tra linguaggi.

L'apprendimento usa 12 giorni di training e 4 di validation disgiunti dai seed dell'esperimento. Il controllo NNLS (3)–(4) usa 6/2 giorni, intercetta β₀ e gaussiane valutate al centro dei bin: tassi e RMSE in passeggeri/minuto. È una diagnostica distinta dal controllo delle cabine. L'equazione MPC (11) resta un'estensione di ricerca, dichiarata come non implementata.

Più pause per gruppo sono un'estensione esplicita: fit separato per componente, poi somma al piano. La MAE è calcolata per componente su blocchi di cinque minuti nelle 24 ore, per consentire pause personalizzate; il denominatore differisce dalla sola fascia pranzo del PDF.

Attesa calcolata sugli imbarcati; viaggio/totale sui completati. Coda, utenti a bordo e richieste fuori orizzonte sono espliciti. I KPI mostrano medie giornaliere; il P95 è la media dei P95 giornalieri, mentre la CDF aggrega i campioni delle repliche. Con otto repliche l'IC esplorativo al 95% usa t di Student sulle differenze appaiate delle attese medie; con una replica non viene inventato un intervallo.

## Limiti

Traffico sintetico OD, non un tracciamento individuale delle persone. Nessun turno oltre mezzanotte, modello di jerk/livellamento, guasti, controllo PLC, certificazione impiantistica o misura dell'energia. La strategia greedy non garantisce un ottimo globale o un massimo tempo d'attesa. Occorrono dati reali e taratura per conclusioni sul campo.

Guardrail browser: 8 cabine, 40 piani, 2.000 addetti, 14.000 richieste per replica, 500.000 eventi e 30 secondi per politica/replica, 180 secondi complessivi. Un superamento produce un errore esplicito: non vengono ridotti domanda, politiche o precisione e non vengono pubblicati risultati parziali. La baseline può raggiungere il limite su scenari molto congestionati, anche sotto i limiti dimensionali.

Il rendering è stato verificato su Chromium con GPU software; la fluidità su GPU/dispositivi diversi richiede una verifica specifica. La versione essenziale evita il rendering continuativo.

Proposta approvata e piano di lavoro sono in `docs/superpowers/`. La relazione finale di verifica è in `docs/verification.md`.
