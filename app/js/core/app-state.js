/* ============================================
   APP STATE - stato UI iniziale
   ============================================ */

const AppState = (() => {
    function createFilters() {
        return {
            query: '',
            categories: new Set(),
            methods: new Set(),
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            selectedOnlyIds: new Set()
        };
    }

    function create() {
        return {
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
            timelineSelectionActive: false,
            timelineSelectedIds: new Set(),
            timelineSelectionDeletePending: false,
            timelineSelectionBaseFilters: null,

            statsPeriod: 'month',
            statsOffset: 0,
            chartDoughnut: null,
            chartBar: null,

            filterOpen: false,
            filters: createFilters(),
            _activeFiltersHistory: false,
            sliderMax: 100,
            _lastSliderInput: 'max',
            advancedFiltersOpen: false,
            _filterSearchActive: false,
            _releasedFilterSearchHistory: false,

            _modalInteractionActive: false,
            _suppressNextPopstate: false,
            _suspendInteractionRelease: false,
            _keyboardWatchTimer: null,
            _expenseInputActive: false,
            _lastViewportHeight: 0,
            _expenseInputBarRaf: null,
            _expenseInputResizeHandler: null,

            _sdInstances: {},
            _editTags: [],

            _wiring: null
        };
    }

    return {
        createFilters,
        create
    };
})();
