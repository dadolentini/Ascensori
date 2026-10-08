# Verifica finale

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
