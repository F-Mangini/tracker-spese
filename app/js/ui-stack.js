/* ============================================
   UI STACK - decisioni pure per back/popstate
   ============================================ */

const UIStack = (() => {
    const ACTIONS = Object.freeze({
        IGNORE: 'ignore',
        CLOSE_CONFIRM: 'close-confirm',
        HANDLE_MODAL: 'handle-modal',
        CLOSE_FILTER_SEARCH: 'close-filter-search',
        CLOSE_EXPENSE_INPUT: 'close-expense-input',
        CLOSE_ADVANCED_FILTERS: 'close-advanced-filters',
        CLOSE_FILTER: 'close-filter',
        NAVIGATE_TIMELINE: 'navigate-timeline',
        NONE: 'none'
    });

    const MODAL_ACTIONS = Object.freeze({
        CLEAR_INTERACTION: 'clear-interaction',
        CLEAR_FIELD: 'clear-field',
        CLOSE_MODAL: 'close-modal'
    });

    function getPopstateAction(state = {}) {
        if (state.suppressNextPopstate) return ACTIONS.IGNORE;
        if (state.confirmOpen) return ACTIONS.CLOSE_CONFIRM;
        if (state.modalOpen) return ACTIONS.HANDLE_MODAL;
        if (state.filterSearchActive) return ACTIONS.CLOSE_FILTER_SEARCH;
        if (state.expenseInputActive) return ACTIONS.CLOSE_EXPENSE_INPUT;
        if (state.advancedFiltersOpen) return ACTIONS.CLOSE_ADVANCED_FILTERS;
        if (state.filterOpen) return ACTIONS.CLOSE_FILTER;
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

    return {
        ACTIONS,
        MODAL_ACTIONS,
        getPopstateAction,
        getModalPopstateAction
    };
})();
