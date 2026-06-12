# Riepilogo Refactor

Questo documento riassume in modo ordinato cosa e stato fatto durante il refactor iniziato a maggio 2026. Serve come memoria storica compatta: lo stato tecnico attuale resta in `docs/CURRENT_STATE.md`, i rischi in `docs/CODE_REVIEW.md`, il backlog in `docs/ROADMAP.md`.

## Stato

Lo spacchettamento primario di `app/js/core/app.js` e completato.

Validazione di chiusura:

- test runner Node: 59 test superati;
- verifica browser locale dei flussi principali prima del riordino fisico dei file JS;
- controllo dei path script dopo il riordino fisico dei file JS;
- verifica manuale Android del maintainer: comportamento dev tornato al pari della stabile.

`app/js/core/app.js` oggi resta il punto di boot e orchestrazione sottile: inizializza l'app, chiama i controller principali, renderizza timeline/statistiche/impostazioni tramite controller estratti e delega wiring/stato ai moduli dedicati.

I file JavaScript sono stati poi ordinati fisicamente in cartelle per area dentro `app/js/`, senza introdurre moduli ES, build step o dipendenze: l'app resta una sequenza di script globali caricati da `app/index.html`.

## Obiettivi Raggiunti

### Canale stabile/dev sicuro

- Separati branch e canali: `main` per stabile, `codex/refactor` per dev.
- GitHub Pages pubblica stabile su `/` e `/stable/`, dev su `/dev/`.
- Dev e stabile usano storage key diverse, cosi la dev non tocca i dati reali della stabile anche se vive sullo stesso dominio.
- Branding dev separato tramite manifest e icone dedicate.

### Protezione dati

- `Storage` usa `schemaVersion: 1` e normalizzazione centralizzata.
- I backup legacy senza `schemaVersion` restano importabili come schema 1.
- Le scritture storage restituiscono risultati espliciti e la UI mostra successo solo dopo commit riuscito.
- JSON locale corrotto o incompatibile blocca nuovi salvataggi per evitare sovrascritture silenziose.
- Import JSON/CSV separati in preview e commit.
- Import in sostituzione e cancellazione completa creano snapshot locale best-effort prima dell'operazione distruttiva.
- CSV migliorato: include id, tag e timestamp principali; JSON resta il backup completo.

### Test runner

- Creato `tests/run-tests.js` senza dipendenze esterne.
- Copertura attuale: storage, parser, filtri, statistiche, query/cache, refresh, input rapido, timeline, filtri UI, statistiche UI, modale, impostazioni, conferme, tema, toast, history/back button e wiring.
- Aggiunte regressioni parser per frasi con importo e quantita pesata, per evitare che `kg` e altri numeri vengano scambiati per importo.
- Il test sul binding di timer/frame browser protegge il bug emerso dopo l'estrazione di `AppWiring`.

## Moduli Estratti

| Area | Moduli principali | Risultato |
| --- | --- | --- |
| Stato e wiring | `core/app-state.js`, `core/app-wiring.js`, `core/app-wiring-modal.js` | Stato iniziale e option factory fuori da `core/app.js`; wiring modale separato dal wiring generale. |
| Dati e query | `data/storage.js`, `data/expense-store.js`, `domain/expense-query.js`, `core/app-refresh.js` | Persistenza protetta, cache UI, modelli derivati e policy unica di refresh. |
| Parser e azioni spesa | `domain/parser.js`, `domain/expense-actions.js`, `input/expense-submit-controller.js`, `input/expense-input-controller.js` | Inserimento rapido, modifica ed eliminazione testabili tramite adapter. |
| Timeline e filtri | `timeline/timeline-view.js`, `timeline/timeline-controller.js`, `domain/filters.js`, `filters/filter-view.js`, `filters/filter-controller.js` | Rendering e wiring separati, filtri condivisi tra timeline e statistiche. |
| Statistiche | `domain/stats.js`, `stats/stats-view.js`, `stats/stats-charts.js`, `stats/stats-controller.js` | Calcoli puri separati da rendering e configurazione Chart.js. |
| Modale | `modal/modal-view.js`, `modal/modal-form-controller.js`, `modal/modal-mobile-controller.js`, `modal/modal-interactions.js`, `modal/modal-controller.js` | Form, dropdown, tag, focus/mobile e lifecycle isolati. |
| Navigazione e back button | `navigation/navigation-controller.js`, `navigation/ui-stack.js`, `navigation/history-controller.js`, `navigation/ui-stack-effects.js`, `navigation/ui-stack-controller.js` | Decisioni `popstate` testabili, esecuzione history concentrata, cleanup DOM isolati. |
| Impostazioni e feedback | `settings/settings-view.js`, `settings/settings-actions.js`, `settings/settings-controller.js`, `ui/confirm-dialog.js`, `ui/confirm-controller.js`, `ui/theme-controller.js`, `ui/toast-controller.js`, `ui/download-controller.js` | Flussi import/export, conferme, tema, toast e download fuori da `core/app.js`. |
| Helper comuni | `ui/ui-utils.js` | Formattazione, escape HTML, date input e parsing importi dei form in funzioni riusabili. |

## Decisioni Importanti

- Nessun framework e nessun build step.
- Nessuna modifica di schema dati senza fallback.
- Android resta piattaforma primaria.
- I `textarea` monoriga usati come input/dropdown restano intenzionali per evitare suggerimenti/autofill invasivi su mobile.
- Il toggle tema dell'header resta temporaneo; la persistenza vive nelle impostazioni.
- `AppWiring` e un ponte applicativo, non un nuovo dominio: se torna a crescere, va diviso per area invece di riempirlo di logica.
- La cartella `app/js/` e organizzata per area funzionale; quando nasce un nuovo modulo, va messo nella cartella dell'area che possiede quel comportamento.

## Cosa Si Considera Completato

- Fase stabile/dev sicura.
- Fase protezione dati.
- Estrazione logica pura e rendering testabile.
- Spacchettamento primario di `core/app.js`.
- Stabilizzazione dei flussi attuali di back button, modale, filtri e tastiera mobile, verificata su Android.

Queste parti possono essere considerate chiuse per la fase di refactor strutturale. Eventuali interventi futuri su questi moduli saranno manutenzione, bugfix o evoluzione prodotto, non completamento dello spacchettamento.

## Cosa Resta Fuori Da Questa Fase

Questa lista descrive cio che era fuori dallo scopo del refactor strutturale chiuso a maggio 2026. Alcuni punti sono poi stati affrontati in fasi successive e il loro stato aggiornato vive in `docs/CURRENT_STATE.md` e `docs/ROADMAP.md`.

- PWA/offline: service worker, cache versionata, Chart.js locale e strategia update.
- Versioni controllate dall'utente: lista release, scelta versione e compatibilita dati tra versioni.
- Review privacy esplicita.
- Test automatici E2E/browser mobile reali.
- Personalizzazione categorie/metodi/tag.
- Cestino, selezione multipla, azioni bulk e modifica spesa dalle statistiche.
- Rifiniture desktop/iOS e accessibilita piu completa.

## Note Di Validazione

Il bug rilevato dopo lo split di `AppWiring` era causato da timer/frame browser conservati come riferimenti non bindati. Alcune API come `requestAnimationFrame`, `setTimeout` e `setInterval` devono essere chiamate con `window` come receiver. Il fix vive in `app/js/core/app-wiring.js` e il test dedicato in `tests/run-tests.js`.
