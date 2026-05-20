# Stato Corrente

Questo documento descrive lo stato reale della codebase al momento dell'avvio del refactor. Serve come riferimento tecnico leggero: abbastanza dettagliato da orientare le modifiche, non cosi formale da diventare un peso.

## Architettura

Where's My Money? e una web app statica, senza build system e senza framework.

- `app/index.html` definisce la struttura dell'app, carica Chart.js da CDN e include gli script locali.
- `app/css/style.css` contiene tutto lo stile, incluse variabili tema, layout mobile, modali, filtri, timeline, statistiche e impostazioni.
- `app/js/config.js` contiene configurazione runtime minima, inclusa la chiave `localStorage`.
- `app/js/categories.js` contiene categorie e metodi di pagamento statici.
- `app/js/confirm-dialog.js` contiene rendering e wiring del dialog riusabile per scelte e conferme.
- `app/js/expense-actions.js` contiene operazioni spesa testabili per input rapido, modifica ed eliminazione tramite adapter `Parser`/`Storage`.
- `app/js/expense-store.js` contiene una cache leggera delle letture spese per la UI, invalidata dopo scritture, import/cancellazione e cambi `storage` da altri contesti.
- `app/js/expense-query.js` contiene modelli derivati testabili per filtri, statistiche e riepiloghi, cosi badge filtri, timeline e pagina statistiche possono riusare gli stessi calcoli preparati.
- `app/js/app-refresh.js` contiene la policy di aggiornamento viste dopo cambi dati: invalidazione cache, slider filtri, timeline, statistiche e impostazioni quando richieste.
- `app/js/expense-input-controller.js` contiene il wiring dell'input rapido: touch/click, invio da tastiera, focus/blur e dettatura vocale tramite hook verso `app.js`.
- `app/js/input-bar-controller.js` contiene il layout mobile della barra di inserimento: inset tastiera da `visualViewport`, padding del contenuto, RAF e listener resize.
- `app/js/parser.js` interpreta l'input testuale e crea una spesa.
- `app/js/filters.js` contiene la logica pura dei filtri condivisi da timeline e statistiche.
- `app/js/stats.js` contiene date, riepiloghi e aggregazioni statistiche testabili senza DOM.
- `app/js/ui-utils.js` contiene helper UI piccoli per formattazione, escape HTML, date input e parsing importi nei form.
- `app/js/filter-view.js` contiene rendering e micro-logica UI del pannello filtri, inclusi chip, riepilogo e soglia slider.
- `app/js/filter-controller.js` contiene wiring del pannello filtri: ricerca, chip, date, slider, badge, reset e apertura/chiusura base/avanzata tramite hook verso `app.js`.
- `app/js/timeline-view.js` contiene il rendering testabile di riepilogo timeline, gruppi giorno e card spesa.
- `app/js/timeline-controller.js` contiene wiring della timeline: stato vuoto, riepilogo, gruppi giorno, nuova card evidenziata e click per aprire la modifica.
- `app/js/stats-view.js` contiene il rendering testabile della pagina statistiche, separato dai grafici Chart.js.
- `app/js/stats-charts.js` contiene palette, colori tema e configurazione Chart.js per i grafici statistiche.
- `app/js/stats-controller.js` contiene wiring della pagina statistiche, periodo, navigazione periodo e creazione/distruzione grafici.
- `app/js/theme-controller.js` contiene applicazione tema, tema automatico e toggle temporaneo dell'header.
- `app/js/toast-controller.js` contiene visualizzazione, timer e posizionamento dei toast sopra la barra di inserimento quando serve.
- `app/js/modal-view.js` contiene rendering e logica pura per dropdown ricercabili e suggerimenti tag nella modale.
- `app/js/modal-form-controller.js` contiene popolamento, lettura e micro-eventi dei campi del form di modifica.
- `app/js/modal-mobile-controller.js` contiene focus, picker nativi, pulizia della selezione, stato history di interazione e watcher viewport/tastiera collegati alla modale.
- `app/js/modal-interactions.js` contiene eventi e micro-stato dei dropdown ricercabili e dell'input tag della modale.
- `app/js/modal-controller.js` contiene il ciclo di vita della modale di modifica: init eventi, apertura, chiusura, lettura, salvataggio e conferma eliminazione tramite hook verso `app.js`.
- `app/js/navigation-controller.js` contiene wiring della navigazione principale, sincronizzazione DOM pagina/nav, salvataggio e ripristino scroll per pagina.
- `app/js/settings-view.js` contiene rendering della pagina impostazioni e del messaggio di preview import.
- `app/js/settings-actions.js` contiene decisioni e orchestrazione testabile dei flussi impostazioni, usando `Storage` come adapter passato da `app.js`.
- `app/js/settings-controller.js` contiene wiring della pagina impostazioni e collega view, actions e hook di `app.js`.
- `app/js/ui-stack.js` contiene le decisioni pure per l'ordine di chiusura `popstate`/back button.
- `app/js/ui-stack-effects.js` contiene cleanup DOM piccoli usati dallo stack UI durante `popstate`.
- `app/js/ui-stack-controller.js` contiene il glue applicativo dello stack UI/back button: snapshot stato, applicazione azioni `popstate` e stati interni modale tramite hook verso `app.js`.
- `app/js/storage.js` gestisce persistenza, import/export e utility dati.
- `app/js/app.js` contiene stato UI, eventi generali, orchestrazione dei moduli, istanze Chart.js e workaround mobile.

La struttura attuale resta intenzionalmente semplice. `app.js` e ancora il centro di orchestrazione generale, stato condiviso, storage e history concreta. Le estrazioni hanno pero spostato logica pura, helper di formattazione, rendering UI, azioni spesa, cache letture spese, query filtrate/statistiche/riepiloghi, refresh viste dopo cambio dati, wiring dell'input rapido, layout della barra input mobile, navigazione, filtri, timeline, tema, toast, statistiche/grafici, form, focus/mobile, micro-interazioni e lifecycle della modale, flussi impostazioni, dialog conferma, decisioni/glue dello stack UI e cleanup DOM puntuali in moduli separati.

Per la mappa dettagliata dei rischi tecnici e dell'ordine consigliato del refactor, vedere `docs/CODE_REVIEW.md`.

## Dati Locali

I dati sono salvati in `localStorage` con chiave `spesa-tracker-data`.

La chiave puo essere sovrascritta da `window.SPESA_TRACKER_CONFIG.storageKey`. Questo serve per pubblicare una versione dev sullo stesso dominio GitHub Pages senza condividere i dati reali della stabile.

La struttura principale e:

```js
{
  schemaVersion: 1,
  spese: [],
  impostazioni: {
    tema: "auto",
    valuta: "EUR",
    simbolo: "€",
    ultimoBackup: null
  }
}
```

`schemaVersion` e stato introdotto all'avvio del refactor dati. I backup senza `schemaVersion` vengono trattati come schema `1`, cosi i backup esistenti restano importabili.

Una spesa contiene normalmente:

- `id`: identificatore generato localmente;
- `importo`: numero con due decimali;
- `descrizione`: testo principale;
- `categoria`: id categoria;
- `metodo`: id metodo di pagamento;
- `data`: data ISO;
- `tags`: array di tag senza `#`;
- `nota`: testo libero;
- `creatoIl` e `modificatoIl`: date ISO gestite dallo storage.

`storage.js` normalizza le spese lette o importate prima di salvarle: importi numerici, date valide, tag senza `#`, impostazioni con fallback e id duplicati rigenerati. Le operazioni di scrittura ritornano risultati espliciti `{ success, ... }`; la UI mostra successo solo se il commit in `localStorage` e riuscito.

La UI legge le spese tramite `app/js/expense-store.js`, che mantiene una cache in memoria della lista gia normalizzata da `Storage.getSpese()`. La cache viene invalidata dopo inserimento, modifica, eliminazione, import/cancellazione dati e quando il browser segnala un evento `storage` sulla stessa chiave o una pulizia completa. Questo riduce letture ripetute di `localStorage` senza cambiare il formato dati.

Se il JSON salvato in `localStorage` e corrotto o incompatibile, i nuovi salvataggi vengono bloccati per evitare sovrascritture silenziose. In impostazioni compare un guardrail per esportare i dati grezzi prima di intervenire.

JSON e il formato di backup completo dello stato oggi esistente, incluse le `impostazioni`. CSV e pensato per interoperabilita con fogli di calcolo; ora esporta anche `id`, `tags`, `creatoIl` e `modificatoIl`, pur restando meno espressivo del JSON per futuri dati complessi.

## Funzioni Implementate

### Inserimento spese

L'utente inserisce testo libero nella barra inferiore. Il parser estrae importo, tag, metodo di pagamento e categoria probabile. Se la descrizione resta vuota, viene usata `Spesa`.

Sono supportati importi in forme come `1.50`, `1,50`, `€1.50`, `1.50€` e `1.50 euro`.

La dettatura vocale e supportata quando il browser espone `SpeechRecognition` o `webkitSpeechRecognition`.

Alcuni campi monoriga sono implementati come `textarea` per evitare, su mobile, la sezione invasiva di suggerimenti/autofill della tastiera.

Le decisioni di input vuoto, parsing non riuscito e commit su storage dell'inserimento rapido sono isolate in `app/js/expense-actions.js`. Il wiring touch/click, invio da tastiera, focus/blur e dettatura vocale e in `app/js/expense-input-controller.js`. Il posizionamento mobile della barra e il padding del contenuto durante tastiera/filtri sono in `app/js/input-bar-controller.js`; `app/js/app-refresh.js` applica il refresh di cache/timeline/statistiche dopo il commit, mentre `app.js` mantiene feedback visivo, stato history e flag condivisi tramite hook.

### Parser e classificazione

Il parser:

- cerca il candidato importo piu affidabile, privilegiando valuta esplicita, decimali e importi a fine frase;
- rimuove importo e tag dalla descrizione;
- rileva il metodo di pagamento tramite keyword;
- rileva la categoria cercando keyword nelle categorie statiche;
- sceglie la categoria con keyword trovata prima nel testo;
- usa `carta` come metodo di default e `altro` come categoria di fallback.

Gli input con piu numeri gestiscono casi reali come `pizza 4 formaggi 8`, `pizza 4 formaggi 8 euro` e `2 caffe 3 euro`, scegliendo l'importo finale o quello marcato da valuta invece del primo numero incontrato.

### Timeline

La timeline mostra le spese raggruppate per giorno, ordinate dalla piu recente. Il riepilogo mostra totali per oggi, settimana corrente e mese corrente. Con filtri attivi mostra anche un riepilogo filtrato.

Le spese sono apribili in modifica tramite click/tap sulla card.

Rendering e template della timeline sono in `app/js/timeline-view.js`; orchestrazione DOM, empty state, modello filtrato gia calcolato, nuova card evidenziata e binding click card sono in `app/js/timeline-controller.js`. `app.js` mantiene stato condiviso, hook di lettura cache spese, hook di apertura modale e hook di refresh.

### Filtri

I filtri sono condivisi tra timeline e statistiche:

- ricerca testuale su descrizione, nota e tag;
- range data;
- importo minimo/massimo con dual slider;
- categorie;
- metodi di pagamento.

Il pannello filtri ha una sezione base e una sezione avanzata. Il badge nel pulsante filtri conta i filtri attivi.

La valutazione dei filtri e centralizzata in `app/js/filters.js`, cosi timeline e statistiche usano lo stesso comportamento testabile. `app/js/expense-query.js` prepara un modello con conteggio filtri, lista filtrata e riepiloghi rapidi; il badge filtri e la timeline possono riusarlo invece di ricalcolare tutto separatamente. Rendering e micro-logica visuale sono in `app/js/filter-view.js`; eventi del pannello, slider, badge, reset e apertura/chiusura base/avanzata passano da `app/js/filter-controller.js`. `app.js` mantiene lo stato condiviso dei filtri, history e hook mobile.

### Modifica spesa

La modale permette di modificare importo, descrizione, data, ora, categoria, metodo, tag e nota. Include conferma di eliminazione.

Categoria, metodo e tag usano dropdown ricercabili custom. I tag suggeriscono valori gia usati, con preferenza per ultimo uso e frequenza.

Il rendering dei dropdown e la logica pura dei suggerimenti tag sono in `app/js/modal-view.js`; popolamento/lettura del form e micro-eventi dei campi sono in `app/js/modal-form-controller.js`; focus, picker nativi, selection cleanup, stato history di interazione e watcher viewport/tastiera sono in `app/js/modal-mobile-controller.js`; eventi e micro-stato di dropdown/tag sono in `app/js/modal-interactions.js`; apertura, chiusura, lettura, salvataggio e conferma eliminazione sono coordinati da `app/js/modal-controller.js`. Le chiamate storage per modifica ed eliminazione passano da `app/js/expense-actions.js`; il refresh successivo passa da `app/js/app-refresh.js`; `app.js` mantiene stato condiviso, storage e hook verso history/back button.

### Navigazione e mobile

La navigazione principale e composta da:

- Timeline;
- Statistiche;
- Impostazioni.

`app.js` gestisce diversi casi legati al tasto indietro del telefono, usando `app/js/ui-stack.js` per decidere l'ordine di priorita e mantenendo in `app.js` le azioni concrete:

- chiusura conferma eliminazione;
- chiusura o pulizia interazioni della modale;
- uscita dal campo ricerca filtri;
- uscita dalla barra inserimento;
- chiusura filtri avanzati;
- chiusura pannello filtri;
- ritorno alla timeline dalle altre pagine.

La chiusura dei filtri avanzati ora consuma in modo simmetrico lo stato history creato all'apertura; se si chiude tutto il pannello mentre i filtri avanzati sono aperti, vengono consumati entrambi gli stati sovrapposti.

Lo scroll di timeline, statistiche e impostazioni viene ricordato separatamente: quando si cambia pagina, la posizione della pagina lasciata viene salvata e quella della pagina aperta viene ripristinata, partendo dall'alto al primo ingresso. Questo wiring e in `app/js/navigation-controller.js`; `app.js` mantiene lo stato pagina corrente e l'esecuzione history tramite `runHistoryAction`.

Il layout della barra di inserimento durante tastiera mobile e filtri usa `input-bar-controller.js`, che legge `visualViewport`, aggiorna il padding di `app-main` e gestisce RAF/listener resize tramite hook di `app.js`. I workaround di focus/picker/viewport della modale sono in `modal-mobile-controller.js`; il lifecycle della modale e in `modal-controller.js`, tramite hook verso stato, storage, rendering e history di `app.js`. Lo stack UI non e ancora un manager completo: centralizza decisioni testabili di `popstate` e azioni push/back simmetriche in `ui-stack.js`; alcuni cleanup DOM puntuali sono in `ui-stack-effects.js`; il glue che applica le azioni tramite hook vive in `ui-stack-controller.js`, mentre `app.js` mantiene l'esecuzione concreta tramite `runHistoryAction`.

### Statistiche

Le statistiche usano Chart.js e includono:

- periodo settimana, mese, anno o custom;
- totale, numero spese e media giornaliera;
- grafico a torta per categoria;
- grafico a barre con aggregazione giornaliera, settimanale o mensile;
- dettaglio categorie;
- top 5 spese.

I filtri non-data vengono applicati anche alle statistiche.

I calcoli di periodo, totale, media giornaliera, dettaglio categorie, top spese e dati per grafici a barre sono centralizzati in `app/js/stats.js`. `app/js/expense-query.js` prepara il modello statistiche per periodo corrente, filtri non-data, riepilogo e titolo grafico; `app/js/stats-controller.js` lo usa senza ricalcolare il filtro periodo quando `app.js` lo fornisce. La configurazione Chart.js e in `app/js/stats-charts.js`; wiring pagina, bottoni periodo e creazione/distruzione grafici sono in `app/js/stats-controller.js`. `app.js` mantiene solo stato periodo/offset, hook di lettura cache spese e riferimenti alle istanze Chart.

Oggi la pagina statistiche e di sola lettura: da li non si apre direttamente la modale di modifica di una spesa.

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- export con scelta formato JSON o CSV;
- import JSON e CSV con preview e scelta esplicita tra aggiungere e sostituire;
- snapshot locale automatico prima di sostituire o cancellare i dati;
- esportazione dei dati grezzi quando lo storage locale non e leggibile;
- informazioni su numero spese, periodo coperto e spazio usato;
- cancellazione completa dei dati con conferma.

Negli import aggiuntivi, gli id duplicati o mancanti vengono rigenerati e riepilogati. Negli import JSON in modalita aggiungi, le impostazioni del backup non sovrascrivono quelle correnti; in modalita sostituisci vengono invece importate insieme alle spese.

La roadmap prevede anche che eventuali personalizzazioni future, oltre alle impostazioni gia presenti, entrino nello stesso perimetro di backup/import per facilitare cambio dispositivo e ripristino completo.

Il toggle tema nell'header e pensato come cambio temporaneo; la preferenza stabile del tema si modifica dalle impostazioni. Applicazione del tema, tema automatico e toggle temporaneo sono in `app/js/theme-controller.js`. I toast sono gestiti da `app/js/toast-controller.js`, incluso il posizionamento sopra la barra di inserimento quando l'input rapido e attivo.

Il rendering della pagina impostazioni e del messaggio di preview import e in `app/js/settings-view.js`; formato file, opzioni import/export, nomi download, preview e commit import/export, salvataggio tema persistente e cancellazione completa sono orchestrati in `app/js/settings-actions.js` tramite adapter `Storage`. Il wiring DOM della pagina e in `app/js/settings-controller.js`; dopo import o cancellazione, il refresh di cache/timeline/statistiche/impostazioni passa da `app/js/app-refresh.js`. `app.js` mantiene lettura file, download reale e hook di navigazione/toast/conferma.

## Limiti Noti

- Non c'e ancora un service worker: l'app non e pienamente offline.
- Chart.js viene caricato da CDN, quindi le statistiche dipendono dalla rete al primo caricamento.
- Non esiste ancora un sistema di versioni installabili in parallelo o aggiornamenti controllati dall'utente.
- `app.js` e molto grande e accoppia stato, rendering, eventi e workaround mobile.
- Categorie e metodi sono statici nel codice, non personalizzabili dall'app.
- Le categorie non hanno ancora icone o immagini personalizzabili dall'utente, ne un colore visivo mostrato direttamente sulle spese.
- Non esiste ancora una modalita selezione con evidenza visiva dedicata e azioni bulk sulle spese.
- Non esiste ancora supporto multi-account: tutto vive in un unico contenitore dati locale.
- La pagina statistiche ha ancora una UI semplice quando non ci sono dati, ma il tip iniziale e ora posizionato sotto l'effetto di trasparenza della testata sticky.
- Il CSV preserva i campi principali attuali, inclusi tag e timestamp, ma resta meno adatto del JSON come backup completo per futuri dati complessi.
- La compatibilita iOS ha problemi UI noti ed e priorita bassa rispetto ad Android.
- Il browser desktop e usabile ma non e ancora rifinito quanto l'esperienza mobile.
- Esiste un test runner Node (`node tests/run-tests.js`) per storage, cache letture spese, query filtri/statistiche/riepiloghi, refresh viste dopo cambio dati, parser, azioni spesa, controller input rapido, controller barra input mobile, navigazione, filtri/controller filtri, timeline/controller timeline, aggregazioni/controller statistiche, rendering/helper UI estratti, configurazione grafici, decisioni/controller stack UI/back button, cleanup DOM collegati al popstate, lifecycle/form/dropdown/tag/focus mobile della modale, flussi/controller impostazioni, tema, toast e dialog conferma; mancano ancora test automatici su UI mobile reale, history/back button reale e interazioni DOM complesse.
