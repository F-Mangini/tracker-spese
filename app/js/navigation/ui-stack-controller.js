/* ============================================
   UI STACK CONTROLLER - glue back/popstate
   ============================================ */

const UIStackController = (() => {
    function noop() { }
    const ROOT_BACK_BASE_KEY = '__wmmRootBackBase';
    const ROOT_BACK_GUARD_KEY = '__wmmRootBackGuard';

    function getDocument(options) {
        return options.document || document;
    }

    function getStack(options) {
        return options.stack || UIStack;
    }

    function getEffects(options) {
        return options.effects || UIStackEffects;
    }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
    }

    function getHistory(options) {
        return options.history || (typeof history !== 'undefined' ? history : null);
    }

    function getRootGuardEnabled(options) {
        return !!(options.isRootBackGuardEnabled && options.isRootBackGuardEnabled());
    }

    function setRootGuardEnabled(options, value) {
        if (typeof options.setRootBackGuardEnabled === 'function') {
            options.setRootBackGuardEnabled(!!value);
        }
    }

    function isStandaloneDisplay(options = {}) {
        const win = getWindow(options);
        if (!win) return false;

        if (win.navigator && win.navigator.standalone === true) return true;

        if (typeof win.matchMedia !== 'function') return false;

        return !!(
            win.matchMedia('(display-mode: standalone)').matches ||
            win.matchMedia('(display-mode: fullscreen)').matches ||
            win.matchMedia('(display-mode: minimal-ui)').matches
        );
    }

    function isTouchPrimary(options = {}) {
        const win = getWindow(options);
        if (!win || typeof win.matchMedia !== 'function') return false;
        return !!win.matchMedia('(pointer: coarse)').matches;
    }

    function shouldUseRootBackGuard(options = {}) {
        if (typeof options.shouldUseRootBackGuard === 'function') {
            return !!options.shouldUseRootBackGuard();
        }

        return isStandaloneDisplay(options) && isTouchPrimary(options);
    }

    function initRootBackGuard(options = {}) {
        const targetHistory = getHistory(options);
        if (!targetHistory || typeof targetHistory.replaceState !== 'function' ||
            typeof targetHistory.pushState !== 'function') {
            return false;
        }

        if (!shouldUseRootBackGuard(options)) {
            setRootGuardEnabled(options, false);
            return false;
        }

        const currentState = targetHistory.state && typeof targetHistory.state === 'object'
            ? targetHistory.state
            : {};

        if (currentState[ROOT_BACK_BASE_KEY] || currentState[ROOT_BACK_GUARD_KEY]) {
            setRootGuardEnabled(options, true);
            return true;
        }

        targetHistory.replaceState({
            ...currentState,
            [ROOT_BACK_BASE_KEY]: true
        }, '');

        targetHistory.pushState({
            [ROOT_BACK_GUARD_KEY]: true
        }, '');

        setRootGuardEnabled(options, true);
        return true;
    }

    function getUiStackSnapshot(options = {}) {
        return {
            suppressNextPopstate: !!(options.getSuppressNextPopstate && options.getSuppressNextPopstate()),
            confirmOpen: !!(options.isConfirmOpen && options.isConfirmOpen()),
            modalOpen: !!(options.isModalOpen && options.isModalOpen()),
            filterSearchActive: !!(options.isFilterSearchActive && options.isFilterSearchActive()),
            expenseInputActive: !!(options.isExpenseInputActive && options.isExpenseInputActive()),
            advancedFiltersOpen: !!(options.isAdvancedFiltersOpen && options.isAdvancedFiltersOpen()),
            filterOpen: !!(options.isFilterOpen && options.isFilterOpen()),
            currentPage: options.getCurrentPage ? options.getCurrentPage() : null
        };
    }

    function applyPopstateAction(options = {}, action) {
        const stack = getStack(options);

        if (action === stack.ACTIONS.IGNORE) {
            (options.setSuppressNextPopstate || noop)(false);
            return action;
        }

        if (action === stack.ACTIONS.CLOSE_CONFIRM) {
            (options.closeConfirm || noop)(true);
            return action;
        }

        if (action === stack.ACTIONS.HANDLE_MODAL) {
            handleModalPopstate(options);
            return action;
        }

        if (action === stack.ACTIONS.CLOSE_FILTER_SEARCH) {
            closeFilterSearchInteraction(options);
            return action;
        }

        if (action === stack.ACTIONS.CLOSE_EXPENSE_INPUT) {
            closeExpenseInputInteraction(options);
            return action;
        }

        if (action === stack.ACTIONS.CLOSE_ADVANCED_FILTERS) {
            (options.closeAdvancedFilters || noop)(true);
            return action;
        }

        if (action === stack.ACTIONS.CLOSE_FILTER) {
            (options.closeFilterPanel || noop)(true);
            return action;
        }

        if (action === stack.ACTIONS.NAVIGATE_TIMELINE) {
            (options.navigateTo || noop)('timeline', true);
        }

        return action;
    }

    function handleRootBackGuard(options = {}, event = null) {
        if (!getRootGuardEnabled(options)) return false;

        const state = event && event.state && typeof event.state === 'object'
            ? event.state
            : null;

        if (!state || !state[ROOT_BACK_BASE_KEY]) return false;

        const targetHistory = getHistory(options);
        if (!targetHistory || typeof targetHistory.pushState !== 'function') return false;

        targetHistory.pushState({
            [ROOT_BACK_GUARD_KEY]: true
        }, '');

        return true;
    }

    function handlePopstate(options = {}, event = null) {
        const action = getStack(options).getPopstateAction(getUiStackSnapshot(options));
        const applied = applyPopstateAction(options, action);

        if (applied === getStack(options).ACTIONS.NONE && handleRootBackGuard(options, event)) {
            return 'root-back-guard';
        }

        return applied;
    }

    function closeFilterSearchInteraction(options = {}) {
        (options.setFilterSearchActive || noop)(false);
        getEffects(options).closeFilterSearch(getDocument(options));
    }

    function closeExpenseInputInteraction(options = {}) {
        (options.setExpenseInputActive || noop)(false);
        (options.stopExpenseInputBarWatch || noop)();
        getEffects(options).closeExpenseInput(getDocument(options));
    }

    function getModalStackSnapshot(options = {}) {
        return {
            interactionActive: !!(options.isModalInteractionActive && options.isModalInteractionActive()),
            dropdownOpen: !!(options.hasOpenModalDropdown && options.hasOpenModalDropdown()),
            activeField: !!(options.hasActivePlainModalField && options.hasActivePlainModalField())
        };
    }

    function applyModalPopstateAction(options = {}, action) {
        const stack = getStack(options);

        if (action === stack.MODAL_ACTIONS.CLEAR_INTERACTION) {
            clearModalInteractionFromPopstate(options);
            return action;
        }

        if (action === stack.MODAL_ACTIONS.CLEAR_FIELD) {
            clearModalFieldFromPopstate(options);
            return action;
        }

        (options.closeModal || noop)(true);
        return action;
    }

    function handleModalPopstate(options = {}) {
        const action = getStack(options).getModalPopstateAction(getModalStackSnapshot(options));
        return applyModalPopstateAction(options, action);
    }

    function clearModalInteractionFromPopstate(options = {}) {
        getEffects(options).clearModalInteraction({
            clearSelection: options.clearModalSelection,
            setInteractionActive: options.setModalInteractionActive,
            setInteractionReleaseSuspended: options.setModalInteractionReleaseSuspended,
            defer: options.defer
        });
    }

    function clearModalFieldFromPopstate(options = {}) {
        getEffects(options).clearModalField({
            clearSelection: options.clearModalSelection,
            pushModalHistoryState: options.pushModalHistoryState
        });
    }

    return {
        getUiStackSnapshot,
        initRootBackGuard,
        handleRootBackGuard,
        applyPopstateAction,
        handlePopstate,
        closeFilterSearchInteraction,
        closeExpenseInputInteraction,
        getModalStackSnapshot,
        applyModalPopstateAction,
        handleModalPopstate,
        clearModalInteractionFromPopstate,
        clearModalFieldFromPopstate
    };
})();
