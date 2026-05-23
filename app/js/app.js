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
    recognition: null,

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

    _wiring: null,

    /* =====================
       INIT
       ===================== */
    init() {
        if (!Storage.isAvailable()) {
            document.body.innerHTML = '<div style="padding:40px;text-align:center"><h2>⚠️ Storage non disponibile</h2></div>';
            return;
        }

        const wiring = this.getWiring();

        ExpenseStore.init({ storage: Storage, window });
        ThemeController.init(wiring.themeOptions());
        NavigationController.init(wiring.navigationOptions());
        this.initInput();
        ModalController.init(wiring.modalOptions());
        FilterController.init(wiring.filterOptions());
        this.renderTimeline();
        this._lastViewportHeight = ModalMobileController.getViewportHeight(wiring.modalMobileOptions());

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

    getWiring() {
        if (!this._wiring) {
            this._wiring = AppWiring.create(this);
        }

        return this._wiring;
    },

    /* =====================
       INPUT
       ===================== */
    initInput() {
        const controller = ExpenseInputController.init(this.getWiring().expenseInputOptions());

        if (controller && controller.recognition) {
            this.recognition = controller.recognition;
        }
    },

    submitExpense() {
        ExpenseSubmitController.submit(this.getWiring().expenseSubmitOptions());
    },

    /* =====================
       FILTER PANEL
       ===================== */
    onFilterChange() {
        const filterModel = ExpenseQuery.buildFilterModel({
            spese: ExpenseStore.getSpese(),
            filters: this.filters
        });

        FilterController.updateFilterBadge({
            ...this.getWiring().filterOptions(),
            filterModel
        });

        if (this.currentPage === 'timeline') this.renderTimeline(filterModel);
        if (this.currentPage === 'stats') this.renderStats(filterModel);
    },

    /* =====================
       TIMELINE
       ===================== */
    renderTimeline(filterModel = null) {
        TimelineController.render(this.getWiring().timelineOptions(filterModel));
    },

    /* =====================
       UI STACK / BACK BUTTON
       ===================== */
    handlePopstate() {
        UIStackController.handlePopstate(this.getWiring().uiStackOptions());
    },

    /* =============================================
       STATS
       ============================================= */
    renderStats(filterModel = null) {
        const result = StatsController.render(this.getWiring().statsOptions(filterModel));

        this.chartDoughnut = result.charts.doughnut;
        this.chartBar = result.charts.bar;
    },

    /* =====================
       SETTINGS
       ===================== */
    renderSettings() {
        SettingsController.render(this.getWiring().settingsOptions());
    },

    /* =====================
       TOAST
       ===================== */
    showToast(message, type = 'info') {
        ToastController.show(message, type, this.getWiring().toastOptions());
    },

    refreshExpenseViews(options = {}) {
        AppRefresh.refreshExpenseViews(this.getWiring().refreshOptions(options));
    }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => App.init());
