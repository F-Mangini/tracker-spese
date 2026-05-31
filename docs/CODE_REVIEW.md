# Code Review Tecnica

Review originale eseguita il 2026-05-08 su `app/`. Questo file oggi resta la mappa dei rischi tecnici, non il diario del refactor. Per la cronologia sintetica delle modifiche fatte vedere `docs/REFACTORING_SUMMARY.md`.

## Sintesi Aggiornata

Le fasi tecniche 0-4 sono chiuse per lo scopo del refactor strutturale:

- canale stabile/dev sicuro;
- protezione dati e import/export;
- test runner leggero;
- spacchettamento primario di `app/js/core/app.js` e organizzazione dei moduli JS per area.

La dev e stata verificata manualmente su Android dal maintainer ed e tornata al pari della stabile per i flussi principali. I rischi piu importanti rimasti non riguardano piu il monolite `app/js/core/app.js`, ma distribuzione offline/versioni, privacy, CSS/mobile, accessibilita e feature future che cambieranno il modello dati.

## Stato Fasi

| Fase | Stato | Nota |
| --- | --- | --- |
| 0. Canale stabile/dev sicuro | Completata | Stabile e dev hanno path, manifest, icone e storage key separati. |
| 1. Protezione dati | Completata | Schema v1, normalizzazione, risultati espliciti, preview import e snapshot distruttivi. |
| 2. Logica pura e rendering testabile | Completata | Filtri, statistiche, rendering, query, cache e controller principali sono separati e coperti da test. |
| 3. UI stack e mobile behavior | Completata per i flussi attuali | Back button, modale, filtri e tastiera mobile sono modularizzati e verificati; resta prudenza su nuovi casi Android/iOS. |
| 4. Modularizzazione UI | Completata | `core/app.js` e un orchestratore sottile; stato e wiring sono in moduli dedicati. |
| 5. Offline e versioni controllate | Completata per la baseline | Strategia dedicata in `docs/PWA_OFFLINE_STRATEGY.md`; prima release scoped in `releases/v2026.05.30/`, launcher stable scoped e UI versioni pubblicati. |

## Findings Aggiornati

| ID | Area | Stato | Rischio residuo |
| --- | --- | --- | --- |
| CR-01 | Guardrail `localStorage` | Completato | Continuare a non scrivere dati se lo storage risulta corrotto. |
| CR-02 | Import JSON distruttivo | Completato | Ogni nuovo campo dovra entrare in preview, normalizzazione e backup. |
| CR-03 | `app.js` monolitico | Completato | Non riaccumulare logica in `core/app.js` o `core/app-wiring.js`. |
| CR-04 | Back button/history fragile | Stabilizzato | I flussi attuali sono verificati; nuovi pannelli/modali vanno aggiunti allo stack con test e prova Android. |
| CR-05 | Parser/importi ambigui | Completato per casi noti | Aggiungere test quando emergono frasi reali ambigue. |
| CR-06 | Assenza test automatici | Mitigato | Manca ancora E2E/browser mobile reale. |
| CR-07 | Offline/PWA/versioni | Completato per la baseline | Chart.js e locale, `releases.json` esiste, la prima release ha service worker scoped, `/stable/` ha launcher offline scoped e la finestra versioni permette installazione esplicita. Verifica Android eseguita dal maintainer. |
| CR-08 | CSV fragile/lossy | Mitigato | JSON resta backup completo; CSV non e formato ideale per futuri dati complessi. |
| CR-09 | Sanitizzazione rendering | Mitigato | I dati utente principali sono escapati; personalizzazioni future richiederanno disciplina ulteriore. |
| CR-10 | Schema dati non versionato | Completato | Schema v1 presente; future feature richiederanno migrazioni idempotenti. |
| CR-11 | CSS/mobile accoppiato | Aperto | Layout, z-index, fixed/sticky e tastiera restano delicati. |
| CR-12 | Letture/render ripetuti | Mitigato | Cache e query riducono ricalcoli; misurare prima di ottimizzare oltre. |
| CR-13 | Categorie/metodi statici | Aperto | Da riprogettare prima della personalizzazione. |
| CR-14 | Manifest/PWA incompleti | Mitigato | Manifest, prima cache release-scoped, launcher stable e UI versioni sono presenti; rivalutare quando verranno pubblicate nuove release o cambi schema. |
| CR-15 | Accessibilita/semantica | Aperto | Dropdown custom, label e zoom sono migliorabili. |
| CR-16 | Cleanup minori | Aperto | Da gestire localmente, senza mescolare con feature grandi. |

## Rischi Attuali Da Tenere Davvero In Vista

### Dati e compatibilita

Ogni nuova feature che aggiunge campi a spese, impostazioni, categorie o personalizzazioni deve prevedere:

- fallback per backup vecchi;
- normalizzazione in `data/storage.js`;
- export/import JSON completo;
- preview import coerente;
- test nel runner Node.

### Mobile e history

Back button, modali, filtri, input rapido e tastiera sono ora isolati, ma restano flussi sensibili. Ogni nuovo stato sovrapposto deve avere:

- push history esplicito;
- chiusura simmetrica;
- test unitario sullo stack quando possibile;
- verifica manuale Android.

### `AppWiring`

`AppWiring` deve restare glue. Non deve contenere logica di dominio o rendering. Se cresce molto, il passo giusto e separare altro wiring per area, come gia fatto con `core/app-wiring-modal.js`.

Nota specifica: timer/frame browser vanno richiamati tramite wrapper bound a `window`. Un test dedicato copre il bug che aveva rotto animazione filtri e chiusura modale dopo l'estrazione.

### Offline e aggiornamenti

La baseline PWA/offline e completata. La strategia resta fissata in `docs/PWA_OFFLINE_STRATEGY.md` e va riletta quando si pubblicano nuove release o si toccano:

- cache di HTML, CSS, JS, manifest e icone;
- Chart.js locale;
- aggiornamenti non automatici;
- compatibilita dati tra versioni;
- possibilita di mantenere versioni vecchie.

## Checklist Manuale Minima

Da usare dopo modifiche a UI, storage o history:

- Inserire spesa con importo decimale punto e virgola.
- Inserire frasi ambigue con piu numeri.
- Modificare importo usando virgola.
- Aprire e chiudere filtri base e avanzati.
- Aprire una spesa, chiudere la modale da bottone e da back.
- Usare back button con tastiera aperta, dropdown aperto e conferma aperta.
- Importare JSON valido.
- Provare import JSON malformato.
- Esportare JSON e reimportarlo.
- Verificare su Android prima di promuovere a stabile.
