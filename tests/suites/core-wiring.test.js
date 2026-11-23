import fs from 'node:fs';
import path from 'node:path';
import {
    assert,
    root,
    readAppFile,
    collectModuleGraph,
    createLocalStorage,
    resetAppState,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Stato app iniziale resta isolato e ricreabile fuori da app.js', () => {
        const { AppState } = loadUiViews();

        const first = AppState.create();
        const second = AppState.create();

        first.currentPage = 'stats';
        first.filters.query = 'caffe';
        first.filters.categories.add('bar');
        first.filters.excludedCategories.add('bollette');
        first.filters.excludedMethods.add('contanti');
        first.filters.excludedSelectedOnly = true;
        first.filters.selectedOnlyIds.add('expense-a');
        first.pageScrollTop.timeline = 120;
        first.timelineSelectionActive = true;
        first.timelineSelectedIds.add('expense-a');
        first.timelineSelectionDeletePending = true;
        first._sdInstances.test = {};
        first._editTags.push('lavoro');

        assert.equal(second.currentPage, 'timeline');
        assert.equal(second.filters.query, '');
        assert.equal(second.filters.categories.size, 0);
        assert.equal(second.filters.excludedCategories.size, 0);
        assert.equal(second.filters.excludedMethods.size, 0);
        assert.equal(second.filters.excludedSelectedOnly, false);
        assert.equal(second.filters.selectedOnlyIds.size, 0);
        assert.equal(second.pageScrollTop.timeline, 0);
        assert.deepEqual(second._sdInstances, {});
        assert.deepEqual(second._editTags, []);
        assert.equal(second.statsPeriod, 'month');
        assert.equal(second.filters.amountMax, Infinity);
        assert.equal(second._activeFiltersHistory, false);
        assert.equal(second._releasedFilterSearchHistory, false);
        assert.equal(second._suppressPopstateCount, 0);
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
                restoreRevealScroll: () => calls.push('restore-reveal-scroll'),
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
            clearTimeout(id) {
                assert.equal(this, fakeWindow);
                calls.push(['clear-timeout', id]);
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
        const { AppWiring, AppState } = loadUiViews();
        const app = {
            ...AppState.create(),
            renderTimeline: () => {},
            renderStats: () => {},
            renderSettings: () => {},
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const wiring = AppWiring.create(app, {
            window: fakeWindow,
            document: fakeDocument,
            history: {}
        });

        wiring.filterOptions().requestAnimationFrame(() => calls.push('filter-callback'));
        wiring.navigationOptions().defer(() => calls.push('defer-callback'));
        wiring.navigationOptions().clearTimeout(22);
        wiring.inputBarOptions().cancelAnimationFrame(11);
        wiring.modalMobileOptions().setInterval(() => calls.push('interval-callback'), 120);
        wiring.modalMobileOptions().clearInterval(33);
        wiring.modalOptions().setTimeout(() => calls.push('modal-timeout-callback'), 280);

        assert.deepEqual(calls, [
            'raf',
            'filter-callback',
            ['timeout', 0],
            'defer-callback',
            ['clear-timeout', 22],
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
                dateTo: '',
                selectedOnly: false,
                selectedOnlyIds: new Set()
            },
            sliderMax: 100,
            _lastSliderInput: 'max',
            advancedFiltersOpen: false,
            timelineSelectionActive: false,
            timelineSelectedIds: new Set(),
            timelineSelectionDeletePending: false,
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

        app.timelineSelectionActive = true;
        app.currentPage = 'stats';
        assert.equal(wiring.filterOptions().isTimelineSelectionActive(), true);
        app.currentPage = 'settings';
        assert.equal(wiring.filterOptions().isTimelineSelectionActive(), false);
        app.currentPage = 'timeline';

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

    test('Wiring app sopprime tutti i popstate programmati prima di resettare i filtri', () => {
        const { AppWiring, AppState, UIStackController } = loadUiViews();
        const calls = [];
        const app = {
            ...AppState.create(),
            _activeFiltersHistory: true,
            renderTimeline: () => {},
            renderStats: () => {},
            renderSettings: () => {},
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        app.filters.query = 'caffe';
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById() {
                    return null;
                }
            },
            window: { navigator: {} },
            history: {},
            HistoryController: {
                run(action, options) {
                    if (action && action.suppressPopstate) {
                        options.setSuppressPopstate(true);
                    }
                    return true;
                }
            },
            FilterController: {
                resetFilters() {
                    app.filters.query = '';
                    calls.push('reset-filters');
                },
                updateFilterBadge() {},
                syncFilterUI() {}
            },
            ExpenseStore: {
                getSpese: () => []
            }
        });

        wiring.consumeUiState();
        wiring.consumeUiState();
        assert.equal(app._suppressPopstateCount, 2);

        UIStackController.handlePopstate(wiring.uiStackOptions());
        assert.equal(app.filters.query, 'caffe');
        assert.equal(app._suppressPopstateCount, 1);

        UIStackController.handlePopstate(wiring.uiStackOptions());
        assert.equal(app.filters.query, 'caffe');
        assert.equal(app._suppressPopstateCount, 0);

        UIStackController.handlePopstate(wiring.uiStackOptions());
        assert.equal(app.filters.query, '');
        assert.deepEqual(calls, ['reset-filters']);
    });

    test('Wiring app chiude il pannello filtri prima delle azioni selezione', () => {
        const { AppWiring, AppState } = loadUiViews();
        const calls = [];
        const app = {
            ...AppState.create(),
            filterOpen: false
        };
        const wiring = AppWiring.create(app, {
            document: { body: {} },
            window: {},
            history: {},
            setTimeout: (callback, delay) => {
                calls.push(['timeout', delay]);
                callback();
                return null;
            },
            FilterController: {
                closeFilterPanel: () => {
                    app.filterOpen = false;
                    calls.push('close-filter');
                }
            },
            ExpenseStore: {
                getSpese: () => []
            }
        });

        let continued = 0;

        assert.equal(wiring.timelineSelectionOptions().closeFiltersForSelectionAction(() => {
            continued += 1;
        }), false);
        assert.equal(continued, 0);

        app.filterOpen = true;

        assert.equal(wiring.timelineSelectionOptions().closeFiltersForSelectionAction(() => {
            continued += 1;
            calls.push('continue');
        }), true);
        assert.deepEqual(calls, [
            'close-filter',
            ['timeout', 0],
            ['timeout', 0],
            'continue'
        ]);
        assert.equal(continued, 1);
    });

    test('Wiring app ripristina i filtri precedenti quando termina la selezione', () => {
        const { AppWiring, AppState, TimelineSelectionController, UIStack } = loadUiViews();
        const calls = [];
        const historyActions = [];
        const app = {
            ...AppState.create(),
            renderTimeline: () => calls.push('timeline'),
            renderStats: () => calls.push('stats'),
            renderSettings: () => calls.push('settings'),
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        app.filters.query = 'pane';
        app.filters.categories = new Set(['alimentari']);
        app.filters.excludedCategories = new Set(['bar']);
        app.filters.methods = new Set(['carta']);
        app.filters.excludedMethods = new Set(['contanti']);
        app.filters.amountMin = 2;
        app.filters.amountMax = 20;
        app.filters.dateFrom = '2026-06-01';
        app.filters.dateTo = '2026-06-10';
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById() {
                    return null;
                }
            },
            window: { navigator: {} },
            history: {},
            HistoryController: {
                run(action) {
                    historyActions.push(action);
                    return true;
                }
            },
            FilterController: {
                updateFilterBadge: () => calls.push('badge'),
                syncFilterUI: () => calls.push('sync-filter-ui')
            },
            ExpenseStore: {
                getSpese: () => [
                    expense({ id: 'a', descrizione: 'Pane', categoria: 'alimentari', metodo: 'carta', importo: 5, data: '2026-06-05T10:00:00' }),
                    expense({ id: 'b', descrizione: 'Bus', categoria: 'trasporti', metodo: 'contanti', importo: 3, data: '2026-06-05T10:00:00' })
                ]
            }
        });
        const options = wiring.timelineSelectionOptions();

        TimelineSelectionController.enter(options, 'a');
        app.filters.query = 'bus';
        app.filters.categories = new Set(['trasporti']);
        app.filters.excludedCategories = new Set(['ristorante']);
        app.filters.methods = new Set(['contanti']);
        app.filters.excludedMethods = new Set(['carta']);
        app.filters.amountMin = 0;
        app.filters.amountMax = 10;
        app.filters.dateFrom = '';
        app.filters.dateTo = '';

        TimelineSelectionController.exit(options);

        assert.equal(app.filters.query, 'pane');
        assert.deepEqual(Array.from(app.filters.categories), ['alimentari']);
        assert.deepEqual(Array.from(app.filters.excludedCategories), ['bar']);
        assert.deepEqual(Array.from(app.filters.methods), ['carta']);
        assert.deepEqual(Array.from(app.filters.excludedMethods), ['contanti']);
        assert.equal(app.filters.amountMin, 2);
        assert.equal(app.filters.amountMax, 20);
        assert.equal(app.filters.dateFrom, '2026-06-01');
        assert.equal(app.filters.dateTo, '2026-06-10');
        assert.equal(app.filters.selectedOnly, false);
        assert.equal(app.timelineSelectionBaseFilters, null);
        assert.deepEqual(
            historyActions.map(action => action.type),
            [
                UIStack.HISTORY_ACTIONS.PUSH,
                UIStack.HISTORY_ACTIONS.BACK
            ]
        );
    });

    test('Wiring app conserva i filtri precedenti aprendo export custom dalle impostazioni', () => {
        const { AppWiring, AppState, SettingsController, SettingsActions, UIStack } = loadUiViews();
        const calls = [];
        const historyActions = [];
        const classes = new Set(['hidden']);
        const body = { innerHTML: '' };
        const filterBtn = { innerHTML: '' };
        const modal = {
            dataset: {},
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return body;
                if (selector === '#btn-export-filters') return filterBtn;
                return null;
            }
        };
        const localStorage = createLocalStorage();
        const storage = { KEY: 'spese-test' };
        const spese = [
            expense({ id: 'a', descrizione: 'Pane', importo: 5 }),
            expense({ id: 'b', descrizione: 'Latte', importo: 4 })
        ];
        const app = {
            ...AppState.create(),
            currentPage: 'settings',
            renderTimeline: () => calls.push('timeline'),
            renderStats: () => calls.push('stats'),
            renderSettings: () => calls.push('settings'),
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        app.filters.query = 'latte';
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById(id) {
                    if (id === 'export-modal-overlay') return modal;
                    if (id === 'settings-content') return {};
                    return null;
                }
            },
            window: {
                navigator: {},
                localStorage
            },
            history: {},
            Storage: storage,
            HistoryController: {
                run(action) {
                    historyActions.push(action);
                    return true;
                }
            },
            FilterController: {
                updateFilterBadge: () => calls.push('badge'),
                syncFilterUI: () => calls.push('sync-filter-ui')
            },
            ExpenseStore: {
                getSpese: () => spese
            }
        });

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['a'],
                filters: { query: 'pane' }
            }
        });

        const options = wiring.settingsOptions();
        SettingsController.openExportModal(options);

        assert.equal(app.timelineSelectionActive, true);
        assert.equal(app.filters.query, 'pane');
        assert.deepEqual(Array.from(app.timelineSelectedIds), ['a']);
        assert.equal(app.timelineSelectionBaseFilters.query, 'latte');

        SettingsController.closeExportModal(options);

        assert.equal(app.timelineSelectionActive, false);
        assert.equal(app.filters.query, 'latte');
        assert.equal(app.timelineSelectionBaseFilters, null);
        assert.deepEqual(
            historyActions.map(action => action.type),
            [
                UIStack.HISTORY_ACTIONS.PUSH,
                UIStack.HISTORY_ACTIONS.PUSH,
                UIStack.HISTORY_ACTIONS.GO
            ]
        );
    });

    test('Wiring app chiede conferma prima delle impostazioni con selezione attiva', () => {
        const { AppWiring, AppState } = loadUiViews();
        const calls = [];
        let confirmPayload = null;
        const app = {
            ...AppState.create(),
            currentPage: 'timeline',
            timelineSelectionActive: true,
            renderTimeline: () => {},
            renderStats: () => {},
            renderSettings: () => {},
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const wiring = AppWiring.create(app, {
            document: { body: {} },
            window: {},
            history: {},
            setTimeout: callback => callback(),
            ConfirmController: {
                showChoices(options) {
                    confirmPayload = options;
                    calls.push(['confirm', options.message, options.choices.map(choice => choice.text)]);
                    return true;
                }
            },
            TimelineSelectionController: {
                syncHeader() {},
                exit(_options, fromPopstate) {
                    app.timelineSelectionActive = false;
                    calls.push(['exit-selection', fromPopstate]);
                    return true;
                }
            }
        });
        const navOptions = wiring.navigationOptions();

        assert.equal(navOptions.shouldConfirmSettingsNavigation(), true);

        navOptions.confirmSettingsNavigation(() => calls.push('continue'));

        assert.deepEqual(calls[0], ['confirm', 'Uscire da Selezione?', ['Annulla', 'Esci']]);
        assert.equal(confirmPayload.choices[0].onClick, undefined);

        confirmPayload.choices[1].onClick();

        assert.deepEqual(calls.slice(1), [
            ['exit-selection', true]
        ]);

        wiring.uiStackOptions().setSuppressNextPopstate(false);
        assert.deepEqual(calls.slice(1), [
            ['exit-selection', true],
            'continue'
        ]);
        assert.equal(app.timelineSelectionActive, false);
    });

    test('Wiring app consuma history selezione prima di andare alle impostazioni', () => {
        const { AppWiring, AppState, UIStack } = loadUiViews();
        const calls = [];
        const historyActions = [];
        let confirmPayload = null;
        const app = {
            ...AppState.create(),
            currentPage: 'timeline',
            timelineSelectionActive: true,
            timelineSelectedIds: new Set(['a']),
            renderTimeline: () => calls.push('timeline'),
            renderStats: () => calls.push('stats'),
            renderSettings: () => calls.push('settings'),
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById() {
                    return null;
                }
            },
            window: { navigator: {} },
            history: {},
            setTimeout: callback => callback(),
            HistoryController: {
                run(action, options) {
                    historyActions.push(action);
                    if (action && action.suppressPopstate) {
                        options.setSuppressPopstate(true);
                    }
                    return true;
                }
            },
            ConfirmController: {
                showChoices(options) {
                    confirmPayload = options;
                    return true;
                }
            },
            ExpenseStore: {
                getSpese: () => []
            },
            FilterController: {
                updateFilterBadge: () => calls.push('badge'),
                syncFilterUI: () => calls.push('sync-filter-ui')
            }
        });
        const navOptions = wiring.navigationOptions();

        navOptions.confirmSettingsNavigation(() => calls.push('continue'));
        confirmPayload.choices[1].onClick();

        assert.equal(app.timelineSelectionActive, false);
        assert.deepEqual(historyActions.map(action => action.type), [
            UIStack.HISTORY_ACTIONS.BACK
        ]);
        assert(!calls.includes('continue'));
        wiring.uiStackOptions().setSuppressNextPopstate(false);
        assert.deepEqual(calls.slice(-2), [
            'timeline',
            'continue'
        ]);
    });

    test('Wiring app consuma history filtri e selezione prima di andare alle impostazioni', () => {
        const { AppWiring, AppState, UIStack } = loadUiViews();
        const calls = [];
        const historyActions = [];
        let confirmPayload = null;
        const app = {
            ...AppState.create(),
            currentPage: 'timeline',
            filterOpen: true,
            advancedFiltersOpen: true,
            timelineSelectionActive: true,
            timelineSelectedIds: new Set(['a']),
            renderTimeline: () => calls.push('timeline'),
            renderStats: () => calls.push('stats'),
            renderSettings: () => calls.push('settings'),
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById() {
                    return null;
                }
            },
            window: { navigator: {} },
            history: {},
            setTimeout: callback => callback(),
            HistoryController: {
                run(action, options) {
                    historyActions.push(action);
                    if (action && action.suppressPopstate) {
                        options.setSuppressPopstate(true);
                    }
                    return true;
                }
            },
            ConfirmController: {
                showChoices(options) {
                    confirmPayload = options;
                    return true;
                }
            },
            ExpenseStore: {
                getSpese: () => []
            },
            FilterController: {
                closeFilterPanel(_options, fromPopstate) {
                    calls.push(['close-filter', fromPopstate]);
                    app.filterOpen = false;
                    app.advancedFiltersOpen = false;
                },
                updateFilterBadge: () => calls.push('badge'),
                syncFilterUI: () => calls.push('sync-filter-ui')
            }
        });
        const navOptions = wiring.navigationOptions();

        navOptions.confirmSettingsNavigation(() => calls.push('continue'));
        confirmPayload.choices[1].onClick();

        assert.equal(app.timelineSelectionActive, false);
        assert.equal(app.filterOpen, false);
        assert.equal(app.advancedFiltersOpen, false);
        assert.deepEqual(historyActions.map(action => [action.type, action.delta]), [
            [UIStack.HISTORY_ACTIONS.GO, -3]
        ]);
        assert(calls.some(call => Array.isArray(call) && call[0] === 'close-filter' && call[1] === true));
        assert(!calls.includes('continue'));
        wiring.uiStackOptions().setSuppressNextPopstate(false);
        assert.deepEqual(calls.slice(-2), [
            'timeline',
            'continue'
        ]);
    });

    test('Wiring app consuma history pannello filtri semiaperto prima delle impostazioni', () => {
        const { AppWiring, AppState, UIStack } = loadUiViews();
        const historyActions = [];
        let confirmPayload = null;
        const app = {
            ...AppState.create(),
            currentPage: 'timeline',
            filterOpen: true,
            advancedFiltersOpen: false,
            timelineSelectionActive: true,
            timelineSelectedIds: new Set(['a']),
            renderTimeline: () => {},
            renderStats: () => {},
            renderSettings: () => {},
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const wiring = AppWiring.create(app, {
            document: {
                body: {},
                getElementById() {
                    return null;
                }
            },
            window: { navigator: {} },
            history: {},
            setTimeout: callback => callback(),
            HistoryController: {
                run(action, options) {
                    historyActions.push(action);
                    if (action && action.suppressPopstate) {
                        options.setSuppressPopstate(true);
                    }
                    return true;
                }
            },
            ConfirmController: {
                showChoices(options) {
                    confirmPayload = options;
                    return true;
                }
            },
            ExpenseStore: {
                getSpese: () => []
            },
            FilterController: {
                closeFilterPanel(_options, fromPopstate) {
                    app.filterOpen = false;
                    assert.equal(fromPopstate, true);
                },
                updateFilterBadge: () => {},
                syncFilterUI: () => {}
            }
        });
        const navOptions = wiring.navigationOptions();

        navOptions.confirmSettingsNavigation(() => {});
        confirmPayload.choices[1].onClick();

        assert.equal(app.timelineSelectionActive, false);
        assert.equal(app.filterOpen, false);
        assert.deepEqual(historyActions.map(action => [action.type, action.delta]), [
            [UIStack.HISTORY_ACTIONS.GO, -2]
        ]);
    });

    test('App carica ES Modules nativi senza cicli e resta importabile in Node', () => {
        const { App, AppWiring } = loadUiViews();
        const html = readAppFile('index.html');
        const scriptMatches = Array.from(html.matchAll(/<script\b([^>]*)>/gi)).map(match => {
            const attrs = match[1];
            const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(attrs);
            return {
                src: srcMatch ? srcMatch[1] : null,
                isModule: /\btype\s*=\s*["']module["']/i.test(attrs)
            };
        });

        assert.deepEqual(scriptMatches, [
            { src: 'vendor/chart.umd.min.js', isModule: false },
            { src: 'js/core/config.js', isModule: false },
            { src: 'js/core/app.js', isModule: true }
        ]);

        function listAppJs(dir) {
            let out = [];
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) out = out.concat(listAppJs(full));
                else if (entry.name.endsWith('.js')) {
                    out.push(path.relative(path.join(root, 'app'), full).replace(/\\/g, '/'));
                }
            }
            return out.sort();
        }

        const allJsFiles = listAppJs(path.join(root, 'app/js'));
        const graph = collectModuleGraph(path.join(root, 'app'), 'js/core/app.js');
        assert.deepEqual(graph.cycles, []);
        assert.deepEqual(
            graph.files.slice().sort(),
            allJsFiles.filter(file => file !== 'js/core/config.js')
        );
        assert.equal(allJsFiles.includes('js/core/config.js'), true);

        assert.equal(typeof App.init, 'function');
        const wiring = AppWiring.create(App);
        assert.equal(typeof wiring.filterOptions, 'function');
        assert.equal(typeof wiring.settingsOptions, 'function');
    });

    test('Stato volatile dei controller e consolidato, resettabile e assente dal DOM', () => {
        const {
            AppState,
            ExportModalController,
            ReleaseModalController,
            HeaderTitleController,
            TimelineSelectionController,
            FilterController,
            QuickFilterController,
            TimelineController,
            ToastController,
            ExpenseStore
        } = loadUiViews();

        const initial = AppState.create();
        assert.deepEqual(initial._afterSuppressedPopstates, []);

        const makeClassList = (seed = []) => {
            const set = new Set(seed);
            return {
                add: (...cls) => cls.forEach(c => set.add(c)),
                remove: (...cls) => cls.forEach(c => set.delete(c)),
                toggle: (c, force) => {
                    const active = force == null ? !set.has(c) : !!force;
                    if (active) set.add(c);
                    else set.delete(c);
                    return active;
                },
                contains: c => set.has(c)
            };
        };
        const makeEl = (id, classes = []) => ({
            id,
            innerHTML: '',
            textContent: '',
            disabled: false,
            dataset: {},
            style: {},
            attributes: {},
            listeners: {},
            classList: makeClassList(classes),
            setAttribute(name, val) {
                this.attributes[name] = val;
            },
            addEventListener(name, handler) {
                this.listeners[name] = handler;
            },
            querySelector() {
                return null;
            }
        });

        const exportModal = makeEl('export-modal-overlay', ['hidden']);
        const exportOptions = {
            document: { getElementById: id => (id === 'export-modal-overlay' ? exportModal : null) },
            storage: { KEY: 'test-key', getSpese: () => [] },
            localStorage: createLocalStorage()
        };
        ExportModalController.bind(exportOptions);
        assert.deepEqual(ExportModalController.getState(exportOptions), {
            bound: true,
            formatInteraction: false,
            preCsvContents: null,
            toggleBaseSelection: null,
            toggleBaseFilterSelection: null,
            toggleBaseFilters: null
        });
        assert.equal(exportModal['__settingsExportOptions'], undefined);
        assert.equal(exportModal.dataset.bound, undefined);

        const releaseModal = makeEl('release-modal-overlay', ['hidden']);
        const releaseOptions = {
            document: { getElementById: id => (id === 'release-modal-overlay' ? releaseModal : null) }
        };
        ReleaseModalController.bind(releaseOptions);
        assert.equal(ReleaseModalController.isBound(releaseModal), true);
        assert.equal(ReleaseModalController.getState(releaseOptions).bound, true);
        assert.equal(releaseModal.dataset.bound, undefined);

        const titleEl = makeEl('title');
        titleEl.innerHTML = 'App';
        HeaderTitleController.init({ document: { querySelector: () => titleEl } });
        HeaderTitleController.syncDefaultTitle(titleEl);
        assert.deepEqual(HeaderTitleController.getState(titleEl), {
            defaultHtml: 'App',
            showingDate: false,
            animating: false
        });
        assert.equal(titleEl.dataset.defaultHtml, undefined);
        assert.equal(titleEl.dataset.showingDate, undefined);

        const bottomNav = makeEl('bottom-nav');
        const btnAll = makeEl('btn-selection-select-all');
        const btnCopy = makeEl('btn-selection-copy');
        const btnExport = makeEl('btn-selection-export');
        const btnDelete = makeEl('btn-selection-delete');
        const selDoc = {
            getElementById(id) {
                if (id === 'bottom-nav') return bottomNav;
                if (id === 'btn-selection-select-all') return btnAll;
                if (id === 'btn-selection-copy') return btnCopy;
                if (id === 'btn-selection-export') return btnExport;
                if (id === 'btn-selection-delete') return btnDelete;
                return null;
            }
        };
        TimelineSelectionController.bindHeader({ document: selDoc });
        TimelineSelectionController.setBottomNavSet(bottomNav, 'actions');
        assert.equal(TimelineSelectionController.getBottomNavSet(bottomNav), 'actions');
        assert.deepEqual(TimelineSelectionController.getState(bottomNav), {
            selectionSet: 'actions',
            pagerBound: true
        });
        assert.equal(bottomNav.dataset.selectionSet, undefined);
        assert.equal(bottomNav.dataset.selectionPagerBound, undefined);
        assert.equal(btnExport.dataset.selectionBound, undefined);

        const quickState = QuickFilterController.createState({});
        QuickFilterController.bindQuickFilterLongPress(makeEl('qf'), {}, quickState);
        assert.notEqual(QuickFilterController.getState().activeState, null);
        assert.equal(FilterController.getState().filterLayoutTransitionToken, 0);

        const card = makeEl('card-1');
        card.dataset.id = 'exp-99';
        const scheduledTimers = [];
        const cleared = [];
        TimelineController.bindExpenseCard(card, {
            setTimeout: (cb, delay) => {
                const id = scheduledTimers.length + 1;
                scheduledTimers.push({ id, cb, delay });
                return id;
            },
            clearTimeout: id => cleared.push(id)
        });
        card.listeners.pointerdown({ button: 0, clientX: 0, clientY: 0 });
        scheduledTimers[0].cb();
        assert.equal(TimelineController.getState().suppressedLongPressClickId, 'exp-99');
        assert.equal(TimelineController.getState().suppressedLongPressClickTimer, 2);

        const toastEl = makeEl('toast');
        ToastController.show('Ciao', 'info', {
            document: { getElementById: () => toastEl },
            setTimeout: () => 77
        });
        assert.equal(ToastController.getState().timerId, 77);

        let removedListener = false;
        ExpenseStore.init({
            storage: { KEY: 'k', getSpese: () => [] },
            window: {
                addEventListener() {},
                removeEventListener() { removedListener = true; }
            }
        });
        ExpenseStore.getSpese();
        assert.equal(ExpenseStore.getState().hasCachedSpese, true);

        resetAppState();
        ToastController.resetState({ clearTimeout: id => cleared.push(id) });
        assert.equal(ExportModalController.getState(exportOptions), null);
        assert.equal(ReleaseModalController.isBound(releaseModal), false);
        assert.equal(HeaderTitleController.getState(titleEl), null);
        assert.equal(TimelineSelectionController.getBottomNavSet(bottomNav), null);
        assert.equal(TimelineSelectionController.getState(bottomNav).pagerBound, false);
        assert.equal(QuickFilterController.getState().activeState, null);
        assert.equal(TimelineController.getState().suppressedLongPressClickId, null);
        assert.equal(ToastController.getState().timerId, null);
        assert.equal(removedListener, true);
        assert.equal(ExpenseStore.getState().hasCachedSpese, false);
    });
};
