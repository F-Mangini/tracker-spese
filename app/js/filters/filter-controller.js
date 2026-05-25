/* ============================================
   FILTER CONTROLLER - wiring pannello filtri
   ============================================ */

const FilterController = (() => {
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

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (getFilterOpen(options)) closeFilterPanel(options);
                else openFilterPanel(options);
            });
        }

        if (searchInput && clearBtn) {
            searchInput.addEventListener('input', () => {
                options.filters.query = searchInput.value.trim();
                clearBtn.classList.toggle('hidden', !options.filters.query);
                (options.onFilterChange || noop)();
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
                (options.onFilterChange || noop)();
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
                (options.onFilterChange || noop)();
                try { el.blur(); } catch (_) { }
            });
        });

        if (resetBtn) resetBtn.addEventListener('click', () => resetFilters(options));
        if (advToggle) advToggle.addEventListener('click', () => toggleAdvancedFilters(options));

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
        if (btn) btn.classList.add('active');
        setBodyScrollLockForAdvanced(options, shouldLockMainScrollForAdvanced(options));
        syncInputBarForAdvanced(options, true);
        (options.pushUiState || noop)({ panel: 'advanced-filters' });

        defer(options, () => {
            const panel = doc.getElementById('filter-panel');
            const main = doc.getElementById('app-main');
            if (panel && main) {
                main.style.marginTop = `calc(var(--header-h) + ${panel.offsetHeight}px)`;
            }

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
        if (section) section.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        setBodyScrollLockForAdvanced(options, false);
        syncInputBarForAdvanced(options, false);

        defer(options, () => {
            const panel = doc.getElementById('filter-panel');
            if (!panel || panel.classList.contains('hidden')) return;

            const main = doc.getElementById('app-main');
            if (main) main.style.marginTop = `calc(var(--header-h) + ${panel.offsetHeight}px)`;
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
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;

                if (targetSet.has(id)) {
                    targetSet.delete(id);
                    chip.classList.remove('active');
                } else {
                    targetSet.add(id);
                    chip.classList.add('active');
                }

                (options.onFilterChange || noop)();
            });
        });
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
            chip.classList.toggle('active', filters.categories.has(chip.dataset.id));
        });

        doc.querySelectorAll('#filter-methods .filter-chip').forEach(chip => {
            chip.classList.toggle('active', filters.methods.has(chip.dataset.id));
        });

        recalcSliderMax(options);
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
            (options.onFilterChange || noop)();
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
        if (panel) panel.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');

        (options.pushUiState || noop)({ panel: 'filter' });

        const summary = doc.getElementById('timeline-summary');
        if (summary) summary.classList.add('hidden');

        const pageTimeline = doc.getElementById('page-timeline');
        if (pageTimeline) pageTimeline.classList.add('filter-open');

        defer(options, () => {
            const main = doc.getElementById('app-main');
            if (panel && main) {
                main.style.marginTop = `calc(var(--header-h) + ${panel.offsetHeight}px)`;
            }
            updateAppMainPadding(options);
        });
    }

    function closeFilterPanel(options = {}, fromPopstate = false) {
        const doc = getDocument(options);
        const body = getBody(options, doc);
        const wasOpen = getFilterOpen(options);
        const hadAdvancedFilters = getAdvancedFiltersOpen(options);
        const shouldCleanupReleasedFilterSearchHistory =
            !!(options.shouldCleanupReleasedFilterSearchHistory &&
                options.shouldCleanupReleasedFilterSearchHistory());

        setFilterOpen(options, false);
        setAdvancedFiltersOpen(options, false);

        const panel = doc.getElementById('filter-panel');
        const toggleBtn = doc.getElementById('btn-filter-toggle');
        const advanced = doc.getElementById('advanced-filters');
        const advancedBtn = doc.getElementById('btn-advanced-toggle');

        if (panel) panel.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
        if (advanced) advanced.classList.add('hidden');
        if (advancedBtn) advancedBtn.classList.remove('active');
        if (body) body.classList.remove('no-scroll');
        syncInputBarForAdvanced(options, false);

        const summary = doc.getElementById('timeline-summary');
        if (summary) summary.classList.remove('hidden');

        const pageTimeline = doc.getElementById('page-timeline');
        if (pageTimeline) pageTimeline.classList.remove('filter-open');

        const main = doc.getElementById('app-main');
        if (main) main.style.marginTop = '';

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

    function resetFilters(options = {}) {
        const filters = options.filters;

        filters.query = '';
        if (filters.categories && typeof filters.categories.clear === 'function') filters.categories.clear();
        if (filters.methods && typeof filters.methods.clear === 'function') filters.methods.clear();
        filters.amountMin = 0;
        filters.amountMax = Infinity;
        filters.dateFrom = '';
        filters.dateTo = '';

        syncFilterUI(options);
        (options.onFilterChange || noop)();
        (options.showToast || noop)('Filtri resettati', 'info');
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
        releaseFilterSearchInteraction
    };
})();
