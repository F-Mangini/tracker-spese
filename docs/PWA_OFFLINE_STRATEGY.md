# Strategia PWA, Offline e Versioni

Questo documento definisce la fase `pwa`, separata dal refactor strutturale gia concluso. Fissa la strategia per service worker, cache offline e versioni installabili prima di estendere la UI o promuovere il flusso a stabile.

## Stato

Fase progettata su branch `pwa` dopo la promozione della dev a stabile; la baseline PWA/offline e ora pubblicata su `main` per permettere test reali su GitHub Pages.

La fase non deve cambiare lo schema dati corrente. Eventuali modifiche future a schema, storage, backup o import/export richiederanno una decisione dedicata, fallback per dati vecchi e test specifici.

Il codice sorgente `app/` registra un service worker leggero solo quando viene servito da `/stable/`: e un launcher offline scoped alla stable, utile a riaprire la release scelta anche se lo start URL della PWA installata resta `/stable/`. `/` e `/dev/` restano entrypoint senza controllo offline diretto. Chart.js 4.4.7 e incluso localmente in `app/vendor/chart.umd.min.js`.

La prima release sorgente e `releases/v2026.05.30/`: contiene Chart.js locale, manifest scoped al proprio path e `service-worker.js` registrato solo dalla pagina della release con scope `./`. Questa baseline introduce la cache offline della singola release, una UI minima nelle impostazioni per leggere `releases.json`, apertura manuale di `stable/latest` o della release consigliata, preferenza locale per riaprire la release scelta dalla PWA installata, launcher offline scoped per `/stable/` e versione/canale visibili nel footer impostazioni. Restano da completare verifica Android pubblica e flusso di aggiornamento piu guidato.

## Obiettivo

L'obiettivo non e solo "funzionare offline", ma avere versioni installabili e controllate dall'utente:

- l'utente resta sulla versione installata finche non sceglie esplicitamente di aggiornare;
- le versioni vecchie stabili restano disponibili;
- l'app deve funzionare offline dopo il primo caricamento/installazione della versione scelta;
- gli aggiornamenti non devono essere forzati o silenziosi;
- stabile e dev restano separati per path, manifest, icone e storage key.

## Strategia Scelta

Usare cartelle release immutabili su hosting statico:

```text
/                     -> stabile/latest
/stable/              -> stabile/latest
/dev/                 -> sviluppo
/releases/vYYYY.MM.DD/ -> release installabile immutabile
```

`/` e `/stable/` restano entrypoint comodi verso l'ultima stabile. Le PWA installabili/offline devono invece vivere dentro path versionati, per esempio `/releases/v2026.05.30/`, cosi una versione installata non cambia comportamento solo perche `main` viene aggiornato.

Il canale `/dev/` resta separato e non deve condividere storage key con la stabile. La storage key stabile resta `spesa-tracker-data`; la dev resta su `spesa-tracker-data-dev`.

## Service Worker e Scope

Ogni release installabile deve avere manifest e service worker coerenti con il proprio path.

Regola critica: non usare un service worker root-scope che controlli anche `/dev/`, `/stable/` o release diverse.

Eccezione controllata: `/stable/` registra `stable-launch-service-worker.js` con scope `./`. Questo service worker non rende la stable una release immutabile e non controlla `/`, `/dev/` o `/releases/`: cachea solo gli asset della stable scoped per permettere allo start URL installato da `/stable/` di avviarsi offline, leggere `spesa-tracker-launch-target` e reindirizzare alla release scelta dall'utente.

Per una release:

- il service worker vive nel path della release o viene registrato con scope limitato alla release;
- `manifest.json` dichiara `start_url` e `scope` coerenti con quel path;
- la cache contiene solo asset della stessa release;
- i nomi cache includono l'id release;
- una nuova release crea una nuova cache, senza sovrascrivere la cache della release attiva.

La cache offline di ogni release deve includere almeno HTML, CSS, JS, manifest, icone e Chart.js locale. Le richieste fuori release non devono essere intercettate dalla release installata.

Implementazione baseline: `releases/v2026.05.30/service-worker.js` usa una cache namespaced su `wmm-v2026.05.30-`, precache degli asset locali della release e intercetta solo richieste `GET` same-origin dentro `self.registration.scope`. L'attivazione elimina solo cache obsolete della stessa release, non cache di release diverse.

## Chart.js Locale

Chart.js 4.4.7 e incluso localmente nel repository, senza dipendere dalla CDN al primo caricamento.

La copia locale deve restare compatibile con il deploy statico semplice. Non si introduce un build step solo per Chart.js.

## Manifest Release

La fase usa un file statico `releases.json`, pubblicato dal maintainer, per elencare le versioni disponibili.

Il file sorgente vive in `releases.json` alla root del repository e viene pubblicato come `/releases.json` dal workflow Pages. Le cartelle release immutabili vivono in `releases/` e vengono copiate in `/releases/`.

Forma logica prevista:

```json
{
  "recommended": "v2026.05.30",
  "releases": [
    {
      "id": "v2026.05.30",
      "path": "releases/v2026.05.30/",
      "date": "2026-05-30",
      "status": "recommended",
      "notes": "Prima release PWA offline controllata.",
      "schemaVersion": 1
    }
  ]
}
```

Il file serve alla UI delle impostazioni per mostrare le versioni disponibili e consigliare l'ultima stabile senza installarla automaticamente.

La prima release sorgente e `releases/v2026.05.30/`: e una baseline stabile con Chart.js locale, manifest scoped al proprio path e primo service worker release-scoped.

## Ordine Operativo

1. Pubblicare la fase `pwa` quando la baseline e pronta per un test reale su HTTPS.
2. Verificare installazione, refresh offline e grafici offline su Android per `releases/v2026.05.30/`.
3. Definire il flusso di promozione della prossima release senza cambiare automaticamente quella installata.

Ogni passo deve restare piccolo e verificabile. Se una modifica tocca storage, import/export o schema dati, va trattata come cambio dati e non come semplice lavoro PWA.

## Test Android

### Quando Iniziare

Il test Android consigliato inizia dopo merge/deploy su `main`, quando la UI versioni e la release versionata sono disponibili su GitHub Pages via HTTPS.

URL previsto dopo deploy:

```text
https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/
```

Prima del test pubblico fare sempre export JSON dalla stabile. Il test pubblico condivide l'origine `https://f-mangini.github.io` e la storage key stabile `spesa-tracker-data`.

### Test Pubblico Dopo Deploy

Usare il test pubblico solo quando le modifiche della fase `pwa` sono state pubblicate da GitHub Pages. Il workflow attuale pubblica `releases/` da `main`, quindi il branch `pwa` non basta da solo.

Procedura consigliata:

1. Aprire la stabile o la release pubblica da Chrome Android.
2. Entrare in Impostazioni e controllare la sezione `Versioni`.
3. Aprire la release consigliata `v2026.05.30`; dalla release verificare anche che `stable/latest` riporti alla stabile.
4. Caricare la pagina una volta online e verificare che timeline, statistiche e impostazioni si aprano.
5. Installare l'app da Chrome usando `Aggiungi a schermata Home` o `Installa app`, se disponibile.
6. Aprire l'app installata almeno una volta mentre il telefono e ancora online, cosi il launcher offline di `/stable/` e/o il service worker della release possono completare la cache.
7. Attivare modalita aereo.
8. Riaprire l'app installata e fare refresh della pagina.
9. Verificare che CSS, JS, icone e grafici Chart.js restino disponibili offline.
10. Chiudere e riaprire l'app installata: se dalla stable era stata scelta `v2026.05.30`, deve riaprire quella release.
11. Tornare online e controllare che `https://f-mangini.github.io/tracker-spese/dev/` continui a caricare senza essere controllata dal service worker della release.

Nota installazione: il launcher offline della stable funziona per app installate da `https://f-mangini.github.io/tracker-spese/stable/`. Se l'icona era stata installata da `/` prima di questa fase, lo start URL puo restare root e non essere coperto dal launcher scoped; in quel caso reinstallare dalla stable scoped o installare direttamente dalla release versionata.

### Test Locale Avanzato Con Android

Questo percorso resta opzionale. Serve solo se si vuole provare prima del deploy pubblico e richiede collegamento USB funzionante.

Prerequisiti:

- telefono collegato via USB;
- opzioni sviluppatore e debug USB attivi;
- `adb` disponibile sul PC.

Procedura consigliata:

1. Avviare un server statico dalla root del repository su una porta alta, per esempio `28575`:

```powershell
python -m http.server 28575
```

Se `python` non e nel PATH, usare il runtime bundled:

```powershell
& 'C:\Users\Fabiano\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 28575
```

2. Esporre la porta al telefono:

```powershell
adb reverse tcp:28575 tcp:28575
```

3. Aprire in Chrome Android:

```text
http://localhost:28575/releases/v2026.05.30/
```

4. Caricare la pagina una volta online e verificare che timeline, statistiche e impostazioni si aprano.
5. Installare l'app da Chrome usando `Aggiungi a schermata Home` o `Installa app`, se disponibile.
6. Aprire l'app installata almeno una volta mentre il telefono e ancora online.
7. Attivare modalita aereo.
8. Riaprire l'app installata e fare refresh della pagina.
9. Verificare che CSS, JS, icone e grafici Chart.js restino disponibili offline.
10. Disattivare modalita aereo e togliere il reverse quando finito:

```powershell
adb reverse --remove tcp:28575
```

## Verifiche Attese

Per ogni release PWA:

- apertura online da path release;
- installazione su Android;
- riapertura offline;
- refresh offline della pagina installata;
- grafici funzionanti offline;
- dati locali stabili e non migrati senza consenso;
- `/dev/` non controllato dal service worker della stabile;
- nuova release visibile ma non applicata automaticamente.

## Riferimenti Tecnici

- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: The service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
- [web.dev: PWA caching](https://web.dev/learn/pwa/caching)
- [MDN Web App Manifest scope](https://developer.mozilla.org/docs/Web/Progressive_web_apps/Manifest/Reference/scope)
