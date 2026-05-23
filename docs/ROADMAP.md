# Roadmap

Questa roadmap ordina le priorita future. Gli appunti raw restano in `note/note_di_progetto.txt`; il refactor gia svolto e riassunto in `docs/REFACTORING_SUMMARY.md`.

## Stato Refactor

La fase di refactor strutturale e completata per lo scopo previsto:

- canale stabile/dev sicuro;
- protezione dati;
- test runner leggero;
- spacchettamento primario di `app.js`;
- verifica manuale Android dei flussi principali.

Da qui in avanti le modifiche dovrebbero essere trattate come manutenzione, hardening o nuove feature, non come completamento dello spacchettamento.

## Prossime Priorita

1. Stabilizzare la dev per eventuale promozione a stabile.
2. Eseguire una review privacy esplicita.
3. Progettare PWA/offline e aggiornamenti controllati prima di scrivere service worker.
4. Affrontare piccoli bug UX rimasti, soprattutto desktop e gesture Android.
5. Solo dopo, riprendere personalizzazioni e feature dati piu grandi.

## Repository e Canali

Stato: completato.

- Repository target: `tracker-spese`.
- Stabile: `main`, `Where's My Money?`, short name `WMM`, storage `spesa-tracker-data`.
- Dev: `codex/refactor`, `Where's My Bug?`, short name `WMB`, storage separato.
- GitHub Pages pubblica `/` e `/stable/` da `main`, `/dev/` da `codex/refactor`.
- Il workflow Pages parte da `main`.

## Bug e Miglioramenti Vicini

- Fix animazione quando si fa swipe indietro dal lato sinistro su alcuni Android.
- Su PC, permettere scroll quando il pannello filtri e completamente aperto.
- Su PC, confermare la modifica alla spesa con Invio.
- Aggiornare live il riepilogo nella tendina quando si aggiungono o rimuovono spese.
- Rifinire animazione e posizione della barra di inserimento durante apertura/chiusura tastiera.
- Nascondere la barra di inserimento quando il pannello filtri e completamente aperto.
- Rendere il pannello filtri scrollabile anche quando non completamente aperto.
- Rivedere casi limite tra filtri parzialmente aperti, modifica spesa e history.
- Evitare, dove possibile, che l'app si chiuda completamente con back invece di restare nei recenti.

## Dati, Privacy e Import/Export

- Eseguire una review privacy: dati nel browser, asset caricati da rete, backup esportati, device condivisi, eventuale cifratura locale.
- Valutare strutture dati future prima di introdurre categorie custom, ricorrenze, cestino o multi-account.
- Aggiungere export/copia rapida per spese selezionate o filtrate: JSON, CSV/TSV e tabella Markdown.
- Estendere il backup completo a future personalizzazioni, non solo spese e impostazioni.
- Definire eventuali migrazioni schema in modo idempotente.

## Offline e Installazione

Obiettivo: app installabile e funzionante offline, con aggiornamenti controllati.

Passi probabili:

- rendere Chart.js locale;
- aggiungere service worker;
- definire cache versionata per HTML, CSS, JS, manifest e icone;
- verificare comportamento su GitHub Pages;
- migliorare icone, favicon e manifest;
- evitare update automatici silenziosi.

## Versioni e Aggiornamenti Controllati

Da progettare:

- lista versioni disponibili pubblicata dal maintainer;
- ultima versione consigliata ma non installata automaticamente;
- possibilita di mantenere disponibili versioni vecchie stabili;
- UI per scegliere e applicare aggiornamenti;
- strategia per piu versioni su hosting statico;
- compatibilita dati tra versioni.

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
- Pressione lunga per modalita selezione.
- Evidenza visuale dedicata per selezione e cancellazione.
- Azioni bulk: elimina, seleziona tutte.
- Seleziona tutte limitato alle spese visibili/filtrate.
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
