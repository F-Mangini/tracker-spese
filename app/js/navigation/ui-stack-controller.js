/* ============================================
   UI STACK CONTROLLER - glue back/popstate
   ============================================ */

const UIStackController = (() => {
    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getStack(options) {
        return options.stack || UIStack;
    }

    function getEffects(options) {
        return options.effects || UIStackEffects;
    }

    function getUiStackSnapshot(options = {}) {
        return {
            suppressNextPopstate: !!(options.getSuppressNextPopstate && options.getSuppressNextPopstate()),
            confirmOpen: !!(options.isConfirmOpen && options.isConfirmOpen()),
            releaseModalOpen: !!(options.isReleaseModalOpen && options.isReleaseModalOpen()),
            modalOpen: !!(options.isModalOpen && options.isModalOpen()),
            filterSearchActive: !!(options.isFilterSearchActive && options.isFilterSearchActive()),
            expenseInputActive: !!(options.isExpenseInputActive && options.isExpenseInputActive()),
            advancedFiltersOpen: !!(options.isAdvancedFiltersOpen && options.isAdvancedFiltersOpen()),
            filterOpen: !!(options.isFilterOpen && options.isFilterOpen()),
            timelineSelectionActive: !!(options.isTimelineSelectionActive && options.isTimelineSelectionActive()),
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

        if (action === stack.ACTIONS.CLOSE_RELEASE_MODAL) {
            (options.closeReleaseModal || noop)(true);
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

        if (action === stack.ACTIONS.CLOSE_TIMELINE_SELECTION) {
            (options.closeTimelineSelection || noop)(true);
            return action;
        }

        if (action === stack.ACTIONS.NAVIGATE_TIMELINE) {
            (options.navigateTo || noop)('timeline', true);
        }

        return action;
    }

    function handlePopstate(options = {}) {
        const action = getStack(options).getPopstateAction(getUiStackSnapshot(options));
        return applyPopstateAction(options, action);
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
