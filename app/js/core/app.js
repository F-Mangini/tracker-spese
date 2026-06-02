/* ============================================
   APP
   ============================================ */
const App = {
    ...AppState.create(),

    /* =====================
       INIT
       ===================== */
    init() {
        const launchServiceWorkerReady = SettingsActions.registerLaunchServiceWorker({
            locationLike: window.location,
            navigatorLike: window.navigator,
            setTimeout: window.setTimeout.bind(window)
        });
        const preferredLaunchUrl = SettingsActions.getPreferredLaunchUrl({
            config: window.SPESA_TRACKER_CONFIG || {},
            locationLike: window.location,
            storageLike: window.localStorage
        });

        if (preferredLaunchUrl) {
            launchServiceWorkerReady.then(() => {
                window.location.replace(preferredLaunchUrl);
            }, () => {
                window.location.replace(preferredLaunchUrl);
            });
            return;
        }

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
        TimelineSelectionController.bindHeader(wiring.timelineSelectionOptions());
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
            filters: this.filters,
            selectedIds: this.timelineSelectionActive ? this.timelineSelectedIds : new Set(),
            selectedOnlyIds: this.timelineSelectionActive && this.filters.selectedOnly
                ? this.filters.selectedOnlyIds
                : this.timelineSelectedIds
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
