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
| Timeline e filtri | `timeline/timeline-view.js`, `timeline/timeline-controller.js`, `timeline/timeline-selection-controller.js`, `domain/filters.js`, `filters/filter-view.js`, `filters/filter-controller.js` | Rendering timeline, selezione multipla volatile, modello filtrato, pannello filtri, slider, badge e ricerca. |
| Statistiche | `domain/stats.js`, `stats/stats-view.js`, `stats/stats-charts.js`, `stats/stats-controller.js` | Periodi, aggregazioni, template statistiche e configurazione Chart.js. |
| Modale modifica | `modal/modal-view.js`, `modal/modal-form-controller.js`, `modal/modal-mobile-controller.js`, `modal/modal-interactions.js`, `modal/modal-controller.js` | Form modifica, dropdown, tag, focus/picker mobile, viewport/tastiera e lifecycle modale. |
| Navigazione e stack UI | `navigation/navigation-controller.js`, `navigation/ui-stack.js`, `navigation/history-controller.js`, `navigation/ui-stack-effects.js`, `navigation/ui-stack-controller.js` | Navigazione pagine, scroll per pagina, decisioni `popstate`, esecuzione history e cleanup DOM. |
| Impostazioni e feedback | `settings/settings-view.js`, `settings/settings-actions.js`, `settings/settings-controller.js`, `ui/confirm-dialog.js`, `ui/confirm-controller.js`, `ui/download-controller.js`, `ui/theme-controller.js`, `ui/toast-controller.js` | Import/export, conferme, download, tema, toast e pagina impostazioni. |
| Helper UI | `ui/ui-utils.js` | Formattazione importi/date, escape HTML e parsing importi nei form. |

Chart.js e incluso localmente in `app/vendor/chart.umd.min.js`. Il codice sorgente `app/` registra `stable-launch-service-worker.js` solo quando e servito da `/stable/`; il service worker ha scope `./`, cachea gli asset della stable scoped e serve a far partire la preferenza di avvio verso una release scelta anche offline. `/` e `/dev/` restano senza controllo offline diretto.

La baseline PWA/offline e completata: `releases.json` descrive le versioni pubblicate e `releases/v2026.05.30/` contiene una baseline stabile versionata, verificata dal maintainer su Android. I manifest dichiarano `scope` esplicito; la release `v2026.05.30` registra `service-worker.js` solo dal proprio path e usa una cache offline namespaced per gli asset locali della release. Le impostazioni leggono `releases.json` e mostrano una sezione `Versioni` con un pulsante che apre una finestra dedicata per installare `stable/latest` o una release consigliata, senza applicare aggiornamenti automatici. Quando l'utente sceglie una versione, il path scelto (`stable/` o `releases/v.../`) viene salvato come preferenza di avvio; prima della navigazione vengono consumate le entry history interne della finestra versioni e della pagina impostazioni, poi la pagina corrente viene sostituita. Cosi il back non puo riaprire una versione precedente e non trova stati interni invisibili da chiudere. Se una vecchia pagina torna da bfcache, il controllo `pageshow` la rimanda alla versione scelta. Se la PWA e installata da `/stable/`, il launcher offline permette alla stable scoped di avviarsi anche offline quanto basta per leggere la preferenza e reindirizzare alla release.

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

La cancellazione multipla dalla timeline crea uno snapshot locale prima del commit. JSON e CSV possono essere generati anche da un subset temporaneo di spese selezionate senza cambiare schema dati.

JSON e il backup completo. CSV e supportato per interoperabilita con fogli di calcolo e preserva i campi principali attuali, ma resta meno adatto a futuri dati complessi.

## Funzioni Implementate

### Inserimento Rapido

L'utente scrive testo libero nella barra inferiore. Il parser estrae importo, tag, metodo e categoria probabile; se la descrizione resta vuota usa `Spesa`.

Sono gestiti importi con punto, virgola, valuta esplicita e frasi con piu numeri, per esempio `pizza 4 formaggi 8 euro`. La dettatura vocale usa `SpeechRecognition` o `webkitSpeechRecognition` quando disponibili.

### Timeline

La timeline mostra spese raggruppate per giorno, ordinate dalla piu recente. Il riepilogo mostra totali di oggi, settimana e mese; con filtri attivi mostra anche il riepilogo filtrato. Le card aprono la modale di modifica.

Una pressione lunga su una card entra in modalita selezione e seleziona quella spesa. In modalita selezione il click sulle card alterna selezionata/non selezionata, il riepilogo mostra numero e totale delle spese selezionate, il pulsante cerca resta nella posizione normale e il toggle tema dell'header viene sostituito dal toggle `Seleziona tutte`. Le azioni copia negli appunti, export JSON/CSV ed eliminazione con conferma vivono nella bottom nav come set dedicato; i pulsanti Timeline, Statistiche e Impostazioni restano raggiungibili con uno swipe orizzontale che cambia l'intero set di tre bottoni, senza scroll parziale. La modalita resta visibile anche passando alle statistiche, con header e barra pagine evidenziati, ma `Seleziona tutte` resta disponibile solo in timeline. `Seleziona tutte` lavora come toggle sul filtrato corrente: aggiunge le spese filtrate non ancora selezionate, oppure deseleziona solo quelle filtrate quando sono gia tutte selezionate, senza toccare eventuali spese selezionate fuori filtro. Durante la modalita selezione il pannello filtri include anche il filtro speciale `Selezionate`, disponibile in timeline e statistiche, che limita le viste allo snapshot di spese selezionate nel momento in cui il filtro viene attivato; se una spesa viene poi deselezionata resta nel filtrato finche il filtro non viene spento e riacceso.

### Filtri

I filtri sono condivisi tra timeline e statistiche:

- ricerca su descrizione, nota e tag;
- range data;
- importo minimo/massimo;
- categorie;
- metodi di pagamento.
- selezionate, disponibile solo durante la modalita selezione timeline.

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
- finestra versioni aperta;
- interazione interna della modale;
- modale;
- ricerca filtri;
- input rapido attivo;
- pannello filtri completamente aperto;
- pannello filtri;
- modalita selezione timeline;
- pagina corrente tornando alla timeline.
- filtri attivi, resettandoli prima del back finale che puo chiudere l'app.

Le decisioni sono in `ui-stack.js`; l'esecuzione concreta di push/back/go/replace e in `history-controller.js`.

### Statistiche

Le statistiche supportano periodo settimana, mese, anno e custom. Mostrano totale, numero spese, media giornaliera, grafico categorie, grafico temporale, dettaglio categorie e top spese. I filtri non-data si applicano anche alle statistiche.

La pagina statistiche e di sola lettura: oggi non apre direttamente la modifica di una spesa.

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- export JSON/CSV;
- import JSON/CSV con preview;
- finestra versioni alimentata da `releases.json`, con installazione manuale di `stable/latest` o della release scelta;
- scelta esplicita tra aggiungere e sostituire;
- snapshot locale prima di import in aggiunta, import in sostituzione, cambio versione o cancellazione completa;
- snapshot locale prima di cancellazione multipla dalla timeline;
- ripristino dall'ultimo snapshot locale disponibile;
- export raw se lo storage locale non e leggibile;
- info su numero spese, periodo coperto e spazio usato;
- versione/canale corrente visibili nel footer delle impostazioni;
- cancellazione completa con conferma.
- opzione nella conferma di cancellazione completa per rimuovere anche lo snapshot locale.

Il toggle tema nell'header resta temporaneo; il tema persistente si cambia nelle impostazioni.

## Test

Il runner locale e:

```powershell
node tests/run-tests.js
```

Copre storage, parser, filtri, statistiche, cache/query, refresh, input rapido, timeline, selezione timeline, filtri UI, modale, impostazioni, conferme, tema, toast, stack UI/history e wiring applicativo.

Mancano ancora test automatici su browser mobile reale, tastiera Android reale e interazioni DOM complete.

## Limiti Noti

- `/` e `/dev/` non registrano service worker; `/stable/` registra solo un launcher scoped, non una release immutabile.
- La prima cache offline versionata esiste solo in `releases/v2026.05.30/`; le prossime release richiederanno una nuova cartella immutabile e un nuovo cache namespace.
- La UI versioni copre il flusso guidato minimo; eventuali migrazioni dati tra versioni andranno progettate quando cambiera lo schema.
- Categorie e metodi sono statici.
- Non esistono ancora cestino, swipe su card, formati TSV/Markdown per la copia o finestra export custom completa.
- La pagina statistiche non permette ancora di aprire/modificare una spesa.
- Desktop e iOS sono usabili ma meno rifiniti dell'esperienza Android.
- Accessibilita e semantica dei controlli custom sono migliorabili.
