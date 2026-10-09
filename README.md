# VERTICALE — mobilità verticale intelligente

Percorso fotografico controllato dallo scroll e simulatore di un gruppo di ascensori. Interfaccia italiana; simulazione della flotta indipendente dalla rappresentazione visiva. Il branch `photo-sequence` usa Canvas 2D, precaricamento completo e 10 frame ottimizzati in tre capitoli, raccordati dalle equazioni autentiche. La spiegazione fotografica e la pagina degli algoritmi accompagnano l’utente dalla decisione concreta al modello. Dettagli della revisione in [docs/cinematic-revision.md](docs/cinematic-revision.md).

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

I test cloud usano il rasterizzatore CPU del Canvas 2D e i benchmark non registrano screencast. Per riprodurre il vecchio backend 3D emulato: `PLAYWRIGHT_SWIFTSHADER=1 PLAYWRIGHT_PREVIEW=1 npm run test:e2e`. Quel backend conserva un limite prestazionale desktop documentato in [docs/verification.md](docs/verification.md). Queste opzioni riguardano il banco di prova; il sito usa il rendering scelto dal browser dell’utente.

## Esperienza

- Tre capitoli fotografici: palazzo e ingresso, attraversamento della hall, ascensore frontale con apertura progressiva. Pannelli matematici chiari raccordano i cambi di scena. I 12 originali restano intatti e disponibili come riferimenti; la selezione attiva evita viste architettonicamente incoerenti.
- GSAP anima `seq.frame`; ScrollTrigger gestisce scrub e pin. Tutte le immagini sono precaricate e decodificate in un array prima dell’avvio: nessuna evizione o nuovo download durante l’avanzamento e il ritorno. Rendering su `requestAnimationFrame` solo quando necessario e buffer dimensionati secondo le risorse del dispositivo.
- Derivati WebP 896 × 1120, qualità 88, circa 1,43 MB complessivi; font e PDF locali. Nessuna nuova generazione in questa revisione, nessuna ricostruzione Three.js o richiesta a servizi esterni durante l’uso del sito. La sequenza usa anche intermedi generati nella revisione precedente: non è una ripresa continua con camera calibrata.
- DPR fino a 2 desktop/1,5 mobile, resize proporzionale, versione essenziale e preferenza di movimento ridotto con gli stessi frame. Il percorso funziona anche senza WebGL.
- Configuratore semplificato: quattro input per ascensori, piani **escluso terra**, addetti complessivi e capacità in persone. Controlli +/− e media automatica per piano; orari e pause standard gestiti internamente.
- Calcolo in Web Worker, annullamento, confronto di tre politiche, contatori di censura, CDF completa, apprendimento fuori campione, replay degli eventi e download CSV/JSON.
- Pagina `/algoritmi` con tutte le 19 equazioni, unità, spiegazioni, esplorazioni di moto/capacità e collegamenti al PDF originale.
- Sotto i risultati, la fotografia originale della hall fa da sfondo a tre spiegazioni: assegnazione, previsione e capacità. Nella pagina algoritmi l’esempio interattivo al decimo piano richiama il vero instradamento per confrontare quattro cabine; è uno stato illustrativo dichiarato, non un risultato sul campo.

## Organizzazione

| Cartella | Responsabilità |
| --- | --- |
| `src/journey` | Canvas fotografico, GSAP/ScrollTrigger, timeline ponderata, manifest, cache, riferimenti originali e fallback statico |
| `src/configurator` | Form, risultati, grafico, replay ed esportazioni |
| `src/simulation` | Domanda seeded, apprendimento, NNLS, fisica, eventi, instradamento e statistiche |
| `src/algorithms` | Equazioni autentiche e spiegazione del modello |
| `tests` | Fixture numeriche, invarianti e accettazione browser |
| `public/docs` | PDF tecnico autorevole fornito dall'utente |

Il renderer gestisce il progresso normalizzato dello scroll senza leggere o modificare lo stato del motore. Il Worker riceve uno scenario serializzabile e restituisce risultati, scenario, seed e versione del modello.

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
