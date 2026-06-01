/* ============================================
   UI STACK - decisioni pure per back/popstate
   ============================================ */

const UIStack = (() => {
    const ACTIONS = Object.freeze({
        IGNORE: 'ignore',
        CLOSE_CONFIRM: 'close-confirm',
        CLOSE_RELEASE_MODAL: 'close-release-modal',
        HANDLE_MODAL: 'handle-modal',
        CLOSE_FILTER_SEARCH: 'close-filter-search',
        CLOSE_EXPENSE_INPUT: 'close-expense-input',
        CLOSE_ADVANCED_FILTERS: 'close-advanced-filters',
        CLOSE_FILTER: 'close-filter',
        CLOSE_TIMELINE_SELECTION: 'close-timeline-selection',
        NAVIGATE_TIMELINE: 'navigate-timeline',
        NONE: 'none'
    });

    const MODAL_ACTIONS = Object.freeze({
        CLEAR_INTERACTION: 'clear-interaction',
        CLEAR_FIELD: 'clear-field',
        CLOSE_MODAL: 'close-modal'
    });

    const HISTORY_ACTIONS = Object.freeze({
        NONE: 'none',
        PUSH: 'push',
        REPLACE: 'replace',
        BACK: 'back',
        GO: 'go'
    });

    function createHistoryAction(type, options = {}) {
        return {
            type,
            state: options.state || null,
            delta: options.delta || 0,
            suppressPopstate: !!options.suppressPopstate
        };
    }

    function getPopstateAction(state = {}) {
        if (state.suppressNextPopstate) return ACTIONS.IGNORE;
        if (state.confirmOpen) return ACTIONS.CLOSE_CONFIRM;
        if (state.releaseModalOpen) return ACTIONS.CLOSE_RELEASE_MODAL;
        if (state.modalOpen) return ACTIONS.HANDLE_MODAL;
        if (state.filterSearchActive) return ACTIONS.CLOSE_FILTER_SEARCH;
        if (state.expenseInputActive) return ACTIONS.CLOSE_EXPENSE_INPUT;
        if (state.advancedFiltersOpen) return ACTIONS.CLOSE_ADVANCED_FILTERS;
        if (state.filterOpen) return ACTIONS.CLOSE_FILTER;
        if (state.timelineSelectionActive) return ACTIONS.CLOSE_TIMELINE_SELECTION;
        if (state.currentPage && state.currentPage !== 'timeline') return ACTIONS.NAVIGATE_TIMELINE;

        return ACTIONS.NONE;
    }

    function getModalPopstateAction(state = {}) {
        if (state.interactionActive || state.dropdownOpen) {
            return MODAL_ACTIONS.CLEAR_INTERACTION;
        }

        if (state.activeField) {
            return MODAL_ACTIONS.CLEAR_FIELD;
        }

        return MODAL_ACTIONS.CLOSE_MODAL;
    }

    function getNavigationHistoryAction(state = {}) {
        if (state.fromPopstate || !state.nextPage || state.nextPage === state.currentPage) {
            return createHistoryAction(HISTORY_ACTIONS.NONE);
        }

        if (state.nextPage !== 'timeline') {
            return createHistoryAction(
                state.currentPage === 'timeline' ? HISTORY_ACTIONS.PUSH : HISTORY_ACTIONS.REPLACE,
                { state: { page: state.nextPage } }
            );
        }

        if (state.currentPage !== 'timeline') {
            return createHistoryAction(HISTORY_ACTIONS.BACK, { suppressPopstate: true });
        }

        return createHistoryAction(HISTORY_ACTIONS.NONE);
    }

    function pushState(state) {
        return createHistoryAction(HISTORY_ACTIONS.PUSH, { state });
    }

    function replaceState(state) {
        return createHistoryAction(HISTORY_ACTIONS.REPLACE, { state });
    }

    function consumeState(options = {}) {
        const steps = Math.max(1, Number(options.steps || 1));
        return createHistoryAction(
            steps > 1 ? HISTORY_ACTIONS.GO : HISTORY_ACTIONS.BACK,
            {
                delta: -steps,
                suppressPopstate: options.suppressPopstate !== false
            }
        );
    }

    function getCloseHistoryAction(state = {}) {
        if (state.fromPopstate || !state.wasOpen) {
            return createHistoryAction(HISTORY_ACTIONS.NONE);
        }

        return consumeState({
            steps: state.steps || 1,
            suppressPopstate: true
        });
    }

    return {
        ACTIONS,
        MODAL_ACTIONS,
        HISTORY_ACTIONS,
        getPopstateAction,
        getModalPopstateAction,
        getNavigationHistoryAction,
        pushState,
        replaceState,
        consumeState,
        getCloseHistoryAction
    };
})();
