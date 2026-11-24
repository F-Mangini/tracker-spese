/* ============================================
   INPUT BAR CONTROLLER - layout tastiera/input
   ============================================ */

export const InputBarController = (() => {
    const KEYBOARD_VIEWPORT_THRESHOLD = 100;
    const keyboardTouchLocks = new WeakMap();

    function noop() { }

    function getDocument(options) {
        return options.document || (typeof document !== 'undefined' ? document : null);
    }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
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
        const layoutHeight = Number(win && win.innerHeight) || 0;

        if (!vv || !Number.isFinite(vv.height)) {
            return {
                available: false,
                layoutHeight,
                height: layoutHeight,
                offsetTop: 0,
                keyboardHeight: 0,
                bottomInset: 0,
                isKeyboardOpen: false
            };
        }

        const height = Math.max(0, Math.round(vv.height));
        const offsetTop = Math.max(0, Math.round(Number(vv.offsetTop) || 0));
        const keyboardHeight = Math.max(0, Math.round(layoutHeight - vv.height));
        const bottomInset = Math.max(0, Math.round(layoutHeight - (vv.offsetTop + vv.height)));

        return {
            available: true,
            layoutHeight,
            height,
            offsetTop,
            keyboardHeight,
            bottomInset,
            isKeyboardOpen: keyboardHeight > KEYBOARD_VIEWPORT_THRESHOLD
        };
    }

    function getKeyboardInset(options = {}) {
        return getVisualViewportMetrics(options).bottomInset;
    }

    function syncVisualViewportLayout(options = {}, allowActive = true) {
        const doc = getDocument(options);
        const metrics = getVisualViewportMetrics(options);
        const isAnyInputActive = allowActive && (getExpenseInputActive(options) || getFilterSearchActive(options));
        const shouldLockVisualViewport = isAnyInputActive && metrics.isKeyboardOpen;
        const bodyClassList = doc && doc.body && doc.body.classList;

        if (shouldLockVisualViewport) {
            if (bodyClassList && typeof bodyClassList.add === 'function') {
                bodyClassList.add('vv-keyboard-open');
            }
            setRootVar(doc, '--vv-offset-top', `${metrics.offsetTop}px`);
            setRootVar(doc, '--vv-height', `${metrics.height}px`);
            setRootVar(doc, '--vv-bottom-inset', `${metrics.bottomInset}px`);
        } else {
            if (bodyClassList && typeof bodyClassList.remove === 'function') {
                bodyClassList.remove('vv-keyboard-open');
            }
            removeRootVar(doc, '--vv-offset-top');
            removeRootVar(doc, '--vv-height');
            removeRootVar(doc, '--vv-bottom-inset');
        }

        return { metrics, shouldLockVisualViewport };
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

    function startWatch(options = {}) {
        stopWatch(options);

        const win = getWindow(options);
        const doc = getDocument(options);
        const handler = event => {
            if (event && event.type === 'scroll') {
                updatePosition(options);
                return;
            }
            schedulePositionUpdate(options);
        };

        if (options.setResizeHandler) options.setResizeHandler(handler);

        win.addEventListener('resize', handler, { passive: true });

        if (win.visualViewport) {
            win.visualViewport.addEventListener('resize', handler, { passive: true });
            win.visualViewport.addEventListener('scroll', handler, { passive: true });
        }

        bindKeyboardTouchLock(doc);
        schedulePositionUpdate(options, true);

        const delay = options.setTimeout || setTimeout;

        [60, 160, 320].forEach(ms => {
            delay(() => {
                if (getExpenseInputActive(options)) schedulePositionUpdate(options, true);
            }, ms);
        });
    }

    function stopWatch(options = {}) {
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

        if (handler) {
            win.removeEventListener('resize', handler);

            if (win.visualViewport) {
                win.visualViewport.removeEventListener('resize', handler);
                win.visualViewport.removeEventListener('scroll', handler);
            }

            if (options.setResizeHandler) options.setResizeHandler(null);
        }

        unbindKeyboardTouchLock(doc);
        syncVisualViewportLayout(options, false);

        const inputBar = doc ? doc.getElementById('input-bar') : null;
        if (inputBar) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
        }

        updateAppMainPadding(options);

        const hasViewportOffset = !!(
            win && (
                Number(win.scrollY || 0) > 0 ||
                Number(win.scrollX || 0) > 0 ||
                (win.visualViewport && Number(win.visualViewport.offsetTop || 0) > 0)
            )
        );
        if (hasViewportOffset && typeof win.scrollTo === 'function') {
            const delay = options.setTimeout ||
                (typeof setTimeout === 'function' ? setTimeout : callback => callback());
            delay(() => {
                if (!getExpenseInputActive(options) && !getFilterSearchActive(options)) {
                    try { win.scrollTo(0, 0); } catch (_) { }
                }
            }, 80);
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
