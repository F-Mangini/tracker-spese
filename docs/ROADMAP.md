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
2. Stabilizzare visibilita di campi selezionati e tendine sopra la tastiera mobile, soprattutto nelle finestre `Modifica spesa` ed `Esporta`.
3. Migliorare statistiche e visualizzazioni quando i flussi UX vicini sono stabili.
4. Solo dopo, riprendere personalizzazioni, ordinamenti alternativi e feature dati piu grandi.

Completato il 2026-06-01:

- Review privacy esplicita documentata in `docs/PRIVACY_REVIEW.md`, ora che asset locali, service worker e aggiornamenti sono piu chiari.
- Primo nucleo UX della modalita selezione timeline: pressione lunga su card, selezione multipla volatile, seleziona tutte le spese filtrate, riepilogo selezionate, copia negli appunti, apertura export custom dalla selezione, eliminazione bulk con snapshot e back button dedicato.

Completato il 2026-06-03:

- Fix del totale `Settimana` nel riepilogo timeline e nella barra del pannello filtri: ora conta solo la settimana corrente lunedi-domenica e non include settimane future.
- Fix del parser categorie/metodi: le keyword vengono riconosciute solo come termini interi, cosi `bus` non viene letto dentro `busta`.
- Nuova release statica `releases/v2026.06.03/` creata e segnalata come consigliata in `releases.json`; la precedente `v2026.05.30` resta disponibile come release stabile storica.

Completato il 2026-06-12:

- Promosse le modifiche di `dev` su `main`, aggiornando `stable/latest`.
- Nuova release statica `releases/v2026.06.12/` creata e segnalata come consigliata in `releases.json`; le release `v2026.06.03` e `v2026.05.30` restano disponibili come stabili storiche.

Completato il 2026-07-14:

- Promosse tutte le modifiche validate di `dev` su `main`, aggiornando `stable/latest` con toggle data nell'header, parser categoria esplicita, filtri rapidi e negativi, ricerca tag con `#`, swipe tra pagine e colori categoria stabili.
- Nuova release immutabile `releases/v2026.07.14/` creata e segnalata come consigliata in `releases.json`; `v2026.06.12` resta disponibile come stabile storica.

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
- Prima finestra `Esporta` configurabile con formato JSON/CSV, checklist contenuti, selezione automatica iniziale di tutte le spese, memoria dell'ultimo export riuscito, toggle `Ultima Selezione` / `Ultimi Filtri`, conteggio selezione e collegamento ai filtri tramite modalita selezione timeline.
- JSON custom configurabile per impostazioni e segnaposto personalizzazioni; CSV resta solo dati.

Completato nella stabilizzazione export/selezione su `dev`:

- Finestra `Esporta` rifinita con checklist contenuti tematizzata, formattazione importi compatta e default coerenti tra apertura da Impostazioni e apertura dalla timeline.
- Toggle `Ultimi Filtri` stabilizzato: sostituisce i filtri correnti con quelli dell'ultimo export riuscito, resta attivo solo quando filtri e selezione corrispondono, e ripristina filtri/selezione precedenti quando viene spento.
- Modalita selezione e bottom nav stabilizzate: cambio set piu reattivo, supporto rotellina desktop, chiusura completa dei filtri prima di export/eliminazione e conferma per uscire verso Impostazioni.
- History corretta nei flussi selezione/export: uscire da Selezione verso Impostazioni aspetta la chiusura degli stati UI programmati, cosi il back successivo torna alla Timeline.

Step roadmap completato il 2026-06-12:

- Rendere piu chiari export/import e preparare il futuro export custom senza cambiare schema dati.
- La parte export dello step e chiusa: `Default` produce un JSON completo con conferma semplice; `Custom` apre la finestra `Esporta` con formato JSON/CSV, checklist dei contenuti, memoria dell'ultimo export riuscito, riapplicazione di ultima selezione o ultimi filtri e integrazione con la modalita selezione timeline.
- Il preparatorio per dati futuri e presente senza cambio schema: il JSON custom puo includere impostazioni e segnaposto per personalizzazioni future, mentre il CSV resta limitato ai dati tabellari.
- Restano lavori separati sull'import: dialog piu curato, scelta su impostazioni/personalizzazioni diverse e gestione esplicita di possibili duplicati in aggiunta.

Aggiunte dagli appunti del 2026-06-12:

- Sistemare la visibilita mobile di campi selezionati e tendine quando si apre la tastiera, in particolare nei dropdown di `Modifica spesa` e `Esporta`.
- Valutare ordinamenti alternativi della timeline, a partire dall'ordinamento opzionale per valore della spesa invece che solo cronologico.

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

- Sistemare la visibilita sopra tastiera di campi selezionati e tendine nelle finestre `Modifica spesa` ed `Esporta`; oggi il comportamento e parziale e fragile.
- Comportamento del tasto filtri personalizzabile, inclusa modalita `adattivo` che decide se aprire automaticamente la tastiera in base alla dimensione del pannello semi-aperto.
- Fix animazione quando si fa swipe indietro dal lato sinistro su alcuni Android.
- Rifinire animazione e posizione della barra di inserimento durante apertura/chiusura tastiera.
- Animazione verticale del banner riassuntivo quando si disattivano filtri e quando si entra o esce dalla modalita selezione.
- Evitare, dove possibile, che l'app si chiuda completamente con back invece di restare nei recenti.

## Dati, Privacy e Import/Export

- Review privacy completata in `docs/PRIVACY_REVIEW.md`: dati nel browser, asset caricati da rete, backup esportati, device condivisi, service worker e cifratura locale.
- Ripristino dall'ultimo snapshot locale e opzione per eliminare anche lo snapshot nella cancellazione completa aggiunti alle impostazioni; lo snapshot viene creato anche prima di import in aggiunta, cambio versione e cancellazione multipla dalla timeline.
- Rivalutare dove spiegare che JSON/CSV/raw sono file in chiaro se l'app verra condivisa oltre l'uso personale del maintainer, evitando disclaimer ripetuti nei flussi quotidiani.
- Valutare strutture dati future prima di introdurre categorie custom, ricorrenze, cestino o multi-account.
- Completato primo export rapido per spese selezionate: la modalita selezione timeline apre la finestra `Esporta` conservando la selezione corrente.
- Aggiungere altri formati per spese selezionate o filtrate: TSV e tabella Markdown.
- Export rapido e configurabile completati come prima versione: Default JSON completo; finestra `Esporta` con formato, checklist contenuti, filtri/selezione, ripristino dell'ultimo export riuscito e toggle per riapplicare ultima selezione o ultimi filtri.
- Il JSON custom puo includere dati, impostazioni e segnaposto per future personalizzazioni; CSV resta formato solo dati.
- Rendere piu chiara la scelta import con dialog dedicato e meno grezzo.
- In import, se impostazioni o personalizzazioni del backup differiscono da quelle locali, chiedere se mantenere la configurazione attuale o applicare quella del backup.
- Durante import in aggiunta, trattare id duplicati come possibile spesa gia presente e offrire una scelta chiara invece di rigenerare sempre in modo opaco.
- Definire eventuali migrazioni schema in modo idempotente.

## Offline e Installazione

Stato: baseline completata e pubblicata su `main`.

Obiettivo: app installabile e funzionante offline, con versioni controllate e aggiornamenti scelti dall'utente. La strategia e descritta in `docs/PWA_OFFLINE_STRATEGY.md`.

Completato:

- Chart.js 4.4.7 e incluso localmente in `app/vendor/chart.umd.min.js`.
- `releases.json` e la cartella sorgente `releases/v2026.05.30/` definiscono la prima baseline versionata.
- `releases/v2026.07.14/` definisce la release consigliata corrente.
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
- gestione di ulteriori release reali successive a `v2026.07.14`.

## Miglioramenti UX completati il 2026-07-12

- Toggle del titolo header con la data odierna, dissolvenza in uscita/entrata e stato non persistente.
- Parsing di `.<categoria>` per forzare una categoria, con precedenza all'ultima direttiva valida.
- Swipe orizzontale interattivo tra Timeline, Statistiche e Impostazioni: le pagine seguono il dito prima del rilascio e completano o annullano lo slide in base alla soglia; l'animazione e separata dal fade usato dalla bottom nav, mantiene banner sticky e barra di inserimento alla quota corretta e avvia una sola volta le normali animazioni dei grafici durante l'anteprima.
- Ricerca tag solo tramite prefisso `#`, confronto per inizio tag e combinazione AND tra testo libero e uno o piu tag in qualsiasi ordine.
- Colori categoria fissi nelle statistiche, con blu dedicato per `Viaggi` distinto dal verde di `Abbigliamento`.

## Miglioramenti filtri completati il 2026-07-13

- Filtri negativi tri-state per categorie, metodi di pagamento e filtro speciale `Selezionate`: neutro, incluso verde con tap ed escluso rosso con pressione lunga, con inclusioni ed esclusioni combinabili e conservate negli snapshot dell'export custom. La sezione dinamica della modalita selezione mostra la stessa spunta grigia del toggle `Seleziona tutte` nell'header.
- Filtro rapido tramite pressione prolungata sul pulsante filtri: salvataggio dal pannello completamente aperto e attivazione dal pannello chiuso o compatto. Quando la configurazione corrente coincide con il rapido viene ripristinata l'ultima combinazione diversa osservata, anche se il rapido era stato raggiunto manualmente; il reset diventa una nuova base vuota e il filtro `Selezionate` non viene memorizzato.

## Miglioramenti navigazione completati il 2026-07-14

- Swipe pagina piu responsivo: i flick brevi ma veloci possono completare il cambio senza raggiungere la soglia di distanza; la sensibilita include una soglia aggiuntiva per micro-flick da almeno 12 px e 0,45 px/ms, mantenendo protetti i movimenti piu corti, lenti o diagonali. L'assestamento usa 240 ms e una decelerazione finale piu lunga per un movimento piu calmo e leggibile.
- Concatenazione degli swipe: un nuovo gesto puo iniziare durante l'assestamento del precedente, che viene concluso immediatamente prima di passare alla pagina successiva.

## Filtri e Ricerca

- Pannello filtri regolabile e bloccabile con lucchetto.
- Apertura/chiusura pannello tramite swipe su barra inferiore o header.
- Date range picker custom.
- Suggerimenti nella ricerca per categorie, metodi e tag.
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
- Modalita selezione riusata dall'export configurabile: primo ingresso da impostazioni seleziona tutte le spese, ingressi successivi riusano l'ultimo export riuscito, mentre l'apertura dalla timeline conserva la selezione corrente e la finestra permette di tornare a ultima selezione o ultimi filtri.
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
- Ordinamento opzionale della timeline per valore della spesa, e valutazione di altre modalita di ordinamento.
- Spese ricorrenti.
- Backup schedulato.
- Accrediti oltre alle spese.
- Multi-account locale, con isolamento dati da progettare bene.
- Foto scontrini, OCR e parsing automatico.
- Chatbot per interrogare i dati gia filtrati.

## Bassa Priorita

- Problemi specifici iOS non bloccanti.
- Browser mobile generico.
- Rifiniture desktop non essenziali.
- Feature sperimentali come OCR e chatbot.
