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

    function getAdjacentPage(currentPage, deltaX) {
        const currentIndex = PAGE_ORDER.indexOf(currentPage);
        if (currentIndex === -1 || deltaX === 0) return null;

        const targetIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
        return PAGE_ORDER[targetIndex] || null;
    }

    function getSwipeTargetPage(currentPage, deltaX, deltaY) {
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return null;
        if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_AXIS_RATIO) return null;
        return getAdjacentPage(currentPage, deltaX);
    }

    function shouldIgnoreSwipeTarget(target) {
        if (!target || typeof target.closest !== 'function') return false;
        return !!target.closest('input, textarea, select, button, a, canvas, [data-page-swipe-ignore]');
    }

    function setSwipeTransform(element, x, animate = false) {
        if (!element || !element.style) return;
        element.style.transition = animate ? 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
        element.style.transform = `translate3d(${x}px, 0, 0)`;
    }

    function resetSwipeElement(element) {
        if (!element) return;
        element.classList.remove('page-swipe-layer', 'page-swipe-current', 'page-swipe-preview');
        if (!element.style) return;
        ['transform', 'transition', 'top', 'left', 'width', 'height', 'minHeight'].forEach(property => {
            element.style[property] = '';
        });
    }

    function hidePreview(state) {
        if (!state.targetElement) return;
        resetSwipeElement(state.targetElement);
        state.targetElement.classList.add('hidden');
        state.targetElement = null;
        state.targetPage = null;
    }

    function cleanupSwipe(main, state, keepTargetVisible = false) {
        if (main.classList) main.classList.remove('page-swipe-active');
        resetSwipeElement(state.currentElement);

        if (state.targetElement) {
            const targetElement = state.targetElement;
            resetSwipeElement(targetElement);
            if (!keepTargetVisible) targetElement.classList.add('hidden');
        }

        state.touchStart = null;
        state.currentElement = null;
        state.targetElement = null;
        state.targetPage = null;
        state.horizontal = false;
        state.vertical = false;
        state.deltaX = 0;
        state.transitioning = false;
    }

    function prepareSwipePreview(options, main, state, targetPage) {
        if (state.targetPage === targetPage && state.targetElement) return;
        hidePreview(state);

        const doc = getDocument(options);
        const currentPage = getCurrentPage(options);
        const currentElement = doc.getElementById(`page-${currentPage}`);
        const targetElement = doc.getElementById(`page-${targetPage}`);
        if (!currentElement || !targetElement) return;

        syncPageContent(options, targetPage);
        targetElement.classList.remove('hidden');
        currentElement.classList.add('page-swipe-layer', 'page-swipe-current');
        targetElement.classList.add('page-swipe-layer', 'page-swipe-preview');

        if (targetElement.style) {
            targetElement.style.top = `${main.scrollTop || 0}px`;
            targetElement.style.left = '0';
            targetElement.style.width = '100%';
            targetElement.style.height = `${main.clientHeight || 0}px`;
            targetElement.style.minHeight = `${main.clientHeight || 0}px`;
        }

        if (main.classList) main.classList.add('page-swipe-active');
        state.currentElement = currentElement;
        state.targetElement = targetElement;
        state.targetPage = targetPage;
    }

    function updateSwipePreview(options, main, state, deltaX, deltaY, event) {
        if (state.vertical || state.transitioning) return false;

        if (!state.horizontal) {
            if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return false;
            if (Math.abs(deltaY) >= Math.abs(deltaX)) {
                state.vertical = true;
                return false;
            }
            state.horizontal = true;
        }

        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        state.deltaX = deltaX;

        const targetPage = getAdjacentPage(getCurrentPage(options), deltaX);
        if (!targetPage) {
            hidePreview(state);
            const currentElement = getDocument(options).getElementById(`page-${getCurrentPage(options)}`);
            state.currentElement = currentElement;
            if (currentElement) currentElement.classList.add('page-swipe-layer', 'page-swipe-current');
            setSwipeTransform(currentElement, deltaX * 0.18);
            return true;
        }

        prepareSwipePreview(options, main, state, targetPage);
        const width = main.clientWidth || 360;
        setSwipeTransform(state.currentElement, deltaX);
        setSwipeTransform(state.targetElement, deltaX + (deltaX < 0 ? width : -width));
        return true;
    }

    function finishSwipe(options, main, state, forceCancel = false) {
        if (!state.horizontal || state.vertical) {
            cleanupSwipe(main, state);
            return;
        }

        const width = main.clientWidth || 360;
        const targetPage = state.targetPage;
        const shouldComplete = !forceCancel && !!targetPage &&
            Math.abs(state.deltaX) >= Math.max(SWIPE_MIN_DISTANCE, width * 0.18);
        state.transitioning = true;

        setSwipeTransform(state.currentElement, shouldComplete
            ? (state.deltaX < 0 ? -width : width)
            : 0, true);
        setSwipeTransform(state.targetElement, shouldComplete
            ? 0
            : (state.deltaX < 0 ? width : -width), true);

        const setTimer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : (callback => callback()));

        setTimer(() => {
            let navigated = false;
            if (shouldComplete) {
                navigateTo(options, targetPage);
                navigated = getCurrentPage(options) === targetPage;
            }
            cleanupSwipe(main, state, navigated);
        }, 180);
    }

    function setupPageSwipe(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main || typeof main.addEventListener !== 'function') return;

        const state = {
            touchStart: null,
            currentElement: null,
            targetElement: null,
            targetPage: null,
            horizontal: false,
            vertical: false,
            deltaX: 0,
            transitioning: false
        };

        main.addEventListener('touchstart', event => {
            if (state.transitioning) return;
            const touch = event.touches && event.touches[0];
            if (!touch || shouldIgnoreSwipeTarget(event.target)) {
                state.touchStart = null;
                return;
            }

            state.touchStart = { x: touch.clientX, y: touch.clientY };
            state.horizontal = false;
            state.vertical = false;
            state.deltaX = 0;
        }, { passive: true });

        main.addEventListener('touchmove', event => {
            const touch = event.touches && event.touches[0];
            if (!state.touchStart || !touch) return;

            updateSwipePreview(
                options,
                main,
                state,
                touch.clientX - state.touchStart.x,
                touch.clientY - state.touchStart.y,
                event
            );
        }, { passive: false });

        main.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!state.touchStart || !touch) return;

            if (!state.horizontal && !state.vertical) {
                updateSwipePreview(
                    options,
                    main,
                    state,
                    touch.clientX - state.touchStart.x,
                    touch.clientY - state.touchStart.y,
                    event
                );
            }
            finishSwipe(options, main, state);
        }, { passive: false });

        main.addEventListener('touchcancel', () => {
            if (!state.touchStart) return;
            finishSwipe(options, main, state, true);
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
