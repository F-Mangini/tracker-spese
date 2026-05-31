# Roadmap

Questa roadmap ordina le priorita future. Gli appunti raw restano in `note/note_di_progetto.txt`; il refactor gia svolto e riassunto in `docs/REFACTORING_SUMMARY.md`.

## Stato Refactor

La fase di refactor strutturale e completata per lo scopo previsto:

- canale stabile/dev sicuro;
- protezione dati;
- test runner leggero;
- spacchettamento primario di `core/app.js`;
- verifica manuale Android dei flussi principali.
- promozione della dev refactor a stabile su `main`.

Da qui in avanti le modifiche dovrebbero essere trattate come manutenzione, hardening o nuove feature, non come completamento dello spacchettamento.

## Prossime Priorita

1. Progettare e implementare PWA/offline con versioni controllate, seguendo `docs/PWA_OFFLINE_STRATEGY.md`.
2. Eseguire una review privacy esplicita dopo la fase PWA/offline, quando asset locali, service worker e aggiornamenti saranno piu chiari.
3. Affrontare piccoli bug UX rimasti, soprattutto desktop, gesture Android e flussi import/export.
4. Solo dopo, riprendere personalizzazioni e feature dati piu grandi.

## Repository e Canali

Stato: completato. La dev refactor e stata promossa a stabile; la nuova fase attiva vive sul branch `pwa`.

- Repository target: `tracker-spese`.
- Stabile: `main`, `Where's My Money?`, short name `WMM`, storage `spesa-tracker-data`.
- Dev: `codex/refactor`, `Where's My Bug?`, short name `WMB`, storage separato.
- GitHub Pages pubblica `/` e `/stable/` da `main`, `/dev/` da `codex/refactor`.
- Il workflow Pages parte da `main`.

## Bug e Miglioramenti Vicini

Completati nella tranche di stabilizzazione dev del 2026-05-24:

- Su PC, permettere scroll quando il pannello filtri e completamente aperto.
- Su PC, confermare la modifica alla spesa con Invio.
- Aggiornare live il riepilogo nella tendina quando si aggiungono, modificano o rimuovono spese.
- Nascondere la barra di inserimento quando il pannello filtri e completamente aperto, mantenendola nascosta anche dopo passaggi timeline/statistiche con i filtri ancora aperti.
- Rendere il pannello filtri compatto scrollabile anche quando non completamente aperto: tutti i filtri restano accessibili scrollando, la barra laterale di scroll resta nascosta e la barra riassuntiva inferiore resta sempre visibile fuori dallo scroll.
- Rivedere casi limite tra filtri parzialmente aperti, tastiera e history: corretto il rilascio centralizzato della ricerca filtri quando si toccano controlli interni come spese o pulsante di espansione del pannello filtri, evitando passaggi back invisibili.

Ancora da affrontare:

- Fix animazione quando si fa swipe indietro dal lato sinistro su alcuni Android.
- Rifinire animazione e posizione della barra di inserimento durante apertura/chiusura tastiera.
- Evitare, dove possibile, che l'app si chiuda completamente con back invece di restare nei recenti.

## Dati, Privacy e Import/Export

- Eseguire una review privacy: dati nel browser, asset caricati da rete, backup esportati, device condivisi, eventuale cifratura locale.
- Valutare strutture dati future prima di introdurre categorie custom, ricorrenze, cestino o multi-account.
- Aggiungere export/copia rapida per spese selezionate o filtrate: JSON, CSV/TSV e tabella Markdown.
- Rendere piu chiara la scelta export/import con dialog dedicati e meno grezzi.
- Separare export rapido e custom: export default JSON completo con conferma semplice; export custom con formato, checklist contenuti e filtri/selezione.
- Il JSON deve poter includere dati, impostazioni e future personalizzazioni; CSV/TSV restano formati solo dati.
- In import, se impostazioni o personalizzazioni del backup differiscono da quelle locali, chiedere se mantenere la configurazione attuale o applicare quella del backup.
- Durante import in aggiunta, trattare id duplicati come possibile spesa gia presente e offrire una scelta chiara invece di rigenerare sempre in modo opaco.
- Definire eventuali migrazioni schema in modo idempotente.

## Offline e Installazione

Stato: fase attiva su branch `pwa`.

Obiettivo: app installabile e funzionante offline, con versioni controllate e aggiornamenti scelti dall'utente. La strategia e descritta in `docs/PWA_OFFLINE_STRATEGY.md`.

Passi iniziali:

- verificare installazione, refresh offline e grafici offline su Android.
- definire il flusso di promozione della prossima release senza cambiare automaticamente quella installata.

Completato:

- Chart.js 4.4.7 e incluso localmente in `app/vendor/chart.umd.min.js`.
- `releases.json` e la cartella sorgente `releases/v2026.05.30/` definiscono la prima baseline versionata.
- i manifest dichiarano `scope` esplicito.
- `releases/v2026.05.30/` registra un service worker con scope limitato alla singola release e cache offline degli asset locali.
- le impostazioni leggono `releases.json` e mostrano una UI minima per aprire la release consigliata, senza applicare update automatici.
- il footer impostazioni mostra versione/canale corrente, inclusa la release versionata quando si apre `/releases/vYYYY.MM.DD/`.

## Versioni e Aggiornamenti Controllati

Strategia scelta: release statiche in cartelle versionate, con ultima versione consigliata ma non applicata automaticamente.

- lista versioni disponibili pubblicata dal maintainer;
- ultima versione consigliata ma non installata automaticamente;
- possibilita di mantenere disponibili versioni vecchie stabili;
- UI per scegliere e applicare aggiornamenti;
- strategia per piu versioni su hosting statico tramite cartelle release immutabili;
- compatibilita dati tra versioni;
- flusso guidato per applicare una release scelta dopo il test Android.

## Filtri e Ricerca

- Pannello filtri regolabile e bloccabile con lucchetto.
- Apertura/chiusura pannello tramite swipe su barra inferiore o header.
- Date range picker custom.
- Suggerimenti nella ricerca per categorie, metodi e tag.
- Tag cercabili con prefisso `#`, per esempio `#viaggio`.
- Filtri negativi con stato includi/escludi/neutro.
- Filtri tag con selezione tutti, nessun tag e ricerca tag.
- Filtri preimpostati salvabili.

## Categorie, Metodi e Personalizzazione

- Ordinamento alfabetico robusto di categorie e metodi.
- Sezione personalizzazione.
- Categorie custom: nome, colore, keyword, attiva/non attiva, aggiunta e rimozione.
- Icone categoria coerenti e modificabili.
- Valutare immagini categoria salvate localmente.
- Colori categoria visibili anche sulle card spesa.
- Sostituzione progressiva delle emoji con icone coerenti.

## Cancellazione e Gestione Spese

- Cestino con spese cancellate e ripristinabili.
- Swipe su spesa per eliminazione rapida.
- Swipe orizzontale su singola spesa con azione elimina da un lato e copia dall'altro, lasciando la card parzialmente visibile.
- Pressione lunga per modalita selezione.
- Evidenza visuale dedicata per selezione e cancellazione.
- Azioni bulk: elimina, copia negli appunti, export selezionate.
- Header adattato alla modalita selezione con conteggio e valore totale selezionato.
- Seleziona tutte limitato alle spese visibili/filtrate.
- Modalita selezione riusabile anche per export filtrato: primo ingresso seleziona tutto il filtrato, ingressi successivi riusano la selezione precedente quando sensato.
- Modifica spesa anche dalla pagina statistiche.

## Statistiche e Grafici

- Grafico spese nel tempo colorato per categorie.
- Barre divise per categoria.
- Soglia indicativa per mostrare contributi categoria dentro una barra.
- Grafico a torta con label principali e percentuali minori in elenco.
- Linee verticali tratteggiate per settimane, mesi o anni.
- Eventuale segnale visivo per sforamento budget.

## Funzioni Future

- Spese ricorrenti.
- Backup schedulato.
- Accrediti oltre alle spese.
- Multi-account locale, con isolamento dati da progettare bene.
- Swipe orizzontale tra timeline, statistiche e impostazioni.
- Foto scontrini, OCR e parsing automatico.
- Chatbot per interrogare i dati gia filtrati.

## Bassa Priorita

- Problemi specifici iOS non bloccanti.
- Browser mobile generico.
- Rifiniture desktop non essenziali.
- Feature sperimentali come OCR e chatbot.
