/* ============================================
   FILTER CONTROLLER - wiring pannello filtri
   ============================================ */

const FilterController = (() => {
    const FILTER_LAYOUT_TRANSITION_MS = 200;
    const QUICK_FILTER_LONG_PRESS_MS = 450;
    const LONG_PRESS_RELEASE_TOLERANCE_MS = 24;
    const QUICK_FILTER_STORAGE_SUFFIX = ':quick-filter';
    let filterLayoutTransitionToken = 0;
    let timelineScrollBeforeFilterOpen = null;
    let timelineScrollWithFilterOpen = null;
    let resetFilterScrollOnNextOpen = false;
    let activeQuickFilterState = null;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
    }

    function getBody(options, doc) {
        return options.body || (doc ? doc.body : null);
    }

    function defer(options, callback) {
        const frame = options.requestAnimationFrame ||
            (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

        if (frame) frame(callback);
        else callback();
    }

    function beginFilterLayoutTransition(options, main, onComplete = noop) {
        const token = ++filterLayoutTransitionToken;
        const schedule = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : null);

        if (main) main.classList.add('filter-layout-transition');

        if (!schedule) {
            onComplete();
            if (main) main.classList.remove('filter-layout-transition');
            return;
        }

        schedule(() => {
            if (token !== filterLayoutTransitionToken) return;
            onComplete();
            if (main) main.classList.remove('filter-layout-transition');
        }, FILTER_LAYOUT_TRANSITION_MS);
    }

    function resetFilterPanelScroll(panel) {
        if (!panel) return;

        const scrollContainer = panel.querySelector('.filter-panel-scroll');
        if (scrollContainer) scrollContainer.scrollTop = 0;
    }

    function alignMainBelowFilterPanel(main, panel) {
        if (!main || !panel) return;

        const panelHeight = Number(panel.offsetHeight) || 0;
        main.style.marginTop = `calc(var(--header-h) + ${panelHeight}px)`;
    }

    function getState(options, getter, prop, fallback) {
        if (typeof options[getter] === 'function') return options[getter]();
        if (options.state && Object.prototype.hasOwnProperty.call(options.state, prop)) {
            return options.state[prop];
        }
        if (Object.prototype.hasOwnProperty.call(options, prop)) return options[prop];
        return fallback;
    }

    function setState(options, setter, prop, value) {
        if (typeof options[setter] === 'function') {
            options[setter](value);
            return;
        }
        if (options.state) {
            options.state[prop] = value;
            return;
        }
        options[prop] = value;
    }

    function getFilterOpen(options) {
        return !!getState(options, 'getFilterOpen', 'filterOpen', false);
    }

    function setFilterOpen(options, value) {
        setState(options, 'setFilterOpen', 'filterOpen', !!value);
    }

    function getAdvancedFiltersOpen(options) {
        return !!getState(options, 'getAdvancedFiltersOpen', 'advancedFiltersOpen', false);
    }

    function normalizeIdList(value) {
        const items = Array.isArray(value)
            ? value
            : (value && typeof value.forEach === 'function' ? Array.from(value) : []);

        return Array.from(new Set(items.map(String).filter(Boolean))).sort();
    }

    function normalizeQuickFilterSnapshot(options = {}, value = {}) {
        const source = typeof options.normalizeFilterSnapshot === 'function'
            ? options.normalizeFilterSnapshot(value)
            : (value && typeof value === 'object' ? value : {});
        const rawMax = source.amountMax === Infinity ||
            source.amountMax === null ||
            source.amountMax === 'Infinity'
            ? Infinity
            : Number(source.amountMax);

        return {
            query: String(source.query || '').trim(),
            categories: normalizeIdList(source.categories),
            excludedCategories: normalizeIdList(source.excludedCategories),
            methods: normalizeIdList(source.methods),
            excludedMethods: normalizeIdList(source.excludedMethods),
            amountMin: Math.max(0, Number(source.amountMin) || 0),
            amountMax: Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : Infinity,
            dateFrom: String(source.dateFrom || '').trim(),
            dateTo: String(source.dateTo || '').trim(),
            selectedOnly: false,
            excludedSelectedOnly: false
        };
    }

    function serializeQuickFilterSnapshot(options, value) {
        const snapshot = normalizeQuickFilterSnapshot(options, value);

        return JSON.stringify({
            ...snapshot,
            amountMax: snapshot.amountMax === Infinity ? 'Infinity' : snapshot.amountMax
        });
    }

    function areQuickFilterSnapshotsEqual(options, left, right) {
        return serializeQuickFilterSnapshot(options, left) ===
            serializeQuickFilterSnapshot(options, right);
    }

    function getQuickFilterStorageKey(options = {}) {
        const baseKey = options.storage && options.storage.KEY
            ? options.storage.KEY
            : 'spesa-tracker-data';

        return `${baseKey}${QUICK_FILTER_STORAGE_SUFFIX}`;
    }

    function getQuickFilterStorage(options = {}) {
        if (options.localStorage) return options.localStorage;

        const win = getWindow(options);
        try {
            return win && win.localStorage ? win.localStorage : null;
        } catch (_) {
            return null;
        }
    }

    function readQuickFilter(options = {}) {
        const storageLike = getQuickFilterStorage(options);
        if (!storageLike || typeof storageLike.getItem !== 'function') return null;

        try {
            const raw = storageLike.getItem(getQuickFilterStorageKey(options));
            if (!raw) return null;
            return normalizeQuickFilterSnapshot(options, JSON.parse(raw));
        } catch (_) {
            return null;
        }
    }

    function saveQuickFilter(options = {}, snapshot) {
        const storageLike = getQuickFilterStorage(options);
        if (!storageLike || typeof storageLike.setItem !== 'function') return false;

        try {
            storageLike.setItem(
                getQuickFilterStorageKey(options),
                serializeQuickFilterSnapshot(options, snapshot)
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    function createCurrentQuickFilterSnapshot(options = {}) {
        const current = typeof options.createFilterSnapshot === 'function'
            ? options.createFilterSnapshot()
            : options.filters;

        return normalizeQuickFilterSnapshot(options, current);
    }

    function applyQuickFilterSnapshot(options = {}, snapshot) {
        const normalized = normalizeQuickFilterSnapshot(options, snapshot);
        if (typeof options.applyFilterSnapshot === 'function') {
            options.applyFilterSnapshot(normalized, []);
        }
        return normalized;
    }

    function observeQuickFilterChange(options = {}, state = activeQuickFilterState) {
        if (!state) return;

        const current = createCurrentQuickFilterSnapshot(options);
        const previous = state.lastObservedSnapshot
            ? normalizeQuickFilterSnapshot(options, state.lastObservedSnapshot)
            : null;
        const saved = state.savedSnapshot
            ? normalizeQuickFilterSnapshot(options, state.savedSnapshot)
            : null;

        if (saved && previous &&
            areQuickFilterSnapshotsEqual(options, current, saved) &&
            !areQuickFilterSnapshotsEqual(options, previous, saved)) {
            state.restoreSnapshot = previous;
        }

        state.lastObservedSnapshot = current;
    }

    function notifyFilterChange(options = {}) {
        observeQuickFilterChange(options);
        (options.onFilterChange || noop)();
    }

    function handleQuickFilterLongPress(options = {}, state = {}) {
        const fullyOpen = getFilterOpen(options) && getAdvancedFiltersOpen(options);

        if (fullyOpen) {
            const saved = createCurrentQuickFilterSnapshot(options);
            state.savedSnapshot = saved;
            state.restoreSnapshot = null;
            state.lastObservedSnapshot = saved;
            saveQuickFilter(options, saved);
            (options.showToast || noop)('Filtro rapido salvato', 'success');
            return 'saved';
        }

        const saved = state.savedSnapshot || readQuickFilter(options);
        if (!saved) {
            (options.showToast || noop)('Nessun filtro rapido salvato', 'info');
            return 'missing';
        }

        state.savedSnapshot = normalizeQuickFilterSnapshot(options, saved);
        const current = createCurrentQuickFilterSnapshot(options);

        if (areQuickFilterSnapshotsEqual(options, current, state.savedSnapshot) &&
            state.restoreSnapshot) {
            const restore = state.restoreSnapshot;
            state.restoreSnapshot = null;
            state.lastObservedSnapshot = applyQuickFilterSnapshot(options, restore);
            (options.showToast || noop)('Filtri precedenti ripristinati', 'info');
            return 'restored';
        }

        if (!areQuickFilterSnapshotsEqual(options, current, state.savedSnapshot)) {
            state.restoreSnapshot = current;
        }
        state.lastObservedSnapshot = applyQuickFilterSnapshot(options, state.savedSnapshot);
        (options.showToast || noop)('Filtro rapido attivato', 'info');
        return 'activated';
    }

    function bindLongPressGesture(element, options = {}, onLongPress = noop, duration = QUICK_FILTER_LONG_PRESS_MS) {
        if (!element || typeof element.addEventListener !== 'function') return null;
        const schedule = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : null);
        const cancel = options.clearTimeout ||
            (typeof clearTimeout === 'function' ? clearTimeout : null);
        const durationMs = Number(duration) || QUICK_FILTER_LONG_PRESS_MS;
        let timerId = null;
        let startPoint = null;
        let startedAt = null;
        let longPressFired = false;
        let suppressNextClick = false;

        const getEventTime = event => {
            const eventTime = Number(event && event.timeStamp);
            return Number.isFinite(eventTime) && eventTime > 0
                ? eventTime
                : Date.now();
        };

        const fireLongPress = () => {
            if (longPressFired) return;
            longPressFired = true;
            suppressNextClick = true;
            onLongPress();
        };

        const cancelTimer = () => {
            if (cancel && timerId !== null) cancel(timerId);
            timerId = null;
        };

        const finishPress = event => {
            if (!longPressFired && timerId !== null && startedAt !== null) {
                const elapsed = getEventTime(event) - startedAt;
                if (elapsed >= durationMs - LONG_PRESS_RELEASE_TOLERANCE_MS) {
                    fireLongPress();
                }
            }

            cancelTimer();
            startedAt = null;
            startPoint = null;
        };

        element.addEventListener('pointerdown', event => {
            if (event && event.button && event.button !== 0) return;

            cancelTimer();
            suppressNextClick = false;
            longPressFired = false;
            startedAt = getEventTime(event);
            startPoint = event
                ? { x: Number(event.clientX || 0), y: Number(event.clientY || 0) }
                : null;
            if (!schedule) return;

            timerId = schedule(() => {
                timerId = null;
                fireLongPress();
            }, durationMs);
        });

        element.addEventListener('pointermove', event => {
            if (!startPoint || !event || timerId === null) return;
            const dx = Math.abs(Number(event.clientX || 0) - startPoint.x);
            const dy = Math.abs(Number(event.clientY || 0) - startPoint.y);
            if (dx > 8 || dy > 8) {
                cancelTimer();
                startedAt = null;
                startPoint = null;
            }
        });

        element.addEventListener('pointerup', finishPress);
        element.addEventListener('pointercancel', finishPress);
        element.addEventListener('pointerleave', () => {
            cancelTimer();
            startedAt = null;
            startPoint = null;
        });

        element.addEventListener('contextmenu', event => {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
        });

        return {
            consumeClick() {
                if (!suppressNextClick) return false;
                suppressNextClick = false;
                return true;
            }
        };
    }

    function bindQuickFilterLongPress(button, options = {}, state = {}) {
        activeQuickFilterState = state;
        return bindLongPressGesture(
            button,
            options,
            () => handleQuickFilterLongPress(options, state),
            options.quickFilterLongPressMs || QUICK_FILTER_LONG_PRESS_MS
        );
    }

    function forgetQuickFilterRestore(state = activeQuickFilterState) {
        if (!state) return;
        state.restoreSnapshot = null;
        state.lastObservedSnapshot = null;
    }

    function setAdvancedFiltersOpen(options, value) {
        setState(options, 'setAdvancedFiltersOpen', 'advancedFiltersOpen', !!value);
    }

    function getFilterSearchActive(options) {
        return !!getState(options, 'getFilterSearchActive', 'filterSearchActive', false);
    }

    function setFilterSearchActive(options, value) {
        setState(options, 'setFilterSearchActive', 'filterSearchActive', !!value);
    }

    function getCurrentPage(options) {
        if (typeof options.getCurrentPage === 'function') return options.getCurrentPage();
        return options.currentPage || 'timeline';
    }

    function setTimelineSummaryHidden(options, doc, summary, hidden) {
        const main = doc.getElementById('app-main');
        const shouldPreserveScroll = main && getCurrentPage(options) === 'timeline';
        const preservedScrollTop = shouldPreserveScroll
            ? Number(main.scrollTop) || 0
            : null;

        if (summary) {
            summary.classList.remove('hidden');
            summary.classList.toggle('filter-panel-collapsed', !!hidden);
        }

        if (shouldPreserveScroll) {
            main.scrollTop = preservedScrollTop;
            if (options.pageScrollTop) options.pageScrollTop.timeline = preservedScrollTop;
        }
    }

    function createTimelineScrollRestorer(options, main, explicitScrollTop = null) {
        const currentScrollTop = main && getCurrentPage(options) === 'timeline'
            ? Number(main.scrollTop) || 0
            : null;
        const preservedScrollTop = explicitScrollTop !== null
            ? explicitScrollTop
            : currentScrollTop;

        return () => {
            if (preservedScrollTop === null || !main) return;
            void main.offsetHeight;
            main.scrollTop = preservedScrollTop;
            const appliedScrollTop = Number(main.scrollTop) || 0;
            if (options.pageScrollTop) {
                options.pageScrollTop.timeline = appliedScrollTop;
            }
        };
    }

    function isTimelineSelectionActive(options) {
        if (typeof options.isTimelineSelectionActive === 'function') {
            return !!options.isTimelineSelectionActive();
        }

        return !!options.timelineSelectionActive;
    }

    function setSelectedOnlyFilter(options, value, excluded = false) {
        const enabled = !!value;
        const excludedEnabled = !enabled && !!excluded;
        const filters = options.filters || {};
        const wasActive = !!filters.selectedOnly || !!filters.excludedSelectedOnly;
        const staysActive = enabled || excludedEnabled;
        const snapshotIds = wasActive && staysActive && filters.selectedOnlyIds
            ? filters.selectedOnlyIds
            : getTimelineSelectedIds(options);

        if (typeof options.setSelectedOnlyFilter === 'function') {
            options.setSelectedOnlyFilter(enabled, snapshotIds, excludedEnabled);
            return;
        }

        if (options.filters) {
            options.filters.selectedOnly = enabled;
            options.filters.excludedSelectedOnly = excludedEnabled;
            options.filters.selectedOnlyIds = staysActive
                ? new Set(snapshotIds)
                : new Set();
        }
    }

    function getTimelineSelectedIds(options) {
        if (typeof options.getTimelineSelectedIds === 'function') {
            const ids = options.getTimelineSelectedIds();
            if (ids instanceof Set) return ids;
            if (Array.isArray(ids)) return new Set(ids.filter(Boolean));
            if (
                ids &&
                typeof ids.size === 'number' &&
                typeof ids.has === 'function' &&
                typeof ids.forEach === 'function'
            ) {
                return new Set(Array.from(ids).filter(Boolean));
            }
        }

        return new Set();
    }

    function isDesktopLike(options = {}) {
        const win = getWindow(options);
        if (!win) return false;

        if (typeof win.matchMedia === 'function') {
            return !!win.matchMedia('(hover: hover) and (pointer: fine)').matches;
        }

        return Number(win.innerWidth || 0) >= 768;
    }

    function shouldLockMainScrollForAdvanced(options = {}) {
        return !isDesktopLike(options);
    }

    function getLastSliderInput(options) {
        return getState(options, 'getLastSliderInput', 'lastSliderInput', 'max');
    }

    function setLastSliderInput(options, value) {
        setState(options, 'setLastSliderInput', 'lastSliderInput', value);
    }

    function getSliderMaxValue(options) {
        return Number(getState(options, 'getSliderMaxValue', 'sliderMax', 100)) || 100;
    }

    function setSliderMaxValue(options, value) {
        setState(options, 'setSliderMaxValue', 'sliderMax', value);
    }

    function getSpese(options) {
        return typeof options.getSpese === 'function' ? options.getSpese() : [];
    }

    function countActive(options) {
        if (typeof options.countActiveFilters === 'function') {
            return options.countActiveFilters(options.filters);
        }
        return ExpenseFilters.countActive(options.filters);
    }

    function applyFilters(options, spese) {
        if (typeof options.applyFilters === 'function') return options.applyFilters(spese);
        return ExpenseFilters.apply(spese, options.filters);
    }

    function getQuickTotals(options, spese) {
        if (typeof options.getQuickTotals === 'function') return options.getQuickTotals(spese);
        return StatsData.getQuickTotals(spese);
    }

    function renderFooterInfo(options, payload) {
        if (typeof options.renderFooterInfo === 'function') return options.renderFooterInfo(payload);
        return FilterView.renderFooterInfo(payload);
    }

    function renderChips(options, items) {
        if (typeof options.renderChips === 'function') return options.renderChips(items);
        return FilterView.renderChips(items);
    }

    function getSliderMax(options, spese) {
        if (typeof options.getSliderMax === 'function') return options.getSliderMax(spese);
        return FilterView.getSliderMax(spese);
    }

    function getFilterModel(options) {
        if (options.filterModel) return options.filterModel;
        if (typeof options.getFilterModel === 'function') return options.getFilterModel();
        return null;
    }

    function getCloseHistoryAction(options, payload) {
        if (typeof options.getCloseHistoryAction === 'function') return options.getCloseHistoryAction(payload);
        return UIStack.getCloseHistoryAction(payload);
    }

    function updateAppMainPadding(options) {
        (options.updateAppMainPadding || noop)();
    }

    function releaseFilterSearchInteraction(options = {}, config = {}) {
        if (!getFilterSearchActive(options)) return false;

        const doc = getDocument(options);
        const searchInput = doc.getElementById('search-input');

        setFilterSearchActive(options, false);
        (options.stopExpenseInputBarWatch || noop)();

        if (searchInput && typeof searchInput.blur === 'function') {
            try { searchInput.blur(); } catch (_) { }
        }

        if (config.consumeHistory !== false) {
            (options.consumeUiState || noop)();
        } else if (typeof options.markReleasedFilterSearchHistory === 'function') {
            options.markReleasedFilterSearchHistory();
        }

        return true;
    }

    function setBodyScrollLockForAdvanced(options = {}, locked) {
        const doc = getDocument(options);
        const body = getBody(options, doc);
        if (!body) return;

        body.classList.toggle('no-scroll', !!locked);
    }

    function syncInputBarForAdvanced(options = {}, hidden) {
        const doc = getDocument(options);
        const inputBar = doc.getElementById('input-bar');
        const main = doc.getElementById('app-main');
        const panel = doc.getElementById('filter-panel');
        const shouldShowInputBar = getCurrentPage(options) === 'timeline';

        if (panel) panel.classList.toggle('input-bar-hidden', !!hidden);
        if (!inputBar || !main) return;

        if (hidden) {
            inputBar.classList.add('hidden');
            main.classList.add('no-input-bar');
            return;
        }

        if (shouldShowInputBar) {
            inputBar.classList.remove('hidden');
            main.classList.remove('no-input-bar');
        }
    }

    function syncAdvancedToggleButton(btn, expanded) {
        if (!btn) return;

        btn.classList.toggle('active', !!expanded);
        if (typeof btn.setAttribute === 'function') {
            btn.setAttribute(
                'aria-label',
                expanded ? 'Riduci pannello filtri' : 'Espandi pannello filtri'
            );
        }
        btn.title = expanded ? 'Riduci pannello filtri' : 'Espandi pannello filtri';
    }

    const FILTER_SEARCH_RELEASE_EXCLUDE_SELECTOR = [
        '#search-input',
        '#btn-search-clear',
        '.filter-input-row'
    ].join(', ');

    const FILTER_SEARCH_RELEASE_TARGET_SELECTOR = [
        'button',
        'input',
        'select',
        'textarea',
        'label',
        'a[href]',
        '[role="button"]',
        '.expense-card',
        '.filter-chip',
        '.nav-btn'
    ].join(', ');

    function shouldReleaseFilterSearchBeforeInteraction(options = {}, target) {
        if (!getFilterOpen(options) || !getFilterSearchActive(options)) return false;
        if (!target || typeof target.closest !== 'function') return false;
        if (target.closest(FILTER_SEARCH_RELEASE_EXCLUDE_SELECTOR)) return false;
        return !!target.closest(FILTER_SEARCH_RELEASE_TARGET_SELECTOR);
    }

    function bindInternalFilterSearchRelease(options = {}) {
        const doc = getDocument(options);
        if (!doc || typeof doc.addEventListener !== 'function') return;

        const releaseBeforeInternalInteraction = event => {
            const target = event && event.target;

            if (!shouldReleaseFilterSearchBeforeInteraction(options, target)) return;

            releaseFilterSearchInteraction(options, {
                consumeHistory: false
            });
        };

        doc.addEventListener('pointerdown', releaseBeforeInternalInteraction, { capture: true, passive: true });
        doc.addEventListener('touchstart', releaseBeforeInternalInteraction, { capture: true, passive: true });
    }

    function init(options = {}) {
        const doc = getDocument(options);
        const toggleBtn = doc.getElementById('btn-filter-toggle');
        const searchInput = doc.getElementById('search-input');
        const clearBtn = doc.getElementById('btn-search-clear');
        const resetBtn = doc.getElementById('btn-filter-reset');
        const dateFrom = doc.getElementById('filter-date-from');
        const dateTo = doc.getElementById('filter-date-to');
        const advToggle = doc.getElementById('btn-advanced-toggle');
        const selectedOnlyChip = doc.getElementById('filter-selected-only');
        const quickFilterState = {
            savedSnapshot: readQuickFilter(options),
            restoreSnapshot: null,
            lastObservedSnapshot: createCurrentQuickFilterSnapshot(options)
        };
        const quickFilterBinding = bindQuickFilterLongPress(
            toggleBtn,
            options,
            quickFilterState
        );

        if (toggleBtn) {
            toggleBtn.addEventListener('click', event => {
                if (quickFilterBinding && quickFilterBinding.consumeClick()) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    return;
                }
                if (getFilterOpen(options)) closeFilterPanel(options);
                else openFilterPanel(options);
            });
        }

        if (searchInput && clearBtn) {
            searchInput.addEventListener('input', () => {
                options.filters.query = searchInput.value.trim();
                clearBtn.classList.toggle('hidden', !options.filters.query);
                notifyFilterChange(options);
            });

            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchInput.blur();
                }
            });

            searchInput.addEventListener('focus', () => {
                if (typeof options.getViewportHeight === 'function') {
                    setState(options, 'setLastViewportHeight', 'lastViewportHeight', options.getViewportHeight());
                }

                if (getFilterOpen(options) && !getFilterSearchActive(options)) {
                    setFilterSearchActive(options, true);
                    (options.startExpenseInputBarWatch || noop)();
                    (options.pushUiState || noop)({ panel: 'filter-search' });
                }
            });

            searchInput.addEventListener('blur', () => {
                releaseFilterSearchInteraction(options);
            });

            const handleClear = e => {
                if (e && e.cancelable) e.preventDefault();
                if (searchInput.value === '') return;

                searchInput.value = '';
                options.filters.query = '';
                clearBtn.classList.add('hidden');
                notifyFilterChange(options);
            };

            clearBtn.addEventListener('mousedown', handleClear);
            clearBtn.addEventListener('touchstart', handleClear, { passive: false });
            clearBtn.addEventListener('click', handleClear);
        }

        buildChips(options, 'filter-cats', options.categories || [], options.filters.categories);
        buildChips(options, 'filter-methods', options.methods || [], options.filters.methods);
        initSlider(options);

        [dateFrom, dateTo].forEach(el => {
            if (!el) return;

            el.addEventListener('click', () => {
                el.classList.remove('date-picked');
            });

            el.addEventListener('change', () => {
                el.classList.add('date-picked');
                if (el === dateFrom) options.filters.dateFrom = el.value;
                else options.filters.dateTo = el.value;
                notifyFilterChange(options);
                try { el.blur(); } catch (_) { }
            });
        });

        if (resetBtn) resetBtn.addEventListener('click', () => resetFilters(options));
        if (advToggle) advToggle.addEventListener('click', () => toggleAdvancedFilters(options));
        if (selectedOnlyChip) {
            const syncSelectedOnlyChange = () => {
                syncSelectionFilterUI(options);
                notifyFilterChange(options);
            };
            const selectedLongPressBinding = bindLongPressGesture(
                selectedOnlyChip,
                options,
                () => {
                    if (!isTimelineSelectionActive(options)) return;

                    if (options.filters.excludedSelectedOnly) {
                        setSelectedOnlyFilter(options, false, false);
                    } else {
                        setSelectedOnlyFilter(options, false, true);
                    }
                    syncSelectedOnlyChange();
                },
                options.filterChipLongPressMs || QUICK_FILTER_LONG_PRESS_MS
            );

            selectedOnlyChip.addEventListener('click', event => {
                if (selectedLongPressBinding && selectedLongPressBinding.consumeClick()) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    return;
                }
                if (!isTimelineSelectionActive(options)) return;

                if (options.filters.selectedOnly) {
                    setSelectedOnlyFilter(options, false, false);
                } else {
                    setSelectedOnlyFilter(options, true, false);
                }
                syncSelectedOnlyChange();
            });
        }

        syncFilterUI(options);
        updateFilterBadge(options);
        bindInternalFilterSearchRelease(options);

        const panel = doc.getElementById('filter-panel');
        if (panel) {
            panel.addEventListener('touchmove', e => {
                const target = e.target;
                const isInsideScroll = target &&
                    typeof target.closest === 'function' &&
                    target.closest('.filter-panel-scroll');

                if (!isInsideScroll) e.preventDefault();
            }, { passive: false });
        }
    }

    function toggleAdvancedFilters(options = {}) {
        if (getAdvancedFiltersOpen(options)) {
            closeAdvancedFilters(options, false);
        } else {
            openAdvancedFilters(options);
        }
    }

    function openAdvancedFilters(options = {}) {
        const doc = getDocument(options);
        const section = doc.getElementById('advanced-filters');
        const btn = doc.getElementById('btn-advanced-toggle');

        setAdvancedFiltersOpen(options, true);
        if (section) section.classList.remove('hidden');
        syncAdvancedToggleButton(btn, true);
        setBodyScrollLockForAdvanced(options, shouldLockMainScrollForAdvanced(options));
        syncInputBarForAdvanced(options, true);
        (options.pushUiState || noop)({ panel: 'advanced-filters' });

        defer(options, () => {
            const panel = doc.getElementById('filter-panel');
            const main = doc.getElementById('app-main');
            alignMainBelowFilterPanel(main, panel);

            const scrollContainer = panel ? panel.querySelector('.filter-panel-scroll') : null;
            if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }

            updateAppMainPadding(options);
        });
    }

    function closeAdvancedFilters(options = {}, fromPopstate = false) {
        if (!getAdvancedFiltersOpen(options)) return;

        const doc = getDocument(options);
        const section = doc.getElementById('advanced-filters');
        const btn = doc.getElementById('btn-advanced-toggle');

        setAdvancedFiltersOpen(options, false);
        if (section) section.classList.remove('hidden');
        syncAdvancedToggleButton(btn, false);
        setBodyScrollLockForAdvanced(options, false);
        syncInputBarForAdvanced(options, false);

        defer(options, () => {
            const panel = doc.getElementById('filter-panel');
            if (!panel || panel.classList.contains('hidden')) return;

            const main = doc.getElementById('app-main');
            alignMainBelowFilterPanel(main, panel);
            const scrollContainer = panel.querySelector('.filter-panel-scroll');
            if (scrollContainer) scrollContainer.scrollTop = 0;
            updateAppMainPadding(options);
        });

        (options.runHistoryAction || noop)(getCloseHistoryAction(options, {
            fromPopstate,
            wasOpen: true
        }));
    }

    function buildChips(options = {}, containerId, items, targetSet) {
        const doc = getDocument(options);
        const container = doc.getElementById(containerId);
        if (!container) return;

        container.innerHTML = renderChips(options, items);

        container.querySelectorAll('.filter-chip').forEach(chip => {
            const getSets = () => getChoiceChipSets(options, containerId, targetSet);
            const longPressBinding = bindLongPressGesture(
                chip,
                options,
                () => {
                    const { includedSet, excludedSet } = getSets();
                    const id = chip.dataset.id;

                    if (excludedSet.has(id)) {
                        excludedSet.delete(id);
                    } else {
                        includedSet.delete(id);
                        excludedSet.add(id);
                    }

                    syncChoiceChip(chip, includedSet, excludedSet);
                    notifyFilterChange(options);
                },
                options.filterChipLongPressMs || QUICK_FILTER_LONG_PRESS_MS
            );

            chip.addEventListener('click', event => {
                if (longPressBinding && longPressBinding.consumeClick()) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    return;
                }

                const { includedSet, excludedSet } = getSets();
                const id = chip.dataset.id;

                if (includedSet.has(id)) {
                    includedSet.delete(id);
                } else {
                    excludedSet.delete(id);
                    includedSet.add(id);
                }

                syncChoiceChip(chip, includedSet, excludedSet);
                notifyFilterChange(options);
            });
        });
    }

    function getChoiceChipSets(options, containerId, targetSet) {
        const filters = options.filters || {};
        const currentSet = containerId === 'filter-cats'
            ? filters.categories
            : containerId === 'filter-methods'
            ? filters.methods
            : targetSet;
        let excludedSet = containerId === 'filter-cats'
            ? filters.excludedCategories
            : containerId === 'filter-methods'
            ? filters.excludedMethods
            : null;
        const includedSet = currentSet &&
            typeof currentSet.has === 'function' &&
            typeof currentSet.add === 'function' &&
            typeof currentSet.delete === 'function'
            ? currentSet
            : targetSet;

        if (!(
            excludedSet &&
            typeof excludedSet.has === 'function' &&
            typeof excludedSet.add === 'function' &&
            typeof excludedSet.delete === 'function'
        )) {
            excludedSet = new Set();
            if (containerId === 'filter-cats') filters.excludedCategories = excludedSet;
            if (containerId === 'filter-methods') filters.excludedMethods = excludedSet;
        }

        return { includedSet, excludedSet };
    }

    function syncChoiceChip(chip, includedSet, excludedSet) {
        const id = chip.dataset.id;
        const isExcluded = !!(excludedSet && excludedSet.has(id));
        const isIncluded = !isExcluded && !!(includedSet && includedSet.has(id));

        syncTriStateChip(chip, isIncluded, isExcluded);
    }

    function syncTriStateChip(chip, isIncluded, isExcluded) {
        const state = isExcluded ? 'escluso' : isIncluded ? 'selezionato' : 'neutro';
        const label = chip.dataset.label || chip.dataset.id || '';

        chip.classList.toggle('active', isIncluded);
        chip.classList.toggle('excluded', isExcluded);
        if (typeof chip.setAttribute === 'function') {
            chip.setAttribute('aria-pressed', isExcluded ? 'mixed' : String(isIncluded));
            chip.setAttribute('aria-label', `${label}: ${state}`);
        }
    }

    function syncFilterUI(options = {}) {
        const doc = getDocument(options);
        const filters = options.filters;
        const searchInput = doc.getElementById('search-input');
        const clearBtn = doc.getElementById('btn-search-clear');
        const dateFrom = doc.getElementById('filter-date-from');
        const dateTo = doc.getElementById('filter-date-to');

        if (searchInput) searchInput.value = filters.query;
        if (clearBtn) clearBtn.classList.toggle('hidden', !filters.query);

        if (dateFrom) {
            dateFrom.value = filters.dateFrom;
            dateFrom.classList.toggle('date-picked', !!filters.dateFrom);
        }

        if (dateTo) {
            dateTo.value = filters.dateTo;
            dateTo.classList.toggle('date-picked', !!filters.dateTo);
        }

        doc.querySelectorAll('#filter-cats .filter-chip').forEach(chip => {
            syncChoiceChip(chip, filters.categories, filters.excludedCategories);
        });

        doc.querySelectorAll('#filter-methods .filter-chip').forEach(chip => {
            syncChoiceChip(chip, filters.methods, filters.excludedMethods);
        });

        syncSelectionFilterUI(options);
        recalcSliderMax(options);
    }

    function syncSelectionFilterUI(options = {}) {
        const doc = getDocument(options);
        const filters = options.filters || {};
        const active = isTimelineSelectionActive(options);
        const section = doc.getElementById('selection-filter-section');
        const chip = doc.getElementById('filter-selected-only');

        if (!active && (filters.selectedOnly || filters.excludedSelectedOnly)) {
            setSelectedOnlyFilter(options, false);
        }

        if (section) section.classList.toggle('hidden', !active);
        if (chip) {
            syncTriStateChip(
                chip,
                active && !!filters.selectedOnly,
                active && !!filters.excludedSelectedOnly
            );
        }
    }

    function initSlider(options = {}) {
        recalcSliderMax(options);

        const doc = getDocument(options);
        const sMin = doc.getElementById('slider-min');
        const sMax = doc.getElementById('slider-max');
        if (!sMin || !sMax) return;

        const update = () => {
            let lo = Number(sMin.value);
            let hi = Number(sMax.value);

            if (lo > hi) {
                if (getLastSliderInput(options) === 'min') {
                    sMin.value = String(hi);
                    lo = hi;
                } else {
                    sMax.value = String(lo);
                    hi = lo;
                }
            }

            options.filters.amountMin = lo;
            options.filters.amountMax = hi >= getSliderMaxValue(options) ? Infinity : hi;

            updateSliderUI(options, lo, hi);
            notifyFilterChange(options);
        };

        sMin.addEventListener('input', () => {
            setLastSliderInput(options, 'min');
            update();
        });

        sMax.addEventListener('input', () => {
            setLastSliderInput(options, 'max');
            update();
        });
    }

    function recalcSliderMax(options = {}) {
        const doc = getDocument(options);
        const filters = options.filters;
        const sliderMax = getSliderMax(options, getSpese(options));
        setSliderMaxValue(options, sliderMax);

        const sMin = doc.getElementById('slider-min');
        const sMax = doc.getElementById('slider-max');
        if (!sMin || !sMax) return;

        sMin.max = String(sliderMax);
        sMax.max = String(sliderMax);

        const hadInfinity = filters.amountMax === Infinity;
        let lo = Number.isFinite(filters.amountMin) ? filters.amountMin : 0;
        let hi = hadInfinity
            ? sliderMax
            : (Number.isFinite(filters.amountMax) ? filters.amountMax : sliderMax);

        lo = Math.max(0, Math.min(lo, sliderMax));
        hi = Math.max(0, Math.min(hi, sliderMax));

        if (lo > hi) lo = hi;

        filters.amountMin = lo;
        filters.amountMax = hadInfinity ? Infinity : hi;

        sMin.value = String(lo);
        sMax.value = String(hi);

        updateSliderUI(options, lo, hi);
    }

    function updateSliderUI(options = {}, lo, hi) {
        const doc = getDocument(options);
        const sliderMax = getSliderMaxValue(options);
        const fill = doc.getElementById('ds-fill');
        const minLabel = doc.getElementById('slider-val-min');
        const maxLabel = doc.getElementById('slider-val-max');

        if (fill) {
            const pctL = (lo / sliderMax) * 100;
            const pctR = (hi / sliderMax) * 100;
            fill.style.left = pctL + '%';
            fill.style.width = (pctR - pctL) + '%';
        }

        if (minLabel) minLabel.textContent = '\u20ac' + lo;

        if (maxLabel) {
            const isOpenEnded = options.filters.amountMax === Infinity && hi >= sliderMax;
            maxLabel.textContent = isOpenEnded ? `\u20ac${sliderMax}+` : `\u20ac${hi}`;
        }
    }

    function openFilterPanel(options = {}) {
        const doc = getDocument(options);
        setFilterOpen(options, true);
        syncFilterUI(options);

        const panel = doc.getElementById('filter-panel');
        const toggleBtn = doc.getElementById('btn-filter-toggle');
        const advanced = doc.getElementById('advanced-filters');
        const advancedBtn = doc.getElementById('btn-advanced-toggle');
        const main = doc.getElementById('app-main');
        const shouldResetFilterScroll = resetFilterScrollOnNextOpen;

        resetFilterScrollOnNextOpen = false;

        timelineScrollBeforeFilterOpen = main && getCurrentPage(options) === 'timeline'
            ? Number(main.scrollTop) || 0
            : null;
        timelineScrollWithFilterOpen = null;
        const restoreTimelineScroll = createTimelineScrollRestorer(
            options,
            main,
            timelineScrollBeforeFilterOpen
        );
        if (panel) {
            panel.classList.remove('filter-panel-closing');
            panel.classList.remove('hidden');
            if (typeof panel.setAttribute === 'function') panel.setAttribute('aria-hidden', 'false');
        }
        if (toggleBtn) toggleBtn.classList.add('active');
        if (advanced) advanced.classList.remove('hidden');
        syncAdvancedToggleButton(advancedBtn, getAdvancedFiltersOpen(options));

        beginFilterLayoutTransition(options, main, () => {
            restoreTimelineScroll();
            if (shouldResetFilterScroll) resetFilterPanelScroll(panel);
            if (timelineScrollBeforeFilterOpen !== null && main) {
                timelineScrollWithFilterOpen = Number(main.scrollTop) || 0;
            }
        });

        (options.pushUiState || noop)({ panel: 'filter' });

        const summary = doc.getElementById('timeline-summary');
        setTimelineSummaryHidden(options, doc, summary, true);

        const pageTimeline = doc.getElementById('page-timeline');
        if (pageTimeline) pageTimeline.classList.add('filter-open');

        alignMainBelowFilterPanel(main, panel);
        updateAppMainPadding(options);
        restoreTimelineScroll();
        if (shouldResetFilterScroll) {
            resetFilterPanelScroll(panel);
            defer(options, () => resetFilterPanelScroll(panel));
        }
    }

    function closeFilterPanel(options = {}, fromPopstate = false) {
        const doc = getDocument(options);
        const body = getBody(options, doc);
        const wasOpen = getFilterOpen(options);
        const hadAdvancedFilters = getAdvancedFiltersOpen(options);
        const shouldCleanupReleasedFilterSearchHistory =
            !!(options.shouldCleanupReleasedFilterSearchHistory &&
                options.shouldCleanupReleasedFilterSearchHistory());

        if (hadAdvancedFilters) resetFilterScrollOnNextOpen = true;

        setFilterOpen(options, false);
        setAdvancedFiltersOpen(options, false);

        const panel = doc.getElementById('filter-panel');
        const toggleBtn = doc.getElementById('btn-filter-toggle');
        const advanced = doc.getElementById('advanced-filters');
        const advancedBtn = doc.getElementById('btn-advanced-toggle');
        const main = doc.getElementById('app-main');
        const currentTimelineScroll = main && getCurrentPage(options) === 'timeline'
            ? Number(main.scrollTop) || 0
            : null;
        const filterDidNotScrollTimeline = currentTimelineScroll !== null &&
            timelineScrollBeforeFilterOpen !== null &&
            (timelineScrollWithFilterOpen === null ||
                Math.abs(currentTimelineScroll - timelineScrollWithFilterOpen) <= 1);
        const closeScrollTarget = filterDidNotScrollTimeline
            ? timelineScrollBeforeFilterOpen
            : currentTimelineScroll;
        const restoreTimelineScroll = createTimelineScrollRestorer(options, main, closeScrollTarget);

        if (panel) {
            panel.classList.add('filter-panel-closing');
            if (typeof panel.setAttribute === 'function') panel.setAttribute('aria-hidden', 'true');
        }
        if (toggleBtn) toggleBtn.classList.remove('active');
        syncAdvancedToggleButton(advancedBtn, false);
        if (body) body.classList.remove('no-scroll');
        syncInputBarForAdvanced(options, false);

        const summary = doc.getElementById('timeline-summary');
        const pageTimeline = doc.getElementById('page-timeline');
        beginFilterLayoutTransition(options, main, () => {
            if (panel) {
                panel.classList.add('hidden');
                panel.classList.remove('filter-panel-closing');

                if (hadAdvancedFilters) resetFilterPanelScroll(panel);
            }
            if (advanced) advanced.classList.add('hidden');
            restoreTimelineScroll();
            timelineScrollBeforeFilterOpen = null;
            timelineScrollWithFilterOpen = null;
        });

        // Disattiva lo scroll anchoring prima di qualsiasi variazione geometrica:
        // il browser non deve scegliere il riepilogo come nuova ancora a meta chiusura.
        setTimelineSummaryHidden(options, doc, summary, false);
        if (pageTimeline) pageTimeline.classList.remove('filter-open');
        if (main) main.style.marginTop = '';
        restoreTimelineScroll();

        const steps = (hadAdvancedFilters ? 2 : 1) +
            (!fromPopstate && shouldCleanupReleasedFilterSearchHistory ? 1 : 0);

        (options.runHistoryAction || noop)(getCloseHistoryAction(options, {
            fromPopstate,
            wasOpen,
            steps
        }));

        if (shouldCleanupReleasedFilterSearchHistory) {
            if (typeof options.clearReleasedFilterSearchHistory === 'function') {
                options.clearReleasedFilterSearchHistory();
            }

            if (fromPopstate && typeof options.consumeUiState === 'function') {
                options.consumeUiState(1);
            }
        }

        updateAppMainPadding(options);
    }

    function getActiveFilterCount(options = {}) {
        return countActive(options);
    }

    function updateFilterBadge(options = {}) {
        const doc = getDocument(options);
        syncSelectionFilterUI(options);
        const filterModel = getFilterModel(options);
        const n = filterModel
            ? Number(filterModel.activeFilterCount || 0)
            : countActive(options);
        const badge = doc.getElementById('filter-badge');
        const resetBtn = doc.getElementById('btn-filter-reset');
        const info = doc.getElementById('filter-info');
        const allSpese = filterModel
            ? (filterModel.allSpese || [])
            : getSpese(options);

        if (n > 0) {
            if (badge) {
                badge.textContent = n;
                badge.classList.remove('hidden');
            }
            if (resetBtn) resetBtn.classList.remove('hidden');
            if (info) {
                info.textContent = renderFooterInfo(options, {
                    activeCount: n,
                    filtered: filterModel
                        ? (filterModel.filteredSpese || [])
                        : applyFilters(options, allSpese)
                });
            }
            return n;
        }

        if (badge) badge.classList.add('hidden');
        if (resetBtn) resetBtn.classList.add('hidden');
        if (info) {
            info.textContent = renderFooterInfo(options, {
                activeCount: n,
                quickTotals: filterModel
                    ? filterModel.quickTotals
                    : getQuickTotals(options, allSpese)
            });
        }

        return n;
    }

    function resetFilters(options = {}, config = {}) {
        const filters = options.filters;

        forgetQuickFilterRestore(config.quickFilterState || activeQuickFilterState);

        filters.query = '';
        if (filters.categories && typeof filters.categories.clear === 'function') filters.categories.clear();
        if (filters.excludedCategories && typeof filters.excludedCategories.clear === 'function') filters.excludedCategories.clear();
        if (filters.methods && typeof filters.methods.clear === 'function') filters.methods.clear();
        if (filters.excludedMethods && typeof filters.excludedMethods.clear === 'function') filters.excludedMethods.clear();
        filters.amountMin = 0;
        filters.amountMax = Infinity;
        filters.dateFrom = '';
        filters.dateTo = '';
        filters.selectedOnly = false;
        filters.excludedSelectedOnly = false;
        filters.selectedOnlyIds = new Set();

        syncFilterUI(options);
        notifyFilterChange(options);
        if (config.showToast !== false) {
            (options.showToast || noop)('Filtri resettati', 'info');
        }
    }

    return {
        init,
        toggleAdvancedFilters,
        openAdvancedFilters,
        closeAdvancedFilters,
        buildChips,
        syncFilterUI,
        initSlider,
        recalcSliderMax,
        updateSliderUI,
        openFilterPanel,
        closeFilterPanel,
        getActiveFilterCount,
        updateFilterBadge,
        resetFilters,
        releaseFilterSearchInteraction,
        normalizeQuickFilterSnapshot,
        areQuickFilterSnapshotsEqual,
        getQuickFilterStorageKey,
        readQuickFilter,
        saveQuickFilter,
        observeQuickFilterChange,
        handleQuickFilterLongPress,
        bindQuickFilterLongPress,
        bindLongPressGesture,
        forgetQuickFilterRestore
    };
})();
