import {
    assert,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
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
            UIStack.getPopstateAction({ exportFormatDropdownOpen: true, exportModalOpen: true }),
            UIStack.ACTIONS.CLEAR_EXPORT_INTERACTION
        );
        assert.equal(
            UIStack.getPopstateAction({ exportModalOpen: true, releaseModalOpen: true }),
            UIStack.ACTIONS.CLOSE_EXPORT_MODAL
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
            UIStack.getPopstateAction({ currentPage: 'stats', hasActiveFilters: true }),
            UIStack.ACTIONS.NAVIGATE_TIMELINE
        );
        assert.equal(
            UIStack.getPopstateAction({ currentPage: 'timeline', hasActiveFilters: true }),
            UIStack.ACTIONS.RESET_FILTERS
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
            exportDropdownOpen: false,
            exportModalOpen: false,
            releaseModalOpen: false,
            modalOpen: false,
            filterSearchActive: false,
            expenseInputActive: false,
            advancedFiltersOpen: false,
            filterOpen: false,
            timelineSelectionActive: false,
            hasActiveFilters: false,
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
            isExportFormatDropdownOpen: () => state.exportDropdownOpen,
            clearExportModalInteraction: fromPopstate => {
                state.exportDropdownOpen = false;
                calls.push(['clear-export-interaction', fromPopstate]);
            },
            isExportModalOpen: () => state.exportModalOpen,
            closeExportModal: fromPopstate => calls.push(['close-export-modal', fromPopstate]),
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
            hasActiveFilters: () => state.hasActiveFilters,
            resetFilters: () => {
                state.hasActiveFilters = false;
                calls.push('reset-filters');
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

        state.hasActiveFilters = true;
        assert.equal(
            UIStackController.handlePopstate(options),
            UIStack.ACTIONS.RESET_FILTERS
        );
        assert.deepEqual(calls[calls.length - 1], 'reset-filters');

        state.suppress = true;
        UIStackController.handlePopstate(options);
        assert.deepEqual(calls[calls.length - 1], ['suppress', false]);

        state.suppress = false;
        state.exportDropdownOpen = true;
        state.exportModalOpen = true;
        assert.equal(
            UIStackController.handlePopstate(options),
            UIStack.ACTIONS.CLEAR_EXPORT_INTERACTION
        );
        assert.deepEqual(calls[calls.length - 1], ['clear-export-interaction', true]);

        state.exportDropdownOpen = false;
        state.exportModalOpen = true;
        assert.equal(
            UIStackController.handlePopstate(options),
            UIStack.ACTIONS.CLOSE_EXPORT_MODAL
        );
        assert.deepEqual(calls[calls.length - 1], ['close-export-modal', true]);

        state.exportModalOpen = false;
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
};
