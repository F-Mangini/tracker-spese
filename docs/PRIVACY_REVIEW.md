# Privacy Review

Review eseguita il 2026-06-01 sul branch `privacy`.

Questo documento non e una privacy policy legale: e una review tecnica pragmatica per capire dove vivono i dati, quali richieste di rete esistono, quali rischi restano e quali regole rispettare quando l'app evolvera.

## Esito

Lo stato attuale e coerente con l'obiettivo local-first:

- non esiste backend applicativo;
- non esistono account, analytics o telemetria applicativa;
- Chart.js e servito localmente;
- gli script e gli asset dell'app sono locali al repository;
- i dati delle spese restano in `localStorage`;
- `fetch` viene usato solo per leggere `releases.json`, cioe metadati pubblici delle release;
- i service worker sono scoped a `/stable/` o alla singola release versionata.

Non sono emersi blocchi privacy immediati per l'uso personale attuale.

I rischi residui principali non sono trasmissioni nascoste di dati, ma:

- accesso ai dati dal browser/device locale;
- backup/export in chiaro;
- snapshot locali creati prima di operazioni distruttive;
- origine GitHub Pages condivisa tra stabile, dev e release;
- dettatura vocale gestita dal browser/OS;
- future feature che potrebbero introdurre API esterne, immagini, OCR, chatbot o multi-account.

## Ambito Verificato

File e aree considerate:

- `app/index.html`;
- `app/js/core/config.js`;
- `app/js/core/app.js`;
- `app/js/data/storage.js`;
- `app/js/settings/settings-actions.js`;
- `app/js/settings/settings-controller.js`;
- `app/js/settings/settings-view.js`;
- `app/js/timeline/timeline-selection-controller.js`;
- `app/js/timeline/timeline-controller.js`;
- `app/js/ui/download-controller.js`;
- `app/stable-launch-service-worker.js`;
- `releases.json`;
- `releases/v2026.05.30/`;
- `releases/v2026.06.03/`;
- `.github/workflows/pages.yml`;
- manifest stabile/dev/release;
- documentazione PWA, stato corrente, roadmap e strategia deploy.

## Inventario Dati

| Dato | Dove vive | Esce dall'app automaticamente? | Note privacy |
| --- | --- | --- | --- |
| Spese, note, tag, categorie, metodi e impostazioni | `localStorage`, chiave stabile `spesa-tracker-data` | No | Sono dati sensibili per contesto personale anche se non includono account o dati bancari. |
| Dati dev | `localStorage`, chiave dev `spesa-tracker-data-dev` nel deploy `/dev/` | No | Separazione necessaria perche GitHub Pages condivide origine tra path diversi. |
| Snapshot locali | `localStorage`, chiave `${Storage.KEY}:snapshot` | No | Proteggono da perdita dati e sono ripristinabili dalle impostazioni, ma possono mantenere una copia dopo sostituzione, cancellazione multipla o cancellazione completa. |
| Preferenza release installata | `localStorage`, `spesa-tracker-launch-target` | No | Contiene solo un path tipo `releases/vYYYY.MM.DD/`. |
| Cache service worker | Cache Storage browser | No | Contiene asset statici dell'app, non dati utente. |
| Export JSON/CSV/raw e selezioni timeline | File scaricato dal browser | Solo su azione utente | File in chiaro: dopo il download la protezione dipende dal device e da dove l'utente lo salva o condivide. Gli export da selezione contengono solo le spese selezionate; il JSON custom puo includere o escludere impostazioni e future personalizzazioni, mentre il CSV resta solo dati. |
| Preferenze export custom | `localStorage`, chiave `${Storage.KEY}:export-custom` | No | Contengono formato, checklist, id selezionati e filtri dell'ultimo export custom riuscito per riprendere la configurazione. Non contengono importi o note, ma gli id e i filtri possono rivelare indirettamente quali spese erano state scelte su quel dispositivo. |
| Copia spese selezionate | Clipboard del sistema | Solo su azione utente | La copia usa contenuto CSV delle sole spese selezionate. Non invia dati in rete, ma dopo la copia la protezione dipende dagli appunti del sistema e dalle app in cui l'utente incolla. |
| Import JSON/CSV | File scelto dall'utente, letto con `FileReader` | No | Il contenuto viene validato localmente prima del commit. |
| Dettatura vocale | API `SpeechRecognition` / `webkitSpeechRecognition` del browser | Potenzialmente si | Dipende dal browser/OS: puo usare servizi esterni del provider. La funzione e opzionale e attivata dall'utente. |
| Richieste asset e `releases.json` | GitHub Pages / hosting statico | Si, come metadati HTTP | IP, user agent, path richiesto e timestamp sono visibili all'hosting; i dati delle spese no. |

## Rete e Asset

La review del codice non mostra CDN o asset applicativi remoti nel percorso normale dell'app:

- `app/index.html` carica CSS, manifest, icone, Chart.js e JavaScript da path locali;
- le release sotto `releases/vYYYY.MM.DD/index.html` fanno lo stesso dentro la propria cartella release;
- `app/vendor/chart.umd.min.js` e le copie `releases/vYYYY.MM.DD/vendor/chart.umd.min.js` sono locali.

La chiamata di rete applicativa rilevante e:

- `SettingsController.loadReleases()`, che chiama `fetch(releasesUrl, { cache: 'no-store' })` per leggere `releases.json`.

`releases.json` non contiene dati utente. Contiene id release, path, data, note, status e schemaVersion. Va comunque trattato come file fidato del maintainer: se in futuro la lista release venisse popolata da una fonte esterna, servirebbe validare piu rigidamente i path prima di renderli come link.

## Service Worker

Lo stato attuale e corretto per la privacy:

- `/` e `/dev/` non registrano service worker;
- `/stable/` registra `stable-launch-service-worker.js` solo con scope `./`;
- le release versionate, oggi `releases/v2026.05.30/` e `releases/v2026.06.03/`, registrano `service-worker.js` solo con scope `./`;
- i service worker intercettano solo richieste `GET`, same-origin e dentro `self.registration.scope`;
- le cache hanno prefissi namespaced e non cancellano cache di altre release.

Rischio residuo accettato: il service worker cachea asset same-origin dentro il proprio scope. Oggi in quegli scope ci sono solo asset statici, ma in futuro non vanno messi file contenenti dati personali dentro `/stable/` o dentro una cartella release.

Regola da mantenere: nessun service worker root-scope che controlli `/`, `/stable/`, `/dev/` e `/releases/` insieme.

## Storage Locale

`localStorage` e la sorgente dati principale. Questo e coerente con l'app personale e senza backend, ma comporta limiti chiari:

- chi ha accesso al profilo browser o al device puo leggere/modificare i dati;
- i dati non sono cifrati dall'app;
- cancellare la cronologia del sito o i dati del browser puo rimuovere le spese;
- backup del profilo browser o del device possono includere anche dati locali;
- stabile, dev e release condividono la stessa origine GitHub Pages, quindi la separazione dipende dalle chiavi storage e dal codice pubblicato.

Controlli gia presenti:

- chiave stabile `spesa-tracker-data`;
- chiave dev generata dal workflow Pages come `spesa-tracker-data-dev`;
- guardrail su JSON locale corrotto;
- blocco dei salvataggi quando i dati locali non sono leggibili;
- export raw quando lo storage non e parseabile;
- snapshot locale prima di import in aggiunta, import in sostituzione, cambio versione, cancellazione multipla dalla timeline o cancellazione completa.

Nota privacy importante: lo snapshot locale e una misura anti-perdita dati. Dopo un import, un cambio versione, una cancellazione multipla o una cancellazione completa puo restare una copia precedente in `localStorage` sotto la chiave snapshot. Per questo la conferma di cancellazione completa include una spunta, disattivata di default, per rimuovere anche lo snapshot locale.

Il ripristino snapshot sostituisce i dati correnti con quelli dello snapshot e salva prima i dati correnti come nuovo snapshot. In questo modo, se il ripristino non era quello desiderato, resta una possibilita di tornare allo stato immediatamente precedente.

## Export, Import e File Locali

Gli export sono avviati localmente tramite `Blob` e object URL temporaneo, poi l'object URL viene revocato. Non c'e upload automatico.

JSON e raw possono essere backup completi e contenere descrizioni, note, tag, timestamp e impostazioni. L'export JSON custom permette di scegliere se includere impostazioni e un segnaposto per future personalizzazioni; i dati restano comunque in chiaro. CSV e piu limitato, esporta solo dati tabellari e resta un file in chiaro. Dalla timeline e possibile esportare anche solo le spese selezionate in JSON o CSV, oppure copiarle negli appunti come CSV: il contenuto e piu ristretto, ma resta comunque in chiaro dopo il download o nella clipboard. Il rischio principale e successivo all'azione utente: cartella Download condivisa, sincronizzazioni cloud del device, appunti di sistema, invio manuale a terzi o salvataggio in aree non protette.

Gli import sono letti con `FileReader` e validati localmente. In sostituzione viene creato uno snapshot locale prima del commit.

Miglioria da rivalutare prima di allargare l'uso oltre il maintainer: decidere dove spiegare che JSON, CSV e raw sono file in chiaro senza appesantire i flussi quotidiani con disclaimer ripetuti.

## Rendering e Dati Utente

I principali campi utente renderizzati nella timeline, nelle statistiche, nella modale e nella lista release passano da `AppUI.escapeHtml`. Questo mitiga XSS da descrizioni, note, tag e metadati release.

Attenzione residua:

- `ConfirmDialog` usa `innerHTML` per messaggi costruiti dall'app. Oggi i messaggi non includono input utente non escapato nel flusso normale, ma va mantenuta disciplina se si riusa il dialog con testi dinamici.
- Eventuali future personalizzazioni con HTML, immagini, colori liberi o contenuti importati dovranno restare escapate o validate.

## Dettatura Vocale

La dettatura usa `SpeechRecognition` o `webkitSpeechRecognition` quando disponibili. Questa API e controllata dal browser e puo usare servizi esterni del provider per elaborare audio o testo.

Per l'uso personale attuale il rischio e accettabile perche:

- la funzione e opzionale;
- viene attivata dall'utente;
- non viene salvato audio dall'app.

Se l'app verra usata da persone non tecniche, conviene aggiungere una nota breve accanto alla dettatura o nella documentazione utente.

## Origine Condivisa GitHub Pages

Il vincolo critico resta: `localStorage` e per origine, non per path.

Quindi questi path condividono la stessa origine:

```text
https://f-mangini.github.io/tracker-spese/
https://f-mangini.github.io/tracker-spese/stable/
https://f-mangini.github.io/tracker-spese/dev/
https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/
https://f-mangini.github.io/tracker-spese/releases/v2026.06.03/
```

La separazione stabile/dev e mitigata dalla chiave dev dedicata. Le release stabili versionate usano invece la chiave stabile: questa scelta e intenzionale, perche devono leggere gli stessi dati quotidiani della stabile.

Regola: qualsiasi canale sperimentale pubblicato sulla stessa origine deve usare una storage key separata oppure un'origine diversa.

## Finding

| ID | Area | Severita | Stato | Note |
| --- | --- | --- | --- | --- |
| PR-01 | Assenza backend/telemetria | Bassa | OK | Nessuna trasmissione automatica di dati spese rilevata. |
| PR-02 | Asset esterni | Bassa | OK | Chart.js e asset app sono locali. |
| PR-03 | `releases.json` | Bassa | Accettato | Fetch solo di metadati pubblici; se la fonte cambia, validare path e origine. |
| PR-04 | Service worker scope | Bassa | OK | Scope limitati a stable o release; evitare root-scope in futuro. |
| PR-05 | Stabile/dev stessa origine | Alta se regressione | Mitigato | La dev pubblicata deve restare su storage key separata. |
| PR-06 | Snapshot dopo cancellazione | Media | Mitigato | Ripristinabile da UI; le cancellazioni multiple creano snapshot e la conferma di cancellazione completa puo rimuovere anche lo snapshot. |
| PR-07 | Export plaintext | Media | Accettato | File JSON/CSV/raw in chiaro dopo download. |
| PR-08 | Dettatura vocale | Media | Accettato | API browser/OS potenzialmente esterna, opzionale e manuale. |
| PR-09 | Rendering HTML | Media se regressione | Mitigato | Campi utente principali escapati; mantenere disciplina su `innerHTML`. |
| PR-10 | Future API esterne | Alta se introdotte male | Da riprogettare | OCR, chatbot, sync, immagini remote o analytics richiedono review dedicata prima del codice. |

## Decisioni

Per ora non introdurre cifratura locale automatica dei dati. La cifratura in-browser senza backend richiederebbe gestione password/chiavi, recupero, backup e UX dedicata; per l'uso personale attuale il costo e superiore al beneficio immediato.

Valutare invece in futuro:

- export JSON cifrato opzionale;
- avviso esplicito per export plaintext;
- nota privacy per dettatura vocale;
- validazione piu stretta dei path in `releases.json`;
- eventuale Content Security Policy solo se compatibile con la semplicita statica del progetto.

## Regole Future

Prima di introdurre una delle seguenti cose, fare una mini-review privacy esplicita:

- CDN o asset remoti;
- analytics, error reporting o telemetria;
- API esterne, OCR, chatbot o sync;
- immagini o allegati salvati dall'utente;
- categorie/metodi personalizzati con icone o immagini;
- multi-account locale;
- modifiche a storage key, schema dati, import/export o snapshot;
- service worker con scope piu largo;
- nuove release con migrazioni dati.

Checklist minima per ogni modifica privacy-sensitive:

1. Quali dati vengono letti?
2. Dove vengono salvati?
3. Escono dal browser?
4. Sono inclusi nel backup JSON?
5. Sono visibili in export CSV/TSV?
6. Vengono cacheati da service worker?
7. Cosa succede su device condiviso?
8. Cosa succede se l'utente cancella tutto?
9. Stabile, dev e release restano separate dove serve?
10. La UI spiega abbastanza senza spaventare inutilmente?

## Prossime Azioni Consigliate

Non bloccanti per l'uso attuale:

- rivalutare dove chiarire che JSON/CSV/raw sono file in chiaro se l'app verra condivisa oltre l'uso personale;
- aggiungere una nota breve sulla dettatura vocale se l'app viene condivisa con altri utenti;
- mantenere `docs/PRIVACY_REVIEW.md` aggiornato quando entrano feature con API esterne o nuovi dati.
