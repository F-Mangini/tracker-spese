/* ============================================
   INPUT BAR CONTROLLER - layout tastiera/input
   ============================================ */

const InputBarController = (() => {
    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getWindow(options) {
        return options.window || window;
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

    function getKeyboardInset(options = {}) {
        const win = getWindow(options);
        const vv = win.visualViewport;

        if (!vv || !Number.isFinite(vv.height)) return 0;

        const inset = win.innerHeight - (vv.offsetTop + vv.height);
        return Math.max(0, Math.round(inset));
    }

    function updateAppMainPadding(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
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
            const panel = doc.getElementById('filter-panel');
            if (panel && !panel.classList.contains('hidden')) {
                paddingCalc += ` + ${panel.offsetHeight}px`;
            }
        }

        paddingCalc += ')';
        main.style.paddingBottom = paddingCalc;
    }

    function updatePosition(options = {}, force = false) {
        updateAppMainPadding(options);

        const doc = getDocument(options);
        const inputBar = doc.getElementById('input-bar');
        if (!inputBar) return;

        if (!getExpenseInputActive(options)) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
            return;
        }

        const inset = getKeyboardInset(options);

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
        const handler = () => {
            schedulePositionUpdate(options);
        };

        if (options.setResizeHandler) options.setResizeHandler(handler);

        win.addEventListener('resize', handler, { passive: true });

        if (win.visualViewport) {
            win.visualViewport.addEventListener('resize', handler, { passive: true });
        }

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

        if (handler) {
            win.removeEventListener('resize', handler);

            if (win.visualViewport) {
                win.visualViewport.removeEventListener('resize', handler);
            }

            if (options.setResizeHandler) options.setResizeHandler(null);
        }

        const doc = getDocument(options);
        const inputBar = doc.getElementById('input-bar');
        if (inputBar) {
            inputBar.style.bottom = '';
            inputBar.style.transform = '';
        }

        updateAppMainPadding(options);
    }

    return {
        getKeyboardInset,
        updateAppMainPadding,
        updatePosition,
        schedulePositionUpdate,
        startWatch,
        stopWatch
    };
})();
