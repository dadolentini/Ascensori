# Sequenza fotografica — 8 ottobre 2026

## Stato della consegna

Il motore Canvas 2D è implementato e il percorso attivo comprende 18 frame: 10 originali, 2 ritagli selezionati dai nuovi allegati, 4 intermedi generati e 2 correzioni mirate. L’apertura attraversa gli stati chiuso, circa 29%, circa 70% e aperto. Tutti i 12 PNG originali rimangono intatti; due derivati corretti sostituiscono soltanto le rispettive viste nella timeline attiva. Inventario e motivazioni aggiornati in [sequence-integration.md](sequence-integration.md).

Il lavoro viene conservato nel branch `photo-sequence`; `work` conserva la versione precedente. Nessun deployment pubblico.

Il precedente tentativo aveva scartato due candidati per alterazioni architettoniche: [analisi storica e prove](intermediate-frame-audit.md). Dopo i nuovi allegati e l’autorizzazione a correggere le incoerenze sono stati accettati sei nuovi asset generati. Le viste distanziate e le variazioni residue impediscono comunque di dichiarare una ripresa continua geometricamente calibrata.

## Inventario e ordine verificati

`media palazzo.zip` contiene 6 PNG e `Media ascensore.zip` ne contiene 5. Tutti sono RGB, 1122 × 1402 px, decodificati integralmente. Le voci `__MACOSX/._…` sono metadati, non fotogrammi. Le cartelle non erano presenti nel progetto: sono state scoperte negli allegati e importate in `public/sequence/` preservando nomi, cartelle e byte. Il manifest conserva SHA-256 e URL per ciascun originale.

Il terzo archivio contiene un solo PNG RGB, anch’esso 1122 × 1402 px, importato nella cartella `Media ascensore` con il suo nome originale. SHA-256: `ede90b1124dff496883af0a132a15a7e90cce7a2aa31bcb3f73c1eaa77f59726`. Il confronto visivo con la vista chiusa conferma portale, marmo retroilluminato, rivestimento in legno e illuminazione coerenti; piccoli dettagli e geometria interna differiscono fra le due viste. La dissolvenza non simula il moto fisico delle ante.

La numerazione riparte e le due cartelle includono viste esterne: concatenare gli archivi o ordinare soltanto i nomi riporterebbe la camera fuori dall’edificio. Dopo l’ispezione visiva di tutte le immagini, l’ordine dei **riferimenti originali** è quello seguente. Queste posizioni identificano gli originali in `originals.json`, non gli indici della timeline attiva a 18 frame.

| Posizione | Cartella originale | File, parte temporale del nome | Vista |
| --- | --- | --- | --- |
| 0 | media palazzo | 17_44_44-1.png | Palazzo intero |
| 1 | Media ascensore | 17_44_45-2.png | Esterno ravvicinato |
| 2 | media palazzo | 17_38_50-1.png | Torre e ingresso |
| 3 | media palazzo | 17_38_50-2.png | Pensilina e ingresso |
| 4 | media palazzo | 17_38_51-3.png | Soglia |
| 5 | media palazzo | 17_38_52-4.png | Entrata |
| 6 | media palazzo | 17_38_53-5.png | Lobby |
| 7 | Media ascensore | 17_44_46-3.png | Vista obliqua dell’ingresso |
| 8 | Media ascensore | 17_44_48-4.png | Direzione verso destra |
| 9 | Media ascensore | 17_44_50-5.png | Ascensore dalla lobby |
| 10 | Media ascensore | 17_44_51-6.png | Ascensore chiuso frontale |
| 11 | Media ascensore | Atrio moderno con ascensore aperto.png | Ascensore aperto frontale |

Il nome completo e l’hash di ogni originale sono in `originals.json`. Il manifest attivo distingue `original`, `supplied-crop`, `generated` e `corrected`, con riferimenti e sostituzioni espliciti. La provenienza fotografica fisica non viene attestata dal codice: gli asset preparati dall’utente sono la fonte visiva vincolante.

## Rendering e risorse

`PhotoSequence.tsx` usa `ctx.drawImage()`, una proprietà numerica `seq.frame` animata con `gsap.to()`, ScrollTrigger con `scrub` e pin della viewport nella sezione. Ogni frame ha uno stop normalizzato `at`: aggiungere un raccordo non sposta arbitrariamente le fasi del percorso. Il tratto fotografico occupa l’83% dello scroll; l’ultimo frame rimane disponibile durante le equazioni e il passaggio al configuratore. Lo stesso valore di scroll produce lo stesso stato visivo in entrambe le direzioni.

Un solo `requestAnimationFrame` pendente accorpa gli aggiornamenti. Il buffer si ridisegna soltanto quando cambiano frame, dissolvenza, inquadratura, dimensioni o disponibilità delle immagini. L’inquadratura iniziale passa gradualmente da fotografia intera a copertura della viewport, anche quando il vicino sta ancora caricando. In attesa di immagini conserva la vista già dipinta; il poster originale copre il caricamento iniziale. Ridimensionamento e disegno del buffer sono eseguiti insieme.

La cache contiene immagini decodificate con budget 96 MiB su desktop e 32 MiB per layout mobile/dispositivi limitati; 3 o 2 decodifiche simultanee. Preserva il frame iniziale e la coppia attuale, dà priorità ai vicini e ricarica gli originali durante il ritorno. I bitmap vengono chiusi all’evizione/unmount; richieste in corso annullate. Il budget non comprende i buffer del browser, il Canvas e la cache HTTP.

DPR limitato a 2 desktop e 1,5 mobile; variazione di viewport aggiorna DPR e budget. La fotografia iniziale è contenuta interamente, con titolo separato su mobile; le viste successive coprono lo schermo mantenendo le proporzioni, quindi possono essere ritagliate. Il fallback e la preferenza di movimento ridotto usano gli stessi frame, senza Three.js.

## Lacune e limiti

Gli asset sono ancora viste distanziate, integrate con pochi raccordi generati e dissolvenze reversibili. Restano variazioni di luce e prospettiva fra alcuni originali e piccoli cambiamenti di texture/riflessi nei derivati. Gli stati intermedi delle ante rendono più graduale l’apertura, ma non costituiscono una simulazione meccanica calibrata. Non vengono aggiunte geometrie 3D. `complete` nel manifest indica che è disponibile il finale aperto; `missing` segnala il limite della ripresa continua e della camera non calibrata.

Configuratore, Worker, modello matematico, PDF, equazioni e dipendenze restano invariati. I vecchi test di geometria Three.js sono sostituiti da verifiche su asset, proporzioni, cache, scroll, pin e HiDPI. I due overflow già presenti nella pagina algoritmi a 320/375 px rimangono fuori dal refactoring visivo.
