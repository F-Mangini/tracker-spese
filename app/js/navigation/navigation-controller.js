/* ============================================
   NAVIGATION CONTROLLER - wiring pagine e scroll
   ============================================ */

const NavigationController = (() => {
    const TAP_MOVE_LIMIT = 10;
    const SYNTHETIC_CLICK_SUPPRESS_MS = 700;

    const PAGE_ORDER = ['timeline', 'stats', 'settings'];
    const SWIPE_MIN_DISTANCE = 60;
    const SWIPE_AXIS_RATIO = 1.25;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getCurrentPage(options) {
        return typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : options.currentPage;
    }

    function setCurrentPage(options, page) {
        if (typeof options.setCurrentPage === 'function') {
            options.setCurrentPage(page);
        } else {
            options.currentPage = page;
        }
    }

    function getPageScrollTop(options) {
        return options.pageScrollTop || {};
    }

    function setRestoringPageScroll(options, value) {
        if (typeof options.setRestoringPageScroll === 'function') {
            options.setRestoringPageScroll(value);
        } else {
            options.restoringPageScroll = value;
        }
    }

    function isRestoringPageScroll(options) {
        return typeof options.isRestoringPageScroll === 'function'
            ? options.isRestoringPageScroll()
            : !!options.restoringPageScroll;
    }

    function deferFrame(options, callback) {
        const frame = options.requestAnimationFrame ||
            (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

        if (frame) frame(callback);
        else callback();
    }

    function deferTick(options, callback) {
        const defer = options.defer || (callback => setTimeout(callback, 0));
        defer(callback);
    }

    function getNavigationHistoryAction(options, payload) {
        if (typeof options.getNavigationHistoryAction === 'function') {
            return options.getNavigationHistoryAction(payload);
        }
        return UIStack.getNavigationHistoryAction(payload);
    }

    function bindImmediateTap(button, handler) {
        if (!button || typeof button.addEventListener !== 'function') return;

        let touchStart = null;
        let lastImmediateTap = 0;

        button.addEventListener('click', event => {
            if (
                event &&
                lastImmediateTap > 0 &&
                Date.now() - lastImmediateTap < SYNTHETIC_CLICK_SUPPRESS_MS
            ) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            handler(event);
        });

        button.addEventListener('touchstart', event => {
            const touch = event.touches && event.touches[0];
            touchStart = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null;
        }, { passive: true });

        button.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touchStart || !touch) return;

            const moved = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
            touchStart = null;
            if (moved > TAP_MOVE_LIMIT || button.disabled) return;

            lastImmediateTap = Date.now();
            if (typeof event.preventDefault === 'function') event.preventDefault();
            handler(event);
        }, { passive: false });

        button.addEventListener('touchcancel', () => {
            touchStart = null;
        }, { passive: true });
    }

    function init(options = {}) {
        const doc = getDocument(options);

        doc.querySelectorAll('.nav-btn').forEach(btn => {
            bindImmediateTap(btn, () => navigateTo(options, btn.dataset.page));
        });

        setupPageScrollTracking(options);
        setupPageSwipe(options);
    }

    function getSwipeTargetPage(currentPage, deltaX, deltaY) {
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return null;
        if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_AXIS_RATIO) return null;

        const currentIndex = PAGE_ORDER.indexOf(currentPage);
        if (currentIndex === -1) return null;

        const targetIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
        return PAGE_ORDER[targetIndex] || null;
    }

    function shouldIgnoreSwipeTarget(target) {
        if (!target || typeof target.closest !== 'function') return false;
        return !!target.closest('input, textarea, select, button, a, canvas, [data-page-swipe-ignore]');
    }

    function setupPageSwipe(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main || typeof main.addEventListener !== 'function') return;

        let touchStart = null;

        main.addEventListener('touchstart', event => {
            const touch = event.touches && event.touches[0];
            if (!touch || shouldIgnoreSwipeTarget(event.target)) {
                touchStart = null;
                return;
            }

            touchStart = { x: touch.clientX, y: touch.clientY };
        }, { passive: true });

        main.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touchStart || !touch) return;

            const deltaX = touch.clientX - touchStart.x;
            const deltaY = touch.clientY - touchStart.y;
            touchStart = null;

            const targetPage = getSwipeTargetPage(getCurrentPage(options), deltaX, deltaY);
            if (targetPage) navigateTo(options, targetPage);
        }, { passive: true });

        main.addEventListener('touchcancel', () => {
            touchStart = null;
        }, { passive: true });
    }

    function setupPageScrollTracking(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        main.addEventListener('scroll', () => {
            if (isRestoringPageScroll(options)) return;

            const currentPage = getCurrentPage(options);
            if (currentPage) getPageScrollTop(options)[currentPage] = main.scrollTop;
        }, { passive: true });
    }

    function rememberCurrentPageScroll(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        const currentPage = getCurrentPage(options);
        if (!main || !currentPage) return;

        getPageScrollTop(options)[currentPage] = main.scrollTop;
    }

    function restorePageScroll(options = {}, page) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        const top = getPageScrollTop(options)[page] || 0;

        deferFrame(options, () => {
            setRestoringPageScroll(options, true);
            main.scrollTop = top;

            deferTick(options, () => {
                setRestoringPageScroll(options, false);
            });
        });
    }

    function syncPageDom(options = {}, page) {
        const doc = getDocument(options);

        doc.querySelectorAll('.page').forEach(section => section.classList.add('hidden'));

        const pageEl = doc.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.remove('hidden');

        doc.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const activeBtn = doc.querySelector(`.nav-btn[data-page="${page}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const inputBar = doc.getElementById('input-bar');
        const main = doc.getElementById('app-main');

        if (inputBar && main) {
            const shouldHideTimelineInputBar =
                page === 'timeline' &&
                typeof options.shouldHideTimelineInputBar === 'function' &&
                options.shouldHideTimelineInputBar();

            if (page === 'timeline' && !shouldHideTimelineInputBar) {
                inputBar.classList.remove('hidden');
                main.classList.remove('no-input-bar');
            } else {
                inputBar.classList.add('hidden');
                main.classList.add('no-input-bar');
            }
        }

        const filterToggle = doc.getElementById('btn-filter-toggle');
        if (filterToggle) filterToggle.style.display = page === 'settings' ? 'none' : '';

        (options.syncTimelineSelectionHeader || noop)();
    }

    function syncPageContent(options = {}, page) {
        if (page === 'timeline') (options.renderTimeline || noop)();
        if (page === 'stats') (options.renderStats || noop)();
        if (page === 'settings') (options.renderSettings || noop)();
    }

    function updateNavigationHistory(options = {}, page, fromPopstate = false) {
        const action = getNavigationHistoryAction(options, {
            fromPopstate,
            currentPage: getCurrentPage(options),
            nextPage: page
        });

        (options.runHistoryAction || noop)(action);
        return action;
    }

    function shouldConfirmSettingsNavigation(options = {}, page, fromPopstate = false, config = {}) {
        if (config.skipSelectionConfirm) return false;
        if (fromPopstate || page !== 'settings') return false;
        if (page === getCurrentPage(options)) return false;

        return typeof options.shouldConfirmSettingsNavigation === 'function' &&
            options.shouldConfirmSettingsNavigation(page);
    }

    function navigateTo(options = {}, page, fromPopstate = false, config = {}) {
        if (!page) return null;

        if (shouldConfirmSettingsNavigation(options, page, fromPopstate, config)) {
            if (typeof options.confirmSettingsNavigation === 'function') {
                options.confirmSettingsNavigation(() => navigateTo(options, page, fromPopstate, {
                    ...config,
                    skipSelectionConfirm: true
                }));
            }
            return null;
        }

        rememberCurrentPageScroll(options);
        const action = updateNavigationHistory(options, page, fromPopstate);
        setCurrentPage(options, page);
        syncPageDom(options, page);

        const shouldCloseFilter = page === 'settings' &&
            typeof options.isFilterOpen === 'function' &&
            options.isFilterOpen();
        if (shouldCloseFilter) (options.closeFilterPanel || noop)();

        (options.updateAppMainPadding || noop)();
        syncPageContent(options, page);
        restorePageScroll(options, page);

        return action;
    }

    return {
        init,
        setupPageScrollTracking,
        getSwipeTargetPage,
        setupPageSwipe,
        rememberCurrentPageScroll,
        restorePageScroll,
        syncPageDom,
        syncPageContent,
        updateNavigationHistory,
        navigateTo
    };
})();
