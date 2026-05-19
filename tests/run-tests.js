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
    const uiCode = fs.readFileSync(path.join(root, 'app/js/ui-utils.js'), 'utf8');
    const filterViewCode = fs.readFileSync(path.join(root, 'app/js/filter-view.js'), 'utf8');
    const timelineViewCode = fs.readFileSync(path.join(root, 'app/js/timeline-view.js'), 'utf8');
    const statsViewCode = fs.readFileSync(path.join(root, 'app/js/stats-view.js'), 'utf8');
    const statsChartsCode = fs.readFileSync(path.join(root, 'app/js/stats-charts.js'), 'utf8');
    const modalViewCode = fs.readFileSync(path.join(root, 'app/js/modal-view.js'), 'utf8');
    const modalInteractionsCode = fs.readFileSync(path.join(root, 'app/js/modal-interactions.js'), 'utf8');
    const settingsViewCode = fs.readFileSync(path.join(root, 'app/js/settings-view.js'), 'utf8');
    const uiStackCode = fs.readFileSync(path.join(root, 'app/js/ui-stack.js'), 'utf8');

    vm.runInContext(
        [
            statsCode,
            uiCode,
            filterViewCode,
            timelineViewCode,
            statsViewCode,
            statsChartsCode,
            modalViewCode,
            modalInteractionsCode,
            settingsViewCode,
            uiStackCode,
            'globalThis.AppUI = AppUI;',
            'globalThis.FilterView = FilterView;',
            'globalThis.TimelineView = TimelineView;',
            'globalThis.StatsView = StatsView;',
            'globalThis.StatsCharts = StatsCharts;',
            'globalThis.ModalView = ModalView;',
            'globalThis.ModalInteractions = ModalInteractions;',
            'globalThis.SettingsView = SettingsView;',
            'globalThis.UIStack = UIStack;'
        ].join('\n'),
        context
    );

    return {
        AppUI: context.AppUI,
        FilterView: context.FilterView,
        TimelineView: context.TimelineView,
        StatsView: context.StatsView,
        StatsCharts: context.StatsCharts,
        ModalView: context.ModalView,
        ModalInteractions: context.ModalInteractions,
        SettingsView: context.SettingsView,
        UIStack: context.UIStack
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
