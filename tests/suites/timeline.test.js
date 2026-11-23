const {
    assert,
    loadUiViews,
    expense
} = require('../helpers');

module.exports = function register(test) {
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

        const pendingHtml = TimelineView.renderExpenseCard(expense({ id: 'a' }), {
            selectionActive: true,
            isSelected: true,
            deletePending: true
        });
        const pendingSummary = TimelineView.renderSummary({
            selection: {
                active: true,
                deletePending: true,
                selectedCount: 1,
                selectedTotal: 2
            }
        });

        assert(pendingHtml.includes('delete-pending'));
        assert(pendingHtml.includes('\u00d7'));
        assert(pendingSummary.includes('\u00d7'));
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

    test('Controller timeline non deseleziona la card dopo long press e rerender', () => {
        const { TimelineController } = loadUiViews();
        const calls = [];
        const timers = [];

        function makeCard() {
            return {
                dataset: { id: 'a' },
                listeners: {},
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                }
            };
        }

        const firstCard = makeCard();
        const rerenderedCard = makeCard();
        const options = {
            enterSelection: id => calls.push(['enter', id]),
            toggleSelection: id => calls.push(['toggle', id]),
            isSelectionActive: () => true,
            openEditModal: id => calls.push(['open', id]),
            setTimeout(callback) {
                timers.push(callback);
                return timers.length;
            },
            clearTimeout() {}
        };

        TimelineController.bindExpenseCard(firstCard, options);
        firstCard.listeners.pointerdown({ button: 0, clientX: 10, clientY: 10 });
        timers.shift()();

        TimelineController.bindExpenseCard(rerenderedCard, options);
        rerenderedCard.listeners.click({
            preventDefault: () => calls.push('prevent-default')
        });

        assert.deepEqual(calls, [
            ['enter', 'a'],
            'prevent-default'
        ]);
    });

    test('Controller selezione timeline gestisce selezione, copia, export e delete bulk', async () => {
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
            openCustomExportModal: () => calls.push('custom-export'),
            navigatorLike: {
                clipboard: {
                    writeText(text) {
                        calls.push(['clipboard', text]);
                        return Promise.resolve();
                    }
                }
            },
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
        assert.deepEqual(Array.from(state.selectedIds).sort(), ['a', 'b', 'c']);

        const deselectedVisible = TimelineSelectionController.selectVisible(options);
        assert.equal(deselectedVisible, 2);
        assert.deepEqual(Array.from(state.selectedIds).sort(), ['a']);

        TimelineSelectionController.selectVisible(options);
        assert.deepEqual(Array.from(state.selectedIds).sort(), ['a', 'b', 'c']);

        TimelineSelectionController.beginExportSelection(options, {
            selectedIds: [],
            selectFilteredWhenEmpty: true
        });
        assert.deepEqual(Array.from(state.selectedIds).sort(), ['b', 'c']);

        TimelineSelectionController.beginExportSelection(options, {
            selectedIds: ['a'],
            selectFilteredWhenEmpty: false
        });
        assert.deepEqual(Array.from(state.selectedIds), ['a']);

        TimelineSelectionController.selectVisible(options);
        assert.deepEqual(Array.from(state.selectedIds).sort(), ['a', 'b', 'c']);

        const summary = TimelineSelectionController.getSummary(options);
        assert.equal(summary.selectedCount, 3);
        assert.equal(summary.selectedTotal, 9);
        assert.equal(summary.visibleCount, 2);

        assert.equal(await TimelineSelectionController.copySelected(options), true);
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
        assert(calls.some(call => Array.isArray(call) && call[0] === 'clipboard' && call[1] === 'csv'));
        assert(calls.some(call => Array.isArray(call) && call[0] === 'export-csv' && call[1].join(',') === 'a,b,c'));
        assert(calls.some(call => Array.isArray(call) && call[0] === 'download' && call[1] === 'spese_selezionate_2026-06-01.csv'));
        assert(calls.includes('custom-export'));
        assert(calls.some(call => Array.isArray(call) && call[0] === 'delete-many' && call[1].join(',') === 'a,b,c'));
        assert(calls.includes('refresh'));
    });

    test('Controller selezione timeline ricorda e ripristina i filtri attorno alla selezione', () => {
        const { TimelineSelectionController } = loadUiViews();
        const calls = [];
        const state = {
            active: false,
            selectedIds: new Set(),
            deletePending: false
        };
        const spese = [
            expense({ id: 'a', importo: 2 }),
            expense({ id: 'b', importo: 3 })
        ];
        const options = {
            document: {
                getElementById() {
                    return null;
                }
            },
            storage: {
                deleteSpese(ids) {
                    calls.push(['delete-many', ids]);
                    return { success: true, count: ids.length };
                }
            },
            getSpese: () => spese,
            getFilterModel: () => ({
                allSpese: spese,
                filteredSpese: spese
            }),
            getSelectedIds: () => state.selectedIds,
            setSelectedIds: ids => { state.selectedIds = ids; },
            isActive: () => state.active,
            setActive: value => { state.active = value; },
            isDeletePending: () => state.deletePending,
            setDeletePending: value => { state.deletePending = value; },
            pushUiState: payload => calls.push(['push', payload.panel]),
            consumeUiState: steps => calls.push(['consume', steps]),
            renderTimeline: () => calls.push('render'),
            refreshAfterDataChange: () => calls.push('refresh'),
            rememberFiltersBeforeSelection: () => calls.push('remember-filters'),
            restoreFiltersAfterSelection: () => calls.push('restore-filters'),
            showToast: (message, type) => calls.push(['toast', type, message])
        };

        TimelineSelectionController.enter(options, 'a');
        TimelineSelectionController.toggle(options, 'b');
        TimelineSelectionController.exit(options);

        assert.deepEqual(calls, [
            'remember-filters',
            ['push', 'timeline-selection'],
            'render',
            'render',
            'restore-filters',
            'render',
            ['consume', 1]
        ]);

        calls.length = 0;
        TimelineSelectionController.beginExportSelection(options, {
            selectedIds: ['a'],
            selectFilteredWhenEmpty: false
        });
        TimelineSelectionController.deleteSelected(options);

        assert.deepEqual(calls, [
            'remember-filters',
            ['push', 'timeline-selection'],
            'render',
            ['delete-many', ['a']],
            ['consume', 1],
            'refresh',
            'restore-filters',
            ['toast', 'info', '1 spese eliminate']
        ]);
    });

    test('Controller selezione chiude i filtri prima di export ed eliminazione', () => {
        const { TimelineSelectionController } = loadUiViews();
        const calls = [];
        const state = {
            active: true,
            selectedIds: new Set(['a']),
            deletePending: false
        };
        const spese = [expense({ id: 'a', importo: 2 })];
        const options = {
            document: {
                getElementById() {
                    return null;
                }
            },
            getSpese: () => spese,
            getFilterModel: () => ({
                allSpese: spese,
                filteredSpese: spese
            }),
            getSelectedIds: () => state.selectedIds,
            setSelectedIds: ids => { state.selectedIds = ids; },
            isActive: () => state.active,
            setActive: value => { state.active = value; },
            isDeletePending: () => state.deletePending,
            setDeletePending: value => {
                state.deletePending = value;
                calls.push(['delete-pending', value]);
            },
            closeFiltersForSelectionAction: continueAction => {
                calls.push('close-filters');
                continueAction();
                return true;
            },
            openCustomExportModal: () => calls.push('custom-export'),
            renderTimeline: () => calls.push('render'),
            showChoices: (message, choices) => calls.push(['choices', message, choices.map(choice => choice.text)]),
            showToast: (message, type) => calls.push(['toast', type, message])
        };

        assert.equal(TimelineSelectionController.showExportChoices(options), true);
        assert.deepEqual(calls, ['close-filters', 'custom-export']);

        calls.length = 0;

        assert.equal(TimelineSelectionController.showDeleteConfirm(options), true);
        assert.deepEqual(calls, [
            'close-filters',
            ['delete-pending', true],
            'render',
            ['choices', 'Eliminare 1 spese selezionate?', ['Annulla', 'Elimina']]
        ]);
    });

    test('Controller selezione mantiene header e nav attivi anche nelle statistiche', () => {
        const { TimelineSelectionController } = loadUiViews();

        function makeClassList(initial = []) {
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

        function button(id) {
            return {
                id,
                dataset: {},
                disabled: false,
                textContent: '',
                title: '',
                attributes: {},
                classList: makeClassList(['hidden']),
                setAttribute(name, value) {
                    this.attributes[name] = value;
                },
                addEventListener() {
                }
            };
        }

        function navSet() {
            return {
                attributes: {},
                setAttribute(name, value) {
                    this.attributes[name] = value;
                }
            };
        }

        const title = {
            innerHTML: 'Where\'s My <span style="color: #ff7c00;">Bug</span>?',
            dataset: {}
        };
        const mainSet = navSet();
        const selectionSet = navSet();
        const elements = {
            'app-header': {
                classList: makeClassList(),
                querySelector(selector) {
                    return selector === 'h1' ? title : null;
                }
            },
            'bottom-nav': {
                dataset: {},
                classList: makeClassList(),
                querySelector(selector) {
                    if (selector === '[data-nav-set="main"]') return mainSet;
                    if (selector === '[data-nav-set="selection"]') return selectionSet;
                    return null;
                }
            },
            'theme-toggle': { classList: makeClassList() },
            'btn-selection-copy': button('btn-selection-copy'),
            'btn-selection-select-all': button('btn-selection-select-all'),
            'btn-selection-export': button('btn-selection-export'),
            'btn-selection-delete': button('btn-selection-delete')
        };
        const doc = {
            getElementById(id) {
                return elements[id] || null;
            }
        };

        TimelineSelectionController.syncHeader({
            document: doc,
            isActive: () => true,
            getCurrentPage: () => 'stats',
            appConfig: { channel: 'dev' },
            getSelectedIds: () => new Set(['a']),
            getSpese: () => [expense({ id: 'a', importo: 5 })],
            getFilterModel: () => ({
                filteredSpese: [expense({ id: 'a', importo: 5 })]
            })
        });

        assert(elements['app-header'].classList.contains('selection-active'));
        assert(elements['bottom-nav'].classList.contains('selection-active'));
        assert(!elements['theme-toggle'].classList.contains('hidden'));
        assert.equal(title.innerHTML, 'Where\'s My <span style="color: #ff7c00;">Bug</span>?');
        assert(elements['btn-selection-select-all'].classList.contains('hidden'));
        assert.equal(elements['btn-selection-select-all'].textContent, '✅');
        assert.equal(elements['btn-selection-select-all'].attributes['aria-label'], 'Deseleziona spese filtrate');
        assert.equal(elements['btn-selection-copy'].disabled, true);
        assert.equal(elements['btn-selection-export'].disabled, true);
        assert.equal(elements['btn-selection-delete'].disabled, true);
        assert.equal(elements['bottom-nav'].dataset.selectionSet, 'main');
        assert(elements['bottom-nav'].classList.contains('selection-show-main'));
        assert.equal(mainSet.attributes['aria-hidden'], 'false');
        assert.equal(selectionSet.attributes['aria-hidden'], 'true');

        TimelineSelectionController.setBottomNavSet(elements['bottom-nav'], 'main');
        assert(elements['bottom-nav'].classList.contains('selection-show-main'));
        assert.equal(mainSet.attributes['aria-hidden'], 'false');
        assert.equal(selectionSet.attributes['aria-hidden'], 'true');

        TimelineSelectionController.syncHeader({
            document: doc,
            isActive: () => true,
            getCurrentPage: () => 'timeline',
            appConfig: { channel: 'dev' },
            getSelectedIds: () => new Set(['a']),
            getSpese: () => [expense({ id: 'a', importo: 5 })],
            getFilterModel: () => ({
                filteredSpese: [expense({ id: 'a', importo: 5 })]
            })
        }, {
            active: true,
            selectedCount: 1,
            selectedTotal: 5,
            visibleCount: 1,
            visibleAllSelected: true,
            deletePending: true
        });

        assert(elements['app-header'].classList.contains('delete-pending'));
        assert(elements['bottom-nav'].classList.contains('delete-pending'));
        assert(elements['bottom-nav'].classList.contains('selection-show-main'));

        TimelineSelectionController.syncHeader({
            document: doc,
            isActive: () => true,
            getCurrentPage: () => 'timeline',
            appConfig: { channel: 'dev' },
            getSelectedIds: () => new Set(),
            getSpese: () => [expense({ id: 'a', importo: 5 })],
            getFilterModel: () => ({
                filteredSpese: [expense({ id: 'a', importo: 5 })]
            })
        }, {
            active: true,
            selectedCount: 0,
            selectedTotal: 0,
            visibleCount: 1,
            visibleAllSelected: false,
            deletePending: false
        });

        assert.equal(elements['btn-selection-copy'].disabled, true);
        assert.equal(elements['btn-selection-export'].disabled, true);
        assert(elements['btn-selection-copy'].classList.contains('disabled-empty-selection'));
        assert(elements['btn-selection-export'].classList.contains('disabled-empty-selection'));

        TimelineSelectionController.syncHeader({
            document: doc,
            isActive: () => true,
            getCurrentPage: () => 'settings',
            appConfig: { channel: 'dev' },
            getSelectedIds: () => new Set(['a']),
            getSpese: () => [expense({ id: 'a', importo: 5 })],
            getFilterModel: () => ({
                filteredSpese: [
                    expense({ id: 'a', importo: 5 }),
                    expense({ id: 'b', importo: 2 })
                ]
            })
        });

        assert(!elements['app-header'].classList.contains('selection-active'));
        assert(!elements['app-header'].classList.contains('delete-pending'));
        assert(!elements['bottom-nav'].classList.contains('selection-active'));
        assert(!elements['bottom-nav'].classList.contains('delete-pending'));
        assert(!elements['theme-toggle'].classList.contains('hidden'));
        assert.equal(title.innerHTML, 'Where\'s My <span style="color: #ff7c00;">Bug</span>?');
        assert(elements['btn-selection-select-all'].classList.contains('hidden'));
        assert.equal(elements['btn-selection-select-all'].textContent, '☑️');
        assert(elements['bottom-nav'].classList.contains('selection-show-main'));
        assert.equal(elements['bottom-nav'].dataset.selectionSet, 'main');
        assert.equal(mainSet.attributes['aria-hidden'], 'false');
        assert.equal(selectionSet.attributes['aria-hidden'], 'true');
    });

    test('Controller selezione permette wheel verticale e swipe reattivo nel bottom nav', () => {
        const { TimelineSelectionController } = loadUiViews();
        const listeners = {};

        function makeClassList(initial = []) {
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

        function button(id) {
            return {
                id,
                dataset: {},
                classList: makeClassList(),
                setAttribute() {},
                listeners: {},
                addEventListener(event, handler, options) {
                    this.listeners[event] = { handler, options };
                }
            };
        }

        const mainSet = { setAttribute() {} };
        const selectionSet = { setAttribute() {} };
        const bottomNav = {
            dataset: {},
            classList: makeClassList(['selection-active']),
            querySelector(selector) {
                if (selector === '[data-nav-set="main"]') return mainSet;
                if (selector === '[data-nav-set="selection"]') return selectionSet;
                return null;
            },
            addEventListener(type, handler, options) {
                listeners[type] = { handler, options };
            }
        };
        const elements = {
            'bottom-nav': bottomNav,
            'btn-selection-copy': button('btn-selection-copy'),
            'btn-selection-select-all': button('btn-selection-select-all'),
            'btn-selection-export': button('btn-selection-export'),
            'btn-selection-delete': button('btn-selection-delete')
        };
        const doc = {
            getElementById(id) {
                return elements[id] || null;
            }
        };
        let exportActions = 0;

        TimelineSelectionController.bindHeader({
            document: doc,
            isActive: () => true,
            getCurrentPage: () => 'timeline',
            getSelectedIds: () => new Set(['a']),
            getSpese: () => [expense({ id: 'a', importo: 5 })],
            getFilterModel: () => ({
                filteredSpese: [expense({ id: 'a', importo: 5 })]
            }),
            openCustomExportModal: () => {
                exportActions += 1;
            }
        });

        assert.equal(listeners.touchend.options.passive, false);
        assert.equal(listeners.wheel.options.passive, false);
        assert.equal(elements['btn-selection-export'].listeners.touchend.options.passive, false);

        let preventedWheel = 0;
        listeners.wheel.handler({
            deltaX: 0,
            deltaY: -24,
            preventDefault() {
                preventedWheel += 1;
            }
        });
        assert(bottomNav.classList.contains('selection-show-main'));
        assert.equal(bottomNav.dataset.selectionSet, 'main');
        assert.equal(preventedWheel, 1);

        listeners.wheel.handler({
            deltaX: 0,
            deltaY: 24,
            preventDefault() {
                preventedWheel += 1;
            }
        });
        assert(!bottomNav.classList.contains('selection-show-main'));
        assert.equal(bottomNav.dataset.selectionSet, 'actions');
        assert.equal(preventedWheel, 2);

        listeners.touchstart.handler({
            touches: [{ clientX: 200, clientY: 20 }]
        });
        let preventedTouch = 0;
        listeners.touchend.handler({
            changedTouches: [{ clientX: 130, clientY: 24 }],
            preventDefault() {
                preventedTouch += 1;
            }
        });
        assert(bottomNav.classList.contains('selection-show-main'));
        assert.equal(preventedTouch, 1);

        let preventedExportTap = 0;
        elements['btn-selection-export'].disabled = false;
        elements['btn-selection-export'].listeners.touchstart.handler({
            touches: [{ clientX: 120, clientY: 20 }]
        });
        elements['btn-selection-export'].listeners.touchend.handler({
            changedTouches: [{ clientX: 123, clientY: 22 }],
            preventDefault() {
                preventedExportTap += 1;
            }
        });
        elements['btn-selection-export'].listeners.click.handler({
            preventDefault() {
                preventedExportTap += 1;
            }
        });
        assert.equal(preventedExportTap, 2);
        assert.equal(exportActions, 1);
    });

    test('Controller timeline in modalita selezione non apre la modale al click card', () => {
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
                classList: makeClassList(),
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
            'timeline-summary': { innerHTML: '', classList: makeClassList() }
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
                selectedIds: new Set(['a']),
                deletePending: true
            },
            getSelectionSummary: () => ({
                active: true,
                selectedIds: new Set(['a']),
                selectedCount: 1,
                selectedTotal: 5,
                visibleCount: 1,
                deletePending: true
            }),
            isSelectionActive: () => true,
            toggleSelection: id => calls.push(['toggle', id]),
            enterSelection: id => calls.push(['enter', id]),
            openEditModal: id => calls.push(['open', id])
        });

        assert(elements['timeline-content'].innerHTML.includes('selection-mode'));
        assert(elements['timeline-content'].innerHTML.includes('selected'));
        assert(elements['timeline-summary'].innerHTML.includes('Selezione'));
        assert(elements['timeline-summary'].innerHTML.includes('\u00d7'));
        assert(elements['timeline-summary'].classList.contains('delete-pending'));
        assert(elements['timeline-content'].classList.contains('delete-pending'));

        card.handlers.click();

        assert.deepEqual(calls, [['toggle', 'a']]);
    });
};
