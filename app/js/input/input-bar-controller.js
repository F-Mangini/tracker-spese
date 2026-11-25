/* ============================================
   INPUT BAR CONTROLLER - layout tastiera/input
   ============================================ */

export const InputBarController = (() => {
    const KEYBOARD_VIEWPORT_THRESHOLD = 100;
    const KEYBOARD_POLL_MS = 120;
    const TRANSITION_SYNC_MS = 500;
    const CLOSE_SETTLE_MS = 450;
    const keyboardTouchLocks = new WeakMap();
    const baselineViewports = new WeakMap();
    const keyboardPollTimers = new WeakMap();
    const lastSyncedLayout = new WeakMap();
    const activeWindowScrollHandlers = new WeakMap();
    const viewportTransitionSyncs = new WeakMap();
    const viewportCloseSettles = new WeakMap();

    function noop() { }

    function getDocument(options) {
        return options.document || (typeof document !== 'undefined' ? document : null);
    }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
    }

    function isAppleTouchDevice(options = {}) {
        const win = getWindow(options);
        const nav = options.navigator ||
            (win && win.navigator) ||
            (typeof navigator !== 'undefined' ? navigator : null);
        if (!nav) return false;

        const ua = String(nav.userAgent || '');
        const platform = String(nav.platform || '');
        const maxTouchPoints = Number(nav.maxTouchPoints || 0);

        return /iP(?:hone|ad|od)/i.test(ua) ||
            (platform === 'MacIntel' && maxTouchPoints > 1);
    }

    function recordBaselineViewport(options = {}, forceReset = false) {
        const win = getWindow(options);
        if (!win || typeof win !== 'object') return 0;

        const doc = getDocument(options);
        const vv = win.visualViewport;
        const width = Math.round(Number(win.innerWidth || (vv && vv.width) || 0));
        const innerH = Number(win.innerHeight) || 0;
        const clientH = Number(doc && doc.documentElement && doc.documentElement.clientHeight) || 0;
        const vvH = vv && Number.isFinite(vv.height) ? Number(vv.height) : 0;
        const currentMax = Math.max(0, Math.round(Math.max(innerH, clientH, vvH)));
        if (currentMax <= 0) return 0;

        const prev = baselineViewports.get(win);
        if (forceReset || !prev || (width > 0 && prev.width > 0 && Math.abs(prev.width - width) > 2)) {
            baselineViewports.set(win, { width, height: currentMax });
            return currentMax;
        }

        const nextHeight = Math.max(prev.height, currentMax);
        baselineViewports.set(win, { width: width || prev.width, height: nextHeight });
        return nextHeight;
    }

    function getBaselineHeight(options = {}) {
        const win = getWindow(options);
        if (!win || typeof win !== 'object') return 0;
        const entry = baselineViewports.get(win);
        return entry ? entry.height : 0;
    }

    function getExpenseInputActive(options) {
        return !!(options.isExpenseInputActive && options.isExpenseInputActive());
    }

    function getFilterSearchActive(options) {
        return !!(options.isFilterSearchActive && options.isFilterSearchActive());
    }

    function getFilterOpen(options) {
        return !!(options.isFilterOpen && options.isFilterOpen());
    }

    function setRootVar(doc, name, value) {
        const rootStyle = doc && doc.documentElement && doc.documentElement.style;
        if (!rootStyle) return;

        if (typeof rootStyle.setProperty === 'function') {
            rootStyle.setProperty(name, value);
        } else {
            rootStyle[name] = value;
        }
    }

    function removeRootVar(doc, name) {
        const rootStyle = doc && doc.documentElement && doc.documentElement.style;
        if (!rootStyle) return;

        if (typeof rootStyle.removeProperty === 'function') {
            rootStyle.removeProperty(name);
        } else {
            rootStyle[name] = '';
        }
    }

    function getVisualViewportMetrics(options = {}) {
        const win = getWindow(options);
        const vv = win && win.visualViewport;
        const isAppleTouch = isAppleTouchDevice(options);
        const layoutHeight = Number(win && win.innerHeight) || 0;

        if (!vv || !Number.isFinite(vv.height)) {
            return {
                available: false,
                layoutHeight,
                height: layoutHeight,
                offsetTop: 0,
                rawOffsetTop: 0,
                keyboardHeight: 0,
                bottomInset: 0,
                isKeyboardOpen: false,
                isAppleTouch
            };
        }

        const height = Math.max(0, Math.round(vv.height));
        const rawOffsetTop = Math.max(0, Math.round(Number(vv.offsetTop) || 0));
        const offsetTop = rawOffsetTop;
        const layoutGap = Math.max(0, Math.round(layoutHeight - vv.height));
        const baselineHeight = getBaselineHeight(options);
        const baselineGap = baselineHeight > 0 ? Math.max(0, Math.round(baselineHeight - vv.height)) : 0;
        const keyboardHeight = isAppleTouch ? Math.max(layoutGap, baselineGap) : layoutGap;
        const bottomInset = Math.max(0, Math.round(layoutHeight - (offsetTop + vv.height)));
        const isKeyboardOpen = isAppleTouch
            ? (keyboardHeight > KEYBOARD_VIEWPORT_THRESHOLD || rawOffsetTop > 0)
            : (layoutGap > KEYBOARD_VIEWPORT_THRESHOLD);

        return {
            available: true,
            layoutHeight,
            height,
            offsetTop,
            rawOffsetTop,
            keyboardHeight,
            bottomInset,
            isKeyboardOpen,
            isAppleTouch
        };
    }

    function getKeyboardInset(options = {}) {
        return getVisualViewportMetrics(options).bottomInset;
    }

    function syncVisualViewportLayout(options = {}, allowActive = true) {
        const doc = getDocument(options);
        const win = getWindow(options);
        const isExpenseActive = allowActive && getExpenseInputActive(options);
        const isAnyInputActive = allowActive && (isExpenseActive || getFilterSearchActive(options));

        if (!isAnyInputActive) {
            recordBaselineViewport(options);
        }

        const metrics = getVisualViewportMetrics(options);
        const bodyClassList = doc && doc.body && doc.body.classList;
        const shouldHideIosBottomNav = isExpenseActive && metrics.isAppleTouch;

        if (bodyClassList) {
            if (shouldHideIosBottomNav && typeof bodyClassList.add === 'function') {
                bodyClassList.add('ios-expense-input-active');
            } else if (!shouldHideIosBottomNav && typeof bodyClassList.remove === 'function') {
                bodyClassList.remove('ios-expense-input-active');
            }
        }

        const shouldLockVisualViewport = isAnyInputActive && metrics.isKeyboardOpen;

        if (shouldLockVisualViewport) {
            if (
                win &&
                Number(win.scrollY || 0) > 0 &&
                Number(win.visualViewport && win.visualViewport.offsetTop || 0) === 0 &&
                typeof win.scrollTo === 'function'
            ) {
                try { win.scrollTo(0, 0); } catch (_) { }
            }

            if (bodyClassList && typeof bodyClassList.remove === 'function') {
                bodyClassList.remove('vv-keyboard-settling');
            }
            if (bodyClassList && typeof bodyClassList.add === 'function') {
                bodyClassList.add('vv-keyboard-open');
            }
            setRootVar(doc, '--vv-offset-top', `${metrics.offsetTop}px`);
            setRootVar(doc, '--vv-height', `${metrics.height}px`);
            setRootVar(doc, '--vv-bottom-inset', `${metrics.bottomInset}px`);

            if (doc && typeof doc === 'object') {
                const prev = lastSyncedLayout.get(doc);
                if (
                    !prev ||
                    prev.offsetTop !== metrics.offsetTop ||
                    prev.height !== metrics.height ||
                    prev.bottomInset !== metrics.bottomInset
                ) {
                    lastSyncedLayout.set(doc, {
                        offsetTop: metrics.offsetTop,
                        height: metrics.height,
                        bottomInset: metrics.bottomInset
                    });
                    const header = typeof doc.getElementById === 'function'
                        ? doc.getElementById('app-header')
                        : null;
                    if (header) void header.offsetHeight;
                }
            }
        } else {
            if (bodyClassList && typeof bodyClassList.remove === 'function') {
                bodyClassList.remove('vv-keyboard-open');
                bodyClassList.remove('vv-keyboard-settling');
            }
            removeRootVar(doc, '--vv-offset-top');
            removeRootVar(doc, '--vv-height');
            removeRootVar(doc, '--vv-bottom-inset');
            if (doc && typeof doc === 'object') {
                lastSyncedLayout.delete(doc);
            }
        }

        return { metrics, shouldLockVisualViewport };
    }

    function getNow(win) {
        if (win && win.performance && typeof win.performance.now === 'function') {
            return win.performance.now();
        }
        return Date.now();
    }

    function getRequestAnimationFrame(options, win) {
        if (typeof options.requestAnimationFrame === 'function') return options.requestAnimationFrame;
        if (win && typeof win.requestAnimationFrame === 'function') {
            return win.requestAnimationFrame.bind(win);
        }
        if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;
        return null;
    }

    function getCancelAnimationFrame(options, win) {
        if (typeof options.cancelAnimationFrame === 'function') return options.cancelAnimationFrame;
        if (win && typeof win.cancelAnimationFrame === 'function') {
            return win.cancelAnimationFrame.bind(win);
        }
        if (typeof cancelAnimationFrame === 'function') return cancelAnimationFrame;
        return noop;
    }

    function getSetTimeout(options, win) {
        if (typeof options.setTimeout === 'function') return options.setTimeout;
        if (win && typeof win.setTimeout === 'function') return win.setTimeout.bind(win);
        if (typeof setTimeout === 'function') return setTimeout;
        return null;
    }

    function getClearTimeout(options, win) {
        if (typeof options.clearTimeout === 'function') return options.clearTimeout;
        if (win && typeof win.clearTimeout === 'function') return win.clearTimeout.bind(win);
        if (typeof clearTimeout === 'function') return clearTimeout;
        return null;
    }

    function runSafeRafLoop(raf, entry, weakMap, win, onTick) {
        if (!raf || !entry || !weakMap || !win) return;

        let scheduling = false;
        let ranSync = false;

        const step = () => {
            if (scheduling) ranSync = true;
            if (entry.stopped || weakMap.get(win) !== entry) return;

            entry.rafId = null;
            const keepGoing = onTick();
            if (ranSync || !keepGoing || entry.stopped || weakMap.get(win) !== entry) {
                return;
            }
            scheduleFrame();
        };

        const scheduleFrame = () => {
            if (entry.stopped || weakMap.get(win) !== entry) return;
            scheduling = true;
            ranSync = false;
            const id = raf(step);
            scheduling = false;
            if (!ranSync && !entry.stopped && weakMap.get(win) === entry) {
                entry.rafId = id;
            }
        };

        scheduleFrame();
    }

    function stopTransitionSync(options = {}) {
        const win = getWindow(options);
        if (!win || typeof win !== 'object') return;

        const active = viewportTransitionSyncs.get(win);
        if (!active) return;

        active.stopped = true;
        viewportTransitionSyncs.delete(win);
        if (active.rafId != null) {
            const cancelRaf = getCancelAnimationFrame(options, win);
            try { cancelRaf(active.rafId); } catch (_) { }
        }
    }

    function startTransitionSync(options = {}) {
        stopTransitionSync(options);

        const win = getWindow(options);
        if (!win || typeof win !== 'object' || !isAppleTouchDevice(options)) return;

        const raf = getRequestAnimationFrame(options, win);
        if (!raf) return;

        const startTime = getNow(win);
        const entry = { rafId: null, stopped: false };
        viewportTransitionSyncs.set(win, entry);

        runSafeRafLoop(raf, entry, viewportTransitionSyncs, win, () => {
            if (!getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                stopTransitionSync(options);
                return false;
            }

            updatePosition(options);
            if (getNow(win) - startTime < TRANSITION_SYNC_MS) {
                return true;
            }

            stopTransitionSync(options);
            return false;
        });
    }

    function stopCloseSettle(options = {}, { keepOffsetVar = false } = {}) {
        const win = getWindow(options);
        const doc = getDocument(options);
        const active = win && typeof win === 'object' ? viewportCloseSettles.get(win) : null;

        if (active) {
            active.stopped = true;
            viewportCloseSettles.delete(win);

            if (active.rafId != null) {
                const cancelRaf = getCancelAnimationFrame(options, win);
                try { cancelRaf(active.rafId); } catch (_) { }
            }

            const clearTimer = getClearTimeout(options, win);
            if (active.timeoutId != null && clearTimer) {
                try { clearTimer(active.timeoutId); } catch (_) { }
            }

            if (win && typeof win.removeEventListener === 'function') {
                win.removeEventListener('scroll', active.onViewportChange);
            }
            if (win && win.visualViewport && typeof win.visualViewport.removeEventListener === 'function') {
                win.visualViewport.removeEventListener('resize', active.onViewportChange);
                win.visualViewport.removeEventListener('scroll', active.onViewportChange);
            }
        }

        const bodyClassList = doc && doc.body && doc.body.classList;
        if (bodyClassList && typeof bodyClassList.remove === 'function') {
            bodyClassList.remove('vv-keyboard-settling');
        }

        if (!keepOffsetVar) {
            removeRootVar(doc, '--vv-offset-top');
            if (doc && typeof doc === 'object') {
                lastSyncedLayout.delete(doc);
            }
        }
    }

    function startCloseSettle(options = {}, initialMetrics = null) {
        stopCloseSettle(options, { keepOffsetVar: true });

        const win = getWindow(options);
        const doc = getDocument(options);
        if (!win || typeof win !== 'object') {
            stopCloseSettle(options);
            return;
        }

        const vv = win.visualViewport;
        const startOffset = initialMetrics
            ? initialMetrics.offsetTop
            : Math.max(0, Math.round(Number(vv && vv.offsetTop) || 0));

        if (startOffset <= 0) {
            stopCloseSettle(options);
            return;
        }

        const bodyClassList = doc && doc.body && doc.body.classList;
        if (bodyClassList && typeof bodyClassList.add === 'function') {
            bodyClassList.add('vv-keyboard-settling');
        }
        setRootVar(doc, '--vv-offset-top', `${startOffset}px`);

        const entry = {
            rafId: null,
            timeoutId: null,
            stopped: false,
            onViewportChange: null
        };
        viewportCloseSettles.set(win, entry);

        const syncSettlingOffset = () => {
            if (entry.stopped || viewportCloseSettles.get(win) !== entry) return false;

            if (getExpenseInputActive(options) || getFilterSearchActive(options)) {
                stopCloseSettle(options, { keepOffsetVar: true });
                return false;
            }

            const nextOffset = Math.max(0, Math.round(Number(vv && vv.offsetTop) || 0));
            if (nextOffset > 0) {
                setRootVar(doc, '--vv-offset-top', `${nextOffset}px`);
                return true;
            }

            stopCloseSettle(options);
            if (win && Number(win.scrollY || 0) > 0 && typeof win.scrollTo === 'function') {
                try { win.scrollTo(0, 0); } catch (_) { }
            }
            return false;
        };

        entry.onViewportChange = () => {
            syncSettlingOffset();
        };

        if (typeof win.addEventListener === 'function') {
            win.addEventListener('scroll', entry.onViewportChange, { passive: true });
        }
        if (vv && typeof vv.addEventListener === 'function') {
            vv.addEventListener('resize', entry.onViewportChange, { passive: true });
            vv.addEventListener('scroll', entry.onViewportChange, { passive: true });
        }

        const raf = getRequestAnimationFrame(options, win);
        runSafeRafLoop(raf, entry, viewportCloseSettles, win, syncSettlingOffset);

        const setTimer = getSetTimeout(options, win);
        if (setTimer) {
            entry.timeoutId = setTimer(() => {
                if (entry.stopped || viewportCloseSettles.get(win) !== entry) return;

                const needsScrollReset = !!(
                    win && typeof win.scrollTo === 'function' && (
                        Number(win.scrollY || 0) > 0 ||
                        Number(vv && vv.offsetTop || 0) > 0
                    )
                );
                stopCloseSettle(options);
                if (needsScrollReset && !getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                    try { win.scrollTo(0, 0); } catch (_) { }
                }
            }, CLOSE_SETTLE_MS);
        }
    }

    function stopKeyboardPoll(options = {}) {
        const win = getWindow(options);
        if (!win || typeof win !== 'object') return;

        const active = keyboardPollTimers.get(win);
        if (!active) return;

        keyboardPollTimers.delete(win);
        if (typeof active.clear === 'function') {
            try { active.clear(active.id); } catch (_) { }
        }
    }

    function startKeyboardPoll(options = {}) {
        stopKeyboardPoll(options);

        const win = getWindow(options);
        if (!win || typeof win !== 'object') return;

        const setIntervalFn = typeof options.setInterval === 'function'
            ? options.setInterval
            : (typeof win.setInterval === 'function' ? win.setInterval.bind(win) : null);
        const clearIntervalFn = typeof options.clearInterval === 'function'
            ? options.clearInterval
            : (typeof win.clearInterval === 'function'
                ? win.clearInterval.bind(win)
                : (typeof clearInterval === 'function' ? clearInterval : noop));

        if (!setIntervalFn) return;

        const id = setIntervalFn(() => {
            if (!getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                stopKeyboardPoll(options);
                return;
            }
            updatePosition(options);
        }, KEYBOARD_POLL_MS);

        keyboardPollTimers.set(win, { id, clear: clearIntervalFn });
    }

    function closestTarget(target, selector) {
        return target && typeof target.closest === 'function'
            ? target.closest(selector)
            : null;
    }

    function hasKeyboardOpenClass(doc) {
        return !!(doc && doc.body && doc.body.classList && doc.body.classList.contains('vv-keyboard-open'));
    }

    function bindKeyboardTouchLock(doc) {
        if (!doc || typeof doc.addEventListener !== 'function') return;
        if (keyboardTouchLocks.has(doc)) return;

        let touchState = null;

        const onTouchStart = event => {
            const touches = event && event.touches;
            if (!hasKeyboardOpenClass(doc) || !touches || touches.length !== 1 || !touches[0]) {
                touchState = null;
                return;
            }

            const y = Number(touches[0].clientY || 0);
            touchState = {
                x: Number(touches[0].clientX || 0),
                y,
                lastY: y,
                axis: null
            };
        };

        const onTouchMove = event => {
            if (!touchState || !hasKeyboardOpenClass(doc)) return;

            const touches = event && event.touches;
            if (!touches || touches.length !== 1 || !touches[0]) return;

            const clientX = Number(touches[0].clientX || 0);
            const clientY = Number(touches[0].clientY || 0);
            const dx = clientX - touchState.x;
            const dy = clientY - touchState.y;
            const stepY = clientY - touchState.lastY;
            touchState.lastY = clientY;

            if (!touchState.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 6) {
                touchState.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }

            if (touchState.axis === 'x') return;

            const target = event && event.target;
            if (closestTarget(target, '#input-bar, .dual-slider input[type="range"]')) {
                return;
            }

            if (closestTarget(target, '#timeline-summary, .stats-sticky-header, #app-header, #bottom-nav, .filter-footer')) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            const scrollEl = closestTarget(target, '.modal-body, .sd-list, .filter-panel-scroll') ||
                closestTarget(target, '#app-main');
            if (!scrollEl) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            const maxScroll = Math.max(0, (Number(scrollEl.scrollHeight) || 0) - (Number(scrollEl.clientHeight) || 0));
            const moveY = stepY !== 0 ? stepY : dy;
            const scrollTop = Number(scrollEl.scrollTop) || 0;

            if (
                maxScroll <= 0 ||
                (scrollTop <= 0 && moveY > 0) ||
                (scrollTop >= maxScroll - 1 && moveY < 0)
            ) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
            }
        };

        const onTouchEnd = () => {
            touchState = null;
        };

        doc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
        doc.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        doc.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
        doc.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });

        keyboardTouchLocks.set(doc, {
            onTouchStart,
            onTouchMove,
            onTouchEnd
        });
    }

    function unbindKeyboardTouchLock(doc) {
        if (!doc || !keyboardTouchLocks.has(doc)) return;

        const listeners = keyboardTouchLocks.get(doc);
        keyboardTouchLocks.delete(doc);

        if (typeof doc.removeEventListener !== 'function' || !listeners) return;

        doc.removeEventListener('touchstart', listeners.onTouchStart, { capture: true });
        doc.removeEventListener('touchmove', listeners.onTouchMove, { capture: true });
        doc.removeEventListener('touchend', listeners.onTouchEnd, { capture: true });
        doc.removeEventListener('touchcancel', listeners.onTouchEnd, { capture: true });
    }

    function updateAppMainPadding(options = {}) {
        const doc = getDocument(options);
        const main = doc ? doc.getElementById('app-main') : null;
        if (!main) return;

        let paddingCalc = 'calc(';
        if (main.classList.contains('no-input-bar')) {
            paddingCalc += 'var(--nav-h) + var(--safe-bottom)';
        } else {
            paddingCalc += 'var(--input-h) + var(--nav-h) + var(--safe-bottom)';
        }

        if (getExpenseInputActive(options) || getFilterSearchActive(options)) {
            const inset = getKeyboardInset(options);
            if (inset > 0) {
                paddingCalc += ` + ${inset}px - var(--nav-h)`;
            }
        }

        if (getFilterOpen(options)) {
            const panel = doc ? doc.getElementById('filter-panel') : null;
            if (panel && !panel.classList.contains('hidden')) {
                paddingCalc += ` + ${panel.offsetHeight}px`;
            }
        }

        paddingCalc += ')';
        main.style.paddingBottom = paddingCalc;
    }

    function updatePosition(options = {}, force = false) {
        const { metrics, shouldLockVisualViewport } = syncVisualViewportLayout(options, true);
        updateAppMainPadding(options);

        const doc = getDocument(options);
        const inputBar = doc ? doc.getElementById('input-bar') : null;
        if (!inputBar) return;

        if (!getExpenseInputActive(options)) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
            return;
        }

        const inset = metrics.bottomInset;

        if (!shouldLockVisualViewport && inset <= 0) {
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
    }

    function schedulePositionUpdate(options = {}, force = false) {
        const currentRaf = options.getRafId ? options.getRafId() : null;
        const cancelFrame = options.cancelAnimationFrame ||
            (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : noop);
        const frame = options.requestAnimationFrame ||
            (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : callback => callback());

        if (currentRaf) {
            cancelFrame(currentRaf);
        }

        const nextRaf = frame(() => {
            if (options.setRafId) options.setRafId(null);
            updatePosition(options, force);
        });

        if (options.setRafId) options.setRafId(nextRaf);
    }

    function clearActiveWatch(options = {}) {
        stopKeyboardPoll(options);
        stopTransitionSync(options);

        const currentRaf = options.getRafId ? options.getRafId() : null;
        const cancelFrame = options.cancelAnimationFrame ||
            (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : noop);

        if (currentRaf) {
            cancelFrame(currentRaf);
            if (options.setRafId) options.setRafId(null);
        }

        const handler = options.getResizeHandler ? options.getResizeHandler() : null;
        const win = getWindow(options);
        const doc = getDocument(options);

        if (handler && win) {
            if (typeof win.removeEventListener === 'function') {
                win.removeEventListener('resize', handler);
            }

            if (win.visualViewport) {
                win.visualViewport.removeEventListener('resize', handler);
                win.visualViewport.removeEventListener('scroll', handler);
            }

            if (options.setResizeHandler) options.setResizeHandler(null);
        }

        if (win && typeof win === 'object') {
            const scrollHandler = activeWindowScrollHandlers.get(win);
            if (scrollHandler && typeof win.removeEventListener === 'function') {
                activeWindowScrollHandlers.delete(win);
                win.removeEventListener('scroll', scrollHandler);
            }
        }

        unbindKeyboardTouchLock(doc);

        const bodyClassList = doc && doc.body && doc.body.classList;
        if (bodyClassList && typeof bodyClassList.remove === 'function') {
            bodyClassList.remove('ios-expense-input-active');
            bodyClassList.remove('vv-keyboard-open');
        }

        const inputBar = doc ? doc.getElementById('input-bar') : null;
        if (inputBar) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
        }
    }

    function startWatch(options = {}) {
        stopCloseSettle(options, { keepOffsetVar: true });
        clearActiveWatch(options);
        recordBaselineViewport(options);

        const win = getWindow(options);
        const doc = getDocument(options);
        const isAppleTouch = isAppleTouchDevice(options);
        const handler = event => {
            if (event && (event.type === 'scroll' || (isAppleTouch && event.type === 'resize'))) {
                updatePosition(options);
                if (isAppleTouch) startTransitionSync(options);
                return;
            }
            schedulePositionUpdate(options);
        };

        if (options.setResizeHandler) options.setResizeHandler(handler);

        win.addEventListener('resize', handler, { passive: true });
        if (isAppleTouch && win && typeof win.addEventListener === 'function') {
            win.addEventListener('scroll', handler, { passive: true });
            activeWindowScrollHandlers.set(win, handler);
        }

        if (win.visualViewport) {
            win.visualViewport.addEventListener('resize', handler, { passive: true });
            win.visualViewport.addEventListener('scroll', handler, { passive: true });
        }

        bindKeyboardTouchLock(doc);
        syncVisualViewportLayout(options, true);
        startKeyboardPoll(options);
        if (isAppleTouch) startTransitionSync(options);
        schedulePositionUpdate(options, true);

        const delay = options.setTimeout || setTimeout;

        [60, 160, 320].forEach(ms => {
            delay(() => {
                if (getExpenseInputActive(options)) schedulePositionUpdate(options, true);
            }, ms);
        });
    }

    function stopWatch(options = {}) {
        stopCloseSettle(options, { keepOffsetVar: true });
        clearActiveWatch(options);

        const win = getWindow(options);
        const doc = getDocument(options);
        const metrics = getVisualViewportMetrics(options);

        if (metrics.isAppleTouch && metrics.offsetTop > 0) {
            removeRootVar(doc, '--vv-height');
            removeRootVar(doc, '--vv-bottom-inset');
            updateAppMainPadding(options);
            startCloseSettle(options, metrics);
            return;
        }

        syncVisualViewportLayout(options, false);
        updateAppMainPadding(options);

        const hasViewportOffset = !!(
            win && (
                Number(win.scrollY || 0) > 0 ||
                Number(win.scrollX || 0) > 0 ||
                (win.visualViewport && Number(win.visualViewport.offsetTop || 0) > 0)
            )
        );
        if (win && typeof win.scrollTo === 'function' && (hasViewportOffset || metrics.isAppleTouch)) {
            const delay = options.setTimeout ||
                (typeof setTimeout === 'function' ? setTimeout : callback => callback());
            if (!metrics.isAppleTouch && hasViewportOffset) {
                delay(() => {
                    if (!getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                        try { win.scrollTo(0, 0); } catch (_) { }
                    }
                }, 80);
            }
            if (metrics.isAppleTouch && Number(win.scrollY || 0) > 0) {
                delay(() => {
                    if (!getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                        try { win.scrollTo(0, 0); } catch (_) { }
                    }
                }, 250);
            }
        }
    }

    return {
        getVisualViewportMetrics,
        getKeyboardInset,
        syncVisualViewportLayout,
        updateAppMainPadding,
        updatePosition,
        schedulePositionUpdate,
        startWatch,
        stopWatch
    };
})();
