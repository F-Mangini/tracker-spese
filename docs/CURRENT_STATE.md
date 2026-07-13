# Stato Corrente

Questo documento descrive lo stato tecnico implementato oggi. Non e un diario del refactor: per quello vedere `docs/REFACTORING_SUMMARY.md`.

## Sintesi

Where's My Money? e una web app statica, local-first, senza backend e senza build system. I dati vivono in `localStorage`; l'app e pensata prima di tutto per uso quotidiano su Android.

Lo spacchettamento primario di `app/js/core/app.js` e completato. `app.js` resta il punto di boot e orchestrazione sottile; stato iniziale, wiring, rendering, controller, logica dati e workaround principali sono in moduli dedicati, organizzati in cartelle per area dentro `app/js/`.

## Architettura

| Area | File principali | Responsabilita |
| --- | --- | --- |
| Boot e stato | `core/app.js`, `core/app-state.js`, `core/app-wiring.js`, `core/app-wiring-modal.js` | Avvio app, stato iniziale, option factory e collegamento tra controller, stato condiviso, history e DOM. |
| Config e dominio statico | `core/config.js`, `domain/categories.js` | Config runtime minima, chiave storage configurabile, categorie e metodi statici. |
| Persistenza e dati derivati | `data/storage.js`, `data/expense-store.js`, `domain/expense-query.js`, `core/app-refresh.js` | Storage protetto, cache UI, modelli filtrati/statistici e policy di refresh post-commit. |
| Inserimento e spese | `domain/parser.js`, `domain/expense-actions.js`, `input/expense-submit-controller.js`, `input/expense-input-controller.js`, `input/input-bar-controller.js` | Parser testuale, add/update/delete, submit rapido, dettatura, focus mobile e layout barra input. |
| Timeline e filtri | `timeline/timeline-view.js`, `timeline/timeline-controller.js`, `timeline/timeline-selection-controller.js`, `domain/filters.js`, `filters/filter-view.js`, `filters/filter-controller.js` | Rendering timeline, selezione multipla volatile, modello filtrato, pannello filtri, slider, badge e ricerca. |
| Statistiche | `domain/stats.js`, `stats/stats-view.js`, `stats/stats-charts.js`, `stats/stats-controller.js` | Periodi, aggregazioni, template statistiche e configurazione Chart.js. |
| Modale modifica | `modal/modal-view.js`, `modal/modal-form-controller.js`, `modal/modal-mobile-controller.js`, `modal/modal-interactions.js`, `modal/modal-controller.js` | Form modifica, dropdown, tag, picker mobile, focus/blur e lifecycle modale. |
| Navigazione e stack UI | `navigation/navigation-controller.js`, `navigation/ui-stack.js`, `navigation/history-controller.js`, `navigation/ui-stack-effects.js`, `navigation/ui-stack-controller.js` | Navigazione pagine, scroll per pagina, decisioni `popstate`, esecuzione history e cleanup DOM. |
| Impostazioni e feedback | `settings/settings-view.js`, `settings/settings-actions.js`, `settings/settings-controller.js`, `ui/confirm-dialog.js`, `ui/confirm-controller.js`, `ui/download-controller.js`, `ui/theme-controller.js`, `ui/toast-controller.js` | Import/export, conferme, download, tema, toast e pagina impostazioni. |
| Helper UI | `ui/ui-utils.js`, `ui/header-title-controller.js` | Formattazione importi/date, escape HTML, parsing importi nei form e toggle titolo/data dell'header. |

Chart.js e incluso localmente in `app/vendor/chart.umd.min.js`. Il codice sorgente `app/` registra `stable-launch-service-worker.js` solo quando e servito da `/stable/`; il service worker ha scope `./`, cachea gli asset della stable scoped e serve a far partire la preferenza di avvio verso una release scelta anche offline. `/` e `/dev/` restano senza controllo offline diretto.

La baseline PWA/offline e completata: `releases.json` descrive le versioni pubblicate, `releases/v2026.05.30/` resta la prima baseline verificata dal maintainer su Android e `releases/v2026.06.03/` e la release consigliata corrente. I manifest dichiarano `scope` esplicito; le release versionate registrano `service-worker.js` solo dal proprio path e usano cache offline namespaced per gli asset locali della singola release. Le impostazioni leggono `releases.json` e mostrano una sezione `Versioni` con un pulsante che apre una finestra dedicata per installare `stable/latest` o una release consigliata, senza applicare aggiornamenti automatici. Quando l'utente sceglie una versione, il path scelto (`stable/` o `releases/v.../`) viene salvato come preferenza di avvio; prima della navigazione vengono consumate le entry history interne della finestra versioni e della pagina impostazioni, poi la pagina corrente viene sostituita. Cosi il back non puo riaprire una versione precedente e non trova stati interni invisibili da chiudere. Se una vecchia pagina torna da bfcache, il controllo `pageshow` la rimanda alla versione scelta. Se la PWA e installata da `/stable/`, il launcher offline permette alla stable scoped di avviarsi anche offline quanto basta per leggere la preferenza e reindirizzare alla release.

## Dati Locali

La chiave stabile e `spesa-tracker-data`. Puo essere sovrascritta da `window.SPESA_TRACKER_CONFIG.storageKey`; la dev pubblicata accanto alla stabile usa una chiave separata.

Struttura principale:

```js
{
  schemaVersion: 1,
  spese: [],
  impostazioni: {
    tema: "auto",
    valuta: "EUR",
    simbolo: "\u20ac",
    ultimoBackup: null
  }
}
```

Una spesa contiene normalmente:

- `id`;
- `importo`;
- `descrizione`;
- `categoria`;
- `metodo`;
- `data`;
- `tags`;
- `nota`;
- `creatoIl` e `modificatoIl`.

`data/storage.js` normalizza letture e import: importi numerici, date valide, tag senza `#`, impostazioni con fallback e id duplicati rigenerati. Le scritture ritornano risultati espliciti `{ success, ... }`.

Gli importi vengono salvati come numeri ma visualizzati con una regola compatta: senza centesimi quando l'importo e intero, con due decimali sotto 100 quando servono, e arrotondati all'intero piu vicino da 100 in su.

Se il JSON locale e corrotto o incompatibile, i nuovi salvataggi vengono bloccati per evitare perdita dati silenziosa. La pagina impostazioni permette l'export del raw.

La cancellazione multipla dalla timeline crea uno snapshot locale prima del commit. JSON e CSV possono essere generati anche da un subset temporaneo di spese selezionate senza cambiare schema dati.

L'export Default genera un backup JSON completo. L'export configurabile, aperto dalle impostazioni con il pulsante `Custom` e mostrato come finestra `Esporta`, salva preferenze locali dedicate per formato, contenuti e ultimo export riuscito: al primo uso seleziona automaticamente tutte le spese, poi riapplica gli ultimi filtri esportati e seleziona tutte le spese filtrate da quello snapshot. Nella finestra dedicata i toggle `Ultima Selezione` e `Ultimi Filtri` permettono di riapplicare rispettivamente gli id esportati o il risultato dei filtri salvati nell'ultimo export riuscito; lo stato dei toggle e derivato dalla selezione corrente e non salva bozze. Se `Dati` e disattivato il conteggio mostra 0 spese selezionate. JSON puo includere o escludere impostazioni e il segnaposto delle future personalizzazioni, mentre CSV esporta solo dati tabellari e forza temporaneamente la checklist ai soli dati; tornando da CSV a JSON vengono ripristinati i contenuti selezionati prima del passaggio a CSV. CSV e supportato per interoperabilita con fogli di calcolo e preserva i campi principali attuali, ma resta meno adatto a futuri dati complessi.

## Funzioni Implementate

### Inserimento Rapido

L'utente scrive testo libero nella barra inferiore. Il parser estrae importo, tag, metodo e categoria probabile; se la descrizione resta vuota usa `Spesa`. Le keyword di categoria e metodo vengono riconosciute solo come termini interi, quindi una keyword breve come `bus` non viene letta dentro parole piu lunghe come `busta`.

Una direttiva `.<categoria>` senza spazio dopo il punto forza la categoria e viene rimossa dalla descrizione. Sono accettati id o nomi in forma compatta, anche con trattino; se sono presenti piu direttive valide prevale l'ultima.

Sono gestiti importi con punto, virgola, valuta esplicita e frasi con piu numeri, per esempio `pizza 4 formaggi 8 euro`. La dettatura vocale usa `SpeechRecognition` o `webkitSpeechRecognition` quando disponibili.

### Timeline

La timeline mostra spese raggruppate per giorno, ordinate dalla piu recente. Il riepilogo mostra totali di oggi, settimana corrente e mese; il totale settimanale considera solo il periodo lunedi-domenica della settimana corrente, senza includere settimane future. Con filtri attivi mostra anche il riepilogo filtrato. Le card aprono la modale di modifica.

Una pressione lunga su una card entra in modalita selezione e seleziona quella spesa. In modalita selezione il click sulle card alterna selezionata/non selezionata, il riepilogo mostra numero e totale delle spese selezionate, il titolo dell'header resta invariato, il pulsante cerca resta nella posizione normale e il toggle tema dell'header viene sostituito dal toggle `Seleziona tutte`. Le azioni copia negli appunti, export configurabile ed eliminazione con conferma vivono nella bottom nav come set dedicato disponibile solo in timeline; il pulsante `Esporta` apre la finestra `Esporta` sopra la timeline conservando la selezione corrente. Se il pannello filtri e semi-aperto o completamente aperto, i pulsanti `Esporta` ed `Elimina` lo chiudono completamente prima di aprire la finestra o la conferma, consumando gli stati history dei filtri prima del nuovo stato UI. I pulsanti Timeline, Statistiche e Impostazioni restano raggiungibili con uno swipe orizzontale che cambia l'intero set di tre bottoni, senza scroll parziale; su desktop lo stesso cambio set e disponibile con hover sulla bottom nav e rotellina verticale. Se la modalita selezione e attiva e l'utente prova ad aprire Impostazioni dalla bottom nav, l'app chiede `Uscire da Selezione?`: `Annulla` resta nella pagina corrente, `Esci` annulla la selezione e poi apre Impostazioni. Se filtri, ricerca filtri o selezione hanno stati history gia aperti, la navigazione a Impostazioni viene rimandata finche i popstate programmati per chiuderli sono rientrati; cosi il back successivo da Impostazioni torna alla Timeline invece di chiudere l'app. In statistiche resta disponibile solo il set principale della bottom nav; tornando da quella pagina alla timeline il set principale resta visibile finche l'utente non richiede di nuovo il set azioni con lo swipe. La modalita resta visibile anche passando alle statistiche, con header e barra pagine evidenziati, ma `Seleziona tutte` resta disponibile solo in timeline. `Seleziona tutte` lavora come toggle sul filtrato corrente: aggiunge le spese filtrate non ancora selezionate, oppure deseleziona solo quelle filtrate quando sono gia tutte selezionate, senza toccare eventuali spese selezionate fuori filtro. Durante la modalita selezione il pannello filtri mostra la sezione `☑️ Selezione` e il filtro speciale `Selezionate`, disponibile in timeline e statistiche. Il chip segue lo stesso ciclo tri-state degli altri filtri: neutro, incluso verde per mostrare solo lo snapshot delle spese selezionate, escluso rosso per mostrare tutte le altre spese, quindi di nuovo neutro. Lo snapshot viene acquisito entrando nello stato verde e resta invariato anche passando al rosso o selezionando/deselezionando altre spese; viene rinnovato dopo il ritorno a neutro e una nuova attivazione.

### Filtri

I filtri sono condivisi tra timeline e statistiche:

- ricerca testuale su descrizione e nota; i termini preceduti da `#` cercano invece i tag per prefisso e possono essere combinati con il testo in qualsiasi ordine. Tutto il testo e tutti i tag indicati devono corrispondere;
- range data;
- importo minimo/massimo;
- categorie con stato tri-state neutro/incluso/escluso;
- metodi di pagamento con stato tri-state neutro/incluso/escluso.
- selezionate, disponibile solo durante la modalita selezione timeline.

Per categorie e metodi, un tap porta il chip da neutro a incluso (verde), il successivo a escluso (rosso) e il terzo di nuovo a neutro. Se un gruppo non contiene inclusioni verdi, restano ammesse tutte le voci tranne quelle rosse; se contiene almeno un'inclusione, passano solo le voci verdi non escluse. Categorie e metodi si combinano tra loro, quindi per esempio si possono mostrare i soli pagamenti con carta escludendo contemporaneamente la categoria `bollette`. Gli stati esclusi fanno parte anche degli snapshot temporanei dei filtri usati dall'export custom, senza cambiare lo schema delle spese o il backup dati.

Il pannello ha uno stato compatto e uno completamente aperto. I contenuti dei filtri restano gli stessi in entrambi gli stati: nel pannello compatto lo spazio scrollabile visibile e ridotto alla zona della ricerca e il resto dei controlli si raggiunge scrollando internamente, senza mostrare la barra laterale di scroll. La barra riassuntiva inferiore del pannello resta fuori dallo scroll ed e sempre visibile quando i filtri sono aperti. Il badge del pulsante filtri mostra il numero di filtri attivi.

Il riepilogo nella tendina filtri viene aggiornato anche dopo aggiunta, modifica o cancellazione di spese, non solo quando cambiano i filtri. Quando il pannello filtri e completamente aperto, la barra di inserimento rapido viene nascosta temporaneamente e resta nascosta anche se si passa alle statistiche e poi si torna alla timeline senza chiudere i filtri; su desktop questo stato non blocca lo scroll della pagina sottostante.

L'area interna del pannello filtri resta scrollabile anche nello stato compatto; le barre di scroll laterali restano nascoste. Se una ricerca filtri e attiva e l'utente tocca un controllo interno dell'app, per esempio una spesa o il pulsante di espansione del pannello filtri, l'interazione di ricerca viene rilasciata prima del blur della tastiera senza consumare subito lo stato history del pannello; quello stato viene ripulito quando si chiudono i filtri, cosi i back successivi chiudono eventuali pannelli/modali, filtri e infine l'app senza passaggi invisibili.

### Modifica Spesa

La modale modifica importo, descrizione, data, ora, categoria, metodo, tag e nota. Categoria, metodo e tag usano dropdown ricercabili custom. La cancellazione richiede conferma.

Su desktop, il tasto Invio nei campi testuali della modale conferma la modifica. Nei dropdown ricercabili e nel campo tag, Invio resta dedicato alla selezione del suggerimento o alla creazione del tag.

I workaround mobile rimasti per la modale riguardano picker nativi, cleanup della selezione, blur su ritorno/chiusura tastiera e stack history delle interazioni interne. Gli auto-scroll e gli allineamenti automatici di campi, label, tendine, header e footer nella finestra `Modifica spesa` sono stati rimossi per riprogettarli da zero.

### Navigazione e Mobile

Le pagine principali sono Timeline, Statistiche e Impostazioni. Lo scroll e ricordato separatamente per pagina. Il contenitore principale mantiene effettivo il proprio offset sotto header e pannello filtri, senza collasso del margine. Aprendo o chiudendo i filtri compatti, la Timeline conserva la stessa coordinata di scroll: se vicino al fondo l'apertura limita automaticamente lo scroll al nuovo massimo, viene ricordata anche la posizione precedente e ripristinata in chiusura quando l'utente non ha scrollato volontariamente nel pannello aperto. Il comportamento usa misure e snapshot reali, senza dipendere da dimensioni fisse. Altezza e opacita del riepilogo, margine del contenuto, sfumatura e ingresso/uscita del pannello cambiano nella stessa transizione; in chiusura la sfumatura passa subito dallo stato compatto a quello normale con un fade coordinato, mentre lo scroll anchoring viene sospeso per tutti i 200 ms del riassetto. Durante uno swipe orizzontale la pagina corrente e quella adiacente seguono il dito gia prima del rilascio; superata la soglia lo slide viene completato, altrimenti torna elasticamente alla pagina iniziale. Verso sinistra si avanza e verso destra si torna indietro; gesture prevalentemente verticali o iniziate su controlli interattivi vengono ignorate, mentre ai bordi viene applicata una lieve resistenza. Il cambio tramite bottom nav usa una classe di ingresso dedicata; lo swipe rimuove quella classe e conclude esclusivamente lo slide, evitando che il fade verticale standard riparta durante il cleanup. I banner sticky di Timeline e Statistiche condividono la stessa altezza e lo stesso raggio degli angoli. Durante il gesto i banner e i rispettivi fondali sfumati vengono mantenuti alla loro quota nel viewport indipendentemente dallo scroll salvato; al completamento la pagina target rientra nel layout normale e recupera il proprio scroll verticale mentre la compensazione del banner e ancora attiva; quest ultima viene rimossa solo dopo aver stabilizzato il layout, evitando posizioni intermedie legate allo scroll della pagina di partenza; con i filtri compatti aperti la sfumatura ridotta sotto il pannello viene compensata usando la posizione reale e il padding interno della pagina target e risulta gia presente nell'anteprima laterale, mentre la barra di inserimento segue orizzontalmente la Timeline. La pagina target viene renderizzata una sola volta quando entra nell'anteprima: nelle Statistiche questo avvia le stesse animazioni Chart.js della navigazione tramite bottoni e il completamento dello swipe riusa quel rendering senza farle ripartire.
Il posizionamento usa l'altezza DOM corrente del pannello; i 6 px aggiuntivi restano una compensazione interna del riepilogo collassato, cosi pannello e contenuto rimangono visivamente continui anche nei passaggi tra stato compatto e avanzato.

Il titolo dell'header alterna al click il nome dell'app e la data odierna in formato italiano, con dissolvenza in uscita e in entrata e supporto anche a Invio/Spazio da tastiera. Il toggle resta temporaneo e non viene salvato.

Il back button chiude, in ordine di priorita:

- conferma aperta;
- interazione interna della finestra `Esporta`;
- finestra `Esporta`;
- finestra versioni aperta;
- interazione interna della modale;
- modale;
- ricerca filtri;
- input rapido attivo;
- pannello filtri completamente aperto;
- pannello filtri;
- modalita selezione timeline;
- pagina corrente tornando alla timeline.
- filtri attivi, resettandoli prima del back finale che puo chiudere l'app.

Le decisioni sono in `ui-stack.js`; l'esecuzione concreta di push/back/go/replace e in `history-controller.js`.

Quando un'azione chiude piu livelli UI programmando uno o piu `back()`/`go()`, eventuali navigazioni successive devono aspettare il rientro dei popstate soppressi. Il caso coperto oggi e l'uscita da modalita selezione verso Impostazioni: selezione e filtri vengono chiusi prima, poi la pagina Impostazioni viene aperta solo quando la history si e stabilizzata.

### Statistiche

Le statistiche supportano periodo settimana, mese, anno e custom. Mostrano totale, numero spese, media giornaliera, grafico categorie, grafico temporale, dettaglio categorie e top spese. I filtri non-data si applicano anche alle statistiche. Ogni categoria usa un colore fisso nel grafico a torta e nel dettaglio categorie, indipendentemente dall'ordine dei totali; la palette resta quella gia usata dall'app e `Trasporti` usa il rosso.

La pagina statistiche e di sola lettura: oggi non apre direttamente la modifica di una spesa.

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- card unica per import/export dati;
- export Default con conferma semplice e JSON completo;
- export configurabile con finestra dedicata `Esporta`, scelta formato, checklist contenuti, selezione tramite timeline e preferenze locali salvate;
- import JSON/CSV con preview;
- finestra versioni alimentata da `releases.json`, con installazione manuale di `stable/latest` o della release scelta;
- scelta esplicita tra aggiungere e sostituire;
- snapshot locale prima di import in aggiunta, import in sostituzione, cambio versione o cancellazione completa;
- snapshot locale prima di cancellazione multipla dalla timeline;
- ripristino dall'ultimo snapshot locale disponibile;
- export raw se lo storage locale non e leggibile;
- info su numero spese, periodo coperto e spazio usato;
- versione/canale corrente visibili nel footer delle impostazioni;
- cancellazione completa con conferma.
- opzione nella conferma di cancellazione completa per rimuovere anche lo snapshot locale.

La finestra `Esporta` entra nello stack UI: il back la chiude prima di finestre e pannelli sottostanti. Se la tendina formato e aperta, il back chiude solo quella interazione e lascia aperta `Esporta`. All'apertura dalle impostazioni seleziona automaticamente tutte le spese se non esiste ancora un export configurabile riuscito; dagli ingressi successivi applica gli ultimi filtri usati in un export riuscito e seleziona tutte le spese filtrate da quello snapshot. Se `Esporta` viene chiusa mentre l'utente resta nella pagina Impostazioni, la selezione temporanea usata dalla finestra viene annullata automaticamente. Quando viene aperta dal pulsante `Esporta` della modalita selezione timeline, resta sulla timeline e conserva la selezione corrente invece di ripristinare l'ultimo export. I toggle `Ultima Selezione` e `Ultimi Filtri` riapplicano l'ultima selezione esportata o tutte le spese corrispondenti agli ultimi filtri salvati; `Ultimi Filtri` sostituisce subito tutti i filtri correnti con lo snapshot dell'ultimo export, resta attivo solo quando i filtri correnti corrispondono a quello snapshot e tutte le spese filtrate da quello snapshot sono selezionate, e quando viene spento ripristina sia la selezione sia i filtri precedenti alla sua attivazione. Cosi una modifica manuale dei filtri o della selezione lo deseleziona. Se i due insiemi coincidono possono risultare attivi insieme, altrimenti l'uno esclude l'altro. Il pulsante `Seleziona` chiude la finestra e porta alla timeline in modalita selezione, conservando esattamente la selezione corrente della finestra, anche quando e vuota; quando ci sono filtri attivi mostra il badge rosso con il conteggio. Gli auto-scroll e gli allineamenti automatici della tendina `Formato` in `Esporta` sono stati rimossi per riprogettarli da zero.

Il toggle tema nell'header resta temporaneo; il tema persistente si cambia nelle impostazioni.

## Test

Il runner locale e:

```powershell
node tests/run-tests.js
```

Copre storage, parser, filtri, statistiche, cache/query, refresh, input rapido, timeline, selezione timeline, filtri UI, modale, impostazioni, conferme, tema, toast, stack UI/history e wiring applicativo.

Mancano ancora test automatici su browser mobile reale, tastiera Android reale e interazioni DOM complete.

## Limiti Noti

- `/` e `/dev/` non registrano service worker; `/stable/` registra solo un launcher scoped, non una release immutabile.
- Le cache offline versionate esistono in cartelle release immutabili, oggi `releases/v2026.05.30/` e `releases/v2026.06.03/`; ogni nuova release richiede una nuova cartella e un nuovo cache namespace.
- La UI versioni copre il flusso guidato minimo; eventuali migrazioni dati tra versioni andranno progettate quando cambiera lo schema.
- Categorie e metodi sono statici.
- Non esistono ancora cestino, swipe su card o formati TSV/Markdown per la copia/export.
- La pagina statistiche non permette ancora di aprire/modificare una spesa.
- Desktop e iOS sono usabili ma meno rifiniti dell'esperienza Android.
- Accessibilita e semantica dei controlli custom sono migliorabili.
