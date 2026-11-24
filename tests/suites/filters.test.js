import {
    assert,
    createLocalStorage,
    loadFilters,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
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

    test('Filtri categorie e pagamento combinano inclusioni ed esclusioni tri-state', () => {
        const ExpenseFilters = loadFilters();
        const spese = [
            expense({ id: 'bar-card', categoria: 'bar', metodo: 'carta' }),
            expense({ id: 'home-card', categoria: 'casa', metodo: 'carta' }),
            expense({ id: 'drink-cash', categoria: 'drink', metodo: 'contanti' }),
            expense({ id: 'bills-card', categoria: 'bollette', metodo: 'carta' })
        ];

        assert.deepEqual(
            ExpenseFilters.apply(spese, {
                excludedCategories: new Set(['bar'])
            }).map(spesa => spesa.id),
            ['home-card', 'drink-cash', 'bills-card']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, {
                categories: new Set(['casa', 'drink']),
                excludedCategories: new Set(['bar'])
            }).map(spesa => spesa.id),
            ['home-card', 'drink-cash']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, {
                methods: new Set(['carta']),
                excludedCategories: new Set(['bollette'])
            }).map(spesa => spesa.id),
            ['bar-card', 'home-card']
        );
        assert.equal(ExpenseFilters.countActive({
            categories: new Set(['casa']),
            excludedCategories: new Set(['bar']),
            excludedMethods: new Set(['contanti'])
        }), 2);
    });

    test('Ricerca tag richiede cancelletto e usa il prefisso', () => {
        const ExpenseFilters = loadFilters();
        const spese = [
            expense({ id: 'tag', descrizione: 'Cena', nota: '', tags: ['inviaggio'] }),
            expense({ id: 'text', descrizione: 'Promemoria inviagg', nota: '', tags: [] }),
            expense({ id: 'middle', descrizione: 'Altro', nota: '', tags: ['preinviaggio'] })
        ];

        assert.deepEqual(
            ExpenseFilters.apply(spese, { query: 'inviagg' }).map(spesa => spesa.id),
            ['text']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, { query: '#inviagg' }).map(spesa => spesa.id),
            ['tag']
        );
    });

    test('Ricerca combina testo e tag in qualsiasi ordine', () => {
        const ExpenseFilters = loadFilters();
        const spese = [
            expense({ id: 'match-title', descrizione: 'Panino integrale', nota: '', tags: ['inviaggio'] }),
            expense({ id: 'match-note', descrizione: 'Pranzo', nota: 'Preso un panino caldo', tags: ['inviaggio'] }),
            expense({ id: 'missing-tag', descrizione: 'Panino integrale', nota: '', tags: ['roma'] }),
            expense({ id: 'missing-text', descrizione: 'Cena', nota: '', tags: ['inviaggio'] }),
            expense({ id: 'text-only-in-tag', descrizione: 'Cena', nota: '', tags: ['panino', 'inviaggio'] })
        ];

        assert.deepEqual(
            ExpenseFilters.apply(spese, { query: 'panino #inviagg' }).map(spesa => spesa.id),
            ['match-title', 'match-note']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, { query: '#inviagg panino' }).map(spesa => spesa.id),
            ['match-title', 'match-note']
        );
    });

    test('Ricerca con piu tag richiede che ogni prefisso sia presente', () => {
        const ExpenseFilters = loadFilters();
        const spese = [
            expense({ id: 'both', descrizione: 'Panino', nota: '', tags: ['roma-centro', 'inviaggio'] }),
            expense({ id: 'only-roma', descrizione: 'Panino', nota: '', tags: ['roma-centro'] }),
            expense({ id: 'only-trip', descrizione: 'Panino', nota: '', tags: ['inviaggio'] }),
            expense({ id: 'wrong-prefix', descrizione: 'Panino', nota: '', tags: ['aroma', 'inviaggio'] })
        ];

        assert.deepEqual(
            ExpenseFilters.apply(spese, { query: '#roma panino #inviagg' }).map(spesa => spesa.id),
            ['both']
        );
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

    test('Filtro speciale selezionate include o esclude lo snapshot di ID selezionati', () => {
        const ExpenseFilters = loadFilters();
        const spese = [
            expense({ id: 'a', importo: 5, categoria: 'bar' }),
            expense({ id: 'b', importo: 7, categoria: 'bar' }),
            expense({ id: 'c', importo: 9, categoria: 'casa' })
        ];
        const filters = {
            categories: new Set(['bar']),
            selectedOnly: true
        };

        assert.deepEqual(
            ExpenseFilters.apply(spese, filters, { selectedIds: new Set(['b', 'c']) }).map(item => item.id),
            ['b']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, filters, {
                selectedIds: new Set(['a']),
                selectedOnlyIds: new Set(['b', 'c'])
            }).map(item => item.id),
            ['b']
        );
        assert.deepEqual(
            ExpenseFilters.apply(spese, {
                categories: new Set(['bar']),
                excludedSelectedOnly: true
            }, {
                selectedOnlyIds: new Set(['b', 'c'])
            }).map(item => item.id),
            ['a']
        );
        assert.equal(ExpenseFilters.countActive(filters), 2);
        assert.equal(ExpenseFilters.countActive({ excludedSelectedOnly: true }), 1);
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
            '1 filtro · 2 spese · €124'
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

    test('Filtro rapido salva una preferenza locale senza il filtro Selezionate', () => {
        const { FilterController } = loadUiViews();
        const localStorage = createLocalStorage();
        const toasts = [];
        const current = {
            query: '',
            categories: new Set(['bar']),
            excludedCategories: new Set(['casa']),
            methods: new Set(['carta']),
            excludedMethods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: true,
            excludedSelectedOnly: false
        };
        const options = {
            storage: { KEY: 'spesa-tracker-data-dev' },
            localStorage,
            filters: current,
            getFilterOpen: () => true,
            getAdvancedFiltersOpen: () => true,
            createFilterSnapshot: () => current,
            showToast: (...args) => toasts.push(args)
        };
        const state = {};

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'saved');
        assert.equal(
            FilterController.getQuickFilterStorageKey(options),
            'spesa-tracker-data-dev:quick-filter'
        );

        const persisted = JSON.parse(localStorage.getItem('spesa-tracker-data-dev:quick-filter'));
        assert.equal(persisted.selectedOnly, false);
        assert.equal(persisted.excludedSelectedOnly, false);
        assert.equal(persisted.amountMax, 'Infinity');
        assert.equal(persisted.categories.join(','), 'bar');
        assert.equal(persisted.excludedCategories.join(','), 'casa');
        assert.deepEqual(toasts.pop(), ['Filtro rapido salvato', 'success']);
    });

    test('Filtro rapido alterna snapshot salvato e filtri precedenti', () => {
        const { FilterController } = loadUiViews();
        let current = {
            categories: ['bar'],
            methods: [],
            selectedOnly: true
        };
        const applied = [];
        const options = {
            getFilterOpen: () => false,
            getAdvancedFiltersOpen: () => false,
            createFilterSnapshot: () => current,
            applyFilterSnapshot(snapshot) {
                current = snapshot;
                applied.push(snapshot);
            }
        };
        const state = {
            savedSnapshot: {
                categories: [],
                methods: ['carta'],
                excludedSelectedOnly: true
            },
            restoreSnapshot: null
        };

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'activated');
        assert.equal(current.categories.length, 0);
        assert.equal(current.methods.join(','), 'carta');
        assert.equal(current.selectedOnly, false);
        assert.equal(current.excludedSelectedOnly, false);

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'restored');
        assert.equal(current.categories.join(','), 'bar');
        assert.equal(current.methods.length, 0);
        assert.equal(current.selectedOnly, false);
        assert.equal(applied.length, 2);
    });

    test('Filtro rapido ripristina l ultima configurazione diversa dal rapido', () => {
        const { FilterController } = loadUiViews();
        let current = { categories: [], methods: [] };
        const options = {
            getFilterOpen: () => true,
            getAdvancedFiltersOpen: () => false,
            createFilterSnapshot: () => current,
            applyFilterSnapshot(snapshot) {
                current = snapshot;
            }
        };
        const state = {
            savedSnapshot: { categories: [], methods: ['carta'] },
            restoreSnapshot: null
        };

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'activated');
        current = { categories: ['casa'], methods: ['carta'] };

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'activated');
        assert.equal(current.categories.length, 0);
        assert.equal(current.methods.join(','), 'carta');

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'restored');
        assert.equal(current.categories.join(','), 'casa');
        assert.equal(current.methods.join(','), 'carta');
    });

    test('Filtro rapido ripristina lo stato precedente anche se il rapido e raggiunto a mano', () => {
        const { FilterController } = loadUiViews();
        let current = { categories: [], methods: [] };
        const options = {
            getFilterOpen: () => false,
            getAdvancedFiltersOpen: () => false,
            createFilterSnapshot: () => current,
            applyFilterSnapshot(snapshot) {
                current = snapshot;
            }
        };
        const state = {
            savedSnapshot: { categories: [], methods: ['carta'] },
            restoreSnapshot: null,
            lastObservedSnapshot: current
        };

        current = { categories: [], methods: ['carta'] };
        FilterController.observeQuickFilterChange(options, state);

        assert(state.restoreSnapshot);
        assert.equal(state.restoreSnapshot.categories.length, 0);
        assert.equal(state.restoreSnapshot.methods.length, 0);
        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'restored');
        assert.equal(current.categories.length, 0);
        assert.equal(current.methods.length, 0);
    });

    test('Reset filtri sostituisce lo stato da ripristinare del filtro rapido', () => {
        const { FilterController } = loadUiViews();
        const filters = {
            query: '',
            categories: new Set(['bar']),
            excludedCategories: new Set(),
            methods: new Set(),
            excludedMethods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false,
            selectedOnlyIds: new Set()
        };
        const options = {
            filters,
            document: {
                getElementById: () => null,
                querySelectorAll: () => []
            },
            getFilterOpen: () => false,
            getAdvancedFiltersOpen: () => false,
            createFilterSnapshot: () => filters,
            applyFilterSnapshot(snapshot) {
                filters.query = snapshot.query;
                filters.categories = new Set(snapshot.categories);
                filters.excludedCategories = new Set(snapshot.excludedCategories);
                filters.methods = new Set(snapshot.methods);
                filters.excludedMethods = new Set(snapshot.excludedMethods);
                filters.amountMin = snapshot.amountMin;
                filters.amountMax = snapshot.amountMax;
                filters.dateFrom = snapshot.dateFrom;
                filters.dateTo = snapshot.dateTo;
                filters.selectedOnly = snapshot.selectedOnly;
                filters.excludedSelectedOnly = snapshot.excludedSelectedOnly;
                filters.selectedOnlyIds = new Set();
            }
        };
        const state = {
            savedSnapshot: { methods: ['carta'] },
            restoreSnapshot: null
        };

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'activated');
        filters.categories.add('casa');
        FilterController.resetFilters(options, {
            quickFilterState: state,
            showToast: false
        });
        assert.equal(state.restoreSnapshot, null);

        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'activated');
        assert.equal(filters.methods.has('carta'), true);
        assert.equal(FilterController.handleQuickFilterLongPress(options, state), 'restored');
        assert.equal(filters.categories.size, 0);
        assert.equal(filters.methods.size, 0);
        assert.equal(filters.excludedCategories.size, 0);
        assert.equal(filters.excludedMethods.size, 0);
    });

    test('Pressione lunga filtro scatta una volta e sopprime il click successivo', () => {
        const { FilterController } = loadUiViews();
        const listeners = {};
        const timers = new Map();
        let nextTimerId = 1;
        let current = { categories: ['bar'] };
        const button = {
            addEventListener(event, handler) {
                listeners[event] = handler;
            }
        };
        const options = {
            getFilterOpen: () => false,
            getAdvancedFiltersOpen: () => false,
            createFilterSnapshot: () => current,
            applyFilterSnapshot(snapshot) {
                current = snapshot;
            },
            setTimeout(callback, delay) {
                const id = nextTimerId++;
                timers.set(id, { callback, delay });
                return id;
            },
            clearTimeout(id) {
                timers.delete(id);
            }
        };
        const state = {
            savedSnapshot: { methods: ['carta'] },
            restoreSnapshot: null
        };
        const binding = FilterController.bindQuickFilterLongPress(button, options, state);

        listeners.pointerdown({ button: 0, clientX: 10, clientY: 10 });
        const timer = Array.from(timers.values())[0];
        assert.equal(timer.delay, 450);
        timer.callback();

        assert.equal(current.methods.join(','), 'carta');
        assert.equal(binding.consumeClick(), true);
        assert.equal(binding.consumeClick(), false);
    });

    test('Pressione lunga filtro scatta al rilascio vicino alla soglia anche se il timer non e ancora partito', () => {
        const { FilterController } = loadUiViews();
        const listeners = {};
        const timers = new Map();
        let nextTimerId = 1;
        let longPressCount = 0;
        const element = {
            addEventListener(event, handler) {
                listeners[event] = handler;
            }
        };
        const options = {
            setTimeout(callback, delay) {
                const id = nextTimerId++;
                timers.set(id, { callback, delay });
                return id;
            },
            clearTimeout(id) {
                timers.delete(id);
            }
        };
        const binding = FilterController.bindLongPressGesture(
            element,
            options,
            () => {
                longPressCount += 1;
            }
        );

        listeners.pointerdown({ button: 0, clientX: 10, clientY: 10, timeStamp: 100 });
        const pendingTimer = Array.from(timers.values())[0];
        assert.equal(pendingTimer.delay, 450);

        listeners.pointerup({ timeStamp: 540 });
        assert.equal(longPressCount, 1);
        assert.equal(timers.size, 0);
        assert.equal(binding.consumeClick(), true);
        assert.equal(binding.consumeClick(), false);

        pendingTimer.callback();
        assert.equal(longPressCount, 1);
    });

    test('Rilascio breve del filtro resta un tap normale', () => {
        const { FilterController } = loadUiViews();
        const listeners = {};
        const timers = new Map();
        let nextTimerId = 1;
        let longPressCount = 0;
        const element = {
            addEventListener(event, handler) {
                listeners[event] = handler;
            }
        };
        const binding = FilterController.bindLongPressGesture(
            element,
            {
                setTimeout(callback, delay) {
                    const id = nextTimerId++;
                    timers.set(id, { callback, delay });
                    return id;
                },
                clearTimeout(id) {
                    timers.delete(id);
                }
            },
            () => {
                longPressCount += 1;
            }
        );

        listeners.pointerdown({ button: 0, clientX: 10, clientY: 10, timeStamp: 100 });
        listeners.pointerup({ timeStamp: 300 });

        assert.equal(longPressCount, 0);
        assert.equal(timers.size, 0);
        assert.equal(binding.consumeClick(), false);
    });

    test('Controller filtri coordina pannello, ricerca e slider fuori da App', () => {
        const { FilterController, FilterView } = loadUiViews();
        const calls = [];
        const transitionTimers = [];

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
                dataset: { id, label: id },
                classList: makeClassList(),
                listener: null,
                listeners: {},
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                    if (event === 'click') this.listener = handler;
                },
                setAttribute(name, value) {
                    this[name] = value;
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
            'selection-filter-section': makeElement('selection-filter-section', { classes: ['hidden'] }),
            'filter-selected-only': makeElement('filter-selected-only'),
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
        const rootVars = {};
        const doc = {
            body: { classList: makeClassList() },
            documentElement: {
                style: {
                    setProperty(name, value) { rootVars[name] = value; },
                    removeProperty(name) { delete rootVars[name]; }
                }
            },
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
            excludedCategories: new Set(['casa']),
            methods: new Set(),
            excludedMethods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false,
            selectedOnlyIds: new Set()
        };
        const state = {
            filterOpen: false,
            advancedFiltersOpen: false,
            filterSearchActive: false,
            selectionActive: false,
            selectedIds: new Set(['bar']),
            releasedFilterSearchHistory: false,
            lastSliderInput: 'max',
            sliderMax: 100,
            lastViewportHeight: 0,
            pageScrollTop: { timeline: 200 }
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
            pageScrollTop: state.pageScrollTop,
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
                if (filters.categories.size || filters.excludedCategories.size) count += 1;
                if (filters.methods.size || filters.excludedMethods.size) count += 1;
                if (filters.amountMin > 0 || filters.amountMax !== Infinity) count += 1;
                if (filters.dateFrom) count += 1;
                if (filters.dateTo) count += 1;
                if (filters.selectedOnly || filters.excludedSelectedOnly) count += 1;
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
            isTimelineSelectionActive: () => state.selectionActive,
            getTimelineSelectedIds: () => state.selectedIds,
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
            requestAnimationFrame: callback => callback(),
            setTimeout: callback => {
                transitionTimers.push(callback);
                return transitionTimers.length;
            },
            clearTimeout: () => { }
        };

        function longPress(element) {
            element.listeners.pointerdown({ button: 0, clientX: 10, clientY: 10 });
            const callback = transitionTimers.shift();
            assert.equal(typeof callback, 'function');
            callback();
            element.listeners.pointerup();
            element.listeners.click({ preventDefault() { } });
        }

        FilterController.init(options);

        assert.equal(state.sliderMax, 500);
        assert.equal(elements['slider-max'].value, '500');
        assert(catChips[0].classList.contains('active'));
        assert(catChips[1].classList.contains('excluded'));
        assert(elements['selection-filter-section'].classList.contains('hidden'));
        assert.equal(FilterController.getActiveFilterCount(options), 1);

        const detachedMethods = filters.methods;
        filters.methods = new Set();
        methodChips[0].listener();
        assert.equal(detachedMethods.has('carta'), false);
        assert.equal(filters.methods.has('carta'), true);
        assert(methodChips[0].classList.contains('active'));
        assert.equal(methodChips[0]['aria-pressed'], 'true');

        methodChips[0].listener();
        assert.equal(filters.methods.has('carta'), false);
        assert.equal(filters.excludedMethods.has('carta'), false);
        assert(!methodChips[0].classList.contains('active'));
        assert(!methodChips[0].classList.contains('excluded'));
        assert.equal(methodChips[0]['aria-pressed'], 'false');

        longPress(methodChips[0]);
        assert.equal(filters.excludedMethods.has('carta'), true);
        assert(methodChips[0].classList.contains('excluded'));
        assert.equal(methodChips[0]['aria-pressed'], 'mixed');

        methodChips[0].listener();
        assert.equal(filters.excludedMethods.has('carta'), false);
        assert.equal(filters.methods.has('carta'), true);
        assert(methodChips[0].classList.contains('active'));
        assert.equal(methodChips[0]['aria-pressed'], 'true');

        longPress(methodChips[0]);
        assert.equal(filters.methods.has('carta'), false);
        assert.equal(filters.excludedMethods.has('carta'), true);

        longPress(methodChips[0]);
        assert.equal(filters.excludedMethods.has('carta'), false);
        assert(!methodChips[0].classList.contains('excluded'));

        state.selectionActive = true;
        FilterController.syncFilterUI(options);
        assert(!elements['selection-filter-section'].classList.contains('hidden'));
        elements['filter-selected-only'].listeners.click();
        assert.equal(filters.selectedOnly, true);
        assert.equal(filters.excludedSelectedOnly, false);
        assert.deepEqual(Array.from(filters.selectedOnlyIds), ['bar']);
        assert(elements['filter-selected-only'].classList.contains('active'));

        state.selectedIds.add('casa');
        longPress(elements['filter-selected-only']);
        assert.equal(filters.selectedOnly, false);
        assert.equal(filters.excludedSelectedOnly, true);
        assert.deepEqual(Array.from(filters.selectedOnlyIds), ['bar']);
        assert(elements['filter-selected-only'].classList.contains('excluded'));
        assert.equal(elements['filter-selected-only']['aria-pressed'], 'mixed');

        elements['filter-selected-only'].listeners.click();
        assert.equal(filters.selectedOnly, true);
        assert.equal(filters.excludedSelectedOnly, false);
        assert.deepEqual(Array.from(filters.selectedOnlyIds), ['bar']);
        assert(elements['filter-selected-only'].classList.contains('active'));

        elements['filter-selected-only'].listeners.click();
        assert.equal(filters.selectedOnly, false);
        assert.equal(filters.excludedSelectedOnly, false);
        assert.equal(filters.selectedOnlyIds.size, 0);
        assert(!elements['filter-selected-only'].classList.contains('active'));
        assert(!elements['filter-selected-only'].classList.contains('excluded'));

        elements['search-input'].value = ' caffe ';
        elements['search-input'].listeners.input();
        assert.equal(filters.query, 'caffe');
        assert(calls.includes('filter-change'));

        let simulatedTimelineScrollTop = 0;
        Object.defineProperty(elements['app-main'], 'scrollTop', {
            configurable: true,
            get() {
                return simulatedTimelineScrollTop;
            },
            set(value) {
                const maxScrollTop = elements['timeline-summary'].classList
                    .contains('filter-panel-collapsed') ? 140 : Infinity;
                simulatedTimelineScrollTop = Math.min(Number(value) || 0, maxScrollTop);
            }
        });
        elements['app-main'].scrollTop = 200;
        FilterController.openFilterPanel(options);
        assert.equal(elements['app-main'].scrollTop, 140);
        assert.equal(state.pageScrollTop.timeline, 140);
        assert.equal(
            elements['app-main'].style.marginTop,
            'calc(var(--header-h) + 96px)'
        );
        assert.equal(rootVars['--app-main-top'], 'calc(var(--header-h) + 96px)');
        assert(elements['timeline-summary'].classList.contains('filter-panel-collapsed'));
        assert(!elements['timeline-summary'].classList.contains('hidden'));
        assert(elements['app-main'].classList.contains('filter-layout-transition'));
        assert.equal(elements['filter-panel']['aria-hidden'], 'false');
        transitionTimers.shift()();
        assert(!elements['app-main'].classList.contains('filter-layout-transition'));
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

        scrollContainer.scrollTop = 120;
        elements['btn-filter-toggle'].listeners.click({ preventDefault() { } });
        assert.equal(state.filterOpen, false);
        assert.equal(state.advancedFiltersOpen, false);
        assert(elements['filter-panel'].classList.contains('filter-panel-closing'));
        assert.equal(scrollContainer.scrollTop, 120);
        assert(!elements['filter-panel'].classList.contains('hidden'));
        assert(!elements['timeline-summary'].classList.contains('filter-panel-collapsed'));
        assert(elements['app-main'].classList.contains('filter-layout-transition'));
        assert(!elements['page-timeline'].classList.contains('filter-open'));
        assert(!elements['advanced-filters'].classList.contains('hidden'));
        transitionTimers.shift()();
        assert(elements['filter-panel'].classList.contains('hidden'));
        assert(!elements['filter-panel'].classList.contains('filter-panel-closing'));
        assert(!elements['page-timeline'].classList.contains('filter-open'));
        assert(!elements['app-main'].classList.contains('filter-layout-transition'));
        assert(elements['advanced-filters'].classList.contains('hidden'));
        assert(!elements['input-bar'].classList.contains('hidden'));
        assert(!elements['app-main'].classList.contains('no-input-bar'));
        assert.equal(scrollContainer.scrollTop, 0);
        assert.equal(elements['app-main'].scrollTop, 200);
        assert.equal(state.pageScrollTop.timeline, 200);
        assert.equal(rootVars['--app-main-top'], undefined);
        assert(calls.some(call => Array.isArray(call) && call[0] === 'history' && call[1].steps === 2));

        scrollContainer.scrollTop = 120;
        FilterController.openFilterPanel(options);
        transitionTimers.shift()();
        assert.equal(scrollContainer.scrollTop, 0);
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
        assert.equal(filters.excludedCategories.size, 0);
        assert.equal(filters.methods.size, 0);
        assert.equal(filters.excludedMethods.size, 0);
        assert.equal(filters.amountMax, Infinity);
        assert.equal(filters.selectedOnly, false);
        assert.equal(filters.excludedSelectedOnly, false);
        assert.equal(filters.selectedOnlyIds.size, 0);
        assert(!elements['filter-selected-only'].classList.contains('active'));
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

    test('QuickFilterController gestisce salvataggio, toggle, ripristino e forgetRestore in autonomia', () => {
        const { QuickFilterController } = loadUiViews();
        const localStorage = createLocalStorage();
        const toasts = [];
        let filterOpen = true;
        let advancedFiltersOpen = true;
        let current = {
            query: 'pizza',
            categories: ['ristorante'],
            excludedCategories: [],
            methods: ['carta'],
            excludedMethods: [],
            amountMin: 5,
            amountMax: 40,
            dateFrom: '',
            dateTo: '',
            selectedOnly: true,
            excludedSelectedOnly: false
        };
        const options = {
            localStorage,
            storage: { KEY: 'qf-unit' },
            getFilterOpen: () => filterOpen,
            getAdvancedFiltersOpen: () => advancedFiltersOpen,
            createFilterSnapshot: () => current,
            applyFilterSnapshot: snapshot => {
                current = snapshot;
            },
            showToast: (msg, type) => toasts.push([type, msg])
        };

        const state = QuickFilterController.createState(options);
        assert.equal(QuickFilterController.handleLongPress(options, state), 'saved');
        assert.equal(state.savedSnapshot.selectedOnly, false);
        assert.equal(QuickFilterController.read(options).query, 'pizza');

        filterOpen = false;
        advancedFiltersOpen = false;
        current = QuickFilterController.normalizeSnapshot(options, { query: 'caffe' });
        QuickFilterController.observeChange(options, state);

        assert.equal(QuickFilterController.handleLongPress(options, state), 'activated');
        assert.equal(current.query, 'pizza');
        assert.equal(QuickFilterController.handleLongPress(options, state), 'restored');
        assert.equal(current.query, 'caffe');

        assert.equal(QuickFilterController.handleLongPress(options, state), 'activated');
        QuickFilterController.forgetRestore(state);
        assert.equal(state.restoreSnapshot, null);
        assert.equal(QuickFilterController.handleLongPress(options, state), 'activated');
        assert.equal(toasts[0][0], 'success');
    });

    test('Selettori periodo filtri evitano blur su change su iPhone/iPad ma mantengono il comportamento standard altrove', () => {
        const { FilterController } = loadUiViews();

        function setupDateTest(navigatorLike) {
            let filterChanges = 0;
            let activeElement = null;

            function makeClassList() {
                const classes = new Set();
                return {
                    add(cls) { classes.add(cls); },
                    remove(cls) { classes.delete(cls); },
                    toggle(cls, force) {
                        const on = force === undefined ? !classes.has(cls) : !!force;
                        if (on) classes.add(cls);
                        else classes.delete(cls);
                    },
                    contains(cls) { return classes.has(cls); }
                };
            }

            function makeDateEl(id) {
                const el = {
                    id,
                    value: '',
                    blurCount: 0,
                    listeners: {},
                    classList: makeClassList(),
                    addEventListener(event, handler) {
                        this.listeners[event] = handler;
                    },
                    focus() {
                        activeElement = el;
                        if (this.listeners.focus) this.listeners.focus();
                    },
                    blur() {
                        this.blurCount += 1;
                        if (activeElement === el) activeElement = null;
                        if (this.listeners.blur) this.listeners.blur();
                    }
                };
                return el;
            }

            const dateFrom = makeDateEl('filter-date-from');
            const dateTo = makeDateEl('filter-date-to');
            const elements = {
                'filter-date-from': dateFrom,
                'filter-date-to': dateTo
            };
            const filters = {
                query: '',
                categories: new Set(),
                excludedCategories: new Set(),
                methods: new Set(),
                excludedMethods: new Set(),
                amountMin: 0,
                amountMax: Infinity,
                dateFrom: '',
                dateTo: '',
                selectedOnly: false,
                excludedSelectedOnly: false,
                selectedOnlyIds: new Set()
            };

            FilterController.init({
                document: {
                    getElementById: id => elements[id] || null,
                    querySelectorAll: () => [],
                    addEventListener: () => {}
                },
                window: { navigator: navigatorLike },
                filters,
                categories: [],
                methods: [],
                getSpese: () => [],
                onFilterChange: () => { filterChanges += 1; }
            });

            return {
                dateFrom,
                dateTo,
                filters,
                getFilterChanges: () => filterChanges,
                getActiveElement: () => activeElement
            };
        }

        const androidCtx = setupDateTest({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l', maxTouchPoints: 5 });
        androidCtx.dateFrom.focus();
        androidCtx.dateFrom.value = '2026-05-01';
        androidCtx.dateFrom.listeners.change();
        assert.equal(androidCtx.filters.dateFrom, '2026-05-01');
        assert.equal(androidCtx.getFilterChanges(), 1);
        assert.equal(androidCtx.dateFrom.blurCount, 1);
        assert.equal(androidCtx.getActiveElement(), null);
        assert(androidCtx.dateFrom.classList.contains('date-picked'));

        const iphoneCtx = setupDateTest({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
        iphoneCtx.dateFrom.focus();
        iphoneCtx.dateFrom.value = '2026-11-24';
        iphoneCtx.dateFrom.listeners.change();
        assert.equal(iphoneCtx.filters.dateFrom, '2026-11-24');
        assert.equal(iphoneCtx.getFilterChanges(), 1);
        assert.equal(iphoneCtx.dateFrom.blurCount, 0);
        assert.equal(iphoneCtx.getActiveElement(), iphoneCtx.dateFrom);
        assert(!iphoneCtx.dateFrom.classList.contains('date-picked'));

        iphoneCtx.dateFrom.value = '2026-11-10';
        iphoneCtx.dateFrom.listeners.change();
        assert.equal(iphoneCtx.filters.dateFrom, '2026-11-10');
        assert.equal(iphoneCtx.getFilterChanges(), 2);
        assert.equal(iphoneCtx.dateFrom.blurCount, 0);
        assert.equal(iphoneCtx.getActiveElement(), iphoneCtx.dateFrom);

        iphoneCtx.dateFrom.blur();
        assert.equal(iphoneCtx.getFilterChanges(), 2);
        assert(iphoneCtx.dateFrom.classList.contains('date-picked'));

        iphoneCtx.dateTo.focus();
        iphoneCtx.dateTo.value = '2026-11-24';
        iphoneCtx.dateTo.listeners.change();
        assert.equal(iphoneCtx.getFilterChanges(), 3);
        iphoneCtx.dateTo.value = '';
        iphoneCtx.dateTo.blur();
        assert.equal(iphoneCtx.filters.dateTo, '');
        assert.equal(iphoneCtx.getFilterChanges(), 4);
        assert(!iphoneCtx.dateTo.classList.contains('date-picked'));

        const ipadCtx = setupDateTest({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 });
        ipadCtx.dateFrom.focus();
        ipadCtx.dateFrom.value = '2026-05-10';
        ipadCtx.dateFrom.listeners.change();
        assert.equal(ipadCtx.dateFrom.blurCount, 0);
        assert.equal(ipadCtx.getActiveElement(), ipadCtx.dateFrom);
    });

    test('Pannello filtri blocca drag orizzontali e aree non scrollabili preservando scroll verticale, slider e search', () => {
        const { FilterController } = loadUiViews();
        const panelListeners = {};
        const scrollContainer = {
            scrollHeight: 300,
            clientHeight: 120
        };
        const panel = {
            classList: {
                add() {},
                remove() {},
                toggle() {},
                contains() { return false; }
            },
            addEventListener(event, handler) {
                panelListeners[event] = handler;
            }
        };
        const filters = {
            query: '',
            categories: new Set(),
            excludedCategories: new Set(),
            methods: new Set(),
            excludedMethods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false,
            selectedOnlyIds: new Set()
        };

        FilterController.init({
            document: {
                getElementById: id => (id === 'filter-panel' ? panel : null),
                querySelectorAll: () => [],
                addEventListener: () => {}
            },
            filters,
            categories: [],
            methods: [],
            getSpese: () => []
        });

        function targetWith(matches) {
            return {
                closest(selector) {
                    const parts = String(selector).split(',').map(part => part.trim());
                    for (const part of parts) {
                        if (matches[part]) return matches[part];
                    }
                    return null;
                }
            };
        }

        function runMove(target, start, end) {
            let prevented = false;
            panelListeners.touchstart({ touches: [{ clientX: start[0], clientY: start[1] }] });
            panelListeners.touchmove({
                target,
                touches: [{ clientX: end[0], clientY: end[1] }],
                preventDefault() { prevented = true; }
            });
            panelListeners.touchend({});
            return prevented;
        }

        const footerTarget = targetWith({});
        assert.equal(runMove(footerTarget, [100, 100], [100, 120]), true);

        const chipTarget = targetWith({ '.filter-panel-scroll': scrollContainer });
        assert.equal(runMove(chipTarget, [100, 100], [120, 102]), true);
        assert.equal(runMove(chipTarget, [100, 100], [102, 125]), false);

        scrollContainer.scrollHeight = 120;
        assert.equal(runMove(chipTarget, [100, 100], [102, 125]), true);
        scrollContainer.scrollHeight = 300;

        const rangeTarget = targetWith({
            'input[type="range"]': { tagName: 'INPUT' },
            'input': { tagName: 'INPUT' },
            '.filter-panel-scroll': scrollContainer
        });
        assert.equal(runMove(rangeTarget, [100, 100], [140, 100]), false);

        const scrollableSearch = { tagName: 'TEXTAREA', readOnly: false, scrollWidth: 200, clientWidth: 120 };
        const searchTarget = targetWith({
            'textarea': scrollableSearch,
            '.filter-panel-scroll': scrollContainer
        });
        assert.equal(runMove(searchTarget, [100, 100], [130, 100]), false);

        scrollableSearch.scrollWidth = 120;
        assert.equal(runMove(searchTarget, [100, 100], [130, 100]), true);
    });
};
