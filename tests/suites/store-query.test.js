import {
    assert,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
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
        assert.throws(() => { first[0].descrizione = 'Mutata fuori'; }, TypeError);

        assert.equal(ExpenseStore.getSpese()[0].descrizione, 'Caffe');
        assert.equal(ExpenseStore.getSpese(), first);
        assert.equal(Object.isFrozen(first), true);
        assert.equal(Object.isFrozen(first[0]), true);
        assert.equal(Object.isFrozen(first[0].tags), true);
        assert.throws(() => { first.push(expense({ id: 'extra' })); }, TypeError);
        assert.throws(() => { first[0].tags.push('extra'); }, TypeError);
        assert.equal(reads, 1);

        source = [
            expense({ id: 'b', descrizione: 'Pranzo' })
        ];
        assert.equal(ExpenseStore.getSpese()[0].id, 'a');

        const refreshed = ExpenseStore.refresh();
        assert.equal(reads, 2);
        assert.equal(Object.isFrozen(refreshed), true);
        assert.equal(Object.isFrozen(refreshed[0]), true);
        assert.equal(refreshed[0].id, 'b');
        assert.equal(ExpenseStore.getSpese(), refreshed);

        source = [
            expense({ id: 'b2', descrizione: 'Merenda' })
        ];
        ExpenseStore.invalidate();
        assert.equal(ExpenseStore.getSpese()[0].id, 'b2');
        assert.equal(reads, 3);

        source = [
            expense({ id: 'c', descrizione: 'Cena' })
        ];
        listeners.storage({ key: 'other-storage' });
        assert.equal(ExpenseStore.getSpese()[0].id, 'b2');

        listeners.storage({ key: 'test-storage' });
        assert.equal(ExpenseStore.getSpese()[0].id, 'c');
        assert.equal(reads, 4);

        source = [
            expense({ id: 'd', descrizione: 'Gelato' })
        ];
        listeners.storage({ key: null });
        assert.equal(ExpenseStore.getSpese()[0].id, 'd');
        assert.equal(reads, 5);
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
            }),
            expense({
                id: 'future-next-week',
                importo: 99,
                descrizione: 'Spesa futura',
                categoria: 'casa',
                metodo: 'carta',
                data: '2026-05-25T10:00:00.000Z'
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
                dateTo: '',
                selectedOnly: false,
                selectedOnlyIds: new Set()
            },
            now: new Date('2026-05-20T12:00:00.000Z')
        });

        assert.equal(model.activeFilterCount, 2);
        assert.equal(model.hasActiveFilters, true);
        assert.deepEqual(model.filteredSpese.map(item => item.id), ['match']);
        assert.equal(model.quickTotals.todayTotal, 10);
        assert.equal(model.quickTotals.weekTotal, 15);
        assert.equal(model.quickTotals.monthTotal, 114);

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
};
