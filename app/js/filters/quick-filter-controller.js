/* ============================================
   QUICK FILTER CONTROLLER - snapshot rapido e long-press
   ============================================ */

export const QuickFilterController = (() => {
    const QUICK_FILTER_LONG_PRESS_MS = 450;
    const LONG_PRESS_RELEASE_TOLERANCE_MS = 24;
    const QUICK_FILTER_STORAGE_SUFFIX = ':quick-filter';
    let volatileState = {
        activeState: null
    };

    function noop() { }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
    }

    function readOptionState(options, getter, prop, fallback) {
        if (typeof options[getter] === 'function') return options[getter]();
        if (options.state && Object.prototype.hasOwnProperty.call(options.state, prop)) {
            return options.state[prop];
        }
        if (Object.prototype.hasOwnProperty.call(options, prop)) return options[prop];
        return fallback;
    }

    function getFilterOpen(options) {
        return !!readOptionState(options, 'getFilterOpen', 'filterOpen', false);
    }

    function getAdvancedFiltersOpen(options) {
        return !!readOptionState(options, 'getAdvancedFiltersOpen', 'advancedFiltersOpen', false);
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

    function createState(options = {}) {
        return {
            savedSnapshot: readQuickFilter(options),
            restoreSnapshot: null,
            lastObservedSnapshot: createCurrentQuickFilterSnapshot(options)
        };
    }

    function observeQuickFilterChange(options = {}, state = volatileState.activeState) {
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
        volatileState.activeState = state;
        return bindLongPressGesture(
            button,
            options,
            () => handleQuickFilterLongPress(options, state),
            options.quickFilterLongPressMs || QUICK_FILTER_LONG_PRESS_MS
        );
    }

    function forgetQuickFilterRestore(state = volatileState.activeState) {
        if (!state) return;
        state.restoreSnapshot = null;
        state.lastObservedSnapshot = null;
    }

    function getState() {
        return {
            activeState: volatileState.activeState
                ? {
                    savedSnapshot: volatileState.activeState.savedSnapshot || null,
                    restoreSnapshot: volatileState.activeState.restoreSnapshot || null,
                    lastObservedSnapshot: volatileState.activeState.lastObservedSnapshot || null
                }
                : null
        };
    }

    function resetState() {
        volatileState = {
            activeState: null
        };
    }

    return {
        QUICK_FILTER_LONG_PRESS_MS,
        LONG_PRESS_RELEASE_TOLERANCE_MS,
        QUICK_FILTER_STORAGE_SUFFIX,
        normalizeSnapshot: normalizeQuickFilterSnapshot,
        areSnapshotsEqual: areQuickFilterSnapshotsEqual,
        getStorageKey: getQuickFilterStorageKey,
        read: readQuickFilter,
        save: saveQuickFilter,
        createCurrentSnapshot: createCurrentQuickFilterSnapshot,
        applySnapshot: applyQuickFilterSnapshot,
        createState,
        getState,
        resetState,
        observeChange: observeQuickFilterChange,
        handleLongPress: handleQuickFilterLongPress,
        bindLongPressGesture,
        bindQuickFilterLongPress,
        forgetRestore: forgetQuickFilterRestore,
        normalizeQuickFilterSnapshot,
        areQuickFilterSnapshotsEqual,
        getQuickFilterStorageKey,
        readQuickFilter,
        saveQuickFilter,
        observeQuickFilterChange,
        handleQuickFilterLongPress,
        forgetQuickFilterRestore
    };
})();
