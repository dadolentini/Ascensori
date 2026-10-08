# Verifica finale

Ultima verifica locale dopo l'integrazione:

- `npm ci --cache /tmp/ascensori-npm-cache` completato con lockfile congelato.
- `npm test`: 52 test superati in 5 file.
- `npm run typecheck`: superato.
- `npm run build`: superato; Vite produce anche chunk separato per la scena 3D e il Worker.
- 10 test puri della cinematica superati: percorso reversibile, svolta a destra, quattro portali, apertura porte e adattamento verticale.
- Motore: preset seed 101, 525 addetti, 1.861 richieste; fixture numeriche, invarianti fisici, domanda condivisa, censura, CI e NNLS verificati.
- Browser: flusso Worker ridotto, esportazione JSON, replay immutabile, annullamento/rerun, scenario a domanda zero, stato conservato fra `/algoritmi` e pagina iniziale, e CI su otto repliche piccole superati dalla suite Playwright prima dell'esaurimento della sessione QA.

La suite Playwright completa sul preset da 525 addetti richiede più tempo del timeout iniziale in Chromium/SwiftShader cloud; il timeout era più stretto dei guardrail dichiarati dal prodotto. Questo non viene contato come risultato positivo né come errore del motore: il caso è già verificato direttamente nel core TypeScript e il Worker mostra avanzamento senza errori browser nella prova interrotta. La misura FPS in Chromium software non è una certificazione per hardware reale.

Limiti matematici e operativi sono descritti in [README.md](../README.md), nella pagina `/algoritmi` e nello spec approvato della Fase A.
