/* ============================================
   APP
   ============================================ */
const App = {
    currentPage: 'timeline',
    pageScrollTop: {
        timeline: 0,
        stats: 0,
        settings: 0
    },
    _restoringPageScroll: false,
    editingId: null,
    newCardId: null,

    /* --- Stats --- */
    statsPeriod: 'month',
    statsOffset: 0,
    chartDoughnut: null,
    chartBar: null,

    /* --- Filters (shared across pages) --- */
    filterOpen: false,
    filters: {
        query: '',
        categories: new Set(),
        methods: new Set(),
        amountMin: 0,
        amountMax: Infinity,
        dateFrom: '',
        dateTo: ''
    },
    sliderMax: 100,
    _lastSliderInput: 'max',
    advancedFiltersOpen: false,
    _filterSearchActive: false,

    /* --- Edit modal history/focus --- */
    _modalInteractionActive: false,
    _suppressNextPopstate: false,
    _suspendInteractionRelease: false,
    _keyboardWatchTimer: null,
    _expenseInputActive: false,
    _lastViewportHeight: 0,
    _expenseInputBarRaf: null,
    _expenseInputResizeHandler: null,
    _expenseScrollLockY: 0,

    /* --- Searchable dropdown instances --- */
    _sdInstances: {},

    /* --- Tags --- */
    _editTags: [],

    /* =====================
       INIT
       ===================== */
    init() {
        if (!Storage.isAvailable()) {
            document.body.innerHTML = '<div style="padding:40px;text-align:center"><h2>⚠️ Storage non disponibile</h2></div>';
            return;
        }

        this.initTheme();
        this.initNavigation();
        this.initInput();
        this.initModal();
        this.initFilters();
        this.populateDropdowns();
        this.renderTimeline();
        this._lastViewportHeight = this.getViewportHeight();

        const storageStatus = Storage.getStatus();
        if (!storageStatus.ok) {
            setTimeout(() => {
                this.showToast('Dati locali non leggibili: esporta i dati grezzi dalle impostazioni.', 'error');
            }, 300);
        }

        const header = document.getElementById('app-header');
        if (header) {
            header.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        }
    },

    /* =====================
       THEME
       ===================== */
    initTheme() {
        ThemeController.init({
            storage: Storage,
            document,
            window,
            onTemporaryThemeChange: () => {
                if (this.currentPage === 'stats') this.renderStats();
            }
        });
    },

    applyTheme(theme) {
        ThemeController.applyTheme(theme, { document, window });
    },

    /* =====================
       NAVIGATION
       ===================== */
    getNavigationControllerOptions() {
        return {
            document,
            pageScrollTop: this.pageScrollTop,
            getCurrentPage: () => this.currentPage,
            setCurrentPage: page => { this.currentPage = page; },
            isRestoringPageScroll: () => this._restoringPageScroll,
            setRestoringPageScroll: value => { this._restoringPageScroll = value; },
            getNavigationHistoryAction: payload => UIStack.getNavigationHistoryAction(payload),
            runHistoryAction: action => this.runHistoryAction(action),
            isFilterOpen: () => this.filterOpen,
            closeFilterPanel: () => this.closeFilterPanel(),
            updateAppMainPadding: () => this.updateAppMainPadding(),
            renderTimeline: () => this.renderTimeline(),
            renderStats: () => this.renderStats(),
            renderSettings: () => this.renderSettings(),
            requestAnimationFrame: callback => requestAnimationFrame(callback),
            defer: callback => setTimeout(callback, 0)
        };
    },

    initNavigation() {
        NavigationController.init(this.getNavigationControllerOptions());
    },

    rememberCurrentPageScroll() {
        NavigationController.rememberCurrentPageScroll(this.getNavigationControllerOptions());
    },

    restorePageScroll(page) {
        NavigationController.restorePageScroll(this.getNavigationControllerOptions(), page);
    },

    syncPageDom(page) {
        NavigationController.syncPageDom(this.getNavigationControllerOptions(), page);
    },

    syncPageContent(page) {
        NavigationController.syncPageContent(this.getNavigationControllerOptions(), page);
    },

    runHistoryAction(action) {
        if (!action || action.type === UIStack.HISTORY_ACTIONS.NONE) return;

        if (action.suppressPopstate) {
            this._suppressNextPopstate = true;
        }

        try {
            if (action.type === UIStack.HISTORY_ACTIONS.PUSH) {
                history.pushState(action.state || {}, '');
            } else if (action.type === UIStack.HISTORY_ACTIONS.REPLACE) {
                history.replaceState(action.state || {}, '');
            } else if (action.type === UIStack.HISTORY_ACTIONS.BACK) {
                history.back();
            } else if (action.type === UIStack.HISTORY_ACTIONS.GO) {
                history.go(action.delta || -1);
            }
        } catch (_) {
            if (action.type === UIStack.HISTORY_ACTIONS.GO) {
                try { history.back(); } catch (__) { }
            }
        }
    },

    pushUiState(state) {
        this.runHistoryAction(UIStack.pushState(state));
    },

    consumeUiState(steps = 1) {
        this.runHistoryAction(UIStack.consumeState({ steps }));
    },

    updateNavigationHistory(page, fromPopstate) {
        NavigationController.updateNavigationHistory(
            this.getNavigationControllerOptions(),
            page,
            fromPopstate
        );
    },

    navigateTo(page, fromPopstate = false) {
        NavigationController.navigateTo(
            this.getNavigationControllerOptions(),
            page,
            fromPopstate
        );
    },

    /* =====================
       FILTER PANEL
       ===================== */
    getFilterControllerOptions() {
        return {
            document,
            body: document.body,
            filters: this.filters,
            categories: CATEGORIES,
            methods: PAYMENT_METHODS,
            getSpese: () => Storage.getSpese(),
            getSliderMax: spese => FilterView.getSliderMax(spese),
            renderChips: items => FilterView.renderChips(items),
            renderFooterInfo: payload => FilterView.renderFooterInfo(payload),
            getQuickTotals: spese => StatsData.getQuickTotals(spese),
            countActiveFilters: () => ExpenseFilters.countActive(this.filters),
            applyFilters: spese => this.applyFilters(spese),
            getFilterOpen: () => this.filterOpen,
            setFilterOpen: value => { this.filterOpen = value; },
            getAdvancedFiltersOpen: () => this.advancedFiltersOpen,
            setAdvancedFiltersOpen: value => { this.advancedFiltersOpen = value; },
            getFilterSearchActive: () => this._filterSearchActive,
            setFilterSearchActive: value => { this._filterSearchActive = value; },
            getLastSliderInput: () => this._lastSliderInput,
            setLastSliderInput: value => { this._lastSliderInput = value; },
            getSliderMaxValue: () => this.sliderMax,
            setSliderMaxValue: value => { this.sliderMax = value; },
            setLastViewportHeight: value => { this._lastViewportHeight = value; },
            getViewportHeight: () => this.getViewportHeight(),
            startExpenseInputBarWatch: () => this.startExpenseInputBarWatch(),
            stopExpenseInputBarWatch: () => this.stopExpenseInputBarWatch(),
            pushUiState: state => this.pushUiState(state),
            consumeUiState: () => this.consumeUiState(),
            runHistoryAction: action => this.runHistoryAction(action),
            getCloseHistoryAction: payload => UIStack.getCloseHistoryAction(payload),
            updateAppMainPadding: () => this.updateAppMainPadding(),
            onFilterChange: () => this.onFilterChange(),
            showToast: (message, type) => this.showToast(message, type),
            requestAnimationFrame: callback => requestAnimationFrame(callback)
        };
    },

    initFilters() {
        FilterController.init(this.getFilterControllerOptions());
    },

    toggleAdvancedFilters() {
        FilterController.toggleAdvancedFilters(this.getFilterControllerOptions());
    },

    openAdvancedFilters() {
        FilterController.openAdvancedFilters(this.getFilterControllerOptions());
    },

    closeAdvancedFilters(fromPopstate = false) {
        FilterController.closeAdvancedFilters(this.getFilterControllerOptions(), fromPopstate);
    },

    buildChips(containerId, items, targetSet) {
        FilterController.buildChips(this.getFilterControllerOptions(), containerId, items, targetSet);
    },

    syncFilterUI() {
        FilterController.syncFilterUI(this.getFilterControllerOptions());
    },

    /* --- Dual Range Slider --- */
    initSlider() {
        FilterController.initSlider(this.getFilterControllerOptions());
    },

    recalcSliderMax() {
        FilterController.recalcSliderMax(this.getFilterControllerOptions());
    },

    updateSliderUI(lo, hi) {
        FilterController.updateSliderUI(this.getFilterControllerOptions(), lo, hi);
    },

    openFilterPanel() {
        FilterController.openFilterPanel(this.getFilterControllerOptions());
    },

    closeFilterPanel(fromPopstate) {
        FilterController.closeFilterPanel(this.getFilterControllerOptions(), fromPopstate);
    },

    /* --- Filter state --- */
    onFilterChange() {
        this.updateFilterBadge();

        if (this.currentPage === 'timeline') this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
    },

    getActiveFilterCount() {
        return FilterController.getActiveFilterCount(this.getFilterControllerOptions());
    },

    updateFilterBadge() {
        FilterController.updateFilterBadge(this.getFilterControllerOptions());
    },

    resetFilters() {
        FilterController.resetFilters(this.getFilterControllerOptions());
    },

    /* --- Apply filters --- */
    applyFilters(spese) {
        return ExpenseFilters.apply(spese, this.filters);
    },

    applyNonDateFilters(spese) {
        return ExpenseFilters.applyNonDate(spese, this.filters);
    },

    hasActiveFilters() {
        return ExpenseFilters.hasActive(this.filters);
    },

    getInputBarControllerOptions() {
        return {
            document,
            window,
            isExpenseInputActive: () => this._expenseInputActive,
            isFilterSearchActive: () => this._filterSearchActive,
            isFilterOpen: () => this.filterOpen,
            getRafId: () => this._expenseInputBarRaf,
            setRafId: value => { this._expenseInputBarRaf = value; },
            getResizeHandler: () => this._expenseInputResizeHandler,
            setResizeHandler: value => { this._expenseInputResizeHandler = value; },
            requestAnimationFrame: callback => requestAnimationFrame(callback),
            cancelAnimationFrame: id => cancelAnimationFrame(id),
            setTimeout: (callback, delay) => setTimeout(callback, delay)
        };
    },

    updateAppMainPadding() {
        InputBarController.updateAppMainPadding(this.getInputBarControllerOptions());
    },

    getExpenseInputKeyboardInset() {
        return InputBarController.getKeyboardInset(this.getInputBarControllerOptions());
    },

    updateExpenseInputBarPosition(force = false) {
        InputBarController.updatePosition(this.getInputBarControllerOptions(), force);
    },

    scheduleExpenseInputBarPositionUpdate(force = false) {
        InputBarController.schedulePositionUpdate(this.getInputBarControllerOptions(), force);
    },

    startExpenseInputBarWatch() {
        InputBarController.startWatch(this.getInputBarControllerOptions());
    },

    stopExpenseInputBarWatch() {
        InputBarController.stopWatch(this.getInputBarControllerOptions());
    },

    /* =====================
       INPUT
       ===================== */
    initInput() {
        const controller = ExpenseInputController.init({
            document,
            window,
            onSubmit: () => this.submitExpense(),
            onVoiceError: () => this.showToast('Non ho capito. Riprova.', 'error'),
            isInputActive: () => this._expenseInputActive,
            setInputActive: value => { this._expenseInputActive = value; },
            getViewportHeight: () => this.getViewportHeight(),
            setLastViewportHeight: value => { this._lastViewportHeight = value; },
            pushInputState: () => this.pushUiState({ panel: 'expense-input' }),
            consumeInputState: () => this.consumeUiState(),
            startInputBarWatch: () => this.startExpenseInputBarWatch(),
            stopInputBarWatch: () => this.stopExpenseInputBarWatch(),
            scheduleInputBarPositionUpdate: force => this.scheduleExpenseInputBarPositionUpdate(force),
            updateAppMainPadding: () => this.updateAppMainPadding()
        });

        if (controller && controller.recognition) {
            this.recognition = controller.recognition;
        }
    },

    submitExpense() {
        const input = document.getElementById('expense-input');
        const result = ExpenseActions.addFromText({
            text: input.value,
            parser: Parser,
            storage: Storage
        });

        if (result.reason === 'empty') {
            this.showToast('Scrivi una spesa prima di inviare', 'error');
            return;
        }

        if (result.reason === 'parse') {
            this.showToast('Non ho capito l\'importo. Prova: "caffè 1.50"', 'error');
            return;
        }

        if (!result.success) {
            this.showToast(result.error || 'Salvataggio non riuscito', 'error');
            return;
        }

        const spesa = result.spesa;
        this.newCardId = spesa.id;
        input.value = '';
        try { input.blur(); } catch (_) { }
        try { document.activeElement.blur(); } catch (_) { }

        if (this.filterOpen) this.recalcSliderMax();

        this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();

        const cat = this.getCat(spesa.categoria);
        this.showToast(`${cat.emoji} ${spesa.descrizione} · €${spesa.importo.toFixed(2)}`, 'success');
    },

    /* =====================
       TIMELINE
       ===================== */
    renderTimeline() {
        TimelineController.render({
            document,
            spese: Storage.getSpese(),
            newCardId: this.newCardId,
            hasActiveFilters: () => this.hasActiveFilters(),
            applyFilters: spese => this.applyFilters(spese),
            getQuickTotals: spese => StatsData.getQuickTotals(spese),
            groupByDay: spese => this.groupByDay(spese),
            getCategory: id => this.getCat(id),
            getMethod: id => this.getMet(id),
            formatDayLabel: date => this.formatDayLabel(date),
            clearNewCardId: () => { this.newCardId = null; },
            openEditModal: id => this.openEditModal(id)
        });
    },

    createCard(s) {
        return TimelineController.renderCard(s, {
            newCardId: this.newCardId,
            getCategory: id => this.getCat(id),
            getMethod: id => this.getMet(id),
            clearNewCardId: () => { this.newCardId = null; }
        }).html;
    },

    /* =====================
       EDIT MODAL
       ===================== */
    isModalOpen() {
        const overlay = document.getElementById('modal-overlay');
        return !!overlay && !overlay.classList.contains('hidden') && this.editingId !== null;
    },

    getViewportHeight() {
        if (window.visualViewport && Number.isFinite(window.visualViewport.height)) {
            return window.visualViewport.height;
        }
        return window.innerHeight || document.documentElement.clientHeight || 0;
    },

    getOpenModalDropdown() {
        return document.querySelector('#edit-modal .searchable-dropdown.open');
    },

    getActivePlainModalField() {
        const modal = document.getElementById('edit-modal');
        const el = document.activeElement;

        if (!this.isModalOpen() || !modal || !el || !modal.contains(el)) return null;
        if (el.closest('.searchable-dropdown')) return null;

        if (el.matches('input[type="date"], input[type="time"]')) return null;
        return el.matches('input, textarea, select') ? el : null;
    },

    bindNonStickyNativePicker(el) {
        if (!el || typeof el.showPicker !== 'function') return;

        let openedProgrammatically = false;

        const openPicker = (e) => {
            openedProgrammatically = true;
            e.preventDefault();
            e.stopPropagation();

            if (typeof this.clearModalSelection === 'function') {
                this.clearModalSelection();
            }

            try {
                if (document.activeElement === el) el.blur();
            } catch (_) { }

            try {
                el.classList.add('picker-open');
                el.showPicker();
            } catch (_) {
                openedProgrammatically = false;
                el.classList.remove('picker-open');
                try { el.focus(); } catch (_) { }
                return;
            }

            setTimeout(() => {
                if (document.activeElement === el) {
                    try { el.blur(); } catch (_) { }
                }
                openedProgrammatically = false;
            }, 0);
        };

        el.addEventListener('pointerdown', openPicker);

        const closeVisuals = (e) => {
            if (e.target !== el) {
                el.classList.remove('picker-open');
            }
        };
        document.addEventListener('pointerdown', closeVisuals, { passive: true });
        window.addEventListener('focus', () => el.classList.remove('picker-open'));

        el.addEventListener('focus', (e) => {
            if (!openedProgrammatically) {
                try { el.blur(); } catch (_) { }
                el.classList.remove('picker-open');
                return;
            }

            setTimeout(() => {
                if (document.activeElement === el) {
                    try { el.blur(); } catch (_) { }
                }
            }, 0);
        });

        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (typeof el.showPicker !== 'function') return;
                e.preventDefault();

                if (typeof this.clearModalSelection === 'function') {
                    this.clearModalSelection();
                }

                try {
                    el.classList.add('picker-open');
                    el.showPicker();
                } catch (_) {
                    el.classList.remove('picker-open');
                }
                setTimeout(() => {
                    if (document.activeElement === el) {
                        try { el.blur(); } catch (_) { }
                    }
                }, 0);
            } else if (e.key === 'Escape') {
                el.classList.remove('picker-open');
                try { el.blur(); } catch (_) { }
            }
        });
    },

    pushModalHistoryState() {
        this.pushUiState({ panel: 'modal' });
    },

    ensureModalInteractionState() {
        if (!this.isModalOpen() || this._modalInteractionActive) return;

        this._modalInteractionActive = true;

        this.pushUiState({ panel: 'modal-interaction' });
    },

    releaseModalInteractionState() {
        if (!this._modalInteractionActive) return;

        this._modalInteractionActive = false;
        this.consumeUiState();
    },

    clearModalSelection() {
        const dropdown = this.getOpenModalDropdown();
        if (dropdown) {
            const sdInput = dropdown.querySelector('.sd-input');
            if (sdInput) {
                try { sdInput.blur(); } catch (_) { }
            } else {
                dropdown.classList.remove('open');
            }
        }

        const active = this.getActivePlainModalField();
        if (active) {
            try { active.blur(); } catch (_) { }
        }

        ['edit-data', 'edit-ora'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('picker-open');
        });

        const sel = window.getSelection ? window.getSelection() : null;
        if (sel && sel.rangeCount > 0) {
            try { sel.removeAllRanges(); } catch (_) { }
        }
    },

    handleModalViewportChange() {
        const currentHeight = this.getViewportHeight();
        const prevHeight = this._lastViewportHeight;
        const delta = prevHeight > 0 ? (currentHeight - prevHeight) : 0;

        if (prevHeight > 0) {
            if (this.isModalOpen()) {
                const active = this.getActivePlainModalField();

                if (active) {
                    const type = (active.type || '').toLowerCase();
                    const isTextLike =
                        active.tagName === 'TEXTAREA' ||
                        ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].includes(type);
                    const isPicker = type === 'date' || type === 'time';

                    // Blur solo quando la viewport aumenta molto:
                    // tipico caso di chiusura tastiera/picker, non apertura.
                    if ((isTextLike || isPicker) && delta > 100) {
                        try { active.blur(); } catch (_) { }
                    }
                }
            }

            if (this.filterOpen) {
                const searchInput = document.getElementById('search-input');
                if (searchInput && document.activeElement === searchInput && delta > 100) {
                    try { searchInput.blur(); } catch (_) { }
                }
            }

            if (this.currentPage === 'timeline') {
                const expenseInput = document.getElementById('expense-input');
                if (expenseInput && document.activeElement === expenseInput && delta > 100) {
                    try { expenseInput.blur(); } catch (_) { }
                }
            }
        }

        this._lastViewportHeight = currentHeight;
    },

    startModalViewportWatch() {
        this.stopModalViewportWatch();
        this._lastViewportHeight = this.getViewportHeight();

        this._keyboardWatchTimer = setInterval(() => {
            this.handleModalViewportChange();
        }, 120);
    },

    stopModalViewportWatch() {
        if (this._keyboardWatchTimer) {
            clearInterval(this._keyboardWatchTimer);
            this._keyboardWatchTimer = null;
        }
    },

    initModal() {
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());

        document.getElementById('modal-overlay').addEventListener('click', e => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });

        document.getElementById('btn-save').addEventListener('click', () => this.saveEdit());

        document.getElementById('btn-delete').addEventListener('click', () => {
            this.showConfirm('Eliminare questa spesa?', () => {
                const result = ExpenseActions.deleteExpense({
                    id: this.editingId,
                    storage: Storage
                });

                if (!result.success) {
                    this.showToast(result.error || 'Eliminazione non riuscita', 'error');
                    return;
                }

                if (this.filterOpen) this.recalcSliderMax();

                this.closeModal();
                this.renderTimeline();
                if (this.currentPage === 'stats') this.renderStats();
                this.showToast('Spesa eliminata', 'info');
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeConfirm();
            }
        });

        ModalFormController.bindPickerFields({
            document,
            bindPicker: el => this.bindNonStickyNativePicker(el),
            getViewportHeight: () => this.getViewportHeight(),
            setLastViewportHeight: value => { this._lastViewportHeight = value; }
        });

        const handleViewportResize = () => this.handleModalViewportChange();

        window.addEventListener('resize', handleViewportResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }

        const blurPickerOnReturn = () => {
            ModalFormController.clearPickerVisuals(document);

            if (!this.isModalOpen()) return;

            const active = this.getActivePlainModalField();
            if (!active) return;

            const type = (active.type || '').toLowerCase();
            if (type === 'date' || type === 'time') {
                setTimeout(() => {
                    if (document.activeElement === active) {
                        try { active.blur(); } catch (_) { }
                    }
                }, 0);
            }
        };

        window.addEventListener('focus', blurPickerOnReturn);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                blurPickerOnReturn();
            }
        });

        window.addEventListener('popstate', () => this.handlePopstate());

        ModalFormController.bindPlainFieldEnterBlur({ document });
    },

    getUiStackControllerOptions() {
        return {
            document,
            stack: UIStack,
            effects: UIStackEffects,
            getSuppressNextPopstate: () => this._suppressNextPopstate,
            setSuppressNextPopstate: value => { this._suppressNextPopstate = value; },
            isConfirmOpen: () => this.isConfirmOpen(),
            closeConfirm: fromPopstate => this.closeConfirm(fromPopstate),
            isModalOpen: () => this.isModalOpen(),
            closeModal: fromPopstate => this.closeModal(fromPopstate),
            isFilterSearchActive: () => this._filterSearchActive,
            setFilterSearchActive: value => { this._filterSearchActive = value; },
            isExpenseInputActive: () => this._expenseInputActive,
            setExpenseInputActive: value => { this._expenseInputActive = value; },
            isAdvancedFiltersOpen: () => this.advancedFiltersOpen,
            closeAdvancedFilters: fromPopstate => this.closeAdvancedFilters(fromPopstate),
            isFilterOpen: () => this.filterOpen,
            closeFilterPanel: fromPopstate => this.closeFilterPanel(fromPopstate),
            getCurrentPage: () => this.currentPage,
            navigateTo: (page, fromPopstate) => this.navigateTo(page, fromPopstate),
            stopExpenseInputBarWatch: () => this.stopExpenseInputBarWatch(),
            isModalInteractionActive: () => this._modalInteractionActive,
            setModalInteractionActive: value => { this._modalInteractionActive = value; },
            setModalInteractionReleaseSuspended: value => { this._suspendInteractionRelease = value; },
            hasOpenModalDropdown: () => !!this.getOpenModalDropdown(),
            hasActivePlainModalField: () => !!this.getActivePlainModalField(),
            clearModalSelection: () => this.clearModalSelection(),
            pushModalHistoryState: () => this.pushModalHistoryState()
        };
    },

    getUiStackSnapshot() {
        return UIStackController.getUiStackSnapshot(this.getUiStackControllerOptions());
    },

    applyPopstateAction(action) {
        UIStackController.applyPopstateAction(this.getUiStackControllerOptions(), action);
    },

    handlePopstate() {
        UIStackController.handlePopstate(this.getUiStackControllerOptions());
    },

    closeFilterSearchInteraction() {
        UIStackController.closeFilterSearchInteraction(this.getUiStackControllerOptions());
    },

    closeExpenseInputInteraction() {
        UIStackController.closeExpenseInputInteraction(this.getUiStackControllerOptions());
    },

    getModalStackSnapshot() {
        return UIStackController.getModalStackSnapshot(this.getUiStackControllerOptions());
    },

    applyModalPopstateAction(action) {
        UIStackController.applyModalPopstateAction(this.getUiStackControllerOptions(), action);
    },

    handleModalPopstate() {
        UIStackController.handleModalPopstate(this.getUiStackControllerOptions());
    },

    clearModalInteractionFromPopstate() {
        UIStackController.clearModalInteractionFromPopstate(this.getUiStackControllerOptions());
    },

    clearModalFieldFromPopstate() {
        UIStackController.clearModalFieldFromPopstate(this.getUiStackControllerOptions());
    },

    getModalInteractionHooks() {
        return {
            ensureInteractionState: () => this.ensureModalInteractionState(),
            releaseInteractionState: () => this.releaseModalInteractionState(),
            isInteractionActive: () => this._modalInteractionActive,
            isInteractionReleaseSuspended: () => this._suspendInteractionRelease,
            hasOpenDropdown: () => !!this.getOpenModalDropdown()
        };
    },

    initSearchableDropdown(containerId, items, currentValue) {
        const instance = ModalInteractions.createSearchableDropdown({
            ...this.getModalInteractionHooks(),
            containerId,
            items,
            currentValue
        });

        if (instance) {
            this._sdInstances[containerId] = instance;
        }
    },

    initTagInput() {
        ModalInteractions.createTagInput({
            ...this.getModalInteractionHooks(),
            containerId: 'sd-tags',
            chipsId: 'tag-chips',
            getTags: () => this._editTags,
            setTags: tags => { this._editTags = tags; },
            getAllTags: () => ModalView.getAllTags(Storage.getSpese()),
            getTagStats: () => ModalView.getTagStats(Storage.getSpese())
        });
    },

    populateDropdowns() {
        // Dropdowns are now initialized per-open in openEditModal
    },

    openEditModal(id) {
        const spesa = Storage.getSpese().find(s => s.id === id);
        if (!spesa) return;

        this.editingId = id;

        ModalFormController.fillForm({
            document,
            spesa,
            toInputDate: date => this.toInputDate(date),
            toInputTime: date => this.toInputTime(date)
        });

        this.initSearchableDropdown('sd-categoria', CATEGORIES, spesa.categoria || 'altro');
        this.initSearchableDropdown('sd-metodo', PAYMENT_METHODS, spesa.metodo || 'carta');

        this._editTags = Array.isArray(spesa.tags) ? [...spesa.tags] : [];
        this.initTagInput();

        this._modalInteractionActive = false;
        this._suspendInteractionRelease = false;
        this._lastViewportHeight = this.getViewportHeight();

        document.getElementById('modal-overlay').classList.remove('hidden');
        document.body.classList.add('no-scroll');
        this.startModalViewportWatch();
        this.pushModalHistoryState();
    },

    closeModal(fromPopstate = false) {
        const hadInteractionState = this._modalInteractionActive;

        this._suspendInteractionRelease = true;
        this.clearModalSelection();
        this._suspendInteractionRelease = false;

        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('closing');
        document.body.classList.remove('no-scroll');
        this.editingId = null;
        this._modalInteractionActive = false;
        this.stopModalViewportWatch();

        setTimeout(() => {
            overlay.classList.remove('closing');
            overlay.classList.add('hidden');
        }, 280);

        this.runHistoryAction(UIStack.getCloseHistoryAction({
            fromPopstate,
            wasOpen: true,
            steps: hadInteractionState ? 2 : 1
        }));
    },

    readEditFormData() {
        return ModalFormController.readForm({
            document,
            parseAmountInput: value => this.parseAmountInput(value),
            getDropdownValue: (id, fallback) => {
                const instance = this._sdInstances[id];
                return instance ? instance.getValue() : fallback;
            },
            getTags: () => this._editTags
        });
    },

    saveEdit() {
        const form = this.readEditFormData();
        if (!form.success) {
            this.showToast(form.error, 'error');
            return;
        }

        const result = ExpenseActions.updateExpense({
            id: this.editingId,
            data: form.data,
            storage: Storage
        });

        if (!result.success) {
            this.showToast(result.error || 'Salvataggio non riuscito', 'error');
            return;
        }

        if (this.filterOpen) this.recalcSliderMax();

        this.closeModal();
        this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
        this.showToast('Spesa modificata ✓', 'success');
    },

    /* =====================
       CONFIRM
       ===================== */
    isConfirmOpen() {
        return ConfirmDialog.isOpen(document);
    },

    showChoices(msg, choices) {
        ConfirmDialog.showChoices({
            document,
            message: msg,
            choices,
            pushState: state => this.pushUiState(state),
            close: () => this.closeConfirm()
        });
    },

    showConfirm(msg, onYes, yesText = null, noText = null, yesClass = 'btn-danger') {
        ConfirmDialog.showConfirm({
            document,
            message: msg,
            onYes,
            yesText,
            noText,
            yesClass,
            pushState: state => this.pushUiState(state),
            close: () => this.closeConfirm()
        });
    },

    closeConfirm(fromPopstate = false) {
        ConfirmDialog.close({
            document,
            fromPopstate,
            closeHistory: wasClosedFromPopstate => {
                this.runHistoryAction(UIStack.getCloseHistoryAction({
                    fromPopstate: wasClosedFromPopstate,
                    wasOpen: true
                }));
            }
        });
    },

    /* =============================================
       STATS
       ============================================= */
    getDataBounds(spese) {
        return StatsData.getDataBounds(spese);
    },

    getPeriodDates(allSpese = []) {
        return StatsController.getPeriodDates({
            period: this.statsPeriod,
            offset: this.statsOffset,
            filters: this.filters,
            spese: allSpese
        });
    },

    getActualPeriodEnd(end) {
        return StatsData.getActualPeriodEnd(end);
    },

    getRangeDays(start, end) {
        return StatsData.getRangeDays(start, end);
    },

    getBarAggregation(start, end) {
        return StatsController.getBarAggregation({
            period: this.statsPeriod,
            start,
            end
        });
    },

    getBarChartTitle(start, end) {
        return StatsController.getBarChartTitle({
            period: this.statsPeriod,
            start,
            end
        });
    },

    renderStats() {
        const result = StatsController.render({
            document,
            container: document.getElementById('stats-content'),
            spese: Storage.getSpese(),
            period: this.statsPeriod,
            offset: this.statsOffset,
            filters: this.filters,
            charts: {
                doughnut: this.chartDoughnut,
                bar: this.chartBar
            },
            ChartClass: typeof Chart === 'undefined' ? null : Chart,
            getCategory: id => this.getCat(id),
            applyNonDateFilters: spese => this.applyNonDateFilters(spese),
            setPeriod: period => { this.statsPeriod = period; },
            setOffset: offset => { this.statsOffset = offset; },
            rerender: () => this.renderStats()
        });

        this.chartDoughnut = result.charts.doughnut;
        this.chartBar = result.charts.bar;
    },

    /* =====================
       CHARTS
       ===================== */
    renderCharts(filtered, start, end) {
        const charts = StatsController.renderCharts({
            document,
            ChartClass: typeof Chart === 'undefined' ? null : Chart,
            charts: {
                doughnut: this.chartDoughnut,
                bar: this.chartBar
            },
            filtered,
            start,
            end,
            period: this.statsPeriod,
            getCategory: id => this.getCat(id)
        });

        this.chartDoughnut = charts.doughnut;
        this.chartBar = charts.bar;
    },

    destroyCharts() {
        const charts = StatsController.destroyCharts({
            doughnut: this.chartDoughnut,
            bar: this.chartBar
        });

        this.chartDoughnut = charts.doughnut;
        this.chartBar = charts.bar;
    },

    /* =====================
       SETTINGS
       ===================== */
    renderSettings() {
        SettingsController.render({
            container: document.getElementById('settings-content'),
            storage: Storage,
            FileReaderClass: FileReader,
            dateStamp: () => this.dateStamp(),
            download: (content, filename, mime) => this.download(content, filename, mime),
            showToast: (message, type) => this.showToast(message, type),
            showChoices: (message, choices) => this.showChoices(message, choices),
            showConfirm: (message, onYes) => this.showConfirm(message, onYes),
            applyTheme: theme => this.applyTheme(theme),
            refreshSettings: () => this.renderSettings(),
            refreshAfterDataChange: () => {
                this.renderTimeline();
                if (this.currentPage === 'stats') this.renderStats();
                this.renderSettings();
            }
        });
    },

    /* =====================
       TOAST
       ===================== */
    showToast(message, type = 'info') {
        ToastController.show(message, type, {
            document,
            window,
            isExpenseInputActive: () => this._expenseInputActive
        });
    },

    /* =====================
       HELPERS
       ===================== */
    getCat(id) {
        return AppUI.getCategory(id, CATEGORIES);
    },

    getMet(id) {
        return AppUI.getMethod(id, PAYMENT_METHODS);
    },

    groupByDay(spese) {
        return StatsData.groupByDay(spese);
    },

    dateKey(d) {
        return StatsData.dateKey(d);
    },

    formatDayLabel(dateKey) {
        return AppUI.formatDayLabel(dateKey);
    },

    toInputDate(d) {
        return AppUI.toInputDate(d);
    },

    toInputTime(d) {
        return AppUI.toInputTime(d);
    },

    dateStamp() {
        return AppUI.dateStamp();
    },

    download(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    },

    parseAmountInput(value) {
        return AppUI.parseAmountInput(value);
    },

    esc(str) {
        return AppUI.escapeHtml(str);
    }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => App.init());
