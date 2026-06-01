const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function readAppScript(relativePath) {
    return fs.readFileSync(path.join(root, 'app/js', relativePath), 'utf8');
}

function createLocalStorage() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

function loadStorage() {
    const context = {
        console,
        localStorage: createLocalStorage(),
        window: {
            SPESA_TRACKER_CONFIG: {
                storageKey: 'test-storage'
            }
        }
    };

    vm.createContext(context);
    const storageCode = readAppScript('data/storage.js');
    vm.runInContext(`${storageCode}\nglobalThis.Storage = Storage;`, context);

    return {
        Storage: context.Storage,
        localStorage: context.localStorage
    };
}

function loadParser() {
    const context = { console };
    vm.createContext(context);

    const categoriesCode = readAppScript('domain/categories.js');
    const parserCode = readAppScript('domain/parser.js');
    vm.runInContext(
        `${categoriesCode}\n${parserCode}\nglobalThis.Parser = Parser;`,
        context
    );

    return context.Parser;
}

function loadFilters() {
    const context = { console };
    vm.createContext(context);

    const filtersCode = readAppScript('domain/filters.js');
    vm.runInContext(`${filtersCode}\nglobalThis.ExpenseFilters = ExpenseFilters;`, context);

    return context.ExpenseFilters;
}

function loadStats() {
    const context = { console };
    vm.createContext(context);

    const statsCode = readAppScript('domain/stats.js');
    vm.runInContext(`${statsCode}\nglobalThis.StatsData = StatsData;`, context);

    return context.StatsData;
}

function loadUiViews(globals = {}) {
    const context = { console, URL, ...globals };
    vm.createContext(context);

    const expenseStoreCode = readAppScript('data/expense-store.js');
    const filtersCode = readAppScript('domain/filters.js');
    const statsCode = readAppScript('domain/stats.js');
    const expenseQueryCode = readAppScript('domain/expense-query.js');
    const appRefreshCode = readAppScript('core/app-refresh.js');
    const expenseActionsCode = readAppScript('domain/expense-actions.js');
    const expenseSubmitControllerCode = readAppScript('input/expense-submit-controller.js');
    const expenseInputControllerCode = readAppScript('input/expense-input-controller.js');
    const inputBarControllerCode = readAppScript('input/input-bar-controller.js');
    const uiCode = readAppScript('ui/ui-utils.js');
    const downloadControllerCode = readAppScript('ui/download-controller.js');
    const filterViewCode = readAppScript('filters/filter-view.js');
    const filterControllerCode = readAppScript('filters/filter-controller.js');
    const timelineViewCode = readAppScript('timeline/timeline-view.js');
    const timelineControllerCode = readAppScript('timeline/timeline-controller.js');
    const timelineSelectionControllerCode = readAppScript('timeline/timeline-selection-controller.js');
    const navigationControllerCode = readAppScript('navigation/navigation-controller.js');
    const statsViewCode = readAppScript('stats/stats-view.js');
    const statsChartsCode = readAppScript('stats/stats-charts.js');
    const statsControllerCode = readAppScript('stats/stats-controller.js');
    const modalViewCode = readAppScript('modal/modal-view.js');
    const modalFormControllerCode = readAppScript('modal/modal-form-controller.js');
    const modalMobileControllerCode = readAppScript('modal/modal-mobile-controller.js');
    const modalInteractionsCode = readAppScript('modal/modal-interactions.js');
    const modalControllerCode = readAppScript('modal/modal-controller.js');
    const settingsViewCode = readAppScript('settings/settings-view.js');
    const settingsActionsCode = readAppScript('settings/settings-actions.js');
    const settingsControllerCode = readAppScript('settings/settings-controller.js');
    const uiStackCode = readAppScript('navigation/ui-stack.js');
    const historyControllerCode = readAppScript('navigation/history-controller.js');
    const uiStackEffectsCode = readAppScript('navigation/ui-stack-effects.js');
    const uiStackControllerCode = readAppScript('navigation/ui-stack-controller.js');
    const confirmDialogCode = readAppScript('ui/confirm-dialog.js');
    const confirmControllerCode = readAppScript('ui/confirm-controller.js');
    const themeControllerCode = readAppScript('ui/theme-controller.js');
    const toastControllerCode = readAppScript('ui/toast-controller.js');
    const appStateCode = readAppScript('core/app-state.js');
    const appWiringModalCode = readAppScript('core/app-wiring-modal.js');
    const appWiringCode = readAppScript('core/app-wiring.js');

    vm.runInContext(
        [
            expenseStoreCode,
            filtersCode,
            statsCode,
            expenseQueryCode,
            appRefreshCode,
            expenseActionsCode,
            expenseSubmitControllerCode,
            expenseInputControllerCode,
            inputBarControllerCode,
            uiCode,
            downloadControllerCode,
            filterViewCode,
            filterControllerCode,
            timelineViewCode,
            timelineControllerCode,
            timelineSelectionControllerCode,
            navigationControllerCode,
            statsViewCode,
            statsChartsCode,
            statsControllerCode,
            modalViewCode,
            modalFormControllerCode,
            modalMobileControllerCode,
            modalInteractionsCode,
            modalControllerCode,
            settingsViewCode,
            settingsActionsCode,
            settingsControllerCode,
            uiStackCode,
            historyControllerCode,
            uiStackEffectsCode,
            uiStackControllerCode,
            confirmDialogCode,
            confirmControllerCode,
            themeControllerCode,
            toastControllerCode,
            appStateCode,
            appWiringModalCode,
            appWiringCode,
            'globalThis.ExpenseStore = ExpenseStore;',
            'globalThis.ExpenseFilters = ExpenseFilters;',
            'globalThis.ExpenseQuery = ExpenseQuery;',
            'globalThis.AppRefresh = AppRefresh;',
            'globalThis.AppUI = AppUI;',
            'globalThis.DownloadController = DownloadController;',
            'globalThis.ExpenseActions = ExpenseActions;',
            'globalThis.ExpenseSubmitController = ExpenseSubmitController;',
            'globalThis.ExpenseInputController = ExpenseInputController;',
            'globalThis.InputBarController = InputBarController;',
            'globalThis.FilterView = FilterView;',
            'globalThis.FilterController = FilterController;',
            'globalThis.TimelineView = TimelineView;',
            'globalThis.TimelineController = TimelineController;',
            'globalThis.TimelineSelectionController = TimelineSelectionController;',
            'globalThis.NavigationController = NavigationController;',
            'globalThis.StatsView = StatsView;',
            'globalThis.StatsCharts = StatsCharts;',
            'globalThis.StatsController = StatsController;',
            'globalThis.ModalView = ModalView;',
            'globalThis.ModalFormController = ModalFormController;',
            'globalThis.ModalMobileController = ModalMobileController;',
            'globalThis.ModalInteractions = ModalInteractions;',
            'globalThis.ModalController = ModalController;',
            'globalThis.SettingsView = SettingsView;',
            'globalThis.SettingsActions = SettingsActions;',
            'globalThis.SettingsController = SettingsController;',
            'globalThis.UIStack = UIStack;',
            'globalThis.HistoryController = HistoryController;',
            'globalThis.UIStackEffects = UIStackEffects;',
            'globalThis.UIStackController = UIStackController;',
            'globalThis.ConfirmDialog = ConfirmDialog;',
            'globalThis.ConfirmController = ConfirmController;',
            'globalThis.ThemeController = ThemeController;',
            'globalThis.ToastController = ToastController;',
            'globalThis.AppState = AppState;',
            'globalThis.AppWiringModal = AppWiringModal;',
            'globalThis.AppWiring = AppWiring;'
        ].join('\n'),
        context
    );

    return {
        AppUI: context.AppUI,
        DownloadController: context.DownloadController,
        ExpenseStore: context.ExpenseStore,
        ExpenseQuery: context.ExpenseQuery,
        AppRefresh: context.AppRefresh,
        ExpenseActions: context.ExpenseActions,
        ExpenseSubmitController: context.ExpenseSubmitController,
        ExpenseInputController: context.ExpenseInputController,
        InputBarController: context.InputBarController,
        FilterView: context.FilterView,
        FilterController: context.FilterController,
        TimelineView: context.TimelineView,
        TimelineController: context.TimelineController,
        TimelineSelectionController: context.TimelineSelectionController,
        NavigationController: context.NavigationController,
        StatsView: context.StatsView,
        StatsCharts: context.StatsCharts,
        StatsController: context.StatsController,
        ModalView: context.ModalView,
        ModalFormController: context.ModalFormController,
        ModalMobileController: context.ModalMobileController,
        ModalInteractions: context.ModalInteractions,
        ModalController: context.ModalController,
        SettingsView: context.SettingsView,
        SettingsActions: context.SettingsActions,
        SettingsController: context.SettingsController,
        UIStack: context.UIStack,
        HistoryController: context.HistoryController,
        UIStackEffects: context.UIStackEffects,
        UIStackController: context.UIStackController,
        ConfirmDialog: context.ConfirmDialog,
        ConfirmController: context.ConfirmController,
        ThemeController: context.ThemeController,
        ToastController: context.ToastController,
        AppState: context.AppState,
        AppWiringModal: context.AppWiringModal,
        AppWiring: context.AppWiring
    };
}

function expense(overrides = {}) {
    return {
        id: 'expense-1',
        importo: 1.5,
        descrizione: 'Caffe',
        categoria: 'bar',
        metodo: 'carta',
        data: '2026-05-16T10:00:00.000Z',
        tags: ['colazione'],
        nota: '',
        creatoIl: '2026-05-16T10:00:00.000Z',
        modificatoIl: '2026-05-16T10:00:00.000Z',
        ...overrides
    };
}

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

test('Storage aggiunge e normalizza una spesa prima del salvataggio', () => {
    const { Storage } = loadStorage();

    const result = Storage.addSpesa({
        importo: '1,50',
        descrizione: 'Caffe',
        categoria: 'bar',
        metodo: 'carta',
        data: '2026-05-16T10:00:00.000Z',
        tags: ['#colazione', 'colazione'],
        nota: ''
    });

    assert.equal(result.success, true);
    assert.equal(result.spesa.importo, 1.5);
    assert.deepEqual(result.spesa.tags, ['colazione']);

    const exported = Storage.exportJSON();
    assert.equal(exported.success, true);

    const data = JSON.parse(exported.content);
    assert.equal(data.schemaVersion, 1);
    assert.equal(data.spese.length, 1);
});

test('Storage blocca i salvataggi se il JSON locale e corrotto', () => {
    const { Storage, localStorage } = loadStorage();
    localStorage.setItem(Storage.KEY, '{"spese":');

    const result = Storage.addSpesa(expense({ id: undefined }));

    assert.equal(result.success, false);
    assert.equal(localStorage.getItem(Storage.KEY), '{"spese":');

    const raw = Storage.exportRaw();
    assert.equal(raw.success, true);
    assert.equal(raw.content, '{"spese":');
});

test('Import JSON in aggiunta rigenera id duplicati e conserva le impostazioni attuali', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'same-id', descrizione: 'Esistente' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };
    const backup = {
        schemaVersion: 1,
        spese: [expense({ id: 'same-id', descrizione: 'Importata' })],
        impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));

    const result = Storage.importJSON(JSON.stringify(backup), { mode: 'append' });

    assert.equal(result.success, true);
    assert.equal(result.regeneratedIds, 1);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

    assert.equal(saved.spese.length, 2);
    assert.equal(saved.spese[0].descrizione, 'Importata');
    assert.notEqual(saved.spese[0].id, 'same-id');
    assert.equal(saved.impostazioni.tema, 'dark');
    assert.equal(snapshot.reason, 'json-append');
    assert.equal(snapshot.data.spese[0].id, 'same-id');
});

test('Import JSON in sostituzione crea snapshot e importa le impostazioni del backup', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'old-id', descrizione: 'Vecchia' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };
    const backup = {
        schemaVersion: 1,
        spese: [expense({ id: 'new-id', descrizione: 'Nuova' })],
        impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));

    const result = Storage.importJSON(JSON.stringify(backup), { mode: 'replace' });

    assert.equal(result.success, true);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

    assert.equal(saved.spese.length, 1);
    assert.equal(saved.spese[0].id, 'new-id');
    assert.equal(saved.impostazioni.tema, 'light');
    assert.equal(snapshot.reason, 'json-replace');
    assert.equal(snapshot.data.spese[0].id, 'old-id');
});

test('Storage ripristina lo snapshot e conserva undo dei dati correnti', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'current-id', descrizione: 'Corrente' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
    };
    const snapshotData = {
        schemaVersion: 1,
        spese: [expense({ id: 'snapshot-id', descrizione: 'Snapshot' })],
        impostazioni: { tema: 'light', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
    };
    const snapshot = {
        schemaVersion: 1,
        creatoIl: '2026-05-20T12:30:00.000Z',
        reason: 'clear-all',
        data: snapshotData
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));
    localStorage.setItem(`${Storage.KEY}:snapshot`, JSON.stringify(snapshot));

    const info = Storage.getSnapshotInfo();
    const result = Storage.restoreSnapshot();

    assert.equal(info.exists, true);
    assert.equal(info.readable, true);
    assert.equal(info.count, 1);
    assert.equal(result.success, true);
    assert.equal(result.count, 1);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    const undoSnapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

    assert.equal(saved.spese[0].id, 'snapshot-id');
    assert.equal(saved.impostazioni.tema, 'light');
    assert.equal(undoSnapshot.reason, 'restore-before');
    assert.equal(undoSnapshot.data.spese[0].id, 'current-id');
});

test('Storage cancellazione completa puo eliminare anche lo snapshot locale', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'current-id' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));
    localStorage.setItem(`${Storage.KEY}:snapshot`, JSON.stringify({
        schemaVersion: 1,
        creatoIl: '2026-05-20T12:30:00.000Z',
        reason: 'clear-all',
        data: current
    }));

    const result = Storage.clearAll({
        createSnapshot: false,
        clearSnapshot: true
    });

    assert.equal(result.success, true);
    assert.equal(localStorage.getItem(Storage.KEY), null);
    assert.equal(localStorage.getItem(`${Storage.KEY}:snapshot`), null);
});

test('Storage esporta subset e cancella selezione multipla con snapshot', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [
            expense({ id: 'a', descrizione: 'A', importo: 2 }),
            expense({ id: 'b', descrizione: 'B', importo: 3 }),
            expense({ id: 'c', descrizione: 'C', importo: 4 })
        ],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));

    const json = Storage.exportJSON({ spese: [current.spese[1]] });
    const csv = Storage.exportCSV({ spese: [current.spese[0], current.spese[2]] });
    const deleted = Storage.deleteSpese(['a', 'c']);

    assert.equal(json.success, true);
    assert.equal(JSON.parse(json.content).spese.length, 1);
    assert.equal(JSON.parse(json.content).spese[0].id, 'b');
    assert.equal(JSON.parse(json.content).impostazioni.tema, 'dark');
    assert.equal(csv.success, true);
    assert(csv.content.includes('\na,'));
    assert(csv.content.includes('\nc,'));
    assert(!csv.content.includes('\nb,'));
    assert.equal(deleted.success, true);
    assert.equal(deleted.count, 2);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

    assert.deepEqual(saved.spese.map(item => item.id), ['b']);
    assert.equal(snapshot.reason, 'bulk-delete');
    assert.deepEqual(snapshot.data.spese.map(item => item.id), ['a', 'b', 'c']);
    assert.equal(Storage.deleteSpese([]).success, false);
});

test('Import CSV valida decimali italiani, delimiter punto e virgola e campi quotati', () => {
    const { Storage } = loadStorage();
    const csv = [
        'data;ora;importo;descrizione;categoria;metodo;tags;nota',
        '16/05/2026;09:30;1,50;"Caffe, brioche";bar;carta;"colazione|lavoro";"nota su due',
        'righe"'
    ].join('\n');

    const preview = Storage.previewImportCSV(csv);

    assert.equal(preview.success, true);
    assert.equal(preview.count, 1);
    assert.equal(preview.data.spese[0].importo, 1.5);
    assert.equal(preview.data.spese[0].descrizione, 'Caffe, brioche');
    assert.deepEqual(preview.data.spese[0].tags, ['colazione', 'lavoro']);
    assert.equal(preview.data.spese[0].nota, 'nota su due\nrighe');
});

test('Import CSV rifiuta date impossibili invece di normalizzarle', () => {
    const { Storage } = loadStorage();
    const csv = [
        'data,ora,importo,descrizione,categoria,metodo',
        '31/02/2026,09:30,1.50,Caffe,bar,carta'
    ].join('\n');

    const preview = Storage.previewImportCSV(csv);

    assert.equal(preview.success, false);
    assert.equal(preview.code, 'invalid-date');
});

test('Parser conserva il flusso base di inserimento rapido', () => {
    const Parser = loadParser();
    const result = Parser.parse('caffe 1,50 #colazione contanti');

    assert.equal(result.importo, 1.5);
    assert.equal(result.metodo, 'contanti');
    assert.deepEqual(result.tags, ['colazione']);
    assert.equal(result.categoria, 'bar');
});

test('Parser preferisce importi espliciti o finali quando ci sono piu numeri', () => {
    const Parser = loadParser();

    const pizza = Parser.parse('pizza 4 formaggi 8');
    const pizzaEuro = Parser.parse('pizza 4 formaggi 8 euro');
    const caffe = Parser.parse('2 caffe 3 euro');
    const currency = Parser.parse('\u20ac 1,50 caffe');

    assert.equal(pizza.importo, 8);
    assert.equal(pizza.descrizione, 'Pizza 4 formaggi');
    assert.equal(pizzaEuro.importo, 8);
    assert.equal(pizzaEuro.descrizione, 'Pizza 4 formaggi');
    assert.equal(caffe.importo, 3);
    assert.equal(caffe.descrizione, '2 caffe');
    assert.equal(currency.importo, 1.5);
    assert.equal(currency.descrizione, 'Caffe');
});

test('Parser non confonde quantita pesate con importi', () => {
    const Parser = loadParser();

    const ciliegie = Parser.parse('10euro 1.5 kg di ciliegie');
    const pere = Parser.parse('5.5 2 kg di pere');

    assert.equal(ciliegie.importo, 10);
    assert.equal(ciliegie.descrizione, '1.5 kg di ciliegie');
    assert.equal(pere.importo, 5.5);
    assert.equal(pere.descrizione, '2 kg di pere');
});

test('Azioni spesa isolano parser e storage dall input rapido', () => {
    const { ExpenseActions } = loadUiViews();
    const calls = [];
    const parser = {
        parse(text) {
            calls.push(['parse', text]);
            if (text === '???') return null;
            return { descrizione: 'Caffe', importo: 1.5 };
        }
    };
    const storage = {
        addSpesa(data) {
            calls.push(['add', data.descrizione, data.importo]);
            return {
                success: true,
                spesa: expense({ id: 'saved', descrizione: data.descrizione, importo: data.importo })
            };
        },
        updateSpesa(id, data) {
            calls.push(['update', id, data.descrizione]);
            return { success: true, spesa: expense({ id, descrizione: data.descrizione }) };
        },
        deleteSpesa(id) {
            calls.push(['delete', id]);
            return { success: true };
        }
    };

    assert.equal(ExpenseActions.addFromText({ text: '   ', parser, storage }).reason, 'empty');
    assert.equal(ExpenseActions.addFromText({ text: '???', parser, storage }).reason, 'parse');

    const added = ExpenseActions.addFromText({ text: 'caffe 1,50', parser, storage });
    const updated = ExpenseActions.updateExpense({
        id: 'saved',
        data: { descrizione: 'Caffe corretto' },
        storage
    });
    const deleted = ExpenseActions.deleteExpense({ id: 'saved', storage });

    assert.equal(added.success, true);
    assert.equal(added.spesa.id, 'saved');
    assert.equal(updated.success, true);
    assert.equal(deleted.success, true);
    assert.deepEqual(calls, [
        ['parse', '???'],
        ['parse', 'caffe 1,50'],
        ['add', 'Caffe', 1.5],
        ['update', 'saved', 'Caffe corretto'],
        ['delete', 'saved']
    ]);
});

test('Store spese centralizza cache e invalidazione senza toccare Storage', () => {
    const { ExpenseStore } = loadUiViews();
    const listeners = {};
    let reads = 0;
    let source = [
        expense({ id: 'a', descrizione: 'Caffe' })
    ];
    const storage = {
        KEY: 'test-storage',
        getSpese() {
            reads += 1;
            return JSON.parse(JSON.stringify(source));
        }
    };
    const win = {
        addEventListener(event, handler) {
            listeners[event] = handler;
        },
        removeEventListener() {}
    };

    ExpenseStore.init({ storage, window: win });

    const first = ExpenseStore.getSpese();
    first[0].descrizione = 'Mutata fuori';

    assert.equal(ExpenseStore.getSpese()[0].descrizione, 'Caffe');
    assert.equal(reads, 1);

    source = [
        expense({ id: 'b', descrizione: 'Pranzo' })
    ];
    assert.equal(ExpenseStore.getSpese()[0].id, 'a');

    ExpenseStore.invalidate();
    assert.equal(ExpenseStore.getSpese()[0].id, 'b');
    assert.equal(reads, 2);

    source = [
        expense({ id: 'c', descrizione: 'Cena' })
    ];
    listeners.storage({ key: 'other-storage' });
    assert.equal(ExpenseStore.getSpese()[0].id, 'b');

    listeners.storage({ key: 'test-storage' });
    assert.equal(ExpenseStore.getSpese()[0].id, 'c');
    assert.equal(reads, 3);

    source = [
        expense({ id: 'd', descrizione: 'Gelato' })
    ];
    listeners.storage({ key: null });
    assert.equal(ExpenseStore.getSpese()[0].id, 'd');
    assert.equal(reads, 4);
});

test('Query spese prepara filtri e riepiloghi una sola volta', () => {
    const { ExpenseQuery } = loadUiViews();
    const spese = [
        expense({
            id: 'match',
            importo: 10,
            descrizione: 'Caffe speciale',
            categoria: 'bar',
            metodo: 'contanti',
            data: '2026-05-20T10:00:00.000Z'
        }),
        expense({
            id: 'other',
            importo: 5,
            descrizione: 'Pane',
            categoria: 'alimentari',
            metodo: 'carta',
            data: '2026-05-19T10:00:00.000Z'
        })
    ];
    const model = ExpenseQuery.buildFilterModel({
        spese,
        filters: {
            query: 'caffe',
            categories: new Set(['bar']),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: ''
        },
        now: new Date('2026-05-20T12:00:00.000Z')
    });

    assert.equal(model.activeFilterCount, 2);
    assert.equal(model.hasActiveFilters, true);
    assert.deepEqual(model.filteredSpese.map(item => item.id), ['match']);
    assert.equal(model.quickTotals.todayTotal, 10);
    assert.equal(model.quickTotals.weekTotal, 15);
    assert.equal(model.quickTotals.monthTotal, 15);

    const emptyFilters = ExpenseQuery.buildFilterModel({ spese, filters: {} });
    assert.equal(emptyFilters.hasActiveFilters, false);
    assert.equal(emptyFilters.filteredSpese, emptyFilters.allSpese);
});

test('Query spese prepara modello statistiche rispettando periodo e filtri non-data', () => {
    const { ExpenseQuery } = loadUiViews();
    const spese = [
        expense({
            id: 'pizza',
            importo: 8.5,
            descrizione: 'Pizza',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-05-20T10:00:00.000Z'
        }),
        expense({
            id: 'caffe',
            importo: 1.2,
            descrizione: 'Caffe',
            categoria: 'bar',
            metodo: 'contanti',
            data: '2026-05-20T11:00:00.000Z'
        }),
        expense({
            id: 'aprile',
            importo: 100,
            descrizione: 'Affitto',
            categoria: 'casa',
            metodo: 'bonifico',
            data: '2026-04-20T10:00:00.000Z'
        })
    ];

    const model = ExpenseQuery.buildStatsModel({
        spese,
        filters: {
            query: 'pizza',
            categories: new Set(),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '2026-05-21',
            dateTo: '2026-05-21'
        },
        period: 'month',
        offset: 0,
        now: new Date('2026-05-20T12:00:00.000Z')
    });

    assert.deepEqual(model.periodSpese.map(item => item.id), ['pizza', 'caffe']);
    assert.deepEqual(model.filteredSpese.map(item => item.id), ['pizza']);
    assert.equal(model.summary.total, 8.5);
    assert.equal(model.barChartTitle, 'Andamento giornaliero');
    assert.equal(model.canGoNext, false);
    assert.equal(model.isCustom, false);

    const custom = ExpenseQuery.buildStatsModel({
        spese,
        filters: {
            query: '',
            categories: new Set(),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '2026-05-20',
            dateTo: '2026-05-20'
        },
        period: 'custom',
        offset: 0,
        now: new Date('2026-05-20T12:00:00.000Z')
    });

    assert.equal(custom.isCustom, true);
    assert.deepEqual(custom.filteredSpese.map(item => item.id), ['pizza', 'caffe']);
});

test('Refresh app centralizza aggiornamento viste dopo cambio dati', () => {
    const { AppRefresh } = loadUiViews();
    const calls = [];

    AppRefresh.refreshExpenseViews({
        invalidateSpeseCache: () => calls.push('invalidate'),
        updateFilterSlider: true,
        isFilterOpen: () => true,
        recalcSliderMax: () => calls.push('recalc-slider'),
        updateFilterBadge: () => calls.push('filter-badge'),
        getCurrentPage: () => 'stats',
        renderTimeline: () => calls.push('timeline'),
        renderStats: () => calls.push('stats'),
        includeSettings: true,
        renderSettings: () => calls.push('settings')
    });

    assert.deepEqual(calls, ['invalidate', 'recalc-slider', 'filter-badge', 'timeline', 'stats', 'settings']);

    calls.length = 0;
    AppRefresh.refreshExpenseViews({
        invalidateSpeseCache: () => calls.push('invalidate'),
        updateFilterSlider: true,
        isFilterOpen: () => false,
        recalcSliderMax: () => calls.push('recalc-slider'),
        updateFilterBadge: () => calls.push('filter-badge'),
        getCurrentPage: () => 'timeline',
        renderTimeline: () => calls.push('timeline'),
        renderStats: () => calls.push('stats'),
        renderSettings: () => calls.push('settings')
    });

    assert.deepEqual(calls, ['invalidate', 'filter-badge', 'timeline']);
});

test('Controller submit input rapido pulisce input e aggiorna viste dopo salvataggio', () => {
    const { ExpenseSubmitController } = loadUiViews();
    const calls = [];
    let newCardId = null;
    const input = {
        value: 'caffe 1.50',
        blurred: false,
        blur() {
            this.blurred = true;
            calls.push('input-blur');
        }
    };
    const activeElement = {
        blur() {
            calls.push('active-blur');
        }
    };
    const doc = {
        activeElement,
        getElementById(id) {
            return id === 'expense-input' ? input : null;
        }
    };
    const savedExpense = expense({
        id: 'new-expense',
        descrizione: 'Caffe',
        importo: 1.5,
        categoria: 'bar'
    });

    const result = ExpenseSubmitController.submit({
        document: doc,
        actions: {
            addFromText(payload) {
                calls.push(['add', payload.text]);
                return { success: true, spesa: savedExpense };
            }
        },
        parser: { parse() {} },
        storage: {},
        categories: [{ id: 'bar', emoji: 'B', nome: 'Bar' }],
        ui: {
            getCategory(id, categories) {
                return categories.find(category => category.id === id);
            }
        },
        setNewCardId: id => { newCardId = id; },
        refreshAfterAdd: () => calls.push('refresh'),
        showToast: (message, type) => calls.push(['toast', message, type])
    });

    assert.equal(result.success, true);
    assert.equal(input.value, '');
    assert.equal(input.blurred, true);
    assert.equal(newCardId, 'new-expense');
    assert(calls.includes('refresh'));
    assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'add'), ['add', 'caffe 1.50']);
    assert.deepEqual(
        calls.find(call => Array.isArray(call) && call[0] === 'toast'),
        ['toast', 'B Caffe \u00b7 \u20ac1.50', 'success']
    );
});

test('Controller submit input rapido mostra errori senza refresh', () => {
    const { ExpenseSubmitController } = loadUiViews();
    const cases = [
        {
            result: { success: false, reason: 'empty' },
            expected: 'Scrivi una spesa prima di inviare'
        },
        {
            result: { success: false, reason: 'parse' },
            expected: 'Non ho capito l\'importo. Prova: "caff\u00e8 1.50"'
        },
        {
            result: { success: false, reason: 'storage', error: 'Quota piena' },
            expected: 'Quota piena'
        }
    ];

    cases.forEach(({ result, expected }) => {
        const calls = [];
        const input = {
            value: 'test',
            blur() {
                calls.push('blur');
            }
        };
        const doc = {
            activeElement: input,
            getElementById(id) {
                return id === 'expense-input' ? input : null;
            }
        };

        const submitResult = ExpenseSubmitController.submit({
            document: doc,
            actions: {
                addFromText() {
                    return result;
                }
            },
            refreshAfterAdd: () => calls.push('refresh'),
            showToast: (message, type) => calls.push(['toast', message, type])
        });

        assert.equal(submitResult, result);
        assert.equal(input.value, 'test');
        assert(!calls.includes('refresh'));
        assert(!calls.includes('blur'));
        assert.deepEqual(calls, [['toast', expected, 'error']]);
    });
});

test('Controller input rapido collega touch, focus e blur senza dipendere da App', () => {
    const { ExpenseInputController } = loadUiViews();
    const calls = [];
    const timers = [];
    let active = false;
    let submitCount = 0;
    let lastViewportHeight = 0;

    function element(id) {
        const classes = new Set();
        return {
            id,
            value: '',
            style: {},
            listeners: {},
            classList: {
                add(cls) {
                    classes.add(cls);
                },
                remove(cls) {
                    classes.delete(cls);
                },
                contains(cls) {
                    return classes.has(cls);
                }
            },
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            }
        };
    }

    const elements = {
        'expense-input': element('expense-input'),
        'btn-send': element('btn-send'),
        'btn-voice': element('btn-voice'),
        'input-bar': element('input-bar')
    };
    const bodyClasses = new Set();
    const doc = {
        body: {
            classList: {
                add(cls) {
                    bodyClasses.add(cls);
                },
                remove(cls) {
                    bodyClasses.delete(cls);
                },
                contains(cls) {
                    return bodyClasses.has(cls);
                }
            }
        },
        getElementById(id) {
            return elements[id] || null;
        }
    };

    const controller = ExpenseInputController.init({
        document: doc,
        window: {},
        onSubmit: () => { submitCount += 1; },
        isInputActive: () => active,
        setInputActive: value => { active = value; calls.push(['active', value]); },
        getViewportHeight: () => 640,
        setLastViewportHeight: value => { lastViewportHeight = value; },
        pushInputState: () => calls.push('push-input'),
        consumeInputState: () => calls.push('consume-input'),
        startInputBarWatch: () => calls.push('start-watch'),
        stopInputBarWatch: () => calls.push('stop-watch'),
        scheduleInputBarPositionUpdate: force => calls.push(['schedule', force]),
        updateAppMainPadding: () => calls.push('update-padding'),
        setTimeout: (callback, ms) => {
            timers.push({ callback, ms });
            return timers.length;
        },
        clearTimeout: id => calls.push(['clear-timer', id])
    });

    assert.ok(controller);
    assert.equal(elements['btn-voice'].style.display, 'none');

    let touchMovePrevented = false;
    elements['input-bar'].listeners.touchmove({
        preventDefault() {
            touchMovePrevented = true;
        }
    });
    assert.equal(touchMovePrevented, true);

    elements['expense-input'].listeners.focus();
    assert.equal(active, true);
    assert.equal(lastViewportHeight, 640);
    assert.equal(bodyClasses.has('expense-input-active'), true);

    elements['expense-input'].listeners.blur();
    assert.equal(active, false);
    assert.equal(bodyClasses.has('expense-input-active'), false);
    assert.equal(timers[0].ms, 300);
    timers[0].callback();

    elements['btn-send'].listeners.touchstart();
    assert.equal(elements['btn-send'].classList.contains('pressed'), true);

    let touchEndPrevented = false;
    elements['btn-send'].listeners.touchend({
        preventDefault() {
            touchEndPrevented = true;
        }
    });
    elements['btn-send'].listeners.click();
    elements['btn-send'].listeners.click();

    let enterPrevented = false;
    elements['expense-input'].listeners.keydown({
        key: 'Enter',
        preventDefault() {
            enterPrevented = true;
        }
    });

    assert.equal(touchEndPrevented, true);
    assert.equal(enterPrevented, true);
    assert.equal(submitCount, 3);
    assert.deepEqual(calls, [
        ['active', true],
        'push-input',
        'start-watch',
        ['schedule', true],
        'stop-watch',
        ['active', false],
        'update-padding',
        'consume-input'
    ]);
});

test('Controller barra input isola padding e watch tastiera da App', () => {
    const { InputBarController } = loadUiViews();
    const events = [];
    const frameCallbacks = [];
    const timerCallbacks = [];

    function classListWith(items = []) {
        const classes = new Set(items);
        return {
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    const main = { style: {}, classList: classListWith() };
    const panel = { offsetHeight: 96, classList: classListWith() };
    const inputBar = { style: { bottom: '', transform: '' } };
    const elements = {
        'app-main': main,
        'filter-panel': panel,
        'input-bar': inputBar
    };
    const doc = {
        getElementById(id) {
            return elements[id] || null;
        }
    };

    let active = true;
    let filterSearch = false;
    let filterOpen = true;
    let rafId = null;
    let resizeHandler = null;
    let windowResizeHandler = null;
    let viewportResizeHandler = null;
    let nextRaf = 0;

    const win = {
        innerHeight: 800,
        visualViewport: {
            height: 500,
            offsetTop: 0,
            addEventListener(event, handler, options) {
                viewportResizeHandler = handler;
                events.push(['vv-add', event, options.passive]);
            },
            removeEventListener(event, handler) {
                events.push(['vv-remove', event, handler === viewportResizeHandler]);
            }
        },
        addEventListener(event, handler, options) {
            windowResizeHandler = handler;
            events.push(['win-add', event, options.passive]);
        },
        removeEventListener(event, handler) {
            events.push(['win-remove', event, handler === windowResizeHandler]);
        }
    };
    const options = {
        document: doc,
        window: win,
        isExpenseInputActive: () => active,
        isFilterSearchActive: () => filterSearch,
        isFilterOpen: () => filterOpen,
        getRafId: () => rafId,
        setRafId: value => { rafId = value; },
        getResizeHandler: () => resizeHandler,
        setResizeHandler: value => { resizeHandler = value; },
        requestAnimationFrame: callback => {
            frameCallbacks.push(callback);
            nextRaf += 1;
            return nextRaf;
        },
        cancelAnimationFrame: id => events.push(['cancel', id]),
        setTimeout: (callback, ms) => {
            timerCallbacks.push({ callback, ms });
            return timerCallbacks.length;
        }
    };

    assert.equal(InputBarController.getKeyboardInset(options), 300);

    InputBarController.updateAppMainPadding(options);
    assert.equal(
        main.style.paddingBottom,
        'calc(var(--input-h) + var(--nav-h) + var(--safe-bottom) + 300px - var(--nav-h) + 96px)'
    );

    InputBarController.updatePosition(options, true);
    assert.equal(inputBar.style.bottom, '300px');
    assert.equal(inputBar.style.transform, 'none');

    InputBarController.schedulePositionUpdate(options);
    InputBarController.schedulePositionUpdate(options);
    assert.equal(rafId, 2);
    assert.deepEqual(events.slice(-1), [['cancel', 1]]);

    frameCallbacks[1]();
    assert.equal(rafId, null);

    active = false;
    InputBarController.updatePosition(options, true);
    assert.equal(inputBar.style.bottom, '');
    assert.equal(inputBar.style.transform, '');

    active = true;
    filterSearch = true;
    filterOpen = false;
    events.length = 0;
    frameCallbacks.length = 0;
    timerCallbacks.length = 0;
    nextRaf = 0;

    InputBarController.startWatch(options);

    assert.equal(resizeHandler, windowResizeHandler);
    assert.equal(resizeHandler, viewportResizeHandler);
    assert.deepEqual(events.slice(0, 2), [
        ['win-add', 'resize', true],
        ['vv-add', 'resize', true]
    ]);
    assert.deepEqual(timerCallbacks.map(timer => timer.ms), [60, 160, 320]);
    assert.equal(rafId, 1);

    resizeHandler();
    assert.equal(rafId, 2);
    assert.deepEqual(events.slice(-1), [['cancel', 1]]);

    frameCallbacks[1]();
    assert.equal(rafId, null);

    timerCallbacks[0].callback();
    assert.equal(rafId, 3);

    active = false;
    timerCallbacks[1].callback();
    assert.equal(rafId, 3);

    InputBarController.stopWatch(options);

    assert.equal(rafId, null);
    assert.equal(resizeHandler, null);
    assert.equal(inputBar.style.bottom, '');
    assert.equal(inputBar.style.transform, '');
    assert.deepEqual(events.slice(-3), [
        ['cancel', 3],
        ['win-remove', 'resize', true],
        ['vv-remove', 'resize', true]
    ]);
});

test('Filtri combinano ricerca, categoria, metodo, importo e date', () => {
    const ExpenseFilters = loadFilters();
    const spese = [
        expense({
            id: 'match',
            importo: 12,
            descrizione: 'Pizza margherita',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z',
            tags: ['amici']
        }),
        expense({
            id: 'wrong-category',
            importo: 12,
            descrizione: 'Pizza surgelata',
            categoria: 'supermercato',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z'
        }),
        expense({
            id: 'wrong-amount',
            importo: 4,
            descrizione: 'Pizza piccola',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z'
        }),
        expense({
            id: 'wrong-date',
            importo: 12,
            descrizione: 'Pizza vecchia',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-04-30T12:00:00.000Z'
        })
    ];

    const result = ExpenseFilters.apply(spese, {
        query: 'pizza',
        categories: new Set(['ristorante']),
        methods: new Set(['carta']),
        amountMin: 10,
        amountMax: 15,
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
    });

    assert.deepEqual(result.map(s => s.id), ['match']);
});

test('Filtri non-data ignorano il periodo ma mantengono gli altri vincoli', () => {
    const ExpenseFilters = loadFilters();
    const spese = [
        expense({
            id: 'old-restaurant',
            importo: 20,
            descrizione: 'Cena',
            categoria: 'ristorante',
            metodo: 'contanti',
            data: '2026-04-01T12:00:00.000Z',
            nota: 'rimborso viaggio'
        }),
        expense({
            id: 'card-payment',
            importo: 20,
            descrizione: 'Cena',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-04-01T12:00:00.000Z',
            nota: 'rimborso viaggio'
        })
    ];

    const filters = {
        query: 'rimborso',
        categories: new Set(['ristorante']),
        methods: new Set(['contanti']),
        amountMin: 10,
        amountMax: 30,
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
    };

    assert.deepEqual(ExpenseFilters.apply(spese, filters).map(s => s.id), []);
    assert.deepEqual(ExpenseFilters.applyNonDate(spese, filters).map(s => s.id), ['old-restaurant']);
    assert.equal(ExpenseFilters.countActive(filters), 5);
});

test('Statistiche aggregano dati giornalieri includendo giorni vuoti', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10.25, data: '2026-05-01T10:00:00' }),
        expense({ id: 'b', importo: 4.75, data: '2026-05-03T10:00:00' })
    ];

    const result = StatsData.buildDailyBarData(
        spese,
        new Date('2026-05-01T00:00:00'),
        new Date('2026-05-03T23:59:59'),
        { now: new Date('2026-05-03T12:00:00') }
    );

    assert.deepEqual(result.data, [10.25, 0, 4.75]);
});

test('Statistiche aggregano dati settimanali dal lunedi alla domenica', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10, data: '2026-04-28T10:00:00' }),
        expense({ id: 'b', importo: 5, data: '2026-05-05T10:00:00' }),
        expense({ id: 'c', importo: 2, data: '2026-05-17T10:00:00' })
    ];

    const result = StatsData.buildWeeklyBarData(
        spese,
        new Date('2026-04-28T00:00:00'),
        new Date('2026-05-17T23:59:59'),
        { now: new Date('2026-05-17T12:00:00') }
    );

    assert.deepEqual(result.data, [10, 5, 2]);
});

test('Statistiche aggregano dati mensili e riepilogo categorie/top spese', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-01-10T10:00:00' }),
        expense({ id: 'b', importo: 7, categoria: 'ristorante', data: '2026-03-10T10:00:00' }),
        expense({ id: 'c', importo: 3, categoria: 'bar', data: '2026-03-11T10:00:00' })
    ];
    const start = new Date('2026-01-01T00:00:00');
    const end = new Date('2026-03-31T23:59:59');

    const bars = StatsData.buildMonthlyBarData(spese, start, end, {
        now: new Date('2026-03-31T12:00:00')
    });
    const summary = StatsData.summarizeExpenses(spese, start, end, {
        now: new Date('2026-03-31T12:00:00'),
        topLimit: 2
    });

    assert.deepEqual(bars.data, [10, 0, 10]);
    assert.equal(summary.total, 20);
    assert.deepEqual(summary.categoryTotals, [['bar', 13], ['ristorante', 7]]);
    assert.deepEqual(summary.topExpenses.map(s => s.id), ['a', 'b']);
});

test('Helper UI normalizzano importi e formattano denaro senza DOM', () => {
    const { AppUI } = loadUiViews();

    assert.equal(AppUI.parseAmountInput('€1,50'), 1.5);
    assert.equal(AppUI.parseAmountInput('1.234,56 euro'), 1234.56);
    assert.equal(AppUI.money(3), '€3.00');
});

test('Controller download isola link temporaneo e revoca URL senza App', () => {
    const { DownloadController } = loadUiViews();
    const calls = [];
    const body = {
        appendChild(element) {
            calls.push(['append', element.tagName]);
            element.parentNode = body;
        },
        removeChild(element) {
            calls.push(['remove', element.tagName]);
            element.parentNode = null;
        }
    };
    const documentMock = {
        body,
        createElement(tagName) {
            calls.push(['create', tagName]);
            return {
                tagName,
                href: '',
                download: '',
                parentNode: null,
                click() {
                    calls.push(['click', this.href, this.download]);
                }
            };
        }
    };
    class FakeBlob {
        constructor(parts, options) {
            this.parts = parts;
            this.options = options;
        }
    }
    const urlApi = {
        createObjectURL(blob) {
            calls.push(['create-url', blob.parts, blob.options.type]);
            return 'blob:test-download';
        },
        revokeObjectURL(url) {
            calls.push(['revoke', url]);
        }
    };

    const result = DownloadController.download('contenuto', 'spese.txt', 'text/plain', {
        document: documentMock,
        URL: urlApi,
        Blob: FakeBlob
    });

    assert.deepEqual(result, {
        filename: 'spese.txt',
        mime: 'text/plain',
        url: 'blob:test-download'
    });
    assert.deepEqual(calls, [
        ['create-url', ['contenuto'], 'text/plain'],
        ['create', 'a'],
        ['append', 'a'],
        ['click', 'blob:test-download', 'spese.txt'],
        ['remove', 'a'],
        ['revoke', 'blob:test-download']
    ]);
});

test('Vista filtri calcola slider e footer riepilogo', () => {
    const { FilterView } = loadUiViews();
    const spese = [
        expense({ importo: 4 }),
        expense({ importo: 120 })
    ];

    assert.equal(FilterView.getSliderMax(spese), 500);
    assert.equal(
        FilterView.renderFooterInfo({ activeCount: 1, filtered: spese }),
        '1 filtro · 2 spese · €124.00'
    );
});

test('Controller filtri riusa modello filtrato precomputato', () => {
    const { FilterController } = loadUiViews();
    const classes = {};
    let payloadSeen = null;

    function classList(id) {
        classes[id] = new Set(['hidden']);
        return {
            add(cls) {
                classes[id].add(cls);
            },
            remove(cls) {
                classes[id].delete(cls);
            },
            contains(cls) {
                return classes[id].has(cls);
            }
        };
    }

    const elements = {
        'filter-badge': {
            textContent: '',
            classList: classList('filter-badge')
        },
        'btn-filter-reset': {
            classList: classList('btn-filter-reset')
        },
        'filter-info': {
            textContent: ''
        }
    };
    const doc = {
        getElementById(id) {
            return elements[id] || null;
        }
    };
    const commonOptions = {
        document: doc,
        filters: {},
        countActiveFilters: () => {
            throw new Error('countActiveFilters non deve essere chiamato');
        },
        applyFilters: () => {
            throw new Error('applyFilters non deve essere chiamato');
        },
        getSpese: () => {
            throw new Error('getSpese non deve essere chiamato');
        },
        getQuickTotals: () => {
            throw new Error('getQuickTotals non deve essere chiamato');
        },
        renderFooterInfo: payload => {
            payloadSeen = payload;
            return payload.activeCount > 0 ? 'filtrato' : 'totali';
        }
    };

    const activeCount = FilterController.updateFilterBadge({
        ...commonOptions,
        filterModel: {
            activeFilterCount: 1,
            allSpese: [expense({ id: 'a' }), expense({ id: 'b' })],
            filteredSpese: [expense({ id: 'a' })],
            quickTotals: { todayTotal: 0 }
        }
    });

    assert.equal(activeCount, 1);
    assert.equal(elements['filter-badge'].textContent, 1);
    assert.equal(elements['filter-info'].textContent, 'filtrato');
    assert.equal(payloadSeen.filtered.length, 1);

    const inactiveCount = FilterController.updateFilterBadge({
        ...commonOptions,
        filterModel: {
            activeFilterCount: 0,
            allSpese: [expense({ id: 'a' })],
            filteredSpese: [expense({ id: 'a' })],
            quickTotals: { todayTotal: 3 }
        }
    });

    assert.equal(inactiveCount, 0);
    assert.equal(elements['filter-info'].textContent, 'totali');
    assert.equal(payloadSeen.quickTotals.todayTotal, 3);
});

test('Controller filtri coordina pannello, ricerca e slider fuori da App', () => {
    const { FilterController, FilterView } = loadUiViews();
    const calls = [];

    function makeClassList(initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
                calls.push(['add-class', cls]);
            },
            remove(cls) {
                classes.delete(cls);
                calls.push(['remove-class', cls]);
            },
            toggle(cls, force) {
                const shouldAdd = force === undefined ? !classes.has(cls) : !!force;
                if (shouldAdd) classes.add(cls);
                else classes.delete(cls);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    function makeElement(id, options = {}) {
        return {
            id,
            value: options.value || '',
            max: '',
            textContent: '',
            innerHTML: '',
            offsetHeight: options.offsetHeight || 120,
            scrollHeight: options.scrollHeight || 300,
            style: {},
            dataset: options.dataset || {},
            classList: makeClassList(options.classes || []),
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            blur() {
                calls.push(['blur', id]);
            },
            setAttribute(name, value) {
                this[name] = value;
            },
            querySelector(selector) {
                if (selector === '.filter-panel-scroll') return scrollContainer;
                return null;
            },
            querySelectorAll(selector) {
                if (id === 'filter-cats' && selector === '.filter-chip') return catChips;
                if (id === 'filter-methods' && selector === '.filter-chip') return methodChips;
                return [];
            }
        };
    }

    function makeChip(id) {
        return {
            dataset: { id },
            classList: makeClassList(),
            listener: null,
            addEventListener(event, handler) {
                if (event === 'click') this.listener = handler;
            }
        };
    }

    const scrollContainer = {
        scrollHeight: 300,
        scrollTo(payload) {
            calls.push(['scroll-to', payload.top, payload.behavior]);
        }
    };
    const catChips = [makeChip('bar'), makeChip('casa')];
    const methodChips = [makeChip('carta')];
    const docListeners = {};
    const elements = {
        'btn-filter-toggle': makeElement('btn-filter-toggle'),
        'search-input': makeElement('search-input'),
        'btn-search-clear': makeElement('btn-search-clear', { classes: ['hidden'] }),
        'btn-filter-reset': makeElement('btn-filter-reset', { classes: ['hidden'] }),
        'filter-date-from': makeElement('filter-date-from'),
        'filter-date-to': makeElement('filter-date-to'),
        'btn-advanced-toggle': makeElement('btn-advanced-toggle'),
        'filter-panel': makeElement('filter-panel', { classes: ['hidden'], offsetHeight: 96 }),
        'filter-cats': makeElement('filter-cats'),
        'filter-methods': makeElement('filter-methods'),
        'slider-min': makeElement('slider-min', { value: '0' }),
        'slider-max': makeElement('slider-max', { value: '100' }),
        'ds-fill': makeElement('ds-fill'),
        'slider-val-min': makeElement('slider-val-min'),
        'slider-val-max': makeElement('slider-val-max'),
        'filter-badge': makeElement('filter-badge', { classes: ['hidden'] }),
        'filter-info': makeElement('filter-info'),
        'timeline-summary': makeElement('timeline-summary'),
        'page-timeline': makeElement('page-timeline'),
        'app-main': makeElement('app-main'),
        'input-bar': makeElement('input-bar'),
        'advanced-filters': makeElement('advanced-filters', { classes: ['hidden'] })
    };
    const doc = {
        body: { classList: makeClassList() },
        getElementById(id) {
            return elements[id] || null;
        },
        querySelectorAll(selector) {
            if (selector === '#filter-cats .filter-chip') return catChips;
            if (selector === '#filter-methods .filter-chip') return methodChips;
            return [];
        },
        addEventListener(event, handler) {
            docListeners[event] = handler;
        }
    };
    const filters = {
        query: '',
        categories: new Set(['bar']),
        methods: new Set(),
        amountMin: 0,
        amountMax: Infinity,
        dateFrom: '',
        dateTo: ''
    };
    const state = {
        filterOpen: false,
        advancedFiltersOpen: false,
        filterSearchActive: false,
        releasedFilterSearchHistory: false,
        lastSliderInput: 'max',
        sliderMax: 100,
        lastViewportHeight: 0
    };
    const spese = [
        expense({ id: 'bar', importo: 120, categoria: 'bar' }),
        expense({ id: 'casa', importo: 4, categoria: 'casa' })
    ];

    const options = {
        document: doc,
        window: {
            matchMedia: () => ({ matches: true })
        },
        body: doc.body,
        filters,
        categories: [{ id: 'bar', emoji: 'B', nome: 'Bar' }, { id: 'casa', emoji: 'C', nome: 'Casa' }],
        methods: [{ id: 'carta', emoji: 'M', nome: 'Carta' }],
        getSpese: () => spese,
        getSliderMax: items => FilterView.getSliderMax(items),
        renderChips: items => FilterView.renderChips(items),
        renderFooterInfo: payload => FilterView.renderFooterInfo(payload),
        countActiveFilters: () => {
            let count = 0;
            if (filters.query) count += 1;
            if (filters.categories.size) count += 1;
            if (filters.methods.size) count += 1;
            if (filters.amountMin > 0 || filters.amountMax !== Infinity) count += 1;
            if (filters.dateFrom) count += 1;
            if (filters.dateTo) count += 1;
            return count;
        },
        applyFilters: items => items.filter(item => !filters.categories.size || filters.categories.has(item.categoria)),
        getQuickTotals: () => ({ todayTotal: 1, weekTotal: 2, monthTotal: 3, monthNameCapitalized: 'Maggio' }),
        getFilterOpen: () => state.filterOpen,
        setFilterOpen: value => { state.filterOpen = value; },
        getAdvancedFiltersOpen: () => state.advancedFiltersOpen,
        setAdvancedFiltersOpen: value => { state.advancedFiltersOpen = value; },
        getFilterSearchActive: () => state.filterSearchActive,
        setFilterSearchActive: value => { state.filterSearchActive = value; },
        getCurrentPage: () => 'timeline',
        getLastSliderInput: () => state.lastSliderInput,
        setLastSliderInput: value => { state.lastSliderInput = value; },
        getSliderMaxValue: () => state.sliderMax,
        setSliderMaxValue: value => { state.sliderMax = value; },
        setLastViewportHeight: value => { state.lastViewportHeight = value; },
        getViewportHeight: () => 700,
        startExpenseInputBarWatch: () => calls.push('start-watch'),
        stopExpenseInputBarWatch: () => calls.push('stop-watch'),
        pushUiState: payload => calls.push(['push', payload.panel]),
        consumeUiState: steps => calls.push(['consume', steps || 1]),
        runHistoryAction: action => calls.push(['history', action]),
        getCloseHistoryAction: payload => ({ kind: 'close', ...payload }),
        updateAppMainPadding: () => calls.push('padding'),
        markReleasedFilterSearchHistory: () => { state.releasedFilterSearchHistory = true; },
        shouldCleanupReleasedFilterSearchHistory: () => state.releasedFilterSearchHistory,
        clearReleasedFilterSearchHistory: () => { state.releasedFilterSearchHistory = false; },
        onFilterChange: () => calls.push('filter-change'),
        showToast: (message, type) => calls.push(['toast', message, type]),
        requestAnimationFrame: callback => callback()
    };

    FilterController.init(options);

    assert.equal(state.sliderMax, 500);
    assert.equal(elements['slider-max'].value, '500');
    assert(catChips[0].classList.contains('active'));
    assert.equal(FilterController.getActiveFilterCount(options), 1);

    elements['search-input'].value = ' caffe ';
    elements['search-input'].listeners.input();
    assert.equal(filters.query, 'caffe');
    assert(calls.includes('filter-change'));

    FilterController.openFilterPanel(options);
    assert(!elements['advanced-filters'].classList.contains('hidden'));
    assert.equal(elements['btn-advanced-toggle'].title, 'Espandi pannello filtri');
    elements['search-input'].listeners.focus();
    assert.equal(state.filterOpen, true);
    assert.equal(state.filterSearchActive, true);
    assert.equal(state.lastViewportHeight, 700);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'push' && call[1] === 'filter-search'));

    elements['search-input'].listeners.blur();
    assert.equal(state.filterSearchActive, false);
    assert(calls.includes('stop-watch'));

    const consumeCountAfterBlur = calls.filter(call => Array.isArray(call) && call[0] === 'consume').length;
    elements['search-input'].listeners.focus();
    assert.equal(state.filterSearchActive, true);
    assert.equal(FilterController.releaseFilterSearchInteraction(options, { consumeHistory: false }), true);
    assert.equal(state.filterSearchActive, false);
    assert.equal(state.releasedFilterSearchHistory, true);
    assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'consume').length, consumeCountAfterBlur);
    state.releasedFilterSearchHistory = false;

    const targetMatching = (...matches) => ({
        closest(selector) {
            const parts = String(selector).split(',').map(part => part.trim());
            return matches.some(match => parts.includes(match)) ? {} : null;
        }
    });

    elements['search-input'].listeners.focus();
    assert.equal(state.filterSearchActive, true);
    docListeners.pointerdown({
        target: targetMatching('.expense-card')
    });
    assert.equal(state.filterSearchActive, false);
    assert.equal(state.releasedFilterSearchHistory, true);
    assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'consume').length, consumeCountAfterBlur);
    state.releasedFilterSearchHistory = false;

    elements['search-input'].listeners.focus();
    assert.equal(state.filterSearchActive, true);
    docListeners.pointerdown({
        target: targetMatching('button')
    });
    assert.equal(state.filterSearchActive, false);
    assert.equal(state.releasedFilterSearchHistory, true);
    assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'consume').length, consumeCountAfterBlur);
    state.releasedFilterSearchHistory = false;

    elements['search-input'].listeners.focus();
    assert.equal(state.filterSearchActive, true);
    docListeners.pointerdown({
        target: targetMatching('#search-input', 'textarea')
    });
    assert.equal(state.filterSearchActive, true);
    assert.equal(state.releasedFilterSearchHistory, false);

    docListeners.pointerdown({
        target: targetMatching('#btn-search-clear', 'button')
    });
    assert.equal(state.filterSearchActive, true);
    assert.equal(state.releasedFilterSearchHistory, false);

    elements['search-input'].listeners.blur();
    assert.equal(state.filterSearchActive, false);

    elements['slider-max'].value = '80';
    elements['slider-max'].listeners.input();
    assert.equal(state.lastSliderInput, 'max');
    assert.equal(filters.amountMax, 80);

    FilterController.openAdvancedFilters(options);
    assert.equal(state.advancedFiltersOpen, true);
    assert(!elements['advanced-filters'].classList.contains('hidden'));
    assert.equal(elements['btn-advanced-toggle'].title, 'Riduci pannello filtri');
    assert(elements['input-bar'].classList.contains('hidden'));
    assert(elements['app-main'].classList.contains('no-input-bar'));
    assert(!doc.body.classList.contains('no-scroll'));
    assert(calls.some(call => Array.isArray(call) && call[0] === 'scroll-to'));

    FilterController.closeFilterPanel(options);
    assert.equal(state.filterOpen, false);
    assert.equal(state.advancedFiltersOpen, false);
    assert(elements['advanced-filters'].classList.contains('hidden'));
    assert(!elements['input-bar'].classList.contains('hidden'));
    assert(!elements['app-main'].classList.contains('no-input-bar'));
    assert(calls.some(call => Array.isArray(call) && call[0] === 'history' && call[1].steps === 2));

    FilterController.openFilterPanel(options);
    FilterController.openAdvancedFilters(options);
    scrollContainer.scrollTop = 120;
    FilterController.closeAdvancedFilters(options);
    assert.equal(state.advancedFiltersOpen, false);
    assert(!elements['advanced-filters'].classList.contains('hidden'));
    assert(!elements['input-bar'].classList.contains('hidden'));
    assert(!elements['app-main'].classList.contains('no-input-bar'));
    assert.equal(scrollContainer.scrollTop, 0);

    FilterController.resetFilters(options);
    assert.equal(filters.query, '');
    assert.equal(filters.categories.size, 0);
    assert.equal(filters.amountMax, Infinity);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'toast'));
});

test('Controller filtri ripulisce lo stato history della ricerca rilasciata', () => {
    const { FilterController } = loadUiViews();
    const calls = [];
    let releasedFilterSearchHistory = true;
    let filterOpen = true;

    function classList(initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
            },
            remove(cls) {
                classes.delete(cls);
            },
            toggle(cls, force) {
                const shouldAdd = force === undefined ? !classes.has(cls) : !!force;
                if (shouldAdd) classes.add(cls);
                else classes.delete(cls);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    function element(id, classes = []) {
        return {
            id,
            style: {},
            classList: classList(classes)
        };
    }

    const elements = {
        'filter-panel': element('filter-panel'),
        'btn-filter-toggle': element('btn-filter-toggle'),
        'advanced-filters': element('advanced-filters'),
        'btn-advanced-toggle': element('btn-advanced-toggle'),
        'timeline-summary': element('timeline-summary'),
        'page-timeline': element('page-timeline'),
        'app-main': element('app-main'),
        'input-bar': element('input-bar')
    };
    const doc = {
        body: { classList: classList(['no-scroll']) },
        getElementById(id) {
            return elements[id] || null;
        }
    };
    const options = {
        document: doc,
        body: doc.body,
        getFilterOpen: () => filterOpen,
        setFilterOpen: value => { filterOpen = value; },
        getAdvancedFiltersOpen: () => false,
        setAdvancedFiltersOpen: () => {},
        shouldCleanupReleasedFilterSearchHistory: () => releasedFilterSearchHistory,
        clearReleasedFilterSearchHistory: () => { releasedFilterSearchHistory = false; },
        consumeUiState: steps => calls.push(['consume', steps]),
        runHistoryAction: action => calls.push(['history', action]),
        getCloseHistoryAction: payload => ({ type: 'close', ...payload }),
        updateAppMainPadding: () => calls.push('padding'),
        getCurrentPage: () => 'timeline'
    };

    FilterController.closeFilterPanel(options, true);

    assert.equal(filterOpen, false);
    assert.equal(releasedFilterSearchHistory, false);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'consume' && call[1] === 1));

    calls.length = 0;
    releasedFilterSearchHistory = true;
    filterOpen = true;

    FilterController.closeFilterPanel(options, false);

    assert.equal(filterOpen, false);
    assert.equal(releasedFilterSearchHistory, false);
    assert(calls.some(call =>
        Array.isArray(call) &&
        call[0] === 'history' &&
        call[1].steps === 2
    ));
    assert(!calls.some(call => Array.isArray(call) && call[0] === 'consume'));
});

test('Vista timeline renderizza riepilogo e card escapando il testo utente', () => {
    const { TimelineView } = loadUiViews();
    const html = TimelineView.renderExpenseCard(
        expense({ descrizione: '<script>alert(1)</script>', importo: 2 }),
        {
            category: { emoji: '☕', nome: 'Bar' },
            method: { emoji: '💳', nome: 'Carta' },
            isNew: true
        }
    );

    assert(html.includes('new-card'));
    assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert(!html.includes('<script>alert(1)</script>'));
});

test('Controller timeline riusa modello filtrato precomputato', () => {
    const { TimelineController } = loadUiViews();
    const card = {
        dataset: { id: 'a' },
        addEventListener() {}
    };
    const elements = {
        'timeline-content': {
            innerHTML: '',
            querySelectorAll(selector) {
                return selector === '.expense-card' ? [card] : [];
            }
        },
        'timeline-empty': {
            classList: {
                add() {},
                remove() {}
            }
        },
        'timeline-summary': { innerHTML: '' }
    };
    const doc = {
        getElementById(id) {
            return elements[id] || null;
        }
    };
    const model = {
        allSpese: [expense({ id: 'a' }), expense({ id: 'b' })],
        filteredSpese: [expense({ id: 'a' })],
        hasActiveFilters: true,
        activeFilterCount: 1,
        quickTotals: { todayTotal: 1, weekTotal: 2, monthTotal: 3, monthNameCapitalized: 'Maggio' }
    };

    const result = TimelineController.render({
        document: doc,
        filterModel: model,
        hasActiveFilters: () => {
            throw new Error('hasActiveFilters non deve essere chiamato');
        },
        applyFilters: () => {
            throw new Error('applyFilters non deve essere chiamato');
        },
        getQuickTotals: () => {
            throw new Error('getQuickTotals non deve essere chiamato');
        },
        groupByDay: items => [{ date: '2026-05-20', spese: items }],
        getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
        getMethod: () => ({ emoji: 'm', nome: 'Carta' }),
        formatDayLabel: date => date
    });

    assert.equal(result.allSpese.length, 2);
    assert.equal(result.filtered.length, 1);
    assert(elements['timeline-summary'].innerHTML.includes('Filtro Attivo'));
});

test('Controller timeline coordina render e click card fuori da App', () => {
    const { TimelineController } = loadUiViews();
    const calls = [];

    function makeClassList(initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
            },
            remove(cls) {
                classes.delete(cls);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    const card = {
        dataset: { id: 'a' },
        addEventListener(event, handler) {
            calls.push(['bind-card', event]);
            this.handler = handler;
        }
    };
    const elements = {
        'timeline-content': {
            innerHTML: '',
            querySelectorAll(selector) {
                return selector === '.expense-card' ? [card] : [];
            }
        },
        'timeline-empty': { classList: makeClassList(['hidden']) },
        'timeline-summary': { innerHTML: '' }
    };
    const doc = {
        getElementById(id) {
            return elements[id] || null;
        }
    };
    const spese = [
        expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-05-19T10:00:00.000Z' }),
        expense({ id: 'b', importo: 5, categoria: 'casa', data: '2026-05-18T10:00:00.000Z' })
    ];

    let newCardId = 'a';
    const result = TimelineController.render({
        document: doc,
        spese,
        newCardId,
        hasActiveFilters: () => true,
        applyFilters: items => items.filter(item => item.id === 'a'),
        getQuickTotals: () => ({ todayTotal: 10, weekTotal: 15, monthTotal: 15, monthName: 'Maggio' }),
        groupByDay: items => [{ date: '2026-05-19', spese: items }],
        getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
        getMethod: () => ({ emoji: 'm', nome: 'Carta' }),
        formatDayLabel: date => `giorno ${date}`,
        clearNewCardId: () => { newCardId = null; },
        openEditModal: id => calls.push(['open', id])
    });

    assert.equal(result.filtered.length, 1);
    assert.equal(newCardId, null);
    assert(elements['timeline-summary'].innerHTML.includes('Filtro Attivo'));
    assert(elements['timeline-content'].innerHTML.includes('new-card'));
    assert(calls.some(call => call[0] === 'bind-card' && call[1] === 'click'));

    card.handler();
    assert.deepEqual(calls[calls.length - 1], ['open', 'a']);

    let clearedByCard = false;
    const cardResult = TimelineController.renderCard(spese[0], {
        newCardId: 'a',
        getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
        getMethod: () => ({ emoji: 'm', nome: 'Carta' }),
        clearNewCardId: () => { clearedByCard = true; }
    });

    assert.equal(cardResult.isNew, true);
    assert.equal(clearedByCard, true);
    assert(cardResult.html.includes('new-card'));

    TimelineController.render({
        document: doc,
        spese: [],
        hasActiveFilters: () => false
    });

    assert.equal(elements['timeline-content'].innerHTML, '');
    assert.equal(elements['timeline-summary'].innerHTML, '');
    assert(!elements['timeline-empty'].classList.contains('hidden'));
});

test('Controller selezione timeline gestisce selezione, export e delete bulk', () => {
    const { TimelineSelectionController } = loadUiViews();
    const calls = [];
    const state = {
        active: false,
        selectedIds: new Set(),
        deletePending: false
    };
    const spese = [
        expense({ id: 'a', importo: 2 }),
        expense({ id: 'b', importo: 3 }),
        expense({ id: 'c', importo: 4 })
    ];
    const options = {
        document: {
            getElementById() {
                return null;
            }
        },
        storage: {
            exportCSV(payload) {
                calls.push(['export-csv', payload.spese.map(item => item.id)]);
                return { success: true, content: 'csv' };
            },
            exportJSON(payload) {
                calls.push(['export-json', payload.spese.map(item => item.id)]);
                return { success: true, content: '{}' };
            },
            deleteSpese(ids) {
                calls.push(['delete-many', ids]);
                return { success: true, count: ids.length };
            }
        },
        getSpese: () => spese,
        getFilterModel: () => ({
            allSpese: spese,
            filteredSpese: spese.filter(item => item.id !== 'a')
        }),
        getSelectedIds: () => state.selectedIds,
        setSelectedIds: ids => { state.selectedIds = ids; },
        isActive: () => state.active,
        setActive: value => { state.active = value; },
        isDeletePending: () => state.deletePending,
        setDeletePending: value => { state.deletePending = value; },
        getCurrentPage: () => 'timeline',
        pushUiState: payload => calls.push(['push', payload.panel]),
        consumeUiState: () => calls.push('consume'),
        renderTimeline: () => calls.push('render'),
        refreshAfterDataChange: () => calls.push('refresh'),
        dateStamp: () => '2026-06-01',
        download: (content, filename, mime) => calls.push(['download', filename, mime, content]),
        showToast: (message, type) => calls.push(['toast', type, message]),
        showChoices: (message, choices) => calls.push(['choices', message, choices.map(choice => choice.text)])
    };

    assert.equal(TimelineSelectionController.enter(options, 'a'), true);
    assert.equal(state.active, true);
    assert.deepEqual(Array.from(state.selectedIds), ['a']);

    TimelineSelectionController.toggle(options, 'b');
    assert.deepEqual(Array.from(state.selectedIds).sort(), ['a', 'b']);

    const selectedVisible = TimelineSelectionController.selectVisible(options);
    assert.equal(selectedVisible, 2);
    assert.deepEqual(Array.from(state.selectedIds).sort(), ['b', 'c']);

    const summary = TimelineSelectionController.getSummary(options);
    assert.equal(summary.selectedCount, 2);
    assert.equal(summary.selectedTotal, 7);
    assert.equal(summary.visibleCount, 2);

    assert.equal(TimelineSelectionController.exportSelected(options, 'csv'), true);
    assert.equal(TimelineSelectionController.showExportChoices(options), true);
    assert.equal(TimelineSelectionController.showDeleteConfirm(options), true);
    assert.equal(state.deletePending, true);
    assert.equal(TimelineSelectionController.deleteSelected(options), true);
    assert.equal(state.active, false);
    assert.equal(state.selectedIds.size, 0);

    assert.deepEqual(calls.filter(call => Array.isArray(call) && call[0] === 'push'), [
        ['push', 'timeline-selection']
    ]);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'export-csv' && call[1].join(',') === 'b,c'));
    assert(calls.some(call => Array.isArray(call) && call[0] === 'download' && call[1] === 'spese_selezionate_2026-06-01.csv'));
    assert(calls.some(call => Array.isArray(call) && call[0] === 'delete-many' && call[1].join(',') === 'b,c'));
    assert(calls.includes('refresh'));
});

test('Controller timeline in modalita selezione non apre la modale al click card', () => {
    const { TimelineController } = loadUiViews();
    const calls = [];
    const card = {
        dataset: { id: 'a' },
        handlers: {},
        addEventListener(event, handler) {
            this.handlers[event] = handler;
        }
    };
    const elements = {
        'timeline-content': {
            innerHTML: '',
            querySelectorAll(selector) {
                return selector === '.expense-card' ? [card] : [];
            }
        },
        'timeline-empty': {
            classList: {
                add() {},
                remove() {}
            }
        },
        'timeline-summary': { innerHTML: '' }
    };
    const doc = {
        getElementById(id) {
            return elements[id] || null;
        }
    };

    TimelineController.render({
        document: doc,
        spese: [expense({ id: 'a', importo: 5 })],
        hasActiveFilters: () => false,
        getQuickTotals: () => ({ todayTotal: 5, weekTotal: 5, monthTotal: 5, monthName: 'Giugno' }),
        groupByDay: items => [{ date: '2026-06-01', spese: items }],
        getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
        getMethod: () => ({ emoji: 'm', nome: 'Carta' }),
        formatDayLabel: date => date,
        selection: {
            active: true,
            selectedIds: new Set(['a'])
        },
        getSelectionSummary: () => ({
            active: true,
            selectedIds: new Set(['a']),
            selectedCount: 1,
            selectedTotal: 5,
            visibleCount: 1
        }),
        isSelectionActive: () => true,
        toggleSelection: id => calls.push(['toggle', id]),
        enterSelection: id => calls.push(['enter', id]),
        openEditModal: id => calls.push(['open', id])
    });

    assert(elements['timeline-content'].innerHTML.includes('selection-mode'));
    assert(elements['timeline-content'].innerHTML.includes('selected'));
    assert(elements['timeline-summary'].innerHTML.includes('Selezione'));

    card.handlers.click();

    assert.deepEqual(calls, [['toggle', 'a']]);
});

test('Controller navigazione coordina pagine, history e scroll fuori da App', () => {
    const { NavigationController } = loadUiViews();
    const calls = [];

    function makeClassList(initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
            },
            remove(cls) {
                classes.delete(cls);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    function makeElement(id, classes = []) {
        return {
            id,
            dataset: {},
            classList: makeClassList(classes),
            style: {},
            scrollTop: 0,
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            }
        };
    }

    const pages = {
        timeline: makeElement('page-timeline'),
        stats: makeElement('page-stats', ['hidden']),
        settings: makeElement('page-settings', ['hidden'])
    };
    const navTimeline = makeElement('nav-timeline', ['active']);
    navTimeline.dataset.page = 'timeline';
    const navStats = makeElement('nav-stats');
    navStats.dataset.page = 'stats';
    const navSettings = makeElement('nav-settings');
    navSettings.dataset.page = 'settings';
    const navButtons = [navTimeline, navStats, navSettings];
    const main = makeElement('app-main');
    main.scrollTop = 17;
    const inputBar = makeElement('input-bar');
    const filterToggle = makeElement('btn-filter-toggle');

    const doc = {
        getElementById(id) {
            if (id === 'app-main') return main;
            if (id === 'input-bar') return inputBar;
            if (id === 'btn-filter-toggle') return filterToggle;
            if (id === 'page-timeline') return pages.timeline;
            if (id === 'page-stats') return pages.stats;
            if (id === 'page-settings') return pages.settings;
            return null;
        },
        querySelectorAll(selector) {
            if (selector === '.nav-btn') return navButtons;
            if (selector === '.page') return Object.values(pages);
            return [];
        },
        querySelector(selector) {
            const match = selector.match(/\.nav-btn\[data-page="([^"]+)"\]/);
            if (!match) return null;
            return navButtons.find(btn => btn.dataset.page === match[1]) || null;
        }
    };

    const state = {
        currentPage: 'timeline',
        pageScrollTop: {
            timeline: 0,
            stats: 42,
            settings: 9
        },
        restoring: false,
        filterOpen: true,
        advancedFiltersOpen: false
    };
    const options = {
        document: doc,
        pageScrollTop: state.pageScrollTop,
        getCurrentPage: () => state.currentPage,
        setCurrentPage: page => { state.currentPage = page; },
        isRestoringPageScroll: () => state.restoring,
        setRestoringPageScroll: value => {
            state.restoring = value;
            calls.push(['restoring', value]);
        },
        getNavigationHistoryAction: payload => ({ type: 'history', ...payload }),
        runHistoryAction: action => calls.push(['history', action]),
        isFilterOpen: () => state.filterOpen,
        shouldHideTimelineInputBar: () => state.advancedFiltersOpen,
        closeFilterPanel: () => {
            state.filterOpen = false;
            calls.push('close-filter');
        },
        updateAppMainPadding: () => calls.push('padding'),
        renderTimeline: () => calls.push('render-timeline'),
        renderStats: () => calls.push('render-stats'),
        renderSettings: () => calls.push('render-settings'),
        requestAnimationFrame: callback => callback(),
        defer: callback => callback()
    };

    NavigationController.init(options);

    assert.equal(typeof navStats.listeners.click, 'function');
    assert.equal(typeof main.listeners.scroll, 'function');

    main.scrollTop = 88;
    main.listeners.scroll();
    assert.equal(state.pageScrollTop.timeline, 88);

    state.restoring = true;
    main.scrollTop = 99;
    main.listeners.scroll();
    assert.equal(state.pageScrollTop.timeline, 88);
    state.restoring = false;

    navStats.listeners.click();

    assert.equal(state.currentPage, 'stats');
    assert(pages.timeline.classList.contains('hidden'));
    assert(!pages.stats.classList.contains('hidden'));
    assert(!navTimeline.classList.contains('active'));
    assert(navStats.classList.contains('active'));
    assert(inputBar.classList.contains('hidden'));
    assert(main.classList.contains('no-input-bar'));
    assert.equal(filterToggle.style.display, '');
    assert.equal(main.scrollTop, 42);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'history' && call[1].nextPage === 'stats'));
    assert(calls.includes('render-stats'));

    state.advancedFiltersOpen = true;
    const suppressedTimelineAction = NavigationController.navigateTo(options, 'timeline', true);
    assert.equal(suppressedTimelineAction.fromPopstate, true);
    assert.equal(state.currentPage, 'timeline');
    assert(inputBar.classList.contains('hidden'));
    assert(main.classList.contains('no-input-bar'));
    state.advancedFiltersOpen = false;

    NavigationController.navigateTo(options, 'settings');

    assert.equal(state.currentPage, 'settings');
    assert.equal(state.filterOpen, false);
    assert.equal(filterToggle.style.display, 'none');
    assert(calls.includes('close-filter'));
    assert(calls.includes('render-settings'));

    const popAction = NavigationController.navigateTo(options, 'timeline', true);
    assert.equal(popAction.fromPopstate, true);
    assert.equal(state.currentPage, 'timeline');
    assert(!inputBar.classList.contains('hidden'));
    assert(!main.classList.contains('no-input-bar'));
});

test('Vista statistiche separa template da dati e conserva gli stati vuoti', () => {
    const { StatsView } = loadUiViews();

    assert(StatsView.renderEmptyState().includes('stats-empty-initial'));

    const html = StatsView.renderPage({
        period: 'month',
        periodLabel: 'maggio 2026',
        canGoNext: false,
        isCustom: false,
        filtered: [expense({ importo: 10 })],
        summary: {
            total: 10,
            avg: 1,
            categoryTotals: [['bar', 10]],
            maxCategory: 10,
            topExpenses: [expense({ importo: 10 })]
        },
        barChartTitle: 'Andamento giornaliero',
        chartColors: ['#10b981'],
        getCategory: () => ({ emoji: '☕', nome: 'Bar' })
    });

    assert(html.includes('data-period="month"'));
    assert(html.includes('chart-doughnut'));
    assert(html.includes('Dettaglio categorie'));
});

test('Configurazione grafici statistiche separa Chart.js da app.js', () => {
    const { StatsCharts } = loadUiViews();
    const spese = [
        expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-05-01T10:00:00' }),
        expense({ id: 'b', importo: 0, categoria: 'bar', data: '2026-05-02T10:00:00' })
    ];
    const themeColors = {
        text: '#111111',
        textMuted: '#666666',
        accent: '#10b981',
        cardBg: '#ffffff',
        grid: '#dddddd'
    };

    const doughnut = StatsCharts.buildDoughnutConfig(spese, {
        themeColors,
        chartColors: ['#111111'],
        getCategory: () => ({ emoji: '☕', nome: 'Bar' })
    });
    const bar = StatsCharts.buildBarConfig(
        spese,
        new Date('2026-05-01T00:00:00'),
        new Date('2026-05-02T23:59:59'),
        { themeColors, aggregation: 'day', now: new Date('2026-05-02T12:00:00') }
    );

    assert.equal(doughnut.type, 'doughnut');
    assert.deepEqual(doughnut.data.labels, ['☕ Bar']);
    assert.deepEqual(doughnut.data.datasets[0].data, [10]);
    assert.equal(doughnut.options.plugins.legend.labels.color, '#111111');
    assert.equal(bar.type, 'bar');
    assert.deepEqual(bar.data.datasets[0].data, [10, 0]);
    assert.deepEqual(bar.data.datasets[0].backgroundColor, ['#10b981cc', '#10b98133']);
    assert.equal(bar.options.scales.y.grid.color, '#dddddd');
});

test('Controller statistiche riusa modello precomputato', () => {
    const { StatsController } = loadUiViews();
    const filtered = [
        expense({
            id: 'ready',
            importo: 12,
            descrizione: 'Pronta',
            categoria: 'bar',
            data: '2026-05-20T10:00:00.000Z'
        })
    ];
    const container = {
        innerHTML: '',
        querySelectorAll() {
            return [];
        },
        querySelector() {
            return null;
        }
    };

    const result = StatsController.render({
        document: {
            getElementById() {
                return null;
            }
        },
        container,
        spese: [
            ...filtered,
            expense({ id: 'ignored', importo: 99, descrizione: 'Ignorata' })
        ],
        statsModel: {
            filteredSpese: filtered,
            start: new Date('2026-05-20T00:00:00.000Z'),
            end: new Date('2026-05-20T23:59:59.999Z'),
            label: 'Periodo pronto',
            summary: {
                total: 12,
                avg: 12,
                days: 1,
                categoryTotals: [['bar', 12]],
                maxCategory: 12,
                topExpenses: filtered
            },
            barChartTitle: 'Titolo pronto',
            canGoNext: true,
            isCustom: false
        },
        period: 'month',
        offset: -1,
        filters: {},
        charts: {},
        ChartClass: null,
        getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
        applyNonDateFilters: () => {
            throw new Error('applyNonDateFilters non deve essere chiamato');
        }
    });

    assert.equal(result.filtered, filtered);
    assert(container.innerHTML.includes('Periodo pronto'));
    assert(container.innerHTML.includes('Titolo pronto'));
    assert(container.innerHTML.includes('Pronta'));
    assert(!container.innerHTML.includes('Ignorata'));
});

test('Controller statistiche coordina render, periodo e grafici senza App', () => {
    const { StatsController } = loadUiViews();
    const calls = [];
    const periodButtons = [
        {
            dataset: { period: 'year' },
            addEventListener(event, handler) {
                calls.push(['bind-period', event, this.dataset.period]);
                this.handler = handler;
            }
        }
    ];
    const prevBtn = {
        addEventListener(event, handler) {
            calls.push(['bind-prev', event]);
            this.handler = handler;
        }
    };
    const nextBtn = {
        addEventListener(event, handler) {
            calls.push(['bind-next', event]);
            this.handler = handler;
        }
    };
    const container = {
        innerHTML: '',
        querySelectorAll(selector) {
            return selector === '.period-btn' ? periodButtons : [];
        },
        querySelector(selector) {
            if (selector === '#period-prev') return prevBtn;
            if (selector === '#period-next') return nextBtn;
            return null;
        }
    };
    const destroyed = [];
    const oldChart = {
        destroy() {
            destroyed.push('old');
        }
    };
    const chartCalls = [];
    function FakeChart(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.destroy = () => chartCalls.push(['destroy', ctx]);
        chartCalls.push(['create', ctx, config.type]);
    }

    let period = 'month';
    let offset = -1;
    let rerenderCount = 0;
    const result = StatsController.render({
        document: {
            getElementById(id) {
                if (id === 'chart-doughnut') return 'doughnut-canvas';
                if (id === 'chart-bar') return 'bar-canvas';
                return null;
            }
        },
        container,
        spese: [
            expense({ id: 'old', data: '2026-04-10T10:00:00.000Z', importo: 100 }),
            expense({ id: 'current', data: '2026-05-10T10:00:00.000Z', importo: 12 })
        ],
        period,
        offset,
        filters: {
            query: '',
            categories: new Set(),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: ''
        },
        charts: {
            doughnut: oldChart,
            bar: null
        },
        ChartClass: FakeChart,
        getCategory: () => ({ emoji: 'x', nome: 'Categoria' }),
        applyNonDateFilters: spese => spese,
        setPeriod: value => { period = value; },
        setOffset: value => { offset = value; },
        rerender: () => { rerenderCount += 1; }
    });

    assert(container.innerHTML.includes('stats-period-selector'));
    assert.equal(result.filtered.length, 1);
    assert.deepEqual(destroyed, ['old']);
    assert.deepEqual(chartCalls.map(call => call.slice(0, 3)), [
        ['create', 'doughnut-canvas', 'doughnut'],
        ['create', 'bar-canvas', 'bar']
    ]);
    assert.equal(result.charts.doughnut.ctx, 'doughnut-canvas');
    assert.equal(result.charts.bar.ctx, 'bar-canvas');

    periodButtons[0].handler();
    assert.equal(period, 'year');
    assert.equal(offset, 0);
    assert.equal(rerenderCount, 1);

    offset = -1;
    prevBtn.handler();
    assert.equal(offset, -2);
    assert.equal(rerenderCount, 2);

    nextBtn.handler();
    assert.equal(offset, 0);
    assert.equal(rerenderCount, 3);
});

test('Vista modale ordina dropdown cercabili privilegiando match iniziali', () => {
    const { ModalView, ModalInteractions } = loadUiViews();
    const items = [
        { id: 'abbigliamento', emoji: '👕', nome: 'Abbigliamento' },
        { id: 'bar', emoji: '☕', nome: 'Bar' },
        { id: 'supermercato', emoji: '🛒', nome: 'Supermercato' }
    ];

    const filtered = ModalView.getDropdownItems(items, 'b');
    const html = ModalView.renderDropdownList(filtered, 'bar');

    assert.equal(typeof ModalInteractions.createSearchableDropdown, 'function');
    assert.equal(typeof ModalInteractions.createTagInput, 'function');
    assert.deepEqual(filtered.map(item => item.id), ['bar', 'abbigliamento']);
    assert(html.includes('selected'));
    assert(html.includes('data-id="bar"'));
});

test('Vista modale calcola suggerimenti tag per ultimo uso, frequenza e creazione', () => {
    const { ModalView } = loadUiViews();
    const spese = [
        expense({ id: 'a', data: '2026-05-10T10:00:00.000Z', tags: ['casa', 'lavoro'] }),
        expense({ id: 'b', data: '2026-05-12T10:00:00.000Z', tags: ['casa', 'viaggio'] }),
        expense({ id: 'c', data: '2026-05-14T10:00:00.000Z', tags: ['salute'] })
    ];
    const allTags = ModalView.getAllTags(spese);
    const stats = ModalView.getTagStats(spese);
    const suggestions = ModalView.getTagSuggestions({ allTags, currentTags: [], filter: '', stats });
    const filteredHtml = ModalView.renderTagList({
        allTags,
        currentTags: ['casa'],
        filter: 'via',
        stats
    });
    const createHtml = ModalView.renderTagList({
        allTags,
        currentTags: [],
        filter: '#nuovo tag',
        stats
    });

    assert.deepEqual(allTags, ['casa', 'lavoro', 'salute', 'viaggio']);
    assert.equal(suggestions[0].tag, 'salute');
    assert(filteredHtml.includes('data-tag="viaggio"'));
    assert(createHtml.includes('data-tag="nuovotag"'));
});

test('Controller form modale popola campi, legge dati e collega micro-eventi', () => {
    const { ModalFormController, AppUI } = loadUiViews();
    const calls = [];

    function makeElement(id) {
        const classes = new Set(['picker-open']);
        return {
            id,
            value: '',
            listeners: {},
            classList: {
                add(cls) {
                    classes.add(cls);
                },
                remove(cls) {
                    classes.delete(cls);
                    calls.push(['remove-class', id, cls]);
                },
                contains(cls) {
                    return classes.has(cls);
                }
            },
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            blur() {
                calls.push(['blur', id]);
            }
        };
    }

    const elements = {
        'edit-importo': makeElement('edit-importo'),
        'edit-descrizione': makeElement('edit-descrizione'),
        'edit-data': makeElement('edit-data'),
        'edit-ora': makeElement('edit-ora'),
        'edit-nota': makeElement('edit-nota')
    };
    const doc = {
        activeElement: elements['edit-data'],
        getElementById(id) {
            return elements[id] || null;
        }
    };

    ModalFormController.fillForm({
        document: doc,
        spesa: expense({
            importo: 12.345,
            descrizione: 'Pranzo',
            data: '2026-05-19T13:45:00.000Z',
            nota: 'nota'
        }),
        toInputDate: date => AppUI.toInputDate(date),
        toInputTime: date => AppUI.toInputTime(date)
    });

    assert.equal(elements['edit-importo'].value, 12.345);
    assert.equal(elements['edit-descrizione'].value, 'Pranzo');
    assert.equal(elements['edit-data'].value, AppUI.toInputDate(new Date('2026-05-19T13:45:00.000Z')));
    assert.equal(elements['edit-ora'].value, AppUI.toInputTime(new Date('2026-05-19T13:45:00.000Z')));
    assert.equal(elements['edit-nota'].value, 'nota');

    elements['edit-importo'].value = '12,35';
    elements['edit-descrizione'].value = '';

    const form = ModalFormController.readForm({
        document: doc,
        parseAmountInput: value => AppUI.parseAmountInput(value),
        getDropdownValue: (id, fallback) => ({ 'sd-categoria': 'ristorante', 'sd-metodo': 'carta' }[id] || fallback),
        getTags: () => ['lavoro']
    });

    assert.equal(form.success, true);
    assert.equal(form.data.importo, 12.35);
    assert.equal(form.data.descrizione, 'Spesa');
    assert.equal(form.data.categoria, 'ristorante');
    assert.equal(form.data.metodo, 'carta');
    assert.equal(form.data.data, '2026-05-19T13:45:00.000Z');
    assert.deepEqual(form.data.tags, ['lavoro']);

    elements['edit-importo'].value = '0';
    assert.equal(
        ModalFormController.readForm({
            document: doc,
            parseAmountInput: value => AppUI.parseAmountInput(value)
        }).error,
        'Importo non valido'
    );

    let viewportHeight = 0;
    const deferred = [];
    ModalFormController.bindPickerFields({
        document: doc,
        bindPicker: el => calls.push(['bind-picker', el.id]),
        getViewportHeight: () => 700,
        setLastViewportHeight: value => { viewportHeight = value; },
        defer: callback => deferred.push(callback)
    });

    elements['edit-data'].listeners.focus();
    elements['edit-data'].listeners.change();
    deferred[0]();

    assert.equal(viewportHeight, 700);

    let enterPrevented = false;
    ModalFormController.bindPlainFieldEnterBlur({ document: doc });
    elements['edit-descrizione'].listeners.keydown({
        key: 'Enter',
        preventDefault() {
            enterPrevented = true;
        }
    });

    ModalFormController.clearPickerVisuals(doc);

    assert.equal(enterPrevented, true);
    assert(calls.some(call => call[0] === 'bind-picker' && call[1] === 'edit-data'));
    assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-data'));
    assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
});

test('Controller mobile modale isola focus, picker e viewport da App', () => {
    const { ModalMobileController } = loadUiViews();
    const calls = [];
    const timeouts = [];
    const intervals = [];
    const clearedIntervals = [];
    const pushedStates = [];
    const consumedStates = [];
    const docListeners = {};
    const winListeners = {};

    function classList(id, initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
                calls.push(['add-class', id, cls]);
            },
            remove(cls) {
                classes.delete(cls);
                calls.push(['remove-class', id, cls]);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    function makeElement(id, options = {}) {
        const el = {
            id,
            type: options.type || 'text',
            tagName: options.tagName || 'INPUT',
            inModal: !!options.inModal,
            inDropdown: !!options.inDropdown,
            listeners: {},
            classList: classList(id, options.classes || []),
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            blur() {
                calls.push(['blur', id]);
                if (activeElement === el) activeElement = null;
            },
            focus() {
                calls.push(['focus', id]);
                activeElement = el;
            },
            matches(selector) {
                if (selector === 'input[type="date"], input[type="time"]') {
                    return this.tagName === 'INPUT' && ['date', 'time'].includes(this.type);
                }
                if (selector === 'input, textarea, select') {
                    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName);
                }
                return false;
            },
            closest(selector) {
                return selector === '.searchable-dropdown' && this.inDropdown ? {} : null;
            },
            showPicker() {
                calls.push(['show-picker', id]);
            }
        };
        return el;
    }

    const sdInput = makeElement('sd-input', { inModal: true, inDropdown: true });
    const dropdown = {
        classList: classList('dropdown', ['open']),
        querySelector(selector) {
            return selector === '.sd-input' ? sdInput : null;
        }
    };
    const modal = { contains: el => !!(el && el.inModal) };
    const editDesc = makeElement('edit-descrizione', { inModal: true, tagName: 'TEXTAREA' });
    const editData = makeElement('edit-data', { inModal: true, type: 'date', classes: ['picker-open'] });
    const editOra = makeElement('edit-ora', { inModal: true, type: 'time', classes: ['picker-open'] });
    const searchInput = makeElement('search-input');
    const expenseInput = makeElement('expense-input');
    let activeElement = editDesc;
    let modalOpen = true;
    let filterOpen = false;
    let currentPage = 'timeline';
    let lastViewportHeight = 400;
    let timerId = null;
    let interactionActive = false;
    let nextIntervalId = 0;
    const selection = {
        rangeCount: 1,
        removeAllRanges() {
            calls.push('remove-ranges');
            this.rangeCount = 0;
        }
    };
    const elements = {
        'edit-modal': modal,
        'edit-data': editData,
        'edit-ora': editOra,
        'search-input': searchInput,
        'expense-input': expenseInput
    };
    const doc = {
        documentElement: { clientHeight: 620 },
        get activeElement() {
            return activeElement;
        },
        getElementById(id) {
            return elements[id] || null;
        },
        querySelector(selector) {
            return selector === '#edit-modal .searchable-dropdown.open' ? dropdown : null;
        },
        addEventListener(event, handler) {
            docListeners[event] = handler;
        }
    };
    const win = {
        innerHeight: 640,
        visualViewport: { height: 500 },
        getSelection: () => selection,
        addEventListener(event, handler) {
            winListeners[event] = handler;
        }
    };
    const options = {
        document: doc,
        window: win,
        isModalOpen: () => modalOpen,
        isFilterOpen: () => filterOpen,
        getCurrentPage: () => currentPage,
        getLastViewportHeight: () => lastViewportHeight,
        setLastViewportHeight: value => { lastViewportHeight = value; },
        getKeyboardWatchTimer: () => timerId,
        setKeyboardWatchTimer: value => { timerId = value; },
        isInteractionActive: () => interactionActive,
        setInteractionActive: value => { interactionActive = value; },
        pushUiState: state => pushedStates.push(state),
        consumeUiState: () => consumedStates.push('consume'),
        clearSelection: () => calls.push('clear-selection'),
        setTimeout: (callback, ms) => {
            timeouts.push({ callback, ms });
            return timeouts.length;
        },
        setInterval: (callback, ms) => {
            intervals.push({ callback, ms });
            nextIntervalId += 1;
            return nextIntervalId;
        },
        clearInterval: id => clearedIntervals.push(id)
    };

    assert.equal(ModalMobileController.getViewportHeight(options), 500);
    assert.equal(ModalMobileController.getOpenDropdown(options), dropdown);
    assert.equal(ModalMobileController.getActivePlainField(options), editDesc);

    ModalMobileController.clearSelection(options);

    assert(calls.some(call => call[0] === 'blur' && call[1] === 'sd-input'));
    assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
    assert(calls.some(call => call[0] === 'remove-class' && call[1] === 'edit-data' && call[2] === 'picker-open'));
    assert(calls.includes('remove-ranges'));

    activeElement = editDesc;
    lastViewportHeight = 300;
    win.visualViewport.height = 450;
    ModalMobileController.handleViewportChange(options);

    assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
    assert.equal(lastViewportHeight, 450);

    modalOpen = false;
    filterOpen = true;
    activeElement = searchInput;
    lastViewportHeight = 300;
    ModalMobileController.handleViewportChange(options);
    assert(calls.some(call => call[0] === 'blur' && call[1] === 'search-input'));

    filterOpen = false;
    activeElement = expenseInput;
    lastViewportHeight = 300;
    ModalMobileController.handleViewportChange(options);
    assert(calls.some(call => call[0] === 'blur' && call[1] === 'expense-input'));

    modalOpen = true;
    ModalMobileController.pushHistoryState(options);
    ModalMobileController.ensureInteractionState(options);
    assert.equal(interactionActive, true);
    assert.deepEqual(pushedStates, [
        { panel: 'modal' },
        { panel: 'modal-interaction' }
    ]);

    ModalMobileController.releaseInteractionState(options);
    assert.equal(interactionActive, false);
    assert.deepEqual(consumedStates, ['consume']);

    ModalMobileController.startViewportWatch(options);
    assert.equal(timerId, 1);
    assert.equal(intervals[0].ms, 120);
    ModalMobileController.stopViewportWatch(options);
    assert.equal(timerId, null);
    assert.deepEqual(clearedIntervals, [1]);

    activeElement = editData;
    ModalMobileController.bindNonStickyNativePicker(editData, options);
    let pointerPrevented = false;
    let pointerStopped = false;
    editData.listeners.pointerdown({
        preventDefault() {
            pointerPrevented = true;
        },
        stopPropagation() {
            pointerStopped = true;
        }
    });

    assert.equal(pointerPrevented, true);
    assert.equal(pointerStopped, true);
    assert(calls.some(call => call[0] === 'show-picker' && call[1] === 'edit-data'));
    assert.equal(timeouts[0].ms, 0);
    timeouts[0].callback();

    let enterPrevented = false;
    activeElement = editData;
    editData.listeners.keydown({
        key: 'Enter',
        preventDefault() {
            enterPrevented = true;
        }
    });

    assert.equal(enterPrevented, true);
    assert(calls.includes('clear-selection'));

    editData.listeners.keydown({
        key: 'Escape',
        preventDefault() { }
    });

    assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-data'));
    assert.equal(typeof docListeners.pointerdown, 'function');
    assert.equal(typeof winListeners.focus, 'function');
});

test('Controller modale coordina apertura, salvataggio e chiusura fuori da App', () => {
    const { ModalController } = loadUiViews();
    const calls = [];
    const docListeners = {};
    const winListeners = {};
    const timers = [];

    function classList(id, initial = []) {
        const classes = new Set(initial);
        return {
            add(cls) {
                classes.add(cls);
                calls.push(['add-class', id, cls]);
            },
            remove(cls) {
                classes.delete(cls);
                calls.push(['remove-class', id, cls]);
            },
            contains(cls) {
                return classes.has(cls);
            }
        };
    }

    function element(id, initialClasses = []) {
        return {
            id,
            listeners: {},
            classList: classList(id, initialClasses),
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            }
        };
    }

    const elements = {
        'modal-close': element('modal-close'),
        'modal-overlay': element('modal-overlay', ['hidden']),
        'btn-save': element('btn-save'),
        'btn-delete': element('btn-delete')
    };
    const body = {
        classList: classList('body')
    };
    const doc = {
        body,
        visibilityState: 'visible',
        getElementById(id) {
            return elements[id] || null;
        },
        addEventListener(event, handler) {
            docListeners[event] = handler;
        }
    };
    const win = {
        matchMedia: () => ({ matches: true }),
        visualViewport: {
            addEventListener(event, handler) {
                winListeners[`vv:${event}`] = handler;
            }
        },
        addEventListener(event, handler) {
            winListeners[event] = handler;
        }
    };
    const spese = [
        expense({
            id: 'expense-a',
            descrizione: 'Pranzo',
            categoria: 'ristorante',
            metodo: 'carta',
            tags: ['lavoro']
        })
    ];
    let editingId = null;
    let editTags = [];
    let interactionActive = false;
    let suspended = false;
    let currentPage = 'stats';
    let filterOpen = true;
    let readResult = {
        success: true,
        data: { descrizione: 'Pranzo corretto', importo: 12.5 }
    };
    let updateResult = { success: true };
    let deleteResult = { success: true };
    let confirmCallback = null;

    const formController = {
        fillForm(payload) {
            calls.push(['fill-form', payload.spesa.id]);
        },
        readForm(payload) {
            calls.push(['read-form', payload.getTags().join('|')]);
            return readResult;
        },
        bindPickerFields(payload) {
            calls.push('bind-picker-fields');
            payload.bindPicker({ id: 'edit-data' });
        },
        bindPlainFieldEnterBlur() {
            calls.push('bind-plain-fields');
        }
    };
    const mobileController = {
        blurPickerOnReturn(payload) {
            calls.push(['blur-picker-return', !!payload]);
        }
    };
    const options = {
        document: doc,
        window: win,
        formController,
        mobileController,
        getModalMobileOptions: () => ({ from: 'modal-mobile' }),
        getEditingId: () => editingId,
        setEditingId: id => {
            editingId = id;
            calls.push(['editing', id]);
        },
        getExpenses: () => spese,
        categories: [{ id: 'ristorante' }],
        methods: [{ id: 'carta' }],
        setEditTags: tags => {
            editTags = tags;
            calls.push(['tags', tags.join('|')]);
        },
        getEditTags: () => editTags,
        initSearchableDropdown: (containerId, items, currentValue) => {
            calls.push(['dropdown', containerId, currentValue, items.length]);
        },
        initTagInput: () => calls.push('tag-input'),
        releaseFilterSearchBeforeModal: () => calls.push('release-filter-search'),
        isModalInteractionActive: () => interactionActive,
        setModalInteractionActive: value => {
            interactionActive = value;
            calls.push(['interaction', value]);
        },
        setModalInteractionReleaseSuspended: value => {
            suspended = value;
            calls.push(['suspend', value]);
        },
        getViewportHeight: () => 700,
        setLastViewportHeight: value => calls.push(['viewport', value]),
        startModalViewportWatch: () => calls.push('start-watch'),
        stopModalViewportWatch: () => calls.push('stop-watch'),
        pushModalHistoryState: () => calls.push('push-modal-history'),
        clearModalSelection: () => calls.push('clear-selection'),
        runHistoryAction: action => calls.push(['history', action]),
        getCloseHistoryAction: payload => ({ type: 'close-history', payload }),
        parseAmountInput: value => Number(value),
        getDropdownValue: (_id, fallback) => fallback,
        updateExpense: data => {
            calls.push(['update-expense', data.descrizione]);
            return updateResult;
        },
        deleteExpense: () => {
            calls.push(['delete-expense', editingId]);
            return deleteResult;
        },
        isFilterOpen: () => filterOpen,
        recalcSliderMax: () => calls.push('recalc-slider'),
        closeModal: fromPopstate => calls.push(['close-modal', fromPopstate]),
        saveEdit: () => calls.push('save-edit'),
        showConfirm: (_message, onYes) => {
            confirmCallback = onYes;
            calls.push('confirm');
        },
        closeConfirm: () => calls.push('close-confirm'),
        showToast: (message, type) => calls.push(['toast', type, message]),
        renderTimeline: () => calls.push('render-timeline'),
        getCurrentPage: () => currentPage,
        renderStats: () => calls.push('render-stats'),
        bindNonStickyNativePicker: el => calls.push(['bind-picker', el.id]),
        handleModalViewportChange: () => calls.push('viewport-change'),
        handlePopstate: () => calls.push('popstate'),
        toInputDate: () => '2026-05-20',
        toInputTime: () => '12:00',
        setTimeout: (callback, ms) => {
            timers.push({ callback, ms });
            return timers.length;
        }
    };

    assert.equal(ModalController.isOpen(options), false);

    ModalController.init(options);

    assert.equal(typeof elements['modal-close'].listeners.click, 'function');
    assert.equal(typeof elements['modal-overlay'].listeners.click, 'function');
    assert.equal(typeof elements['btn-save'].listeners.click, 'function');
    assert.equal(typeof elements['btn-delete'].listeners.click, 'function');
    assert.equal(typeof docListeners.keydown, 'function');
    assert.equal(typeof winListeners.resize, 'function');
    assert.equal(typeof winListeners['vv:resize'], 'function');
    assert(calls.includes('bind-picker-fields'));
    assert(calls.includes('bind-plain-fields'));

    let enterPrevented = false;
    editingId = 'expense-a';
    elements['modal-overlay'].classList.remove('hidden');
    docListeners.keydown({
        key: 'Enter',
        target: {
            tagName: 'TEXTAREA',
            closest(selector) {
                return selector === '#edit-modal' ? {} : null;
            }
        },
        preventDefault() {
            enterPrevented = true;
        }
    });

    assert.equal(enterPrevented, true);
    assert(calls.includes('save-edit'));

    elements['btn-delete'].listeners.click();
    assert.equal(typeof confirmCallback, 'function');
    confirmCallback();

    assert(calls.includes('confirm'));
    assert(calls.some(call => call[0] === 'delete-expense'));
    assert(calls.includes('recalc-slider'));
    assert(calls.some(call => call[0] === 'close-modal'));
    assert(calls.includes('render-timeline'));
    assert(calls.includes('render-stats'));

    assert.equal(ModalController.open(options, 'missing'), false);
    assert.equal(ModalController.open(options, 'expense-a'), true);
    assert.equal(editingId, 'expense-a');
    assert.deepEqual(editTags, ['lavoro']);
    assert.equal(ModalController.isOpen(options), true);
    assert(calls.some(call => call[0] === 'fill-form' && call[1] === 'expense-a'));
    assert(calls.includes('release-filter-search'));
    assert(calls.some(call => call[0] === 'dropdown' && call[1] === 'sd-categoria'));
    assert(calls.some(call => call[0] === 'dropdown' && call[1] === 'sd-metodo'));
    assert(calls.includes('tag-input'));
    assert(calls.includes('start-watch'));
    assert(calls.includes('push-modal-history'));

    assert.equal(ModalController.save(options), true);
    assert(calls.some(call => call[0] === 'read-form'));
    assert(calls.some(call => call[0] === 'update-expense' && call[1] === 'Pranzo corretto'));

    readResult = { success: false, error: 'Importo non valido' };
    assert.equal(ModalController.save(options), false);
    assert(calls.some(call => call[0] === 'toast' && call[2] === 'Importo non valido'));

    readResult = {
        success: true,
        data: { descrizione: 'Errore', importo: 1 }
    };
    updateResult = { success: false, error: 'Nope' };
    assert.equal(ModalController.save(options), false);
    assert(calls.some(call => call[0] === 'toast' && call[2] === 'Nope'));

    interactionActive = true;
    editingId = 'expense-a';
    ModalController.close(options, false);

    assert.equal(editingId, null);
    assert.equal(interactionActive, false);
    assert.equal(suspended, false);
    assert(calls.includes('clear-selection'));
    assert(calls.includes('stop-watch'));
    assert.equal(timers[timers.length - 1].ms, 280);
    assert(calls.some(call =>
        call[0] === 'history' &&
        call[1].payload.steps === 2 &&
        call[1].payload.fromPopstate === false
    ));

    timers[timers.length - 1].callback();
    assert(elements['modal-overlay'].classList.contains('hidden'));
});

test('Vista impostazioni renderizza info, guardrail e preview import escapata', () => {
    const { SettingsView } = loadUiViews();
    const spese = [
        expense({ id: 'a', data: '2026-05-10T10:00:00.000Z' }),
        expense({ id: 'b', data: '2026-05-12T10:00:00.000Z' })
    ];
    const page = SettingsView.renderPage({
        settings: { tema: 'auto' },
        spese,
        sizeKB: 12.34,
        storageStatus: { ok: false },
        appInfo: { version: 'v2026.05.30', label: 'Stabile' }
    });
    const preview = SettingsView.renderImportPreviewMessage({
        format: 'json',
        count: 2,
        settingsIncluded: true,
        warnings: ['<script>alert(1)</script>']
    }, true);

    assert(page.includes('btn-export-raw'));
    assert(page.includes('Spese registrate'));
    assert(page.includes('Versioni'));
    assert(page.includes('Puoi cambiare la versione installata quando vuoi.'));
    assert(page.includes('Scegli versione...'));
    assert(!page.includes('release-modal-list'));
    assert(page.includes("Where's My Money? v2026.05.30"));
    assert(page.includes('Stabile'));
    assert(page.includes('12.3 KB'));
    assert(preview.includes('2 spese valide con impostazioni'));
    assert(preview.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert(!preview.includes('<script>alert(1)</script>'));
});

test('Azioni impostazioni isolano formati, scelte e download', () => {
    const { SettingsActions } = loadUiViews();

    assert.equal(SettingsActions.detectImportFormat({ name: 'backup.JSON', type: '' }), 'json');
    assert.equal(SettingsActions.detectImportFormat({ name: 'spese.txt', type: 'text/csv' }), 'csv');
    assert.equal(SettingsActions.detectImportFormat({ name: 'spese.md', type: 'text/markdown' }), null);

    assert.deepEqual(
        SettingsActions.getExportChoices().map(choice => choice.format || 'cancel'),
        ['cancel', 'json', 'csv']
    );
    assert.deepEqual(
        SettingsActions.getImportChoices(true).map(choice => choice.mode || 'cancel'),
        ['cancel', 'append', 'replace']
    );
    assert.deepEqual(
        SettingsActions.getImportChoices(false).map(choice => choice.mode || 'cancel'),
        ['cancel', 'replace']
    );

    const csv = SettingsActions.getExportDownloadSpec('csv', 'a,b', '2026-05-19');
    const json = SettingsActions.getExportDownloadSpec('json', '{}', '2026-05-19');
    const raw = SettingsActions.getRawDownloadSpec('raw', '2026-05-19');

    assert.equal(csv.filename, 'spese_2026-05-19.csv');
    assert(csv.content.startsWith('\uFEFF'));
    assert.equal(json.filename, 'spese_backup_2026-05-19.json');
    assert.equal(json.mime, 'application/json');
    assert.equal(raw.filename, 'spese_raw_2026-05-19.txt');
    assert.equal(
        SettingsActions.getReleasesManifestUrl({ href: 'https://f-mangini.github.io/tracker-spese/stable/' }),
        'https://f-mangini.github.io/tracker-spese/releases.json'
    );
    assert.equal(
        SettingsActions.getReleasesManifestUrl({ href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }),
        'https://f-mangini.github.io/tracker-spese/releases.json'
    );
    assert.equal(
        SettingsActions.getCurrentReleaseId({ href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }),
        'v2026.05.30'
    );
    assert.deepEqual(
        SettingsActions.getAppInfo(
            { channel: 'stable' },
            { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }
        ),
        {
            channel: 'stable',
            releaseId: 'v2026.05.30',
            version: 'v2026.05.30',
            label: 'Stabile'
        }
    );
    assert.deepEqual(
        SettingsActions.getAppInfo(
            { channel: 'dev' },
            { href: 'https://f-mangini.github.io/tracker-spese/dev/' }
        ),
        {
            channel: 'dev',
            releaseId: '',
            version: 'dev',
            label: 'Sviluppo'
        }
    );
    const launchStorage = createLocalStorage();
    SettingsActions.setLaunchTarget('releases/v2026.05.30/', launchStorage);
    assert.equal(
        SettingsActions.getPreferredLaunchUrl({
            config: { channel: 'stable' },
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
            storageLike: launchStorage
        }),
        'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/'
    );
    assert.equal(
        SettingsActions.getPreferredLaunchUrl({
            config: { channel: 'stable' },
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
            storageLike: launchStorage
        }),
        ''
    );
    assert.equal(
        SettingsActions.getPreferredLaunchUrl({
            config: { channel: 'dev' },
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/dev/' },
            storageLike: launchStorage
        }),
        ''
    );
    SettingsActions.setLaunchTarget('', launchStorage);
    assert.equal(
        SettingsActions.getPreferredLaunchUrl({
            config: { channel: 'stable' },
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
            storageLike: launchStorage
        }),
        ''
    );

    const releaseModel = SettingsActions.normalizeReleaseManifest({
        recommended: 'v2026.05.30',
        releases: [
            {
                id: 'v2026.05.30',
                path: 'releases/v2026.05.30/',
                date: '2026-05-30',
                status: 'recommended',
                notes: '<b>ok</b>',
                schemaVersion: 1
            }
        ]
    }, {
        releasesUrl: 'https://f-mangini.github.io/tracker-spese/releases.json',
        currentReleaseId: 'v2026.05.30'
    });

    assert.equal(releaseModel.releases[0].id, 'stable/latest');
    assert.equal(releaseModel.releases[0].url, 'https://f-mangini.github.io/tracker-spese/stable/');
    assert.equal(releaseModel.releases[0].isCurrent, false);
    assert.equal(releaseModel.releases[1].url, 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/');
    assert.equal(releaseModel.releases[1].isRecommended, true);
    assert.equal(releaseModel.releases[1].isCurrent, true);
    assert.equal(
        SettingsActions.getImportSuccessMessage({ count: 3, regeneratedIds: 2 }, 'append'),
        '3 spese aggiunte, 2 id rigenerati ✓'
    );
});

test('Azioni impostazioni registrano il launcher offline solo su /stable/', async () => {
    const { SettingsActions } = loadUiViews();
    const registered = [];
    const navigatorLike = {
        serviceWorker: {
            ready: Promise.resolve(true),
            register(script, options) {
                registered.push([script, options]);
                return Promise.resolve({});
            }
        }
    };

    assert.equal(
        SettingsActions.shouldRegisterLaunchServiceWorker({
            href: 'https://f-mangini.github.io/tracker-spese/stable/'
        }),
        true
    );
    assert.equal(
        SettingsActions.shouldRegisterLaunchServiceWorker({
            href: 'https://f-mangini.github.io/tracker-spese/stable/index.html'
        }),
        true
    );
    assert.equal(
        SettingsActions.shouldRegisterLaunchServiceWorker({
            href: 'https://f-mangini.github.io/tracker-spese/'
        }),
        false
    );
    assert.equal(
        SettingsActions.shouldRegisterLaunchServiceWorker({
            href: 'https://f-mangini.github.io/tracker-spese/dev/'
        }),
        false
    );
    assert.equal(
        SettingsActions.shouldRegisterLaunchServiceWorker({
            href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/'
        }),
        false
    );

    assert.equal(
        await SettingsActions.registerLaunchServiceWorker({
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
            navigatorLike,
            setTimeout: callback => callback(),
            waitMs: 0
        }),
        true
    );
    assert.deepEqual(registered, [
        ['./stable-launch-service-worker.js', { scope: './' }]
    ]);

    assert.equal(
        await SettingsActions.registerLaunchServiceWorker({
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/dev/' },
            navigatorLike,
            setTimeout: callback => callback(),
            waitMs: 0
        }),
        false
    );
    assert.equal(registered.length, 1);
});

test('Azioni impostazioni orchestrano flussi storage con adapter', () => {
    const { SettingsActions } = loadUiViews();
    const calls = [];
    const storage = {
        previewImportJSON(content) {
            calls.push(['preview-json', content]);
            return { success: true, format: 'json', count: 1 };
        },
        previewImportCSV(content) {
            calls.push(['preview-csv', content]);
            return { success: true, format: 'csv', count: 2 };
        },
        exportJSON() {
            calls.push(['export-json']);
            return { success: true, content: '{"ok":true}' };
        },
        exportCSV() {
            calls.push(['export-csv']);
            return { success: true, content: 'a,b' };
        },
        exportRaw() {
            calls.push(['export-raw']);
            return { success: true, content: 'raw-data' };
        },
        updateSettings(updates) {
            calls.push(['update-settings', updates.tema]);
            return { success: true, impostazioni: { tema: updates.tema } };
        },
        clearAll(options) {
            calls.push(['clear-all', options || null]);
            return { success: true };
        },
        restoreSnapshot() {
            calls.push(['restore-snapshot']);
            return { success: true, count: 1, restoredRaw: false };
        },
        createSnapshot(reason) {
            calls.push(['snapshot', reason]);
            return { success: true };
        },
        importJSON(content, options) {
            calls.push(['import-json', content, options.mode]);
            return { success: true, count: 1, regeneratedIds: 0 };
        },
        importCSV(content, options) {
            calls.push(['import-csv', content, options.mode]);
            return { success: true, count: 2, regeneratedIds: 1 };
        }
    };

    assert.deepEqual(
        SettingsActions.previewImportFile({
            file: { name: 'backup.json' },
            content: '{}',
            storage
        }),
        { success: true, format: 'json', count: 1 }
    );
    assert.deepEqual(
        SettingsActions.previewImportFile({
            file: { name: 'spese.csv' },
            content: 'a,b',
            storage
        }),
        { success: true, format: 'csv', count: 2 }
    );
    assert.deepEqual(
        SettingsActions.previewImportFile({
            file: { name: 'spese.txt' },
            content: 'x',
            storage
        }),
        {
            success: false,
            error: 'Usa .json o .csv',
            code: 'unsupported-import-format'
        }
    );

    const jsonDownload = SettingsActions.buildExportDownload({
        format: 'json',
        storage,
        dateStamp: '2026-05-19'
    });
    const csvDownload = SettingsActions.buildExportDownload({
        format: 'csv',
        storage,
        dateStamp: '2026-05-19'
    });
    const rawDownload = SettingsActions.buildRawDownload({
        storage,
        dateStamp: '2026-05-19'
    });
    const importResult = SettingsActions.commitImport({
        preview: { format: 'csv' },
        content: 'a,b',
        mode: 'append',
        storage
    });
    const themeResult = SettingsActions.updateTheme({
        theme: 'dark',
        storage
    });
    const clearResult = SettingsActions.clearAll({ storage });
    const clearSnapshotResult = SettingsActions.clearAll({ storage, clearSnapshot: true });
    const restoreResult = SettingsActions.restoreSnapshot({ storage });
    const versionSnapshot = SettingsActions.createVersionChangeSnapshot({ storage });

    assert.equal(jsonDownload.download.filename, 'spese_backup_2026-05-19.json');
    assert.equal(csvDownload.download.filename, 'spese_2026-05-19.csv');
    assert.equal(rawDownload.download.filename, 'spese_raw_2026-05-19.txt');
    assert.equal(importResult.toast, '2 spese aggiunte, 1 id rigenerati \u2713');
    assert.equal(themeResult.theme, 'dark');
    assert.equal(clearResult.toast, 'Dati eliminati');
    assert.equal(clearSnapshotResult.toast, 'Dati e snapshot eliminati');
    assert.equal(restoreResult.toast, '1 spese ripristinate dallo snapshot \u2713');
    assert.equal(versionSnapshot.success, true);
    assert.deepEqual(calls, [
        ['preview-json', '{}'],
        ['preview-csv', 'a,b'],
        ['export-json'],
        ['export-csv'],
        ['export-raw'],
        ['import-csv', 'a,b', 'append'],
        ['update-settings', 'dark'],
        ['clear-all', { clearSnapshot: false }],
        ['clear-all', { clearSnapshot: true }],
        ['restore-snapshot'],
        ['snapshot', 'version-change']
    ]);
});

test('Controller impostazioni prepara modello e callback senza dipendere da App', () => {
    const { SettingsController } = loadUiViews();
    const calls = [];
    const spese = [
        expense({ id: 'old', data: '2026-05-10T10:00:00.000Z' }),
        expense({ id: 'new', data: '2026-05-12T10:00:00.000Z' })
    ];
    const storage = {
        getSettings() {
            return { tema: 'auto' };
        },
        getSpese() {
            return spese;
        },
        getStorageSizeKB() {
            return 4.2;
        },
        getStatus() {
            return { ok: true };
        },
        exportJSON() {
            calls.push(['export-json']);
            return { success: true, content: '{}' };
        },
        importCSV(content, options) {
            calls.push(['import-csv', content, options.mode]);
            return { success: true, count: 2, regeneratedIds: 0 };
        }
    };

    const model = SettingsController.getRenderModel(storage);
    assert.equal(model.settings.tema, 'auto');
    assert.equal(model.spese.length, 2);
    assert.equal(model.sizeKB, 4.2);
    assert.equal(model.appInfo.version, 'stable/latest');
    assert(/10\/0?5\/2026/.test(model.dateRange));
    assert(/12\/0?5\/2026/.test(model.dateRange));

    const cachedModel = SettingsController.getRenderModel({
        storage,
        getSpese: () => [expense({ id: 'cached', data: '2026-05-13T10:00:00.000Z' })]
    });
    assert.equal(cachedModel.spese[0].id, 'cached');
    assert(/13\/0?5\/2026/.test(cachedModel.dateRange));

    const exportChoices = SettingsController.createExportChoices({
        storage,
        dateStamp: () => '2026-05-19',
        download: (content, filename, mime) => calls.push(['download', filename, mime, content]),
        showToast: (message, type) => calls.push(['toast', type, message])
    });
    exportChoices.find(choice => choice.format === 'json').onClick();

    const importChoices = SettingsController.createImportChoices(
        { format: 'csv' },
        'a,b',
        true,
        {
            storage,
            refreshAfterDataChange: () => calls.push(['refresh-data']),
            showToast: (message, type) => calls.push(['toast', type, message])
        }
    );
    importChoices.find(choice => choice.mode === 'append').onClick();

    assert.deepEqual(calls, [
        ['export-json'],
        ['download', 'spese_backup_2026-05-19.json', 'application/json', '{}'],
        ['toast', 'info', 'Download JSON avviato...'],
        ['import-csv', 'a,b', 'append'],
        ['refresh-data'],
        ['toast', 'success', '2 spese aggiunte \u2713']
    ]);
});

test('Controller impostazioni carica releases.json e renderizza la lista versioni', async () => {
    const { SettingsController } = loadUiViews();
    const releaseList = { innerHTML: '' };
    const calls = [];
    const container = {
        querySelector(selector) {
            return selector === '#release-modal-list' ? releaseList : null;
        }
    };

    await SettingsController.loadReleases(container, {
        locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
        fetchFn(url, options) {
            calls.push([url, options.cache]);

            return Promise.resolve({
                ok: true,
                json() {
                    return Promise.resolve({
                        recommended: 'v2026.05.30',
                        releases: [
                            {
                                id: 'v2026.05.30',
                                path: 'releases/v2026.05.30/',
                                date: '2026-05-30',
                                status: 'recommended',
                                notes: 'Baseline <b>PWA</b>',
                                schemaVersion: 1
                            }
                        ]
                    });
                }
            });
        }
    });

    assert.deepEqual(calls, [
        ['https://f-mangini.github.io/tracker-spese/releases.json', 'no-store']
    ]);
    assert(releaseList.innerHTML.includes('v2026.05.30'));
    assert(releaseList.innerHTML.includes('stable/latest'));
    assert(releaseList.innerHTML.includes('Canale'));
    assert(releaseList.innerHTML.includes('Installata'));
    assert(releaseList.innerHTML.includes('Consigliata'));
    assert(releaseList.innerHTML.includes('Installa'));
    assert(releaseList.innerHTML.includes('https://f-mangini.github.io/tracker-spese/stable/'));
    assert(!releaseList.innerHTML.includes('href="https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/"'));
    assert(releaseList.innerHTML.includes('Baseline &lt;b&gt;PWA&lt;/b&gt;'));
    assert(!releaseList.innerHTML.includes('Baseline <b>PWA</b>'));
});

test('Controller impostazioni collega finestra versioni a history e back button', () => {
    const { SettingsController } = loadUiViews();
    const classes = new Set(['hidden']);
    const calls = [];
    const modal = {
        classList: {
            contains: cls => classes.has(cls),
            add: cls => classes.add(cls),
            remove: cls => classes.delete(cls)
        }
    };
    const options = {
        document: {
            getElementById(id) {
                return id === 'release-modal-overlay' ? modal : null;
            }
        },
        pushUiState: state => calls.push(['push', state]),
        consumeUiState: () => calls.push(['consume'])
    };

    SettingsController.openReleaseModal(options);
    assert.equal(SettingsController.isReleaseModalOpen(options), true);
    assert.deepEqual(calls, [['push', { panel: 'release-modal' }]]);

    SettingsController.openReleaseModal(options);
    assert.deepEqual(calls, [['push', { panel: 'release-modal' }]]);

    SettingsController.closeReleaseModal(options);
    assert.equal(SettingsController.isReleaseModalOpen(options), false);
    assert.deepEqual(calls, [
        ['push', { panel: 'release-modal' }],
        ['consume']
    ]);

    SettingsController.openReleaseModal(options);
    SettingsController.closeReleaseModal(options, true);
    assert.equal(SettingsController.isReleaseModalOpen(options), false);
    assert.deepEqual(calls, [
        ['push', { panel: 'release-modal' }],
        ['consume'],
        ['push', { panel: 'release-modal' }]
    ]);
});

test('Controller impostazioni crea snapshot prima del cambio versione', () => {
    const { SettingsController } = loadUiViews();
    const calls = [];
    const launchStorage = createLocalStorage();
    let clickHandler = null;
    const modal = {
        dataset: {},
        querySelector() {
            return null;
        },
        addEventListener(event, handler) {
            if (event === 'click') clickHandler = handler;
        }
    };
    const storage = {
        createSnapshot(reason) {
            calls.push(['snapshot', reason]);
            return { success: true };
        }
    };
    const link = {
        dataset: { launchPath: 'releases/v2026.05.30/' },
        closest(selector) {
            return selector === '.release-install-link' ? link : null;
        }
    };

    SettingsController.bindReleaseModal({
        document: {
            getElementById(id) {
                return id === 'release-modal-overlay' ? modal : null;
            }
        },
        storage,
        localStorage: launchStorage,
        showToast: (message, type) => calls.push(['toast', type, message])
    });

    clickHandler({ target: link });

    assert.deepEqual(calls, [['snapshot', 'version-change']]);
    assert.equal(launchStorage.getItem('spesa-tracker-launch-target'), 'releases/v2026.05.30/');
});

test('Controller impostazioni blocca cambio versione se lo snapshot fallisce', () => {
    const { SettingsController } = loadUiViews();
    const calls = [];
    const launchStorage = createLocalStorage();
    let clickHandler = null;
    let prevented = false;
    const modal = {
        dataset: {},
        querySelector() {
            return null;
        },
        addEventListener(event, handler) {
            if (event === 'click') clickHandler = handler;
        }
    };
    const link = {
        dataset: { launchPath: 'releases/v2026.05.30/' },
        closest(selector) {
            return selector === '.release-install-link' ? link : null;
        }
    };

    SettingsController.bindReleaseModal({
        document: {
            getElementById(id) {
                return id === 'release-modal-overlay' ? modal : null;
            }
        },
        storage: {
            createSnapshot(reason) {
                calls.push(['snapshot', reason]);
                return { success: false, error: 'Snapshot fallito' };
            }
        },
        localStorage: launchStorage,
        showToast: (message, type) => calls.push(['toast', type, message])
    });

    clickHandler({
        target: link,
        preventDefault: () => { prevented = true; }
    });

    assert.equal(prevented, true);
    assert.equal(launchStorage.getItem('spesa-tracker-launch-target'), null);
    assert.deepEqual(calls, [
        ['snapshot', 'version-change'],
        ['toast', 'error', 'Snapshot fallito']
    ]);
});

test('Dialog conferma prepara scelte e rileva apertura senza dipendere da App', () => {
    const { ConfirmDialog } = loadUiViews();
    const yes = () => {};
    const choices = ConfirmDialog.getConfirmChoices(yes, 'Conferma', 'No', 'btn-warning');
    const hiddenDoc = {
        getElementById() {
            return {
                classList: {
                    contains: cls => cls === 'hidden'
                }
            };
        }
    };
    const openDoc = {
        getElementById() {
            return {
                classList: {
                    contains: () => false
                }
            };
        }
    };

    assert.deepEqual(
        choices.map(choice => [choice.text, choice.className]),
        [
            ['No', 'btn-secondary'],
            ['Conferma', 'btn-warning']
        ]
    );
    assert.equal(choices[1].onClick, yes);
    assert.equal(ConfirmDialog.isOpen(hiddenDoc), false);
    assert.equal(ConfirmDialog.isOpen(openDoc), true);
});

test('Controller conferma collega dialog e history senza dipendere da App', () => {
    const { ConfirmController, UIStack } = loadUiViews();
    const calls = [];
    let closeFromDialog = null;
    const fakeDocument = {};
    const dialog = {
        isOpen(doc) {
            calls.push(['is-open', doc === fakeDocument]);
            return true;
        },
        showChoices(options) {
            calls.push(['show-choices', options.document === fakeDocument, options.message, options.choices.length]);
            options.pushState({ panel: 'confirm' });
            closeFromDialog = options.close;
        },
        showConfirm(options) {
            calls.push(['show-confirm', options.message, options.yesText, options.noText, options.yesClass]);
            options.pushState({ panel: 'confirm' });
            closeFromDialog = options.close;
        },
        close(options) {
            calls.push(['close-dialog', options.document === fakeDocument, options.fromPopstate]);
            options.closeHistory(options.fromPopstate);
        }
    };
    const baseOptions = {
        document: fakeDocument,
        dialog,
        stack: UIStack,
        pushUiState: state => calls.push(['push', state]),
        runHistoryAction: action => calls.push(['history', action.type, action.delta, action.suppressPopstate])
    };

    assert.equal(ConfirmController.isOpen(baseOptions), true);
    assert.equal(ConfirmController.showChoices({
        ...baseOptions,
        message: 'Scegli formato',
        choices: [{ text: 'JSON' }, { text: 'CSV' }]
    }), true);
    closeFromDialog(false);

    assert.equal(ConfirmController.showConfirm({
        ...baseOptions,
        message: 'Eliminare?',
        yesText: 'Si',
        noText: 'No',
        yesClass: 'btn-danger'
    }), true);
    ConfirmController.close({
        ...baseOptions,
        fromPopstate: true
    });

    assert.deepEqual(calls, [
        ['is-open', true],
        ['show-choices', true, 'Scegli formato', 2],
        ['push', { panel: 'confirm' }],
        ['close-dialog', true, false],
        ['history', UIStack.HISTORY_ACTIONS.BACK, -1, true],
        ['show-confirm', 'Eliminare?', 'Si', 'No', 'btn-danger'],
        ['push', { panel: 'confirm' }],
        ['close-dialog', true, true],
        ['history', UIStack.HISTORY_ACTIONS.NONE, 0, false]
    ]);
});

test('Stato app iniziale resta isolato e ricreabile fuori da app.js', () => {
    const { AppState } = loadUiViews();

    const first = AppState.create();
    const second = AppState.create();

    first.currentPage = 'stats';
    first.filters.query = 'caffe';
    first.filters.categories.add('bar');
    first.pageScrollTop.timeline = 120;
    first.timelineSelectionActive = true;
    first.timelineSelectedIds.add('expense-a');
    first.timelineSelectionDeletePending = true;
    first._sdInstances.test = {};
    first._editTags.push('lavoro');

    assert.equal(second.currentPage, 'timeline');
    assert.equal(second.filters.query, '');
    assert.equal(second.filters.categories.size, 0);
    assert.equal(second.pageScrollTop.timeline, 0);
    assert.deepEqual(second._sdInstances, {});
    assert.deepEqual(second._editTags, []);
    assert.equal(second.statsPeriod, 'month');
    assert.equal(second.filters.amountMax, Infinity);
    assert.equal(second._releasedFilterSearchHistory, false);
    assert.equal(second.timelineSelectionActive, false);
    assert.equal(second.timelineSelectedIds.size, 0);
    assert.equal(second.timelineSelectionDeletePending, false);
});

test('Wiring modale centralizza opzioni mobile, dropdown e tag fuori da app-wiring', () => {
    const { AppWiringModal } = loadUiViews();
    const calls = [];
    const app = {
        filterOpen: false,
        currentPage: 'timeline',
        _lastViewportHeight: 0,
        _keyboardWatchTimer: null,
        _modalInteractionActive: false,
        _suspendInteractionRelease: false,
        editingId: null,
        _editTags: [],
        _sdInstances: {},
        refreshExpenseViews: options => calls.push(['refresh', options]),
        showToast: (message, type) => calls.push(['toast', type, message]),
        handlePopstate: () => calls.push('popstate')
    };
    const deps = {
        document: {},
        window: {},
        ModalFormController: {},
        ModalController: {
            isOpen: () => true,
            close: (options, fromPopstate) => calls.push(['modal-close', fromPopstate]),
            save: () => calls.push('modal-save')
        },
        ModalMobileController: {
            clearSelection: () => calls.push('clear-selection'),
            getViewportHeight: () => 700,
            startViewportWatch: () => calls.push('start-viewport'),
            stopViewportWatch: () => calls.push('stop-viewport'),
            pushHistoryState: () => calls.push('push-modal-history'),
            bindNonStickyNativePicker: () => calls.push('bind-picker'),
            handleViewportChange: () => calls.push('viewport-change'),
            ensureInteractionState: () => calls.push('ensure-interaction'),
            releaseInteractionState: () => calls.push('release-interaction'),
            getOpenDropdown: () => null
        },
        ExpenseStore: { getSpese: () => [] },
        CATEGORIES: [{ id: 'bar', nome: 'Bar' }],
        PAYMENT_METHODS: [{ id: 'carta', nome: 'Carta' }],
        ExpenseActions: {
            updateExpense: payload => {
                calls.push(['update', payload.id]);
                return { success: true };
            },
            deleteExpense: payload => {
                calls.push(['delete', payload.id]);
                return { success: true };
            }
        },
        Storage: {},
        UIStack: {
            getCloseHistoryAction: payload => ({ type: 'close', payload })
        },
        AppUI: {
            parseAmountInput: value => Number(value),
            toInputDate: value => value,
            toInputTime: value => value
        },
        ConfirmController: {
            showConfirm: options => calls.push(['confirm', options.message, options.base]),
            close: options => calls.push(['confirm-close', options.base])
        },
        ModalInteractions: {
            createSearchableDropdown(options) {
                calls.push(['dropdown', options.containerId, options.currentValue]);
                return { getValue: () => options.currentValue };
            },
            createTagInput(options) {
                calls.push(['tag-input', options.containerId]);
                options.setTags(['lavoro']);
            }
        },
        ModalView: {
            getAllTags: () => ['lavoro'],
            getTagStats: () => ({})
        },
        setTimeout: callback => {
            callback();
            return 1;
        },
        setInterval: () => 2,
        clearInterval: id => calls.push(['clear-interval', id])
    };
    const core = {
        pushUiState: state => calls.push(['push', state]),
        consumeUiState: () => calls.push('consume'),
        runHistoryAction: action => calls.push(['history', action]),
        confirmOptions: () => ({ base: true })
    };
    const wiring = AppWiringModal.create({ app, deps, core });
    const mobileOptions = wiring.modalMobileOptions();
    const modalOptions = wiring.modalOptions();

    mobileOptions.setLastViewportHeight(640);
    mobileOptions.pushUiState({ panel: 'modal' });
    mobileOptions.consumeUiState();

    modalOptions.setEditingId('expense-a');
    modalOptions.setEditTags(['casa']);
    modalOptions.initSearchableDropdown('sd-categoria', deps.CATEGORIES, 'bar');
    modalOptions.initTagInput();
    modalOptions.showConfirm('Confermi?', () => {});

    assert.equal(app._lastViewportHeight, 640);
    assert.equal(app.editingId, 'expense-a');
    assert.deepEqual(app._editTags, ['lavoro']);
    assert.equal(modalOptions.getDropdownValue('sd-categoria', 'altro'), 'bar');
    assert.deepEqual(calls, [
        ['push', { panel: 'modal' }],
        'consume',
        ['dropdown', 'sd-categoria', 'bar'],
        ['tag-input', 'sd-tags'],
        ['confirm', 'Confermi?', true]
    ]);
});

test('Wiring app richiama timer e frame browser con binding window corretto', () => {
    const calls = [];
    const fakeWindow = {
        requestAnimationFrame(callback) {
            assert.equal(this, fakeWindow);
            calls.push('raf');
            callback();
            return 11;
        },
        cancelAnimationFrame(id) {
            assert.equal(this, fakeWindow);
            calls.push(['cancel', id]);
        },
        setTimeout(callback, delay) {
            assert.equal(this, fakeWindow);
            calls.push(['timeout', delay]);
            callback();
            return 22;
        },
        setInterval(callback, delay) {
            assert.equal(this, fakeWindow);
            calls.push(['interval', delay]);
            callback();
            return 33;
        },
        clearInterval(id) {
            assert.equal(this, fakeWindow);
            calls.push(['clear-interval', id]);
        }
    };
    const fakeDocument = { body: {} };
    const { AppWiring } = loadUiViews({
        window: fakeWindow,
        document: fakeDocument,
        history: {}
    });
    const app = {
        ...loadUiViews().AppState.create(),
        renderTimeline: () => {},
        renderStats: () => {},
        renderSettings: () => {},
        showToast: () => {},
        submitExpense: () => {},
        refreshExpenseViews: () => {}
    };
    const wiring = AppWiring.create(app);

    wiring.filterOptions().requestAnimationFrame(() => calls.push('filter-callback'));
    wiring.navigationOptions().defer(() => calls.push('defer-callback'));
    wiring.inputBarOptions().cancelAnimationFrame(11);
    wiring.modalMobileOptions().setInterval(() => calls.push('interval-callback'), 120);
    wiring.modalMobileOptions().clearInterval(33);
    wiring.modalOptions().setTimeout(() => calls.push('modal-timeout-callback'), 280);

    assert.deepEqual(calls, [
        'raf',
        'filter-callback',
        ['timeout', 0],
        'defer-callback',
        ['cancel', 11],
        ['interval', 120],
        'interval-callback',
        ['clear-interval', 33],
        ['timeout', 280],
        'modal-timeout-callback'
    ]);
});

test('Wiring app centralizza history e opzioni controller fuori da app.js', () => {
    const { AppWiring, UIStack } = loadUiViews();
    const calls = [];
    const historyActions = [];
    const fakeDocument = { body: {} };
    const app = {
        currentPage: 'timeline',
        pageScrollTop: { timeline: 0, stats: 0, settings: 0 },
        _restoringPageScroll: false,
        filterOpen: false,
        filters: {
            query: '',
            categories: new Set(),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: ''
        },
        sliderMax: 100,
        _lastSliderInput: 'max',
        advancedFiltersOpen: false,
        _filterSearchActive: false,
        _modalInteractionActive: false,
        _suppressNextPopstate: false,
        _suspendInteractionRelease: false,
        _keyboardWatchTimer: null,
        _expenseInputActive: false,
        _lastViewportHeight: 0,
        _expenseInputBarRaf: null,
        _expenseInputResizeHandler: null,
        _sdInstances: {},
        _editTags: [],
        editingId: 'expense-a',
        newCardId: null,
        renderTimeline: () => calls.push('timeline'),
        renderStats: () => calls.push('stats'),
        renderSettings: () => calls.push('settings'),
        showToast: (message, type) => calls.push(['toast', type, message]),
        submitExpense: () => calls.push('submit'),
        refreshExpenseViews: options => calls.push(['refresh', options])
    };
    const wiring = AppWiring.create(app, {
        document: fakeDocument,
        window: {},
        history: {},
        HistoryController: {
            run(action, options) {
                historyActions.push(action);
                if (action && action.suppressPopstate) {
                    options.setSuppressPopstate(true);
                }
                return true;
            }
        },
        FilterController: {
            closeFilterPanel: () => calls.push('close-filter'),
            recalcSliderMax: () => calls.push('recalc-slider'),
            updateFilterBadge: payload => calls.push(['filter-badge', !!payload.filterModel])
        },
        InputBarController: {
            updateAppMainPadding: () => calls.push('padding'),
            startWatch: () => calls.push('start-watch'),
            stopWatch: () => calls.push('stop-watch')
        },
        ExpenseStore: {
            getSpese: () => [],
            invalidate: () => calls.push('invalidate')
        }
    });

    wiring.navigationOptions().setCurrentPage('stats');
    wiring.runHistoryAction(UIStack.getCloseHistoryAction({ wasOpen: true }));
    wiring.pushUiState({ panel: 'confirm' });
    wiring.confirmOptions().runHistoryAction(UIStack.getCloseHistoryAction({ wasOpen: true }));

    const refreshOptions = wiring.refreshOptions({ updateFilterSlider: true, includeSettings: true });
    refreshOptions.invalidateSpeseCache();
    refreshOptions.recalcSliderMax();
    refreshOptions.updateFilterBadge();
    refreshOptions.renderSettings();

    assert.equal(app.currentPage, 'stats');
    assert.equal(app._suppressNextPopstate, true);
    assert.deepEqual(
        historyActions.map(action => action.type),
        [
            UIStack.HISTORY_ACTIONS.BACK,
            UIStack.HISTORY_ACTIONS.PUSH,
            UIStack.HISTORY_ACTIONS.BACK
        ]
    );
    assert.deepEqual(calls, [
        'invalidate',
        'recalc-slider',
        ['filter-badge', true],
        'settings'
    ]);
});

test('Controller tema mantiene separati tema persistente e toggle temporaneo', () => {
    const { ThemeController } = loadUiViews();
    const attrs = {};
    const listeners = {};
    const doc = {
        documentElement: {
            setAttribute(name, value) {
                attrs[name] = value;
            },
            getAttribute(name) {
                return attrs[name];
            }
        },
        getElementById(id) {
            if (id !== 'theme-toggle') return null;
            return {
                addEventListener(event, handler) {
                    listeners[event] = handler;
                }
            };
        }
    };
    const win = {
        matchMedia: () => ({ matches: true })
    };
    const storage = {
        getSettings() {
            return { tema: 'auto' };
        }
    };
    const temporaryThemes = [];

    assert.equal(ThemeController.getSystemTheme(win), 'dark');

    ThemeController.init({
        storage,
        document: doc,
        window: win,
        onTemporaryThemeChange: theme => temporaryThemes.push(theme)
    });

    assert.equal(attrs['data-theme'], 'dark');
    listeners.click();
    assert.equal(attrs['data-theme'], 'light');
    assert.deepEqual(temporaryThemes, ['light']);

    ThemeController.applyTheme('dark', { document: doc, window: win });
    assert.equal(attrs['data-theme'], 'dark');
});

test('Controller toast posiziona notifica e resetta timer', () => {
    const { ToastController } = loadUiViews();
    const addedClasses = [];
    const clearedTimers = [];
    const callbacks = [];
    let nextTimerId = 0;

    const toast = {
        textContent: '',
        className: 'toast hidden',
        style: {},
        classList: {
            add(cls) {
                addedClasses.push(cls);
                toast.className += ' ' + cls;
            }
        }
    };
    const inputBar = {
        getBoundingClientRect() {
            return { top: 600 };
        }
    };
    const doc = {
        getElementById(id) {
            if (id === 'toast') return toast;
            if (id === 'input-bar') return inputBar;
            return null;
        }
    };
    const timers = {
        setTimeout(callback) {
            callbacks.push(callback);
            nextTimerId += 1;
            return nextTimerId;
        },
        clearTimeout(id) {
            clearedTimers.push(id);
        }
    };

    ToastController.show('Salvato', 'success', {
        document: doc,
        window: { innerHeight: 700 },
        expenseInputActive: true,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
        duration: 10
    });

    assert.equal(toast.textContent, 'Salvato');
    assert.equal(toast.className, 'toast success');
    assert.equal(toast.style.bottom, '108px');
    assert.equal(toast.style.top, 'auto');

    ToastController.show('Normale', 'info', {
        document: doc,
        window: { innerHeight: 700 },
        expenseInputActive: false,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
        duration: 10
    });

    assert.deepEqual(clearedTimers, [1]);
    assert.equal(toast.textContent, 'Normale');
    assert.equal(toast.className, 'toast info');
    assert.equal(toast.style.bottom, '');
    assert.equal(toast.style.top, '');

    callbacks[1]();

    assert.deepEqual(addedClasses, ['hidden']);
    assert.equal(toast.className, 'toast info hidden');
    assert.equal(toast.style.bottom, '');
    assert.equal(toast.style.top, '');

    ToastController.clear({ clearTimeout: timers.clearTimeout });
});

test('UI stack mantiene esplicito ordine di chiusura del back button', () => {
    const { UIStack } = loadUiViews();

    assert.equal(
        UIStack.getPopstateAction({ suppressNextPopstate: true, confirmOpen: true }),
        UIStack.ACTIONS.IGNORE
    );
    assert.equal(
        UIStack.getPopstateAction({ confirmOpen: true, modalOpen: true }),
        UIStack.ACTIONS.CLOSE_CONFIRM
    );
    assert.equal(
        UIStack.getPopstateAction({ releaseModalOpen: true, modalOpen: true }),
        UIStack.ACTIONS.CLOSE_RELEASE_MODAL
    );
    assert.equal(
        UIStack.getPopstateAction({ modalOpen: true, filterOpen: true }),
        UIStack.ACTIONS.HANDLE_MODAL
    );
    assert.equal(
        UIStack.getPopstateAction({ filterSearchActive: true, filterOpen: true }),
        UIStack.ACTIONS.CLOSE_FILTER_SEARCH
    );
    assert.equal(
        UIStack.getPopstateAction({ expenseInputActive: true, filterOpen: true }),
        UIStack.ACTIONS.CLOSE_EXPENSE_INPUT
    );
    assert.equal(
        UIStack.getPopstateAction({ advancedFiltersOpen: true, filterOpen: true }),
        UIStack.ACTIONS.CLOSE_ADVANCED_FILTERS
    );
    assert.equal(
        UIStack.getPopstateAction({ filterOpen: true }),
        UIStack.ACTIONS.CLOSE_FILTER
    );
    assert.equal(
        UIStack.getPopstateAction({ filterOpen: true, timelineSelectionActive: true }),
        UIStack.ACTIONS.CLOSE_FILTER
    );
    assert.equal(
        UIStack.getPopstateAction({ timelineSelectionActive: true, currentPage: 'timeline' }),
        UIStack.ACTIONS.CLOSE_TIMELINE_SELECTION
    );
    assert.equal(
        UIStack.getPopstateAction({ currentPage: 'stats' }),
        UIStack.ACTIONS.NAVIGATE_TIMELINE
    );
    assert.equal(
        UIStack.getPopstateAction({ currentPage: 'timeline' }),
        UIStack.ACTIONS.NONE
    );
});

test('UI stack separa le azioni popstate interne alla modale', () => {
    const { UIStack } = loadUiViews();

    assert.equal(
        UIStack.getModalPopstateAction({ interactionActive: true, activeField: true }),
        UIStack.MODAL_ACTIONS.CLEAR_INTERACTION
    );
    assert.equal(
        UIStack.getModalPopstateAction({ dropdownOpen: true }),
        UIStack.MODAL_ACTIONS.CLEAR_INTERACTION
    );
    assert.equal(
        UIStack.getModalPopstateAction({ activeField: true }),
        UIStack.MODAL_ACTIONS.CLEAR_FIELD
    );
    assert.equal(
        UIStack.getModalPopstateAction({}),
        UIStack.MODAL_ACTIONS.CLOSE_MODAL
    );
});

test('UI stack descrive push/back simmetrici senza toccare history', () => {
    const { UIStack } = loadUiViews();

    const pushStats = UIStack.getNavigationHistoryAction({
        currentPage: 'timeline',
        nextPage: 'stats'
    });
    const replaceSettings = UIStack.getNavigationHistoryAction({
        currentPage: 'stats',
        nextPage: 'settings'
    });
    const backTimeline = UIStack.getNavigationHistoryAction({
        currentPage: 'settings',
        nextPage: 'timeline'
    });
    const closeNested = UIStack.getCloseHistoryAction({
        wasOpen: true,
        steps: 2
    });

    assert.equal(pushStats.type, UIStack.HISTORY_ACTIONS.PUSH);
    assert.deepEqual(pushStats.state, { page: 'stats' });
    assert.equal(replaceSettings.type, UIStack.HISTORY_ACTIONS.REPLACE);
    assert.deepEqual(replaceSettings.state, { page: 'settings' });
    assert.equal(backTimeline.type, UIStack.HISTORY_ACTIONS.BACK);
    assert.equal(backTimeline.suppressPopstate, true);
    assert.equal(closeNested.type, UIStack.HISTORY_ACTIONS.GO);
    assert.equal(closeNested.delta, -2);
    assert.equal(closeNested.suppressPopstate, true);
    assert.equal(
        UIStack.getCloseHistoryAction({ fromPopstate: true, wasOpen: true }).type,
        UIStack.HISTORY_ACTIONS.NONE
    );
});

test('History controller esegue azioni history e fallback senza App', () => {
    const { HistoryController, UIStack } = loadUiViews();
    const calls = [];
    let suppress = false;
    const historyTarget = {
        pushState(state, title) {
            calls.push(['push', state, title]);
        },
        replaceState(state, title) {
            calls.push(['replace', state, title]);
        },
        back() {
            calls.push(['back']);
        },
        go(delta) {
            calls.push(['go', delta]);
        }
    };
    const options = {
        stack: UIStack,
        history: historyTarget,
        setSuppressPopstate: value => { suppress = value; }
    };

    assert.equal(HistoryController.run(null, options), false);
    assert.equal(HistoryController.run({ type: UIStack.HISTORY_ACTIONS.NONE }, options), false);
    assert.equal(HistoryController.run({
        type: UIStack.HISTORY_ACTIONS.PUSH,
        state: { page: 'stats' },
        suppressPopstate: true
    }, options), true);
    assert.equal(suppress, true);
    assert.equal(HistoryController.run({
        type: UIStack.HISTORY_ACTIONS.REPLACE,
        state: { page: 'settings' }
    }, options), true);
    assert.equal(HistoryController.run({ type: UIStack.HISTORY_ACTIONS.BACK }, options), true);
    assert.equal(HistoryController.run({ type: UIStack.HISTORY_ACTIONS.GO, delta: -2 }, options), true);

    assert.deepEqual(calls, [
        ['push', { page: 'stats' }, ''],
        ['replace', { page: 'settings' }, ''],
        ['back'],
        ['go', -2]
    ]);

    const fallbackCalls = [];
    const fallbackHistory = {
        go() {
            fallbackCalls.push('go');
            throw new Error('go failed');
        },
        back() {
            fallbackCalls.push('back');
        }
    };

    assert.equal(HistoryController.run(
        { type: UIStack.HISTORY_ACTIONS.GO },
        { stack: UIStack, history: fallbackHistory }
    ), true);
    assert.deepEqual(fallbackCalls, ['go', 'back']);
});

test('UI stack effects isolano cleanup DOM usati dal popstate', () => {
    const { UIStackEffects } = loadUiViews();
    const blurred = [];
    const removedClasses = [];
    const elements = {
        'search-input': { blur: () => blurred.push('search-input') },
        'expense-input': { blur: () => blurred.push('expense-input') }
    };
    const doc = {
        body: {
            classList: {
                remove: cls => removedClasses.push(cls)
            }
        },
        getElementById: id => elements[id] || null
    };

    UIStackEffects.closeFilterSearch(doc);
    UIStackEffects.closeExpenseInput(doc);

    assert.deepEqual(blurred, ['search-input', 'expense-input']);
    assert.deepEqual(removedClasses, ['expense-input-active']);

    const modalCalls = [];
    const deferred = [];
    UIStackEffects.clearModalInteraction({
        clearSelection: () => modalCalls.push('clear'),
        setInteractionActive: value => modalCalls.push(['active', value]),
        setInteractionReleaseSuspended: value => modalCalls.push(['suspend', value]),
        defer: callback => deferred.push(callback)
    });

    assert.deepEqual(modalCalls, [
        ['suspend', true],
        'clear',
        ['active', false]
    ]);
    assert.equal(deferred.length, 1);

    deferred[0]();
    assert.deepEqual(modalCalls, [
        ['suspend', true],
        'clear',
        ['active', false],
        ['suspend', false]
    ]);

    const fieldCalls = [];
    UIStackEffects.clearModalField({
        clearSelection: () => fieldCalls.push('clear'),
        pushModalHistoryState: () => fieldCalls.push('push-history')
    });

    assert.deepEqual(fieldCalls, ['clear', 'push-history']);
});

test('UI stack controller applica popstate e modale tramite hook App sottili', () => {
    const { UIStack, UIStackController } = loadUiViews();
    const calls = [];
    const effects = {
        closeFilterSearch(doc) {
            calls.push(['effect-filter-search', doc.name]);
        },
        closeExpenseInput(doc) {
            calls.push(['effect-expense-input', doc.name]);
        },
        clearModalInteraction(options = {}) {
            calls.push('effect-clear-interaction');
            options.setInteractionReleaseSuspended(true);
            options.clearSelection();
            options.setInteractionActive(false);
            options.defer(() => {
                options.setInteractionReleaseSuspended(false);
            });
        },
        clearModalField(options = {}) {
            calls.push('effect-clear-field');
            options.clearSelection();
            options.pushModalHistoryState();
        }
    };
    const state = {
        suppress: false,
        confirmOpen: false,
        releaseModalOpen: false,
        modalOpen: false,
        filterSearchActive: false,
        expenseInputActive: false,
        advancedFiltersOpen: false,
        filterOpen: false,
        timelineSelectionActive: false,
        currentPage: 'timeline',
        interactionActive: false,
        dropdownOpen: false,
        activeField: false
    };
    const options = {
        document: { name: 'doc' },
        stack: UIStack,
        effects,
        getSuppressNextPopstate: () => state.suppress,
        setSuppressNextPopstate: value => {
            state.suppress = value;
            calls.push(['suppress', value]);
        },
        isConfirmOpen: () => state.confirmOpen,
        closeConfirm: fromPopstate => calls.push(['close-confirm', fromPopstate]),
        isReleaseModalOpen: () => state.releaseModalOpen,
        closeReleaseModal: fromPopstate => calls.push(['close-release-modal', fromPopstate]),
        isModalOpen: () => state.modalOpen,
        closeModal: fromPopstate => calls.push(['close-modal', fromPopstate]),
        isFilterSearchActive: () => state.filterSearchActive,
        setFilterSearchActive: value => {
            state.filterSearchActive = value;
            calls.push(['filter-search', value]);
        },
        isExpenseInputActive: () => state.expenseInputActive,
        setExpenseInputActive: value => {
            state.expenseInputActive = value;
            calls.push(['expense-input', value]);
        },
        isAdvancedFiltersOpen: () => state.advancedFiltersOpen,
        closeAdvancedFilters: fromPopstate => calls.push(['close-advanced', fromPopstate]),
        isFilterOpen: () => state.filterOpen,
        closeFilterPanel: fromPopstate => calls.push(['close-filter', fromPopstate]),
        isTimelineSelectionActive: () => state.timelineSelectionActive,
        closeTimelineSelection: fromPopstate => {
            state.timelineSelectionActive = false;
            calls.push(['close-selection', fromPopstate]);
        },
        getCurrentPage: () => state.currentPage,
        navigateTo: (page, fromPopstate) => calls.push(['navigate', page, fromPopstate]),
        stopExpenseInputBarWatch: () => calls.push('stop-watch'),
        isModalInteractionActive: () => state.interactionActive,
        setModalInteractionActive: value => {
            state.interactionActive = value;
            calls.push(['interaction', value]);
        },
        setModalInteractionReleaseSuspended: value => calls.push(['suspend', value]),
        hasOpenModalDropdown: () => state.dropdownOpen,
        hasActivePlainModalField: () => state.activeField,
        clearModalSelection: () => calls.push('clear-selection'),
        pushModalHistoryState: () => calls.push('push-modal-history'),
        defer: callback => callback()
    };

    state.currentPage = 'stats';
    assert.equal(UIStackController.handlePopstate(options), UIStack.ACTIONS.NAVIGATE_TIMELINE);
    assert.deepEqual(calls.pop(), ['navigate', 'timeline', true]);

    state.currentPage = 'timeline';
    state.filterSearchActive = true;
    UIStackController.handlePopstate(options);
    assert.deepEqual(calls.slice(-2), [
        ['filter-search', false],
        ['effect-filter-search', 'doc']
    ]);

    state.filterSearchActive = false;
    state.expenseInputActive = true;
    UIStackController.handlePopstate(options);
    assert.deepEqual(calls.slice(-3), [
        ['expense-input', false],
        'stop-watch',
        ['effect-expense-input', 'doc']
    ]);

    state.expenseInputActive = false;
    state.timelineSelectionActive = true;
    assert.equal(
        UIStackController.handlePopstate(options),
        UIStack.ACTIONS.CLOSE_TIMELINE_SELECTION
    );
    assert.deepEqual(calls[calls.length - 1], ['close-selection', true]);

    state.suppress = true;
    UIStackController.handlePopstate(options);
    assert.deepEqual(calls[calls.length - 1], ['suppress', false]);

    state.suppress = false;
    state.releaseModalOpen = true;
    assert.equal(
        UIStackController.handlePopstate(options),
        UIStack.ACTIONS.CLOSE_RELEASE_MODAL
    );
    assert.deepEqual(calls[calls.length - 1], ['close-release-modal', true]);

    state.releaseModalOpen = false;
    state.modalOpen = true;
    state.interactionActive = true;
    assert.equal(
        UIStackController.handlePopstate(options),
        UIStack.ACTIONS.HANDLE_MODAL
    );
    assert.deepEqual(calls.slice(-5), [
        'effect-clear-interaction',
        ['suspend', true],
        'clear-selection',
        ['interaction', false],
        ['suspend', false]
    ]);

    state.interactionActive = false;
    state.activeField = true;
    UIStackController.handleModalPopstate(options);
    assert.deepEqual(calls.slice(-3), [
        'effect-clear-field',
        'clear-selection',
        'push-modal-history'
    ]);

    state.activeField = false;
    UIStackController.handleModalPopstate(options);
    assert.deepEqual(calls[calls.length - 1], ['close-modal', true]);
});

let failed = 0;

(async () => {
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`ok - ${name}`);
        } catch (error) {
            failed += 1;
            console.error(`not ok - ${name}`);
            console.error(error);
        }
    }

    if (failed > 0) {
        process.exitCode = 1;
    } else {
        console.log(`\n${tests.length} test superati.`);
    }
})();
