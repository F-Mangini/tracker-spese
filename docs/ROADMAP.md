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

1. Affrontare piccoli bug UX rimasti, soprattutto desktop, gesture Android e flussi import/export.
2. Rendere piu chiari export/import e preparare il futuro export custom senza cambiare schema dati.
3. Migliorare statistiche e visualizzazioni quando i flussi UX vicini sono stabili.
4. Solo dopo, riprendere personalizzazioni e feature dati piu grandi.

Completato il 2026-06-01:

- Review privacy esplicita documentata in `docs/PRIVACY_REVIEW.md`, ora che asset locali, service worker e aggiornamenti sono piu chiari.
- Primo nucleo UX della modalita selezione timeline: pressione lunga su card, selezione multipla volatile, seleziona tutte le spese filtrate, riepilogo selezionate, copia negli appunti, export JSON/CSV della selezione, eliminazione bulk con snapshot e back button dedicato.

Completato il 2026-06-03:

- Fix del totale `Settimana` nel riepilogo timeline e nella barra del pannello filtri: ora conta solo la settimana corrente lunedi-domenica e non include settimane future.
- Fix del parser categorie/metodi: le keyword vengono riconosciute solo come termini interi, cosi `bus` non viene letto dentro `busta`.
- Nuova release statica `releases/v2026.06.03/` creata e segnalata come consigliata in `releases.json`; la precedente `v2026.05.30` resta disponibile come release stabile storica.

Aggiunte dagli appunti del 2026-06-03 e 2026-06-04:

- Comportamento del tasto filtri configurabile, con modalita `adattivo`.
- Pulsante `+` nella barra di inserimento per scegliere data e ora della nuova spesa.
- Parsing `.<categoria>` per forzare la categoria dall'inserimento rapido.
- Animazioni verticali del banner riassuntivo quando si disattivano i filtri e quando si entra/esce dalla modalita selezione.
- Import ed export da rendere piu coerenti nella pagina impostazioni, possibilmente nella stessa card.
- Statistiche per categoria e dettaglio categorie da unificare in una sezione con piu viste selezionabili via swipe.
- Nuove aggregazioni statistiche trasversali, per esempio distribuzione delle spese nei giorni della settimana calcolata su tutte le settimane nel periodo filtrato.

Completato su `codex/ux-export`:

- Import ed export riuniti nella stessa card impostazioni.
- Export Default con JSON completo e conferma semplice.
- Prima finestra Export Custom con formato JSON/CSV, checklist contenuti, preferenze locali salvate, conteggio selezione e collegamento ai filtri tramite modalita selezione timeline.
- JSON custom configurabile per impostazioni e segnaposto personalizzazioni; CSV resta solo dati.

## Repository e Canali

Stato: completato. La dev refactor e stata promossa a stabile; la baseline della nuova fase PWA/offline e stata pubblicata su `main` per i test reali.

- Repository target: `tracker-spese`.
- Stabile: `main`, `Where's My Money?`, short name `WMM`, storage `spesa-tracker-data`.
- Dev pubblica: branch aggregatore `dev`, `Where's My Bug?`, short name `WMB`, storage separato.
- Branch di fase attuale: `ux`.
- GitHub Pages pubblica `/` e `/stable/` da `main`, `/dev/` da `dev`.
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

- Comportamento del tasto filtri personalizzabile, inclusa modalita `adattivo` che decide se aprire automaticamente la tastiera in base alla dimensione del pannello semi-aperto.
- Fix animazione quando si fa swipe indietro dal lato sinistro su alcuni Android.
- Rifinire animazione e posizione della barra di inserimento durante apertura/chiusura tastiera.
- Animazione verticale del banner riassuntivo quando si disattivano filtri e quando si entra o esce dalla modalita selezione.
- Evitare, dove possibile, che l'app si chiuda completamente con back invece di restare nei recenti.

## Dati, Privacy e Import/Export

- Review privacy completata in `docs/PRIVACY_REVIEW.md`: dati nel browser, asset caricati da rete, backup esportati, device condivisi, service worker e cifratura locale.
- Ripristino dall'ultimo snapshot locale e opzione per eliminare anche lo snapshot nella cancellazione completa aggiunti alle impostazioni; lo snapshot viene creato anche prima di import in aggiunta, cambio versione e cancellazione multipla dalla timeline.
- Chiarire nella UI export che JSON/CSV/raw sono file in chiaro.
- Valutare strutture dati future prima di introdurre categorie custom, ricorrenze, cestino o multi-account.
- Completato primo export rapido per spese selezionate: JSON e CSV dalla modalita selezione timeline.
- Aggiungere altri formati per spese selezionate o filtrate: TSV e tabella Markdown.
- Rendere piu chiara la scelta import con dialog dedicato e meno grezzo.
- Export rapido e custom completati come prima versione: Default JSON completo; Custom con formato, checklist contenuti e filtri/selezione.
- Il JSON custom puo includere dati, impostazioni e segnaposto per future personalizzazioni; CSV resta formato solo dati.
- In import, se impostazioni o personalizzazioni del backup differiscono da quelle locali, chiedere se mantenere la configurazione attuale o applicare quella del backup.
- Durante import in aggiunta, trattare id duplicati come possibile spesa gia presente e offrire una scelta chiara invece di rigenerare sempre in modo opaco.
- Definire eventuali migrazioni schema in modo idempotente.

## Offline e Installazione

Stato: baseline completata e pubblicata su `main`.

Obiettivo: app installabile e funzionante offline, con versioni controllate e aggiornamenti scelti dall'utente. La strategia e descritta in `docs/PWA_OFFLINE_STRATEGY.md`.

Completato:

- Chart.js 4.4.7 e incluso localmente in `app/vendor/chart.umd.min.js`.
- `releases.json` e la cartella sorgente `releases/v2026.05.30/` definiscono la prima baseline versionata.
- `releases/v2026.06.03/` definisce la release consigliata corrente.
- i manifest dichiarano `scope` esplicito.
- `releases/v2026.05.30/` registra un service worker con scope limitato alla singola release e cache offline degli asset locali.
- le impostazioni leggono `releases.json` e mostrano una finestra versioni per installare `stable/latest` o la release consigliata, con badge `Installata` e senza applicare update automatici.
- la PWA installata dalla stable riapre la release scelta tramite preferenza locale, finche l'utente non torna a `stable/latest`.
- `/stable/` registra un launcher offline scoped che permette allo start URL installato dalla stable di avviarsi offline e raggiungere la release scelta, senza controllare `/`, `/dev/` o `/releases/`.
- il footer impostazioni mostra versione/canale corrente, inclusa la release versionata quando si apre `/releases/vYYYY.MM.DD/`.
- installazione, riapertura offline e comportamento Android della baseline sono stati verificati dal maintainer.

## Versioni e Aggiornamenti Controllati

Stato: baseline completata. La strategia scelta e release statiche in cartelle versionate, con ultima versione consigliata ma non applicata automaticamente.

Completato:

- lista versioni disponibili pubblicata dal maintainer;
- ultima versione consigliata ma non installata automaticamente;
- possibilita di mantenere disponibili versioni vecchie stabili tramite cartelle release immutabili;
- UI per scegliere e installare una versione esplicita;
- flusso guidato minimo per applicare una release scelta.

Da riprendere solo quando servira:

- procedura di pubblicazione delle release successive;
- compatibilita dati tra versioni se cambiera lo schema;
- gestione di ulteriori release reali oltre a `v2026.05.30` e `v2026.06.03`.

## Filtri e Ricerca

- Pressione prolungata sul tasto filtri dell'header per attivare/disattivare filtri rapidi personalizzabili dalla futura pagina di personalizzazione.
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
- Modalita selezione base completata: pressione lunga, evidenza verde, evidenza rossa durante conferma eliminazione, header con cerca e seleziona filtrate, bottom nav con copia/export/elimina, riepilogo con conteggio e valore totale selezionato, seleziona tutte come toggle sul filtrato corrente e filtro speciale `Selezionate` attivo solo in modalita selezione.
- Azioni bulk ancora da completare: formati TSV/tabella Markdown.
- Rendere la modalita selezione riusabile dal futuro export custom: primo ingresso seleziona tutto il filtrato, ingressi successivi riusano la selezione precedente quando sensato.
- Modifica spesa anche dalla pagina statistiche.

## Statistiche e Grafici

- Unificare `Per categoria` e `Dettaglio categorie` in una sola sezione con viste alternative selezionabili via swipe: torta, barre, elenco/dettaglio e future varianti.
- Nel grafico a torta mostrare label o percentuali per le categorie principali e spostare le quote minori in un elenco sotto la visualizzazione, riusando l'attuale dettaglio categorie come una delle viste.
- Aggiungere aggregazioni statistiche trasversali al periodo filtrato, per esempio distribuzione delle spese nei giorni della settimana considerando tutte le settimane incluse.
- Grafico spese nel tempo colorato per categorie.
- Barre divise per categoria.
- Soglia indicativa per mostrare contributi categoria dentro una barra.
- Linee verticali tratteggiate per settimane, mesi o anni.
- Eventuale segnale visivo per sforamento budget.

## Funzioni Future

- Pulsante `+` a sinistra nella barra di inserimento per selezionare data e ora della nuova spesa.
- Parsing di `.<categoria>` nella barra di inserimento per forzare una categoria; se il pattern compare piu volte, usare l'ultima occorrenza.
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
