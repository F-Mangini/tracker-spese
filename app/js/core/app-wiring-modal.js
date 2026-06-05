/* ============================================
   APP WIRING MODAL - option factory modale/mobile
   ============================================ */

const AppWiringModal = (() => {
    function create({ app, deps, core }) {
        function modalMobileOptions() {
            return {
                document: deps.document,
                window: deps.window,
                formController: deps.ModalFormController,
                isModalOpen: () => deps.ModalController.isOpen(modalOptions()),
                isFilterOpen: () => app.filterOpen,
                getCurrentPage: () => app.currentPage,
                getLastViewportHeight: () => app._lastViewportHeight,
                setLastViewportHeight: value => { app._lastViewportHeight = value; },
                getKeyboardWatchTimer: () => app._keyboardWatchTimer,
                setKeyboardWatchTimer: value => { app._keyboardWatchTimer = value; },
                isInteractionActive: () => app._modalInteractionActive,
                setInteractionActive: value => { app._modalInteractionActive = value; },
                pushUiState: core.pushUiState,
                consumeUiState: () => core.consumeUiState(),
                clearSelection: () => deps.ModalMobileController.clearSelection(modalMobileOptions()),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay),
                setInterval: (callback, delay) => deps.setInterval(callback, delay),
                clearInterval: id => deps.clearInterval(id)
            };
        }

        function modalOptions() {
            return {
                document: deps.document,
                window: deps.window,
                formController: deps.ModalFormController,
                mobileController: deps.ModalMobileController,
                getModalMobileOptions: () => modalMobileOptions(),
                getEditingId: () => app.editingId,
                setEditingId: id => { app.editingId = id; },
                getExpenses: () => deps.ExpenseStore.getSpese(),
                categories: deps.CATEGORIES,
                methods: deps.PAYMENT_METHODS,
                setEditTags: tags => { app._editTags = tags; },
                getEditTags: () => app._editTags,
                initSearchableDropdown,
                initTagInput,
                releaseFilterSearchBeforeModal: core.releaseFilterSearchBeforeModal,
                isModalInteractionActive: () => app._modalInteractionActive,
                setModalInteractionActive: value => { app._modalInteractionActive = value; },
                setModalInteractionReleaseSuspended: value => { app._suspendInteractionRelease = value; },
                getViewportHeight: () => deps.ModalMobileController.getViewportHeight(modalMobileOptions()),
                setLastViewportHeight: value => { app._lastViewportHeight = value; },
                startModalViewportWatch: () => deps.ModalMobileController.startViewportWatch(modalMobileOptions()),
                stopModalViewportWatch: () => deps.ModalMobileController.stopViewportWatch(modalMobileOptions()),
                pushModalHistoryState: () => deps.ModalMobileController.pushHistoryState(modalMobileOptions()),
                clearModalSelection: () => deps.ModalMobileController.clearSelection(modalMobileOptions()),
                runHistoryAction: core.runHistoryAction,
                getCloseHistoryAction: payload => deps.UIStack.getCloseHistoryAction(payload),
                parseAmountInput: value => deps.AppUI.parseAmountInput(value),
                getDropdownValue: (id, fallback) => {
                    const instance = app._sdInstances[id];
                    return instance ? instance.getValue() : fallback;
                },
                updateExpense: data => deps.ExpenseActions.updateExpense({
                    id: app.editingId,
                    data,
                    storage: deps.Storage
                }),
                deleteExpense: () => deps.ExpenseActions.deleteExpense({
                    id: app.editingId,
                    storage: deps.Storage
                }),
                refreshAfterExpenseChange: () => app.refreshExpenseViews({ updateFilterSlider: true }),
                closeModal: fromPopstate => deps.ModalController.close(modalOptions(), fromPopstate),
                saveEdit: () => deps.ModalController.save(modalOptions()),
                showConfirm: (message, onYes) => deps.ConfirmController.showConfirm({
                    ...core.confirmOptions(),
                    message,
                    onYes
                }),
                isConfirmOpen: () => deps.ConfirmController.isOpen(core.confirmOptions()),
                closeConfirm: () => deps.ConfirmController.close(core.confirmOptions()),
                showToast: (message, type) => app.showToast(message, type),
                bindNonStickyNativePicker: el => deps.ModalMobileController.bindNonStickyNativePicker(
                    el,
                    modalMobileOptions()
                ),
                bindPlainFieldReveal: () => deps.ModalMobileController.bindPlainFieldReveal(modalMobileOptions()),
                handleModalViewportChange: () => deps.ModalMobileController.handleViewportChange(modalMobileOptions()),
                handlePopstate: () => app.handlePopstate(),
                toInputDate: date => deps.AppUI.toInputDate(date),
                toInputTime: date => deps.AppUI.toInputTime(date),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay)
            };
        }

        function modalInteractionHooks() {
            return {
                document: deps.document,
                window: deps.window,
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay),
                revealDropdown: dropdown => deps.ModalMobileController.revealDropdown(
                    dropdown,
                    modalMobileOptions()
                ),
                updateModalViewportLayout: () => deps.ModalMobileController.updateViewportLayout(
                    modalMobileOptions()
                ),
                ensureInteractionState: () => deps.ModalMobileController.ensureInteractionState(modalMobileOptions()),
                releaseInteractionState: () => deps.ModalMobileController.releaseInteractionState(modalMobileOptions()),
                isInteractionActive: () => app._modalInteractionActive,
                isInteractionReleaseSuspended: () => app._suspendInteractionRelease,
                hasOpenDropdown: () => !!deps.ModalMobileController.getOpenDropdown(modalMobileOptions())
            };
        }

        function initSearchableDropdown(containerId, items, currentValue) {
            const instance = deps.ModalInteractions.createSearchableDropdown({
                ...modalInteractionHooks(),
                containerId,
                items,
                currentValue
            });

            if (instance) {
                app._sdInstances[containerId] = instance;
            }
        }

        function initTagInput() {
            deps.ModalInteractions.createTagInput({
                ...modalInteractionHooks(),
                containerId: 'sd-tags',
                chipsId: 'tag-chips',
                getTags: () => app._editTags,
                setTags: tags => { app._editTags = tags; },
                getAllTags: () => deps.ModalView.getAllTags(deps.ExpenseStore.getSpese()),
                getTagStats: () => deps.ModalView.getTagStats(deps.ExpenseStore.getSpese())
            });
        }

        return {
            modalMobileOptions,
            modalOptions,
            modalInteractionHooks,
            initSearchableDropdown,
            initTagInput
        };
    }

    return {
        create
    };
})();
