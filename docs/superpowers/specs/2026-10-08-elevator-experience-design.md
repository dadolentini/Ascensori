# Ascensori — proposta della Fase A

Stato: proposta da approvare. Nessuna implementazione del prodotto avviata.

## Obiettivo e priorità

Landing italiana con un percorso architettonico 3D continuo, interamente controllato dallo scroll, che termina in un configuratore e in una simulazione reale di mobilità verticale. Priorità: correttezza matematica, qualità visiva, fluidità, usabilità, manutenibilità. Nessun risultato precalcolato presentato come risultato della configurazione corrente. Nessun deployment pubblico senza autorizzazione.

L'approvazione di questa proposta autorizza la Fase B: sviluppo, integrazione e verifiche nell'ordine descritto, con i quattro specialisti attivati quando necessari. Le decisioni tecniche ordinarie non richiedono ulteriori conferme.

## Materiali analizzati

- `elevator-optimization 3.zip`: 8.364.194 byte, trasferito ed estratto fuori dal checkout in `/workspace/elevator-reference`.
- Due PDF leggibili, di 15 pagine ciascuno: `Ottimizzazione_4_Ascensori_15_Piani_V2_Uffici_Adattivi.pdf` e `rapporto_ascensori.pdf`. I testi estratti coincidono; il primo è il riferimento tecnico principale.
- Cinque PNG leggibili: tre inquadrature di ascensore inox chiuso/aperto e due schermate di edificio/lobby.
- Video MOV leggibile, HEVC, 1290×2796, 60 fps, durata 9,565 s: ripresa di una navigazione su laptop, edificio → ingresso → lobby → salita esterna.
- `parametri_ascensori.json`, `simulatore_ascensori.py`, `uffici_adattivi.py`, `test_uffici.py`: fonti eseguibili secondarie da confrontare con il PDF.
- Metadati macOS estratti ma privi di contenuti funzionali.

Il video non mostra corridoio, svolta destra o quattro ascensori insieme: saranno progettati originalmente. Non sono forniti modelli 3D, planimetrie o misure dell'edificio. Manca `crea_rapporto.py`, citato nel PDF: impedisce il suo specifico comando di rigenerazione del rapporto, ma non l'implementazione della landing o l'esecuzione del simulatore incluso. Nessun altro materiale fornito risulta illeggibile.

Il repository contiene README, manifest e lockfile, con librerie Three/R3F/Drei/GSAP già installate. I tre file `.gitignore`, `package.json` e `package-lock.json` già in staging vengono preservati. Non esistono ancora applicazione, build o test di progetto.

Verifica eseguita sul riferimento originale, in output isolati: quattro test allegati superati; riproduzione completa di otto seed × tre politiche, 24 righe di risultati, tutte le richieste completate. Medie di attesa riprodotte: 95,706538 s reattiva, 11,220289 s per fasce, 11,097962 s per ufficio, coerenti con gli arrotondamenti del PDF. Anche i fit NNLS e il MAE per ufficio coincidono. Questo verifica la provenienza dei numeri, non la correttezza delle parti difettose né le prestazioni del prodotto futuro. Evidenze in `/workspace/elevator-analysis-output/full-reference/` e analisi dettagliata in `/workspace/elevator-analysis-output/mathematical-specification.md`.

## Direzione artistica

Edificio per uffici al crepuscolo: facciata vetrata, pensilina sottile, lobby in pietra chiara, nicchie in legno scuro, luce indiretta calda. Gli ascensori hanno inox satinato, riflessi larghi, telai e soglie modellati realmente. Palette avorio/carbone, accento ottone desaturato; tipografia editoriale nel racconto e leggibile nel pannello tecnico.

Le schermate forniscono atmosfera e dettagli materici, senza riprodurre marchi, scritte o interfacce. Il video è un riferimento per l'avvicinamento e il ritmo, non il contenuto da riprodurre nel sito. La scena finale è un modello originale renderizzato in tempo reale.

Alternative considerate: asset architettonici completi (maggiore peso e dipendenza da asset esterni), sequenza prerenderizzata (meno flessibile su camera e formato), scena 3D modulare originale. Si raccomanda quest'ultima: controlla geometria, prospettiva, reversibilità e visibilità delle quattro cabine, con una versione leggera derivata dalla stessa scena.

## Storyboard e percorso camera

Coordinate progettuali in metri: Y verticale, ingresso a Z=0, avanzamento verso −Z; destra verso +X. Le quote sono scelte di progetto, non misure rilevate. La camera resta circa a 1,65 m, senza rollio. Gli intervalli seguenti riguardano il solo tratto cinematografico; il configuratore segue nel normale flusso del documento.

| Progresso | Azione | Composizione |
| --- | --- | --- |
| 0–15% | Edificio e avvicinamento | Camera da `(0,1.65,18)` verso la pensilina; torre leggibile e inclinazione progressivamente orizzontale. |
| 15–23% | Ingresso | Attraversamento della soglia vetrata aperta, fino a Z=−3; nessun taglio. |
| 23–43% | Esplorazione | Corridoio largo circa 4 m, fino a Z=−17,5; fondo chiaramente visibile. |
| 43–54% | Svolta destra | Arco di circa 3 m fino a `(3,1.65,−20.5)`; orientamento da −Z a +X. |
| 54–62% | Quattro ascensori | Parete a X=22 con quattro portali distinti e contemporaneamente visibili, anche in verticale tramite inquadratura adattata. |
| 62–72% | Avvicinamento | Secondo ascensore come protagonista; camera verso `(19.7,1.65,−21.7)`. |
| 72–79% | Apertura | Due ante scorrono nelle tasche con accelerazione e frenata morbide; cabina, soglia e profondità visibili. |
| 79–83% | Attraversamento | Breve ingresso nella cabina, arresto prima della parete di fondo. |
| 83–92% | Matematica | Equazioni già introdotte durante l'apertura si completano in una composizione DOM leggibile, con significato e unità. |
| 92–100% | Configurazione | Ambiente attenuato verso fondo avorio; emerge il layout finale senza cambio di scena brusco. |

Un solo progresso normalizzato controlla camera, porte, testi e dissolvenze. Raccordi con posizione e tangente continue; nessuna animazione della porta dipendente da un evento irreversibile. Scroll all'indietro, salti di scroll e ridimensionamenti ricostruiscono lo stesso stato. Orientamento e campo visivo sono coordinati, senza clipping dentro pareti o porte.

Il percorso userà inizialmente circa sette altezze viewport su desktop, con calibrazione durante i test. Nessuna cattura delle rotelle o dei gesti touch. Un collegamento «Vai alla simulazione» consente di saltare il viaggio; la lettura delle formule non richiede mantenere lo scroll in una posizione precisa, perché sono disponibili anche in `/algoritmi`.

## Stack e confini

React + TypeScript + Vite, Three.js attraverso React Three Fiber/Drei, GSAP per la timeline; KaTeX per formule accessibili. React viene dichiarato direttamente, insieme a React DOM; strumenti di build e verifica sono aggiunti solo nella Fase B. Lenis e Motion già presenti non sono necessari al controllo principale: lo scroll nativo evita sistemi concorrenti. Postprocessing facoltativo, non richiesto per usare il sito.

SPA con `/` e `/algoritmi`. Link «Gli algoritmi» sempre in alto a destra, su elemento DOM con contrasto sufficiente. Navigazione, history e ripristino di configurazione/progresso gestiti; il server deve servire `index.html` per le route dell'applicazione. Il motore non richiede backend né credenziali.

Moduli previsti:

- `src/journey/`: geometrie modulari, illuminazione, percorso camera, mapping del progresso e livelli di qualità.
- `src/simulation/`: schema, generazione domanda, fisica, eventi, itinerari, politiche, apprendimento, forecast, diagnostica e metriche. TypeScript puro, indipendente da React e dal rendering.
- `src/simulation/worker.ts`: protocollo di avvio/progresso/annullamento/errore/risultato con `runId`, versione motore e configurazione effettiva.
- `src/configurator/`: campi, gruppi/piani, validazione, riepilogo e risultati.
- `src/algorithms/`: equazioni, provenienza, variabili, vincoli, esempi interattivi e limiti.
- `tests/`: fixture deterministiche del motore; test browser dei percorsi essenziali.

Si raccomanda Web Worker TypeScript rispetto a server Python o Pyodide: conserva il sito statico, evita un runtime scientifico pesante e separa i calcoli dal rendering. Il Python allegato resta una fonte offline conservata intatta, non viene trattato come oracolo su parti riconosciute difettose.

## Modello matematico autorevole

Preset del PDF: quattro cabine; piani 0–15, cioè **16 piani incluso il terra**; 30 uffici e 525 addetti; attività 08:00–19:00, orizzonte 07:00–21:00. Cabine da 1.000 kg e 13 persone; v=2,5 m/s, a=1 m/s², h=3,3 m; porta base 5,5 s, trasferimento 0,8 s/persona. Riserva pianificata 87 kg e frazione di carico ρ=0,96. Questi valori sono assunzioni sintetiche, non rilievi dell'edificio.

Le destinazioni sono note alla chiamata in tutte le politiche: ipotesi DCS dichiarata. Non si aggiunge un controllo reale degli impianti.

Formule da riprodurre con numero, pagina e spiegazione:

- Domanda OD e componenti gaussiane: (1)–(2), p.3. La somma delle componenti distingue ingresso, pause/rientri, uscita e traffico interno.
- Fit NNLS non negativo: (3)–(4), p.4, addestramento e verifica su giornate disgiunte. È diagnostica dei flussi, non il controller di parcheggio per fasce.
- Moto: (5), p.5. Con δ=h|f−g|, `T=2√(δ/a)` se δ≤v²/a, altrimenti `T=δ/v+v/a`. Fermata: `t_porta+t_trasf(n_saliti+n_scesi)`.
- Ammissibilità effettiva e pianificata: (6)–(7), p.5. Massa e posti sono due vincoli distinti; planning usa riserva prudenziale, imbarco usa massa effettiva.
- Screening HC/INT e sensibilità portata: (8), p.5 e (12), p.10. Il RTT=145 s è un'ipotesi illustrativa; non viene presentato come misura né come output dinamico.
- Inserimento pickup prima del dropoff: (9), p.6. Si minimizza `J_t(S_e inserito)−J_t(S_e)` su tutte le coppie ammissibili.
- Costo (10), p.6: `J_t(S)=Σ_wait[Ŵ_residuo+(ζ/100)[Ŵ_totale−w0]_+²]+αΣ_pending R̂_residuo`, con α=0,33, ζ=0,035, w0=120 s. È una scelta greedy a orizzonte mobile, non un ottimo globale.
- MPC (11), p.6: illustrata come ricerca successiva, **non implementata** e non disponibile come modalità della simulazione.
- Aggregazione uffici/piani e apprendimento con shrinkage: (13)–(15), p.11. Parametri appresi solo sui giorni training; per uffici non osservati si torna al programma dichiarato.
- Forecast integrato gaussiano: (16), p.12, `D̂_o=N_o p̂_o[Φ((t+L+H−μ̂_o)/σ̂_o)−Φ((t+L−μ̂_o)/σ̂_o)]`; rientro traslato della durata della pausa.
- Allocazione greedy marginale delle cabine inattive: (17)–(19), p.13. `q=0,82 min(C, floor(ρQ/w̃))`, guadagno di copertura del documento, penalità di viaggio e distanza 0,10; una cabina inattiva resta nella copertura diffusa, massimo tre concentrate per piano nel preset.

Le equazioni principali del racconto sono (5), (6)–(7), (9)–(10) e (16), introdotte dalla fisica alla scelta e alla previsione. `/algoritmi` contiene tutte le formulazioni del documento, con distinzione fra operative, screening e ricerca. Le formule sono verificate anche visivamente sul PDF, perché l'estrazione testuale perde parte della notazione.

## Politiche e confronto

Tre politiche, stessi vincoli fisici e stesso campione esatto di chiamate/masse:

1. **Reattiva, baseline dello studio**: inserimento fattibile che minimizza ETA nuovo + 0,28 viaggio nuovo + 0,32 ritardi aggiunti agli utenti già assegnati; nessun parcheggio preventivo. Non è descritta come rappresentativa di tutti gli impianti commerciali.
2. **Ottimizzata per fasce**: costo marginale (9)–(10), anti-abbandono e parcheggio dopo inattività, coerente con gli orari configurati.
3. **Adattiva per ufficio/gruppo**: stesso instradamento della seconda, ma parcheggio guidato dal fit per ufficio e dalle (14)–(19). La differenza fra seconda e terza isola il parcheggio adattivo.

La domanda viene pregenerata una sola volta per replica e clonata tra politiche. Flussi random separati per generatore e training; nessuna informazione sugli offset latenti entra nel modello appreso. Il seed Python/NumPy non produce necessariamente la stessa traccia in JavaScript: la validazione tra linguaggi usa input espliciti condivisi, non uguaglianza nominale dei seed.

Esecuzione rapida su una replica, modalità statistica esplicita sulle otto repliche documentate (101…808). Apprendimento adattivo: dodici giorni sintetici training, quattro validation disgiunti; diagnostica NNLS con split 6/2 delle otto giornate. Nessun intervallo di confidenza con una sola replica; con otto, intervallo t di Student sulla differenza delle medie giornaliere appaiate, esplorativo su dati sintetici.

## Incongruenze e correzioni da approvare con il progetto

Il PDF governa il nuovo motore. La riproduzione del codice allegato serve a capire la fonte, non a conservare i suoi errori. Le correzioni cambieranno i numeri ottenuti: i risultati stampati nei PDF non saranno obiettivi da raggiungere.

- ETA di una cabina in movimento: nel riferimento è stimata metà del viaggio; usare il residuo dell'evento effettivo e rispettare il segmento già iniziato.
- ETA di porta e capienza: il valutatore addebita una porta per task, il motore raggruppa task allo stesso piano; valutatore ed esecutore devono condividere le stesse fermate e la stessa cronologia.
- Sbarco/imbarco: la priorità dichiarata allo sbarco non è garantita dall'ordine dei task; elaborare prima gli sbarchi alla fermata e poi gli imbarchi fattibili. La chiamata respinta resta pendente e non scompare.
- Riserva adattiva: il codice usa il totale delle cabine per limitare le allocazioni, invece del numero inattivo; applicare (19) al numero effettivamente disponibile. Una cabina inattiva viene esclusa dalle concentrazioni preventive e mantiene la copertura corrente; nessun parcheggio monopolizza le cabine sottraendole alle chiamate reali.
- Timer di parcheggio: misurare i 35 s dall'effettivo inizio dell'inattività; un evento di un'altra cabina non resetta il timer. Dopo imbarco respinto, applicare il fallback PDF alla prima cabina ammissibile per ETA, distinto dal normale costo marginale.
- Pesi: il PDF dichiara normale troncata, il codice usa clipping. Generare la normale condizionata all'intervallo dichiarato, senza masse artificiali agli estremi.
- Orari: alcuni campi del JSON (`office_start_hour`, `office_end_hour`, quote pranzo) non modificano la domanda; rimuovere ambiguità, collegare il form ai parametri effettivi e derivare tutti i tempi dal programma normalizzato.
- Quando esiste un solo piano uffici non si generano viaggi interni con origine uguale alla destinazione; nessuna divisione per zero nelle statistiche o nel forecast.
- Capacità operativa adattiva: nessuna copertura positiva se la capacità prudenziale è zero; mantenere (17) senza il minimo artificiale a una persona.
- Apprendimento: niente clipping non documentato di partecipazione o sigma; con assenza di storico usare i prior dichiarati, e rispettare partecipazione 0 o 1. Cache del forecast interna al run, modelli immutabili e tempo dell'evento effettivo.
- Limite di 28 task nel Python: non introdurlo come riduzione invisibile del modello. Guardrail di risorse dichiarati; se il carico supera ciò che può essere calcolato, la simulazione si interrompe esplicitamente senza presentare output parziali come completi.
- Metriche: il riferimento considera solo i viaggi completati e alcuni grafici assumono che tutti siano serviti. La nuova UI mostra denominatori, coda e censura, evitando vantaggi apparenti dovuti a chiamate non servite.

## Configuratore e risultati

Desktop in due colonne: titolo esatto «OTTIMIZZIAMO IL SISTEMA?» e descrizione a sinistra; pannello a destra. Su mobile titolo sopra, poi form e risultati. Nessun dato di performance prima del calcolo.

Campi principali: cabine, piani **incluso terra**, addetti e distribuzione per piano/gruppo, ingresso/uscita, pause con inizio/durata/partecipazione, capacità persone e kg. Avanzati: altezza interpiano, velocità, accelerazione, tempi porte/trasferimento, dispersioni, pesi/riserve, orizzonte, seed e repliche. Parametri di criterio mantengono i valori PDF nel preset e sono spiegati.

Configurazione per piano o gruppi di piani come template; override per ufficio/gruppo con ID stabile. Una sola sorgente di popolazione normalizzata evita duplicare addetti quando un gruppo sovrascrive il piano. Più pause sono un'estensione dichiarata del caso a una pausa: componenti sommate secondo (1), fit e forecast distinti per `groupId + breakId`, poi aggregati secondo (13). Nessun unico fit gaussiano su pause multimodali. Le fasce sono validate rispetto alla giornata; i turni oltre mezzanotte restano fuori dal modello iniziale e vengono rifiutati chiaramente.

Le medie/distribuzioni degli ingressi, interni, pause e uscite rispettano il calendario effettivo; le richieste fuori dall'orizzonte vengono contate separatamente, senza essere ammassate artificialmente sui suoi estremi. Il modello resta di domanda OD sintetica, non un digital twin di persone individuali. Pause sovrapposte per lo stesso gruppo vengono rifiutate; una partecipazione è esplicitamente per pausa, non una probabilità normalizzata fra tutte le pause. Caratteristiche fisiche comuni delle cabine nel configuratore iniziale; non si aggiunge una flotta eterogenea non richiesta.

La scena introduttiva conserva i quattro ascensori richiesti; la rappresentazione schematica nei risultati segue il numero di cabine configurato. Non occorre rigenerare la cinematica introduttiva per simulare altre flotte.

«Avvia simulazione» esegue realmente il Worker; progresso verificabile per fase/politica/replica, annullamento e gestione errori. Risultati: attesa media/mediana/p95, quota sopra 120 s, viaggio e tempo totale, richieste generate/imbarcate/completate/in coda/a bordo, fermate e piani percorsi, differenze baseline e sensibilità fra politiche. Nessuna stima di energia ricavata arbitrariamente dai piani percorsi.

All'orizzonte: `generate entro H = in coda + a bordo + completate`. Attese sugli imbarcati, viaggi sui completati; denominatori espliciti e indicatori della censura. Per confronto con la tabella PDF, vista separata sui completati chiaramente denominata. Se il servizio è incompleto o le quote differiscono, il confronto delle medie non è presentato come miglioramento conclusivo. Zero domanda e denominatore zero producono «non disponibile», non NaN o 0 inventato. Un peggioramento rimane negativo e visibile.

Con più repliche si riportano le medie dei KPI giornalieri, come nel PDF: «media dei p95 giornalieri» è distinta dal percentile della popolazione aggregata. La ECDF è invece sull'insieme dei campioni, con numero di campioni dichiarato. Massimo e incomplete per piano/gruppo sono diagnostiche di equità, non una garanzia di attesa ≤120 s. I piani percorsi contano segmenti conclusi; quelli ancora in corso alla deadline sono dichiarati separatamente, senza conversioni arbitrarie in energia.

Grafici interattivi utili: attesa per fascia, distribuzione cumulata completa senza tagliare la coda, programma dichiarato contro domanda appresa e allocazione delle cabine. Tooltip con unità/campioni, tabella alternativa accessibile e export JSON/CSV con scenario, seed, versione e metriche.

## Fluidità e fallback

Un Canvas, geometrie condivise/istanziate, riflessi tramite ambiente e luci statiche; niente specchi o riflessioni in tempo reale obbligatorie. DPR limitato, qualità adattata, postprocessing leggero solo su dispositivi adatti. DOM e simulazione sono indipendenti dal WebGL.

Reduced motion: sezioni statiche ordinate con immagini generate dalla stessa scena, senza viaggio della camera. WebGL assente o contesto perso: contenuti, formule e configuratore restano utilizzabili. Mobile conserva quattro portali visibili con camera/proiezione adattate; versione leggera disponibile. Tastiera, focus, label/errori associati, zoom 200% e link di salto fanno parte del prodotto.

Budget da misurare, non promesse su hardware sconosciuto: frame p95 ≤33,3 ms nel percorso sulla macchina di riferimento; nessun task applicativo sul main thread >50 ms durante il calcolo; un Worker, avanzamento UI massimo 10 aggiornamenti/s, cancellazione entro 500 ms. Benchmark core su 16 piani totali, quattro cabine, 1.000 richieste esplicite e tre politiche: obiettivo iniziale 10 s da misurare e correggere. Limiti di risorse saranno fissati dai benchmark, comunicati prima dell'esecuzione e non cambieranno silenziosamente precisione, numero di richieste o politiche.

## Ordine di realizzazione dopo approvazione

1. Schema/preset e contratti; fixture di riferimento; generatore seeded e finestre valide, con pause multiple dichiarate.
2. Core fisico/eventi e valutatore condiviso; test delle correzioni e degli invarianti prima delle politiche.
3. Baseline, greedy per fasce, apprendimento/adattivo; metriche, censura, NNLS e confronti appaiati. Matematico verifica i risultati.
4. Worker, benchmark e configuratore realmente funzionante; grafici/export e pagina algoritmi completa.
5. Scena modulare, materiali, inquadrature e timeline unica. Motion Designer costruisce la parte visiva indipendente mentre il motore viene verificato; integrazione mia.
6. QA di correttezza, scroll avanti/indietro, responsive, accessibilità e performance; fallback e ottimizzazione. Build e avvio locale verificati; istruzioni riutilizzabili dell'ambiente salvate quando necessarie.

Nessun lavoro duplicato tra specialisti: architetto sui contratti, matematico sulle regole e sugli esempi, designer sulla scena e sui raccordi, QA sui test e sui benchmark. L'integrazione finale resta al Lead Developer.

## Verifiche fondamentali della Fase B

- Fixture: zero richieste; un utente; fermata condivisa; sbarco che libera capacità; chiamata respinta mantenuta; segmento già avviato; arrivi simultanei; una sola cabina; un solo piano uffici; coda a fine orizzonte.
- Invarianti: passeggeri conservati, tempi monotoni e finiti, massa/posti mai superati, precedenza pickup/dropoff, carico reale distinto dal riservato, nessuna perdita durante riassegnazione.
- Domanda comune fra politiche e train/holdout disgiunti; ripetibilità per scenario/seed/versione, forecast senza accesso ai dati latenti, riserva inattiva rispettata.
- Percentili e confronto su fixture note, denominatori espliciti, miglioramenti negativi e baseline zero gestiti; esportazioni coerenti con quanto mostrato.
- Playwright: avvio/annullamento e risultato; nessun messaggio obsoleto da run precedenti; link `/algoritmi` e back con stato preservato; scroll reversibile in ogni checkpoint; quattro ascensori visibili prima dell'avvicinamento; resize/rotazione.
- Viewport 320/375/768/1440 px, zoom 200%, tastiera, focus e contrasto; reduced motion/WebGL assente; nessun overflow o blocco dei contenuti.
- Dieci cicli run/cancel e route/return senza canvas/worker/listener duplicati; benchmark con browser, CPU, DPR e workload registrati. Build e avvio da istruzioni riproducibili.

## Limiti della proposta

Tutto il traffico è sintetico. I miglioramenti non sono garantiti sul campo; la baseline è quella dello studio. L'apprendimento per ufficio presume conteggi aggregati autorizzati e, senza quel segnale, deve essere interpretato a livello di piano. Il modello non tratta sicurezza impiantistica, antincendio, PLC, certificazione o energia reale. Richiede taratura e dati indipendenti prima di qualsiasi adozione operativa.

La Fase A produce questa proposta e le verifiche del materiale di riferimento; non prova ancora il funzionamento del futuro prodotto. L'implementazione resta in attesa dell'approvazione dell'utente.
