# Sequenza fotografica — 8 ottobre 2026

## Stato della consegna

Il motore Canvas 2D è implementato e il percorso usa esclusivamente i 12 PNG forniti: gli 11 dei due archivi iniziali e l’immagine dell’ascensore aperto ricevuta in `Atrio moderno con ascensore aperto.png.zip`. Il finale mostra la dissolvenza reversibile fra chiuso e aperto. Nessuna immagine è ricreata o sostituita con il precedente rendering.

Il lavoro viene conservato nel branch `photo-sequence`; `work` conserva la versione precedente. Nessun deployment pubblico.

## Inventario e ordine verificati

`media palazzo.zip` contiene 6 PNG e `Media ascensore.zip` ne contiene 5. Tutti sono RGB, 1122 × 1402 px, decodificati integralmente. Le voci `__MACOSX/._…` sono metadati, non fotogrammi. Le cartelle non erano presenti nel progetto: sono state scoperte negli allegati e importate in `public/sequence/` preservando nomi, cartelle e byte. Il manifest conserva SHA-256 e URL per ciascun originale.

Il terzo archivio contiene un solo PNG RGB, anch’esso 1122 × 1402 px, importato nella cartella `Media ascensore` con il suo nome originale. SHA-256: `ede90b1124dff496883af0a132a15a7e90cce7a2aa31bcb3f73c1eaa77f59726`. Il confronto visivo con la vista chiusa conferma portale, marmo retroilluminato, rivestimento in legno e illuminazione coerenti; piccoli dettagli e geometria interna differiscono fra le due viste. La dissolvenza non simula il moto fisico delle ante.

La numerazione riparte e le due cartelle includono viste esterne: concatenare gli archivi o ordinare soltanto i nomi riporterebbe la camera fuori dall’edificio. Dopo l’ispezione visiva di tutte le immagini, l’ordine adottato è:

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

Il nome completo di ogni file è nel manifest. La provenienza fotografica fisica non viene attestata dal codice: gli asset preparati dall’utente sono la fonte visiva vincolante.

## Rendering e risorse

`PhotoSequence.tsx` usa `ctx.drawImage()`, una proprietà numerica `seq.frame` animata con `gsap.to()`, ScrollTrigger con `scrub` e pin della viewport nella sezione. Il tratto fotografico occupa l’83% del percorso; l’ultimo frame rimane disponibile durante le equazioni e il passaggio al configuratore. Lo stesso valore di scroll produce la stessa dissolvenza in entrambe le direzioni.

Un solo `requestAnimationFrame` pendente accorpa gli aggiornamenti. Il buffer si ridisegna soltanto quando cambiano frame, dissolvenza, dimensioni o disponibilità delle immagini. In attesa di un frame conserva la vista già dipinta; il poster originale copre il caricamento iniziale. Ridimensionamento e disegno del buffer sono eseguiti insieme.

La cache contiene immagini decodificate con budget 96 MiB su desktop e 32 MiB per layout mobile/dispositivi limitati; 3 o 2 decodifiche simultanee. Preserva il frame iniziale e la coppia attuale, dà priorità ai vicini e ricarica gli originali durante il ritorno. I bitmap vengono chiusi all’evizione/unmount; richieste in corso annullate. Il budget non comprende i buffer del browser, il Canvas e la cache HTTP.

DPR limitato a 2 desktop e 1,5 mobile; variazione di viewport aggiorna DPR e budget. La fotografia iniziale è contenuta interamente, con titolo separato su mobile; le viste successive coprono lo schermo mantenendo le proporzioni, quindi possono essere ritagliate. Il fallback e la preferenza di movimento ridotto usano gli stessi frame, senza Three.js.

## Lacune e limiti

Gli asset sono viste distanziate: mancano fotogrammi intermedi del movimento e dell’apertura. Le dissolvenze sono un montaggio reversibile degli originali, non una registrazione continua della camera né una simulazione fisica delle ante. Non viene applicato morphing, non vengono aggiunte geometrie e non vengono generati nuovi frame. `complete` nel manifest indica che è disponibile anche il finale aperto; la voce `missing` continua a segnalare i fotogrammi intermedi mancanti.

Configuratore, Worker, modello matematico, PDF, equazioni e dipendenze restano invariati. I vecchi test di geometria Three.js sono sostituiti da verifiche su asset, proporzioni, cache, scroll, pin e HiDPI. I due overflow già presenti nella pagina algoritmi a 320/375 px rimangono fuori dal refactoring visivo.
