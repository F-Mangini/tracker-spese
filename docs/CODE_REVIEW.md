# Code Review Tecnica

Review eseguita il 2026-05-08 su `app/`, con lettura statica completa dei file principali e controllo sintattico tramite `node --check`.

Obiettivo: capire cosa rende rischioso il refactor e ordinare i problemi per gravita e difficolta. Questa non e una lista di task obbligatori immediati: e una mappa dei rischi.

## Scala

**Gravita**

- **Estrema**: rischio concreto di perdita dati, app non recuperabile, blocco strutturale importante.
- **Alta**: bug o struttura che puo rompere flussi centrali o rendere rischioso il refactor.
- **Media**: problema reale ma circoscritto, oppure debito tecnico che peggiora con la crescita.
- **Bassa**: pulizia, incoerenza minore o miglioramento ergonomico.

**Difficolta**

- **Estrema**: richiede ripensamento architetturale profondo o migrazione complessa.
- **Alta**: richiede piu passaggi coordinati e test manuali accurati.
- **Media**: richiede attenzione ma puo essere isolato.
- **Bassa**: fix locale o cleanup semplice.

## Sintesi Esecutiva

L'app e funzionante e coerente con il suo obiettivo originario: una web app locale, semplice e veloce. Il problema principale non e che il codice sia "sbagliato", ma che molte decisioni nate come fix rapidi ora sono concentrate in un unico oggetto globale.

Priorita consigliata:

0. Separare subito canale stabile e canale dev, con storage separato se condividono lo stesso dominio.
1. Mettere guardrail su dati, import/export e salvataggi.
2. Aggiungere test minimi per parser, storage e filtri prima di refactor larghi.
3. Spezzare `app.js` in aree funzionali senza cambiare UX.
4. Stabilizzare history/back button e gestione modali/tastiera.
5. Poi affrontare PWA/offline/versioni controllate definitive.

Non sono stati trovati errori di sintassi JavaScript. Non ci sono backend, chiamate API dati o evidente esfiltrazione di dati personali.

Nota privacy: questa osservazione non sostituisce una review privacy dedicata. La roadmap prevede di verificare in modo esplicito dati salvati nel browser, asset caricati da rete, backup esportati, uso su device condivisi e possibilita/limiti di una eventuale cifratura locale.

## Aggiornamento 2026-05-16 - Avvio refactor dati

La prima parte della Fase 1 e stata implementata:

- `Storage` usa risultati espliciti per salvataggi, modifiche, cancellazioni, import ed export.
- I dati locali hanno `schemaVersion: 1`; i backup legacy senza versione restano trattati come schema 1.
- Lettura e import passano da normalizzazione centralizzata di spese, impostazioni, importi, date, tag e id duplicati.
- Se il JSON in `localStorage` e corrotto o incompatibile, i salvataggi vengono bloccati e la UI permette l'export del raw.
- Import JSON e CSV sono separati in preview/validazione e commit, con scelta esplicita tra aggiungere e sostituire.
- Le sostituzioni e la cancellazione completa creano uno snapshot locale best-effort obbligatorio prima dell'operazione distruttiva.
- Il CSV esporta anche `id`, `tags`, `creatoIl` e `modificatoIl`, e l'import gestisce delimiter comma/punto e virgola/tab, quote, newline nei campi e decimali italiani.
- E stato aggiunto `tests/run-tests.js` con copertura iniziale per storage e parser.

Restano aperti, per le fasi successive: refactor del monolite `app.js`, UI stack/back button e review privacy dedicata.

## Aggiornamento 2026-05-16 - Estrazione filtri e statistiche

La prima parte della Fase 2 e stata implementata:

- `app/js/filters.js` contiene logica pura per contare filtri attivi, applicare filtri completi e applicare filtri non-data alle statistiche.
- `app/js/stats.js` contiene logica pura per date, periodi, totali rapidi, riepiloghi categoria/top spese e aggregazioni giornaliere, settimanali e mensili.
- `app.js` delega filtri e calcoli statistici ai nuovi moduli e resta responsabile di stato UI, rendering, eventi e grafici Chart.js.
- `tests/run-tests.js` copre ora storage, parser, filtri e aggregazioni statistiche.

Restano aperti: parsing importo piu robusto, UI stack/back button, separazione progressiva di modali, navigazione, impostazioni e rendering timeline.

## Aggiornamento 2026-05-18 - Estrazione rendering UI

La seconda parte della separazione progressiva di `app.js` e stata implementata:

- `app/js/ui-utils.js` contiene helper UI piccoli e testabili: formattazione importi, escape HTML, formattazione date per input e parsing importi nei form.
- `app/js/filter-view.js` contiene rendering dei chip filtro, testo del riepilogo filtri e calcolo della soglia massima dello slider importo.
- `app/js/timeline-view.js` contiene rendering di riepilogo timeline, empty state filtrato, gruppi giorno e card spesa.
- `app/js/stats-view.js` contiene rendering della pagina statistiche; `app.js` resta responsabile di dati, eventi e grafici Chart.js.
- `app/js/stats-charts.js` contiene palette, lettura colori tema e configurazione Chart.js per torta e barre.
- `app/js/modal-view.js` contiene rendering dei dropdown ricercabili e logica pura dei suggerimenti tag.
- `app/js/modal-interactions.js` contiene eventi e micro-stato di dropdown ricercabili e input tag della modale, con hook verso la history gestita da `app.js`.
- `app/js/settings-view.js` contiene rendering della pagina impostazioni e messaggio preview import.
- `app/js/settings-actions.js` contiene decisioni pure per formati import/export, scelte, download spec e messaggi finali.
- `app/js/ui-stack.js` contiene le decisioni pure dell'ordine di chiusura `popstate`/back button.
- `app/js/ui-stack-effects.js` contiene cleanup DOM piccoli usati dallo stack UI durante `popstate`.
- `app.js` ha metodi piu piccoli per navigazione, salvataggio/ripristino scroll pagina, gestione popstate e lettura del form modale.
- La chiusura dei filtri avanzati ora consuma lo stato history creato all'apertura; chiudere il pannello filtri mentre l'avanzato e aperto consuma entrambi gli stati.
- La pagina statistiche senza spese usa un empty state dedicato per non finire sotto la trasparenza della testata sticky.
- `tests/run-tests.js` copre anche helper UI, rendering estratto di filtri/timeline/statistiche/dropdown/tag/impostazioni e configurazione grafici.
- Il parser importi ora valuta piu candidati e preferisce valuta esplicita, decimali e importi finali; i test coprono `pizza 4 formaggi 8`, `pizza 4 formaggi 8 euro` e `2 caffe 3 euro`.
- Le decisioni di priorita del back button e le azioni push/back simmetriche sono coperte da test unitari tramite `UIStack`; l'esecuzione reale di `history` passa da `app.js#runHistoryAction`.
- Le azioni impostazioni piu semplici sono coperte da `SettingsActions`; FileReader, download e commit storage restano in `app.js`.
- I cleanup DOM piu piccoli collegati a `popstate` sono in `UIStackEffects` e coperti da test.

Restano aperti: UI stack/back button completo con ulteriori dettagli DOM/mobile da centralizzare gradualmente, estrazione piu profonda dei commit impostazioni/import-export, test automatici DOM o E2E per i flussi mobile piu fragili.

## Findings Principali

| ID | Problema | Gravita | Difficolta | Area |
| --- | --- | --- | --- | --- |
| CR-01 | Guardrail insufficienti su `localStorage`: dati corrotti o salvataggi falliti possono portare a perdita dati silenziosa | Estrema | Media | Dati |
| CR-02 | Import JSON troppo permissivo e potenzialmente distruttivo | Alta | Media | Dati |
| CR-03 | `app.js` e un monolite globale con troppe responsabilita | Alta | Alta | Architettura |
| CR-04 | Back button/history state fragile e distribuito in molti punti | Alta | Alta | Navigazione |
| CR-05 | Parser e modifica importo possono registrare importi sbagliati | Alta | Media | Core UX |
| CR-06 | Assenza di test automatici sui flussi critici | Alta | Media | Qualita |
| CR-07 | Offline/PWA/versioni controllate non hanno ancora fondamenta tecniche | Alta | Alta | Distribuzione |
| CR-08 | CSV fragile e lossy rispetto al modello dati reale | Media | Media | Import/export |
| CR-09 | Rendering HTML e sanitizzazione sono incoerenti | Media | Media | UI/sicurezza futura |
| CR-10 | Stato dati senza schema versionato o normalizzazione centralizzata | Media | Media | Dati |
| CR-11 | CSS molto accoppiato a layout mobile, z-index e workaround | Media | Alta | UI |
| CR-12 | Performance accettabile oggi, ma letture/render ripetuti non scalano bene | Media | Bassa | Performance |
| CR-13 | Categorie/metodi statici mescolano dati, euristiche e presentazione | Media | Media | Dominio |
| CR-14 | Manifest/PWA incompleti per installazione robusta | Media | Media | Distribuzione |
| CR-15 | Accessibilita e semantica da migliorare | Bassa | Media | UX |
| CR-16 | Cleanup minori: codice morto, variabili inutilizzate, stati visuali residui | Bassa | Bassa | Pulizia |

## Dettaglio Findings

### CR-01 - Guardrail insufficienti su `localStorage`

- **Gravita**: Estrema
- **Difficolta**: Media
- **File**: `app/js/storage.js:22`, `app/js/storage.js:37`, `app/js/storage.js:53`

Problema:

- Se `_load()` trova JSON corrotto, fa solo `console.error` e ritorna dati vuoti.
- Se subito dopo l'utente aggiunge/modifica/importa, `_save()` puo sovrascrivere il payload corrotto con una struttura vuota o parziale.
- `_save()` ritorna `false` in caso di errore, ma `addSpesa`, `updateSpesa`, `deleteSpesa`, `importJSON`, `importCSV` e `updateSettings` ignorano il risultato.
- La UI puo mostrare successo anche se il salvataggio e fallito.

Perche conta:

Questa e l'area piu delicata del progetto: l'app e privata/local-first, quindi il dato nel browser e il prodotto. Prima del refactor serve una strategia di recovery.

Direzione di fix:

- Introdurre risultati espliciti dalle operazioni storage.
- Non mostrare successo se `_save()` fallisce.
- In caso di JSON corrotto, evitare sovrascritture automatiche e offrire esportazione/diagnostica del raw.
- Centralizzare backup pre-import e possibilmente snapshot locale prima di operazioni distruttive.

### CR-02 - Import JSON troppo permissivo

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: `app/js/storage.js:109`, `app/js/app.js:2699`

Problema:

- `importJSON()` valida solo che `data.spese` esista e sia un array.
- Non valida tipi, date, importi, id duplicati, campi mancanti, `tags`, `impostazioni`, versione schema.
- Un JSON con `importo` stringa puo arrivare fino a rendering come `s.importo.toFixed(2)`, causando errore runtime.
- Il JSON sostituisce i dati esistenti dopo conferma, ma senza normalizzazione o dry-run.

Direzione di fix:

- Aggiungere validazione e normalizzazione completa.
- Separare `parse/validate` da `commit`.
- Mostrare un riepilogo prima della sostituzione.
- Aggiungere `schemaVersion` nei backup.

### CR-03 - `app.js` monolitico

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `app/js/app.js:14`

Problema:

`App` contiene ancora molto: tema, navigazione, input, voce, apertura/chiusura modale, conferme, commit impostazioni/import-export, istanze grafici, toast e workaround mobile. Il rendering di filtri, timeline, statistiche, dropdown, tag, impostazioni, micro-interazioni della modale, decisioni dello stack UI, cleanup DOM puntuali, azioni impostazioni semplici e configurazione Chart.js e stato pero estratto in moduli dedicati.

Conseguenze:

- Ogni modifica rischia regressioni laterali.
- Stato UI e dominio sono mescolati.
- Le funzioni sono difficili da testare perche leggono/scrivono DOM e `localStorage`.
- I workaround mobile non sono isolati e diventano difficili da rimuovere.

Direzione di fix:

- Estrarre prima funzioni pure: date, filtri, aggregazioni statistiche, parser helper.
- Poi estrarre moduli UI: timeline, filters, modal, settings, stats.
- Tenere un orchestratore centrale piccolo, senza riscrivere tutta l'app in una volta.

### CR-04 - Back button/history state fragile

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `app/js/app.js:120`, `app/js/app.js:192`, `app/js/app.js:261`, `app/js/app.js:816`, `app/js/app.js:1190`, `app/js/app.js:1386`, `app/js/app.js:1899`

Problema:

La history e manipolata da molti punti: navigazione pagina, filtri, ricerca, input spesa, modale, dropdown, conferme. Ci sono flag come `_suppressNextPopstate`, `_modalInteractionActive`, `_filterSearchActive`, `_expenseInputActive`, `advancedFiltersOpen`.

Esempi concreti:

- `handlePopstate()` ora delega a `UIStack` la scelta dell'azione prioritaria, mentre `runHistoryAction()` e l'unico punto che chiama direttamente `history`.
- `toggleAdvancedFilters()` ora consuma la history entry quando chiude da bottone, ma il resto dello stack UI resta ancora distribuito.
- `closeModal()` puo fare `history.go(-2)` se crede che esista uno stato interazione.
- Blur di input e ricerca chiamano `history.back()` con timeout.
- Il singolo listener `popstate` deve interpretare molti stati impliciti.

Perche conta:

Questa e probabilmente la zona piu fragile lato mobile. Molti bug gia risolti negli appunti riguardano proprio back button, tastiera, modali e pannelli.

Direzione di fix:

- Creare un piccolo "UI stack manager" per stati sovrapposti: pagina, pannello filtri, ricerca, input, modale, dropdown, conferma.
- Definire regola unica: ogni `pushState` deve avere una chiusura simmetrica.
- Completato parzialmente: estratta in `UIStack` la decisione dell'azione da eseguire su `popstate`, con test sull'ordine di priorita.
- Completato parzialmente: push, replace, back e go sono descritti da azioni `UIStack` ed eseguiti da un solo helper in `app.js`.
- Aggiungere checklist manuale Android per ogni modifica.

### CR-05 - Parser e modifica importo possono registrare importi sbagliati

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: `app/js/parser.js:16`, `app/js/parser.js:21`, `app/js/app.js:1929`
- **Stato 2026-05-19**: mitigato per il parser di inserimento rapido e per la modifica importo con virgola.

Problemi:

- Il parser prendeva il primo intero nel testo. Esempi verificati:
  - `pizza 4 formaggi 8` diventa importo `4`, descrizione `Pizza formaggi 8`.
  - `pizza 4 formaggi 8 euro` diventa ancora importo `4`, perche manca pattern per interi seguiti da `euro`.
  - `2 caffe 3 euro` diventa importo `2`.
- In modifica spesa, `parseFloat('1,50')` produceva `1`, non `1.5`.

Aggiornamento:

- `app/js/parser.js` sceglie ora il candidato importo piu affidabile, privilegiando valuta esplicita, decimali e posizione finale.
- `saveEdit()` passa da `AppUI.parseAmountInput`, quindi accetta importi con virgola.
- `tests/run-tests.js` copre gli esempi ambigui sopra e il parsing importo del form.

Direzione di fix:

- Continuare ad aggiungere esempi reali al test runner se emergono nuovi input ambigui dall'uso quotidiano.

### CR-06 - Assenza di test automatici

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: repository

Problema:

Esiste un test harness leggero Node, ma il refactor tocchera ancora parti fragili non coperte automaticamente: history, modali, tastiera mobile e interazioni DOM.

Direzione di fix:

- Aggiungere test leggeri senza cambiare stack in modo pesante.
- Priorita test:
  - parser importi/tag/metodi/categorie;
  - storage load/save/import/export con localStorage mock;
  - filtri;
  - aggregazioni statistiche giornaliere/settimanali/mensili.
- Rimandare test E2E browser finche non sono chiari i flussi piu stabili.

### CR-07 - Offline/PWA/versioni controllate non ancora fondate

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `app/index.html:212`, `app/manifest.json:1`

Problema:

- Chart.js arriva da CDN.
- Non esiste service worker.
- Il manifest ha un'icona data URI minimale, non set completo 192/512.
- Non esiste una strategia per aggiornamenti controllati dall'utente o versioni parallele.

Direzione di fix:

- Prima progettare policy di versionamento e compatibilita dati.
- Poi aggiungere service worker con cache versionata.
- Valutare manifest release statico pubblicato dal maintainer.
- Evitare aggiornamenti automatici silenziosi se possono rompere dati o UX.

### CR-08 - CSV fragile e lossy

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `app/js/storage.js:90`, `app/js/storage.js:120`, `app/js/storage.js:159`

Problema:

- Export CSV non include `id`, `tags`, `creatoIl`, `modificatoIl`.
- Import CSV assegna sempre `tags: []`.
- Parser CSV custom non gestisce pienamente casi CSV complessi, come newline in campi quotati.
- `parseFloat(parts[2])` non gestisce importi con virgola decimale.

Direzione di fix:

- Definire CSV come formato lossy esplicito oppure estenderlo.
- Usare una funzione CSV piu robusta o almeno testare quote, virgole, righe vuote e decimali italiani.
- Mantenere JSON come backup completo.

### CR-09 - Rendering HTML e sanitizzazione incoerenti

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `app/js/app.js:293`, `app/js/app.js:1001`, `app/js/app.js:1027`, `app/js/app.js:1483`, `app/js/app.js:1969`, `app/js/app.js:2190`

Problema:

La UI usa molto `innerHTML`. Alcuni campi utente sono escapati con `esc()`, altri template oggi sono sicuri solo perche i dati arrivano da liste statiche o messaggi interni.

Rischio:

Quando categorie, metodi, preset o messaggi diventeranno personalizzabili, sara facile inserire un campo non escapato.

Direzione di fix:

- Rendere esplicite le funzioni di rendering sicure.
- Evitare `innerHTML` per messaggi dinamici o usare un helper unico.
- `showConfirm()` dovrebbe distinguere messaggio testuale da markup controllato.

### CR-10 - Manca schema dati versionato

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `app/js/storage.js:8`, `app/js/storage.js:26`

Problema:

Lo storage fa solo fallback minimo per `spese` e `impostazioni`. Non esistono `schemaVersion`, migrazioni, normalizzazione dei record o compatibilita dichiarata.

Perche conta:

La roadmap prevede cestino, ricorrenti, accrediti, categorie custom, colori categoria, filtri salvati e versioni controllate. Tutto questo richiede evoluzione dello schema.

Direzione di fix:

- Aggiungere `schemaVersion`.
- Normalizzare ogni spesa letta.
- Introdurre migrazioni idempotenti.
- Documentare compatibilita backup.

### CR-11 - CSS accoppiato a layout mobile e workaround

- **Gravita**: Media
- **Difficolta**: Alta
- **File**: `app/css/style.css:72`, `app/css/style.css:167`, `app/css/style.css:546`, `app/css/style.css:828`, `app/css/style.css:1030`, `app/css/style.css:1919`

Problema:

CSS e JS collaborano tramite fixed/sticky layout, z-index vicini, padding calcolati, classi globali (`no-scroll`, `expense-input-active`) e selettori moderni come `:has`.

Conseguenze:

- Piccole modifiche possono rompere scroll, tastiera o pannelli.
- PC e iOS possono divergere facilmente.
- Difficile capire quale regola risolve quale bug.

Direzione di fix:

- Documentare i contratti layout: header, main scrollabile, input bar, bottom nav, overlay.
- Ridurre classi globali e magic numbers.
- Creare test manuali visuali per Android, desktop e iOS quando disponibile.

### CR-12 - Letture/render ripetuti e prestazioni future

- **Gravita**: Media
- **Difficolta**: Bassa
- **File**: `app/js/app.js:481`, `app/js/app.js:500`, `app/js/app.js:939`

Problema:

Ogni cambio filtro puo:

- leggere `localStorage`;
- applicare filtri per aggiornare badge/info;
- renderizzare timeline o statistiche;
- riapplicare filtri.

Oggi va bene con pochi dati, ma puo diventare rumoroso quando le spese crescono.

Direzione di fix:

- Tenere una cache in memoria sincronizzata con storage.
- Calcolare una sola volta `allSpese` e `filtered` per ciclo render.
- Separare computazione da rendering DOM.

### CR-13 - Categorie/metodi troppo statici

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `app/js/categories.js:5`, `app/js/parser.js:76`

Problema:

- Categorie, emoji, keyword e id sono tutti nello stesso array statico.
- L'ordine alfabetico dipende ancora dal codice.
- Alcune keyword sono duplicate o sovrapposte.
- L'id `produttività` contiene caratteri accentati: funziona in `localStorage`, ma e meno comodo come slug stabile per backup/migrazioni.
- La categoria viene scelta con `indexOf`, quindi match parziali e collisioni sono possibili.

Direzione di fix:

- Separare definizione dominio da presentazione.
- Usare id stabili, preferibilmente ASCII.
- Ordinare in UI, non nel dato sorgente.
- Introdurre priorita/score keyword testabile.

### CR-14 - Manifest/PWA incompleti

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `app/manifest.json:12`, `app/index.html:10`

Problema:

Manifest minimale, icona data URI, nessun set icone PNG, nessun service worker, nessuna strategia cache.

Direzione di fix:

- Creare icone reali.
- Aggiungere service worker solo dopo avere deciso policy aggiornamenti.
- Verificare installazione su Android e comportamento GitHub Pages.

### CR-15 - Accessibilita e semantica migliorabili

- **Gravita**: Bassa
- **Difficolta**: Media
- **File**: `app/index.html:6`, `app/index.html:36`, `app/js/app.js:1477`

Problema:

- Viewport disabilita zoom (`user-scalable=no`).
- Alcuni controlli sono `textarea` usati come input/dropdown.
- I dropdown custom non espongono ruoli ARIA.
- Molti bottoni dinamici non hanno label descrittive.

Nota di progetto:

L'uso di `textarea` al posto di `input` in alcuni campi e intenzionale: serve a ridurre o evitare su mobile la sezione ingombrante di suggerimenti/autofill della tastiera, dove compaiono spesso mail, password e pagamenti. Non va quindi trattato come errore da correggere automaticamente, ma come tradeoff da preservare finche non esiste una soluzione migliore verificata su Android.

Direzione di fix:

- Non bloccare zoom se non strettamente necessario.
- Migliorare ruoli/label dei dropdown custom.
- Se si valuta `input` al posto di `textarea`, verificare prima che non riappaiano suggerimenti/autofill invasivi su mobile.

### CR-16 - Cleanup minori

- **Gravita**: Bassa
- **Difficolta**: Bassa
- **File**: `app/js/app.js:51`, `app/js/app.js:90`, `app/js/app.js:2181`, `app/css/style.css:1676`

Problemi:

- `_expenseScrollLockY` sembra inutilizzato.
- `hasNonDateFilters` viene calcolato ma non usato.
- `.stats-filter-note` sembra CSS residuo.
- Il numero versione `v2.3.4` e hardcoded nella UI.
- `resetFilters()` non rimuove necessariamente lo stato visuale `date-picked`.

Nota di progetto:

Il toggle tema nell'header e intenzionalmente temporaneo: cambia il tema per la sessione/uso corrente senza salvare l'impostazione. Il cambio stabile deve restare nella pagina impostazioni, dove viene usato `Storage.updateSettings`.

Direzione di fix:

- Cleanup dopo i fix piu importanti.
- Collegare versione a una sorgente unica quando si progettano release/versioni.

## Ordine di Refactor Consigliato

### Fase 0 - Canale stabile/dev sicuro

Stato: completata il 2026-05-15.

- Mantenere `main` come fonte della versione stabile usata quotidianamente.
- Usare `codex/refactor` come fonte della versione di sviluppo.
- Predisporre un link stabile e un link dev sempre distinguibili.
- Se stabile e dev sono servite dallo stesso dominio GitHub Pages, configurare storage key diverse.
- Implementazione iniziale: workflow GitHub Pages che pubblica `/`, `/stable/` e `/dev/`, con `spesa-tracker-data-dev` per la dev.
- Vedere `docs/DEPLOYMENT_STRATEGY.md`.

### Fase 1 - Protezione dati

- Completato il 2026-05-16: rendere `Storage` esplicito nei successi/fallimenti.
- Completato il 2026-05-16: validare import JSON/CSV con preview prima del commit.
- Completato il 2026-05-16: introdurre schema versionato e normalizzazione.
- Completato il 2026-05-16: aggiungere test storage/parser.

### Fase 2 - Estrazione logica pura e rendering testabile

- Completato parzialmente il 2026-05-16: estratti filtri, date e aggregazioni statistiche in `app/js/filters.js` e `app/js/stats.js`.
- Completato parzialmente il 2026-05-16: aggiunti test per filtri e aggregazioni statistiche.
- Completato parzialmente il 2026-05-18: estratti helper UI e rendering di filtri, timeline e statistiche in `ui-utils.js`, `filter-view.js`, `timeline-view.js` e `stats-view.js`.
- Completato parzialmente il 2026-05-19: estratta configurazione Chart.js statistiche in `stats-charts.js`.
- Completato parzialmente il 2026-05-18: estratti rendering dropdown e logica suggerimenti tag in `modal-view.js`.
- Completato parzialmente il 2026-05-19: estratti eventi dropdown/tag della modale in `modal-interactions.js`.
- Completato parzialmente il 2026-05-18: estratti rendering impostazioni e preview import in `settings-view.js`.
- Completato parzialmente il 2026-05-19: rafforzato parsing importi nell'inserimento rapido con test sugli input ambigui.
- Completato parzialmente il 2026-05-19: estratta la decisione `popstate`/back button in `ui-stack.js`, con test unitari sull'ordine di chiusura.
- Completato parzialmente il 2026-05-19: centralizzata l'esecuzione `history` in `app.js#runHistoryAction`, usando azioni generate da `ui-stack.js`.
- Completato parzialmente il 2026-05-19: estratte decisioni import/export impostazioni in `settings-actions.js`.
- Completato parzialmente il 2026-05-19: isolati cleanup DOM minimi collegati al `popstate` in `ui-stack-effects.js`.
- Restano da estrarre/parzialmente rafforzare altre funzioni pure ancora immerse nei flussi UI.
- Ridurre letture ripetute di `localStorage`.

### Fase 3 - UI stack e mobile behavior

- Disegnare un modello unico per pagina/pannello/modale/conferma/input attivo.
- Sostituire gradualmente push/back sparsi.
- Completato parzialmente il 2026-05-18: resa simmetrica la history dei filtri avanzati e separato il salvataggio scroll per pagina.
- Completato parzialmente il 2026-05-19: centralizzata la decisione del `popstate` in `ui-stack.js`.
- Completato parzialmente il 2026-05-19: rimosse le chiamate dirette a `history` dai flussi UI, lasciandole concentrate in `runHistoryAction`.
- Completato parzialmente il 2026-05-19: spostati i cleanup DOM piu piccoli del popstate in `ui-stack-effects.js`.
- Verificare ogni passaggio su Android.

### Fase 4 - Modularizzazione UI

- Spezzare `app.js` in moduli coerenti.
- Completato parzialmente il 2026-05-19: rendering di filtri, timeline, statistiche, dropdown, tag, impostazioni, configurazione grafici, micro-interazioni dropdown/tag modale e cleanup DOM puntuali spostati fuori da `app.js`.
- Lasciare un orchestratore centrale piccolo.
- Non cambiare UX durante l'estrazione.

### Fase 5 - Offline e versioni

- Progettare manifest release e policy aggiornamenti.
- Rendere Chart.js locale.
- Introdurre service worker con cache versionata.
- Solo dopo, aggiungere UI aggiornamenti controllati.

## Checklist Manuale Minima

Da usare dopo modifiche a UI o storage:

- Inserire spesa con importo decimale punto e virgola.
- Inserire frasi ambigue con numeri multipli.
- Modificare importo usando virgola.
- Aprire/chiudere filtri base e avanzati.
- Usare back button con tastiera aperta, modale aperta, dropdown aperto e conferma aperta.
- Importare JSON valido.
- Provare import JSON malformato.
- Esportare JSON e reimportarlo.
- Aprire statistiche con e senza rete quando Chart.js verra reso locale/offline.
- Verificare Android come piattaforma primaria.
