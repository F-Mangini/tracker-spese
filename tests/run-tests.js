const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

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
    const storageCode = fs.readFileSync(path.join(root, 'app/js/storage.js'), 'utf8');
    vm.runInContext(`${storageCode}\nglobalThis.Storage = Storage;`, context);

    return {
        Storage: context.Storage,
        localStorage: context.localStorage
    };
}

function loadParser() {
    const context = { console };
    vm.createContext(context);

    const categoriesCode = fs.readFileSync(path.join(root, 'app/js/categories.js'), 'utf8');
    const parserCode = fs.readFileSync(path.join(root, 'app/js/parser.js'), 'utf8');
    vm.runInContext(
        `${categoriesCode}\n${parserCode}\nglobalThis.Parser = Parser;`,
        context
    );

    return context.Parser;
}

function loadFilters() {
    const context = { console };
    vm.createContext(context);

    const filtersCode = fs.readFileSync(path.join(root, 'app/js/filters.js'), 'utf8');
    vm.runInContext(`${filtersCode}\nglobalThis.ExpenseFilters = ExpenseFilters;`, context);

    return context.ExpenseFilters;
}

function loadStats() {
    const context = { console };
    vm.createContext(context);

    const statsCode = fs.readFileSync(path.join(root, 'app/js/stats.js'), 'utf8');
    vm.runInContext(`${statsCode}\nglobalThis.StatsData = StatsData;`, context);

    return context.StatsData;
}

function loadUiViews() {
    const context = { console };
    vm.createContext(context);

    const statsCode = fs.readFileSync(path.join(root, 'app/js/stats.js'), 'utf8');
    const expenseActionsCode = fs.readFileSync(path.join(root, 'app/js/expense-actions.js'), 'utf8');
    const expenseInputControllerCode = fs.readFileSync(path.join(root, 'app/js/expense-input-controller.js'), 'utf8');
    const uiCode = fs.readFileSync(path.join(root, 'app/js/ui-utils.js'), 'utf8');
    const filterViewCode = fs.readFileSync(path.join(root, 'app/js/filter-view.js'), 'utf8');
    const filterControllerCode = fs.readFileSync(path.join(root, 'app/js/filter-controller.js'), 'utf8');
    const timelineViewCode = fs.readFileSync(path.join(root, 'app/js/timeline-view.js'), 'utf8');
    const timelineControllerCode = fs.readFileSync(path.join(root, 'app/js/timeline-controller.js'), 'utf8');
    const statsViewCode = fs.readFileSync(path.join(root, 'app/js/stats-view.js'), 'utf8');
    const statsChartsCode = fs.readFileSync(path.join(root, 'app/js/stats-charts.js'), 'utf8');
    const statsControllerCode = fs.readFileSync(path.join(root, 'app/js/stats-controller.js'), 'utf8');
    const modalViewCode = fs.readFileSync(path.join(root, 'app/js/modal-view.js'), 'utf8');
    const modalFormControllerCode = fs.readFileSync(path.join(root, 'app/js/modal-form-controller.js'), 'utf8');
    const modalInteractionsCode = fs.readFileSync(path.join(root, 'app/js/modal-interactions.js'), 'utf8');
    const settingsViewCode = fs.readFileSync(path.join(root, 'app/js/settings-view.js'), 'utf8');
    const settingsActionsCode = fs.readFileSync(path.join(root, 'app/js/settings-actions.js'), 'utf8');
    const settingsControllerCode = fs.readFileSync(path.join(root, 'app/js/settings-controller.js'), 'utf8');
    const uiStackCode = fs.readFileSync(path.join(root, 'app/js/ui-stack.js'), 'utf8');
    const uiStackEffectsCode = fs.readFileSync(path.join(root, 'app/js/ui-stack-effects.js'), 'utf8');
    const confirmDialogCode = fs.readFileSync(path.join(root, 'app/js/confirm-dialog.js'), 'utf8');
    const themeControllerCode = fs.readFileSync(path.join(root, 'app/js/theme-controller.js'), 'utf8');
    const toastControllerCode = fs.readFileSync(path.join(root, 'app/js/toast-controller.js'), 'utf8');

    vm.runInContext(
        [
            statsCode,
            expenseActionsCode,
            expenseInputControllerCode,
            uiCode,
            filterViewCode,
            filterControllerCode,
            timelineViewCode,
            timelineControllerCode,
            statsViewCode,
            statsChartsCode,
            statsControllerCode,
            modalViewCode,
            modalFormControllerCode,
            modalInteractionsCode,
            settingsViewCode,
            settingsActionsCode,
            settingsControllerCode,
            uiStackCode,
            uiStackEffectsCode,
            confirmDialogCode,
            themeControllerCode,
            toastControllerCode,
            'globalThis.AppUI = AppUI;',
            'globalThis.ExpenseActions = ExpenseActions;',
            'globalThis.ExpenseInputController = ExpenseInputController;',
            'globalThis.FilterView = FilterView;',
            'globalThis.FilterController = FilterController;',
            'globalThis.TimelineView = TimelineView;',
            'globalThis.TimelineController = TimelineController;',
            'globalThis.StatsView = StatsView;',
            'globalThis.StatsCharts = StatsCharts;',
            'globalThis.StatsController = StatsController;',
            'globalThis.ModalView = ModalView;',
            'globalThis.ModalFormController = ModalFormController;',
            'globalThis.ModalInteractions = ModalInteractions;',
            'globalThis.SettingsView = SettingsView;',
            'globalThis.SettingsActions = SettingsActions;',
            'globalThis.SettingsController = SettingsController;',
            'globalThis.UIStack = UIStack;',
            'globalThis.UIStackEffects = UIStackEffects;',
            'globalThis.ConfirmDialog = ConfirmDialog;',
            'globalThis.ThemeController = ThemeController;',
            'globalThis.ToastController = ToastController;'
        ].join('\n'),
        context
    );

    return {
        AppUI: context.AppUI,
        ExpenseActions: context.ExpenseActions,
        ExpenseInputController: context.ExpenseInputController,
        FilterView: context.FilterView,
        FilterController: context.FilterController,
        TimelineView: context.TimelineView,
        TimelineController: context.TimelineController,
        StatsView: context.StatsView,
        StatsCharts: context.StatsCharts,
        StatsController: context.StatsController,
        ModalView: context.ModalView,
        ModalFormController: context.ModalFormController,
        ModalInteractions: context.ModalInteractions,
        SettingsView: context.SettingsView,
        SettingsActions: context.SettingsActions,
        SettingsController: context.SettingsController,
        UIStack: context.UIStack,
        UIStackEffects: context.UIStackEffects,
        ConfirmDialog: context.ConfirmDialog,
        ThemeController: context.ThemeController,
        ToastController: context.ToastController
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
    assert.equal(saved.spese.length, 2);
    assert.equal(saved.spese[0].descrizione, 'Importata');
    assert.notEqual(saved.spese[0].id, 'same-id');
    assert.equal(saved.impostazioni.tema, 'dark');
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
    assert.equal(snapshot.data.spese[0].id, 'old-id');
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
        getLastSliderInput: () => state.lastSliderInput,
        setLastSliderInput: value => { state.lastSliderInput = value; },
        getSliderMaxValue: () => state.sliderMax,
        setSliderMaxValue: value => { state.sliderMax = value; },
        setLastViewportHeight: value => { state.lastViewportHeight = value; },
        getViewportHeight: () => 700,
        startExpenseInputBarWatch: () => calls.push('start-watch'),
        stopExpenseInputBarWatch: () => calls.push('stop-watch'),
        pushUiState: payload => calls.push(['push', payload.panel]),
        consumeUiState: () => calls.push('consume'),
        runHistoryAction: action => calls.push(['history', action]),
        getCloseHistoryAction: payload => ({ kind: 'close', ...payload }),
        updateAppMainPadding: () => calls.push('padding'),
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
    elements['search-input'].listeners.focus();
    assert.equal(state.filterOpen, true);
    assert.equal(state.filterSearchActive, true);
    assert.equal(state.lastViewportHeight, 700);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'push' && call[1] === 'filter-search'));

    elements['search-input'].listeners.blur();
    assert.equal(state.filterSearchActive, false);
    assert(calls.includes('stop-watch'));

    elements['slider-max'].value = '80';
    elements['slider-max'].listeners.input();
    assert.equal(state.lastSliderInput, 'max');
    assert.equal(filters.amountMax, 80);

    FilterController.openAdvancedFilters(options);
    assert.equal(state.advancedFiltersOpen, true);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'scroll-to'));

    FilterController.closeFilterPanel(options);
    assert.equal(state.filterOpen, false);
    assert.equal(state.advancedFiltersOpen, false);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'history' && call[1].steps === 2));

    FilterController.resetFilters(options);
    assert.equal(filters.query, '');
    assert.equal(filters.categories.size, 0);
    assert.equal(filters.amountMax, Infinity);
    assert(calls.some(call => Array.isArray(call) && call[0] === 'toast'));
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
        storageStatus: { ok: false }
    });
    const preview = SettingsView.renderImportPreviewMessage({
        format: 'json',
        count: 2,
        settingsIncluded: true,
        warnings: ['<script>alert(1)</script>']
    }, true);

    assert(page.includes('btn-export-raw'));
    assert(page.includes('Spese registrate'));
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
        SettingsActions.getImportSuccessMessage({ count: 3, regeneratedIds: 2 }, 'append'),
        '3 spese aggiunte, 2 id rigenerati ✓'
    );
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
        clearAll() {
            calls.push(['clear-all']);
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

    assert.equal(jsonDownload.download.filename, 'spese_backup_2026-05-19.json');
    assert.equal(csvDownload.download.filename, 'spese_2026-05-19.csv');
    assert.equal(rawDownload.download.filename, 'spese_raw_2026-05-19.txt');
    assert.equal(importResult.toast, '2 spese aggiunte, 1 id rigenerati \u2713');
    assert.equal(themeResult.theme, 'dark');
    assert.equal(clearResult.toast, 'Dati eliminati');
    assert.deepEqual(calls, [
        ['preview-json', '{}'],
        ['preview-csv', 'a,b'],
        ['export-json'],
        ['export-csv'],
        ['export-raw'],
        ['import-csv', 'a,b', 'append'],
        ['update-settings', 'dark'],
        ['clear-all']
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
    assert(/10\/0?5\/2026/.test(model.dateRange));
    assert(/12\/0?5\/2026/.test(model.dateRange));

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

let failed = 0;

for (const { name, fn } of tests) {
    try {
        fn();
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
