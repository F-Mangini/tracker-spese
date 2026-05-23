# Stato Corrente

Questo documento descrive lo stato tecnico implementato oggi. Non e un diario del refactor: per quello vedere `docs/REFACTORING_SUMMARY.md`.

## Sintesi

Where's My Money? e una web app statica, local-first, senza backend e senza build system. I dati vivono in `localStorage`; l'app e pensata prima di tutto per uso quotidiano su Android.

Lo spacchettamento primario di `app/js/app.js` e completato. `app.js` resta il punto di boot e orchestrazione sottile; stato iniziale, wiring, rendering, controller, logica dati e workaround principali sono in moduli dedicati.

## Architettura

| Area | File principali | Responsabilita |
| --- | --- | --- |
| Boot e stato | `app.js`, `app-state.js`, `app-wiring.js`, `app-wiring-modal.js` | Avvio app, stato iniziale, option factory e collegamento tra controller, stato condiviso, history e DOM. |
| Config e dominio statico | `config.js`, `categories.js` | Config runtime minima, chiave storage configurabile, categorie e metodi statici. |
| Persistenza e dati derivati | `storage.js`, `expense-store.js`, `expense-query.js`, `app-refresh.js` | Storage protetto, cache UI, modelli filtrati/statistici e policy di refresh post-commit. |
| Inserimento e spese | `parser.js`, `expense-actions.js`, `expense-submit-controller.js`, `expense-input-controller.js`, `input-bar-controller.js` | Parser testuale, add/update/delete, submit rapido, dettatura, focus mobile e layout barra input. |
| Timeline e filtri | `timeline-view.js`, `timeline-controller.js`, `filters.js`, `filter-view.js`, `filter-controller.js` | Rendering timeline, modello filtrato, pannello filtri, slider, badge e ricerca. |
| Statistiche | `stats.js`, `stats-view.js`, `stats-charts.js`, `stats-controller.js` | Periodi, aggregazioni, template statistiche e configurazione Chart.js. |
| Modale modifica | `modal-view.js`, `modal-form-controller.js`, `modal-mobile-controller.js`, `modal-interactions.js`, `modal-controller.js` | Form modifica, dropdown, tag, focus/picker mobile, viewport/tastiera e lifecycle modale. |
| Navigazione e stack UI | `navigation-controller.js`, `ui-stack.js`, `history-controller.js`, `ui-stack-effects.js`, `ui-stack-controller.js` | Navigazione pagine, scroll per pagina, decisioni `popstate`, esecuzione history e cleanup DOM. |
| Impostazioni e feedback | `settings-view.js`, `settings-actions.js`, `settings-controller.js`, `confirm-dialog.js`, `confirm-controller.js`, `download-controller.js`, `theme-controller.js`, `toast-controller.js` | Import/export, conferme, download, tema, toast e pagina impostazioni. |
| Helper UI | `ui-utils.js` | Formattazione importi/date, escape HTML e parsing importi nei form. |

Chart.js e ancora caricato da CDN in `app/index.html`; non esiste ancora un service worker.

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

`storage.js` normalizza letture e import: importi numerici, date valide, tag senza `#`, impostazioni con fallback e id duplicati rigenerati. Le scritture ritornano risultati espliciti `{ success, ... }`.

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

Il pannello ha sezione base e avanzata. Il badge del pulsante filtri mostra il numero di filtri attivi.

### Modifica Spesa

La modale modifica importo, descrizione, data, ora, categoria, metodo, tag e nota. Categoria, metodo e tag usano dropdown ricercabili custom. La cancellazione richiede conferma.

I workaround mobile su focus, picker nativi, selection cleanup, viewport e tastiera sono isolati nei moduli modale/mobile e vanno trattati con cautela.

### Navigazione e Mobile

Le pagine principali sono Timeline, Statistiche e Impostazioni. Lo scroll e ricordato separatamente per pagina.

Il back button chiude, in ordine di priorita:

- conferma aperta;
- interazione interna della modale;
- modale;
- ricerca filtri;
- input rapido attivo;
- filtri avanzati;
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
- scelta esplicita tra aggiungere e sostituire;
- snapshot locale prima di sostituzione o cancellazione completa;
- export raw se lo storage locale non e leggibile;
- info su numero spese, periodo coperto e spazio usato;
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

- Non c'e ancora service worker: l'app non e pienamente offline.
- Chart.js dipende dalla rete al primo caricamento.
- Non esiste ancora un sistema di versioni installabili in parallelo o aggiornamenti scelti dall'utente.
- Categorie e metodi sono statici.
- Non esistono ancora cestino, selezione multipla o azioni bulk.
- La pagina statistiche non permette ancora di aprire/modificare una spesa.
- Desktop e iOS sono usabili ma meno rifiniti dell'esperienza Android.
- Accessibilita e semantica dei controlli custom sono migliorabili.
