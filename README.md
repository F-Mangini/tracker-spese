# Where's My Money?

Where's My Money? e una web app personale per tracciare le spese quotidiane in modo semplice, privato e locale.

L'app nasce per essere veloce da usare, soprattutto da smartphone Android: si apre, si scrive una spesa in linguaggio naturale, e il dato resta nel browser dell'utente. Non richiede backend, account o servizi esterni per salvare le spese.

## Principi

- **Local-first e privata**: i dati sono salvati in `localStorage`, senza server applicativo.
- **Semplice da mantenere**: HTML, CSS e JavaScript vanilla, con deploy statico.
- **Mobile-first pragmatico**: Android e uso quotidiano personale sono la priorita; iOS e browser desktop vanno mantenuti dignitosi senza complicare troppo il progetto.
- **Backup esplicito**: l'app supporta import/export JSON e CSV; ogni modifica ai dati deve rispettare questa possibilita.
- **Aggiornamenti controllati**: l'app installabile/offline resta su una versione scelta e si aggiorna solo su richiesta esplicita dell'utente.
- **Refactor senza overengineering**: il progetto resta personale, quindi le astrazioni devono servire davvero.

## Stato Attuale

L'app e gia utilizzabile per l'uso quotidiano e include:

- inserimento rapido delle spese tramite parser testuale;
- categorie e metodi di pagamento predefiniti;
- tag, note e modifica delle spese;
- filtri per ricerca, periodo, importo, categoria e metodo;
- timeline con riepilogo giornaliero/settimanale/mensile e selezione multipla;
- statistiche con grafici Chart.js;
- import/export JSON e CSV, export custom con filtri/selezione, copia negli appunti e cancellazione bulk per le spese selezionate dalla timeline;
- tema chiaro/scuro/automatico;
- manifest web app per installazione base;
- baseline PWA/offline con Chart.js locale, release versionata e aggiornamenti scelti dall'utente.

La baseline PWA/offline e completata e pubblicata su `main`: Chart.js e incluso localmente, le release versionate sotto `releases/` registrano service worker con scope limitato alla singola release, `/stable/` registra un launcher offline scoped e le impostazioni mostrano una finestra versioni alimentata da `releases.json`. La release consigliata corrente e `releases/v2026.06.03/`; `/` e `/dev/` non registrano service worker.

## Struttura

```text
.
+-- README.md
+-- AGENTS.md
+-- releases.json
+-- releases/
|   +-- v2026.05.30/
|   +-- v2026.06.03/
+-- docs/
|   +-- CODE_REVIEW.md
|   +-- CURRENT_STATE.md
|   +-- DEPLOYMENT_STRATEGY.md
|   +-- DEVELOPMENT_GUIDE.md
|   +-- PWA_OFFLINE_STRATEGY.md
|   +-- PRIVACY_REVIEW.md
|   +-- REFACTORING_SUMMARY.md
|   +-- ROADMAP.md
+-- note/
|   +-- note_di_progetto.txt
+-- tests/
|   +-- run-tests.js
+-- app/
    +-- index.html
    +-- manifest.json
    +-- css/style.css
    +-- vendor/       # librerie terze locali necessarie all'offline
    +-- js/
        +-- core/        # boot, stato, config, refresh e wiring applicativo
        +-- data/        # localStorage e cache spese
        +-- domain/      # parser, categorie, filtri, statistiche e azioni pure
        +-- input/       # barra inserimento e submit rapido
        +-- filters/     # pannello filtri
        +-- timeline/    # rendering e controller timeline
        +-- stats/       # rendering, grafici e controller statistiche
        +-- modal/       # modifica spesa e workaround mobile
        +-- navigation/  # pagine, stack UI e back button
        +-- settings/    # impostazioni, import/export e info app
        +-- ui/          # conferme, toast, tema, download e helper UI
```

## Documentazione

File documentali ufficiali:

- [Note per agenti](AGENTS.md): memoria operativa per Codex e altri assistenti.
- [Stato corrente](docs/CURRENT_STATE.md): cosa e implementato oggi e come funziona.
- [Review tecnica](docs/CODE_REVIEW.md): problemi, rischi e priorita del refactor.
- [Strategia stabile/dev](docs/DEPLOYMENT_STRATEGY.md): come separare versione stabile e versione di test.
- [Guida sviluppo](docs/DEVELOPMENT_GUIDE.md): regole pratiche per refactor e nuove feature.
- [Strategia PWA/offline](docs/PWA_OFFLINE_STRATEGY.md): piano per offline, service worker, release versionate e aggiornamenti scelti dall'utente.
- [Review privacy](docs/PRIVACY_REVIEW.md): mappa tecnica dei dati locali, rete, export, service worker e rischi residui.
- [Riepilogo refactor](docs/REFACTORING_SUMMARY.md): cosa e stato fatto finora e cosa e rimasto fuori dalla fase conclusa.
- [Roadmap](docs/ROADMAP.md): backlog ordinato a partire dagli appunti.
- [Appunti raw](note/note_di_progetto.txt): fonte grezza e storica delle idee.

Questa lista deve restare completa: se nasce un nuovo documento, va aggiunto qui e in `AGENTS.md`.

## Sviluppo Locale

L'app non richiede build. Si puo aprire direttamente `app/index.html` oppure servire la cartella con un server statico.

Esempio:

```powershell
cd app
python -m http.server 8000
```

Poi aprire `http://localhost:8000`.

Test leggeri disponibili:

```powershell
node tests/run-tests.js
```

Il runner copre i moduli principali estratti durante il refactor: storage, parser, filtri, statistiche, query/cache, refresh, controller UI, modale, impostazioni, conferme, tema, toast, stack UI/history e wiring applicativo.

## Deploy

Il progetto e pensato per GitHub Pages: la repository pubblica target e `tracker-spese`, mentre la cartella `app/` contiene tutti gli asset necessari per il deploy statico.

Durante il refactor, il deploy previsto separa stabile e sviluppo:

- `/` e `/stable/`: versione stabile da `main`;
- `/dev/`: versione di sviluppo dal branch aggregatore `dev`, con storage locale separato.

I branch di fase, per esempio `privacy`, restano dedicati al lavoro corrente. Quando una modifica va provata su Android, viene portata su `dev`; quando una versione testata e pronta per l'uso quotidiano, puo essere promossa con un merge intenzionale verso `main`. Il workflow GitHub Pages parte da `main` e pubblica sia la stabile sia la dev.

Prima di modificare la logica dei dati, leggere `docs/CURRENT_STATE.md` e `docs/DEVELOPMENT_GUIDE.md`.
