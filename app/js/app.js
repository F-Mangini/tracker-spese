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

        ExpenseStore.init({ storage: Storage, window });
        this.initTheme();
        this.initNavigation();
        this.initInput();
        this.initModal();
        this.initFilters();
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

    runHistoryAction(action) {
        HistoryController.run(action, {
            stack: UIStack,
            history,
            setSuppressPopstate: value => { this._suppressNextPopstate = value; }
        });
    },

    pushUiState(state) {
        this.runHistoryAction(UIStack.pushState(state));
    },

    consumeUiState(steps = 1) {
        this.runHistoryAction(UIStack.consumeState({ steps }));
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
            getSpese: () => ExpenseStore.getSpese(),
            getSliderMax: spese => FilterView.getSliderMax(spese),
            renderChips: items => FilterView.renderChips(items),
            renderFooterInfo: payload => FilterView.renderFooterInfo(payload),
            getQuickTotals: spese => StatsData.getQuickTotals(spese),
            countActiveFilters: () => ExpenseFilters.countActive(this.filters),
            applyFilters: spese => ExpenseFilters.apply(spese, this.filters),
            getFilterModel: () => this.getExpenseFilterModel(),
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

    closeAdvancedFilters(fromPopstate = false) {
        FilterController.closeAdvancedFilters(this.getFilterControllerOptions(), fromPopstate);
    },

    /* --- Dual Range Slider --- */
    recalcSliderMax() {
        FilterController.recalcSliderMax(this.getFilterControllerOptions());
    },

    closeFilterPanel(fromPopstate) {
        FilterController.closeFilterPanel(this.getFilterControllerOptions(), fromPopstate);
    },

    /* --- Filter state --- */
    onFilterChange() {
        const filterModel = this.getExpenseFilterModel();

        this.updateFilterBadge(filterModel);

        if (this.currentPage === 'timeline') this.renderTimeline(filterModel);
        if (this.currentPage === 'stats') this.renderStats(filterModel);
    },

    updateFilterBadge(filterModel = null) {
        FilterController.updateFilterBadge({
            ...this.getFilterControllerOptions(),
            filterModel
        });
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
        ExpenseSubmitController.submit({
            document,
            actions: ExpenseActions,
            parser: Parser,
            storage: Storage,
            categories: CATEGORIES,
            ui: AppUI,
            setNewCardId: id => { this.newCardId = id; },
            refreshAfterAdd: () => this.refreshExpenseViews({ updateFilterSlider: true }),
            showToast: (message, type) => this.showToast(message, type)
        });
    },

    /* =====================
       TIMELINE
       ===================== */
    renderTimeline(filterModel = null) {
        TimelineController.render({
            document,
            spese: filterModel ? filterModel.allSpese : ExpenseStore.getSpese(),
            filterModel,
            newCardId: this.newCardId,
            hasActiveFilters: () => ExpenseFilters.hasActive(this.filters),
            applyFilters: spese => ExpenseFilters.apply(spese, this.filters),
            getQuickTotals: spese => StatsData.getQuickTotals(spese),
            groupByDay: spese => StatsData.groupByDay(spese),
            getCategory: id => AppUI.getCategory(id, CATEGORIES),
            getMethod: id => AppUI.getMethod(id, PAYMENT_METHODS),
            formatDayLabel: date => AppUI.formatDayLabel(date),
            clearNewCardId: () => { this.newCardId = null; },
            openEditModal: id => this.openEditModal(id)
        });
    },

    /* =====================
       EDIT MODAL
       ===================== */
    isModalOpen() {
        return ModalController.isOpen(this.getModalControllerOptions());
    },

    getModalMobileControllerOptions() {
        return {
            document,
            window,
            formController: ModalFormController,
            isModalOpen: () => this.isModalOpen(),
            isFilterOpen: () => this.filterOpen,
            getCurrentPage: () => this.currentPage,
            getLastViewportHeight: () => this._lastViewportHeight,
            setLastViewportHeight: value => { this._lastViewportHeight = value; },
            getKeyboardWatchTimer: () => this._keyboardWatchTimer,
            setKeyboardWatchTimer: value => { this._keyboardWatchTimer = value; },
            isInteractionActive: () => this._modalInteractionActive,
            setInteractionActive: value => { this._modalInteractionActive = value; },
            pushUiState: state => this.pushUiState(state),
            consumeUiState: () => this.consumeUiState(),
            clearSelection: () => this.clearModalSelection(),
            setTimeout: (callback, delay) => setTimeout(callback, delay),
            setInterval: (callback, delay) => setInterval(callback, delay),
            clearInterval: id => clearInterval(id)
        };
    },

    getViewportHeight() {
        return ModalMobileController.getViewportHeight(this.getModalMobileControllerOptions());
    },

    getOpenModalDropdown() {
        return ModalMobileController.getOpenDropdown(this.getModalMobileControllerOptions());
    },

    getActivePlainModalField() {
        return ModalMobileController.getActivePlainField(this.getModalMobileControllerOptions());
    },

    bindNonStickyNativePicker(el) {
        ModalMobileController.bindNonStickyNativePicker(
            el,
            this.getModalMobileControllerOptions()
        );
    },

    pushModalHistoryState() {
        ModalMobileController.pushHistoryState(this.getModalMobileControllerOptions());
    },

    ensureModalInteractionState() {
        ModalMobileController.ensureInteractionState(this.getModalMobileControllerOptions());
    },

    releaseModalInteractionState() {
        ModalMobileController.releaseInteractionState(this.getModalMobileControllerOptions());
    },

    clearModalSelection() {
        ModalMobileController.clearSelection(this.getModalMobileControllerOptions());
    },

    handleModalViewportChange() {
        ModalMobileController.handleViewportChange(this.getModalMobileControllerOptions());
    },

    startModalViewportWatch() {
        ModalMobileController.startViewportWatch(this.getModalMobileControllerOptions());
    },

    stopModalViewportWatch() {
        ModalMobileController.stopViewportWatch(this.getModalMobileControllerOptions());
    },

    getModalControllerOptions() {
        return {
            document,
            window,
            formController: ModalFormController,
            mobileController: ModalMobileController,
            getModalMobileOptions: () => this.getModalMobileControllerOptions(),
            getEditingId: () => this.editingId,
            setEditingId: id => { this.editingId = id; },
            getExpenses: () => ExpenseStore.getSpese(),
            categories: CATEGORIES,
            methods: PAYMENT_METHODS,
            setEditTags: tags => { this._editTags = tags; },
            getEditTags: () => this._editTags,
            initSearchableDropdown: (containerId, items, currentValue) => {
                this.initSearchableDropdown(containerId, items, currentValue);
            },
            initTagInput: () => this.initTagInput(),
            isModalInteractionActive: () => this._modalInteractionActive,
            setModalInteractionActive: value => { this._modalInteractionActive = value; },
            setModalInteractionReleaseSuspended: value => { this._suspendInteractionRelease = value; },
            getViewportHeight: () => this.getViewportHeight(),
            setLastViewportHeight: value => { this._lastViewportHeight = value; },
            startModalViewportWatch: () => this.startModalViewportWatch(),
            stopModalViewportWatch: () => this.stopModalViewportWatch(),
            pushModalHistoryState: () => this.pushModalHistoryState(),
            clearModalSelection: () => this.clearModalSelection(),
            runHistoryAction: action => this.runHistoryAction(action),
            getCloseHistoryAction: payload => UIStack.getCloseHistoryAction(payload),
            parseAmountInput: value => AppUI.parseAmountInput(value),
            getDropdownValue: (id, fallback) => {
                const instance = this._sdInstances[id];
                return instance ? instance.getValue() : fallback;
            },
            updateExpense: data => ExpenseActions.updateExpense({
                id: this.editingId,
                data,
                storage: Storage
            }),
            deleteExpense: () => ExpenseActions.deleteExpense({
                id: this.editingId,
                storage: Storage
            }),
            refreshAfterExpenseChange: () => this.refreshExpenseViews({ updateFilterSlider: true }),
            closeModal: fromPopstate => this.closeModal(fromPopstate),
            saveEdit: () => this.saveEdit(),
            showConfirm: (message, onYes) => this.showConfirm(message, onYes),
            closeConfirm: () => this.closeConfirm(),
            showToast: (message, type) => this.showToast(message, type),
            bindNonStickyNativePicker: el => this.bindNonStickyNativePicker(el),
            handleModalViewportChange: () => this.handleModalViewportChange(),
            handlePopstate: () => this.handlePopstate(),
            toInputDate: date => AppUI.toInputDate(date),
            toInputTime: date => AppUI.toInputTime(date),
            setTimeout: (callback, delay) => setTimeout(callback, delay)
        };
    },

    initModal() {
        ModalController.init(this.getModalControllerOptions());
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

    handlePopstate() {
        UIStackController.handlePopstate(this.getUiStackControllerOptions());
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
            getAllTags: () => ModalView.getAllTags(ExpenseStore.getSpese()),
            getTagStats: () => ModalView.getTagStats(ExpenseStore.getSpese())
        });
    },

    openEditModal(id) {
        ModalController.open(this.getModalControllerOptions(), id);
    },

    closeModal(fromPopstate = false) {
        ModalController.close(this.getModalControllerOptions(), fromPopstate);
    },

    saveEdit() {
        ModalController.save(this.getModalControllerOptions());
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
    renderStats(filterModel = null) {
        const allSpese = filterModel ? filterModel.allSpese : ExpenseStore.getSpese();
        const statsModel = this.getExpenseStatsModel(allSpese);
        const result = StatsController.render({
            document,
            container: document.getElementById('stats-content'),
            spese: allSpese,
            statsModel,
            period: this.statsPeriod,
            offset: this.statsOffset,
            filters: this.filters,
            charts: {
                doughnut: this.chartDoughnut,
                bar: this.chartBar
            },
            ChartClass: typeof Chart === 'undefined' ? null : Chart,
            getCategory: id => AppUI.getCategory(id, CATEGORIES),
            applyNonDateFilters: spese => ExpenseFilters.applyNonDate(spese, this.filters),
            setPeriod: period => { this.statsPeriod = period; },
            setOffset: offset => { this.statsOffset = offset; },
            rerender: () => this.renderStats()
        });

        this.chartDoughnut = result.charts.doughnut;
        this.chartBar = result.charts.bar;
    },

    /* =====================
       SETTINGS
       ===================== */
    renderSettings() {
        SettingsController.render({
            container: document.getElementById('settings-content'),
            storage: Storage,
            getSpese: () => ExpenseStore.getSpese(),
            FileReaderClass: FileReader,
            dateStamp: () => AppUI.dateStamp(),
            download: (content, filename, mime) => DownloadController.download(content, filename, mime, {
                document,
                URL,
                Blob
            }),
            showToast: (message, type) => this.showToast(message, type),
            showChoices: (message, choices) => this.showChoices(message, choices),
            showConfirm: (message, onYes) => this.showConfirm(message, onYes),
            applyTheme: theme => this.applyTheme(theme),
            refreshSettings: () => this.renderSettings(),
            refreshAfterDataChange: () => this.refreshExpenseViews({ includeSettings: true })
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

    refreshExpenseViews(options = {}) {
        AppRefresh.refreshExpenseViews({
            invalidateSpeseCache: () => ExpenseStore.invalidate(),
            updateFilterSlider: !!options.updateFilterSlider,
            isFilterOpen: () => this.filterOpen,
            recalcSliderMax: () => this.recalcSliderMax(),
            getCurrentPage: () => this.currentPage,
            renderTimeline: () => this.renderTimeline(),
            renderStats: () => this.renderStats(),
            includeSettings: !!options.includeSettings,
            renderSettings: () => this.renderSettings()
        });
    },

    /* =====================
       HELPERS
       ===================== */
    getExpenseFilterModel(spese = ExpenseStore.getSpese()) {
        return ExpenseQuery.buildFilterModel({
            spese,
            filters: this.filters
        });
    },

    getExpenseStatsModel(spese = ExpenseStore.getSpese()) {
        return ExpenseQuery.buildStatsModel({
            spese,
            filters: this.filters,
            period: this.statsPeriod,
            offset: this.statsOffset
        });
    }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => App.init());
