# Verifica finale

## Sequenza ampliata e correzioni — 8 ottobre 2026

Integrati 18 frame attivi: 10 originali, 2 ritagli selezionati dai nuovi archivi, 4 intermedi generati e 2 correzioni mirate. Tutti i 12 originali sono preservati byte per byte. Selezione e limiti in [sequence-integration.md](sequence-integration.md), inventario completo in [visual-audit/sequence-selection.json](visual-audit/sequence-selection.json).

- `npm test`: **75/75 superati in 9 file**, dopo l’ultima modifica al renderer. Inclusi hash/dimensioni degli asset, originali invariati, stop ordinati, aperture crescenti, timeline ponderata/inversa, proporzioni e continuità dell’inquadratura iniziale.
- `npm run build`: **superato**, inclusa verifica TypeScript, dopo l’ultima modifica al renderer.
- `PLAYWRIGHT_PREVIEW=1 npx playwright test --grep-invert 'within (320|375)px' --output test-results/expanded-sequence`: **19/19 superati** prima della correzione mirata finale. Comprende tutti i sei flussi del simulatore con Worker reale, esportazioni, annullamento, algoritmi, riferimenti, fallback, responsive e percorso fotografico.
- La revisione indipendente ha individuato un blocco della transizione iniziale contain→cover quando il frame vicino non è disponibile. Una nuova prova browser trattiene davvero il download del secondo frame: osservata fallire perché la larghezza dipinta restava ferma, poi passare dopo l’inclusione del progresso dell’inquadratura nella firma di ridisegno.
- Dopo tale correzione, `PLAYWRIGHT_PREVIEW=1 npx playwright test tests/e2e/photo-sequence.spec.ts tests/e2e/photo-performance.spec.ts --output test-results/expanded-sequence-confirm`: **6/6 superati**. Sono i quattro controlli del percorso (incluso il nuovo test di caricamento lento) e i due benchmark. Verificati pin, avanti/indietro, stati delle ante, navigazione fra pagine, mobile, resize HiDPI, budget cache e assenza di ridisegni a riposo. Non è stata ripetuta la suite del simulatore dopo questa sola correzione visiva.
- Ispezionati i candidati selezionati e gli screenshot della build per apertura e palazzo iniziale mobile. I nuovi WebP sono lossless: confronto diretto dei buffer RGB con i PNG di partenza, tutti uguali.
- `git diff --exit-code -- src/simulation src/configurator src/algorithms public/docs package.json package-lock.json`: nessuna modifica. Anche i test dei flussi Worker rimangono invariati.

Benchmark finale Chromium cloud, GPU software, DPR 1, 90 campioni rAF di scroll avanti/indietro con decodifica reale:

| Viewport | P95 intervallo rAF | Massimo | Cache decodificata |
| --- | ---: | ---: | ---: |
| 1440 × 900 | 116,6 ms | 150 ms | 94.382.640 byte |
| 375 × 812 | 50 ms | 50 ms | 31.460.880 byte |

Nessun long task osservato; nessun ridisegno durante 30 paint dopo stabilizzazione. JSON e screenshot in `test-results/expanded-sequence-confirm/`, esclusi da Git. Questi test registrano prestazioni, **non impongono né dimostrano 60 FPS**. Non sono una misura su Safari o telefoni fisici; le variazioni della macchina cloud e della rasterizzazione software limitano i confronti fra esecuzioni.

I due test di overflow nella pagina algoritmi a 320/375 px restano esclusi esplicitamente dalla selezione estesa e attivi nella suite: sono fallimenti preesistenti fuori dallo scope. Restano anche blending fra viste distanziate, differenze di luce/punto di vista negli originali e piccoli dettagli rigenerati. Non viene dichiarata continuità geometrica assoluta.

Branch `photo-sequence`, nessun deployment pubblico. Le sezioni seguenti descrivono versioni precedenti.

## Tentativo precedente di completamento degli intermedi — 8 ottobre 2026

**Richiesta non completata:** due immagini candidate generate realmente con `image_gen` e scartate per alterazioni degli elementi fissi/prospettiva incoerente. Nessun nuovo frame integrato; sequenza ancora composta dai 12 originali. Analisi dei passaggi e file delle prove in [intermediate-frame-audit.md](intermediate-frame-audit.md).

- Controllo diretto dei dodici originali: SHA-256 e dimensioni 1122 × 1402 verificati, tutti invariati.
- `PLAYWRIGHT_PREVIEW=1 npx playwright test tests/e2e/photo-sequence.spec.ts --output test-results/intermediate-feasibility`: **3/3 superati**, con la build corrente del finale fotografico. Pin, scroll inverso, chiuso/aperto, cambio pagina, mobile e resize HiDPI restano funzionanti.
- Questi test verificano l’integrità del percorso esistente; non attestano continuità cinematografica dei nuovi candidati, che non vengono caricati dall’applicazione.
- Nessuna modifica a `src`, `public`, test, dipendenze, simulatore, configuratore o algoritmi. Sono aggiunte soltanto analisi e prove di scarto in `docs`; non è stata ripetuta la build perché il prodotto rimane invariato.
- Restano i salti visivi fra viste distanziate e le dissolvenze della versione precedente. Non viene dichiarato un numero minimo di intermedi utilizzabili né una fluidità raggiunta. Nessun deployment pubblico.

## Finale fotografico integrato — 8 ottobre 2026

Ricevuto ed estratto `Atrio moderno con ascensore aperto.png.zip`: un PNG RGB 1122 × 1402, aggiunto senza alterarne i byte come dodicesimo e ultimo frame. Il confronto visivo con la vista chiusa è documentato in [photo-sequence.md](photo-sequence.md). Il blocco per il file mancante, descritto nella sezione storica successiva, è risolto. Restano mancanti i fotogrammi intermedi: il passaggio chiuso→aperto è una dissolvenza reversibile fra i due originali.

- `npm test`: **70/70 superati in 8 file**, incluse verifiche su hash, risoluzioni e ordine chiuso→aperto; la verifica del finale è stata osservata fallire prima dell’integrazione e passare dopo.
- `npm run build`: superato, TypeScript incluso. Nessuna modifica al motore Canvas, al simulatore, al configuratore, alle equazioni, al PDF o alle dipendenze in questa integrazione.
- Esecuzione browser selezionata con il finale: **18/19 superati**. L’unico fallimento era un confronto fra la frazione di scroll richiesta e il frame calcolato: ScrollTrigger arrotonda la distanza ai pixel (3436 invece di 3436,2 nella viewport desktop). Il test ora usa la distanza effettiva dello scroll; il rendering rimane invariato.
- Dopo tale correzione, **3/3 controlli del percorso superati** con `PLAYWRIGHT_PREVIEW=1 npx playwright test tests/e2e/photo-sequence.spec.ts --output test-results/photo-open-confirm`: finale aperto, ritorno alla vista chiusa, avanzamento di nuovo al finale, navigazione fra pagine, pin, mobile e ridimensionamento HiDPI. I sei flussi con Worker reale e gli altri controlli sono passati nell’esecuzione precedente; non è stata ripetuta l’intera suite dopo la modifica del solo test. Ispezionato lo screenshot del finale aperto della build.
- I due controlli di overflow della pagina algoritmi a 320/375 px rimangono esclusi esplicitamente dalla selezione estesa, attivi nei test e già documentati come fallimenti preesistenti.
- Benchmark con 12 frame, 90 campioni di scroll avanti/indietro, Chromium cloud DPR 1: desktop P95 **100 ms**, massimo **249,9 ms**, cache decodificata 75.506.112 byte; mobile P95 **33,4 ms**, massimo **50 ms**, cache 31.460.880 byte. Nessun long task osservato e nessun ridisegno a riposo dopo la stabilizzazione. JSON in `test-results/photo-open/photo-performance-*/photographic-scroll-performance.json`. Queste misure non certificano 60 FPS né prestazioni su Safari o dispositivi fisici.

Codice nel branch `photo-sequence`; nessun deployment pubblico. Le verifiche successive sono storiche.

## Refactoring fotografico — versione in attesa del finale

Il renderer Three.js è sostituito da Canvas 2D e GSAP/ScrollTrigger. Gli 11 frame degli archivi sono gli originali, verificati tramite SHA-256 e dimensioni; ordine, provenienza e lacune sono descritti in [photo-sequence.md](photo-sequence.md). **La foto dell’ascensore aperto inviata inline non è scaricabile: il finale resta da integrare e verificare.** Nessun deployment pubblico.

- `npm test`: **70/70 test superati in 8 file** sul codice finale. I test della geometria eliminata sono sostituiti da controlli su asset, proporzioni, cache e adattamento del budget; i test matematici e del configuratore rimangono invariati.
- `npm run build`: superato, inclusa verifica TypeScript. Nessuna modifica a dipendenze, lockfile, PDF, `src/simulation`, `src/configurator` o `src/algorithms`.
- Playwright sulla build finale: **19/19 controlli selezionati superati** con `PLAYWRIGHT_PREVIEW=1 npx playwright test --grep-invert 'within (320|375)px' --output test-results/photo-final`. Inclusi tutti i sei flussi con Worker reale, scroll reversibile, pin, ritorno dalla pagina algoritmi, conservazione dello stato, cache mobile, ridimensionamento desktop→tablet→mobile, DPR 3 limitato a 2/1,5, fallback Canvas non disponibile e movimento ridotto.
- La precedente esecuzione estesa di questa revisione ha prodotto **18 superati e 2 falliti**: gli overflow già documentati della pagina algoritmi a 320/375 px. Le due asserzioni rimangono attive; il comando finale le esclude esplicitamente e la suite completa non è dichiarata verde. Il nuovo controllo tablet porta il totale attuale a 21.
- Revisione specialistica mirata: corretti il layout fotografico fra 601 e 767 px e l’aggiornamento di DPR/budget dopo il ridimensionamento. Regressione osservata RED→GREEN; resize del buffer e disegno eseguiti nella stessa callback per evitare un buffer momentaneamente vuoto.
- Ispezionati gli screenshot iniziali desktop e mobile, svolta e ascensore chiuso. Palazzo iniziale interamente visibile, proporzioni conservate, titolo separato dall’immagine su mobile. Le viste successive usano un ritaglio proporzionale; le dissolvenze fra viste sparse non equivalgono a una ripresa continua.

Benchmark effettivo su Headless Chromium 151 nel cloud, DPR 1: 90 campioni `requestAnimationFrame` durante scroll avanti e indietro con decodifica degli originali, senza simulazione concomitante. Il test verifica campionamento e arresto dei ridisegni per 30 cicli dopo la stabilizzazione; **non impone né certifica un obiettivo FPS**.

| Viewport | Tempo P95 | Massimo | Cache decodificata osservata | Long task osservati |
| --- | --- | --- | --- | --- |
| 1440 × 900 | 100 ms | 150 ms | 69.213.936 byte | 0 |
| 375 × 812 | 33,4 ms | 50 ms | 31.460.880 byte | 0 |

I JSON grezzi sono prodotti in `test-results/photo-final/photo-performance-*/photographic-scroll-performance.json` (artefatti locali ignorati da Git). Questi tempi non dimostrano fluidità a 60 FPS; rimane necessaria una verifica su dispositivi fisici e Safari. Il budget della cache non comprende Canvas, buffer di decodifica in corso e cache HTTP del browser. L’assenza di long task osservati non misura il lavoro del compositore.

Le sezioni successive conservano le verifiche storiche della versione precedente.

## Revisione visiva — ingresso diretto e ascensore interno

L’ultima richiesta sostituisce il corridoio, la svolta e i quattro portali della scena con un unico ascensore nella lobby. La flotta del simulatore rimane configurabile, con quattro cabine standard. Geometrie e finiture seguono i materiali analizzati; provenienza e adattamento sono descritti in [visual-reference.md](visual-reference.md).

- `npm test`: **81/81 test superati in 8 file**, incluse geometria, visibilità delle campate arretrate, camera libera, apertura reversibile, contenimento delle ante nei montanti e ciclo di vita del contesto WebGL.
- `npm run build`: superato, verifica TypeScript inclusa. Nessuna dipendenza aggiunta.
- Suite browser estesa su build di produzione, escluso il benchmark già fallito: **16 superati, 2 falliti**. I due fallimenti sono gli overflow preesistenti della pagina algoritmi a 320/375 px, non introdotti dalla revisione. Scena, configuratore e risultati non hanno overflow nelle prove effettuate.
- Conferma sul codice finale: **16/16 test browser mirati superati** in circa 1,2 minuti, con `PLAYWRIGHT_PREVIEW=1 npx playwright test --grep-invert 'records frame timing|within (320|375)px' --workers=1`. Questa esecuzione esclude esplicitamente i tre controlli con limiti già documentati; le loro asserzioni restano nel repository e la suite completa non è dichiarata verde.
- Percorso desktop/portrait, apertura e inversione dello scroll, ritorno dalla pagina algoritmi, riferimenti originali, movimento ridotto, assenza di WebGL, selezione della versione essenziale e perdita autentica di WebGL verificati. Il difetto di ritorno alla scena è corretto: il listener viene rimosso prima del teardown intenzionale di R3F.
- Tutti i **6 flussi del configuratore con Worker reale** superati, compreso lo scenario standard; nessuna modifica a `src/simulation`, `src/configurator`, `src/algorithms`, PDF o lockfile.
- Il benchmark di 90 frame sul renderer software Chromium/SwiftShader supera ancora il timeout di 60 s. Non è un test superato e non certifica la fluidità su dispositivi reali; il fallback statico rimane disponibile.
- Revisione specialistica mirata: individuata esposizione delle ante fuori dai montanti a porta completamente aperta, corretta con test RED→GREEN; griglia spostata nella parte visibile dell’apertura. Nessun altro difetto importante segnalato.
- Ispezionati gli screenshot di torre, ingresso, lobby, ascensore chiuso/aperto e versione portrait. Il fallback usa quattro catture dello stesso renderer, senza testo sovrapposto né animazioni, circa 240 KB complessivi.

Le verifiche qui sopra aggiornano la situazione storica riportata sotto: il precedente difetto di ritorno al Canvas è risolto. Restano l’overflow della pagina tecnica su piccoli schermi e la verifica prestazionale su GPU reale. Nessun deployment pubblico.

## Configuratore semplificato — 8 ottobre 2026

- `npm test`: 70 test superati in 6 file, inclusi 18 test dell'adattatore dei quattro input al modello originale.
- `npm run build`: superato, compresa la verifica TypeScript.
- Playwright su build di produzione: tutti i 6 test del nuovo flusso superati. Verificati controlli +/−, media e resto per piano, input vuoti/non interi, Worker reale, domanda identica fra strategie, annullamento, domanda zero, esportazioni, replay immutabile e conservazione dei risultati fra le pagine.
- I due test mirati per movimento ridotto e assenza di WebGL sono superati dopo aver reso deterministico il salto iniziale nel test e aver distinto il link di navigazione dal nuovo link nei risultati.
- Ultima esecuzione congiunta su build di produzione: 8/8 test browser mirati superati in 25,7 secondi (sei flussi del configuratore e due fallback/accessibilità). Revisione mirata del codice: nessun difetto importante o critico rilevato.
- Il matematico ha verificato 456 configurazioni: popolazione conservata, bilanciamento fra piani, quote pranzo originali 35%/43%/22%, parametri nascosti e preset originale invariati.
- Caso standard semplificato: 4 ascensori, 15 piani superiori, 525 addetti, 13 posti, parametro medio dei pesi 80 kg. Il Worker produce 1.887 richieste, tutte completate da ciascuna delle tre strategie. Attese medie effettive: reattiva 114,154889 s, fasce 8,641380 s, adattiva 9,345115 s. Non si assume che la strategia adattiva sia sempre la migliore.
- Controllo visivo e misurazione della sezione risultati a 1.440, 375 e 320 px: nessun overflow della pagina; risultati identici a tutte le larghezze. Il configuratore è utilizzabile da tastiera e senza rendering 3D.
- Nessuna modifica a `src/journey`, `src/simulation`, `src/algorithms` o ai materiali in `public`: la semplificazione è un adattatore di input e presentazione dei risultati.

### Limiti emersi nella suite estesa

La prima esecuzione estesa ha concluso 17 test: 11 superati e 6 falliti. Due fallimenti erano legati alla sincronizzazione/selezione degli elementi nei test, corretti e verificati con la successiva esecuzione mirata. La suite completa non viene dichiarata interamente superata.

- A 320 e 375 px, la pagina **Gli algoritmi** porta la larghezza del documento a 560 px. Il confronto con la build del commit precedente `ffc4e79` riproduce esattamente lo stesso overflow; configuratore e risultati non presentano questo problema.
- Tornando dalla pagina algoritmi alla scena 3D, il Canvas può essere sostituito dal fallback. Il test del percorso ha verificato corridoio, svolta, quattro portali e inversione delle porte, poi è fallito al ritorno dalla pagina algoritmi. Lo stesso test, eseguito sulla build precedente, fallisce nello stesso punto. La navigazione con movimento ridotto e i risultati del simulatore restano funzionanti.
- Il test di campionamento di 90 frame ha superato il timeout di 60 secondi sul renderer software Chromium/SwiftShader. Questo esito non certifica la fluidità su GPU reale e non è contato come superamento.

Questi problemi riguardano sezioni che la richiesta impone di lasciare invariate. Non sono stati nascosti disabilitando test né corretti modificando la cinematica o la pagina tecnica.

## Integrazione originale

Verifica precedente alla semplificazione (valori riferiti al preset originale, non al nuovo configuratore):

- `npm ci --cache /tmp/ascensori-npm-cache` completato con lockfile congelato.
- `npm test`: 52 test superati in 5 file.
- `npm run typecheck`: superato.
- `npm run build`: superato; Vite produce anche chunk separato per la scena 3D e il Worker.
- 10 test puri della cinematica superati: percorso reversibile, svolta a destra, quattro portali, apertura porte e adattamento verticale.
- Motore: preset seed 101, 525 addetti, 1.861 richieste; fixture numeriche, invarianti fisici, domanda condivisa, censura, CI e NNLS verificati.
- Browser: flusso Worker ridotto, esportazione JSON, replay immutabile, annullamento/rerun, scenario a domanda zero, stato conservato fra `/algoritmi` e pagina iniziale, e CI su otto repliche piccole superati dalla suite Playwright prima dell'esaurimento della sessione QA.

La suite Playwright completa sul preset da 525 addetti richiede più tempo del timeout iniziale in Chromium/SwiftShader cloud; il timeout era più stretto dei guardrail dichiarati dal prodotto. Questo non viene contato come risultato positivo né come errore del motore: il caso è già verificato direttamente nel core TypeScript e il Worker mostra avanzamento senza errori browser nella prova interrotta. La misura FPS in Chromium software non è una certificazione per hardware reale.

Limiti matematici e operativi sono descritti in [README.md](../README.md), nella pagina `/algoritmi` e nello spec approvato della Fase A.
