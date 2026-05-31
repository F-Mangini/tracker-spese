# Stato Corrente

Questo documento descrive lo stato tecnico implementato oggi. Non e un diario del refactor: per quello vedere `docs/REFACTORING_SUMMARY.md`.

## Sintesi

Where's My Money? e una web app statica, local-first, senza backend e senza build system. I dati vivono in `localStorage`; l'app e pensata prima di tutto per uso quotidiano su Android.

Lo spacchettamento primario di `app/js/core/app.js` e completato. `app.js` resta il punto di boot e orchestrazione sottile; stato iniziale, wiring, rendering, controller, logica dati e workaround principali sono in moduli dedicati, organizzati in cartelle per area dentro `app/js/`.

## Architettura

| Area | File principali | Responsabilita |
| --- | --- | --- |
| Boot e stato | `core/app.js`, `core/app-state.js`, `core/app-wiring.js`, `core/app-wiring-modal.js` | Avvio app, stato iniziale, option factory e collegamento tra controller, stato condiviso, history e DOM. |
| Config e dominio statico | `core/config.js`, `domain/categories.js` | Config runtime minima, chiave storage configurabile, categorie e metodi statici. |
| Persistenza e dati derivati | `data/storage.js`, `data/expense-store.js`, `domain/expense-query.js`, `core/app-refresh.js` | Storage protetto, cache UI, modelli filtrati/statistici e policy di refresh post-commit. |
| Inserimento e spese | `domain/parser.js`, `domain/expense-actions.js`, `input/expense-submit-controller.js`, `input/expense-input-controller.js`, `input/input-bar-controller.js` | Parser testuale, add/update/delete, submit rapido, dettatura, focus mobile e layout barra input. |
| Timeline e filtri | `timeline/timeline-view.js`, `timeline/timeline-controller.js`, `domain/filters.js`, `filters/filter-view.js`, `filters/filter-controller.js` | Rendering timeline, modello filtrato, pannello filtri, slider, badge e ricerca. |
| Statistiche | `domain/stats.js`, `stats/stats-view.js`, `stats/stats-charts.js`, `stats/stats-controller.js` | Periodi, aggregazioni, template statistiche e configurazione Chart.js. |
| Modale modifica | `modal/modal-view.js`, `modal/modal-form-controller.js`, `modal/modal-mobile-controller.js`, `modal/modal-interactions.js`, `modal/modal-controller.js` | Form modifica, dropdown, tag, focus/picker mobile, viewport/tastiera e lifecycle modale. |
| Navigazione e stack UI | `navigation/navigation-controller.js`, `navigation/ui-stack.js`, `navigation/history-controller.js`, `navigation/ui-stack-effects.js`, `navigation/ui-stack-controller.js` | Navigazione pagine, scroll per pagina, decisioni `popstate`, esecuzione history e cleanup DOM. |
| Impostazioni e feedback | `settings/settings-view.js`, `settings/settings-actions.js`, `settings/settings-controller.js`, `ui/confirm-dialog.js`, `ui/confirm-controller.js`, `ui/download-controller.js`, `ui/theme-controller.js`, `ui/toast-controller.js` | Import/export, conferme, download, tema, toast e pagina impostazioni. |
| Helper UI | `ui/ui-utils.js` | Formattazione importi/date, escape HTML e parsing importi nei form. |

Chart.js e incluso localmente in `app/vendor/chart.umd.min.js`. Il codice sorgente `app/` non registra un service worker, quindi `/`, `/stable/` e `/dev/` restano senza controllo offline diretto.

La fase PWA ha una prima struttura di release statiche: `releases.json` descrive le versioni pubblicate e `releases/v2026.05.30/` contiene una baseline stabile versionata. I manifest dichiarano `scope` esplicito; la release `v2026.05.30` registra `service-worker.js` solo dal proprio path e usa una cache offline namespaced per gli asset locali della release. Le impostazioni leggono `releases.json` e mostrano una sezione `Versioni` con link a `stable/latest` e alla release consigliata, senza applicare aggiornamenti automatici.

## Dati Locali

La chiave stabile e `spesa-tracker-data`. Puo essere sovrascritta da `window.SPESA_TRACKER_CONFIG.storageKey`; la dev pubblicata accanto alla stabile usa una chiave separata.

Struttura principale:

```js
{
  schemaVersion: 1,
  spese: [],
  impostazioni: {
    tema: "auto",
    valuta: "EUR",
    simbolo: "\u20ac",
    ultimoBackup: null
  }
}
```

Una spesa contiene normalmente:

- `id`;
- `importo`;
- `descrizione`;
- `categoria`;
- `metodo`;
- `data`;
- `tags`;
- `nota`;
- `creatoIl` e `modificatoIl`.

`data/storage.js` normalizza letture e import: importi numerici, date valide, tag senza `#`, impostazioni con fallback e id duplicati rigenerati. Le scritture ritornano risultati espliciti `{ success, ... }`.

Se il JSON locale e corrotto o incompatibile, i nuovi salvataggi vengono bloccati per evitare perdita dati silenziosa. La pagina impostazioni permette l'export del raw.

JSON e il backup completo. CSV e supportato per interoperabilita con fogli di calcolo e preserva i campi principali attuali, ma resta meno adatto a futuri dati complessi.

## Funzioni Implementate

### Inserimento Rapido

L'utente scrive testo libero nella barra inferiore. Il parser estrae importo, tag, metodo e categoria probabile; se la descrizione resta vuota usa `Spesa`.

Sono gestiti importi con punto, virgola, valuta esplicita e frasi con piu numeri, per esempio `pizza 4 formaggi 8 euro`. La dettatura vocale usa `SpeechRecognition` o `webkitSpeechRecognition` quando disponibili.

### Timeline

La timeline mostra spese raggruppate per giorno, ordinate dalla piu recente. Il riepilogo mostra totali di oggi, settimana e mese; con filtri attivi mostra anche il riepilogo filtrato. Le card aprono la modale di modifica.

### Filtri

I filtri sono condivisi tra timeline e statistiche:

- ricerca su descrizione, nota e tag;
- range data;
- importo minimo/massimo;
- categorie;
- metodi di pagamento.

Il pannello ha uno stato compatto e uno completamente aperto. I contenuti dei filtri restano gli stessi in entrambi gli stati: nel pannello compatto lo spazio scrollabile visibile e ridotto alla zona della ricerca e il resto dei controlli si raggiunge scrollando internamente, senza mostrare la barra laterale di scroll. La barra riassuntiva inferiore del pannello resta fuori dallo scroll ed e sempre visibile quando i filtri sono aperti. Il badge del pulsante filtri mostra il numero di filtri attivi.

Il riepilogo nella tendina filtri viene aggiornato anche dopo aggiunta, modifica o cancellazione di spese, non solo quando cambiano i filtri. Quando il pannello filtri e completamente aperto, la barra di inserimento rapido viene nascosta temporaneamente e resta nascosta anche se si passa alle statistiche e poi si torna alla timeline senza chiudere i filtri; su desktop questo stato non blocca lo scroll della pagina sottostante.

L'area interna del pannello filtri resta scrollabile anche nello stato compatto; le barre di scroll laterali restano nascoste. Se una ricerca filtri e attiva e l'utente tocca un controllo interno dell'app, per esempio una spesa o il pulsante di espansione del pannello filtri, l'interazione di ricerca viene rilasciata prima del blur della tastiera senza consumare subito lo stato history del pannello; quello stato viene ripulito quando si chiudono i filtri, cosi i back successivi chiudono eventuali pannelli/modali, filtri e infine l'app senza passaggi invisibili.

### Modifica Spesa

La modale modifica importo, descrizione, data, ora, categoria, metodo, tag e nota. Categoria, metodo e tag usano dropdown ricercabili custom. La cancellazione richiede conferma.

Su desktop, il tasto Invio nei campi testuali della modale conferma la modifica. Nei dropdown ricercabili e nel campo tag, Invio resta dedicato alla selezione del suggerimento o alla creazione del tag.

I workaround mobile su focus, picker nativi, selection cleanup, viewport e tastiera sono isolati nei moduli modale/mobile e vanno trattati con cautela.

### Navigazione e Mobile

Le pagine principali sono Timeline, Statistiche e Impostazioni. Lo scroll e ricordato separatamente per pagina.

Il back button chiude, in ordine di priorita:

- conferma aperta;
- interazione interna della modale;
- modale;
- ricerca filtri;
- input rapido attivo;
- pannello filtri completamente aperto;
- pannello filtri;
- pagina corrente tornando alla timeline.

Le decisioni sono in `ui-stack.js`; l'esecuzione concreta di push/back/go/replace e in `history-controller.js`.

### Statistiche

Le statistiche supportano periodo settimana, mese, anno e custom. Mostrano totale, numero spese, media giornaliera, grafico categorie, grafico temporale, dettaglio categorie e top spese. I filtri non-data si applicano anche alle statistiche.

La pagina statistiche e di sola lettura: oggi non apre direttamente la modifica di una spesa.

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- export JSON/CSV;
- import JSON/CSV con preview;
- lista versioni da `releases.json` con apertura manuale di `stable/latest` o della release scelta;
- scelta esplicita tra aggiungere e sostituire;
- snapshot locale prima di sostituzione o cancellazione completa;
- export raw se lo storage locale non e leggibile;
- info su numero spese, periodo coperto e spazio usato;
- versione/canale corrente visibili nel footer delle impostazioni;
- cancellazione completa con conferma.

Il toggle tema nell'header resta temporaneo; il tema persistente si cambia nelle impostazioni.

## Test

Il runner locale e:

```powershell
node tests/run-tests.js
```

Copre storage, parser, filtri, statistiche, cache/query, refresh, input rapido, timeline, filtri UI, modale, impostazioni, conferme, tema, toast, stack UI/history e wiring applicativo.

Mancano ancora test automatici su browser mobile reale, tastiera Android reale e interazioni DOM complete.

## Limiti Noti

- `/`, `/stable/` e `/dev/` non registrano ancora service worker.
- La prima cache offline versionata esiste solo in `releases/v2026.05.30/` e richiede ancora verifica manuale Android.
- La UI versioni e minima: apre le release pubblicate, ma non gestisce ancora un flusso guidato di aggiornamento/applicazione.
- Categorie e metodi sono statici.
- Non esistono ancora cestino, selezione multipla o azioni bulk.
- La pagina statistiche non permette ancora di aprire/modificare una spesa.
- Desktop e iOS sono usabili ma meno rifiniti dell'esperienza Android.
- Accessibilita e semantica dei controlli custom sono migliorabili.
