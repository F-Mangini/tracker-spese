/* ============================================
   INPUT BAR CONTROLLER - layout tastiera/input
   ============================================ */

export const InputBarController = (() => {
    const KEYBOARD_VIEWPORT_THRESHOLD = 100;
    const KEYBOARD_POLL_MS = 120;
    const TRANSITION_SYNC_MS = 500;
    const CLOSE_SETTLE_MS = 450;
    const PRE_LIFT_TARGET_TOP = 164;
    const PRE_LIFT_COMPACT_TARGET_TOP = 96;
    const PRE_LIFT_FALLBACK_BAR_HEIGHT = 68;
    const PRE_LIFT_MAX_MS = 650;
    const DEV_DIAG_MAX_ENTRIES = 180;
    const DEV_DIAG_BURST_MS = 750;
    const DEV_DIAG_BURST_TICKS = [50, 150, 300, 500, 750];
    const keyboardTouchLocks = new WeakMap();
    const baselineViewports = new WeakMap();
    const keyboardPollTimers = new WeakMap();
    const lastSyncedLayout = new WeakMap();
    const activeWindowScrollHandlers = new WeakMap();
    const viewportTransitionSyncs = new WeakMap();
    const viewportCloseSettles = new WeakMap();
    const preLiftedInputBars = new WeakMap();
    const devDiagnosticsStates = new WeakMap();

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

    function getPreLiftBottom(options = {}, metrics = {}, inputBar = null) {
        const viewportH = Math.max(
            metrics.fixedViewportHeight || 0,
            metrics.layoutHeight || 0,
            getBaselineHeight(options) || 0,
            metrics.height || 0
        );
        if (viewportH <= 0) return 0;

        const rawBarH = Number(inputBar && inputBar.offsetHeight) || 0;
        const barH = rawBarH > 0 ? Math.max(48, Math.round(rawBarH)) : PRE_LIFT_FALLBACK_BAR_HEIGHT;
        const targetTop = viewportH < 500
            ? PRE_LIFT_COMPACT_TARGET_TOP
            : PRE_LIFT_TARGET_TOP;
        return Math.max(0, Math.round(viewportH - (targetTop + barH)));
    }

    function setPreLiftClass(doc, active) {
        const bodyClassList = doc && doc.body && doc.body.classList;
        if (!bodyClassList) return;
        if (active && typeof bodyClassList.add === 'function') {
            bodyClassList.add('ios-input-bar-prelift');
        } else if (!active && typeof bodyClassList.remove === 'function') {
            bodyClassList.remove('ios-input-bar-prelift');
        }
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
        const doc = getDocument(options);
        const vv = win && win.visualViewport;
        const isAppleTouch = isAppleTouchDevice(options);
        const layoutHeight = Number(win && win.innerHeight) || 0;
        const clientHeight = Number(doc && doc.documentElement && doc.documentElement.clientHeight) || 0;
        const fixedViewportHeight = isAppleTouch ? Math.max(layoutHeight, clientHeight) : layoutHeight;

        if (!vv || !Number.isFinite(vv.height)) {
            return {
                available: false,
                layoutHeight,
                fixedViewportHeight,
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
        const layoutGap = Math.max(0, Math.round(fixedViewportHeight - vv.height));
        const baselineHeight = getBaselineHeight(options);
        const baselineGap = baselineHeight > 0 ? Math.max(0, Math.round(baselineHeight - vv.height)) : 0;
        const keyboardHeight = isAppleTouch ? Math.max(layoutGap, baselineGap) : layoutGap;
        const bottomInset = Math.max(0, Math.round(fixedViewportHeight - (offsetTop + vv.height)));
        const isKeyboardOpen = isAppleTouch
            ? (keyboardHeight > KEYBOARD_VIEWPORT_THRESHOLD || rawOffsetTop > 0)
            : (layoutGap > KEYBOARD_VIEWPORT_THRESHOLD);

        return {
            available: true,
            layoutHeight,
            fixedViewportHeight,
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
        const win = getWindow(options);
        const inputBar = doc ? doc.getElementById('input-bar') : null;
        if (!inputBar) return;

        if (!getExpenseInputActive(options)) {
            if (win && typeof win === 'object') preLiftedInputBars.delete(win);
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
            setPreLiftClass(doc, false);
            return;
        }

        const inset = metrics.bottomInset;
        const preLift = win && typeof win === 'object' ? preLiftedInputBars.get(win) : null;

        if (metrics.isKeyboardOpen) {
            if (win && typeof win === 'object') preLiftedInputBars.delete(win);
            const nextBottom = `${inset}px`;
            if (force || inputBar.style.bottom !== nextBottom || inputBar.style.transform !== 'none') {
                inputBar.style.bottom = nextBottom;
                inputBar.style.transform = 'none';
                if (preLift) void inputBar.offsetHeight;
            } else if (preLift) {
                void inputBar.offsetHeight;
            }
            setPreLiftClass(doc, false);
            return;
        }

        if (!shouldLockVisualViewport && preLift) {
            if (getNow(win) - preLift.startedAt < PRE_LIFT_MAX_MS) {
                setPreLiftClass(doc, true);
                const holdBottom = `${Math.max(preLift.bottom, inset)}px`;
                if (force || inputBar.style.bottom !== holdBottom || inputBar.style.transform !== 'none') {
                    inputBar.style.bottom = holdBottom;
                    inputBar.style.transform = 'none';
                }
                return;
            }
            preLiftedInputBars.delete(win);
            if (inset <= 0) {
                inputBar.style.bottom = '';
                inputBar.style.transform = '';
            } else {
                inputBar.style.bottom = `${inset}px`;
                inputBar.style.transform = 'none';
            }
            void inputBar.offsetHeight;
            setPreLiftClass(doc, false);
            return;
        }

        setPreLiftClass(doc, false);

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
            preLiftedInputBars.delete(win);
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
            bodyClassList.remove('ios-input-bar-prelift');
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

        if (isAppleTouch && win && typeof win === 'object' && getExpenseInputActive(options)) {
            const initialMetrics = getVisualViewportMetrics(options);
            if (initialMetrics.isKeyboardOpen) {
                preLiftedInputBars.delete(win);
                setPreLiftClass(doc, false);
            } else {
                const inputBar = doc ? doc.getElementById('input-bar') : null;
                const preLiftBottom = getPreLiftBottom(options, initialMetrics, inputBar);
                if (inputBar && preLiftBottom > 0) {
                    preLiftedInputBars.set(win, {
                        bottom: preLiftBottom,
                        startedAt: getNow(win)
                    });
                    setPreLiftClass(doc, true);
                    inputBar.style.bottom = `${preLiftBottom}px`;
                    inputBar.style.transform = 'none';
                    void inputBar.offsetHeight;
                    const input = doc && typeof doc.getElementById === 'function'
                        ? doc.getElementById('expense-input')
                        : null;
                    if (input) void input.offsetHeight;
                }
            }
        }

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

    function initDevDiagnostics(options = {}) {
        const win = getWindow(options);
        const doc = getDocument(options);
        const config = win && win.SPESA_TRACKER_CONFIG;
        if (!win || typeof win !== 'object' || !doc || !config || config.channel !== 'dev') {
            return null;
        }
        if (devDiagnosticsStates.has(win)) {
            return devDiagnosticsStates.get(win);
        }

        const getById = id => (typeof doc.getElementById === 'function' ? doc.getElementById(id) : null);
        const nav = options.navigator || win.navigator || (typeof navigator !== 'undefined' ? navigator : null);
        const ua = String((nav && nav.userAgent) || '');
        let standalone = !!(nav && nav.standalone);
        if (!standalone && typeof win.matchMedia === 'function') {
            try {
                standalone = !!win.matchMedia('(display-mode: standalone)').matches;
            } catch (_) { }
        }
        const dpr = Number(win.devicePixelRatio || 1);
        const scrW = win.screen ? Number(win.screen.width || 0) : 0;
        const scrH = win.screen ? Number(win.screen.height || 0) : 0;
        const availH = win.screen ? Number(win.screen.availHeight || 0) : 0;
        const locPath = (win.location && win.location.pathname) || '';
        const metaLine = `meta ua="${ua}" standalone=${standalone} dpr=${dpr} screen=${scrW}x${scrH} avail=${availH} path=${locPath}`;

        const readComputedStyle = el => {
            if (!el) return null;
            const fn = typeof win.getComputedStyle === 'function'
                ? win.getComputedStyle.bind(win)
                : (typeof getComputedStyle === 'function' ? getComputedStyle : null);
            if (!fn) return null;
            try {
                return fn(el);
            } catch (_) {
                return null;
            }
        };

        const readRect = el => {
            if (!el || typeof el.getBoundingClientRect !== 'function') return null;
            try {
                return el.getBoundingClientRect();
            } catch (_) {
                return null;
            }
        };

        const pickVisibleBanner = () => {
            const tlPage = getById('page-timeline');
            const summaryEl = getById('timeline-summary');
            const statsBanner = typeof doc.querySelector === 'function'
                ? doc.querySelector('.stats-sticky-header')
                : null;

            if (
                summaryEl &&
                (!tlPage || !tlPage.classList || !tlPage.classList.contains('hidden')) &&
                (!summaryEl.classList || !summaryEl.classList.contains('hidden'))
            ) {
                return summaryEl;
            }
            return statsBanner || summaryEl || null;
        };

        const state = {
            t0: getNow(win),
            entries: [],
            lastSig: '',
            burstToken: 0,
            burstRaf: null,
            burstTimers: [],
            copyTimer: null,
            overlay: null,
            textarea: null,
            copyBtn: null,
            getText() {
                return [metaLine, ...state.entries].join('\n');
            },
            clear() {
                state.entries.length = 0;
                state.t0 = getNow(win);
                state.lastSig = '';
                record('init', true);
            },
            record(ev, always = true) {
                return record(ev, always);
            }
        };
        devDiagnosticsStates.set(win, state);

        function refreshOverlayText() {
            if (state.textarea && state.overlay && (!state.overlay.style || state.overlay.style.display !== 'none')) {
                state.textarea.value = state.getText();
            }
        }

        function record(ev, always = true) {
            const ih = Math.round(Number(win.innerHeight) || 0);
            const ch = Math.round(Number(doc.documentElement && doc.documentElement.clientHeight) || 0);
            const bodyRect = readRect(doc.body);
            const bh = bodyRect ? Math.round(Number(bodyRect.height) || 0) : 0;
            const vv = win.visualViewport;
            const vvh = vv && Number.isFinite(vv.height) ? Math.round(vv.height) : -1;
            const vvo = vv && Number.isFinite(vv.offsetTop) ? Math.round(vv.offsetTop) : -1;
            const vvs = vv && Number.isFinite(vv.scale) ? Number(vv.scale.toFixed(2)) : -1;
            const sy = Math.round(Number(win.scrollY) || 0);

            const hdrRect = readRect(getById('app-header'));
            const hdr = hdrRect ? Math.round(Number(hdrRect.top) || 0) : 'na';
            const banRect = readRect(pickVisibleBanner());
            const ban = banRect ? Math.round(Number(banRect.top) || 0) : 'na';
            const mainRect = readRect(getById('app-main'));
            const mainT = mainRect ? Math.round(Number(mainRect.top) || 0) : 'na';
            const mainH = mainRect ? Math.round(Number(mainRect.height) || 0) : 'na';

            const inputBar = getById('input-bar');
            const ibRect = readRect(inputBar);
            const ibT = ibRect ? Math.round(Number(ibRect.top) || 0) : 'na';
            const ibB = ibRect ? Math.round(Number(ibRect.bottom) || 0) : 'na';
            const ibInlineB = inputBar && inputBar.style && inputBar.style.bottom
                ? String(inputBar.style.bottom)
                : '';
            const ibComp = !ibInlineB ? readComputedStyle(inputBar) : null;
            const ibCssB = ibInlineB || (ibComp && ibComp.bottom ? `c:${ibComp.bottom}` : 'na');

            const rootComp = readComputedStyle(doc.documentElement);
            const vvVar = rootComp && typeof rootComp.getPropertyValue === 'function'
                ? (rootComp.getPropertyValue('--vv-offset-top').trim() || '0')
                : '0';

            const bodyCls = doc.body && doc.body.classList;
            let cls = '';
            if (bodyCls && typeof bodyCls.contains === 'function') {
                if (bodyCls.contains('expense-input-active')) cls += 'E';
                if (bodyCls.contains('ios-expense-input-active')) cls += 'I';
                if (bodyCls.contains('ios-input-bar-prelift')) cls += 'P';
                if (bodyCls.contains('vv-keyboard-open')) cls += 'O';
                if (bodyCls.contains('vv-keyboard-settling')) cls += 'S';
            }
            if (!cls) cls = '-';

            const activeEl = doc.activeElement;
            const act = (activeEl && (activeEl.id || activeEl.tagName)) || '-';
            const sig = `${ih}|${ch}|${bh}|${vvh}|${vvo}|${sy}|${hdr}|${ban}|${mainT}|${mainH}|${ibT}|${ibB}|${ibCssB}|${vvVar}|${cls}|${act}`;
            if (!always && sig === state.lastSig) {
                return null;
            }
            state.lastSig = sig;

            const t = Math.round(getNow(win) - state.t0);
            const line = `+${t}ms [${ev}] ih=${ih} ch=${ch} bh=${bh} vvh=${vvh} vvo=${vvo} s=${vvs} sy=${sy} hdr=${hdr} ban=${ban} main=${mainT}/${mainH} ib=${ibT}..${ibB}(${ibCssB}) var=${vvVar} cls=${cls} act=${act}`;
            if (state.entries.length >= DEV_DIAG_MAX_ENTRIES) {
                state.entries.shift();
            }
            state.entries.push(line);
            refreshOverlayText();
            return line;
        }

        function stopBurst() {
            state.burstToken += 1;
            if (state.burstRaf != null) {
                const cancelRaf = getCancelAnimationFrame(options, win);
                try { cancelRaf(state.burstRaf); } catch (_) { }
                state.burstRaf = null;
            }
            const clearTimer = getClearTimeout(options, win);
            if (clearTimer && state.burstTimers.length) {
                state.burstTimers.forEach(id => {
                    try { clearTimer(id); } catch (_) { }
                });
            }
            state.burstTimers = [];
        }

        function startBurst(label) {
            stopBurst();
            const token = state.burstToken;
            const deadline = getNow(win) + DEV_DIAG_BURST_MS;
            const raf = getRequestAnimationFrame(options, win);

            if (raf) {
                let scheduling = false;
                let ranSync = false;

                const step = () => {
                    if (scheduling) ranSync = true;
                    if (token !== state.burstToken) return;
                    state.burstRaf = null;
                    record('raf', false);
                    if (ranSync || token !== state.burstToken || getNow(win) >= deadline) {
                        return;
                    }
                    schedule();
                };

                const schedule = () => {
                    if (token !== state.burstToken) return;
                    scheduling = true;
                    ranSync = false;
                    const id = raf(step);
                    scheduling = false;
                    if (!ranSync && token === state.burstToken) {
                        state.burstRaf = id;
                    }
                };

                schedule();
            }

            const setTimer = getSetTimeout(options, win);
            if (setTimer) {
                DEV_DIAG_BURST_TICKS.forEach(ms => {
                    const id = setTimer(() => {
                        if (token !== state.burstToken) return;
                        record(`${label}+${ms}`, true);
                    }, ms);
                    state.burstTimers.push(id);
                });
            }
        }

        function openOverlay() {
            if (!state.overlay && typeof doc.createElement === 'function' && doc.body && typeof doc.body.appendChild === 'function') {
                const overlay = doc.createElement('div');
                overlay.id = 'dev-vv-diag-overlay';
                overlay.style.cssText = 'position:fixed;inset:12px;z-index:9999;background:var(--bg-secondary,#ffffff);color:var(--text-primary,#1a1a2e);border:2px solid #ff7c00;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 12px 32px rgba(0,0,0,0.35);';
                if (typeof overlay.addEventListener === 'function') {
                    overlay.addEventListener('touchstart', event => {
                        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                    }, { passive: true });
                    overlay.addEventListener('touchmove', event => {
                        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                    }, { passive: true });
                }

                const title = doc.createElement('div');
                title.textContent = 'Diagnostica Tastiera / Viewport (dev)';
                title.style.cssText = 'font-size:0.95rem;font-weight:700;color:#ff7c00;';

                const help = doc.createElement('div');
                help.textContent = '1) Pulisci e Chiudi  2) Apri tastiera (1s), chiudila (1s)  3) Riapri VV e tocca Copia';
                help.style.cssText = 'font-size:0.78rem;line-height:1.35;color:var(--text-secondary,#5f6368);';

                const textarea = doc.createElement('textarea');
                textarea.id = 'dev-vv-diag-log';
                textarea.readOnly = true;
                textarea.style.cssText = 'flex:1;width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.35;padding:8px;border:1px solid var(--border,#ccc);border-radius:8px;background:var(--bg-primary,#f5f5f5);color:var(--text-primary,#1a1a2e);-webkit-user-select:text;user-select:text;';
                if (typeof textarea.addEventListener === 'function') {
                    textarea.addEventListener('touchmove', event => {
                        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                    }, { passive: true });
                }

                const actions = doc.createElement('div');
                actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

                const mkBtn = (id, label, primary = false) => {
                    const b = doc.createElement('button');
                    b.id = id;
                    b.type = 'button';
                    b.textContent = label;
                    b.style.cssText = primary
                        ? 'padding:8px 14px;border:none;border-radius:8px;background:#ff7c00;color:#fff;font-weight:700;font-size:0.85rem;cursor:pointer;'
                        : 'padding:8px 12px;border:1px solid var(--border,#ccc);border-radius:8px;background:transparent;color:var(--text-primary,#1a1a2e);font-weight:600;font-size:0.85rem;cursor:pointer;';
                    return b;
                };

                const btnClear = mkBtn('btn-dev-vv-clear', 'Pulisci');
                const btnClose = mkBtn('btn-dev-vv-close', 'Chiudi');
                const btnCopy = mkBtn('btn-dev-vv-copy', 'Copia', true);

                const markCopied = () => {
                    btnCopy.textContent = 'Copiato!';
                    const clearTimer = getClearTimeout(options, win);
                    if (state.copyTimer != null && clearTimer) {
                        try { clearTimer(state.copyTimer); } catch (_) { }
                    }
                    const setTimer = getSetTimeout(options, win);
                    if (setTimer) {
                        state.copyTimer = setTimer(() => {
                            state.copyTimer = null;
                            btnCopy.textContent = 'Copia';
                        }, 1500);
                    }
                };

                const fallbackCopy = () => {
                    if (typeof textarea.focus === 'function') {
                        try { textarea.focus(); } catch (_) { }
                    }
                    if (typeof textarea.select === 'function') {
                        try { textarea.select(); } catch (_) { }
                    }
                    if (typeof doc.execCommand === 'function') {
                        try { doc.execCommand('copy'); } catch (_) { }
                    }
                    markCopied();
                };

                if (typeof btnCopy.addEventListener === 'function') {
                    btnCopy.addEventListener('click', () => {
                        const text = state.getText();
                        if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
                            try {
                                nav.clipboard.writeText(text).then(markCopied, fallbackCopy);
                                return;
                            } catch (_) { }
                        }
                        fallbackCopy();
                    });
                }

                if (typeof btnClear.addEventListener === 'function') {
                    btnClear.addEventListener('click', () => {
                        state.clear();
                        textarea.value = state.getText();
                    });
                }

                if (typeof btnClose.addEventListener === 'function') {
                    btnClose.addEventListener('click', () => {
                        overlay.style.display = 'none';
                    });
                }

                actions.appendChild(btnClear);
                actions.appendChild(btnClose);
                actions.appendChild(btnCopy);
                overlay.appendChild(title);
                overlay.appendChild(help);
                overlay.appendChild(textarea);
                overlay.appendChild(actions);
                doc.body.appendChild(overlay);

                state.overlay = overlay;
                state.textarea = textarea;
                state.copyBtn = btnCopy;
            }

            if (state.overlay) {
                state.overlay.style.display = 'flex';
            }
            refreshOverlayText();
        }

        const expenseInput = getById('expense-input');
        if (expenseInput) {
            if (typeof doc.addEventListener === 'function') {
                doc.addEventListener('focus', event => {
                    if (event && event.target === expenseInput) record('focus:pre', true);
                }, { capture: true, passive: true });
                doc.addEventListener('blur', event => {
                    if (event && event.target === expenseInput) record('blur:pre', true);
                }, { capture: true, passive: true });
            } else if (typeof expenseInput.addEventListener === 'function') {
                expenseInput.addEventListener('focus', () => record('focus:pre', true), { capture: true, passive: true });
                expenseInput.addEventListener('blur', () => record('blur:pre', true), { capture: true, passive: true });
            }

            if (typeof expenseInput.addEventListener === 'function') {
                expenseInput.addEventListener('touchstart', () => record('touchstart', true), { passive: true });
                expenseInput.addEventListener('touchend', () => record('touchend', true), { passive: true });
                expenseInput.addEventListener('focus', () => {
                    record('focus:post', true);
                    startBurst('open');
                }, { passive: true });
                expenseInput.addEventListener('blur', () => {
                    record('blur:post', true);
                    startBurst('close');
                }, { passive: true });
            }
        }

        if (typeof win.addEventListener === 'function') {
            win.addEventListener('resize', () => record('win:resize', true), { passive: true });
            win.addEventListener('scroll', () => record('win:scroll', true), { passive: true });
        }
        if (win.visualViewport && typeof win.visualViewport.addEventListener === 'function') {
            win.visualViewport.addEventListener('resize', () => record('vv:resize', true), { passive: true });
            win.visualViewport.addEventListener('scroll', () => record('vv:scroll', true), { passive: true });
        }

        record('init', true);

        const headerActions = typeof doc.querySelector === 'function'
            ? doc.querySelector('#app-header .header-actions')
            : null;
        if (headerActions && !getById('btn-dev-vv-diag') && typeof doc.createElement === 'function') {
            const btn = doc.createElement('button');
            btn.id = 'btn-dev-vv-diag';
            btn.type = 'button';
            btn.className = 'header-btn';
            if (typeof btn.setAttribute === 'function') {
                btn.setAttribute('aria-label', 'Diagnostica viewport');
                btn.setAttribute('title', 'Diagnostica tastiera/viewport (solo dev)');
            }
            btn.textContent = 'VV';
            btn.style.cssText = 'font-size:0.72rem;font-weight:800;color:#ff7c00;border:1px solid #ff7c00;border-radius:999px;padding:4px 8px;line-height:1.1;';
            const themeBtn = getById('theme-toggle');
            if (themeBtn && themeBtn.parentNode === headerActions && typeof headerActions.insertBefore === 'function') {
                headerActions.insertBefore(btn, themeBtn);
            } else if (typeof headerActions.appendChild === 'function') {
                headerActions.appendChild(btn);
            }
            if (typeof btn.addEventListener === 'function') {
                btn.addEventListener('click', openOverlay);
            }
        }

        return state;
    }

    return {
        getVisualViewportMetrics,
        getKeyboardInset,
        syncVisualViewportLayout,
        updateAppMainPadding,
        updatePosition,
        schedulePositionUpdate,
        startWatch,
        stopWatch,
        initDevDiagnostics
    };
})();
