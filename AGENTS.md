# Note per Codex e Assistenti

Questo progetto e personale ed e mantenuto da una sola persona. Le soluzioni devono aiutare il maintainer a lavorare meglio, non introdurre processi o architetture da team grande.

## Contesto

- Nome app stabile attuale: `Where's My Money?`.
- Nome breve per scorciatoia mobile/PWA: `WMM`.
- Nome app dev attuale: `Where's My Bug?`.
- Nome breve dev per scorciatoia mobile/PWA: `WMB`.
- Nome repository target: `tracker-spese`.
- Scopo: tracker spese semplice, privato, locale.
- Uso reale: quotidiano su Android.
- Deploy: GitHub Pages / hosting statico.
- Backend: assente.
- Persistenza: `localStorage`.
- Stack: HTML, CSS, JavaScript vanilla, Chart.js locale.
- Lingua documentazione e UI: italiano.
- Obiettivo distribuzione: app installabile/offline stabile, con aggiornamenti scelti dall'utente da una lista di versioni pubblicate dal maintainer.
- Branch stabile attuale: `main`.
- Branch di lavoro/refactor: `codex/refactor`.
- GitHub Pages pubblica `/` e `/stable/` da `main`, e `/dev/` da `codex/refactor`.
- Il workflow Pages deve partire da `main`: l'environment `github-pages` non accetta deploy diretti da `codex/refactor`.
- Esigenza immediata completata: esiste un link stabile per l'uso quotidiano e un link separato per testare la versione di sviluppo.
- Vincolo importante: se stabile e dev sono servite dallo stesso dominio GitHub Pages, anche con path diversi, condividono `localStorage`; la versione dev deve quindi usare una storage key separata o un'origine diversa per non rischiare i dati reali.

## Priorita Operative

1. Non rompere l'uso quotidiano.
2. Non mettere a rischio i dati locali.
3. Separare canale stabile e canale di sviluppo prima dei refactor rischiosi.
4. Mantenere l'app semplice e comprensibile.
5. Migliorare la struttura prima di aggiungere grandi feature.
6. Trattare Android come piattaforma primaria.

## Prima di Modificare Codice

Leggere, nell'ordine:

1. `README.md`;
2. `docs/CURRENT_STATE.md`;
3. `docs/CODE_REVIEW.md`;
4. `docs/DEVELOPMENT_GUIDE.md`;
5. `docs/ROADMAP.md`;
6. `docs/PWA_OFFLINE_STRATEGY.md` se si lavora su PWA, offline, service worker o aggiornamenti;
7. `docs/REFACTORING_SUMMARY.md` se si lavora su refactor o architettura;
8. `note/note_di_progetto.txt` se si lavora su backlog o dettagli storici.

Non considerare `note/note_di_progetto.txt` come specifica finale: e una raccolta raw di appunti. La roadmap curata decide priorita e raggruppamenti, ma gli appunti possono contenere dettagli utili non ancora formalizzati.

## Documentazione Ufficiale

I file documentali ufficiali da mantenere allineati sono:

- `README.md`: panoramica pubblica, struttura, link alla documentazione e istruzioni essenziali.
- `AGENTS.md`: contesto operativo per Codex e altri assistenti AI.
- `docs/CURRENT_STATE.md`: stato tecnico implementato.
- `docs/CODE_REVIEW.md`: rischi tecnici, priorita e ordine consigliato del refactor.
- `docs/DEPLOYMENT_STRATEGY.md`: separazione stabile/dev e strategia GitHub Pages.
- `docs/DEVELOPMENT_GUIDE.md`: regole pratiche per sviluppo, refactor e nuove feature.
- `docs/PWA_OFFLINE_STRATEGY.md`: strategia per offline, service worker, release versionate e aggiornamenti scelti dall'utente.
- `docs/REFACTORING_SUMMARY.md`: riepilogo ordinato del refactor gia svolto.
- `docs/ROADMAP.md`: backlog curato e ordinato a partire dagli appunti.
- `note/note_di_progetto.txt`: appunti raw e storici del maintainer.

Non creare altri file di documentazione senza una ragione chiara. Se serve un nuovo documento, aggiornare anche `README.md` e questa lista.

## Comunicazione con il Maintainer

- Dopo ogni modifica, spiegare in chat cosa e stato cambiato e perche.
- Quando la modifica tocca codice non banale, descrivere anche il comportamento interessato, non solo i file modificati.
- Segnalare rischi residui, test eseguiti e test non eseguiti.
- Aiutare il maintainer a costruire comprensione del codice: evitare risposte opache tipo "fatto" quando una spiegazione breve puo rendere piu chiaro il sistema.
- Se una scelta non e deducibile dalla codebase o dagli appunti, chiedere al maintainer invece di inventare una policy complessa.

## Vincoli

- Evitare framework e build step finche non sono chiaramente necessari.
- Evitare refactor larghi e simultanei.
- Prima dei refactor larghi, affrontare o almeno considerare i rischi in `docs/CODE_REVIEW.md`.
- Lavora di default sulla versione dev su `codex/refactor`.
- Toccare `main` solo per promozioni esplicite a stabile o per fix infrastrutturali minimi necessari al deploy.
- Non cambiare schema dati senza fallback per vecchi dati.
- Non rimuovere workaround mobile senza capire quale bug risolvevano.
- Non sostituire i `textarea` usati come input/dropdown senza verificare l'effetto sui suggerimenti/autofill della tastiera mobile.
- Non rendere persistente il toggle tema dell'header: e intenzionalmente temporaneo; la persistenza sta nelle impostazioni.
- Non introdurre dipendenze che impediscano il deploy statico semplice.
- Non progettare aggiornamenti automatici forzati: le versioni locali devono restare stabili finche l'utente non richiede l'update.
- Se una modifica cambia comportamento o architettura, aggiornare la documentazione nella stessa fase.

## Aree Sensibili

- `app/js/core/app.js`: orchestratore sottile; non va riempito di nuovo con logica di dominio o wiring ripetitivo.
- `app/js/core/app-wiring.js` e `app/js/core/app-wiring-modal.js`: collegano controller, stato condiviso e history; sono sensibili per filtri, modali, tastiera mobile e back button.
- `app/js/data/storage.js`: rischio dati; ogni modifica deve rispettare backup/import.
- `Storage.KEY`: se si pubblica una versione dev sullo stesso dominio della stabile, non deve usare la stessa chiave dati della stabile.
- Configurazione runtime minima: `app/js/core/config.js`, caricato prima di `data/storage.js`.
- `app/js/domain/filters.js`: logica pura dei filtri condivisi tra timeline e statistiche; mantenere allineata ai test.
- `app/js/domain/stats.js`: logica pura per date, riepiloghi e aggregazioni statistiche; mantenere allineata ai test.
- Workflow Pages: `.github/workflows/pages.yml` assembla stabile da `main` e dev da `codex/refactor`.
- Release PWA: `releases.json` e `releases/v*/`; i service worker devono restare scoped alla singola release e non devono controllare `/`, `/stable/` o `/dev/`.
- Manifest stabile: `app/manifest.json`; manifest dev: `app/manifest.dev.json`, copiato dal workflow in `public/dev/manifest.json`.
- Icone stabili: `app/icons/stable/`; icone dev: `app/icons/dev/`.
- `app/js/domain/parser.js`: impatta l'inserimento rapido, flusso principale dell'app.
- Gestione back button, modali, filtri, tastiera mobile e scroll: molte parti sono state sistemate dopo bug concreti.

## Verifiche Locali

- Se `node` non e nel PATH o Windows restituisce `Accesso negato`, usare il runtime bundled indicato da `load_workspace_dependencies`. In questa workspace il runtime testato e:

```powershell
& 'C:\Users\Fabiano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' -v
```

- Quando il branch contiene `tests/run-tests.js`, eseguire il runner con:

```powershell
& 'C:\Users\Fabiano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tests\run-tests.js
```

- Per controllare la sintassi di tutti gli script:

```powershell
$node = 'C:\Users\Fabiano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; Get-ChildItem -Path app\js -Recurse -Filter *.js | Sort-Object FullName | ForEach-Object { & $node --check $_.FullName }
```

- Dopo spostamenti di file JS, verificare almeno che ogni script locale referenziato da `app/index.html` esista. Questo controllo e stato testato e non richiede browser:

```powershell
$html = Get-Content -Raw -Path app\index.html; $missing = [regex]::Matches($html, '<script\s+src="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^https?://' } | Where-Object { -not (Test-Path -LiteralPath (Join-Path 'app' ($_ -replace '/', [IO.Path]::DirectorySeparatorChar))) }; if ($missing) { $missing; exit 1 }
```

- Per verifica browser locale, la ricetta funzionante e: creare un server HTTP temporaneo dal runtime browser/Node REPL, servire la root del repo (`nodeRepl.cwd`) e aprire `http://127.0.0.1:<porta-alta>/app/index.html`. Verificato con porta `28575`: pagina caricata, ultimi script `js/core/app*.js` presenti, click su `Filtri` e nessun errore console. Chiudere sempre il server a fine prova.
- Pattern che possono fallire e non vanno presi come verdetto definitivo: `file://`, `localhost` o server lanciati da shell su porte basse/fisse come `8765` possono essere bloccati con `ERR_BLOCKED_BY_CLIENT` o policy URL. In quel caso riprovare una volta con la ricetta sopra prima di dichiarare la verifica browser locale non disponibile.
- Il browser integrato funziona anche su URL pubblici: verificato su `https://f-mangini.github.io/tracker-spese/dev/` con apertura pagina, snapshot DOM e click del pulsante `Filtri` senza errori console. Usarlo per controlli post-deploy su `/dev/` o `/stable/`.
- Prima di rinunciare alla verifica browser locale, controllare se esiste gia una tab utile nell'in-app browser: il blocco puo riguardare solo la navigazione verso un URL, non necessariamente l'ispezione di una tab gia aperta.

## Stile di Lavoro Consigliato

- Prima capire il comportamento attuale, poi intervenire.
- Preferire modifiche piccole, verificabili e documentate.
- Separare refactor da nuove feature quando possibile.
- Durante il refactor, preservare l'esperienza utente esistente salvo bug dichiarati.
- Tenere distinta la versione stabile dalla versione dev anche a livello di nome app, icona e storage quando vengono pubblicate fianco a fianco.
