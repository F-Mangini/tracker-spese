/* ============================================
   MODAL CONTROLLER - lifecycle modifica spesa
   ============================================ */

const ModalController = (() => {
    function getDocument(options) {
        return options.document || document;
    }

    function getWindow(options) {
        return options.window || window;
    }

    function getFormController(options) {
        return options.formController || ModalFormController;
    }

    function getMobileController(options) {
        return options.mobileController || ModalMobileController;
    }

    function isOpen(options = {}) {
        const doc = getDocument(options);
        const overlay = doc.getElementById('modal-overlay');
        const editingId = typeof options.getEditingId === 'function'
            ? options.getEditingId()
            : null;

        return !!overlay && !overlay.classList.contains('hidden') && editingId !== null;
    }

    function init(options = {}) {
        const doc = getDocument(options);
        const win = getWindow(options);
        const formController = getFormController(options);
        const mobileController = getMobileController(options);

        doc.getElementById('modal-close').addEventListener('click', () => {
            options.closeModal();
        });

        doc.getElementById('modal-overlay').addEventListener('click', e => {
            if (e.target.id === 'modal-overlay') options.closeModal();
        });

        doc.getElementById('btn-save').addEventListener('click', () => {
            options.saveEdit();
        });

        doc.getElementById('btn-delete').addEventListener('click', () => {
            options.showConfirm('Eliminare questa spesa?', () => {
                const result = options.deleteExpense();

                if (!result.success) {
                    options.showToast(result.error || 'Eliminazione non riuscita', 'error');
                    return;
                }

                options.closeModal();
                refreshAfterExpenseChange(options);
                options.showToast('Spesa eliminata', 'info');
            });
        });

        doc.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                options.closeModal();
                options.closeConfirm();
            }
        });

        formController.bindPickerFields({
            document: doc,
            bindPicker: el => options.bindNonStickyNativePicker(el),
            getViewportHeight: () => options.getViewportHeight(),
            setLastViewportHeight: value => options.setLastViewportHeight(value)
        });

        const handleViewportResize = () => options.handleModalViewportChange();

        win.addEventListener('resize', handleViewportResize);
        if (win.visualViewport) {
            win.visualViewport.addEventListener('resize', handleViewportResize);
        }

        const blurPickerOnReturn = () => {
            mobileController.blurPickerOnReturn(options.getModalMobileOptions());
        };

        win.addEventListener('focus', blurPickerOnReturn);
        doc.addEventListener('visibilitychange', () => {
            if (doc.visibilityState === 'visible') {
                blurPickerOnReturn();
            }
        });

        win.addEventListener('popstate', () => options.handlePopstate());

        formController.bindPlainFieldEnterBlur({ document: doc });
    }

    function open(options = {}, id) {
        const doc = getDocument(options);
        const spese = options.getExpenses();
        const spesa = spese.find(item => item.id === id);
        if (!spesa) return false;

        options.setEditingId(id);

        getFormController(options).fillForm({
            document: doc,
            spesa,
            toInputDate: date => options.toInputDate(date),
            toInputTime: date => options.toInputTime(date)
        });

        options.initSearchableDropdown('sd-categoria', options.categories, spesa.categoria || 'altro');
        options.initSearchableDropdown('sd-metodo', options.methods, spesa.metodo || 'carta');

        options.setEditTags(Array.isArray(spesa.tags) ? [...spesa.tags] : []);
        options.initTagInput();

        options.setModalInteractionActive(false);
        options.setModalInteractionReleaseSuspended(false);
        options.setLastViewportHeight(options.getViewportHeight());

        doc.getElementById('modal-overlay').classList.remove('hidden');
        doc.body.classList.add('no-scroll');
        options.startModalViewportWatch();
        options.pushModalHistoryState();

        return true;
    }

    function close(options = {}, fromPopstate = false) {
        const doc = getDocument(options);
        const hadInteractionState = options.isModalInteractionActive();

        options.setModalInteractionReleaseSuspended(true);
        options.clearModalSelection();
        options.setModalInteractionReleaseSuspended(false);

        const overlay = doc.getElementById('modal-overlay');
        overlay.classList.add('closing');
        doc.body.classList.remove('no-scroll');
        options.setEditingId(null);
        options.setModalInteractionActive(false);
        options.stopModalViewportWatch();

        options.setTimeout(() => {
            overlay.classList.remove('closing');
            overlay.classList.add('hidden');
        }, 280);

        options.runHistoryAction(options.getCloseHistoryAction({
            fromPopstate,
            wasOpen: true,
            steps: hadInteractionState ? 2 : 1
        }));
    }

    function readForm(options = {}) {
        return getFormController(options).readForm({
            document: getDocument(options),
            parseAmountInput: value => options.parseAmountInput(value),
            getDropdownValue: (id, fallback) => options.getDropdownValue(id, fallback),
            getTags: () => options.getEditTags()
        });
    }

    function refreshAfterExpenseChange(options = {}) {
        if (typeof options.refreshAfterExpenseChange === 'function') {
            options.refreshAfterExpenseChange();
            return;
        }

        if (
            typeof options.isFilterOpen === 'function' &&
            options.isFilterOpen() &&
            typeof options.recalcSliderMax === 'function'
        ) {
            options.recalcSliderMax();
        }

        if (typeof options.renderTimeline === 'function') options.renderTimeline();

        if (
            typeof options.getCurrentPage === 'function' &&
            options.getCurrentPage() === 'stats' &&
            typeof options.renderStats === 'function'
        ) {
            options.renderStats();
        }
    }

    function save(options = {}) {
        const form = readForm(options);
        if (!form.success) {
            options.showToast(form.error, 'error');
            return false;
        }

        const result = options.updateExpense(form.data);

        if (!result.success) {
            options.showToast(result.error || 'Salvataggio non riuscito', 'error');
            return false;
        }

        options.closeModal();
        refreshAfterExpenseChange(options);
        options.showToast('Spesa modificata \u2713', 'success');
        return true;
    }

    return {
        isOpen,
        init,
        open,
        close,
        readForm,
        save
    };
})();
