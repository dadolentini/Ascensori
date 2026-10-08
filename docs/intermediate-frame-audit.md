# Verifica dei fotogrammi intermedi — 8 ottobre 2026

## Esito

**Il completamento cinematografico richiesto non è riuscito.** Sono stati generati realmente due candidati con lo strumento `image_gen`, riferimenti locali e vincoli espliciti su camera, geometria, materiali e illuminazione. Entrambi sono stati scartati dopo il confronto con gli originali. Nessun candidato entra nel manifest o viene caricato dalla landing: la sequenza rimane di **12 originali e 0 intermedi integrati**. Non vengono presentati duplicati, zoom o dissolvenze come nuovi fotogrammi.

Il vincolo è una stessa ambientazione con proiezioni spaziali coerenti, non una somiglianza stilistica. Il generatore disponibile non fornisce controlli sulla camera calibrata, profondità, corrispondenze multivista o blocco dei singoli elementi architettonici. Le prove effettuate non rispettano la fedeltà richiesta; aumentare il numero di queste immagini non dimostra continuità. Non è stato determinato un numero minimo verificabile di intermedi utilizzabili.

## Analisi dei dodici originali

Esaminati tutti i frame, il loro ordine e il renderer Canvas/GSAP. Gli originali sono quelli elencati in [photo-sequence.md](photo-sequence.md); gli indici della tabella sono quelli del manifest, da 0 a 11.

| Passaggio | Movimento da sostenere | Discontinuità e decisione |
| --- | --- | --- |
| 0 → 1 | Discesa e avvicinamento dal palazzo completo | Grande cambio di distanza, quota e prospettiva. Servono viste con parallasse coerente; un ritaglio non basta. |
| 1 → 2 | Proseguimento verso il basamento | Anche l’angolo del basamento varia. Non è verificabile come semplice dolly lungo un unico asse. |
| 2 → 3 | Avvicinamento alla pensilina | Le strutture vicine si espandono molto più della lobby distante. La dissolvenza attuale sovrappone bordi diversi. |
| 3 → 4 | Avvicinamento alle porte | Percorso quasi frontale, ma soglia e cornici cambiano sensibilmente nella proiezione. Non serve inventare un’altra vista esterna. |
| 4 → 5 | Attraversamento dell’ingresso | Cambiano posizione delle ante, parallasse e superfici occluse. Provato un candidato, scartato. |
| 5 → 6 | Avanzamento nella lobby | I montanti escono dal campo e le colonne crescono. Necessario un raccordo spaziale, non ulteriori viste della facciata. |
| 6 → 7 | Passaggio alla vista obliqua | Ricompare un montante in primo piano. La posizione della camera deve essere verificata: la sola sequenza di nomi non dimostra un avanzamento continuo. |
| 7 → 8 | Rotazione verso destra | Forte cambio di occlusioni fra colonne, sedute e corridoio. Un’immagine generica della lobby non può fungere da raccordo. |
| 8 → 9 | Avanzamento verso l’ascensore | Il portale diventa il soggetto; servono trasformazioni coerenti di prospettiva e distanza. |
| 9 → 10 | Allineamento frontale | Rotazione e avvicinamento significativi del portale, senza geometria multivista calibrata. |
| 10 → 11 | Apertura delle ante | Camera nominalmente fissa; già negli originali alcuni elementi fissi cambiano posizione. Provato un candidato a metà apertura, scartato. |

Tutti i dodici originali restano necessari come riferimenti ufficiali; nessuno viene modificato, sostituito o eliminato. Non si generano altri frame iniziali o finali, né duplicati per prolungare le soste. I punti di discontinuità non sono risolti dalle due prove.

## Prove effettive

### Apertura a metà: scartata

Riferimenti: originale 10 chiuso e originale 11 aperto. Richiesta: camera fissa, due ante rigide retratte al 50%, cornice, pulsantiera, marmo, pavimento e luce invariati, cabina ricavata dal riferimento aperto.

Il [candidato dell’apertura](visual-audit/intermediate-candidates/door-half-open-rejected.png) è 1122 × 1402 px. La pulsantiera si sposta, la cornice interna cambia e la larghezza del varco non corrisponde alla metà richiesta. Sono cambiamenti dell’ambiente, non soltanto moto delle ante.

Una segmentazione dei pixel rossi nella regione della freccia restituisce i seguenti rettangoli in coordinate dell’immagine (x minimo, y minimo, x massimo, y massimo): chiuso `(322,316,325,338)`, aperto `(288,313,297,335)`, candidato `(308,320,313,337)`. La segmentazione dipende dalla soglia di colore e non è una misura calibrata della pulsantiera; evidenzia però che la posizione dei pixel dell’indicatore non è preservata. Il confronto visivo conferma lo spostamento anche del pannello.

Come controllo accessorio, esclusa la regione `[330,800) × [150,1130)` che contiene il vano mobile, il confronto con il chiuso ha differenza media assoluta RGB di 5,896 su scala 0–255. Questo dato misura una differenza di pixel, **non** la qualità cinematografica né l’errore geometrico. La decisione di scarto deriva dalle alterazioni degli elementi fissi visibili.

SHA-256 candidato: `e21bfd29fb9a0cd2f3fa1d9120ac9560ef1bba28e83967081d700432aea5db7b`.

### Camera a metà dell’ingresso: scartata

Riferimenti: originale 4 alla soglia e originale 5 in attraversamento. Richiesta: dolly frontale a metà percorso, stessa quota e lente, parallasse fra cornici vicine e reception distante; nessun cambio di oggetti, materiale o illuminazione.

Il [candidato dell’ingresso](visual-audit/intermediate-candidates/entrance-midpoint-rejected.png) non è una vista spazialmente intermedia convincente. Il varco apparente è più ampio rispetto al riferimento finale mentre il banco distante rimane più piccolo: i piani vicini e lontani non seguono un’unica progressione coerente della camera. Anche lampade e venature vengono reinterpretate. La risoluzione è 1123 × 1401 px, inoltre diversa dal rapporto 1122 × 1402 richiesto. Il file non viene corretto né inserito nel percorso.

SHA-256 candidato: `cd6483d337bdd656d1ae1742a3c702249161627519741d1b2262af48535be6be`.

I due file sono conservati soltanto come prove in `docs/visual-audit/`, fuori da `public/`. Non sono asset della sequenza e non rientrano nel suo totale di 12 frame.

## Integrità, scrolling e limiti degli strumenti

Verificati dimensioni e SHA-256 dei dodici originali: tutti invariati. Manifest, Canvas, sincronizzazione GSAP/ScrollTrigger, budget della cache e caricamento rimangono invariati; non è necessaria un’integrazione tecnica di immagini scartate. Simulatore, algoritmi, configuratore e dipendenze non vengono toccati.

La verifica browser mirata controlla pin, avanti/indietro fino al finale, ritorno al chiuso, navigazione tra pagine, mobile e ridimensionamento DPR/budget. È una verifica della sequenza **esistente**, non prova che le discontinuità siano risolte. I risultati del comando corrente sono riportati in [verification.md](verification.md).

FFmpeg è disponibile per analizzare o codificare sequenze, ma non fornisce in questo progetto una ricostruzione della profondità e della camera che risolva le occlusioni fra queste viste. Nessun interpolatore video con vincoli geometrici multivista è installato. Optical flow, morphing e dissolvenze non vengono spacciati per nuove viste fedeli.

Per superare il limite serve una ripresa continua della stessa ambientazione o una sorgente multivista/depth calibrata da cui ricavare nuovi punti di vista, oltre a stati delle porte con camera fissa. Le prove attuali non autorizzano a dichiarare raggiunto il risultato. Nessun deployment pubblico.
