# Integrazione della sequenza — 8 ottobre 2026

## Materiali e selezione

Sono stati estratti e analizzati tutti i 21 PNG dei nuovi allegati: 10 in `Cartella2.zip`, 11 in `cartella 3.zip`. Tutti sono RGB, 1122 × 1402 px. Le voci `__MACOSX` e `.DS_Store` sono metadati. Inventario con hash, corrispondenza visiva agli originali e decisioni in [visual-audit/sequence-selection.json](visual-audit/sequence-selection.json).

Il confronto mostra che i nuovi file sono ingrandimenti/ritagli delle viste esistenti, non nuove posizioni della camera. In diversi frame l’immagine ridotta è completata con bande di pixel ripetuti ai bordi. I nomi `origXX_to_origYY` non corrispondono sempre alla numerazione del manifest esistente: la selezione usa il contenuto, non quei numeri.

Sono integrati soltanto `extra_030` e `extra_033`: piccoli ritagli verso destra delle viste originali 9 e 10, rispettivamente. Non vengono presentati come nuovi punti di vista generati. Gli altri 19 sono esclusi perché ridondanti, con bordi ripetuti o perché ripropongono il telaio dell’ingresso dopo il passaggio nella lobby.

## Intermedi e correzioni

Il designer ha prodotto otto candidati con lo strumento di generazione immagini realmente disponibile. Sei sono accettati: **quattro intermedi e due correzioni**. Due sono scartati: ante troppo aperte/asimmetriche nel primo tentativo e una colonna aggiunta nella prima correzione della lobby. Le prove precedenti restano documentate separatamente e non entrano nel conteggio di questa integrazione.

| Passaggio | Nuovi intermedi | Correzioni | Asset forniti selezionati |
| --- | ---: | ---: | ---: |
| Palazzo intero → avvicinamento | 1 | 0 | 0 |
| Discesa, pensilina, attraversamento | 0 | 0 | 0 |
| Lobby → svolta a destra | 0 | 1 | 1 |
| Allineamento frontale all’ascensore | 1 | 0 | 1 |
| Apertura delle ante | 2 | 1 | 0 |

La correzione della lobby rimuove il telaio/vetro della porta e la soglia che facevano tornare visivamente all’ingresso; conserva la composizione con reception, colonne e lampade. La correzione del finale aperto riallinea cornice e comandi alla vista chiusa, evitando lo spostamento dei comandi fra i due originali. Le aperture intermedie sono circa 29% e 70%, stimate visivamente rispetto alla luce libera finale; non sono quote meccaniche certificate.

I 12 file originali sono **invariati**, verificati tramite SHA-256. `originals.json` conserva il loro ordine e i riferimenti della galleria/fallback. Solo nella sequenza animata `original-07` e `original-11` sono sostituiti da derivati corretti, dichiarati con `replaces`.

## Timeline attiva

Totale: **18 frame = 10 originali + 2 ritagli forniti + 4 intermedi generati + 2 correzioni**. I sei asset generati aggiungono quattro posizioni e ne correggono due; i due ritagli aggiungono altre due posizioni.

| Ordine | ID | Stop `at` | Vista |
| ---: | --- | ---: | --- |
| 1 | `original-00` | 0 | Palazzo completo |
| 2 | `generated-tower-approach` | 0,028 | Primo avvicinamento |
| 3 | `original-01` | 0,07 | Esterno ravvicinato |
| 4 | `original-02` | 0,16 | Torre e ingresso |
| 5 | `original-03` | 0,25 | Pensilina |
| 6 | `original-04` | 0,34 | Soglia |
| 7 | `original-05` | 0,43 | Entrata |
| 8 | `original-06` | 0,52 | Lobby |
| 9 | `corrected-lobby-turn` | 0,60 | Lobby senza ritorno alla porta |
| 10 | `original-08` | 0,70 | Svolta verso destra |
| 11 | `supplied-extra-030` | 0,7333 | Ritaglio verso destra |
| 12 | `original-09` | 0,79 | Ascensore dalla lobby |
| 13 | `supplied-extra-033` | 0,8233 | Ritaglio verso il portale |
| 14 | `generated-elevator-alignment` | 0,842 | Allineamento frontale |
| 15 | `original-10` | 0,87 | Ascensore chiuso |
| 16 | `generated-doors-partial` | 0,909 | Ante aperte circa 29% |
| 17 | `generated-doors-wide` | 0,961 | Ante aperte circa 70% |
| 18 | `corrected-elevator-open` | 1 | Ascensore aperto, cornice allineata |

`timeline.ts` interpola gli indici fra stop ponderati e fornisce la trasformazione inversa. GSAP continua ad animare `seq.frame`, ScrollTrigger mantiene scrub e pin. Lo stesso progresso riproduce lo stesso stato anche al ritorno. L’aggiunta di asset non sposta la fase matematica né il configuratore: il percorso fotografico termina ancora all’83% della sezione.

Il passaggio iniziale da fotografia intera a copertura della viewport è graduale, proporzionale e controllato dallo scroll. La firma di ridisegno include questa variazione per mantenerla attiva anche se il frame vicino tarda a scaricarsi. La cache conserva l’immagine già dipinta durante i caricamenti; non cancella il Canvas in attesa di un file.

## Formato e risorse

Gli otto asset aggiunti alla produzione sono WebP **lossless**, tutti 1122 × 1402 px. Il confronto dei buffer RGB con i PNG di partenza ha confermato uguaglianza dei pixel. Peso complessivo: 11.184.866 byte, contro 15.542.271 byte dei PNG corrispondenti, circa il 28% in meno. Il manifest conserva hash del file servito, hash del PNG di partenza e hash dei pixel, con tipo e riferimenti espliciti.

Rimangono i budget di bitmap decodificati di 96 MiB desktop e 32 MiB mobile/dispositivi limitati, con tre/due caricamenti concorrenti e chiusura dei bitmap all’evizione. Questi budget non rappresentano la memoria totale del browser. DPR massimo 2 desktop/1,5 mobile, ridimensionamento proporzionale, fallback statico e movimento ridotto invariati. Nessun Three.js, servizio esterno a runtime o nuova dipendenza.

## Limiti residui e verifica

Il passaggio fra il secondo e il terzo originale conserva differenze di punto di vista e luce; gli altri grandi intervalli fra originali restano collegati tramite blending. Nei derivati generati variano leggermente riflessi, venature, fogliame e dettagli interni. L’ispezione ha escluso le anomalie maggiori, ma non dimostra identità geometrica assoluta o una camera calibrata. La sequenza è migliorata e reversibile: non è una ripresa continua fisicamente ricostruita e non viene dichiarata priva di ogni discontinuità.

Test, benchmark browser e limiti di copertura sono riportati in [verification.md](verification.md). Simulatore, algoritmi, configuratore, PDF e dipendenze non sono modificati. Tutto il lavoro resta nel branch `photo-sequence`; nessun deployment pubblico.
