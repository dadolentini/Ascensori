# Revisione cinematografica e spiegazione del modello

## Problemi verificati

Prima della modifica il renderer avviava pin e tween appena richiesto il primo frame. Le 18 immagini a 1122 × 1402 occupavano circa 108 MiB decodificati, oltre i budget della cache: durante i ritorni rapidi erano evictate e richieste di nuovo. Quando nessuna delle immagini richieste era disponibile, il Canvas conservava la vista precedente, producendo un blocco visivo pur con lo scroll in avanzamento.

L’ingresso desktop usava un ritaglio verticale con ancoraggio 0,8: una foto disegnata a circa 1440 × 1800 iniziava a y ≈ −719 px. Il pavimento prevaleva su porta, lampade e reception. La pagina algoritmi aveva inoltre una larghezza intrinseca di circa 560 px anche nelle viewport da 320/375 px: le equazioni piccole non erano correttamente contenute nel layout.

Sono stati coinvolti in parallelo web designer, architetto web e reviewer; il matematico ha validato il nuovo esempio decisionale e i testi. Il coordinamento mantiene separati asset, renderer, presentazione e verifica.

## Selezione delle fotografie

Analizzati tutti i 18 frame attivi, i 12 originali e i sette PNG di `cartella 4.zip`. Tutti i nuovi PNG sono leggibili, 1122 × 1402. Le voci `__MACOSX` sono metadati.

| File nuovo | Decisione |
| --- | --- |
| `extra_034_orig09_to_orig10.png` | Chiuso frontale quasi duplicato: escluso. |
| `extra_035_orig10_to_orig11.png` | Movimento minimo, contorni leggermente sovrapposti: escluso. |
| `extra_036`–`extra_039` | Ante, comandi o cornice sdoppiati per sovrapposizione: esclusi. |
| `extra_040_orig10_to_orig11.png` | Aperto pulito, ma comandi/cornice cambiano posizione rispetto al chiuso: escluso dall’animazione. |

Non sono stati generati nuovi frame né modificati gli originali. La selezione attiva viene ridotta a **10 frame coerenti**, invece di allungare i passaggi con immagini ridondanti. Sei derivano da originali ufficiali, tre da intermedi già generati e uno dal finale corretto precedente. Tutti i file precedenti rimangono disponibili.

| Capitolo | Frame attivi | Stop nel tratto fotografico |
| --- | --- | --- |
| Palazzo → ingresso | `original-00`, `generated-tower-approach`, `original-01` | 0 / 0,10 / 0,25 |
| Attraversamento della hall | `original-04`, `original-05`, `original-06` | 0,38 / 0,47 / 0,57 |
| Ascensore e apertura | `original-10`, `generated-doors-partial`, `generated-doors-wide`, `corrected-elevator-open` | 0,72 / 0,80 / 0,90 / 1 |

Le viste della facciata e della svolta che cambiavano disposizione architettonica sono escluse. I pannelli delle equazioni (16) e (9) coprono i cambi fra capitoli; l’equazione (6) segue l’apertura. La superficie sfuma durante il raccordo, ma il testo è visibile soltanto quando il fondo chiaro è completamente opaco. I cambi di scena avvengono nel tratto coperto.

Il punto focale della hall dà priorità all’architettura (y da 0,34 a 0,38), quello dell’ascensore al vano (y 0,39). L’inizio mantiene il palazzo completamente visibile. Le proporzioni sono preservate, con l’approssimazione inferiore a un pixel dovuta al ridimensionamento a 896 × 1120.

## Precaricamento e rendering

`FramePreloader` carica e decodifica tutte le immagini in un array JavaScript con due/tre operazioni concorrenti. Solo dopo il completamento vengono creati `gsap.to(seq, ...)` e ScrollTrigger con `scrub: true` e pin. Il poster e il contatore di caricamento rimangono disponibili; il normale scroll e il configuratore sono utilizzabili. Un errore di decodifica seleziona la versione essenziale senza avviare una sequenza parziale.

Fra la decodifica e l’avvio, una preparazione limitata prova i percorsi di disegno della fotografia e della composizione sul Canvas ancora nascosto, distribuiti su due frame. Una lettura di un pixel completa il lavoro grafico differito. Il poster resta visibile e il tween non è ancora inizializzato; annullamento e resize non avviano anticipatamente il rendering.

I bitmap sono trattenuti per tutta l’esperienza: nessuna evizione, decodifica ripetuta o refetch durante i rapidi ritorni. Le richieste sono annullate e i bitmap chiusi alla rimozione del renderer. Il fallback senza `createImageBitmap` usa piccoli canvas e libera immagini e URL temporanei.

GSAP aggiorna la proprietà proxy `seq.frame`; `onUpdate` accorpa gli aggiornamenti in un solo `requestAnimationFrame` pendente. Il Canvas usa `ctx.drawImage()` con ritaglio proporzionale, blending breve fra fotografie dello stesso capitolo e cambio coperto fra capitoli. La firma di disegno include inquadratura, livelli e viewport; a riposo non si ridisegna.

Durante un pannello matematico completamente opaco, il proxy continua ad avanzare ma non vengono ridisegnate fotografie invisibili. Il controllo richiede sia la fase corrente sia il pannello effettivamente visibile; quando il pannello si ritira, la firma viene invalidata e la fotografia corrente viene disegnata subito. Le diagnostiche distinguono il frame richiesto dall’ultimo effettivamente dipinto.

Le due fotografie vengono composte in un buffer alla risoluzione di decodifica prima di un unico disegno opaco sul Canvas visibile. Il buffer aggiunge 4.014.080 byte desktop o 1.568.000 byte mobile, oltre alle immagini e al Canvas HiDPI; non è una stima della memoria totale del browser.

I 10 derivati pesano **1.431.656 byte**, contro 18.424.834 byte delle rispettive sorgenti. WebP qualità 88: la compressione è con perdita, dichiarata nel manifest. I PNG originali restano intatti e verificati tramite SHA-256; il manifest registra hash del file servito, sorgente e derivato precedente.

Decodifica desktop: **40.140.800 byte**; mobile fresco: **15.680.000 byte**. I budget di riferimento sono 96/32 MiB e non descrivono tutta la memoria del browser. DPR massimo 2 desktop/1,5 mobile. Le dimensioni delle immagini decodificate vengono scelte alla creazione; un resize le conserva pronte per evitare nuovi caricamenti.

La vista intera del palazzo e l’avvicinamento conservano la densità del dispositivo. Dal tratto a schermo pieno (`photoProgress ≥ 0,25`), il Canvas limita la larghezza fisica a `max(1024, larghezza decodificata)`: a 1440 × 900 usa 1024 × 640 pixel, più della larghezza di 896 pixel disponibile nelle foto. Il limite evita rasterizzazioni che superano il dettaglio delle sorgenti; testi e formule restano nel DOM. La scala effettiva, anche inferiore a 1 sulle viewport larghe, viene applicata a entrambi gli assi e registrata in `data-dpr`. Le viewport mobili verificate mantengono la densità precedente.

Il profilo ha individuato anche il costo del compositing: il filtro di sfocatura della testata fotografica è rimosso, perché il suo fondo chiaro è già opaco. Il gradiente esteso alla viewport viene usato solo nell’ingresso iniziale. Il rendering KaTeX è memoizzato per evitare di ricompilare la stessa formula a ogni evento di scroll.

Nella testata fotografica colore del testo e superficie cambiano insieme, evitando testo temporaneamente chiaro sul fondo chiaro durante i salti rapidi fra capitoli.

Le tre formule rimangono montate fin dall’inizio, con i capitoli inattivi nascosti anche alle tecnologie assistive. Layout e caricamento dei font possono così avvenire durante il precaricamento delle immagini, senza ricostruire le formule quando si attraversa un raccordo.

## Spiegazione e algoritmi

La foto della hall scelta dall’utente è `original-06`: è effettivamente l’immagine di sfondo dell’intera sezione `#intelligenza`, subito dopo i risultati quando presenti. Tre riquadri chiari sulla destra spiegano assegnazione, previsione e capacità; su mobile sono impilati lasciando una zona fotografica libera in alto. La CTA conduce all’introduzione di `/algoritmi`.

Le formule autentiche non sono cambiate. Nella landing le equazioni (16), (9), (6) hanno superfici ampie, testo scuro, comparsa progressiva ed etichette esplicative. Nella pagina algoritmi tutte le 19 equazioni sono grandi, contenute e accessibili con scorrimento orizzontale da tastiera quando necessario. Nessuna formula viene ridotta per forzarla in una viewport stretta.

La pagina segue sei passaggi: esempio al decimo piano, decisione, previsione, capacità, modello matematico, risultati e limiti. Il confronto fra quattro cabine richiama `findInsertion`, `evaluateRoute`, `routeStops` e `travelSeconds` del simulatore esistente. Il bottone che libera A cambia uno stato illustrativo e ricalcola la scelta: con la tratta già avviata vince B, con A vuota e disponibile vince A. Tempi e costi provengono dal motore, non da valori dimostrativi precaricati.

La destinazione è dichiarata alla chiamata. Il testo distingue previsione del traffico e parcheggio delle sole cabine inattive, capacità attuale e fattibilità futura, riassegnazione dopo imbarco respinto e chiamate ordinarie già impegnate. NNLS rimane diagnostica; MPC rimane ricerca non implementata.

Le animazioni delle formule, della spiegazione e della chiusura sono limitate ai loro componenti e rispettano il movimento ridotto. Configuratore e risultati non ricevono animazioni cinematografiche. Motore matematico, configurazione, equazioni sorgente, PDF e dipendenze restano invariati.

## Limiti e verifiche

Questa è una narrazione fotografica in tre capitoli, con raccordi espliciti: le sorgenti non consentono una camera continua calibrata attraverso tutta l’architettura. Restano piccoli dettagli rigenerati negli intermedi precedenti e crop inevitabili delle immagini verticali nelle viewport larghe. La revisione risolve caricamenti durante lo scroll e inquadrature errate; non trasforma dissolvenze in geometria multivista autentica.

Le misure su Chromium cloud con rasterizzazione software non certificano 60 FPS su Mac, Safari o telefoni fisici. Esiti dei test e benchmark sono riportati in [verification.md](verification.md). Branch `photo-sequence`; nessun deployment pubblico.

Il banco di prova usa ora la rasterizzazione CPU nativa del Canvas 2D. La configurazione precedente forzava SwiftShader, necessario alla vecchia scena WebGL: un confronto sullo stesso codice e sugli stessi 180 campioni ha isolato il suo costo elevato. Il backend precedente resta riproducibile con `PLAYWRIGHT_SWIFTSHADER=1`; il suo limite desktop non viene dichiarato risolto. Il cambio del banco di prova non altera la configurazione grafica del sito sui dispositivi degli utenti e impedisce di attribuire al solo codice una percentuale di miglioramento rispetto ai benchmark storici.
