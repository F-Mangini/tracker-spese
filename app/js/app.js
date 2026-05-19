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
    toastTimer: null,
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
        const saved = Storage.getSettings().tema || 'auto';
        this.applyTheme(saved);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';

            this.applyTheme(next);

            if (this.currentPage === 'stats') this.renderStats();
        });
    },

    applyTheme(theme) {
        if (theme === 'auto') {
            document.documentElement.setAttribute(
                'data-theme',
                window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            );
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    },

    /* =====================
       NAVIGATION
       ===================== */
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
        });

        this.setupPageScrollTracking();
    },

    setupPageScrollTracking() {
        const main = document.getElementById('app-main');
        if (!main) return;

        main.addEventListener('scroll', () => {
            if (this._restoringPageScroll) return;
            this.pageScrollTop[this.currentPage] = main.scrollTop;
        }, { passive: true });
    },

    rememberCurrentPageScroll() {
        const main = document.getElementById('app-main');
        if (!main || !this.currentPage) return;

        this.pageScrollTop[this.currentPage] = main.scrollTop;
    },

    restorePageScroll(page) {
        const main = document.getElementById('app-main');
        if (!main) return;

        const top = this.pageScrollTop[page] || 0;

        requestAnimationFrame(() => {
            this._restoringPageScroll = true;
            main.scrollTop = top;

            setTimeout(() => {
                this._restoringPageScroll = false;
            }, 0);
        });
    },

    syncPageDom(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + page).classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

        const inputBar = document.getElementById('input-bar');
        const main = document.getElementById('app-main');

        if (page === 'timeline') {
            inputBar.classList.remove('hidden');
            main.classList.remove('no-input-bar');
        } else {
            inputBar.classList.add('hidden');
            main.classList.add('no-input-bar');
        }

        document.getElementById('btn-filter-toggle').style.display =
            page === 'settings' ? 'none' : '';
    },

    syncPageContent(page) {
        if (page === 'timeline') this.renderTimeline();
        if (page === 'stats') this.renderStats();
        if (page === 'settings') this.renderSettings();
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
        this.runHistoryAction(UIStack.getNavigationHistoryAction({
            fromPopstate,
            currentPage: this.currentPage,
            nextPage: page
        }));
    },

    navigateTo(page, fromPopstate = false) {
        if (!page) return;

        this.rememberCurrentPageScroll();
        this.updateNavigationHistory(page, fromPopstate);
        this.currentPage = page;
        this.syncPageDom(page);

        if (page === 'settings' && this.filterOpen) this.closeFilterPanel();

        this.updateAppMainPadding();
        this.syncPageContent(page);
        this.restorePageScroll(page);
    },

    /* =====================
       FILTER PANEL
       ===================== */
    initFilters() {
        const toggleBtn = document.getElementById('btn-filter-toggle');
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('btn-search-clear');
        const resetBtn = document.getElementById('btn-filter-reset');
        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        toggleBtn.addEventListener('click', () => {
            if (this.filterOpen) this.closeFilterPanel();
            else this.openFilterPanel();
        });

        searchInput.addEventListener('input', () => {
            this.filters.query = searchInput.value.trim();
            clearBtn.classList.toggle('hidden', !this.filters.query);
            this.onFilterChange();
        });

        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchInput.blur();
            }
        });

        searchInput.addEventListener('focus', () => {
            this._lastViewportHeight = this.getViewportHeight();

            if (this.filterOpen && !this._filterSearchActive) {
                this._filterSearchActive = true;
                this.startExpenseInputBarWatch();
                this.pushUiState({ panel: 'filter-search' });
            }
        });

        searchInput.addEventListener('blur', () => {
            if (this._filterSearchActive) {
                this._filterSearchActive = false;
                this.stopExpenseInputBarWatch();
                this.consumeUiState();
            }
        });

        const handleClear = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (searchInput.value === '') return;
            searchInput.value = '';
            this.filters.query = '';
            clearBtn.classList.add('hidden');
            this.onFilterChange();
        };

        clearBtn.addEventListener('mousedown', handleClear);
        clearBtn.addEventListener('touchstart', handleClear, { passive: false });
        clearBtn.addEventListener('click', handleClear);

        this.buildChips('filter-cats', CATEGORIES, this.filters.categories);
        this.buildChips('filter-methods', PAYMENT_METHODS, this.filters.methods);

        this.initSlider();

        [dateFrom, dateTo].forEach(el => {
            el.addEventListener('click', () => {
                el.classList.remove('date-picked');
            });

            el.addEventListener('change', () => {
                el.classList.add('date-picked');
                if (el === dateFrom) this.filters.dateFrom = el.value;
                else this.filters.dateTo = el.value;
                this.onFilterChange();
                try { el.blur(); } catch (_) { }
            });
        });

        resetBtn.addEventListener('click', () => this.resetFilters());

        const advToggle = document.getElementById('btn-advanced-toggle');
        advToggle.addEventListener('click', () => this.toggleAdvancedFilters());

        this.syncFilterUI();
        this.updateFilterBadge();

        const panel = document.getElementById('filter-panel');
        if (panel) {
            panel.addEventListener('touchmove', (e) => {
                if (!e.target.closest('.filter-panel-scroll')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    },

    toggleAdvancedFilters() {
        if (this.advancedFiltersOpen) {
            this.closeAdvancedFilters(false);
        } else {
            this.openAdvancedFilters();
        }
    },

    openAdvancedFilters() {
        this.advancedFiltersOpen = true;
        const section = document.getElementById('advanced-filters');
        const btn = document.getElementById('btn-advanced-toggle');

        section.classList.remove('hidden');
        btn.classList.add('active');
        document.body.classList.add('no-scroll');
        this.pushUiState({ panel: 'advanced-filters' });

        requestAnimationFrame(() => {
            const panel = document.getElementById('filter-panel');
            const h = panel.offsetHeight;
            document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;

            const scrollContainer = panel.querySelector('.filter-panel-scroll');
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            this.updateAppMainPadding();
        });
    },

    closeAdvancedFilters(fromPopstate = false) {
        if (!this.advancedFiltersOpen) return;

        this.advancedFiltersOpen = false;
        document.getElementById('advanced-filters').classList.add('hidden');
        document.getElementById('btn-advanced-toggle').classList.remove('active');
        document.body.classList.remove('no-scroll');

        requestAnimationFrame(() => {
            const panel = document.getElementById('filter-panel');
            if (!panel || panel.classList.contains('hidden')) return;

            const h = panel.offsetHeight;
            document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;
            this.updateAppMainPadding();
        });

        this.runHistoryAction(UIStack.getCloseHistoryAction({
            fromPopstate,
            wasOpen: true
        }));
    },

    buildChips(containerId, items, targetSet) {
        const container = document.getElementById(containerId);

        container.innerHTML = FilterView.renderChips(items);

        container.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;

                if (targetSet.has(id)) {
                    targetSet.delete(id);
                    chip.classList.remove('active');
                } else {
                    targetSet.add(id);
                    chip.classList.add('active');
                }

                this.onFilterChange();
            });
        });
    },

    syncFilterUI() {
        document.getElementById('search-input').value = this.filters.query;
        document.getElementById('btn-search-clear').classList.toggle('hidden', !this.filters.query);
        document.getElementById('filter-date-from').value = this.filters.dateFrom;
        document.getElementById('filter-date-to').value = this.filters.dateTo;
        document.getElementById('filter-date-from').classList.toggle('date-picked', !!this.filters.dateFrom);
        document.getElementById('filter-date-to').classList.toggle('date-picked', !!this.filters.dateTo);

        document.querySelectorAll('#filter-cats .filter-chip').forEach(chip => {
            chip.classList.toggle('active', this.filters.categories.has(chip.dataset.id));
        });

        document.querySelectorAll('#filter-methods .filter-chip').forEach(chip => {
            chip.classList.toggle('active', this.filters.methods.has(chip.dataset.id));
        });

        this.recalcSliderMax();
    },

    /* --- Dual Range Slider --- */
    initSlider() {
        this.recalcSliderMax();

        const sMin = document.getElementById('slider-min');
        const sMax = document.getElementById('slider-max');

        const update = () => {
            let lo = Number(sMin.value);
            let hi = Number(sMax.value);

            if (lo > hi) {
                if (this._lastSliderInput === 'min') {
                    sMin.value = String(hi);
                    lo = hi;
                } else {
                    sMax.value = String(lo);
                    hi = lo;
                }
            }

            this.filters.amountMin = lo;
            this.filters.amountMax = hi >= this.sliderMax ? Infinity : hi;

            this.updateSliderUI(lo, hi);
            this.onFilterChange();
        };

        sMin.addEventListener('input', () => {
            this._lastSliderInput = 'min';
            update();
        });

        sMax.addEventListener('input', () => {
            this._lastSliderInput = 'max';
            update();
        });
    },

    recalcSliderMax() {
        const spese = Storage.getSpese();
        this.sliderMax = FilterView.getSliderMax(spese);

        const sMin = document.getElementById('slider-min');
        const sMax = document.getElementById('slider-max');

        if (!sMin || !sMax) return;

        sMin.max = String(this.sliderMax);
        sMax.max = String(this.sliderMax);

        const hadInfinity = this.filters.amountMax === Infinity;

        let lo = Number.isFinite(this.filters.amountMin) ? this.filters.amountMin : 0;
        let hi = hadInfinity
            ? this.sliderMax
            : (Number.isFinite(this.filters.amountMax) ? this.filters.amountMax : this.sliderMax);

        lo = Math.max(0, Math.min(lo, this.sliderMax));
        hi = Math.max(0, Math.min(hi, this.sliderMax));

        if (lo > hi) lo = hi;

        this.filters.amountMin = lo;
        this.filters.amountMax = hadInfinity ? Infinity : hi;

        sMin.value = String(lo);
        sMax.value = String(hi);

        this.updateSliderUI(lo, hi);
    },

    updateSliderUI(lo, hi) {
        const fill = document.getElementById('ds-fill');
        const pctL = (lo / this.sliderMax) * 100;
        const pctR = (hi / this.sliderMax) * 100;

        fill.style.left = pctL + '%';
        fill.style.width = (pctR - pctL) + '%';

        document.getElementById('slider-val-min').textContent = '€' + lo;

        const isOpenEnded = this.filters.amountMax === Infinity && hi >= this.sliderMax;
        document.getElementById('slider-val-max').textContent =
            isOpenEnded ? `€${this.sliderMax}+` : `€${hi}`;
    },

    openFilterPanel() {
        this.filterOpen = true;
        this.syncFilterUI();

        const panel = document.getElementById('filter-panel');
        panel.classList.remove('hidden');
        document.getElementById('btn-filter-toggle').classList.add('active');

        this.pushUiState({ panel: 'filter' });

        const summary = document.getElementById('timeline-summary');
        if (summary) summary.classList.add('hidden');

        const pageTimeline = document.getElementById('page-timeline');
        if (pageTimeline) pageTimeline.classList.add('filter-open');

        requestAnimationFrame(() => {
            const h = panel.offsetHeight;
            document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;
            this.updateAppMainPadding();
        });
    },

    closeFilterPanel(fromPopstate) {
        const wasOpen = this.filterOpen;
        const hadAdvancedFilters = this.advancedFiltersOpen;
        this.filterOpen = false;
        this.advancedFiltersOpen = false;
        document.getElementById('filter-panel').classList.add('hidden');
        document.getElementById('btn-filter-toggle').classList.remove('active');
        document.getElementById('advanced-filters').classList.add('hidden');
        document.getElementById('btn-advanced-toggle').classList.remove('active');
        document.body.classList.remove('no-scroll');

        const summary = document.getElementById('timeline-summary');
        if (summary) summary.classList.remove('hidden');

        const pageTimeline = document.getElementById('page-timeline');
        if (pageTimeline) pageTimeline.classList.remove('filter-open');

        document.getElementById('app-main').style.marginTop = '';
        this.runHistoryAction(UIStack.getCloseHistoryAction({
            fromPopstate,
            wasOpen,
            steps: hadAdvancedFilters ? 2 : 1
        }));
        this.updateAppMainPadding();
    },

    /* --- Filter state --- */
    onFilterChange() {
        this.updateFilterBadge();

        if (this.currentPage === 'timeline') this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
    },

    getActiveFilterCount() {
        return ExpenseFilters.countActive(this.filters);
    },

    updateFilterBadge() {
        const n = this.getActiveFilterCount();
        const badge = document.getElementById('filter-badge');
        const resetBtn = document.getElementById('btn-filter-reset');
        const info = document.getElementById('filter-info');
        const allSpese = Storage.getSpese();

        if (n > 0) {
            badge.textContent = n;
            badge.classList.remove('hidden');
            resetBtn.classList.remove('hidden');

            const filtered = this.applyFilters(allSpese);
            info.textContent = FilterView.renderFooterInfo({
                activeCount: n,
                filtered
            });
        } else {
            badge.classList.add('hidden');
            resetBtn.classList.add('hidden');

            info.textContent = FilterView.renderFooterInfo({
                activeCount: n,
                quickTotals: StatsData.getQuickTotals(allSpese)
            });
        }
    },

    resetFilters() {
        this.filters.query = '';
        this.filters.categories.clear();
        this.filters.methods.clear();
        this.filters.amountMin = 0;
        this.filters.amountMax = Infinity;
        this.filters.dateFrom = '';
        this.filters.dateTo = '';

        this.syncFilterUI();
        this.onFilterChange();
        this.showToast('Filtri resettati', 'info');
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

    updateAppMainPadding() {
        const main = document.getElementById('app-main');
        if (!main) return;

        let paddingCalc = 'calc(';
        if (main.classList.contains('no-input-bar')) {
            paddingCalc += 'var(--nav-h) + var(--safe-bottom)';
        } else {
            paddingCalc += 'var(--input-h) + var(--nav-h) + var(--safe-bottom)';
        }

        if (this._expenseInputActive || this._filterSearchActive) {
            const inset = this.getExpenseInputKeyboardInset();
            if (inset > 0) {
                paddingCalc += ` + ${inset}px - var(--nav-h)`;
            }
        }

        if (this.filterOpen) {
            const panel = document.getElementById('filter-panel');
            if (panel && !panel.classList.contains('hidden')) {
                const h = panel.offsetHeight;
                paddingCalc += ` + ${h}px`;
            }
        }

        paddingCalc += ')';
        main.style.paddingBottom = paddingCalc;
    },

    getExpenseInputKeyboardInset() {
        const vv = window.visualViewport;

        if (!vv || !Number.isFinite(vv.height)) return 0;

        const inset = window.innerHeight - (vv.offsetTop + vv.height);
        return Math.max(0, Math.round(inset));
    },

    updateExpenseInputBarPosition(force = false) {
        this.updateAppMainPadding();
        const inputBar = document.getElementById('input-bar');
        if (!inputBar) return;

        const main = document.getElementById('app-main');

        if (!this._expenseInputActive) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
            return;
        }

        const inset = this.getExpenseInputKeyboardInset();

        // Finché la tastiera non è davvero aperta, lasciamo la barra
        // nella posizione CSS normale sopra la bottom nav.
        if (inset <= 0) {
            if (!force && inputBar.style.bottom === '' && inputBar.style.transform === '') {
                return;
            }
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
            return;
        }

        const nextBottom = `${inset}px`;

        if (!force && inputBar.style.bottom === nextBottom && inputBar.style.transform === 'none') {
            return;
        }

        inputBar.style.bottom = nextBottom;
        inputBar.style.transform = 'none';
    },

    scheduleExpenseInputBarPositionUpdate(force = false) {
        if (this._expenseInputBarRaf) {
            cancelAnimationFrame(this._expenseInputBarRaf);
        }

        this._expenseInputBarRaf = requestAnimationFrame(() => {
            this._expenseInputBarRaf = null;
            this.updateExpenseInputBarPosition(force);
        });
    },

    startExpenseInputBarWatch() {
        this.stopExpenseInputBarWatch();

        this._expenseInputResizeHandler = () => {
            this.scheduleExpenseInputBarPositionUpdate();
        };

        // Ascoltiamo solo i resize della viewport/tastiera
        window.addEventListener('resize', this._expenseInputResizeHandler, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this._expenseInputResizeHandler, { passive: true });
        }

        // Primo sync: se inset = 0 la barra resta dov'è.
        this.scheduleExpenseInputBarPositionUpdate(true);

        setTimeout(() => {
            if (this._expenseInputActive) this.scheduleExpenseInputBarPositionUpdate(true);
        }, 60);

        setTimeout(() => {
            if (this._expenseInputActive) this.scheduleExpenseInputBarPositionUpdate(true);
        }, 160);

        setTimeout(() => {
            if (this._expenseInputActive) this.scheduleExpenseInputBarPositionUpdate(true);
        }, 320);
    },

    stopExpenseInputBarWatch() {
        if (this._expenseInputBarRaf) {
            cancelAnimationFrame(this._expenseInputBarRaf);
            this._expenseInputBarRaf = null;
        }

        if (this._expenseInputResizeHandler) {
            window.removeEventListener('resize', this._expenseInputResizeHandler);

            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', this._expenseInputResizeHandler);
            }

            this._expenseInputResizeHandler = null;
        }

        const inputBar = document.getElementById('input-bar');
        if (inputBar) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
        }

        this.updateAppMainPadding();
    },

    /* =====================
       INPUT
       ===================== */
    initInput() {
        const input = document.getElementById('expense-input');
        const btnSend = document.getElementById('btn-send');
        const btnVoice = document.getElementById('btn-voice');
        const inputBar = document.getElementById('input-bar');

        // Previene lo scroll (e il conseguente effetto elastico su iOS/Android)
        // quando si trascina la barra di inserimento
        inputBar.addEventListener('touchmove', (e) => {
            // Blocca sempre il touchmove per evitare qualsiasi scroll elastico
            e.preventDefault();
        }, { passive: false });

        /*
         * Mobile button strategy:
         * - touchstart: add .pressed class (visual only, NO preventDefault)
         * - touchend: remove .pressed, preventDefault (stops stale click), run action
         * - click: desktop fallback (runs only if no prior touchend)
         */
        let touchHandled = false;
        let blurCleanupTimer = null;

        // --- Send button ---
        btnSend.addEventListener('touchstart', () => {
            btnSend.classList.add('pressed');
        }, { passive: true });

        btnSend.addEventListener('touchend', (e) => {
            btnSend.classList.remove('pressed');
            e.preventDefault();
            touchHandled = true;
            this.submitExpense();
        });

        btnSend.addEventListener('click', () => {
            if (touchHandled) { touchHandled = false; return; }
            this.submitExpense();
        });

        // --- Keyboard Enter ---
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitExpense();
            }
        });

        // --- Input bar positioning ---
        const doBlurCleanup = () => {
            document.body.classList.remove('expense-input-active');
            this.stopExpenseInputBarWatch();
            this._expenseInputActive = false;
            this.updateAppMainPadding();

            blurCleanupTimer = setTimeout(() => {
                this.consumeUiState();
            }, 300);
        };

        input.addEventListener('focus', () => {
            if (blurCleanupTimer) {
                clearTimeout(blurCleanupTimer);
                blurCleanupTimer = null;
            }

            const wasInactive = !this._expenseInputActive;
            this._expenseInputActive = true;
            this._lastViewportHeight = this.getViewportHeight();

            document.body.classList.add('expense-input-active');

            if (wasInactive) {
                this.pushUiState({ panel: 'expense-input' });
            }

            this.startExpenseInputBarWatch();
            this.scheduleExpenseInputBarPositionUpdate(true);
        });

        input.addEventListener('blur', () => {
            if (!this._expenseInputActive) return;
            doBlurCleanup();
        });

        // --- Voice button ---
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

            this.recognition = new SR();
            this.recognition.lang = 'it-IT';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = e => {
                input.value = e.results[0][0].transcript;
                btnVoice.classList.remove('recording');
                this.submitExpense();
            };

            this.recognition.onerror = () => {
                btnVoice.classList.remove('recording');
                this.showToast('Non ho capito. Riprova.', 'error');
            };

            this.recognition.onend = () => {
                btnVoice.classList.remove('recording');
            };

            const toggleVoice = () => {
                if (btnVoice.classList.contains('recording')) {
                    this.recognition.stop();
                } else {
                    btnVoice.classList.add('recording');
                    this.recognition.start();
                }
            };

            btnVoice.addEventListener('touchstart', () => {
                btnVoice.classList.add('pressed');
            }, { passive: true });

            btnVoice.addEventListener('touchend', (e) => {
                btnVoice.classList.remove('pressed');
                e.preventDefault();
                touchHandled = true;
                toggleVoice();
            });

            btnVoice.addEventListener('click', () => {
                if (touchHandled) { touchHandled = false; return; }
                toggleVoice();
            });
        } else {
            btnVoice.style.display = 'none';
        }
    },

    submitExpense() {
        const input = document.getElementById('expense-input');
        const text = input.value.trim();

        if (!text) {
            this.showToast('Scrivi una spesa prima di inviare', 'error');
            return;
        }

        const parsed = Parser.parse(text);
        if (!parsed) {
            this.showToast('Non ho capito l\'importo. Prova: "caffè 1.50"', 'error');
            return;
        }

        const result = Storage.addSpesa(parsed);
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
        const allSpese = Storage.getSpese();
        const isFiltered = this.hasActiveFilters();
        const filtered = isFiltered ? this.applyFilters(allSpese) : allSpese;
        const content = document.getElementById('timeline-content');
        const empty = document.getElementById('timeline-empty');
        const summary = document.getElementById('timeline-summary');

        if (allSpese.length === 0) {
            content.innerHTML = '';
            summary.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        summary.innerHTML = TimelineView.renderSummary({
            isFiltered,
            filtered,
            quickTotals: StatsData.getQuickTotals(allSpese)
        });

        if (filtered.length === 0 && isFiltered) {
            content.innerHTML = TimelineView.renderFilteredEmpty();
            return;
        }

        const groups = this.groupByDay(filtered);
        const newCardId = this.newCardId;

        content.innerHTML = TimelineView.renderGroups(groups, {
            newCardId,
            getCategory: id => this.getCat(id),
            getMethod: id => this.getMet(id),
            formatDayLabel: date => this.formatDayLabel(date)
        });

        if (newCardId && filtered.some(spesa => spesa.id === newCardId)) {
            this.newCardId = null;
        }

        content.querySelectorAll('.expense-card').forEach(card => {
            card.addEventListener('click', () => this.openEditModal(card.dataset.id));
        });
    },

    createCard(s) {
        const isNew = s.id === this.newCardId;
        if (isNew) this.newCardId = null;

        return TimelineView.renderExpenseCard(s, {
            category: this.getCat(s.categoria),
            method: this.getMet(s.metodo),
            isNew
        });
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
                const result = Storage.deleteSpesa(this.editingId);
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

        ['edit-data', 'edit-ora'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            this.bindNonStickyNativePicker(el);

            el.addEventListener('change', () => {
                el.classList.remove('picker-open');
                setTimeout(() => {
                    if (document.activeElement === el) {
                        try { el.blur(); } catch (_) { }
                    }
                }, 0);
            });

            el.addEventListener('focus', () => {
                this._lastViewportHeight = this.getViewportHeight();
            });
        });

        const handleViewportResize = () => this.handleModalViewportChange();

        window.addEventListener('resize', handleViewportResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }

        const blurPickerOnReturn = () => {
            ['edit-data', 'edit-ora'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('picker-open');
            });

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

        ['edit-importo', 'edit-descrizione', 'edit-nota'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        el.blur();
                    }
                });
            }
        });
    },

    getUiStackSnapshot() {
        return {
            suppressNextPopstate: this._suppressNextPopstate,
            confirmOpen: this.isConfirmOpen(),
            modalOpen: this.isModalOpen(),
            filterSearchActive: this._filterSearchActive,
            expenseInputActive: this._expenseInputActive,
            advancedFiltersOpen: this.advancedFiltersOpen,
            filterOpen: this.filterOpen,
            currentPage: this.currentPage
        };
    },

    applyPopstateAction(action) {
        if (action === UIStack.ACTIONS.IGNORE) {
            this._suppressNextPopstate = false;
            return;
        }

        if (action === UIStack.ACTIONS.CLOSE_CONFIRM) {
            this.closeConfirm(true);
            return;
        }

        if (action === UIStack.ACTIONS.HANDLE_MODAL) {
            this.handleModalPopstate();
            return;
        }

        if (action === UIStack.ACTIONS.CLOSE_FILTER_SEARCH) {
            this.closeFilterSearchInteraction();
            return;
        }

        if (action === UIStack.ACTIONS.CLOSE_EXPENSE_INPUT) {
            this.closeExpenseInputInteraction();
            return;
        }

        if (action === UIStack.ACTIONS.CLOSE_ADVANCED_FILTERS) {
            this.closeAdvancedFilters(true);
            return;
        }

        if (action === UIStack.ACTIONS.CLOSE_FILTER) {
            this.closeFilterPanel(true);
            return;
        }

        if (action === UIStack.ACTIONS.NAVIGATE_TIMELINE) {
            this.navigateTo('timeline', true);
        }
    },

    handlePopstate() {
        this.applyPopstateAction(UIStack.getPopstateAction(this.getUiStackSnapshot()));
    },

    closeFilterSearchInteraction() {
        this._filterSearchActive = false;
        UIStackEffects.closeFilterSearch(document);
    },

    closeExpenseInputInteraction() {
        this._expenseInputActive = false;
        this.stopExpenseInputBarWatch();
        UIStackEffects.closeExpenseInput(document);
    },

    getModalStackSnapshot() {
        return {
            interactionActive: this._modalInteractionActive,
            dropdownOpen: !!this.getOpenModalDropdown(),
            activeField: !!this.getActivePlainModalField()
        };
    },

    applyModalPopstateAction(action) {
        if (action === UIStack.MODAL_ACTIONS.CLEAR_INTERACTION) {
            this.clearModalInteractionFromPopstate();
            return;
        }

        if (action === UIStack.MODAL_ACTIONS.CLEAR_FIELD) {
            this.clearModalFieldFromPopstate();
            return;
        }

        this.closeModal(true);
    },

    handleModalPopstate() {
        this.applyModalPopstateAction(UIStack.getModalPopstateAction(this.getModalStackSnapshot()));
    },

    clearModalInteractionFromPopstate() {
        UIStackEffects.clearModalInteraction({
            clearSelection: () => this.clearModalSelection(),
            setInteractionActive: value => { this._modalInteractionActive = value; },
            setInteractionReleaseSuspended: value => { this._suspendInteractionRelease = value; }
        });
    },

    clearModalFieldFromPopstate() {
        UIStackEffects.clearModalField({
            clearSelection: () => this.clearModalSelection(),
            pushModalHistoryState: () => this.pushModalHistoryState()
        });
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

        const d = new Date(spesa.data);
        document.getElementById('edit-importo').value = spesa.importo;
        document.getElementById('edit-descrizione').value = spesa.descrizione;
        document.getElementById('edit-data').value = this.toInputDate(d);
        document.getElementById('edit-ora').value = this.toInputTime(d);
        document.getElementById('edit-nota').value = spesa.nota || '';

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
        const importo = this.parseAmountInput(document.getElementById('edit-importo').value);

        if (!importo || importo <= 0) {
            return { success: false, error: 'Importo non valido' };
        }

        const dateVal = document.getElementById('edit-data').value;
        const timeVal = document.getElementById('edit-ora').value;

        const catValue = this._sdInstances['sd-categoria'] ? this._sdInstances['sd-categoria'].getValue() : 'altro';
        const metValue = this._sdInstances['sd-metodo'] ? this._sdInstances['sd-metodo'].getValue() : 'carta';

        return {
            success: true,
            data: {
                importo: Math.round(importo * 100) / 100,
                descrizione: document.getElementById('edit-descrizione').value || 'Spesa',
                categoria: catValue,
                metodo: metValue,
                data: new Date(`${dateVal}T${timeVal || '12:00'}:00`).toISOString(),
                nota: document.getElementById('edit-nota').value,
                tags: [...this._editTags]
            }
        };
    },

    saveEdit() {
        const form = this.readEditFormData();
        if (!form.success) {
            this.showToast(form.error, 'error');
            return;
        }

        const result = Storage.updateSpesa(this.editingId, form.data);

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
        const overlay = document.getElementById('confirm-overlay');
        return !!overlay && !overlay.classList.contains('hidden');
    },

    showChoices(msg, choices) {
        document.getElementById('confirm-message').innerHTML = msg;
        document.getElementById('confirm-overlay').classList.remove('hidden');

        this.pushUiState({ panel: 'confirm' });

        const buttons = document.querySelector('#confirm-dialog .confirm-buttons');
        buttons.innerHTML = '';

        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${choice.className || 'btn-secondary'}`;
            btn.textContent = choice.text;
            btn.addEventListener('click', () => {
                this.closeConfirm();
                if (typeof choice.onClick === 'function') choice.onClick();
            });
            buttons.appendChild(btn);
        });
    },

    showConfirm(msg, onYes, yesText = null, noText = null, yesClass = 'btn-danger') {
        this.showChoices(msg, [
            { text: noText || 'Annulla', className: 'btn-secondary' },
            { text: yesText || 'Elimina', className: yesClass, onClick: onYes }
        ]);
    },

    closeConfirm(fromPopstate = false) {
        document.getElementById('confirm-overlay').classList.add('hidden');
        this.runHistoryAction(UIStack.getCloseHistoryAction({
            fromPopstate,
            wasOpen: true
        }));
    },

    /* =============================================
       STATS
       ============================================= */
    getDataBounds(spese) {
        return StatsData.getDataBounds(spese);
    },

    getPeriodDates(allSpese = []) {
        return StatsData.getPeriodDates({
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
        return StatsData.getBarAggregation({
            period: this.statsPeriod,
            start,
            end
        });
    },

    getBarChartTitle(start, end) {
        return StatsData.getBarChartTitle({
            period: this.statsPeriod,
            start,
            end
        });
    },

    renderStats() {
        const container = document.getElementById('stats-content');
        const allSpese = Storage.getSpese();

        this.destroyCharts();

        if (allSpese.length === 0) {
            container.innerHTML = StatsView.renderEmptyState();
            return;
        }

        const { start, end, label } = this.getPeriodDates(allSpese);

        let filtered = allSpese.filter(s => {
            const d = new Date(s.data);
            return d >= start && d <= end;
        });

        filtered = this.applyNonDateFilters(filtered);

        const summary = StatsData.summarizeExpenses(filtered, start, end);
        const canGoNext = this.statsOffset < 0;
        const isCustom = this.statsPeriod === 'custom';
        const barChartTitle = this.getBarChartTitle(start, end);

        container.innerHTML = StatsView.renderPage({
            period: this.statsPeriod,
            periodLabel: label,
            canGoNext,
            isCustom,
            filtered,
            summary,
            barChartTitle,
            chartColors: StatsCharts.COLORS,
            getCategory: id => this.getCat(id)
        });

        container.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newPeriod = btn.dataset.period;
                this.statsPeriod = newPeriod;
                this.statsOffset = 0;
                this.renderStats();
            });
        });

        const prevBtn = document.getElementById('period-prev');
        const nextBtn = document.getElementById('period-next');

        if (!isCustom) {
            prevBtn.addEventListener('click', () => {
                this.statsOffset--;
                this.renderStats();
            });

            if (canGoNext) {
                nextBtn.addEventListener('click', () => {
                    this.statsOffset++;
                    this.renderStats();
                });
            }
        }

        if (filtered.length > 0) {
            this.renderCharts(filtered, start, end);
        }
    },

    /* =====================
       CHARTS
       ===================== */
    renderCharts(filtered, start, end) {
        this.destroyCharts();

        if (typeof Chart === 'undefined') return;

        const themeColors = StatsCharts.getThemeColors();

        const ctxD = document.getElementById('chart-doughnut');
        if (ctxD) {
            this.chartDoughnut = new Chart(ctxD, StatsCharts.buildDoughnutConfig(filtered, {
                themeColors,
                chartColors: StatsCharts.COLORS,
                getCategory: id => this.getCat(id)
            }));
        }

        const aggregation = this.getBarAggregation(start, end);
        const ctxB = document.getElementById('chart-bar');
        if (ctxB) {
            this.chartBar = new Chart(ctxB, StatsCharts.buildBarConfig(filtered, start, end, {
                aggregation,
                themeColors
            }));
        }
    },

    destroyCharts() {
        this.chartDoughnut = StatsCharts.destroy(this.chartDoughnut);
        this.chartBar = StatsCharts.destroy(this.chartBar);
    },

    /* =====================
       SETTINGS
       ===================== */
    renderSettings() {
        const settings = Storage.getSettings();
        const spese = Storage.getSpese();
        const sizeKB = Storage.getStorageSizeKB();
        const storageStatus = Storage.getStatus();
        const container = document.getElementById('settings-content');
        const dateRange = SettingsView.getDateRange(spese);

        container.innerHTML = SettingsView.renderPage({
            settings,
            spese,
            sizeKB,
            storageStatus,
            dateRange
        });

        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = Storage.updateSettings({ tema: btn.dataset.theme });
                if (!result.success) {
                    this.showToast(result.error || 'Salvataggio impostazioni non riuscito', 'error');
                    return;
                }

                this.applyTheme(btn.dataset.theme);
                this.renderSettings();
            });
        });

        container.querySelector('#btn-export').addEventListener('click', () => this.showExportChoice());

        const rawBtn = container.querySelector('#btn-export-raw');
        if (rawBtn) {
            rawBtn.addEventListener('click', () => this.downloadRawData());
        }

        const fileInput = container.querySelector('#import-file');

        container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = ev => {
                const content = ev.target.result;

                const format = SettingsActions.detectImportFormat(file);

                let preview;
                if (format === 'json') {
                    preview = Storage.previewImportJSON(content);
                } else if (format === 'csv') {
                    preview = Storage.previewImportCSV(content);
                } else {
                    this.showToast('Usa .json o .csv', 'error');
                    fileInput.value = '';
                    return;
                }

                if (!preview.success) {
                    this.showToast('Errore: ' + preview.error, 'error');
                } else {
                    this.showImportChoice(preview, content);
                }

                fileInput.value = '';
            };

            reader.readAsText(file);
        });

        container.querySelector('#btn-clear-all').addEventListener('click', () => {
            this.showConfirm('Eliminare TUTTI i dati?', () => {
                const result = Storage.clearAll();
                if (!result.success) {
                    this.showToast(result.error || 'Cancellazione non riuscita', 'error');
                    return;
                }

                this.renderTimeline();
                this.renderSettings();
                this.showToast('Dati eliminati', 'info');
            });
        });
    },

    showExportChoice() {
        const choices = SettingsActions.getExportChoices().map(choice => ({
            ...choice,
            onClick: choice.format ? () => this.downloadExport(choice.format) : undefined
        }));

        this.showChoices('Esportare i dati in quale formato?', choices);
    },

    downloadExport(format) {
        const result = format === 'json' ? Storage.exportJSON() : Storage.exportCSV();
        if (!result.success) {
            this.showToast(result.error || 'Export non riuscito', 'error');
            return;
        }

        const spec = SettingsActions.getExportDownloadSpec(format, result.content, this.dateStamp());
        this.download(spec.content, spec.filename, spec.mime);
        this.showToast(spec.toast, 'info');
    },

    downloadRawData() {
        const result = Storage.exportRaw();
        if (!result.success) {
            this.showToast(result.error || 'Export grezzo non riuscito', 'error');
            return;
        }

        const spec = SettingsActions.getRawDownloadSpec(result.content, this.dateStamp());
        this.download(spec.content, spec.filename, spec.mime);
        this.showToast(spec.toast, 'info');
    },

    showImportChoice(preview, content) {
        const hasSpese = Storage.getSpese().length > 0;
        const msg = this.importPreviewMessage(preview, hasSpese);
        const choices = SettingsActions.getImportChoices(hasSpese).map(choice => ({
            ...choice,
            onClick: choice.mode ? () => this.commitImport(preview, content, choice.mode) : undefined
        }));

        this.showChoices(msg, choices);
    },

    importPreviewMessage(preview, hasSpese) {
        return SettingsView.renderImportPreviewMessage(preview, hasSpese);
    },

    commitImport(preview, content, mode) {
        const result = preview.format === 'json'
            ? Storage.importJSON(content, { mode })
            : Storage.importCSV(content, { mode });

        if (!result.success) {
            this.showToast('Errore: ' + result.error, 'error');
            return;
        }

        this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
        this.renderSettings();

        const successMessage = SettingsActions.getImportSuccessMessage(result, mode);
        this.showToast(successMessage, 'success');
    },

    /* =====================
       TOAST
       ===================== */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;

        // Position above input bar when keyboard is open
        if (this._expenseInputActive) {
            const inputBar = document.getElementById('input-bar');
            const barTop = inputBar.getBoundingClientRect().top;
            toast.style.bottom = (window.innerHeight - barTop + 8) + 'px';
            toast.style.top = 'auto';
        } else {
            toast.style.bottom = '';
            toast.style.top = '';
        }

        if (this.toastTimer) clearTimeout(this.toastTimer);

        this.toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
            toast.style.bottom = '';
            toast.style.top = '';
        }, 2800);
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
