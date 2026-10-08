# Revisione architettonica — 8 ottobre 2026

Il percorso ora conduce dall’esterno all’ingresso, attraversa la lobby e si avvicina a **un ascensore interno**, prima chiuso e poi aperto. Questa sequenza segue l’ultima indicazione dell’utente e sostituisce corridoio, svolta e parete con quattro portali. Il numero di cabine nel simulatore resta indipendente dalla rappresentazione visiva.

## Fonti analizzate

- `ScreenRecording_10-08-2026 04-25-49_1.MOV`: 9,565 s, 1290 × 2796, HEVC, 60 fps; decodifica completa verificata con FFmpeg.
- `MEDIA ASCENSORE.zip`: tutte le sei immagini estratte e analizzate. `IMG_3928.jpg`, `IMG_3932.jpg`, `IMG_3938.PNG` e `IMG_3939.PNG` documentano una visualizzazione architettonica ripresa su schermo; `IMG_3916.PNG` e `IMG_3920.PNG` mostrano il portale inox chiuso/aperto.
- Fotogrammi significativi: 0,00 s (torre), 1,45 s (pensilina), 2,05 s (soglia), 3,05 s (lobby), 4,45/6,85/9,15 s (facciata e piani superiori). Il video non mostra un corridoio verso quattro cabine né l’apertura delle porte.

La facciata riprende campate arretrate, balconi sul lato sinistro, coronamento a lamelle e accenti luminosi verticali. La lobby riprende colonne cilindriche avorio, pietra chiara, legno caldo e sospensioni organiche. Il portale usa inox, due ante centrali, display rosso a sinistra, soglia, due pannelli scuri sul fondo, griglia in alto a destra e pavimento rigato. Non si attribuisce ai pannelli posteriori una funzione non documentata.

## Adattamento dichiarato

Le dimensioni, le distanze e la posizione del singolo ascensore nella lobby sono scelte progettuali, non misure rilevate. Gli allegati non dimostrano che l’ascensore fotografato appartenga alla torre mostrata. Il collegamento diretto è stato richiesto dall’utente; non viene presentato come ricostruzione fedele di un percorso osservato.

## Asset e rendering

Gli originali sono conservati in `public/references/`. Il fotogramma della lobby è ritagliato alla visualizzazione sul monitor e ridotto a 640 px; le due anteprime WebP dell’ascensore rimuovono soltanto le bande vuote, poi vengono ridotte a 420 px. Non vengono aggiunti dettagli fotografici artificiali. La sezione «I riferimenti della scena» carica le immagini solo dopo apertura.

Il percorso usa geometria 3D originale, superfici istanziate e materiali locali; non riproduce un video prerenderizzato. Il fallback usa immagini statiche dello stesso ambiente 3D, senza animazione della camera. Il MOV integrale non viene scaricato dal sito. Nessuna dipendenza aggiunta e nessuna modifica al motore matematico, al configuratore o alle equazioni.
